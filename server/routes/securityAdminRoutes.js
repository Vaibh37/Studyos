const { logError } = require("../utils/safeLogger");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const firebaseAuth = require("../middleware/firebaseAuth");
const firebaseAdminAuth = require("../config/firebaseAdmin");
const BannedIp = require("../models/BannedIp");
const { getClientIp, normalizeIp } = require("../utils/clientIp");

const router = express.Router();

// This route is off by default. Only one explicitly configured Firebase UID
// can manage bans. Never rely on email, UI state, or a client-supplied role.
function isSecurityAdmin(uid) {
  const allowedUid = (process.env.STUDYOS_SECURITY_ADMIN_UID || "").trim();
  return Boolean(allowedUid && uid === allowedUid);
}

function activeCondition() {
  return {
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  };
}

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(firebaseAuth);

// Allows the signed-in owner to discover their *own* UID for initial setup.
// Never returns the configured administrator UID to other accounts.
router.get("/me", (req, res) => {
  res.json({
    uid: req.user.uid,
    authorized: isSecurityAdmin(req.user.uid),
  });
});

function requireSecurityAdmin(req, res, next) {
  if (!isSecurityAdmin(req.user.uid)) {
    return res.status(403).json({ message: "Security administration is not available for this account" });
  }
  next();
}

router.use(requireSecurityAdmin);

// Restrict administrative traffic beyond the existing global API limiter.
// This limiter executes only AFTER Firebase auth and administrator checks.
router.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user.uid,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many security administration requests" },
}));

// Destructive changes require a *recent* sign-in and revocation checking.
// Firebase token refresh is NOT a fresh sign-in: auth_time is verified.
async function requireRecentAdminSignIn(req, res, next) {
  try {
    const token = req.headers.authorization?.slice(7)?.trim();
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const decoded = await firebaseAdminAuth.verifyIdToken(token, true);
    if (decoded.uid !== req.user.uid) return res.status(403).json({ message: "Account mismatch" });
    const authTime = decoded.auth_time;
    const ageSeconds = Math.floor(Date.now() / 1000) - authTime;
    if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds > 15 * 60) {
      return res.status(403).json({ message: "Sign out and sign in again before changing IP bans" });
    }
    next();
  } catch {
    return res.status(401).json({ message: "Please sign in again" });
  }
}

router.get("/bans", async (req, res) => {
  try {
    const bans = await BannedIp.find(activeCondition())
      .sort({ createdAt: -1 })
      .limit(100)
      .select("ip reason expiresAt createdAt updatedAt")
      .lean();
    res.json({ bans });
  } catch (error) {
    logError("Security ban list failed:", error);
    res.status(503).json({ message: "Security bans unavailable" });
  }
});

router.post("/bans", requireRecentAdminSignIn, async (req, res) => {
  try {
    const ip = normalizeIp(req.body?.ip);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const permanent = req.body?.permanent === true;
    const hours = Number(req.body?.durationHours);

    if (!ip) return res.status(400).json({ message: "Enter a valid IPv4 or IPv6 address" });
    if (reason.length < 5 || reason.length > 250) {
      return res.status(400).json({ message: "Reason must contain 5–250 characters" });
    }
    if (req.body?.permanent !== undefined && typeof req.body.permanent !== "boolean") {
      return res.status(400).json({ message: "Invalid permanent flag" });
    }
    if (!permanent && (!Number.isInteger(hours) || hours < 1 || hours > 720)) {
      return res.status(400).json({ message: "Ban duration must be 1–720 whole hours" });
    }
    if (permanent && req.body?.durationHours != null) {
      return res.status(400).json({ message: "Permanent bans cannot specify a duration" });
    }

    // Never strand the current administrator by banning their own client IP.
    if (getClientIp(req) === ip) {
      return res.status(400).json({ message: "You cannot ban your current IP address" });
    }

    const expiresAt = permanent ? null : new Date(Date.now() + hours * 3600 * 1000);
    const ban = await BannedIp.findOneAndUpdate(
      { ip },
      {
        $set: { ip, reason, expiresAt, updatedBy: req.user.uid },
        $setOnInsert: { createdBy: req.user.uid },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).select("ip reason expiresAt createdAt updatedAt").lean();

    // Disconnect sockets already connected from the newly banned IP.
    // If the socket scan fails, the periodic scan in server.js is fallback.
    const io = req.app.get("io");
    if (io) {
      try {
        const { disconnectBannedSockets } = require("../middleware/ipBans");
        await disconnectBannedSockets(io);
      } catch (error) {
        logError("Immediate banned socket disconnect failed:", error);
      }
    }

    return res.status(201).json({ ban });
  } catch (error) {
    logError("Create security IP ban failed:", error);
    return res.status(503).json({ message: "Unable to save ban" });
  }
});

router.delete("/bans/:ip", requireRecentAdminSignIn, async (req, res) => {
  const ip = normalizeIp(req.params.ip);
  if (!ip) return res.status(400).json({ message: "Invalid IP address" });
  try {
    const result = await BannedIp.deleteOne({ ip });
    return res.json({ removed: result.deletedCount === 1 });
  } catch (error) {
    logError("Remove security IP ban failed:", error);
    return res.status(503).json({ message: "Unable to remove ban" });
  }
});

module.exports = router;
