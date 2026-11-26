import { createStudyReadCache } from "./studyReadCache.js";

export function createStudyApiClient({
  apiUrl,
  getUser,
  getAppCheckToken,
  fetcher = (...args) => fetch(...args),
  isOnline = () => true,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  cacheOptions,
}) {
  const studyPaths = new Set([
    "/api/tasks", "/api/subjects", "/api/notes", "/api/events", "/api/study-sessions",
  ]);
  const studyMutation = /^\/api\/(tasks|subjects|notes|events|study-sessions|account)(?:\/|$)/;
  const reads = createStudyReadCache(cacheOptions);
  let tokenFlight = null;

  // Coalesce only token reads belonging to the same Firebase User instance.
  function getRequestToken(user) {
    if (!user) return Promise.resolve(null);
    if (tokenFlight?.user === user) return tokenFlight.promise;
    const entry = { user, promise: null };
    entry.promise = user.getIdToken().finally(() => {
      if (tokenFlight === entry) tokenFlight = null;
    });
    tokenFlight = entry;
    return entry.promise;
  }

  function setStudyDataScope(user) {
    reads.setScope(user);
    if (tokenFlight?.user !== user) tokenFlight = null;
  }

  function invalidateStudyData() {
    reads.invalidate();
  }

  function assertSameAccount(user) {
    if (getUser() !== user) throw new Error("Your sign-in changed. Please try again.");
  }

  async function request(path, options, user) {
    assertSameAccount(user);
    const headers = { ...options.headers };
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const [token, appCheckToken] = await Promise.all([getRequestToken(user), getAppCheckToken()]);
    assertSameAccount(user);
    if (token) headers.Authorization = `Bearer ${token}`;
    if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken;

    let response;
    try {
      response = await fetcher(`${apiUrl}${path}`, { ...options, headers });
    } catch (cause) {
      if (cause?.name === "AbortError") throw cause;
      const offline = !isOnline();
      const error = new Error(offline
        ? "You’re offline. Reconnect and try again."
        : "Could not reach StudyOS. Check your connection and try again.", { cause });
      error.retryable = !offline && cause instanceof TypeError;
      throw error;
    }

    let data = null;
    try { data = await response.json(); } catch { /* Non-JSON error response. */ }
    assertSameAccount(user);
    if (!response.ok) {
      const error = new Error(data?.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.retryable = [502, 503, 504].includes(response.status);
      throw error;
    }
    return data;
  }

  async function apiRequest(path, options = {}) {
    const user = getUser();
    setStudyDataScope(user);
    const method = (options.method || "GET").toUpperCase();
    const finishWrite = !["GET", "HEAD", "OPTIONS"].includes(method) && studyMutation.test(path)
      ? reads.beginWrite(user) : null;
    try {
      return await request(path, options, user);
    } finally {
      finishWrite?.();
    }
  }

  // Opt-in caching only for the personal list views. Security, chat, live
  // sessions, exports, settings operations and other sensitive reads do not
  // use this function. A manual refresh always bypasses completed cache entries.
  function readStudyData(path, { fresh = false } = {}) {
    if (!studyPaths.has(path)) throw new Error("Unexpected study data path");
    const user = getUser();
    setStudyDataScope(user);
    return reads.read(user, path, async () => {
      try {
        return await request(path, { cache: "no-store" }, user);
      } catch (error) {
        if (!error.retryable || !isOnline()) throw error;
        // GET is safe to retry once; never repeat a mutation or an auth failure.
        await sleep(350);
        assertSameAccount(user);
        return request(path, { cache: "no-store" }, user);
      }
    }, { fresh });
  }


  return { apiRequest, readStudyData, setStudyDataScope, invalidateStudyData };
}
