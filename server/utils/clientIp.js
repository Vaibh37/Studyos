const net = require("node:net");

// Normalize IPv4, IPv6 and IPv4-mapped IPv6 into stable database keys.
function normalizeIp(input) {
  if (typeof input !== "string") return null;
  const value = input.trim().replace(/^\[|\]$/g, "");
  const type = net.isIP(value);
  if (type === 4) return value;
  if (type !== 6) return null;

  try {
    const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1).toLowerCase();
    const mapped = /^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/.exec(normalized);
    if (mapped) {
      const high = parseInt(mapped[1], 16);
      const low = parseInt(mapped[2], 16);
      return [high >> 8, high & 255, low >> 8, low & 255].join(".");
    }
    return normalized;
  } catch {
    return null;
  }
}

function trustedProxyHops() {
  // Default 1 is for backwards compatibility, NOT the measured Render path.
  // StudyOS Render probe (2026-11-22) indicated 3 trusted hops.
  // Production Render must explicitly set STUDYOS_TRUST_PROXY_HOPS=3
  // after validating the proxy topology and XFF spoofing behavior.
  // Set to 0 in environments where the app faces clients directly.
  const hops = Number(process.env.STUDYOS_TRUST_PROXY_HOPS ?? 1);
  if (!Number.isInteger(hops) || hops < 0 || hops > 8) {
    throw new Error("STUDYOS_TRUST_PROXY_HOPS must be an integer from 0 to 8");
  }
  return hops;
}

function getClientIp(request, hops = trustedProxyHops()) {
  // Express computes req.ip using its configured trust proxy rules.
  if (request?.ip) return normalizeIp(request.ip);

  const remote = request?.socket?.remoteAddress ||
    request?.connection?.remoteAddress || null;
  const forwarded = request?.headers?.["x-forwarded-for"];
  if (hops > 0 && typeof forwarded === "string") {
    const addresses = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (addresses.length) {
      const candidate = addresses[Math.max(0, addresses.length - hops)];
      return normalizeIp(candidate);
    }
  }
  return normalizeIp(remote);
}

module.exports = { normalizeIp, trustedProxyHops, getClientIp };
