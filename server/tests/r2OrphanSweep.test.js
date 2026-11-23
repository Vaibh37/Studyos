const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { socialDB } = require("../config/socialDb");
const Group = require("../models/social/Group");
const GroupMessage = require("../models/social/GroupMessage");
const GroupAttachmentUpload = require("../models/social/GroupAttachmentUpload");
const R2OrphanCandidate = require("../models/social/R2OrphanCandidate");
const R2OrphanScanState = require("../models/social/R2OrphanScanState");
const {
  migrateUploadAuthorizationTtlIndex,
  runGroupOrphanSweep,
  isStudyOsGroupObjectKey,
  MIN_OBJECT_AGE_MS,
  MIN_CONFIRMATION_AGE_MS,
} = require("../services/r2OrphanSweep");

test("R2 orphan sweeps preserve referenced files, find expired-grant orphans, confirm twice and fail safely", async () => {
  if (process.env.STUDYOS_TEST_MONGO_URI !==
      "mongodb://127.0.0.1:27017/studyos_security_ci") {
    throw new Error("Refusing R2 sweep test outside isolated CI MongoDB");
  }

  const now = new Date("2026-11-23T10:00:00.000Z");
  const OLD = new Date(now.getTime() - MIN_OBJECT_AGE_MS - 24 * 60 * 60 * 1000);
  const RECENT = new Date(now.getTime() - 60 * 60 * 1000);
  const later = new Date(now.getTime() + MIN_CONFIRMATION_AGE_MS + 60_000);
  const changedLater = new Date(later.getTime() + MIN_CONFIRMATION_AGE_MS + 60_000);
  const quietLogger = { info() {} };
  const deletedKeys = [];
  const objects = new Map();
  let simulateFailureKey = null;

  const fakeR2 = {
    async listGroupStoredObjects({ startAfter, maxKeys }) {
      const sorted = [...objects.values()]
        .filter(o => o.key.startsWith("groups/") && o.key > (startAfter || ""))
        .sort((a, b) => a.key.localeCompare(b.key));
      const listed = sorted.slice(0, maxKeys);
      return { objects: listed, hasMore: sorted.length > listed.length };
    },
    async getStoredObjectMetadata(key) {
      const obj = objects.get(key);
      if (!obj) throw new Error("Missing object in fake R2");
      return { etag: obj.etag, lastModified: obj.lastModified };
    },
    async deleteStoredObject(key) {
      if (key === simulateFailureKey) throw new Error("Simulated R2 deletion error");
      if (!objects.has(key)) throw new Error("Unexpected second delete");
      objects.delete(key);
      deletedKeys.push(key);
    },
  };

  let opened = false;
  try {
    await socialDB.openUri("mongodb://127.0.0.1:27017/studyos_r2_orphans_ci");
    opened = true;

    // The original production TTL index is migrated once and never recreated.
    await GroupAttachmentUpload.collection.createIndex(
      { expiresAt: 1 },
      { name: "expiresAt_1", expireAfterSeconds: 0 }
    );
    await migrateUploadAuthorizationTtlIndex(quietLogger);
    await migrateUploadAuthorizationTtlIndex(quietLogger);
    const expiryIndices = (await GroupAttachmentUpload.collection.indexes())
      .filter(i => i.key.expiresAt === 1);
    assert.equal(expiryIndices.length, 1);
    assert.equal(expiryIndices[0].expireAfterSeconds, undefined);

    const group = await Group.create({
      name: "R2 inventory CI group",
      inviteCode: "E9ABCA22",
      ownerId: "r2-ci-owner",
      visibility: "private",
    });
    const gid = String(group._id);
    const key = (n) =>
      "groups/" + gid + "/00000000-0000-4000-8000-" +
      String(n).padStart(12, "0") + "/file-" + n + ".pdf";

    const linked = key(1);
    const stillValid = key(2);
    const expired = key(3);
    const missingGrant = key(4);
    const changing = key(5);
    const tooNew = key(6);
    const unrelatedFormat = "groups/invalid-storage-key";

    for (const name of [
      linked, stillValid, expired, missingGrant, changing, tooNew, unrelatedFormat,
    ]) {
      objects.set(name, {
        key: name,
        etag: "etag-" + name,
        lastModified: name === tooNew ? RECENT : OLD,
      });
    }

    assert.equal(isStudyOsGroupObjectKey(linked), true);
    assert.equal(isStudyOsGroupObjectKey(unrelatedFormat), false);

    await GroupMessage.create({
      groupId: group._id,
      userId: "r2-ci-owner",
      attachments: [{
        storageKey: linked, fileName: "file.pdf",
        mimeType: "application/pdf", size: 25, uploadedBy: "r2-ci-owner",
      }],
    });

    async function grant(storageKey, expiresAt, consumedAt = null) {
      return GroupAttachmentUpload.create({
        groupId: group._id, userId: "r2-ci-owner", storageKey,
        fileName: "file.pdf", mimeType: "application/pdf", size: 25,
        expiresAt, consumedAt,
      });
    }
    await grant(linked, new Date(now.getTime() - 24 * 60 * 60 * 1000), now);
    await grant(stillValid, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    await grant(expired, new Date(now.getTime() - 24 * 60 * 60 * 1000));
    await grant(changing, new Date(now.getTime() - 24 * 60 * 60 * 1000));

    // Every possible key is considered through bounded, resumable pages.
    const options = { r2: fakeR2, pages: 2, pageSize: 4, logger: quietLogger };
    const first = await runGroupOrphanSweep({ ...options, now, mode: "audit" });
    assert.equal(first.mode, "audit");
    assert.equal(first.removed, 0);
    assert.equal(first.protected, 2);
    assert.equal(first.tooRecent, 1);
    assert.equal(first.invalid, 1);
    assert.equal(first.suspected, 3);
    assert.equal(await R2OrphanCandidate.countDocuments(), 3);
    assert.equal((await R2OrphanScanState.findById("groups")).lastKey, "");

    // A dry-run even after 24h confirmation never modifies R2.
    const confirmedAudit = await runGroupOrphanSweep({
      ...options, now: later, mode: "audit",
    });
    assert.equal(confirmedAudit.confirmed, 3);
    assert.deepEqual(deletedKeys, []);

    // File changed on R2 between observations: previous confirmation is void.
    objects.get(changing).etag = "changed-etag";

    simulateFailureKey = expired;
    await assert.rejects(
      runGroupOrphanSweep({ ...options, now: later, mode: "delete" }),
      /Simulated R2 deletion error/
    );
    assert.equal(objects.has(expired), true);
    assert.equal(await GroupAttachmentUpload.countDocuments({ storageKey: expired }), 1);

    simulateFailureKey = null;
    const cleanup = await runGroupOrphanSweep({
      ...options, now: later, mode: "delete",
    });
    assert.equal(cleanup.removed, 2);
    assert.equal(objects.has(expired), false);
    assert.equal(objects.has(missingGrant), false);
    assert.equal(objects.has(changing), true);
    assert.equal(objects.has(linked), true);
    assert.equal(objects.has(stillValid), true);
    assert.equal(objects.has(tooNew), true);
    assert.equal(await GroupAttachmentUpload.countDocuments({ storageKey: expired }), 0);

    // Later run clears the changed orphan after a fresh observation period.
    const lateCleanup = await runGroupOrphanSweep({
      ...options, now: changedLater, mode: "delete",
    });
    assert.equal(lateCleanup.removed, 1);
    assert.equal(objects.has(changing), false);
    assert.equal(await GroupMessage.countDocuments({ "attachments.storageKey": linked }), 1);
    assert.ok(!deletedKeys.includes(linked));
    assert.ok(!deletedKeys.includes(stillValid));
    assert.ok(!deletedKeys.includes(tooNew));
    assert.equal(await R2OrphanCandidate.countDocuments(), 0);
  } finally {
    if (opened) {
      await socialDB.dropDatabase();
      await socialDB.close();
    }
  }
});
