const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const http = require("node:http");
const express = require("express");
const cors = require("cors");
const { pingMongo, createReadinessProbe } = require("../utils/readiness");
const { createProductionMetrics } = require("../utils/productionMetrics");
const corsOptions = require("../config/corsOptions");
const { safeApiErrorHandler } = require("../middleware/apiRequestSafety");

test("Mongo readiness requires connected state and uses bounded driver ping", async () => {
  let called = 0;
  const db = { command: async (command, options) => {
    called++;
    assert.deepEqual(command, { ping: 1 });
    assert.ok(options.timeoutMS > 0 && options.timeoutMS <= 5000);
    return { ok: 1 };
  }};
  assert.equal(await pingMongo({ readyState: 0, db }), false);
  assert.equal(called, 0);
  assert.equal(await pingMongo({ readyState: 1, db }), true);
  assert.equal(called, 1);
});

test("readiness coalesces concurrent probes, caches briefly, and recovers after dependency failure", async () => {
  let now = 0, mainCalls = 0, socialCalls = 0, authCalls = 0, socialHealthy = true;
  const probe = createReadinessProbe({
    clock: () => now, healthyTtlMs: 100, failedTtlMs: 20,
    checkMain: async () => { mainCalls++; return true; },
    checkSocial: async () => { socialCalls++; if (!socialHealthy) throw new Error("internal database details"); return true; },
    checkAuthConfiguration: () => { authCalls++; return true; },
  });
  const values = await Promise.all(Array.from({ length: 10 }, () => probe()));
  assert.ok(values.every(value => value.status === "ok"));
  assert.deepEqual([mainCalls, socialCalls, authCalls], [1,1,1]);
  socialHealthy = false;
  now = 101;
  const failure = await probe();
  assert.equal(failure.status, "unavailable");
  assert.equal(failure.checks.socialDatabase, "unavailable");
  assert.ok(!JSON.stringify(failure).includes("internal"));
  socialHealthy = true;
  assert.equal((await probe()).status, "unavailable");
  now += 21;
  assert.equal((await probe()).status, "ok");
  assert.deepEqual([mainCalls, socialCalls, authCalls], [3,3,3]);
});

test("readiness times out a stalled dependency and rejects non-boolean success", async () => {
  const probe = createReadinessProbe({
    checkMain: () => new Promise(() => {}), checkSocial: () => ({ ok: 1 }),
    checkAuthConfiguration: () => true, timeoutMs: 20,
  });
  const result = await probe();
  assert.deepEqual(result, { status: "unavailable", checks: {
    studyDatabase: "unavailable", socialDatabase: "unavailable", authConfiguration: "ready",
  }});
});

test("metric windows record status classes, latency and aborted requests without private identifiers", () => {
  let now = 0, elapsed = 0, active = 2;
  const logs = [];
  const metrics = createProductionMetrics({ clock: () => now, monotonic: () => elapsed, write: entry => logs.push(entry), activeSocketCount: () => active });
  function request(path, status, duration, abort = false) {
    const reply = new EventEmitter();
    reply.statusCode = status;
    reply.writableFinished = !abort;
    metrics.middleware({ path, originalUrl: path + "?private=query", body: { note: "private content" } }, reply, () => {});
    elapsed += duration;
    if (!abort) reply.emit("finish");
    reply.emit("close");
  }
  request("/notes/private-user-id", 200, 40);
  request("/tasks/sensitive-task-id", 401, 100);
  request("/groups/private-group-id", 403, 250);
  request("/groups", 429, 500);
  request("/notes", 503, 2000);
  request("/unbounded-private-slug", 500, 30001);
  request("/health/ready", 200, 4);
  request("/notes", 200, 25, true);
  metrics.socketOpened();
  metrics.socketClosed();
  now = 300_000;
  const window = metrics.flush();
  assert.deepEqual(window.counts, {
    requests:8, completed:7, success:2, clientErrors:3, serverErrors:2,
    unauthorized:1, forbidden:1, rateLimited:1, aborted:1,
  });
  assert.equal(window.windowSeconds, 300);
  assert.equal(window.p95UpperBoundMs, "over_30000");
  assert.deepEqual(window.sockets,{opened:1,closed:1,active:2});
  assert.equal(window.byArea.notes.requests, 3);
  assert.equal(window.byArea.other.requests, 1);
  assert.equal(window.byArea.system.success, 1);
  assert.equal(window.latencyBuckets.reduce((total,bucket) => total + bucket.count,0), 7);
  const serialized = JSON.stringify(window);
  for (const privateValue of ["private-user-id","private-group-id","sensitive-task-id","private content","private=query","unbounded-private-slug"]) {
    assert.ok(!serialized.includes(privateValue));
  }
  active = 0;
  now += 300_000;
  assert.equal(metrics.flush().counts.requests, 0);
  assert.equal(logs.length, 1, "quiet windows should not add log noise");
});

test("real HTTP middleware counts early CORS denial as 403, not a server crash", async () => {
  const logs = [];
  const app = express();
  const metrics = createProductionMetrics({ write: entry => logs.push(entry) });
  app.use("/api", metrics.middleware);
  app.use(cors(corsOptions));
  app.get("/api/health", (req, res) => res.json({status:"ok"}));
  app.use("/api", safeApiErrorHandler);
  const server = http.createServer(app);
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const url = "http://127.0.0.1:" + server.address().port + "/api/health";
    const denied = await fetch(url, { headers: { Origin: "https://unknown-origin.invalid" }});
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
    assert.deepEqual(await denied.json(), { message: "Origin not allowed" });
    const ok = await fetch(url);
    assert.equal(ok.status, 200);
    await ok.json();
    const entry = metrics.flush();
    assert.equal(entry.counts.requests, 2);
    assert.equal(entry.counts.forbidden, 1);
    assert.equal(entry.counts.serverErrors, 0);
    assert.equal(entry.byArea.system.requests, 2);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
