import { withDeadline } from "./deadline.js";

export const MONITOR_RUNS_URL = "https://github.com/Vaibh37/Studyos/actions/workflows/production-monitor.yml";
const HISTORY_URL = "https://api.github.com/repos/Vaibh37/Studyos/actions/workflows/production-monitor.yml/runs?branch=main&event=schedule&status=completed&per_page=20";

async function getJSON(url, { fetcher, signal, timeoutMs }) {
  return withDeadline(async requestSignal => {
    const response = await fetcher(url, {
      method: "GET", credentials: "omit", cache: "no-store",
      redirect: "error", referrerPolicy: "no-referrer", signal: requestSignal,
      headers: { Accept: "application/json" },
    });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) return { status: response.status, data: null };
    const data = await response.json();
    return { status: response.status, data };
  }, { signal, timeoutMs });
}

export async function checkPublicStatus(apiUrl, { fetcher = fetch, signal, clock = Date.now, healthTimeoutMs = 90_000 } = {}) {
  const result = {
    api: "unknown", studyDatabase: "unknown", socialDatabase: "unknown",
    authConfiguration: "unknown", uptimeSeconds: null, checkedAt: null,
  };
  const base = apiUrl.replace(/\/+$/, "");
  const read = (path, timeoutMs) => getJSON(base + "/api/" + path, { fetcher, signal, timeoutMs });
  try {
    const live = await read("health", healthTimeoutMs);
    if (live.status >= 500) result.api = "unavailable";
    if (live.status === 200 && live.data?.service === "studyos-api" && live.data?.status === "ok") result.api = "ready";
  } catch {
    // A blocked CORS request, timeout, or this visitor's offline connection
    // is not proof of a global service outage.
  }
  if (result.api === "ready" && !signal?.aborted) {
    const [readiness, uptime] = await Promise.allSettled([read("health/ready", 15_000), read("uptime", 15_000)]);
    if (readiness.status === "fulfilled") {
      const { status, data } = readiness.value;
      if ((status === 200 && data?.status === "ok") || (status === 503 && data?.status === "unavailable")) {
        for (const key of ["studyDatabase", "socialDatabase", "authConfiguration"]) {
          const state = data.checks?.[key];
          if (state === "ready" || state === "unavailable") result[key] = state;
        }
      }
    }
    if (uptime.status === "fulfilled") {
      const { status, data } = uptime.value;
      if (status === 200 && data?.status === "ok" && data?.service === "studyos-api" &&
          Number.isSafeInteger(data.uptimeSeconds) && data.uptimeSeconds >= 0) {
        result.uptimeSeconds = data.uptimeSeconds;
      }
    }
  }
  return { ...result, checkedAt: clock() };
}

export function parseMonitorRuns(payload) {
  if (!Array.isArray(payload?.workflow_runs)) throw new Error("Invalid monitoring response");
  const seen = new Set();
  return payload.workflow_runs
    .filter(run => {
      if (!Number.isSafeInteger(run?.id) || run.id <= 0 || seen.has(run.id) ||
          run.event !== "schedule" || run.head_branch !== "main" || run.status !== "completed" ||
          typeof run.created_at !== "string" || !Number.isFinite(Date.parse(run.created_at))) return false;
      seen.add(run.id);
      return true;
    })
    .map(run => ({
      id: run.id,
      date: run.created_at,
      result: run.conclusion === "success" ? "passed" : run.conclusion === "failure" ? "failed" : "inconclusive",
      url: "https://github.com/Vaibh37/Studyos/actions/runs/" + run.id,
    }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 20);
}

export async function readMonitorHistory({ fetcher = fetch, signal } = {}) {
  const { status, data } = await getJSON(HISTORY_URL, { fetcher, signal, timeoutMs: 12_000 });
  if (status !== 200) throw new Error("Monitoring history unavailable");
  return parseMonitorRuns(data);
}

export function formatProcessUptime(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds < 0) return "Not available";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return [days ? days + "d" : "", hours ? hours + "h" : "", minutes ? minutes + "m" : ""].filter(Boolean).join(" ") || "Under 1 min";
}
