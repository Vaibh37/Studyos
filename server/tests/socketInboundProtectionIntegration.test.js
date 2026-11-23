const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const { Server } = require("socket.io");
const { io: connect } = require("../../client/node_modules/socket.io-client");

const { socialDB } = require("../config/socialDb");
const Group = require("../models/social/Group");
const GroupMember = require("../models/social/GroupMember");
const LiveSession = require("../models/social/LiveSession");
const { registerSocketInboundProtection } = require("../utils/socketInboundProtection");
const { getAuthenticatedUserRoom } = require("../utils/groupRoomAccess");

test("inbound event limits block database floods across tabs, not other accounts", async () => {
  if (process.env.STUDYOS_TEST_MONGO_URI !==
      "mongodb://127.0.0.1:27017/studyos_security_ci") {
    throw new Error("Refusing Socket.IO test outside isolated CI MongoDB");
  }

  const mainUid = "ci-socket-flood-actor";
  const otherUid = "ci-socket-flood-other";
  const uri = "mongodb://127.0.0.1:27017/studyos_socket_flood_ci";

  // No R2 dependency is exercised by this test. Never load R2 credentials.
  const realLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === "../services/r2Storage" &&
        parent?.filename?.endsWith("liveStudySocket.js")) {
      return { deleteStoredObject: async () => {} };
    }
    return realLoad.call(this, request, parent, isMain);
  };
  let registerLiveStudySocket;
  try {
    registerLiveStudySocket = require("../socket/liveStudySocket");
  } finally {
    Module._load = realLoad;
  }
  const registerGroupTypingSocket = require("../socket/groupTypingSocket");
  const registerGroupReactionSocket = require("../socket/groupReactionSocket");

  const httpServer = http.createServer();
  const io = new Server(httpServer, { transports: ["websocket"] });
  io.use((socket, next) => {
    const uid = socket.handshake.auth?.token;
    if (![mainUid, otherUid].includes(uid)) {
      return next(new Error("Not authenticated"));
    }
    socket.user = { uid, name: uid };
    next();
  });
  io.on("connection", socket => {
    registerSocketInboundProtection(socket);
    socket.join(getAuthenticatedUserRoom(socket.user.uid));
    registerLiveStudySocket(io, socket);
    registerGroupTypingSocket(io, socket);
    registerGroupReactionSocket(io, socket);
  });

  const clients = [];
  const originalMemberLookup = GroupMember.findOne;
  const originalHeartbeatUpdate = LiveSession.findOneAndUpdate;
  let memberQueries = 0;
  let heartbeatWrites = 0;
  let opened = false;
  try {
    await socialDB.openUri(uri);
    opened = true;
    const group = await Group.create({
      name: "Isolated socket flood group",
      ownerId: mainUid,
      inviteCode: "E15B9981",
      visibility: "private",
      memberCount: 2,
    });
    const groupId = String(group._id);
    await GroupMember.create([
      { groupId, userId: mainUid, role: "owner" },
      { groupId, userId: otherUid, role: "member" },
    ]);

    GroupMember.findOne = function(...args) {
      memberQueries++;
      return originalMemberLookup.apply(this, args);
    };
    LiveSession.findOneAndUpdate = function(...args) {
      heartbeatWrites++;
      return originalHeartbeatUpdate.apply(this, args);
    };

    await new Promise(resolve => httpServer.listen(0, "127.0.0.1", resolve));
    const url = "http://127.0.0.1:" + httpServer.address().port;
    async function connectAs(uid) {
      return new Promise((resolve, reject) => {
        const socket = connect(url, {
          auth: { token: uid },
          transports: ["websocket"],
          reconnection: false,
          timeout: 3000,
        });
        clients.push(socket);
        socket.once("connect", () => resolve(socket));
        socket.once("connect_error", reject);
      });
    }
    const actorTabOne = await connectAs(mainUid);
    const actorTabTwo = await connectAs(mainUid);
    const other = await connectAs(otherUid);
    const join = socket =>
      socket.timeout(3000).emitWithAck("group:join", { groupId });

    // 12 joins permitted per Firebase UID in 10 seconds, across all tabs.
    for (let index = 0; index < 7; index++) {
      assert.equal((await join(actorTabOne)).ok, true);
    }
    for (let index = 0; index < 5; index++) {
      assert.equal((await join(actorTabTwo)).ok, true);
    }

    const beforeBlockedJoin = memberQueries;
    const blockedJoin = await join(actorTabOne);
    assert.equal(blockedJoin.ok, false);
    assert.match(blockedJoin.message, /Too many requests/);
    assert.ok(blockedJoin.retryAfterMs > 0);
    assert.equal(memberQueries, beforeBlockedJoin,
      "blocked joins must not query group membership");

    // A separate member does not inherit someone else's limit.
    assert.equal((await join(other)).ok, true);

    // Reactions must be rate limited BEFORE the membership/database lookup.
    const react = socket => socket.timeout(3000).emitWithAck(
      "group:message:reaction-toggle",
      { groupId, messageId: "507f1f77bcf86cd799439011", emoji: "👍" }
    );
    for (let index = 0; index < 8; index++) {
      const response = await react(actorTabOne);
      assert.equal(response.ok, false);
      assert.match(response.message, /Message not found/);
    }
    const beforeBlockedReaction = memberQueries;
    const blockedReaction = await react(actorTabTwo);
    assert.equal(blockedReaction.ok, false);
    assert.match(blockedReaction.message, /Too many requests/);
    assert.equal(memberQueries, beforeBlockedReaction);

    // The normal Focus heartbeat interval is 30s; a malicious 6-event
    // burst must result in at most 5 MongoDB update operations.
    for (let index = 0; index < 6; index++) {
      actorTabOne.emit("focus:heartbeat");
    }
    // The acknowledgment is a packet-order barrier for the prior heartbeats.
    assert.equal((await actorTabOne.timeout(3000).emitWithAck(
      "group:typing:stop", { groupId }
    )).ok, true);
    assert.equal(heartbeatWrites, 5);

    // The other user is still free to send normal heartbeats and reactions.
    other.emit("focus:heartbeat");
    assert.equal((await other.timeout(3000).emitWithAck(
      "group:typing:stop", { groupId }
    )).ok, true);
    assert.equal(heartbeatWrites, 6);
  } finally {
    GroupMember.findOne = originalMemberLookup;
    LiveSession.findOneAndUpdate = originalHeartbeatUpdate;
    for (const socket of clients) socket.disconnect();
    await new Promise(resolve => io.close(resolve));
    if (opened) {
      await socialDB.dropDatabase();
      await socialDB.close();
    }
  }
});
