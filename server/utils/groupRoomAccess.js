// Socket.IO room revocation for StudyOS study groups.
//
// Each authenticated socket joins a user-scoped room on connection.
// This lets us immediately revoke an already-connected user's group
// broadcasts without disconnecting unrelated groups or sessions.
// Adapter operations also support multi-node Socket.IO setups when
// an appropriate shared adapter is configured.

const getAuthenticatedUserRoom = (uid) => `user:${String(uid)}`;
const getGroupRoom = (groupId) => `group:${String(groupId)}`;

function revokeMemberGroupAccess(io, groupId, uid) {
  if (!io || !groupId || !uid) return;
  io.in(getAuthenticatedUserRoom(uid)).socketsLeave(getGroupRoom(groupId));
}

function revokeDeletedGroupAccess(io, groupId) {
  if (!io || !groupId) return;
  const room = getGroupRoom(groupId);
  io.in(room).socketsLeave(room);
}

// Terminate all active connections for a permanently deleted Firebase user.
// Existing sockets authenticated earlier must not remain usable.
function disconnectAccountSockets(io, uid) {
  if (!io || !uid) return;
  io.in(getAuthenticatedUserRoom(uid)).disconnectSockets(true);
}

module.exports = {
  getAuthenticatedUserRoom,
  revokeMemberGroupAccess,
  revokeDeletedGroupAccess,
  disconnectAccountSockets,
};
