const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const { Server } = require("socket.io");
const { io: connect } = require("../../client/node_modules/socket.io-client");
const { validateSocketPacket } = require("../utils/socketEventValidation");
const { registerSocketInboundProtection } = require("../utils/socketInboundProtection");
const { createSocketRateLimiter } = require("../utils/socketRateLimiter");
const { createSocketAdmission } = require("../utils/socketAdmission");
const { publicGroupMessage } = require("../utils/publicGroupMessage");
const { getGroupRoom, revokeMemberGroupAccess } = require("../utils/groupRoomAccess");
const { validAuthToken } = require("../utils/authToken");

const id = "507f1f77bcf86cd799439011";
const msg = "507f1f77bcf86cd799439012";
const noop = () => {};

test("realtime schemas reject query selectors, unsafe argument shapes and unknown events", () => {
  for (const bad of [null, [], {}, {$ne: null}, {$in: [id]}, [id], 5, "invalid-id"]) {
    assert.equal(validateSocketPacket(["group:join", {groupId: bad}, noop]), false);
    assert.equal(validateSocketPacket(["group:message:unsend", {groupId: id, messageId: bad}, noop]), false);
  }
  for (const packet of [
    ["group:join", {groupId: id}, "not-a-callback", noop],
    ["group:join", {groupId: id, unexpected: true}, noop],
    ["group:join", JSON.parse('{"groupId":"' + id + '","__proto__":{}}'), noop],
    ["group:message:send", {groupId: id, message: "x".repeat(2001)}, noop],
    ["group:message:send", {groupId: id, message: "hello", replyToMessageId: {$ne: null}}, noop],
    ["focus:start", {groupId: id, subjectId: {$ne: null}}, noop],
    ["focus:stop", {durationSeconds: { $gt: 0 }}, noop],
    ["focus:heartbeat", {groupId: id}],
    ["unknown:event", {}, noop],
  ]) assert.equal(validateSocketPacket(packet), false, packet[0]);
  const valid = ["group:join", {groupId: id.toUpperCase()}, noop];
  assert.equal(validateSocketPacket(valid), true);
  assert.equal(valid[1].groupId, id);
  assert.equal(validateSocketPacket(["group:message:send", {groupId: id, message: "hello", replyToMessageId: ""}, noop]), true);
  assert.equal(validateSocketPacket(["group:message:reaction-toggle", {groupId: id, messageId: msg, emoji: "👍"}, noop]), true);
  assert.equal(validateSocketPacket(["focus:start", {groupId: id, subjectId: null, subjectName: "General Study"}, noop]), true);
  assert.equal(validateSocketPacket(["focus:stop", {durationSeconds: 42}, noop]), true);
  assert.equal(validateSocketPacket(["focus:stop", noop]), true);
  assert.equal(validateSocketPacket(["focus:stop"]), true);
  assert.equal(validateSocketPacket(["focus:heartbeat"]), true);
});

test("rate limits expire inactive keys without evicting active budgets", () => {
  let now = 1000;
  const limit = createSocketRateLimiter([{ windowMs: 100, max: 2 }], {clock: () => now, maxKeys: 2});
  assert.equal(limit("a").allowed, true);
  assert.equal(limit("a").allowed, true);
  assert.equal(limit("b").allowed, true);
  assert.equal(limit("c").allowed, false);
  assert.equal(limit("a").allowed, false);
  now += 101;
  assert.equal(limit("c").allowed, true);
  assert.equal(limit("a").allowed, true);
});

test("room revocation is canonical; unsent and private hide metadata never leaves the server", () => {
  assert.equal(getGroupRoom(id.toUpperCase()), getGroupRoom(id));
  const calls = [];
  revokeMemberGroupAccess({in: room => ({socketsLeave: target => calls.push([room, target])})}, id.toUpperCase(), "member");
  assert.deepEqual(calls, [["user:member", getGroupRoom(id)]]);
  const db = {_id: msg, message: "text", deletedFor: ["member"], attachments: [{storageKey: "private"}],
    reactions: [{emoji: "👍"}], replyTo: {message: "quote"}, isUnsent: true};
  const safe = publicGroupMessage(db);
  assert.equal(Object.hasOwn(safe, "deletedFor"), false);
  assert.equal(safe.message, null);
  assert.deepEqual(safe.attachments, []);
  assert.deepEqual(safe.reactions, []);
  assert.equal(safe.replyTo, null);
  assert.equal(db.attachments.length, 1, "database cleanup metadata retained");
  assert.equal(db.deletedFor.length, 1);
  assert.equal(publicGroupMessage({...db, isUnsent:false}).message, "text");
});

test("auth inputs are bounded before Firebase verification", () => {
  assert.equal(validAuthToken("example-token"), true);
  for (const value of [null, {}, ["token"], 123, "", "  ", "x".repeat(8193)]) assert.equal(validAuthToken(value), false);
});

test("connection admission checks origin then shares IP budgets across IPv6 addresses", () => {
  const limit = createSocketRateLimiter([{windowMs: 1000, max: 1}]);
  const admit = createSocketAdmission({ limiter: limit, readIp: req => req.ip,
    origin: (origin, cb) => cb(null, origin === "https://allowed.example" || !origin) });
  const call = (origin, ip) => new Promise(resolve => admit({headers:{origin},ip}, (message, allowed) => resolve({message, allowed})));
  return (async () => {
    assert.equal((await call("https://rejected.example", "2001:db8:abcd:1200::1")).allowed, false);
    assert.equal((await call("https://allowed.example", "2001:db8:abcd:1200::1")).allowed, true);
    assert.equal((await call("https://allowed.example", "2001:db8:abcd:1200::2")).allowed, false);
    assert.equal((await call(undefined, "192.0.2.1")).allowed, true);
    assert.equal((await call(undefined, null)).allowed, false);
  })();
});

test("real Socket.IO rejects invalid packets before handlers and denies foreign WebSocket origins", async () => {
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    allowRequest: createSocketAdmission({ readIp: () => "192.0.2.1", origin: (value, cb) => cb(null, value !== "https://untrusted.example") }),
    maxHttpBufferSize: 32 * 1024,
  });
  let handlerCalls = 0, joinedId;
  io.use((socket, next) => {socket.user = {uid: "isolated-test-user"}; next()});
  io.on("connection", socket => {
    registerSocketInboundProtection(socket);
    socket.on("group:join", (data, ack) => {
      handlerCalls++;
      joinedId = data.groupId;
      ack?.({ok: true});
    });
  });
  const clients = [];
  try {
    await new Promise(resolve => httpServer.listen(0, "127.0.0.1", resolve));
    const url = "http://127.0.0.1:" + httpServer.address().port;
    async function connectAs(extraHeaders) {
      const client = connect(url, {transports:["websocket"], extraHeaders, timeout:2000, reconnection:false, forceNew:true});
      clients.push(client);
      return new Promise(resolve => {
        client.once("connect", () => resolve({client, allowed:true}));
        client.once("connect_error", () => resolve({client, allowed:false}));
      });
    }
    assert.equal((await connectAs({Origin:"https://untrusted.example"})).allowed, false);
    const {client, allowed} = await connectAs({Origin:"https://allowed.example"});
    assert.equal(allowed, true);
    const invoke = (...args) => client.timeout(2000).emitWithAck("group:join", ...args);
    assert.equal((await invoke({groupId:{$ne:null}})).ok, false);
    assert.equal((await invoke({groupId:id}, "not-a-callback")).ok, false);
    assert.equal((await invoke({groupId:id.toUpperCase()})).ok, true);
    assert.equal(handlerCalls, 1);
    assert.equal(joinedId, id);
  } finally {
    for (const client of clients) client.disconnect();
    await io.close();
  }
});

test("expiry timer disconnects a socket without waiting for Firebase network rechecks", () => {
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === "../config/firebaseAdmin" && parent?.filename?.endsWith("firebaseSocketSessionGuard.js")) return {};
    return originalLoad.call(this, request, parent, isMain);
  };
  let enforceSocketExpiry;
  try { ({enforceSocketExpiry} = require("../utils/firebaseSocketSessionGuard")) }
  finally { Module._load = originalLoad; }
  let disconnected = 0, scheduled, listener, canceled;
  const socket = {data: {firebaseSession: {expiresAt: 2}}, disconnect: () => disconnected++,
    once: (event, cb) => {assert.equal(event, "disconnect"); listener = cb}};
  const timer = {unref(){}};
  assert.equal(enforceSocketExpiry(socket, {clock: () => 1000, schedule: (cb, ms) => {
    assert.equal(ms, 1000); scheduled = cb; return timer;
  }, cancel: value => {canceled = value}}), true);
  scheduled(); assert.equal(disconnected, 1);
  listener(); assert.equal(canceled, timer);
  assert.equal(enforceSocketExpiry(socket, {clock: () => 2000}), false);
  assert.equal(disconnected, 2);
});

test("R2 presigned PUT cryptographically binds approved file size and MIME type", async () => {
  const { S3Client } = require("@aws-sdk/client-s3");
  const fakeClient = new S3Client({region:"auto", endpoint:"https://storage.example.invalid",
    credentials:{accessKeyId:"synthetic-test-key", secretAccessKey:"synthetic-test-secret"}});
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === "../config/r2" && parent?.filename?.endsWith("r2Storage.js")) {
      return {r2Client: fakeClient, R2_BUCKET_NAME: "test-bucket"};
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  let createUploadUrl;
  try { ({createUploadUrl} = require("../services/r2Storage")) }
  finally { Module._load = originalLoad; }
  try {
    const {uploadUrl} = await createUploadUrl({storageKey:"groups/test/document.pdf",mimeType:"application/pdf",size:112});
    const signed = new URL(uploadUrl).searchParams.get("X-Amz-SignedHeaders").split(";");
    assert.ok(signed.includes("content-type"), signed.join(","));
    assert.ok(signed.includes("content-length"), signed.join(","));
    await assert.rejects(createUploadUrl({storageKey:"test",mimeType:"application/pdf",size:25*1024*1024+1}), /Valid upload size/);
    await assert.rejects(createUploadUrl({storageKey:"test",mimeType:"application/pdf",size:1.5}), /Valid upload size/);
  } finally {fakeClient.destroy()}
});

test("authenticated API budget applies across IPs without blocking other accounts", async () => {
  const express = require("express");
  const { authenticatedApiLimiter } = require("../middleware/rateLimiters");
  const app = express();
  app.set("trust proxy", 1);
  app.get("/private", (req, res, next) => {
    req.user = { uid: req.headers.authorization };
    authenticatedApiLimiter(req, res, next);
  }, (req, res) => res.json({ok:true}));
  const server = http.createServer(app);
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    const call = (uid, ip) => fetch(base + "/private", {headers:{authorization:uid,"x-forwarded-for":ip}}).then(async r => {
      await r.arrayBuffer();
      return r.status;
    });
    for (let i = 0; i < 360; i++) {
      assert.equal(await call("budget-alice", i%2 ? "192.0.2.10" : "192.0.2.11"), 200);
    }
    assert.equal(await call("budget-alice", "192.0.2.12"), 429);
    assert.equal(await call("budget-bob", "192.0.2.12"), 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
