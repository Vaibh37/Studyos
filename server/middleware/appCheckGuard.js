const { getAppCheck } = require("firebase-admin/app-check");

// Rollout: off (default), audit (log aggregate counts), enforce (reject).
// App Check supplements Firebase Auth; it is not user authentication.
// Public GET/HEAD health and status endpoints must remain probeable without
// App Check. Keep this allowlist exact so private subroutes never bypass checks.
const PUBLIC_SYSTEM_ROUTES = new Set([
  "/",
  "/health",
  "/health/db",
  "/health/auth",
  "/status",
  "/uptime",
  "/version",
]);
const AUDIT_AREAS = new Set([
  "auth", "account", "security", "tasks", "subjects", "notes", "events",
  "study-sessions", "groups", "leaderboard",
]);
const auditArea = path => {
  const first = String(path || "").split("/").filter(Boolean)[0] || "root";
  return AUDIT_AREAS.has(first) ? first : "other";
};
const currentMode = () =>
  ["off", "audit", "enforce"].includes(process.env.STUDYOS_APP_CHECK_MODE)
    ? process.env.STUDYOS_APP_CHECK_MODE : "off";

async function verifyAppCheckToken(token) {
  return getAppCheck().verifyToken(token);
}

function createAppCheckGuards({ verify = verifyAppCheckToken, mode = currentMode } = {}) {
  const counts = { missing: 0, invalid: 0, valid: 0 };
  const byArea = {};
  const audit = (kind, area) => {
    counts[kind]++;
    if (!byArea[area]) byArea[area] = { missing: 0, invalid: 0, valid: 0 };
    byArea[area][kind]++;
    const total = counts.missing + counts.invalid + counts.valid;
    // Aggregate only: never record tokens, URLs, IPs, user IDs or request bodies.
    if (total === 20 || total % 100 === 0) {
      console.info("App Check audit counts", { ...counts, byArea });
    }
  };
  async function validate(token) {
    if (typeof token !== "string" || !token || token.length > 4096) return false;
    try {
      const result = await verify(token);
      return Boolean(result && result.appId);
    } catch {
      return false;
    }
  }
  async function http(req, res, next) {
    const setting = mode();
    if (setting === "off" || req.method === "OPTIONS") return next();
    if (["GET", "HEAD"].includes(req.method) && PUBLIC_SYSTEM_ROUTES.has(req.path)) {
      return next();
    }
    const token = req.get("X-Firebase-AppCheck");
    const ok = await validate(token);
    audit(ok ? "valid" : token ? "invalid" : "missing", auditArea(req.path));
    if (!ok && setting === "enforce") {
      return res.status(403).json({ message: "App verification required" });
    }
    return next();
  }
  async function socket(socket, next) {
    const setting = mode();
    if (setting === "off") return next();
    const token = socket.handshake.auth?.appCheckToken;
    const ok = await validate(token);
    audit(ok ? "valid" : token ? "invalid" : "missing", "socket");
    if (!ok && setting === "enforce") return next(new Error("App verification required"));
    return next();
  }
  return { http, socket, counts };
}

const guards = createAppCheckGuards();
module.exports = { ...guards, createAppCheckGuards };
