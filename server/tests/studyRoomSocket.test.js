const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { Server } = require("socket.io");
const { io: connect } = require("../../client/node_modules/socket.io-client");
const { createStudyRoomPresence } = require("../socket/studyRoomSocket");
const { registerSocketInboundProtection } = require("../utils/socketInboundProtection");
const { validateSocketPacket } = require("../utils/socketEventValidation");
const { revokeMemberGroupAccess, revokeDeletedGroupAccess, getAuthenticatedUserRoom } = require("../utils/groupRoomAccess");

const GROUP = "507f1f77bcf86cd799439011";
const PRIVATE = `group:${GROUP}`;
const PUBLIC = "public:quiet";
const data = (roomId = PUBLIC, status = "idle", subject = "") => ({ roomId, status, subject });
const event = (socket, name) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => { socket.off(name, listener); reject(new Error("Missing " + name)); }, 2500);
  function listener(value) { clearTimeout(timeout); resolve(value); }
  socket.once(name, listener);
});
const request = (socket, name, payload) => socket.timeout(3000).emitWithAck(name, payload);

test("room packets accept only bounded primitive fields and known room identifiers", () => {
  assert.equal(validateSocketPacket(["study-room:join", data()]), true);
  assert.equal(validateSocketPacket(["study-room:join", data(PRIVATE, "paused")]), true);
  for (const payload of [
    data("public:unknown"), data("group:invalid"), data(PUBLIC, "online"),
    data(PUBLIC, "running", "x".repeat(81)), { ...data(), uid: "other" },
    { ...data(), elapsedMs: 999999 }, { ...data(), roomId: { $ne: null } },
    { ...data(), subject: [] },
  ]) assert.equal(validateSocketPacket(["study-room:join", payload]), false);
  assert.equal(validateSocketPacket(["study-room:leave", { roomId: PUBLIC }]), true);
});

test("real room sockets: live state, server time, private authorization, deduplication, leave, reconnect and revocation", async t => {
  let clock = 100_000;
  const srv = http.createServer();
  const io = new Server(srv);
  const clients = [];
  const allowed = new Set(["room-alice", "room-bob"]);
  const manager = createStudyRoomPresence(io, {
    clock: () => clock,
    membership: async (id, uid) => id === GROUP && allowed.has(uid) ? { displayName: uid + " name" } : null,
  });
  io.studyRoomPresence = manager;
  io.use((socket, next) => { socket.user = { uid: socket.handshake.auth.uid, name: socket.handshake.auth.uid, email: "private@test.invalid" }; next(); });
  io.on("connection", socket => {
    socket.join(getAuthenticatedUserRoom(socket.user.uid));
    registerSocketInboundProtection(socket);
    manager.register(socket);
  });
  await new Promise(resolve => srv.listen(0, "127.0.0.1", resolve));
  t.after(async () => { for (const socket of clients) socket.disconnect(); await new Promise(resolve => io.close(resolve)); });
  async function open(uid) {
    const socket = connect(`http://127.0.0.1:${srv.address().port}`, { auth: {uid}, transports: ["websocket"], forceNew: true });
    clients.push(socket);
    await event(socket, "connect");
    return socket;
  }
  const [alice, bob, stranger] = await Promise.all(["room-alice", "room-bob", "room-stranger"].map(open));
  assert.equal((await request(stranger, "study-room:join", data(PRIVATE))).ok, false);
  assert.equal((await request(stranger, "study-room:state", data(PUBLIC, "running"))).ok, false);
  const initial = await request(alice, "study-room:join", data());
  assert.equal(initial.ok, true);
  assert.equal(initial.participants.length, 1);
  assert.equal(initial.participants[0].name, "room-alice");
  assert.equal(Object.hasOwn(initial.participants[0], "uid"), false);
  assert.equal(Object.hasOwn(initial.participants[0], "email"), false);
  const newArrival = event(alice, "study-room:snapshot");
  const bobJoin = await request(bob, "study-room:join", data(PUBLIC, "running", "Math"));
  assert.equal(bobJoin.participants.length, 2);
  assert.equal((await newArrival).participants.length, 2);
  clock += 12_000;
  const pause = event(alice, "study-room:snapshot");
  assert.equal((await request(bob, "study-room:state", data(PUBLIC, "paused", "Math"))).ok, true);
  let snapshot = await pause;
  let member = snapshot.participants.find(p => p.id === bobJoin.participantId);
  assert.equal(member.elapsedMs, 12_000);
  assert.equal(member.startedAt, null);
  assert.equal(member.status, "paused");
  clock += 5_000;
  const resume = event(alice, "study-room:snapshot");
  await request(bob, "study-room:state", data(PUBLIC, "running", ""));
  member = (await resume).participants.find(p => p.id === bobJoin.participantId);
  assert.equal(member.startedAt, clock);
  assert.equal(member.elapsedMs, 12_000);
  assert.equal(member.subject, "");
  clock += 2_000;
  const bobTab = await open("room-bob");
  const removed = event(bob, "study-room:removed");
  const duplicate = await request(bobTab, "study-room:join", data(PUBLIC, "running"));
  assert.equal((await removed).roomId, PUBLIC);
  assert.equal(duplicate.participants.length, 2);
  assert.equal(duplicate.participantId, bobJoin.participantId);
  assert.equal(duplicate.participants.find(p => p.id === bobJoin.participantId).elapsedMs, 14_000);
  assert.equal((await request(bob, "study-room:state", data(PUBLIC, "idle"))).ok, false);
  const leave = event(alice, "study-room:snapshot");
  await request(bobTab, "study-room:leave", { roomId: PUBLIC });
  assert.equal((await leave).participants.length, 1);
  clock += 11_000;
  const reconnect = await request(bobTab, "study-room:join", data(PUBLIC, "running"));
  assert.equal(reconnect.participants.length, 2);
  const disconnect = event(alice, "study-room:snapshot");
  clock += 3500;
  bobTab.disconnect();
  assert.equal((await disconnect).participants.length, 1);
  clock += 11_000;
  bobTab.connect();
  await event(bobTab, "connect");
  const rejoined = await request(bobTab, "study-room:join", data(PUBLIC, "running"));
  assert.equal(rejoined.participants.length, 2);
  assert.equal(rejoined.participantId, reconnect.participantId);
  assert.equal(rejoined.participants.find(p => p.id === rejoined.participantId).elapsedMs, 3500);
  clock += 2500;
  const finished = event(alice, "study-room:snapshot");
  await request(bobTab, "study-room:state", data(PUBLIC, "idle"));
  const completed = (await finished).participants.find(p => p.id === rejoined.participantId);
  assert.equal(completed.elapsedMs, 6000);
  assert.equal(completed.startedAt, null);


  // A distinct room cannot receive public snapshots or join without membership.
  const privateAlice = await request(alice, "study-room:join", data(PRIVATE, "running"));
  assert.equal(privateAlice.participants.length, 1);
  assert.equal((await request(bobTab, "study-room:join", data(PRIVATE))).participants.length, 2);
  assert.equal((await request(stranger, "study-room:join", data(PRIVATE))).ok, false);
  const revoked = event(bobTab, "study-room:removed");
  allowed.delete("room-bob");
  revokeMemberGroupAccess(io, GROUP, "room-bob");
  assert.equal((await revoked).roomId, PRIVATE);
  assert.equal((await request(bobTab, "study-room:state", data(PRIVATE, "running"))).ok, false);
  const deleted = event(alice, "study-room:removed");
  revokeDeletedGroupAccess(io, GROUP);
  assert.equal((await deleted).roomId, PRIVATE);
  assert.equal((await request(alice, "study-room:state", data(PRIVATE, "running"))).ok, false);
});

test("live room directory reveals only aggregate occupancy, checks private membership and revokes subscriptions", async t => {
  const srv = http.createServer();
  const io = new Server(srv);
  const clients = [];
  const memberIds = new Set(["directory-alice", "directory-bob"]);
  const manager = createStudyRoomPresence(io, {
    membership: async (id, uid) => id === GROUP && memberIds.has(uid) ? { displayName: uid } : null,
    directoryMembership: async (ids, uid) => memberIds.has(uid) ? ids.filter(id => id === GROUP) : [],
  });
  io.studyRoomPresence = manager;
  io.use((socket,next) => { socket.user={uid:socket.handshake.auth.uid,name:socket.handshake.auth.uid};next(); });
  io.on("connection",socket => {
    socket.join(getAuthenticatedUserRoom(socket.user.uid));
    registerSocketInboundProtection(socket);
    manager.register(socket);
  });
  await new Promise(resolve=>srv.listen(0,"127.0.0.1",resolve));
  t.after(async()=>{for(const socket of clients)socket.disconnect();await new Promise(resolve=>io.close(resolve));});
  async function open(uid) {
    const socket=connect(`http://127.0.0.1:${srv.address().port}`,{auth:{uid},transports:["websocket"],forceNew:true});
    clients.push(socket);await event(socket,"connect");return socket;
  }
  const [alice,bob,stranger]=await Promise.all(["directory-alice","directory-bob","directory-stranger"].map(open));
  const subscribed=await request(alice,"study-room:directory:subscribe",{groupIds:[GROUP]});
  assert.equal(subscribed.ok,true);
  assert.equal(subscribed.rooms.length,5);
  assert.equal(subscribed.rooms.find(x=>x.roomId===PRIVATE).total,0);
  const denied=await request(stranger,"study-room:directory:subscribe",{groupIds:[GROUP]});
  assert.equal(denied.rooms.length,4);
  assert.equal(denied.rooms.some(x=>x.roomId===PRIVATE),false);
  assert.equal(validateSocketPacket(["study-room:directory:subscribe",{groupIds:[{$ne:null}]}]),false);
  assert.equal(validateSocketPacket(["study-room:directory:subscribe",{groupIds:Array(101).fill(GROUP)}]),false);
  let leaked=0;
  stranger.on("study-room:occupancy",summary=>{if(summary.roomId===PRIVATE)leaked++;});
  const change=event(alice,"study-room:occupancy");
  await request(bob,"study-room:join",data(PRIVATE,"running","Private topic"));
  const summary=await change;
  assert.deepEqual(summary,{roomId:PRIVATE,total:1,studying:1,capacity:200});
  const pause=event(alice,"study-room:occupancy");
  await request(bob,"study-room:state",data(PRIVATE,"paused","Private topic"));
  assert.equal((await pause).studying,0);
  const revoked=event(alice,"study-room:occupancy:removed");
  memberIds.delete("directory-alice");
  revokeMemberGroupAccess(io,GROUP,"directory-alice");
  assert.equal((await revoked).roomId,PRIVATE);
  let afterRevocation=0;
  alice.on("study-room:occupancy",s=>{if(s.roomId===PRIVATE)afterRevocation++;});
  await request(bob,"study-room:state",data(PRIVATE,"running","Private topic"));
  const publicChange=event(stranger,"study-room:occupancy");
  await request(bob,"study-room:join",data(PUBLIC,"running","Public topic"));
  assert.deepEqual(await publicChange,{roomId:PUBLIC,total:1,studying:1,capacity:200});
  assert.equal(leaked,0);
  assert.equal(afterRevocation,0);
  await request(stranger,"study-room:directory:unsubscribe",{});
  let afterUnsubscribe=0;stranger.on("study-room:occupancy",()=>afterUnsubscribe++);
  await request(bob,"study-room:state",data(PUBLIC,"paused"));
  await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(afterUnsubscribe,0);
});
