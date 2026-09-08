const express = require("express");
const mongoose = require("mongoose");

const Note = require("../models/Note");

const firebaseAuth = require(
  "../middleware/firebaseAuth"
);

const router = express.Router();

// =========================================================
// ALL NOTE ROUTES REQUIRE LOGIN
// =========================================================

router.use(firebaseAuth);

// =========================================================
// GET ALL NOTES FOR CURRENT USER
// =========================================================

router.get("/", async (req, res) => {
  try {
    const notes = await Note.find({
      userId: req.user.uid,
    }).sort({
      updatedAt: -1,
    });

    res.status(200).json(notes);
  } catch (error) {
    console.error(
      "GET NOTES ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch notes",
    });
  }
});

// =========================================================
// GET ONE NOTE
// =========================================================

router.get(
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
        return res.status(400).json({
          message:
            "Invalid note ID",
        });
      }

      const note =
        await Note.findOne({
          _id: id,
          userId:
            req.user.uid,
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      res.status(200).json(
        note
      );
    } catch (error) {
      console.error(
        "GET NOTE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch note",
      });
    }
  }
);

// =========================================================
// CREATE NOTE
// =========================================================

router.post(
  "/",
  async (req, res) => {
    try {
      const {
        title,
        content,
      } = req.body;

      if (
        typeof title !==
          "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          message:
            "Note title is required",
        });
      }

      const note =
        await Note.create({
          userId:
            req.user.uid,

          title:
            title.trim(),

          content:
            typeof content ===
            "string"
              ? content
              : "",
        });

      res.status(201).json(
        note
      );
    } catch (error) {
      console.error(
        "CREATE NOTE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create note",
      });
    }
  }
);

// =========================================================
// UPDATE NOTE
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
        return res.status(400).json({
          message:
            "Invalid note ID",
        });
      }

      const note =
        await Note.findOne({
          _id: id,
          userId:
            req.user.uid,
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      const {
        title,
        content,
      } = req.body;

      if (
        title !== undefined
      ) {
        if (
          typeof title !==
            "string" ||
          !title.trim()
        ) {
          return res.status(400).json({
            message:
              "Note title cannot be empty",
          });
        }

        note.title =
          title.trim();
      }

      if (
        content !==
        undefined
      ) {
        note.content =
          typeof content ===
          "string"
            ? content
            : "";
      }

      await note.save();

      res.status(200).json(
        note
      );
    } catch (error) {
      console.error(
        "UPDATE NOTE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update note",
      });
    }
  }
);

// =========================================================
// DELETE NOTE
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
        return res.status(400).json({
          message:
            "Invalid note ID",
        });
      }

      const note =
        await Note.findOneAndDelete({
          _id: id,
          userId:
            req.user.uid,
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      res.status(200).json({
        message:
          "Note deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE NOTE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete note",
      });
    }
  }
);

module.exports = router;