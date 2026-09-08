const express = require("express");
const mongoose = require("mongoose");

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
      console.error(
        "GET STUDY SESSIONS ERROR:",
        error
      );

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
      } = req.body;

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
        cleanDurationSeconds < 1
      ) {
        return res
          .status(400)
          .json({
            message:
              "Study duration must be at least 1 second",
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
      // CREATE
      // =====================================

      const session =
        await StudySession.create({
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
            startDate,

          endedAt:
            endDate,
        });

      res.status(201).json(
        session
      );
    } catch (error) {
      console.error(
        "CREATE STUDY SESSION ERROR:",
        error
      );

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

      res.status(200).json({
        message:
          "Study sessions deleted successfully",

        deletedCount:
          result.deletedCount,
      });
    } catch (error) {
      console.error(
        "DELETE ALL STUDY SESSIONS ERROR:",
        error
      );

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

      res.status(200).json({
        message:
          "Study session deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE STUDY SESSION ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete study session",
      });
    }
  }
);

module.exports = router;