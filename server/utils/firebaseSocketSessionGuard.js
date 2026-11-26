const firebaseAdminAuth = require("../config/firebaseAdmin");

// A socket keeps receiving group broadcasts without making more HTTP requests.
// Firebase token revocation must therefore be rechecked for live sockets too.
// Recheck once per Firebase UID, then evaluate each socket's own sign-in time.
// Existing per-connection JWT expiry is also enforced.
const SOCKET_SESSION_CHECK_MS = 2 * 60 * 1000;

function isSessionInvalid(session, userRecord, nowSeconds) {
  if (!session || !Number.isFinite(session.authTime) ||
      !Number.isFinite(session.expiresAt)) return true;
  if (nowSeconds >= session.expiresAt) return true;
  if (!userRecord || userRecord.disabled === true) return true;
  const revokedAfter = new Date(userRecord.tokensValidAfterTime || 0).getTime() / 1000;
  if (!Number.isFinite(revokedAfter)) return true;
  return session.authTime < revokedAfter;
}

async function disconnectInvalidFirebaseSockets(
  io,
  { auth = firebaseAdminAuth, now = Date.now(), logger = console } = {}
) {
  const sockets = [...io.sockets.sockets.values()]
    .filter(socket => socket.user?.uid);
  const userIds = [...new Set(sockets.map(socket => socket.user.uid))];
  const accounts = new Map();

  // A single backend lookup per user, even with many open tabs/devices.
  await Promise.all(userIds.map(async uid => {
    try {
      accounts.set(uid, await auth.getUser(uid));
    } catch (error) {
      if (error?.code === "auth/user-not-found") {
        accounts.set(uid, null);
      } else {
        // Transient provider failures should not sign everyone out.
        // Token expiry is still checked below; retry account state next pass.
        logger.error("Firebase socket revocation recheck unavailable:",
          error?.code || "provider_error");
        accounts.set(uid, undefined);
      }
    }
  }));

  let disconnected = 0;
  const nowSeconds = now / 1000;
  for (const socket of sockets) {
    if (!socket.connected) continue;
    const account = accounts.get(socket.user.uid);
    const session = socket.data.firebaseSession;

    // During an authentication-provider outage, don't assume the user was
    // revoked, but never permit an expired/malformed token to stay active.
    const unavailable = account === undefined;
    const expired = !session ||
      !Number.isFinite(session.expiresAt) || nowSeconds >= session.expiresAt ||
      !Number.isFinite(session.authTime);
    if ((unavailable && expired) ||
        (!unavailable && isSessionInvalid(session, account, nowSeconds))) {
      socket.disconnect(true);
      disconnected++;
    }
  }
  return { checkedSockets: sockets.length, checkedUsers: userIds.length, disconnected };
}

// Token expiry must not depend on the provider responding to the periodic
// revocation check. Schedule an independent disconnect for every verified
// socket, including passive recipients of private group broadcasts.
function enforceSocketExpiry(socket, { clock = Date.now, schedule = setTimeout, cancel = clearTimeout } = {}) {
  const expiry = socket.data.firebaseSession?.expiresAt;
  const delay = Number.isFinite(expiry) ? expiry * 1000 - clock() : 0;
  if (delay <= 0) { socket.disconnect(true); return false; }
  const timer = schedule(() => socket.disconnect(true), Math.min(delay, 2_147_483_647));
  timer?.unref?.();
  socket.once("disconnect", () => cancel(timer));
  return true;
}

module.exports = {
  enforceSocketExpiry,
  SOCKET_SESSION_CHECK_MS,
  isSessionInvalid,
  disconnectInvalidFirebaseSockets,
};
