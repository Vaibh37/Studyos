const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const express = require("express");
const { Server } = require("socket.io");
const { io: connect } = require("../../client/node_modules/socket.io-client");

const { socialDB } = require("../config/socialDb");
const Group = require("../models/social/Group");
const GroupMember = require("../models/social/GroupMember");
const {
  getAuthenticatedUserRoom,
} = require("../utils/groupRoomAccess");

// This integration test runs only against a deliberately isolated local
// MongoDB provided by GitHub Actions. Never point it at production data.
test("removing one of two group members immediately revokes all live sockets and blocks rejoin", async () => {
  if (process.env.STUDYOS_TEST_MONGO_URI !== "mongodb://127.0.0.1:27017/studyos_security_ci") {
    throw new Error("Refusing group integration test outside isolated CI MongoDB");
  }

  const ownerUid = "ci-owner";
  const memberUid = "ci-member";
  const outsiderUid = "ci-outsider";
  const uri = "mongodb://127.0.0.1:27017/studyos_group_socket_ci";

  // Replace only this route module's Firebase middleware with synthetic test
  // identities. The real group data, Express route and Socket.IO stay intact.
  const fakeAuth = (req, res, next) => {
    const uid = req.headers.authorization?.replace(/^Bearer /, "");
    if (![ownerUid, memberUid, outsiderUid].includes(uid)) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.user = { uid, name: uid };
    next();
  };
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename?.endsWith("groupRoutes.js") &&
        request === "../middleware/firebaseAuth") {
      return fakeAuth;
    }
    // File operations are not exercised; never require real Cloudflare
    // credentials for security integration tests.
    if (request === "../services/r2Storage" &&
        ["groupRoutes.js", "liveStudySocket.js"].some((name) =>
          parent?.filename?.endsWith(name))) {
      return { deleteStoredObject: async () => {} };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  let groupRoutes;
  let registerLiveStudySocket;
  try {
    groupRoutes = require("../routes/groupRoutes");
    registerLiveStudySocket = require("../socket/liveStudySocket");
  } finally {
    Module._load = originalLoad;
  }

  const app = express();
  app.use(express.json());
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { transports: ["websocket"] });
  app.set("io", io);
  app.use("/api/groups", groupRoutes);

  io.use((socket, next) => {
    const uid = socket.handshake.auth?.token;
    if (![ownerUid, memberUid, outsiderUid].includes(uid)) {
      return next(new Error("Not authorized"));
    }
    socket.user = { uid, name: uid };
    return next();
  });

  io.on("connection", (socket) => {
    // Exactly the production connection setup, including private user room.
    socket.join(getAuthenticatedUserRoom(socket.user.uid));
    registerLiveStudySocket(io, socket);
  });

  const clients = [];
  let openedDb = false;
  try {
    await socialDB.openUri(uri);
    openedDb = true;
    const group = await Group.create({
      name: "Isolated socket permissions test",
      ownerId: ownerUid,
      inviteCode: "E10A9999",
      visibility: "private",
      memberCount: 2,
    });
    const groupId = String(group._id);
    await GroupMember.create([
      { groupId, userId: ownerUid, role: "owner" },
      { groupId, userId: memberUid, role: "member" },
    ]);

    await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const port = httpServer.address().port;
    const base = "http://127.0.0.1:" + port;

    async function connectAs(uid) {
      return new Promise((resolve, reject) => {
        const client = connect(base, {
          transports: ["websocket"],
          reconnection: false,
          timeout: 3000,
          auth: { token: uid },
        });
        clients.push(client);
        client.once("connect", () => resolve(client));
        client.once("connect_error", reject);
      });
    }

    async function api(path, uid, method = "GET") {
      return fetch(base + path, {
        method,
        headers: { Authorization: "Bearer " + uid },
      });
    }

    const owner = await connectAs(ownerUid);
    const memberA = await connectAs(memberUid);
    const memberB = await connectAs(memberUid);
    const outsider = await connectAs(outsiderUid);
    const join = (client) => client.timeout(3000).emitWithAck("group:join", { groupId });

    assert.equal((await join(owner)).ok, true);
    assert.equal((await join(memberA)).ok, true);
    assert.equal((await join(memberB)).ok, true);
    assert.equal((await join(outsider)).ok, false);

    const room = "group:" + groupId;
    const members = () => io.of("/").adapter.rooms.get(room);
    assert.equal(members()?.size, 3);

    // Unrelated accounts cannot kick another group's member.
    assert.equal((await api("/api/groups/" + groupId + "/members/" + memberUid,
      outsiderUid, "DELETE")).status, 403);
    assert.equal(members()?.size, 3);

    const kicked = await api("/api/groups/" + groupId + "/members/" + memberUid,
      ownerUid, "DELETE");
    assert.equal(kicked.status, 200, await kicked.text());

    // Two live tabs/devices of the removed member are both immediately evicted,
    // while the owner's live subscription and socket connections stay intact.
    assert.deepEqual([...members()], [owner.id]);
    assert.equal(memberA.connected, true);
    assert.equal(memberB.connected, true);
    assert.equal(owner.connected, true);

    const observed = { owner: 0, memberA: 0, memberB: 0 };
    owner.on("group:message:new", () => observed.owner++);
    memberA.on("group:message:new", () => observed.memberA++);
    memberB.on("group:message:new", () => observed.memberB++);

    const response = await owner.timeout(3000).emitWithAck(
      "group:message:send",
      { groupId, message: "Owner-only message after kick" },
    );
    assert.equal(response.ok, true);
    // Emitted to the remaining room member, not to either removed connection.
    assert.equal(observed.owner, 1);
    assert.equal(observed.memberA, 0);
    assert.equal(observed.memberB, 0);

    assert.equal((await join(memberA)).ok, false);
    assert.equal((await join(memberB)).ok, false);
    assert.equal((await api("/api/groups/" + groupId + "/messages", memberUid)).status, 403);
    assert.equal((await api("/api/groups/" + groupId + "/messages", ownerUid)).status, 200);
  } finally {
    for (const client of clients) client.disconnect();
    await new Promise((resolve) => io.close(resolve));
    if (openedDb) {
      await socialDB.dropDatabase();
      await socialDB.close();
    }
  }
});
