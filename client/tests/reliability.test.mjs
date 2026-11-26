import test from "node:test";
import assert from "node:assert/strict";
import { createStudyApiClient } from "../src/services/studyApiClient.js";
import { loadModuleWithDeadline, isModuleLoadFailure } from "../src/services/deadline.js";
import { createNoteDraftStore, noteFields, GUEST_DRAFT_SCOPE } from "../src/services/noteDrafts.js";

const pending = () => new Promise(() => {});
const response = data => ({ ok: true, status: 200, json: async () => data });
const client = (fetcher, options = {}) => {
  const user = { getIdToken: async () => "test-token" };
  return createStudyApiClient({
    apiUrl: "https://example.invalid",
    getUser: () => user,
    getAppCheckToken: async () => null,
    fetcher, sleep: async () => {}, timeoutMs: 35, credentialTimeoutMs: 20,
    ...options,
  });
};

test("hung list request aborts and retries once, ignoring late responses", async () => {
  const signals = [];
  let resolveLate;
  const api = client((_, { signal }) => {
    signals.push(signal);
    return signals.length === 1 ? new Promise(resolve => { resolveLate = resolve; }) : response([{ _id: "fresh" }]);
  });
  assert.deepEqual(await api.readStudyData("/api/notes"), [{ _id: "fresh" }]);
  assert.equal(signals.length, 2);
  assert.equal(signals[0].aborted, true);
  resolveLate(response([{ _id: "stale" }]));
  assert.deepEqual(await api.readStudyData("/api/notes"), [{ _id: "fresh" }]);
});

test("hung response body is bounded and safe list reads retry", async () => {
  let calls = 0;
  const api = client(() => ++calls === 1 ? { ok: true, status: 200, json: pending } : response([]));
  assert.deepEqual(await api.readStudyData("/api/tasks"), []);
  assert.equal(calls, 2);
});

test("timed out or server-failed writes are uncertain and never replayed", async () => {
  for (const fetcher of [pending, async () => ({ ok: false, status: 503, json: async () => ({}) })]) {
    let calls = 0;
    const api = client((...args) => { calls++; return fetcher(...args); });
    await assert.rejects(api.apiRequest("/api/notes", { method: "POST", body: "{}" }), error => {
      assert.equal(error.uncertain, true);
      assert.match(error.message, /may have been saved/);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("aborting while credentials are pending never sends a late request", async () => {
  let resolveToken, calls = 0;
  const user = { getIdToken: () => new Promise(resolve => { resolveToken = resolve; }) };
  const api = client(() => { calls++; return response([]); }, { getUser: () => user, credentialTimeoutMs: 100 });
  const controller = new AbortController();
  const result = api.apiRequest("/api/notes", { method: "POST", signal: controller.signal });
  await new Promise(resolve => setTimeout(resolve, 1));
  controller.abort();
  await assert.rejects(result, { name: "AbortError" });
  resolveToken("late");
  await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(calls, 0);
});

test("hung credentials release the shared flight; later requests can succeed", async () => {
  let tokenCalls = 0, fetchCalls = 0;
  const user = { getIdToken: () => ++tokenCalls === 1 ? pending() : Promise.resolve("valid") };
  const api = client(() => { fetchCalls++; return response([]); }, { getUser: () => user });
  const results = await Promise.allSettled([api.apiRequest("/api/notes"), api.apiRequest("/api/tasks")]);
  assert.ok(results.every(r => r.status === "rejected" && r.reason.code === "AUTH_TIMEOUT"));
  assert.equal(fetchCalls, 0);
  assert.equal(tokenCalls, 1);
  assert.deepEqual(await api.apiRequest("/api/notes"), []);
  assert.equal(tokenCalls, 2);
});

test("App Check failure sends no request", async () => {
  let calls = 0;
  const api = client(() => { calls++; }, { getAppCheckToken: pending });
  await assert.rejects(api.apiRequest("/api/tasks"), { code: "APP_CHECK_TIMEOUT" });
  assert.equal(calls, 0);
});

test("malformed direct reads fail instead of returning empty data; valid no-content writes work", async () => {
  const api = client(url => url.includes("invalid-json") ? { ok: true, status: 200, json: async () => { throw new Error("bad JSON"); } } :
    url.endsWith("/note-id") ? { ok: true, status: 204 } : response(null));
  await assert.rejects(api.apiRequest("/api/notes?all=true"), { code: "INVALID_RESPONSE" });
  await assert.rejects(api.apiRequest("/invalid-json"), { code: "INVALID_RESPONSE" });
  assert.equal(await api.apiRequest("/api/notes/note-id", { method: "DELETE" }), null);
});

test("unresolved lazy module gets a recoverable asset error", async () => {
  await assert.rejects(loadModuleWithDeadline(pending, 15), error => isModuleLoadFailure(error));
  assert.equal(await loadModuleWithDeadline(async () => "loaded"), "loaded");
  assert.ok(isModuleLoadFailure(new Error("Failed to fetch dynamically imported module: /assets/tasks.js")));
  assert.equal(isModuleLoadFailure(new Error("render failed")), false);
});

const saved = { _id: "note", title: "Saved", content: "Original", subjectId: null };
test("recover drafts during navigation, identify concurrent edits, scope by identity", () => {
  const states = [];
  const store = createNoteDraftStore({ onDirtyChange: value => states.push(value) });
  const account = {};
  const fields = { ...noteFields(saved), title: "Draft" };
  store.activate(account);
  store.remember(account, saved, fields);
  assert.equal(store.latestId(account), "note");
  assert.equal(store.hasUnsaved(account), true);
  assert.deepEqual(store.recover(account, saved), { fields, conflict: false });
  assert.deepEqual(store.recover(account, { ...saved, content: "Edited elsewhere" }), { fields, conflict: true });
  assert.equal(store.recover(GUEST_DRAFT_SCOPE, saved), null);
  store.activate(GUEST_DRAFT_SCOPE);
  assert.equal(store.recover(account, saved), null);
  assert.equal(store.hasUnsaved(GUEST_DRAFT_SCOPE), false);
  assert.equal(states.at(-1), false);
});

test("save only clears submitted edits, preserving even reverted fields during an in-flight save", () => {
  const store = createNoteDraftStore();
  const account = {};
  const fields = { ...noteFields(saved), content: "Submitted" };
  store.activate(account);
  store.remember(account, saved, fields);
  store.remember(account, saved, noteFields(saved), { pendingSave: true });
  const updated = { ...saved, ...fields };
  store.commit(account, saved, fields, updated);
  assert.deepEqual(store.recover(account, updated), { fields: noteFields(saved), conflict: false });
  store.commit(account, updated, noteFields(saved), saved);
  assert.equal(store.hasUnsaved(account), false);
});
