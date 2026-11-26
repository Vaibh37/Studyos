// Fixed-cardinality, process-local metrics for the free Render service.
// Do not store request URLs, identifiers, tokens, bodies, query strings,
// error messages, or user attributes. No third-party telemetry service.
const { performance } = require("node:perf_hooks");
const AREAS = new Set(["auth", "account", "security", "tasks", "subjects", "notes",
  "events", "study-sessions", "groups", "leaderboard"]);
const SYSTEM = new Set(["health", "status", "uptime", "version"]);
const LATENCY_BOUNDS = [25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000];
const emptyCounts = () => ({ requests: 0, completed: 0, success: 0, clientErrors: 0,
  serverErrors: 0, unauthorized: 0, forbidden: 0, rateLimited: 0, aborted: 0 });
const classify = path => {
  const area = String(path || "").split("/").filter(Boolean)[0] || "";
  // This middleware is mounted at /api, so req.path has no /api prefix.
  return AREAS.has(area) ? area : SYSTEM.has(area) || !area ? "system" : "other";
};

function createProductionMetrics({ clock = Date.now, monotonic = () => performance.now(),
  write = entry => console.info(JSON.stringify(entry)), activeSocketCount = () => 0 } = {}) {
  let started = clock(), counts = emptyCounts(), byArea = Object.create(null);
  let buckets = Array(LATENCY_BOUNDS.length + 1).fill(0), opened = 0, closed = 0;

  function record(area, status, milliseconds, aborted) {
    const local = byArea[area] ||= emptyCounts();
    for (const target of [counts, local]) {
      target.requests++;
      if (aborted) { target.aborted++; continue; }
      target.completed++;
      if (status >= 200 && status < 400) target.success++;
      else if (status >= 400 && status < 500) target.clientErrors++;
      else if (status >= 500) target.serverErrors++;
      if (status === 401) target.unauthorized++;
      if (status === 403) target.forbidden++;
      if (status === 429) target.rateLimited++;
    }
    if (!aborted) {
      const bucket = LATENCY_BOUNDS.findIndex(limit => milliseconds <= limit);
      buckets[bucket < 0 ? LATENCY_BOUNDS.length : bucket]++;
    }
  }

  function middleware(req, res, next) {
    const area = classify(req.path);
    const start = monotonic();
    let recorded = false;
    const finish = aborted => {
      if (recorded) return;
      recorded = true;
      record(area, res.statusCode, Math.max(0, monotonic() - start), aborted);
    };
    res.once("finish", () => finish(false));
    res.once("close", () => finish(!res.writableFinished));
    next();
  }

  function percentile95() {
    if (!counts.completed) return null;
    let total = 0;
    const target = Math.ceil(counts.completed * 0.95);
    for (let i = 0; i < buckets.length; i++) {
      total += buckets[i];
      if (total >= target) return LATENCY_BOUNDS[i] ?? "over_30000";
    }
    return null;
  }

  function flush() {
    const now = clock(), active = activeSocketCount();
    const entry = {
      event: "studyos_http_window", schema: 1, windowSeconds: Math.max(1, Math.round((now - started) / 1000)),
      counts, p95UpperBoundMs: percentile95(),
      latencyBuckets: [...LATENCY_BOUNDS.map((upperMs, i) => ({ upperMs, count: buckets[i] })),
        { upperMs: "over_30000", count: buckets.at(-1) }],
      byArea,
      sockets: { opened, closed, active },
    };
    started = now; counts = emptyCounts(); byArea = Object.create(null);
    buckets = Array(LATENCY_BOUNDS.length + 1).fill(0); opened = 0; closed = 0;
    // Quiet windows with no requests or sockets need no log line.
    if (entry.counts.requests || entry.sockets.opened || entry.sockets.closed || active) write(entry);
    return entry;
  }

  return { middleware, flush, socketOpened: () => opened++, socketClosed: () => closed++ };
}
module.exports = { createProductionMetrics };
