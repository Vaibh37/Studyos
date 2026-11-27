import { createStudyReadCache } from "./studyReadCache.js";
import { withDeadline } from "./deadline.js";

export class StudyApiError extends Error {
  constructor(message, { code, status, retryable = false, uncertain = false, cause } = {}) {
    super(message, { cause });
    this.name = "StudyApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    // For writes, a missing response does not prove that the server rolled back.
    this.uncertain = uncertain;
  }
}

const safeMethod = method => ["GET", "HEAD", "OPTIONS"].includes(method);
const uncertainMessage = message => `${message} The change may have been saved; check the latest data before submitting again.`;

export function createStudyApiClient({
  apiUrl,
  getUser,
  getAppCheckToken,
  fetcher = (...args) => fetch(...args),
  isOnline = () => true,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  cacheOptions,
  timeoutMs = 30_000,
  credentialTimeoutMs = 15_000,
}) {
  const studyPaths = new Set([
    "/api/tasks", "/api/subjects", "/api/notes", "/api/events", "/api/study-sessions",
  ]);
  const studyMutation = /^\/api\/(tasks|subjects|notes|events|study-sessions|account)(?:\/|$)/;
  const reads = createStudyReadCache(cacheOptions);
  let tokenFlight = null;

  // A hung credential operation must release the coalesced flight so a later
  // request can try again. Never share credentials across Firebase users.
  function getRequestToken(user) {
    if (!user) return Promise.resolve(null);
    if (tokenFlight?.user === user) return tokenFlight.promise;
    const entry = { user, promise: null };
    entry.promise = withDeadline(() => user.getIdToken(), {
      timeoutMs: credentialTimeoutMs,
      timeoutError: () => new StudyApiError("Sign-in verification took too long. Please try again.", { code: "AUTH_TIMEOUT" }),
    }).finally(() => {
      if (tokenFlight === entry) tokenFlight = null;
    });
    tokenFlight = entry;
    return entry.promise;
  }

  function setStudyDataScope(user) {
    reads.setScope(user);
    if (tokenFlight?.user !== user) tokenFlight = null;
  }

  function invalidateStudyData() { reads.invalidate(); }

  function assertSameAccount(user) {
    if (getUser() !== user) throw new StudyApiError("Your sign-in changed. Please try again.", { code: "ACCOUNT_CHANGED" });
  }

  async function request(path, options, user) {
    assertSameAccount(user);
    const method = (options.method || "GET").toUpperCase();
    const write = !safeMethod(method);
    let sent = false;

    return withDeadline(async signal => {
      const headers = { ...options.headers };
      if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
      let token, appCheckToken;
      try {
        [token, appCheckToken] = await Promise.all([
          getRequestToken(user),
          withDeadline(() => getAppCheckToken(), {
            signal, timeoutMs: credentialTimeoutMs,
            timeoutError: () => new StudyApiError("Connection verification took too long. Please try again.", { code: "APP_CHECK_TIMEOUT" }),
          }),
        ]);
      } catch (cause) {
        if (signal.aborted) throw signal.reason;
        assertSameAccount(user);
        if (cause instanceof StudyApiError) throw cause;
        throw new StudyApiError("Couldn’t verify your sign-in. Check your connection and try again.", { code: "AUTH_ERROR", cause });
      }
      assertSameAccount(user);
      if (signal.aborted) throw signal.reason;
      if (token) headers.Authorization = `Bearer ${token}`;
      if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken;

      let response;
      try {
        sent = true;
        response = await fetcher(`${apiUrl}${path}`, { ...options, headers, signal });
      } catch (cause) {
        if (signal.aborted) throw signal.reason;
        if (cause?.name === "AbortError") throw cause;
        const offline = !isOnline();
        const message = offline
          ? "You’re offline. Reconnect and try again."
          : "Could not reach StudyOS. Check your connection and try again.";
        throw new StudyApiError(write ? uncertainMessage(message) : message, {
          code: offline ? "OFFLINE" : "NETWORK", cause,
          retryable: !write && !offline && cause instanceof TypeError, uncertain: write,
        });
      }

      const noBody = method === "HEAD" || [204, 205].includes(response.status);
      let data = null;
      if (!noBody) {
        try { data = await response.json(); }
        catch (cause) {
          if (signal.aborted) throw signal.reason;
          assertSameAccount(user);
          if (response.ok) {
            const message = "StudyOS returned an unreadable response. Please try again.";
            throw new StudyApiError(write ? uncertainMessage(message) : message, {
              code: "INVALID_RESPONSE", cause, uncertain: write,
            });
          }
        }
      }
      if (signal.aborted) throw signal.reason;
      assertSameAccount(user);
      if (!response.ok) {
        const status = response.status;
        const fallback = status === 429 ? "Too many requests. Please wait a moment and try again."
          : [502, 503, 504].includes(status) ? "StudyOS is temporarily unavailable. Try again shortly."
          : `Request failed (${status})`;
        const message = typeof data?.message === "string" && data.message.trim()
          ? data.message.trim().slice(0, 300) : fallback;
        const uncertain = write && status >= 500;
        throw new StudyApiError(uncertain ? uncertainMessage(message) : message, {
          code: "HTTP", status, retryable: !write && [502, 503, 504].includes(status), uncertain,
        });
      }
      // A malformed or proxy-generated empty response must never masquerade as
      // an empty library, including direct export and destructive-operation reads.
      if (method === "GET" && studyPaths.has(path.split("?")[0]) && !Array.isArray(data)) {
        throw new StudyApiError("StudyOS returned incomplete study data. Please refresh and try again.", { code: "INVALID_RESPONSE" });
      }
      return data;
    }, {
      signal: options.signal,
      timeoutMs,
      timeoutError: () => new StudyApiError(
        write && sent
          ? uncertainMessage("The request took too long to finish.")
          : "The request took too long. Check your connection and try again.",
        { code: "TIMEOUT", retryable: !write && sent && isOnline(), uncertain: write && sent }
      ),
    });
  }

  async function apiRequest(path, options = {}) {
    const user = getUser();
    setStudyDataScope(user);
    const method = (options.method || "GET").toUpperCase();
    const finishWrite = !safeMethod(method) && studyMutation.test(path) ? reads.beginWrite(user) : null;
    try { return await request(path, options, user); }
    finally { finishWrite?.(); }
  }

  // Only safe private list reads retry; never repeat a mutation or auth failure.
  async function requestRead(path, user) {
    try { return await request(path, { cache: "no-store" }, user); }
    catch (error) {
      if (!error.retryable || !isOnline()) throw error;
      await sleep(350);
      assertSameAccount(user);
      return request(path, { cache: "no-store" }, user);
    }
  }

  function readStudyData(path, { fresh = false } = {}) {
    if (!studyPaths.has(path)) throw new Error("Unexpected study data path");
    const user = getUser();
    setStudyDataScope(user);
    return reads.read(user, path, () => requestRead(path, user), { fresh });
  }

  // Cache individual resources, not an additional copy of the entire
  // dashboard. Cache hits and existing in-flight list reads are still reused.
  // On a cold dashboard, all three loaders join a single authenticated GET.
  async function readDashboardData({ fresh = false } = {}) {
    const user = getUser();
    setStudyDataScope(user);
    const paths = {
      tasks: "/api/tasks", sessions: "/api/study-sessions", events: "/api/events",
    };
    const missing = new Set();
    let flight;
    function load(key) {
      missing.add(key);
      if (!flight) {
        flight = Promise.resolve().then(async () => {
          if (missing.size === 1) return { [key]: await requestRead(paths[key], user) };
          try {
            const result = await requestRead("/api/dashboard", user);
            if (!Object.keys(paths).every(name => Array.isArray(result?.[name]))) {
              throw new StudyApiError("StudyOS returned incomplete dashboard data. Please refresh and try again.", { code: "INVALID_RESPONSE" });
            }
            return result;
          } catch (error) {
            // Git-based deployment may publish the frontend first. Never
            // fall back on forbidden, revoked, rate-limited or malformed reads.
            if (error.status !== 404) throw error;
            return Object.fromEntries(await Promise.all([...missing].map(async name =>
              [name, await requestRead(paths[name], user)])));
          }
        });
      }
      return flight.then(result => result[key]);
    }
    const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) =>
      [key, await reads.read(user, path, () => load(key), { fresh })]));
    assertSameAccount(user);
    return Object.fromEntries(entries);
  }

  return { apiRequest, readStudyData, readDashboardData, setStudyDataScope, invalidateStudyData };
}
