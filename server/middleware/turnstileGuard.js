const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const currentMode = () =>
  ["off", "audit", "enforce"].includes(process.env.STUDYOS_TURNSTILE_MODE)
    ? process.env.STUDYOS_TURNSTILE_MODE : "off";

async function siteverify(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("Turnstile secret not configured");
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  const res = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("Turnstile verification unavailable");
  return res.json();
}

function createTurnstileGuard(action, {
  verify = siteverify,
  mode = currentMode,
  getIp = req => req.ip,
} = {}) {
  if (!["group-create", "group-join"].includes(action)) {
    throw new Error("Invalid Turnstile action");
  }
  return async (req, res, next) => {
    const setting = mode();
    if (setting === "off") return next();
    if (!process.env.TURNSTILE_SECRET_KEY && verify === siteverify) {
      if (setting === "enforce") {
        return res.status(503).json({ message: "Bot protection unavailable" });
      }
      return next();
    }

    const allowedHosts = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
      .split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
    if (setting === "enforce" && allowedHosts.length === 0) {
      return res.status(503).json({ message: "Bot protection unavailable" });
    }
    const token = req.body?.turnstileToken;
    if (typeof token !== "string" || token.length < 1 || token.length > 2048) {
      if (setting === "enforce") {
        return res.status(403).json({ message: "Complete the security check" });
      }
      return next();
    }
    try {
      const response = await verify(token, getIp(req));
      const valid = response?.success === true &&
        response.action === action &&
        (allowedHosts.length === 0 ||
         allowedHosts.includes(String(response.hostname || "").toLowerCase()));
      if (!valid && setting === "enforce") {
        return res.status(403).json({ message: "Security check failed. Try again." });
      }
      return next();
    } catch (error) {
      console.error("Turnstile verification error:", error?.name || "error");
      if (setting === "enforce") {
        return res.status(503).json({ message: "Security verification unavailable" });
      }
      return next();
    }
  };
}

module.exports = { createTurnstileGuard, siteverify };
