const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const express = require("express");
const { Server } = require("socket.io");
const { io: connect } = require("../../client/node_modules/socket.io-client");

test("revoked, disabled and deleted Firebase sessions lose HTTP and live socket access", async () => {
  const baseNow = Math.floor(Date.now() / 1000);
  const states = new Map([
    ["alice", { disabled: false, tokensValidAfterTime: new Date(0).toISOString() }],
    ["bob", { disabled: false, tokensValidAfterTime: new Date(0).toISOString() }],
    ["carol", { disabled: false, tokensValidAfterTime: new Date(0).toISOString() }],
    ["dave", { disabled: false, tokensValidAfterTime: new Date(0).toISOString() }],
  ]);
  const tokens = new Map([
    ["alice-ok", { uid: "alice", auth_time: baseNow - 50, exp: baseNow + 300 }],
    ["bob-ok", { uid: "bob", auth_time: baseNow - 50, exp: baseNow + 300 }],
    ["carol-ok", { uid: "carol", auth_time: baseNow - 50, exp: baseNow + 300 }],
    ["dave-ok", { uid: "dave", auth_time: baseNow - 50, exp: baseNow + 300 }],
    ["alice-expired", { uid: "alice", auth_time: baseNow - 500, exp: baseNow - 100 }],
  ]);

  const lookups = new Map();
  let temporaryFirebaseFailure = false;
  const admin = {
    async verifyIdToken(token, checkRevoked) {
      assert.equal(checkRevoked, true, "all entry points must check revocation");
      const decoded = tokens.get(token);
      if (!decoded || decoded.exp <= Date.now() / 1000) {
        throw Object.assign(new Error("Expired or unknown token"), { code: "auth/id-token-expired" });
      }
      const record = states.get(decoded.uid);
      if (!record || record.disabled ||
          decoded.auth_time < new Date(record.tokensValidAfterTime).getTime() / 1000) {
        throw Object.assign(new Error("Revoked or disabled user"), { code: "auth/id-token-revoked" });
      }
      return decoded;
    },
    async getUser(uid) {
      lookups.set(uid, (lookups.get(uid) || 0) + 1);
      if (temporaryFirebaseFailure && uid === "dave") {
        throw Object.assign(new Error("Temporary provider outage"), { code: "auth/internal-error" });
      }
      const user = states.get(uid);
      if (!user) throw Object.assign(new Error("User missing"), { code: "auth/user-not-found" });
      return user;
    },
  };

  // Load actual HTTP and Socket.IO authentication middleware, swapping only
  // the Firebase Admin network implementation for isolated synthetic state.
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === "../config/firebaseAdmin" &&
        ["firebaseAuth.js", "socketAuth.js", "firebaseSocketSessionGuard.js"]
          .some(name => parent?.filename?.endsWith(name))) {
      return admin;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  let firebaseAuth, socketAuth, disconnectInvalidFirebaseSockets;
  try {
    firebaseAuth = require("../middleware/firebaseAuth");
    socketAuth = require("../socket/socketAuth");
    ({ disconnectInvalidFirebaseSockets } =
      require("../utils/firebaseSocketSessionGuard"));
  } finally {
    Module._load = originalLoad;
  }

  const app = express();
  app.get("/api/private", firebaseAuth, (req, res) =>
    res.json({ uid: req.user.uid }));
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { transports: ["websocket"] });
  io.use(socketAuth);
  io.on("connection", (socket) => {
    socket.join("user:" + socket.user.uid);
    socket.on("ping-auth", (ack) => ack?.({ uid: socket.user.uid }));
  });

  const clients = [];
  try {
    await new Promise(resolve => httpServer.listen(0, "127.0.0.1", resolve));
    const url = "http://127.0.0.1:" + httpServer.address().port;

    async function request(token) {
      const response = await fetch(url + "/api/private", {
        headers: { Authorization: "Bearer " + token },
      });
      return { status: response.status, body: await response.json() };
    }
    async function connectAs(token) {
      return new Promise(resolve => {
        const client = connect(url, {
          transports: ["websocket"],
          reconnection: false,
          auth: { token },
          timeout: 3000,
        });
        clients.push(client);
        client.once("connect", () => resolve({ client }));
        client.once("connect_error", err =>
          resolve({ error: err.message, client }));
      });
    }

    assert.equal((await request("alice-ok")).status, 200);
    assert.equal((await request("alice-expired")).status, 401);
    assert.equal((await request("not-a-token")).status, 401);
    assert.equal((await request("")).status, 401);

    const a1 = await connectAs("alice-ok");
    const a2 = await connectAs("alice-ok");
    const b = await connectAs("bob-ok");
    const c = await connectAs("carol-ok");
    const d = await connectAs("dave-ok");
    assert.ok(a1.client.connected);
    assert.ok(a2.client.connected);
    assert.ok(b.client.connected);
    assert.ok(c.client.connected);
    assert.ok(d.client.connected);
    assert.ok((await a1.client.timeout(3000).emitWithAck("ping-auth")).uid === "alice");

    // Revoke Alice's sessions, disable Bob, and delete Carol externally.
    states.get("alice").tokensValidAfterTime =
      new Date((baseNow + 10) * 1000).toISOString();
    states.get("bob").disabled = true;
    states.delete("carol");

    assert.equal((await request("alice-ok")).status, 401);
    assert.equal((await request("bob-ok")).status, 401);
    assert.equal((await request("carol-ok")).status, 401);
    assert.equal((await connectAs("alice-ok")).error, "Invalid or expired login");
    assert.equal((await connectAs("bob-ok")).error, "Invalid or expired login");
    assert.equal((await connectAs("carol-ok")).error, "Invalid or expired login");

    const checked = await disconnectInvalidFirebaseSockets(io, {
      auth: admin, now: baseNow * 1000,
      logger: { error() {} },
    });
    assert.equal(checked.checkedSockets, 5);
    assert.equal(checked.checkedUsers, 4);
    assert.equal(checked.disconnected, 4);
    assert.equal(lookups.get("alice"), 1, "two tabs require one Firebase user lookup");
    assert.equal(lookups.get("bob"), 1);
    assert.equal(lookups.get("carol"), 1);
    assert.equal(d.client.connected, true, "unaffected account stays connected");

    // A formerly valid socket can't continue querying realtime handlers.
    const serverSockets = [...io.sockets.sockets.values()];
    assert.equal(serverSockets.length, 1);
    assert.equal(serverSockets[0].user.uid, "dave");

    // Provider outage: avoid booting a healthy account, but expire invalid
    // JWTs even when Firebase user lookup is temporarily unavailable.
    temporaryFirebaseFailure = true;
    const unavailable = await disconnectInvalidFirebaseSockets(io, {
      auth: admin, now: baseNow * 1000, logger: { error() {} },
    });
    assert.equal(unavailable.disconnected, 0);
    assert.equal(d.client.connected, true);

    const expired = await disconnectInvalidFirebaseSockets(io, {
      auth: admin, now: (baseNow + 301) * 1000, logger: { error() {} },
    });
    assert.equal(expired.disconnected, 1);
    assert.equal([...io.sockets.sockets.values()].length, 0);
  } finally {
    for (const entry of clients) entry.disconnect();
    await new Promise(resolve => io.close(resolve));
  }
});
