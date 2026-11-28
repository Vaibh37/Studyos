// Silent live rooms are ephemeral presence, never leaderboard evidence.
// All timing is measured by the server; no client-supplied user IDs or totals.
const { randomUUID } = require("node:crypto");
const { logError } = require("../utils/safeLogger");
const PUBLIC_ROOMS = new Set(["public:quiet", "public:library", "public:cloud", "public:night"]);
const MAX_ROOM_MEMBERS = 200;
const MAX_MEMBERS = 2000;
const groupIdFor = id => id.startsWith("group:") ? id.slice(6) : null;
const roomChannel = id => `study-room:${id}`;
const cleanText = (value, max) => typeof value === "string"
  ? value.replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, max) : "";
const validRoom = id => typeof id === "string" &&
  (PUBLIC_ROOMS.has(id) || /^group:[a-f0-9]{24}$/.test(id));

function createStudyRoomPresence(io, {
  clock = Date.now,
  membership = (groupId, userId) => require("../models/social/GroupMember")
    .findOne({ groupId, userId }).select("displayName").lean(),
} = {}) {
  const rooms = new Map();
  const users = new Map();
  const recent = new Map();
  const pending = new Set();
  const sweepRecent = () => {
    const now = clock();
    for (const [uid, visit] of recent) if (visit.until <= now) recent.delete(uid);
  };

  const snapshot = id => ({
    roomId: id,
    serverNow: clock(),
    participants: Array.from(rooms.get(id)?.values() || [], member => ({
      id: member.id, name: member.name, subject: member.subject, status: member.status,
      elapsedMs: member.elapsedMs, startedAt: member.startedAt,
    })),
  });
  const publish = id => io.to(roomChannel(id)).emit("study-room:snapshot", snapshot(id));

  function remove(member, reason, notify = true) {
    if (!member || users.get(member.uid) !== member) return;
    users.delete(member.uid);
    const room = rooms.get(member.roomId);
    room?.delete(member.uid);
    if (!room?.size) rooms.delete(member.roomId);
    member.socket.leave(roomChannel(member.roomId));
    if (reason && notify) member.socket.emit("study-room:removed", { roomId: member.roomId, message: reason });
    publish(member.roomId);
  }

  function setState(member, state) {
    const now = clock();
    const nextSubject = cleanText(state.subject, 80);
    if (member.status === state.status && member.subject === nextSubject) return false;
    if (member.status !== state.status) {
      if (member.startedAt !== null) member.elapsedMs += Math.max(0, now - member.startedAt);
      member.startedAt = state.status === "running" ? now : null;
      member.status = state.status;
    }
    member.subject = nextSubject;
    return true;
  }

  function register(socket) {
    const uid = socket.user.uid;
    let chain = Promise.resolve();
    // Serialize asynchronous group authorization with leave and subsequent joins.
    const on = (event, handler) => socket.on(event, (data, ack) => {
      chain = chain.then(async () => {
        if (!socket.connected) return;
        const result = await handler(data);
        if (typeof ack === "function") ack(result);
      }).catch(error => {
        logError("STUDY ROOM SOCKET ERROR:", error);
        if (typeof ack === "function") ack({ ok: false, message: "Could not connect to the study room." });
      });
    });
    const ownMember = id => {
      const member = users.get(uid);
      return member?.socket === socket && member.roomId === id ? member : null;
    };
    on("study-room:join", async data => {
      const id = data.roomId;
      if (!validRoom(id)) return { ok: false, message: "Unknown study room." };
      const groupId = groupIdFor(id);
      const authorization = { groupId, uid, revoked: false };
      let memberRecord = null;
      if (groupId) {
        pending.add(authorization);
        try { memberRecord = await membership(groupId, uid); }
        finally { pending.delete(authorization); }
      }
      if (!socket.connected) return { ok: false, message: "Connection closed." };
      if (groupId && (!memberRecord || authorization.revoked)) return { ok: false, message: "You are not a member of this study group." };
      sweepRecent();

      const previous = users.get(uid);
      const lastVisit = recent.get(uid);
      const sameRoom = previous?.roomId === id;
      const roomSize = rooms.get(id)?.size || 0;
      if ((!sameRoom && roomSize >= MAX_ROOM_MEMBERS) || (!previous && users.size >= MAX_MEMBERS)) {
        return { ok: false, message: "This room is full. Try another room." };
      }
      if (sameRoom && previous.socket === socket) {
        if (setState(previous, data)) publish(id);
        return { ok: true, participantId: previous.id, ...snapshot(id) };
      }
      recent.delete(uid);
      if (previous) remove(previous, "You joined a study room from another tab or device.");
      const member = {
        uid, roomId: id, socket, id: randomUUID(),
        name: cleanText(memberRecord?.displayName || socket.user.name, 60) || "Student",
        status: "idle", subject: "", elapsedMs: 0, startedAt: null,
      };
      if (sameRoom) {
        member.id = previous.id;
        member.elapsedMs = previous.elapsedMs + (previous.startedAt === null ? 0 : Math.max(0, clock() - previous.startedAt));
      }
      if (!previous && lastVisit?.roomId === id) {
        member.id = lastVisit.id;
        member.elapsedMs = lastVisit.elapsedMs;
      }
      setState(member, data);
      if (!rooms.has(id)) rooms.set(id, new Map());
      rooms.get(id).set(uid, member);
      users.set(uid, member);
      socket.join(roomChannel(id));
      publish(id);
      return { ok: true, participantId: member.id, ...snapshot(id) };
    });
    on("study-room:state", data => {
      const member = ownMember(data.roomId);
      if (!member) return { ok: false, message: "Join the room first." };
      if (setState(member, data)) publish(member.roomId);
      return { ok: true };
    });
    on("study-room:leave", data => {
      remove(ownMember(data.roomId));
      return { ok: true };
    });
    socket.on("disconnect", () => {
      const member = users.get(uid);
      if (member?.socket === socket) {
        sweepRecent();
        if (recent.size >= MAX_MEMBERS) recent.delete(recent.keys().next().value);
        recent.set(uid, { roomId: member.roomId, id: member.id,
          elapsedMs: member.elapsedMs + (member.startedAt === null ? 0 : Math.max(0, clock() - member.startedAt)),
          until: clock() + 90_000 });
        remove(member);
      }
    });
  }

  return {
    register,
    removeAccount(uid) {
      const userId = String(uid);
      recent.delete(userId);
      for (const authorization of pending) if (authorization.uid === userId) authorization.revoked = true;
      remove(users.get(userId), "Your account is no longer available.");
    },
    revokeGroupMember(groupId, uid) {
      const id = String(groupId).toLowerCase();
      const userId = String(uid);
      for (const authorization of pending) if (authorization.groupId === id && authorization.uid === userId) authorization.revoked = true;
      if (recent.get(userId)?.roomId === `group:${id}`) recent.delete(userId);
      const member = users.get(userId);
      if (member?.roomId === `group:${id}`) remove(member, "Your group membership ended.");
    },
    revokeGroup(groupId) {
      const group = String(groupId).toLowerCase();
      const id = `group:${group}`;
      for (const authorization of pending) if (authorization.groupId === group) authorization.revoked = true;
      for (const [uid, visit] of recent) if (visit.roomId === id) recent.delete(uid);
      for (const member of Array.from(rooms.get(id)?.values() || [])) remove(member, "This study group was deleted.");
    },
  };
}

module.exports = { createStudyRoomPresence, validRoom };
