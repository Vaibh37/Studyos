const express = require("express");
const mongoose = require("mongoose");

const Subject = require("../models/Subject");
const firebaseAuth = require(
  "../middleware/firebaseAuth"
);

const router = express.Router();

// =========================================================
// ALL SUBJECT ROUTES REQUIRE LOGIN
// =========================================================

router.use(firebaseAuth);

// =========================================================
// GET ALL SUBJECTS FOR CURRENT USER
// =========================================================

router.get("/", async (req, res) => {
  try {
    const subjects = await Subject.find({
      userId: req.user.uid,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json(subjects);
  } catch (error) {
    console.error(
      "GET SUBJECTS ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch subjects",
    });
  }
});

// =========================================================
// CREATE SUBJECT
// =========================================================

router.post("/", async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      color,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        message:
          "Subject name is required",
      });
    }

    const subject =
      await Subject.create({
        userId:
          req.user.uid,

        name:
          name.trim(),

        code:
          typeof code === "string"
            ? code.trim()
            : "",

        description:
          typeof description ===
          "string"
            ? description.trim()
            : "",

        color:
          typeof color === "string" &&
          color.trim()
            ? color.trim()
            : "#6366f1",
      });

    res.status(201).json(
      subject
    );
  } catch (error) {
    console.error(
      "CREATE SUBJECT ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create subject",
    });
  }
});

// =========================================================
// UPDATE SUBJECT
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
            "Invalid subject ID",
        });
      }

      const subject =
        await Subject.findOne({
          _id: id,
          userId:
            req.user.uid,
        });

      if (!subject) {
        return res.status(404).json({
          message:
            "Subject not found",
        });
      }

      const {
        name,
        code,
        description,
        color,
      } = req.body;

      if (
        name !== undefined
      ) {
        if (
          typeof name !==
            "string" ||
          !name.trim()
        ) {
          return res.status(400).json({
            message:
              "Subject name cannot be empty",
          });
        }

        subject.name =
          name.trim();
      }

      if (
        code !== undefined
      ) {
        subject.code =
          typeof code === "string"
            ? code.trim()
            : "";
      }

      if (
        description !==
        undefined
      ) {
        subject.description =
          typeof description ===
          "string"
            ? description.trim()
            : "";
      }

      if (
        color !== undefined &&
        typeof color ===
          "string" &&
        color.trim()
      ) {
        subject.color =
          color.trim();
      }

      await subject.save();

      res.status(200).json(
        subject
      );
    } catch (error) {
      console.error(
        "UPDATE SUBJECT ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update subject",
      });
    }
  }
);

// =========================================================
// DELETE SUBJECT
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
            "Invalid subject ID",
        });
      }

      const subject =
        await Subject.findOneAndDelete({
          _id: id,
          userId:
            req.user.uid,
        });

      if (!subject) {
        return res.status(404).json({
          message:
            "Subject not found",
        });
      }

      res.status(200).json({
        message:
          "Subject deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE SUBJECT ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete subject",
      });
    }
  }
);

module.exports = router;