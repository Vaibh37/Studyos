import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPublicStatus, formatProcessUptime, parseMonitorRuns, readMonitorHistory } from "../src/services/publicStatus.js";

const api = "https://example.test";
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const health = () => json({ status: "ok", service: "studyos-api" });
const uptime = () => json({ status: "ok", service: "studyos-api", uptimeSeconds: 90061 });

test("public status uses anonymous read-only probes and reports real process uptime", async () => {
  const calls = [];
  const fetcher = async (url, opts) => {
    calls.push(url);
    assert.equal(opts.method, "GET");
    assert.equal(opts.credentials, "omit");
    assert.equal(opts.referrerPolicy, "no-referrer");
    assert.equal(opts.redirect, "error");
    if (url.endsWith("/health/ready")) return json({
      status: "unavailable", checks: { studyDatabase: "ready", socialDatabase: "unavailable", authConfiguration: "ready" },
    }, 503);
    if (url.endsWith("/uptime")) return uptime();
    return health();
  };
  const result = await checkPublicStatus(api, { fetcher, clock: () => 42 });
  assert.deepEqual(result, { api: "ready", studyDatabase: "ready", socialDatabase: "unavailable",
    authConfiguration: "ready", uptimeSeconds: 90061, checkedAt: 42 });
  assert.equal(calls.length, 3);
  assert.equal(formatProcessUptime(result.uptimeSeconds), "1d 1h 1m");
});

test("network failure, wrong payload, forbidden and rate limit are not global outages", async () => {
  for (const fetcher of [
    async () => { throw new TypeError("network"); },
    async () => json({ status: "ok", service: "other" }),
    async () => json({ message: "Forbidden" }, 403),
    async () => json({ message: "Too many requests" }, 429),
  ]) {
    const result = await checkPublicStatus(api, { fetcher });
    assert.equal(result.api, "unknown");
    assert.equal(result.studyDatabase, "unknown");
    assert.equal(result.uptimeSeconds, null);
  }
});

test("HTTP 503 is an observed unavailable API; dependent probes are skipped", async () => {
  let calls = 0;
  const result = await checkPublicStatus(api, { fetcher: async () => {
    calls++;
    return json({ status: "unavailable" }, 503);
  } });
  assert.equal(calls, 1);
  assert.equal(result.api, "unavailable");
  assert.equal(result.authConfiguration, "unknown");
});

test("timeout and malformed dependent results do not invent uptime or readiness", async () => {
  const timeout = await checkPublicStatus(api, { healthTimeoutMs: 5, fetcher: () => new Promise(() => {}) });
  assert.equal(timeout.api, "unknown");
  const result = await checkPublicStatus(api, { fetcher: async url => url.endsWith("/health") ? health()
    : json({ status: "ok", service: "studyos-api", uptimeSeconds: -1, checks: { socialDatabase: "operational" } }) });
  assert.equal(result.api, "ready");
  assert.equal(result.uptimeSeconds, null);
  assert.equal(result.socialDatabase, "unknown");
});

const run = (id, conclusion, overrides = {}) => ({
  id, conclusion, event: "schedule", head_branch: "main", status: "completed", created_at: "2026-11-28T01:00:00Z", ...overrides,
});

test("history includes only genuine completed scheduled main-branch results and safe links", () => {
  const result = parseMonitorRuns({ workflow_runs: [
    run(1, "failure"), run(2, "success", { created_at: "2026-11-28T02:00:00Z" }),
    run(3, "cancelled"), run(4, "success", { event: "push" }), run(5, "success", { head_branch: "dev" }),
    run(6, "success", { status: "in_progress" }), run(2, "failure"), run(7, "success", { created_at: "bad" }),
  ] });
  assert.deepEqual(result.map(x => [x.id, x.result]), [[2, "passed"], [1, "failed"], [3, "inconclusive"]]);
  assert.equal(result[0].url, "https://github.com/Vaibh37/Studyos/actions/runs/2");
  assert.throws(() => parseMonitorRuns({ message: "Rate limited" }));
  assert.deepEqual(parseMonitorRuns({ workflow_runs: [] }), []);
});

test("GitHub history errors remain errors, not empty healthy history", async () => {
  await assert.rejects(readMonitorHistory({ fetcher: async () => json({ message: "Rate limited" }, 403) }));
  assert.deepEqual(await readMonitorHistory({ fetcher: async (url, opts) => {
    assert.match(url, /event=schedule/);
    assert.equal(opts.credentials, "omit");
    return json({ workflow_runs: [] });
  } }), []);
});
