const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const Subject = require("../models/Subject");

const firebaseAuth = require(
  "../middleware/firebaseAuth"
);

const router = express.Router();

// =========================================================
// ALL TASK ROUTES REQUIRE LOGIN
// =========================================================

router.use(firebaseAuth);

// =========================================================
// HELPERS
// =========================================================

const VALID_PRIORITIES = [
  "low",
  "medium",
  "high",
];

const isValidPriority = (
  priority
) =>
  VALID_PRIORITIES.includes(
    priority
  );

const isValidDueTime = (
  dueTime
) => {
  if (!dueTime) {
    return true;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    dueTime
  );
};

const parseDueDate = (
  dueDate
) => {
  if (
    dueDate === null ||
    dueDate === undefined ||
    dueDate === ""
  ) {
    return null;
  }

  const parsedDate =
    new Date(dueDate);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return undefined;
  }

  return parsedDate;
};

// =========================================================
// GET ALL TASKS FOR CURRENT USER
// =========================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const filter = {
        userId:
          req.user.uid,
      };

      const {
        completed,
        priority,
        subjectId,
        search,
      } = req.query;

      // =====================================
      // COMPLETED FILTER
      // =====================================

      if (
        completed === "true"
      ) {
        filter.completed =
          true;
      }

      if (
        completed === "false"
      ) {
        filter.completed =
          false;
      }

      // =====================================
      // PRIORITY FILTER
      // =====================================

      if (
        priority &&
        isValidPriority(
          priority
        )
      ) {
        filter.priority =
          priority;
      }

      // =====================================
      // SUBJECT FILTER
      // =====================================

      if (subjectId) {
        if (
          !mongoose.Types.ObjectId.isValid(
            subjectId
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid subject ID",
            });
        }

        filter.subjectId =
          subjectId;
      }

      // =====================================
      // SEARCH
      // =====================================

      if (
        typeof search ===
          "string" &&
        search.trim()
      ) {
        filter.title = {
          $regex:
            search.trim(),
          $options: "i",
        };
      }

      const tasks =
        await Task.find(
          filter
        ).sort({
          completed: 1,
          dueDate: 1,
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
        subjectId,
        priority =
          "medium",
        dueDate,
        dueTime = "",
      } = req.body;

      // =====================================
      // TITLE
      // =====================================

      if (
        typeof title !==
          "string" ||
        !title.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Task title is required",
          });
      }

      // =====================================
      // PRIORITY
      // =====================================

      if (
        !isValidPriority(
          priority
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Priority must be low, medium or high",
          });
      }

      // =====================================
      // DUE DATE
      // =====================================

      const parsedDueDate =
        parseDueDate(
          dueDate
        );

      if (
        parsedDueDate ===
        undefined
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid due date",
          });
      }

      // =====================================
      // DUE TIME
      // =====================================

      if (
        dueTime &&
        !isValidDueTime(
          dueTime
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid due time",
          });
      }

      if (
        dueTime &&
        !parsedDueDate
      ) {
        return res
          .status(400)
          .json({
            message:
              "A due date is required when due time is set",
          });
      }

      // =====================================
      // SUBJECT
      // =====================================

      let selectedSubject =
        null;

      if (subjectId) {
        if (
          !mongoose.Types.ObjectId.isValid(
            subjectId
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid subject ID",
            });
        }

        selectedSubject =
          await Subject.findOne(
            {
              _id: subjectId,

              userId:
                req.user.uid,
            }
          );

        if (
          !selectedSubject
        ) {
          return res
            .status(404)
            .json({
              message:
                "Subject not found",
            });
        }
      }

      // =====================================
      // CREATE
      // =====================================

      const task =
        await Task.create({
          userId:
            req.user.uid,

          title:
            title.trim(),

          subjectId:
            selectedSubject
              ? selectedSubject._id
              : null,

          subjectName:
            selectedSubject
              ? selectedSubject.name
              : "",

          priority,

          dueDate:
            parsedDueDate,

          dueTime:
            parsedDueDate
              ? dueTime
              : "",

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

      // =====================================
      // TASK ID
      // =====================================

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
        subjectId,
        priority,
        dueDate,
        dueTime,
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
      // PRIORITY
      // =====================================

      if (
        priority !==
        undefined
      ) {
        if (
          !isValidPriority(
            priority
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Priority must be low, medium or high",
            });
        }

        task.priority =
          priority;
      }

      // =====================================
      // SUBJECT
      // =====================================

      if (
        subjectId !==
        undefined
      ) {
        if (
          subjectId ===
            null ||
          subjectId === ""
        ) {
          task.subjectId =
            null;

          task.subjectName =
            "";
        } else {
          if (
            !mongoose.Types.ObjectId.isValid(
              subjectId
            )
          ) {
            return res
              .status(400)
              .json({
                message:
                  "Invalid subject ID",
              });
          }

          const subject =
            await Subject.findOne(
              {
                _id: subjectId,

                userId:
                  req.user.uid,
              }
            );

          if (!subject) {
            return res
              .status(404)
              .json({
                message:
                  "Subject not found",
              });
          }

          task.subjectId =
            subject._id;

          task.subjectName =
            subject.name;
        }
      }

      // =====================================
      // DUE DATE
      // =====================================

      if (
        dueDate !==
        undefined
      ) {
        const parsedDueDate =
          parseDueDate(
            dueDate
          );

        if (
          parsedDueDate ===
          undefined
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid due date",
            });
        }

        task.dueDate =
          parsedDueDate;

        if (
          !parsedDueDate
        ) {
          task.dueTime =
            "";
        }
      }

      // =====================================
      // DUE TIME
      // =====================================

      if (
        dueTime !==
        undefined
      ) {
        if (
          dueTime &&
          !isValidDueTime(
            dueTime
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid due time",
            });
        }

        if (
          dueTime &&
          !task.dueDate
        ) {
          return res
            .status(400)
            .json({
              message:
                "A due date is required when due time is set",
            });
        }

        task.dueTime =
          dueTime;
      }

      // =====================================
      // COMPLETED
      // =====================================

      if (
        completed !==
        undefined
      ) {
        if (
          typeof completed !==
          "boolean"
        ) {
          return res
            .status(400)
            .json({
              message:
                "Completed must be a boolean",
            });
        }

        task.completed =
          completed;
      }

      // Task model handles completedAt automatically.

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
        await Task.findOneAndDelete(
          {
            _id: id,

            userId:
              req.user.uid,
          }
        );

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

        taskId:
          task._id,
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