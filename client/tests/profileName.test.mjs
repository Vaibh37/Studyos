import test from "node:test";
import assert from "node:assert/strict";
import { readProfileName, writeProfileName, clearProfileName, profileNameKey } from "../src/services/profileName.js";

const memory = () => {
  const items = new Map();
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: key => items.delete(key),
  };
};
const alice = { uid: "alice", displayName: "Alice" };
const bob = { uid: "bob", displayName: "Bob" };
test("legacy or another account's profile name never crosses identity boundaries", () => {
  const storage = memory();
  storage.setItem("studyos_name", "Unscoped private name");
  assert.equal(readProfileName(storage, alice), "Alice");
  assert.equal(readProfileName(storage, bob), "Bob");
  assert.equal(readProfileName(storage, null, true), "");
  writeProfileName(storage, alice, false, "Alice's private greeting");
  writeProfileName(storage, bob, false, "Bob's greeting");
  writeProfileName(storage, null, true, "Guest greeting");
  assert.equal(readProfileName(storage, alice), "Alice's private greeting");
  assert.equal(readProfileName(storage, bob), "Bob's greeting");
  assert.equal(readProfileName(storage, null, true), "Guest greeting");
  assert.equal(readProfileName(storage, null), "");
  assert.equal(profileNameKey(null, false), null);
});
test("reset/removal affects only the owner and blank names stay intentionally blank", () => {
  const storage = memory();
  writeProfileName(storage, alice, false, "");
  writeProfileName(storage, bob, false, "B");
  assert.equal(readProfileName(storage, alice), "");
  clearProfileName(storage, alice);
  assert.equal(readProfileName(storage, alice), "Alice");
  assert.equal(readProfileName(storage, bob), "B");
  assert.equal(readProfileName(storage, { uid: "new-alice", displayName: "Alice" }), "Alice");
});
