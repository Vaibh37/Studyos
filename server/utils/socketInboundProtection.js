const { createSocketRateLimiter } = require("./socketRateLimiter");
const { validateSocketPacket } = require("./socketEventValidation");

// All limits are shared between sockets for a Firebase UID, not per tab.
// They protect MongoDB and room broadcasts from authenticated event floods.
// Values leave room for normal read receipts, typing and 30s heartbeats.
// These budgets are process-local; use a shared store if scaling to multiple
// independent Socket.IO processes.
const eventPolicies = {
  "group:join": [[10_000, 12], [60_000, 60]],
  "group:typing:start": [[10_000, 20], [60_000, 120]],
  "group:typing:stop": [[10_000, 20], [60_000, 120]],
  "group:message:reaction-toggle": [[10_000, 8], [60_000, 40]],
  "group:message:read": [[10_000, 12], [60_000, 80]],
  "group:message:unsend": [[10_000, 8], [60_000, 40]],
  "group:message:delete-for-me": [[10_000, 12], [60_000, 60]],
  "focus:start": [[10_000, 6], [60_000, 30]],
  "focus:stop": [[10_000, 6], [60_000, 30]],
  "focus:heartbeat": [[10_000, 5], [60_000, 20]],
};

// New events still inherit a global budget even if they are not on this list.
// The existing stricter group:message:send rate limit is retained.
const globalLimiter = createSocketRateLimiter([
  { windowMs: 10_000, max: 80 },
  { windowMs: 60_000, max: 300 },
]);

const eventLimiters = new Map(
  Object.entries(eventPolicies).map(([eventName, limits]) => [
    eventName,
    createSocketRateLimiter(limits.map(([windowMs, max]) => ({
      windowMs, max,
    }))),
  ])
);

function registerSocketInboundProtection(socket) {
  socket.use((packet, next) => {
    const uid = socket.user?.uid;
    const eventName = packet?.[0];

    // The authenticated server identity is the only source of the limit key.
    // Malformed packets are never forwarded to a handler.
    if (!uid || typeof eventName !== "string") {
      const ack = Array.isArray(packet) ? packet[packet.length - 1] : null;
      if (typeof ack === "function") ack({ ok: false, message: "Invalid event" });
      return;
    }

    const globalResult = globalLimiter(uid);
    const specific = eventLimiters.get(eventName);
    const specificResult = globalResult.allowed && specific
      ? specific(uid)
      : null;
    const result = !globalResult.allowed ? globalResult : specificResult;

    if (result && !result.allowed) {
      const ack = packet[packet.length - 1];
      if (typeof ack === "function") {
        ack({
          ok: false,
          message: "Too many requests. Please slow down.",
          retryAfterMs: result.retryAfterMs,
        });
      }
      return; // Drop, not merely warn: no handler, DB call or broadcast.
    }

    if (!validateSocketPacket(packet)) {
      const ack = packet.at(-1);
      if (typeof ack === "function") ack({ ok: false, message: "Invalid event arguments" });
      return;
    }
    next();
  });
}

module.exports = { registerSocketInboundProtection };
