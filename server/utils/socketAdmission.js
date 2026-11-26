const { ipKeyGenerator } = require("express-rate-limit");
const corsOptions = require("../config/corsOptions");
const { getClientIp } = require("./clientIp");
const { createSocketRateLimiter } = require("./socketRateLimiter");

// Engine.IO's initial handshake occurs BEFORE Socket.IO authentication and
// database-backed IP bans. Bound the work here for both polling and WebSocket.
function createSocketAdmission({ limiter = createSocketRateLimiter([
  { windowMs: 10_000, max: 30 },
  { windowMs: 60_000, max: 120 },
]), readIp = getClientIp, origin = corsOptions.origin } = {}) {
  return (request, callback) => {
    origin(request.headers?.origin, (error, allowed) => {
      if (error || !allowed) return callback("Connection origin denied", false);
      const ip = readIp(request);
      if (!ip) return callback("Connection origin unavailable", false);
      if (!limiter(ipKeyGenerator(ip)).allowed) return callback("Too many connections", false);
      return callback(null, true);
    });
  };
}

module.exports = { createSocketAdmission };
