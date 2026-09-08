const express = require("express");
const mongoose = require("mongoose");

const Event = require("../models/Event");

const firebaseAuth = require(
  "../middleware/firebaseAuth"
);

const router = express.Router();

// =========================================================
// VALID EVENT TYPES
// =========================================================

const VALID_EVENT_TYPES = [
  "exam",
  "assignment",
  "project",
  "study",
  "other",
];

// =========================================================
// NORMALIZE EVENT TYPE
// =========================================================

const normalizeEventType =
  (value) => {
    const normalized =
      String(
        value || "other"
      )
        .trim()
        .toLowerCase();

    return VALID_EVENT_TYPES.includes(
      normalized
    )
      ? normalized
      : "other";
  };

// =========================================================
// VALIDATE DATE
// =========================================================

const isValidDate =
  (value) => {
    if (!value) {
      return false;
    }

    const date =
      new Date(value);

    return !Number.isNaN(
      date.getTime()
    );
  };

// =========================================================
// ALL EVENT ROUTES REQUIRE LOGIN
// =========================================================

router.use(
  firebaseAuth
);

// =========================================================
// GET ALL EVENTS FOR CURRENT USER
// =========================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const events =
        await Event.find({
          userId:
            req.user.uid,
        }).sort({
          date: 1,
        });

      res.status(200).json(
        events
      );
    } catch (error) {
      console.error(
        "GET EVENTS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch events",
      });
    }
  }
);

// =========================================================
// CREATE EVENT
// =========================================================

router.post(
  "/",
  async (req, res) => {
    try {
      const {
        title,
        date,
        type,
      } = req.body;

      if (
        typeof title !==
          "string" ||
        !title.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Event title is required",
          });
      }

      if (
        !isValidDate(
          date
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "A valid event date is required",
          });
      }

      const event =
        await Event.create({
          userId:
            req.user.uid,

          title:
            title.trim(),

          date,

          type:
            normalizeEventType(
              type
            ),
        });

      res.status(201).json(
        event
      );
    } catch (error) {
      console.error(
        "CREATE EVENT ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create event",
      });
    }
  }
);

// =========================================================
// UPDATE EVENT
// =========================================================

router.put(
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
              "Invalid event ID",
          });
      }

      const event =
        await Event.findOne({
          _id: id,

          userId:
            req.user.uid,
        });

      if (!event) {
        return res
          .status(404)
          .json({
            message:
              "Event not found",
          });
      }

      const {
        title,
        date,
        type,
      } = req.body;

      // =====================================
      // TITLE
      // =====================================

      if (
        title !== undefined
      ) {
        if (
          typeof title !==
            "string" ||
          !title.trim()
        ) {
          return res
            .status(400)
            .json({
              message:
                "Event title cannot be empty",
            });
        }

        event.title =
          title.trim();
      }

      // =====================================
      // DATE
      // =====================================

      if (
        date !== undefined
      ) {
        if (
          !isValidDate(
            date
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid event date",
            });
        }

        event.date =
          date;
      }

      // =====================================
      // TYPE
      // =====================================

      if (
        type !== undefined
      ) {
        event.type =
          normalizeEventType(
            type
          );
      }

      await event.save();

      res.status(200).json(
        event
      );
    } catch (error) {
      console.error(
        "UPDATE EVENT ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update event",
      });
    }
  }
);

// =========================================================
// DELETE EVENT
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
              "Invalid event ID",
          });
      }

      const event =
        await Event.findOneAndDelete({
          _id: id,

          userId:
            req.user.uid,
        });

      if (!event) {
        return res
          .status(404)
          .json({
            message:
              "Event not found",
          });
      }

      res.status(200).json({
        message:
          "Event deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE EVENT ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete event",
      });
    }
  }
);

module.exports = router;