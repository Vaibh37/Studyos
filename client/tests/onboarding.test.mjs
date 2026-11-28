import assert from "node:assert/strict";
import { test } from "node:test";
import {
  onboardingKey, readOnboarding, writeOnboarding, clearOnboarding,
  requestOnboarding, shouldOfferOnboarding,
} from "../src/services/onboarding.js";

function fakeStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}
const account = uid => ({ uid });

test("new guest entry requests onboarding, not an existing restored guest", () => {
  const storage = fakeStorage();
  const key = onboardingKey(null, true);
  assert.equal(shouldOfferOnboarding(storage, null, true), false);
  assert.equal(requestOnboarding(storage, null, true), true);
  assert.equal(readOnboarding(storage, key), "pending");
  assert.equal(shouldOfferOnboarding(storage, null, true), true);
  writeOnboarding(storage, key, "dismissed");
  assert.equal(requestOnboarding(storage, null, true), false);
  assert.equal(shouldOfferOnboarding(storage, null, true), false);
});

test("onboarding must be explicitly requested after a successful registration", () => {
  const storage = fakeStorage();
  const user = account("new");
  assert.equal(shouldOfferOnboarding(storage, user), false);
  assert.equal(requestOnboarding(storage, user), true);
  assert.equal(shouldOfferOnboarding(storage, user), true);
  assert.equal(requestOnboarding(storage, user), false);
  assert.equal(requestOnboarding(storage, null), false);
});

test("completion and dismissal are scoped per account and separate from guest", () => {
  const storage = fakeStorage();
  const a = account("a");
  const b = account("b");
  const keyA = onboardingKey(a);
  assert.equal(onboardingKey(null), null);
  requestOnboarding(storage, a);
  requestOnboarding(storage, b);
  writeOnboarding(storage, keyA, "completed");
  requestOnboarding(storage, null, true);
  assert.equal(shouldOfferOnboarding(storage, a), false);
  assert.equal(requestOnboarding(storage, a), false);
  assert.equal(shouldOfferOnboarding(storage, b), true);
  assert.equal(shouldOfferOnboarding(storage, null, true), true);
  writeOnboarding(storage, onboardingKey(b), "dismissed");
  assert.equal(shouldOfferOnboarding(storage, b), false);
  assert.equal(readOnboarding(storage, keyA), "completed");
  clearOnboarding(storage, keyA);
  assert.equal(readOnboarding(storage, keyA), null);
});

test("blocked browser storage does not crash or repeat the tour in memory", () => {
  const denied = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); }, removeItem: () => { throw Error("blocked"); } };
  const user = account("blocked");
  const key = onboardingKey(user);
  assert.equal(requestOnboarding(denied, user), true);
  writeOnboarding(denied, key, "dismissed");
  assert.equal(readOnboarding(denied, key), "dismissed");
  assert.equal(shouldOfferOnboarding(denied, user), false);
  clearOnboarding(denied, key);
  assert.equal(readOnboarding(denied, key), null);
});

test("malformed state is ignored and cannot suppress a new request", () => {
  const storage = fakeStorage();
  const user = account("malformed");
  storage.setItem(onboardingKey(user), "unknown");
  assert.equal(requestOnboarding(storage, user), true);
  writeOnboarding(storage, onboardingKey(user), "invalid");
  assert.equal(storage.getItem(onboardingKey(user)), "pending");
});
