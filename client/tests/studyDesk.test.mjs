import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DESK, normalizeDesk, readDesk, writeDesk } from "../src/services/studyDesk.js";

test("desk preferences reject unrecognized fields and locked accessories", () => {
  assert.deepEqual(normalizeDesk({ activity: "<script>", accessory: "bonsai", encouragement: "yes", progress: 10 }, 3), DEFAULT_DESK);
  assert.equal(normalizeDesk({ accessory: "plant" }, 2).accessory, "books");
  assert.equal(normalizeDesk({ accessory: "plant" }, 3).accessory, "plant");
  assert.equal(normalizeDesk({ accessory: "bonsai" }, 10).accessory, "bonsai");
});
test("desk preferences are scoped by account, recover from invalid storage, and can retain unlocked choices", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  writeDesk(storage, "alice", { character: "long", accessory: "bonsai", encouragement: true });
  assert.equal(readDesk(storage, "alice").accessory, "bonsai");
  assert.equal(readDesk(storage, "alice").character, "long");
  assert.deepEqual(readDesk(storage, "bob"), DEFAULT_DESK);
  values.set("studyos_desk:alice", "broken");
  assert.deepEqual(readDesk(storage, "alice"), DEFAULT_DESK);
});
