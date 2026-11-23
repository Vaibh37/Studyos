const { getAppCheck } = require("firebase-admin/app-check");

// Rollout: off (default), audit (log sampled counts), enforce (reject).
// App Check supplements Firebase Auth; it is not user authentication.
const currentMode = () =>
  ["off", "audit", "enforce"].includes(process.env.STUDYOS_APP_CHECK_MODE)
    ? process.env.STUDYOS_APP_CHECK_MODE : "off";

async function verifyAppCheckToken(token) {
  return getAppCheck().verifyToken(token);
}

function createAppCheckGuards({ verify = verifyAppCheckToken, mode = currentMode } = {}) {
  const counts = { missing: 0, invalid: 0, valid: 0 };
  const audit = (kind) => {
    counts[kind]++;
    const total = counts.missing + counts.invalid + counts.valid;
    if (total % 500 === 0) console.info("App Check audit counts", { ...counts });
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
    const token = req.get("X-Firebase-AppCheck");
    const ok = await validate(token);
    audit(ok ? "valid" : token ? "invalid" : "missing");
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
    audit(ok ? "valid" : token ? "invalid" : "missing");
    if (!ok && setting === "enforce") return next(new Error("App verification required"));
    return next();
  }
  return { http, socket, counts };
}

const guards = createAppCheckGuards();
module.exports = { ...guards, createAppCheckGuards };
