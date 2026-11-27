const { getAppCheck } = require("firebase-admin/app-check");

// Rollout: off (default), audit (log aggregate counts), enforce (reject).
// App Check supplements Firebase Auth; it is not user authentication.
// Public GET/HEAD health and status endpoints must remain probeable without
// App Check. Keep this allowlist exact so private subroutes never bypass checks.
const PUBLIC_SYSTEM_ROUTES = new Set([
  "/",
  "/health",
  "/health/db",
  "/health/ready",
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

function createAppCheckGuards({ verify = verifyAppCheckToken, mode = currentMode, write = entry => console.info(JSON.stringify(entry)) } = {}) {
  const counts = { missing: 0, invalid: 0, valid: 0 };
  const byArea = {};
  const authenticated = { http: { missing: 0, invalid: 0, valid: 0 }, socket: { missing: 0, invalid: 0, valid: 0 } };
  const snapshot = () => ({ event: "studyos_app_check_audit", mode: mode(), counts: { ...counts }, byArea: structuredClone(byArea), authenticated: structuredClone(authenticated) });
  const recordAuthenticated = (transport, outcome) => {
    if (!outcome || !Object.hasOwn(authenticated[transport], outcome)) return;
    const bucket = authenticated[transport];
    bucket[outcome]++;
    const total = bucket.missing + bucket.invalid + bucket.valid;
    if (total === 5 || total === 20 || total % 100 === 0) write(snapshot());
  };
  const audit = (kind, area) => {
    counts[kind]++;
    if (!byArea[area]) byArea[area] = { missing: 0, invalid: 0, valid: 0 };
    byArea[area][kind]++;
    const total = counts.missing + counts.invalid + counts.valid;
    // Aggregate only: never record tokens, URLs, IPs, user IDs or request bodies.
    if (total === 20 || total % 100 === 0) {
      write(snapshot());
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
    const outcome = ok ? "valid" : token ? "invalid" : "missing";
    audit(outcome, auditArea(req.path));
    // Only a successfully verified Firebase user contributes to rollout
    // readiness; anonymous probes and unauthenticated bots are separate.
    if (setting === "audit" || ok) res.once("finish", () => {
      if (req.user?.uid) recordAuthenticated("http", outcome);
    });
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
    const outcome = ok ? "valid" : token ? "invalid" : "missing";
    audit(outcome, "socket");
    if (setting === "audit" || ok) socket.data.appCheckOutcome = outcome;
    if (!ok && setting === "enforce") return next(new Error("App verification required"));
    return next();
  }
  function recordAuthenticatedSocket(socket) {
    if (!socket.user?.uid) return;
    const outcome = socket.data.appCheckOutcome;
    delete socket.data.appCheckOutcome;
    recordAuthenticated("socket", outcome);
  }
  return { http, socket, counts, recordAuthenticatedSocket, snapshot };
}

const guards = createAppCheckGuards();
module.exports = { ...guards, createAppCheckGuards };
