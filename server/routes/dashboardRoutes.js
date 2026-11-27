const express = require("express");
const firebaseAuth = require("../middleware/firebaseAuth");
const { dashboardReadLimiter } = require("../middleware/rateLimiters");
const { logError } = require("../utils/safeLogger");
const Task = require("../models/Task");
const Event = require("../models/Event");
const StudySession = require("../models/StudySession");

const router = express.Router();

// Fixed, read-only bundle. The normal IP ban, App Check, revocation check,
// account limiter and a stricter per-account bundle limiter all apply.
// Never accept an owner or arbitrary collection name from the browser.
router.get("/", firebaseAuth, dashboardReadLimiter, async (req, res) => {
  try {
    const filter = { userId: req.user.uid };
    const [tasks, sessions, events] = await Promise.all([
      Task.find(filter).sort({ completed: 1, dueDate: 1, createdAt: -1 }),
      StudySession.find(filter).sort({ endedAt: -1 }),
      Event.find(filter).sort({ date: 1 }),
    ]);
    res.set("Cache-Control", "no-store");
    res.json({ tasks, sessions, events });
  } catch (error) {
    logError("Dashboard data read failed:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

module.exports = router;
