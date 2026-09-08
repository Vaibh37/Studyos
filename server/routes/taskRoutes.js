const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const firebaseAuth = require(
  "../middleware/firebaseAuth"
);

const router = express.Router();

// =========================================================
// ALL TASK ROUTES REQUIRE LOGIN
// =========================================================

router.use(firebaseAuth);

// =========================================================
// GET ALL TASKS FOR CURRENT USER
// =========================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const tasks =
        await Task.find({
          userId:
            req.user.uid,
        }).sort({
          createdAt: -1,
        });

      res.status(200).json(
        tasks
      );
    } catch (error) {
      console.error(
        "GET TASKS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch tasks",
      });
    }
  }
);

// =========================================================
// CREATE TASK
// =========================================================

router.post(
  "/",
  async (req, res) => {
    try {
      const {
        title,
      } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Task title is required",
          });
      }

      const task =
        await Task.create({
          userId:
            req.user.uid,

          title:
            title.trim(),

          completed:
            false,

          completedAt:
            null,
        });

      res.status(201).json(
        task
      );
    } catch (error) {
      console.error(
        "CREATE TASK ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create task",
      });
    }
  }
);

// =========================================================
// UPDATE TASK
// =========================================================

router.patch(
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
              "Invalid task ID",
          });
      }

      const task =
        await Task.findOne({
          _id: id,

          userId:
            req.user.uid,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              "Task not found",
          });
      }

      const {
        title,
        completed,
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
                "Task title cannot be empty",
            });
        }

        task.title =
          title.trim();
      }

      // =====================================
      // COMPLETED
      // =====================================

      if (
        typeof completed ===
        "boolean"
      ) {
        const wasCompleted =
          task.completed;

        task.completed =
          completed;

        if (
          completed &&
          !wasCompleted
        ) {
          task.completedAt =
            new Date();
        }

        if (
          !completed
        ) {
          task.completedAt =
            null;
        }
      }

      await task.save();

      res.status(200).json(
        task
      );
    } catch (error) {
      console.error(
        "UPDATE TASK ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update task",
      });
    }
  }
);

// =========================================================
// DELETE TASK
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
              "Invalid task ID",
          });
      }

      const task =
        await Task.findOneAndDelete({
          _id: id,

          userId:
            req.user.uid,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              "Task not found",
          });
      }

      res.status(200).json({
        message:
          "Task deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE TASK ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete task",
      });
    }
  }
);

module.exports =
  router;