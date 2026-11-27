import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ANALYTICS_PREFERENCE_KEY,
  analyticsAllowed,
  filterAnalyticsEvent,
} from "../src/services/analyticsPrivacy.js";

const storage = value => ({ getItem: key => key === ANALYTICS_PREFERENCE_KEY ? value : null });
const page = url => ({ type: "pageview", url });
const origin = "https://studyos37.space";
const filter = (url, allowed = true, currentURL = origin + "/") =>
  filterAnalyticsEvent(page(url), { allowed, currentURL });

test("optional analytics require an explicit browser preference and fail closed", () => {
  assert.equal(analyticsAllowed(storage(null)), false);
  assert.equal(analyticsAllowed(storage("deny")), false);
  assert.equal(analyticsAllowed(storage("unexpected")), false);
  assert.equal(analyticsAllowed(storage("allow")), true);
  assert.equal(analyticsAllowed(storage("allow"), true), false);
  assert.equal(analyticsAllowed({ getItem() { throw Error("blocked"); } }), false);
  assert.equal(analyticsAllowed(undefined), false);
});

test("only public pageviews are allowed; sensitive URL components are removed", () => {
  assert.deepEqual(filter(origin + "/privacy?invite=secret#sensitive"), page(origin + "/privacy"));
  for (const path of ["/app", "/app/notes", "/app/groups", "/get-started", "/not-found"]) {
    assert.equal(filter(origin + path), null);
    assert.equal(filter(origin + "/", true, origin + path), null);
  }
  assert.equal(filter("https://other.example/"), null);
  assert.equal(filter("invalid://path"), null);
  assert.equal(filter(origin + "/", false), null);
  assert.equal(filterAnalyticsEvent({ type: "event", url: origin }, { allowed: true, currentURL: origin }), null);
});

test("initial HTML no longer loads Google Analytics", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /googletagmanager|gtag\(|google-analytics/i);
});
