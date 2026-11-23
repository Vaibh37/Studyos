const GroupAttachmentUpload = require("../models/social/GroupAttachmentUpload");
const GroupMessage = require("../models/social/GroupMessage");
const R2OrphanCandidate = require("../models/social/R2OrphanCandidate");
const R2OrphanScanState = require("../models/social/R2OrphanScanState");

const HOUR = 60 * 60 * 1000;
const MIN_OBJECT_AGE_MS = 72 * HOUR;
const MIN_CONFIRMATION_AGE_MS = 24 * HOUR;
const CURSOR_ID = "groups";
const MAX_PAGES = 2;
const PAGE_SIZE = 100;

// Only objects created using the StudyOS group-storage key convention.
// No root-level bucket objects or other applications' prefixes are eligible.
function isStudyOsGroupObjectKey(key) {
  return typeof key === "string" &&
    /^groups\/[0-9a-f]{24}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/]+$/.test(key);
}

// Previous versions used a 1-hour TTL index on upload authorizations.
// That deleted the only DB link to abandoned R2 objects before cleanup.
// Remove the legacy index, and replace it with an ordinary lookup index.
// This is idempotent across deploys.
async function migrateUploadAuthorizationTtlIndex(logger = console) {
  const collection = GroupAttachmentUpload.collection;
  const indexes = await collection.indexes();
  for (const index of indexes) {
    if (index.key?.expiresAt === 1 &&
        Object.keys(index.key).length === 1 &&
        typeof index.expireAfterSeconds === "number") {
      await collection.dropIndex(index.name);
      logger.info("R2 cleanup: removed legacy expiring upload-authorization index");
    }
  }
  await collection.createIndex({ expiresAt: 1 }, {
    name: "upload_auth_expiresAt_lookup",
  });
}

function sameObjectVersion(candidate, object) {
  return candidate.etag === object.etag &&
    new Date(candidate.lastModified).getTime() ===
      new Date(object.lastModified).getTime();
}

async function runGroupOrphanSweep({
  r2 = require("./r2Storage"),
  now = new Date(),
  mode = "audit",
  pages = MAX_PAGES,
  pageSize = PAGE_SIZE,
  logger = console,
} = {}) {
  // Destructive mode is never the default. The production scheduler
  // passes it only when STUDYOS_R2_ORPHAN_MODE=delete is explicitly set.
  const deleteMode = mode === "delete";
  const safePages = Math.max(1, Math.min(MAX_PAGES, Number(pages) || 1));
  const safePageSize = Math.max(1, Math.min(PAGE_SIZE, Number(pageSize) || 1));
  const stats = {
    examined: 0, protected: 0, tooRecent: 0, suspected: 0,
    confirmed: 0, removed: 0, versionChanged: 0, invalid: 0, pages: 0,
    mode: deleteMode ? "delete" : "audit",
  };

  const state = await R2OrphanScanState.findById(CURSOR_ID).lean();
  let cursor = state?.lastKey || "";

  for (let page = 0; page < safePages; page++) {
    const listing = await r2.listGroupStoredObjects({
      startAfter: cursor,
      maxKeys: safePageSize,
    });
    if (!listing || !Array.isArray(listing.objects)) {
      throw new Error("R2 inventory failed to return a valid object page");
    }
    if (listing.hasMore && listing.objects.length === 0) {
      throw new Error("R2 inventory returned an empty truncated page");
    }

    for (const object of listing.objects) {
      stats.examined++;
      const key = object.key;
      if (!isStudyOsGroupObjectKey(key)) {
        stats.invalid++;
        continue;
      }

      const modifiedAt = new Date(object.lastModified);
      const ageMs = now.getTime() - modifiedAt.getTime();
      if (!object.etag || Number.isNaN(modifiedAt.getTime()) ||
          ageMs < MIN_OBJECT_AGE_MS) {
        stats.tooRecent++;
        continue;
      }

      // Keep any file still referenced by any existing group message.
      const referenced = await GroupMessage.exists({
        "attachments.storageKey": key,
      });
      const grant = await GroupAttachmentUpload.findOne({ storageKey: key }).lean();
      if (referenced || (grant && new Date(grant.expiresAt) > now)) {
        await R2OrphanCandidate.deleteOne({ storageKey: key });
        stats.protected++;
        continue;
      }

      const previous = await R2OrphanCandidate.findOne({ storageKey: key }).lean();
      if (!previous || !sameObjectVersion(previous, object)) {
        // Require independent observations >=24 hours apart with the same
        // R2 ETag + LastModified before a file is even eligible for cleanup.
        await R2OrphanCandidate.updateOne(
          { storageKey: key },
          {
            $set: {
              etag: object.etag,
              lastModified: modifiedAt,
              firstSeenAt: now,
              lastSeenAt: now,
            },
          },
          { upsert: true }
        );
        stats.suspected++;
        continue;
      }

      await R2OrphanCandidate.updateOne(
        { storageKey: key },
        { $set: { lastSeenAt: now } }
      );

      if (now.getTime() - new Date(previous.firstSeenAt).getTime() <
          MIN_CONFIRMATION_AGE_MS) {
        stats.suspected++;
        continue;
      }

      stats.confirmed++;
      if (!deleteMode) continue;

      // Check both DB ownership AND the physical object once again at
      // deletion time. A changed object always starts a fresh observation.
      const [stillReferenced, currentGrant, head] = await Promise.all([
        GroupMessage.exists({ "attachments.storageKey": key }),
        GroupAttachmentUpload.findOne({ storageKey: key }).lean(),
        r2.getStoredObjectMetadata(key),
      ]);
      if (stillReferenced ||
          (currentGrant && new Date(currentGrant.expiresAt) > now)) {
        await R2OrphanCandidate.deleteOne({ storageKey: key });
        stats.protected++;
        continue;
      }
      if (!sameObjectVersion({
        etag: head.etag,
        lastModified: head.lastModified,
      }, object)) {
        await R2OrphanCandidate.updateOne(
          { storageKey: key },
          {
            $set: {
              etag: String(head.etag || ""),
              lastModified: new Date(head.lastModified),
              firstSeenAt: now,
              lastSeenAt: now,
            },
          }
        );
        stats.versionChanged++;
        continue;
      }

      await r2.deleteStoredObject(key);
      await GroupAttachmentUpload.deleteOne({ storageKey: key });
      await R2OrphanCandidate.deleteOne({ storageKey: key });
      stats.removed++;
    }

    stats.pages++;
    const last = listing.objects[listing.objects.length - 1];
    cursor = listing.hasMore ? last.key : "";
    // Commit the scan cursor only after every object on the page is
    // processed. Any error retries that page without skipping objects.
    await R2OrphanScanState.findOneAndUpdate(
      { _id: CURSOR_ID },
      { $set: { lastKey: cursor } },
      { upsert: true }
    );
    if (!listing.hasMore) break;
  }

  logger.info("R2 cleanup sweep:", stats);
  return stats;
}

module.exports = {
  migrateUploadAuthorizationTtlIndex,
  runGroupOrphanSweep,
  isStudyOsGroupObjectKey,
  MIN_OBJECT_AGE_MS,
  MIN_CONFIRMATION_AGE_MS,
};
