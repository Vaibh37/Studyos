const BannedIp = require("../models/BannedIp");
const { getClientIp, trustedProxyHops } = require("../utils/clientIp");

const activeCondition = () => ({
  $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
});

async function getActiveBan(ip) {
  if (!ip) return null;
  return BannedIp.findOne({ ip, ...activeCondition() })
    .select("ip expiresAt")
    .lean();
}

async function blockBannedApiIp(req, res, next) {
  const ip = getClientIp(req);
  if (!ip) {
    return res.status(503).json({ message: "Unable to validate request origin" });
  }

  try {
    const ban = await getActiveBan(ip);
    if (!ban) return next();

    res.set("Cache-Control", "no-store");
    if (ban.expiresAt) {
      res.set("Retry-After", String(Math.max(1,
        Math.ceil((new Date(ban.expiresAt).getTime() - Date.now()) / 1000))));
    }
    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error("IP ban HTTP check failed:", error.message);
    return res.status(503).json({ message: "Service temporarily unavailable" });
  }
}

async function blockBannedSocketIp(socket, next) {
  const ip = getClientIp(socket.request, trustedProxyHops()) ||
    getClientIp({ socket: { remoteAddress: socket.handshake.address } }, 0);
  if (!ip) return next(new Error("Unable to validate connection origin"));

  try {
    const ban = await getActiveBan(ip);
    if (ban) return next(new Error("Access denied"));
    socket.data.clientIp = ip;
    return next();
  } catch (error) {
    console.error("IP ban socket check failed:", error.message);
    return next(new Error("Service temporarily unavailable"));
  }
}

// A newly banned IP may already have connected sockets. Remove them soon
// after the ban is saved, including passive recipients of group broadcasts.
async function disconnectBannedSockets(io) {
  const sockets = [...io.sockets.sockets.values()];
  const ips = [...new Set(sockets.map((socket) => socket.data.clientIp).filter(Boolean))];
  if (!ips.length) return 0;

  const banned = await BannedIp.find({
    ip: { $in: ips },
    ...activeCondition(),
  }).select("ip").lean();

  const bannedIps = new Set(banned.map((entry) => entry.ip));
  let count = 0;
  for (const socket of sockets) {
    if (bannedIps.has(socket.data.clientIp)) {
      socket.disconnect(true);
      count += 1;
    }
  }
  return count;
}

module.exports = { blockBannedApiIp, blockBannedSocketIp, disconnectBannedSockets };
