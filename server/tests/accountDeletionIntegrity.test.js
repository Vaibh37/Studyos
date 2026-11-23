const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const mongoose = require("mongoose");
const express = require("express");
const { socialDB } = require("../config/socialDb");

const Task = require("../models/Task");
const Subject = require("../models/Subject");
const Note = require("../models/Note");
const Event = require("../models/Event");
const StudySession = require("../models/StudySession");
const VisitStreak = require("../models/VisitStreak");
const LeaderboardProfile = require("../models/LeaderboardProfile");
const FocusRun = require("../models/FocusRun");
const Group = require("../models/social/Group");
const GroupMember = require("../models/social/GroupMember");
const GroupMessage = require("../models/social/GroupMessage");
const LiveSession = require("../models/social/LiveSession");
const GroupStudySession = require("../models/social/GroupStudySession");
const GroupAttachmentUpload = require("../models/social/GroupAttachmentUpload");

test("account and group deletion remove issued uploads, personal records and active sockets safely", async () => {
  if (process.env.STUDYOS_TEST_MONGO_URI !==
      "mongodb://127.0.0.1:27017/studyos_security_ci") {
    throw new Error("Refusing deletion test outside isolated CI MongoDB");
  }

  const alice = "ci-delete-alice", bob = "ci-delete-bob";
  const now = Date.now();
  const removedFirebase = [];
  const deletedR2Keys = [];
  const roomOperations = [];
  let simulateR2Failure = false;

  const fakeAuth = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
    const uid = token.split(":")[1];
    if (![alice, bob].includes(uid)) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.user = { uid, name: uid };
    next();
  };
  const fakeAdmin = {
    async verifyIdToken(token, checkRevoked) {
      assert.equal(checkRevoked, true);
      const [type, uid] = token.split(":");
      return {
        uid,
        auth_time: Date.now() / 1000 - (type === "old" ? 601 : 20),
      };
    },
    async deleteUser(uid) { removedFirebase.push(uid); },
  };
  const fakeR2 = {
    async deleteStoredObject(key) {
      if (simulateR2Failure) throw new Error("Simulated R2 outage");
      deletedR2Keys.push(key);
    },
  };
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (["accountDeletionRoutes.js", "groupRoutes.js"].some(
        name => parent?.filename?.endsWith(name))) {
      if (request === "../middleware/firebaseAuth") return fakeAuth;
      if (request === "../config/firebaseAdmin") return fakeAdmin;
      if (request === "../services/r2Storage") return fakeR2;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  let accountRoute, groupRoute;
  try {
    accountRoute = require("../routes/accountDeletionRoutes");
    groupRoute = require("../routes/groupRoutes");
  } finally {
    Module._load = originalLoad;
  }

  const app = express();
  app.use(express.json());
  app.set("io", {
    in(room) {
      return {
        socketsLeave(groupRoom) {
          roomOperations.push({ action: "leave", room, groupRoom });
        },
        disconnectSockets(force) {
          roomOperations.push({ action: "disconnect", room, force });
        },
      };
    },
  });
  app.use("/api/account", accountRoute);
  app.use("/api/groups", groupRoute);
  const server = http.createServer(app);
  const previousFlag = process.env.ENABLE_ACCOUNT_DELETION;
  let defaultOpen = false, socialOpen = false;

  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/studyos_delete_main_ci");
    defaultOpen = true;
    await socialDB.openUri("mongodb://127.0.0.1:27017/studyos_delete_social_ci");
    socialOpen = true;
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;

    async function call(uid, route, method = "GET", body, age = "recent") {
      const response = await fetch(base + route, {
        method,
        headers: {
          Authorization: "Bearer " + age + ":" + uid,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, body: await response.json() };
    }
    const accountDelete = (age = "recent") =>
      call(alice, "/api/account", "DELETE", null, age);
    const grant = async (groupId, userId, storageKey, consumedAt = null) =>
      GroupAttachmentUpload.create({
        groupId, userId, storageKey,
        fileName: "test.pdf", mimeType: "application/pdf",
        size: 50, expiresAt: new Date(now + 60 * 60 * 1000),
        consumedAt,
      });
    const attached = (storageKey, uploadedBy) => ({
      storageKey, uploadedBy, fileName: "test.pdf",
      mimeType: "application/pdf", size: 50,
    });

    delete process.env.ENABLE_ACCOUNT_DELETION;
    assert.equal((await accountDelete()).status, 503);
    process.env.ENABLE_ACCOUNT_DELETION = "true";
    assert.equal((await accountDelete("old")).status, 401);
    assert.equal((await call("anonymous", "/api/account", "DELETE")).status, 401);

    // Account deletion must refuse to destroy a group owned by the user.
    const ownGroup = await Group.create({
      ownerId: alice, name: "Alice group fixture",
      inviteCode: "E2000ABC", visibility: "private", memberCount: 2,
    });
    const ownId = String(ownGroup._id);
    await GroupMember.create([
      { groupId: ownId, userId: alice, role: "owner" },
      { groupId: ownId, userId: bob, role: "member" },
    ]);
    const ownAliceKey = "groups/" + ownId + "/alice-pending";
    const ownBobKey = "groups/" + ownId + "/bob-consumed";
    await grant(ownId, alice, ownAliceKey);
    await grant(ownId, bob, ownBobKey, new Date());
    await GroupMessage.create({
      groupId: ownId, userId: bob, message: "Group-owned message",
      attachments: [attached(ownBobKey, bob)],
    });

    assert.equal((await accountDelete()).status, 409);
    assert.equal((await Group.countDocuments({ ownerId: alice })), 1);
    assert.deepEqual(removedFirebase, []);
    assert.equal((await call(bob, "/api/groups/" + ownId, "DELETE")).status, 403);

    simulateR2Failure = true;
    assert.equal((await call(alice, "/api/groups/" + ownId, "DELETE")).status, 500);
    assert.equal((await Group.countDocuments({ _id: ownId })), 1);
    assert.equal((await GroupAttachmentUpload.countDocuments({ groupId: ownId })), 2);

    simulateR2Failure = false;
    assert.equal((await call(alice, "/api/groups/" + ownId, "DELETE")).status, 200);
    assert.equal((await Group.countDocuments({ _id: ownId })), 0);
    assert.equal((await GroupAttachmentUpload.countDocuments({ groupId: ownId })), 0);
    assert.equal((await GroupMessage.countDocuments({ groupId: ownId })), 0);
    assert.ok(deletedR2Keys.includes(ownAliceKey));
    assert.ok(deletedR2Keys.includes(ownBobKey));

    // Alice is a member of a Bob-owned group. Deleting Alice must preserve
    // Bob's group, messages, attachments and access.
    const sharedGroup = await Group.create({
      ownerId: bob, name: "Bob shared group fixture",
      inviteCode: "E2000ABD", visibility: "private", memberCount: 2,
    });
    const groupId = String(sharedGroup._id);
    await GroupMember.create([
      { groupId, userId: alice, role: "member" },
      { groupId, userId: bob, role: "owner" },
    ]);
    const ownMessageKey = "groups/" + groupId + "/alice-sent";
    const crossAuthorKey = "groups/" + groupId + "/alice-attached-to-bob";
    const unfinalizedKey = "groups/" + groupId + "/alice-upload-not-finalized";
    const bobKey = "groups/" + groupId + "/bob-keep";
    await Promise.all([
      grant(groupId, alice, ownMessageKey, new Date()),
      grant(groupId, alice, crossAuthorKey, new Date()),
      grant(groupId, alice, unfinalizedKey),
      grant(groupId, bob, bobKey),
    ]);

    const aliceMessage = await GroupMessage.create({
      groupId, userId: alice, displayName: "Alice",
      message: "Alice private message",
      attachments: [attached(ownMessageKey, alice)],
    });
    const bobMessage = await GroupMessage.create({
      groupId, userId: bob, message: "Bob's original message",
      replyTo: { messageId: aliceMessage._id, userId: alice, message: "Alice replied" },
      attachments: [attached(crossAuthorKey, alice), attached(bobKey, bob)],
      reactions: [
        { userId: alice, emoji: "👍", displayName: "Alice" },
        { userId: bob, emoji: "🔥", displayName: "Bob" },
      ],
      deletedFor: [alice],
    });
    await LiveSession.create({ groupId, userId: alice });
    await GroupStudySession.create({
      groupId, userId: alice, liveSessionId: new mongoose.Types.ObjectId(),
      startedAt: new Date(now - 60_000), endedAt: new Date(now),
      durationSeconds: 60,
    });

    const subj = await Subject.create({ userId: alice, name: "Alice subject" });
    await Task.create({ userId: alice, title: "Alice task" });
    await Note.create({ userId: alice, title: "Alice private note" });
    await Event.create({ userId: alice, title: "Alice event", date: new Date() });
    await StudySession.create({
      userId: alice, subjectId: subj._id,
      plannedMinutes: 2, durationSeconds: 60,
      startedAt: new Date(now - 60_000), endedAt: new Date(now),
    });
    await VisitStreak.create({ userId: alice });
    await LeaderboardProfile.create({ userId: alice, displayName: "Alice", isPublic: true });
    await FocusRun.create({
      userId: alice, startedAt: new Date(now - 1000),
      expiresAt: new Date(now + 60_000),
    });
    await FocusRun.create({
      userId: bob, startedAt: new Date(now - 1000),
      expiresAt: new Date(now + 60_000),
    });

    simulateR2Failure = true;
    assert.equal((await accountDelete()).status, 500);
    assert.equal((await GroupMember.countDocuments({ userId: alice })), 1);
    assert.equal((await FocusRun.countDocuments({ userId: alice })), 1);
    assert.deepEqual(removedFirebase, []);

    simulateR2Failure = false;
    const success = await accountDelete();
    assert.equal(success.status, 200, JSON.stringify(success.body));
    assert.equal(success.body.deleted, true);
    assert.deepEqual(removedFirebase, [alice]);

    for (const Model of [
      Task, Subject, Note, Event, StudySession,
      VisitStreak, LeaderboardProfile, FocusRun,
    ]) {
      assert.equal(await Model.countDocuments({ userId: alice }), 0, Model.modelName);
    }
    for (const Model of [
      GroupMember, GroupAttachmentUpload, LiveSession, GroupStudySession,
    ]) {
      assert.equal(await Model.countDocuments({ userId: alice }), 0, Model.modelName);
    }
    assert.equal(await GroupMessage.countDocuments({ userId: alice }), 0);
    assert.equal(await Group.countDocuments({ _id: groupId, ownerId: bob }), 1);
    assert.equal((await Group.findById(groupId)).memberCount, 1);
    assert.equal(await GroupMember.countDocuments({ groupId, userId: bob }), 1);
    assert.equal(await GroupAttachmentUpload.countDocuments({ groupId, userId: bob }), 1);
    assert.equal(await FocusRun.countDocuments({ userId: bob }), 1);

    const remaining = await GroupMessage.findById(bobMessage._id).lean();
    assert.equal(remaining.message, "Bob's original message");
    assert.equal(remaining.replyTo, null);
    assert.deepEqual(remaining.attachments.map(a => a.storageKey), [bobKey]);
    assert.deepEqual(remaining.reactions.map(r => r.userId), [bob]);
    assert.deepEqual(remaining.deletedFor, []);

    assert.ok(deletedR2Keys.includes(unfinalizedKey));
    assert.ok(deletedR2Keys.includes(ownMessageKey));
    assert.ok(deletedR2Keys.includes(crossAuthorKey));
    assert.ok(!deletedR2Keys.includes(bobKey));
    assert.ok(roomOperations.some(op =>
      op.action === "leave" && op.room === "user:" + alice &&
      op.groupRoom === "group:" + groupId
    ));
    assert.ok(roomOperations.some(op =>
      op.action === "disconnect" && op.room === "user:" + alice && op.force === true
    ));
    assert.ok(!roomOperations.some(op =>
      op.action === "disconnect" && op.room === "user:" + bob
    ));
  } finally {
    if (previousFlag === undefined) delete process.env.ENABLE_ACCOUNT_DELETION;
    else process.env.ENABLE_ACCOUNT_DELETION = previousFlag;
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    if (socialOpen) { await socialDB.dropDatabase(); await socialDB.close(); }
    if (defaultOpen) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
  }
});
