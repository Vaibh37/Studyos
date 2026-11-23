const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");
const Module = require("node:module");
const express = require("express");

const { socialDB } = require("../config/socialDb");
const Group = require("../models/social/Group");
const GroupMember = require("../models/social/GroupMember");
const GroupMessage = require("../models/social/GroupMessage");
const GroupAttachmentUpload = require("../models/social/GroupAttachmentUpload");

// Must only run with GitHub Actions' isolated local MongoDB service.
// Never use any real Cloudflare R2 credentials or customer records here.
test("group attachments enforce original uploader, single-use finalization and private downloads", async () => {
  if (process.env.STUDYOS_TEST_MONGO_URI !== "mongodb://127.0.0.1:27017/studyos_security_ci") {
    throw new Error("Refusing attachment test outside isolated CI MongoDB");
  }

  const databaseUri = "mongodb://127.0.0.1:27017/studyos_attachment_auth_ci";
  const owner = "ci-attachment-owner";
  const member = "ci-attachment-member";
  const outsider = "ci-attachment-outsider";
  const stored = new Map();
  const fakeR2 = {
    sanitizeFileName: (name) => String(name).trim(),
    createGroupStorageKey: (groupId, name) =>
      ["groups", String(groupId), crypto.randomUUID(), name].join("/"),
    createUploadUrl: async () => ({
      uploadUrl: "https://r2-test.invalid/signed-put",
      expiresIn: 300,
    }),
    getStoredObjectMetadata: async (key) => {
      if (!stored.has(key)) {
        const error = new Error("Object not found");
        error.name = "NoSuchKey";
        throw error;
      }
      return stored.get(key);
    },
    createDownloadUrl: async ({ storageKey }) => ({
      downloadUrl: "https://r2-test.invalid/signed-get/" + encodeURIComponent(storageKey),
      expiresIn: 600,
    }),
  };

  const fakeAuth = (req, res, next) => {
    const uid = req.headers.authorization?.replace(/^Bearer /, "");
    if (![owner, member, outsider].includes(uid)) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.user = { uid, name: uid };
    next();
  };

  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename?.endsWith("groupAttachmentRoutes.js")) {
      if (request === "../middleware/firebaseAuth") return fakeAuth;
      if (request === "../services/r2Storage") return fakeR2;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  let router;
  try {
    router = require("../routes/groupAttachmentRoutes");
  } finally {
    Module._load = originalLoad;
  }

  const app = express();
  app.use(express.json());
  app.set("io", { to: () => ({ emit() {} }) });
  app.use("/api/groups", router);
  const server = http.createServer(app);

  let opened = false;
  try {
    await socialDB.openUri(databaseUri);
    opened = true;
    const group = await Group.create({
      name: "Private upload access fixture",
      description: "Test only",
      ownerId: owner,
      inviteCode: "E98A4321",
      visibility: "private",
      memberCount: 2,
    });
    const groupId = String(group._id);
    await GroupMember.create([
      { groupId, userId: owner, role: "owner" },
      { groupId, userId: member, role: "member" },
    ]);

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;

    async function call(uid, route, method = "GET", body) {
      const response = await fetch(base + "/api/groups/" + groupId + route, {
        method,
        headers: {
          Authorization: "Bearer " + uid,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, body: await response.json() };
    }
    async function issue(uid, name = "report.pdf") {
      return call(uid, "/attachments/upload-url", "POST", {
        fileName: name,
        mimeType: "application/pdf",
        size: 112,
      });
    }

    assert.equal((await issue(outsider)).status, 403);
    const issued = await issue(owner);
    assert.equal(issued.status, 200);
    const attachment = issued.body.attachment;
    assert.ok(attachment.storageKey.startsWith("groups/" + groupId + "/"));
    assert.equal((await GroupAttachmentUpload.countDocuments({
      storageKey: attachment.storageKey, userId: owner,
    })), 1);

    stored.set(attachment.storageKey, { size: 112, mimeType: "application/pdf" });

    // Membership alone is not sufficient to claim somebody else's R2 upload.
    const stolen = await call(member, "/attachments/finalize", "POST", {
      attachments: [attachment],
      message: "Attempted impersonation",
    });
    assert.equal(stolen.status, 403);
    assert.equal(await GroupMessage.countDocuments({ groupId }), 0);

    // Even the original uploader cannot change signed file metadata.
    assert.equal((await call(owner, "/attachments/finalize", "POST", {
      attachments: [{ ...attachment, fileName: "forged.pdf" }],
    })).status, 403);

    // New verification blocks missing uploads, even if a URL was issued.
    const unuploaded = await issue(owner, "empty.pdf");
    assert.equal(unuploaded.status, 200);
    assert.equal((await call(owner, "/attachments/finalize", "POST", {
      attachments: [unuploaded.body.attachment],
    })).status, 400);

    // Happy path is unchanged for the intended uploading user.
    const success = await call(owner, "/attachments/finalize", "POST", {
      attachments: [attachment],
      message: "Owner's uploaded report",
    });
    assert.equal(success.status, 201, JSON.stringify(success.body));
    const messageId = String(success.body.message._id);
    assert.equal(success.body.message.userId, owner);
    assert.equal(success.body.message.attachments[0].uploadedBy, owner);
    assert.equal(await GroupMessage.countDocuments({ groupId }), 1);

    // An issued upload is single-use; it cannot be attached a second time.
    const reused = await call(owner, "/attachments/finalize", "POST", {
      attachments: [attachment],
    });
    assert.ok([403, 409].includes(reused.status));
    assert.equal(await GroupMessage.countDocuments({ groupId }), 1);

    const key = encodeURIComponent(attachment.storageKey);
    const download = `/messages/${messageId}/attachments/download-url?storageKey=${key}`;
    assert.equal((await call(outsider, download)).status, 403);
    assert.equal((await call(member, download)).status, 200);

    // "Delete for me" must also prevent new presigned download links.
    await GroupMessage.updateOne({ _id: messageId }, { $addToSet: { deletedFor: member } });
    assert.equal((await call(member, download)).status, 404);
    assert.equal((await call(owner, download)).status, 200);

    // A forged storage key must never produce a signed download URL.
    const wrongKey = encodeURIComponent("groups/" + groupId + "/other-file");
    assert.equal((await call(owner,
      `/messages/${messageId}/attachments/download-url?storageKey=${wrongKey}`
    )).status, 404);
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    if (opened) {
      await socialDB.dropDatabase();
      await socialDB.close();
    }
  }
});
