const { logError } = require("../utils/safeLogger");
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("node:crypto");
const { rateLimit } = require("express-rate-limit");
const FocusRun = require("../models/FocusRun");

const StudySession = require(
  "../models/StudySession"
);

const firebaseAuth = require(
  "../middleware/firebaseAuth"
);

const router = express.Router();

// =========================================================
// HELPERS
// =========================================================

const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
};

const cleanSubjectId = (
  subjectId
) => {
  if (
    subjectId === null ||
    subjectId === undefined ||
    subjectId === ""
  ) {
    return null;
  }

  return subjectId;
};

// =========================================================
// ALL STUDY SESSION ROUTES REQUIRE LOGIN
// =========================================================

router.use(firebaseAuth);

// =========================================================
// SERVER-ISSUED FOCUS START
// A client cannot mint a valid runId or move its server start time.
// =========================================================

const focusStartLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  keyGenerator: (req) => "focus:" + req.user.uid,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many Focus starts. Try again shortly." },
});

router.post("/start", focusStartLimiter, async (req, res) => {
  try {
    const now = new Date();
    // Only the newest active Focus run can accrue leaderboard credit.
    await FocusRun.updateMany(
      { userId: req.user.uid, consumedAt: null, revokedAt: null },
      { $set: { revokedAt: now } }
    );
    const run = await FocusRun.create({
      userId: req.user.uid,
      startedAt: now,
      expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1000),
    });
    return res.status(201).json({
      runId: String(run._id),
      startedAt: run.startedAt,
    });
  } catch (error) {
    logError("START FOCUS RUN ERROR:", error);
    return res.status(500).json({ message: "Failed to start verified Focus session" });
  }
});

// =========================================================
// GET CURRENT USER'S STUDY SESSIONS
// =========================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const sessions =
        await StudySession.find({
          userId:
            req.user.uid,
        }).sort({
          endedAt: -1,
        });

      res.status(200).json(
        sessions
      );
    } catch (error) {
      logError("GET STUDY SESSIONS ERROR:", error);

      res.status(500).json({
        message:
          "Failed to fetch study sessions",
      });
    }
  }
);

// =========================================================
// CREATE STUDY SESSION
// =========================================================

router.post(
  "/",
  async (req, res) => {
    try {
      const {
        subjectId,
        subjectName,
        plannedMinutes,
        durationSeconds,
        startedAt,
        endedAt,
        runId,
      } = req.body || {};

      // =====================================
      // PLANNED MINUTES
      // =====================================

      const cleanPlannedMinutes =
        Number(
          plannedMinutes
        );

      if (
        !Number.isFinite(
          cleanPlannedMinutes
        ) ||
        !Number.isInteger(cleanPlannedMinutes) ||
        cleanPlannedMinutes < 1 ||
        cleanPlannedMinutes > 720
      ) {
        return res
          .status(400)
          .json({
            message:
              "Planned minutes must be between 1 and 720",
          });
      }

      // =====================================
      // DURATION
      // =====================================

      const cleanDurationSeconds =
        Number(
          durationSeconds
        );

      if (
        !Number.isFinite(
          cleanDurationSeconds
        ) ||
        !Number.isInteger(cleanDurationSeconds) ||
        cleanDurationSeconds < 1 ||
        cleanDurationSeconds > cleanPlannedMinutes * 60 ||
        cleanDurationSeconds > 720 * 60
      ) {
        return res
          .status(400)
          .json({
            message:
              "Study duration must be a whole number of seconds within the planned Focus time",
          });
      }

      // =====================================
      // DATES
      // =====================================

      if (
        !isValidDate(
          startedAt
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "A valid start time is required",
          });
      }

      if (
        !isValidDate(
          endedAt
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "A valid end time is required",
          });
      }

      const startDate =
        new Date(startedAt);

      const endDate =
        new Date(endedAt);

      if (
        endDate <
        startDate
      ) {
        return res
          .status(400)
          .json({
            message:
              "End time cannot be before start time",
          });
      }

      // =====================================
      // SUBJECT ID
      // =====================================

      const cleanId =
        cleanSubjectId(
          subjectId
        );

      if (
        cleanId !== null &&
        !mongoose.Types.ObjectId.isValid(
          cleanId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid subject ID",
          });
      }

      // =====================================
      // REJECT IMPOSSIBLE OR FUTURE CLIENT TIMESTAMPS
      // This also protects personal history from extreme fake durations.
      // =====================================

      const now = new Date();
      const skewMs = 90 * 1000;
      const durationToleranceMs = 5 * 1000;
      if (
        startDate.getTime() > now.getTime() + skewMs ||
        endDate.getTime() > now.getTime() + skewMs ||
        endDate.getTime() - startDate.getTime() + durationToleranceMs <
          cleanDurationSeconds * 1000
      ) {
        return res.status(400).json({
          message: "Focus duration exceeds elapsed time or session dates are in the future",
        });
      }

      // Preserve existing personal history imports without awarding ranking
      // credit unless a one-time server-issued Focus run is provided.
      let verifiedRun = null;
      let claimId = null;
      if (runId !== undefined && runId !== null && runId !== "") {
        if (typeof runId !== "string" || !mongoose.Types.ObjectId.isValid(runId)) {
          return res.status(400).json({ message: "Invalid Focus run ID" });
        }

        claimId = crypto.randomUUID();
        verifiedRun = await FocusRun.findOneAndUpdate(
          {
            _id: runId,
            userId: req.user.uid,
            consumedAt: null,
            claimId: null,
            revokedAt: null,
            expiresAt: { $gt: now },
          },
          { $set: { claimId } },
          { returnDocument: 'after' }
        );
        if (!verifiedRun) {
          return res.status(409).json({
            message: "Focus verification expired or was already used. Start a new Focus session.",
          });
        }

        const wallSeconds = Math.floor(
          (now.getTime() - verifiedRun.startedAt.getTime()) / 1000
        );
        if (cleanDurationSeconds > wallSeconds + 5 || wallSeconds < 0) {
          await FocusRun.updateOne({ _id: verifiedRun._id, claimId },
            { $set: { claimId: null } });
          return res.status(400).json({
            message: "Focus duration is longer than the server-measured session",
          });
        }

        // Reject overlapping verified sessions, including multi-tab attempts.
        const overlap = await StudySession.exists({
          userId: req.user.uid,
          verified: true,
          startedAt: { $lt: now },
          endedAt: { $gt: verifiedRun.startedAt },
        });
        if (overlap) {
          await FocusRun.updateOne({ _id: verifiedRun._id, claimId },
            { $set: { claimId: null } });
          return res.status(409).json({
            message: "Overlapping Focus sessions cannot earn leaderboard credit",
          });
        }
      }

      // =====================================
      // CREATE
      // =====================================

      let session;
      try {
        session = await StudySession.create({
          userId:
            req.user.uid,

          subjectId:
            cleanId,

          subjectName:
            typeof subjectName ===
              "string" &&
            subjectName.trim()
              ? subjectName.trim()
              : "General Study",

          plannedMinutes:
            Math.round(
              cleanPlannedMinutes
            ),

          durationSeconds:
            Math.round(
              cleanDurationSeconds
            ),

          startedAt:
            verifiedRun ? verifiedRun.startedAt : startDate,

          endedAt:
            verifiedRun ? now : endDate,

          verified: Boolean(verifiedRun),
        });
      } catch (saveError) {
        if (verifiedRun) {
          await FocusRun.updateOne(
            { _id: verifiedRun._id, claimId },
            { $set: { claimId: null } }
          );
        }
        throw saveError;
      }

      if (verifiedRun) {
        await FocusRun.updateOne(
          { _id: verifiedRun._id, claimId },
          { $set: { consumedAt: now, claimId: null } }
        );
      }

      res.status(201).json(
        session
      );
      if (verifiedRun) req.app.get("io")?.studyRoomPresence?.recordSavedSession(req.user.uid, session.durationSeconds);
    } catch (error) {
      logError("CREATE STUDY SESSION ERROR:", error);

      res.status(500).json({
        message:
          "Failed to save study session",
      });
    }
  }
);

// =========================================================
// DELETE ALL CURRENT USER'S SESSIONS
// =========================================================

router.delete(
  "/",
  async (req, res) => {
    try {
      const result =
        await StudySession.deleteMany({
          userId:
            req.user.uid,
        });

      void req.app.get("io")?.studyRoomPresence?.refreshProgress(req.user.uid);
      res.status(200).json({
        message:
          "Study sessions deleted successfully",

        deletedCount:
          result.deletedCount,
      });
    } catch (error) {
      logError("DELETE ALL STUDY SESSIONS ERROR:", error);

      res.status(500).json({
        message:
          "Failed to delete study sessions",
      });
    }
  }
);

// =========================================================
// DELETE ONE CURRENT USER SESSION
// =========================================================

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid study session ID",
          });
      }

      const session =
        await StudySession.findOneAndDelete({
          _id: id,

          userId:
            req.user.uid,
        });

      if (!session) {
        return res
          .status(404)
          .json({
            message:
              "Study session not found",
          });
      }

      void req.app.get("io")?.studyRoomPresence?.refreshProgress(req.user.uid);
      res.status(200).json({
        message:
          "Study session deleted successfully",
      });
    } catch (error) {
      logError("DELETE STUDY SESSION ERROR:", error);

      res.status(500).json({
        message:
          "Failed to delete study session",
      });
    }
  }
);

module.exports = router;