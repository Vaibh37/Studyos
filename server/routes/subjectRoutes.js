const express = require("express");
const mongoose = require("mongoose");

const Subject = require("../models/Subject");
const Task = require("../models/Task");
const Note = require("../models/Note");

const StudySession = require(
  "../models/StudySession"
);

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
    const subjects =
      await Subject.find({
        userId:
          req.user.uid,
      }).sort({
        createdAt:
          -1,
      });

    res.status(200).json(
      subjects
    );
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
      typeof name !==
        "string" ||
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
          typeof code ===
          "string"
            ? code.trim()
            : "",

        description:
          typeof description ===
          "string"
            ? description.trim()
            : "",

        color:
          typeof color ===
            "string" &&
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
//
// If the subject NAME changes, keep every cached subjectName
// snapshot in sync:
//
// Task.subjectName
// Note.subjectName
// StudySession.subjectName
//
// We intentionally do NOT update their updatedAt timestamp.
// Renaming Mathematics should not make every linked Note look
// like it was just edited.
// =========================================================

router.put(
  "/:id",
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

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
          _id:
            id,

          userId:
            req.user.uid,
        });

      if (
        !subject
      ) {
        return res.status(404).json({
          message:
            "Subject not found",
        });
      }

      const oldName =
        subject.name;

      const {
        name,
        code,
        description,
        color,
      } = req.body;

      // ===================================================
      // NAME
      // ===================================================

      if (
        name !==
        undefined
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

      // ===================================================
      // CODE
      // ===================================================

      if (
        code !==
        undefined
      ) {
        subject.code =
          typeof code ===
          "string"
            ? code.trim()
            : "";
      }

      // ===================================================
      // DESCRIPTION
      // ===================================================

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

      // ===================================================
      // COLOR
      // ===================================================

      if (
        color !==
          undefined &&
        typeof color ===
          "string" &&
        color.trim()
      ) {
        subject.color =
          color.trim();
      }

      // ===================================================
      // SAVE SUBJECT
      // ===================================================

      await subject.save();

      // ===================================================
      // PROPAGATE NAME CHANGE
      // ===================================================

      const nameChanged =
        oldName !==
        subject.name;

      let renamedReferences = {
        tasks: 0,
        notes: 0,
        studySessions: 0,
      };

      if (
        nameChanged
      ) {
        const [
          taskResult,
          noteResult,
          sessionResult,
        ] =
          await Promise.all([
            // -----------------------------------------------
            // TASKS
            // -----------------------------------------------

            Task.updateMany(
              {
                userId:
                  req.user.uid,

                subjectId:
                  subject._id,
              },
              {
                $set: {
                  subjectName:
                    subject.name,
                },
              },
              {
                timestamps:
                  false,
              }
            ),

            // -----------------------------------------------
            // NOTES
            // -----------------------------------------------

            Note.updateMany(
              {
                userId:
                  req.user.uid,

                subjectId:
                  subject._id,
              },
              {
                $set: {
                  subjectName:
                    subject.name,
                },
              },
              {
                timestamps:
                  false,
              }
            ),

            // -----------------------------------------------
            // STUDY SESSIONS
            // -----------------------------------------------

            StudySession.updateMany(
              {
                userId:
                  req.user.uid,

                subjectId:
                  subject._id,
              },
              {
                $set: {
                  subjectName:
                    subject.name,
                },
              },
              {
                timestamps:
                  false,
              }
            ),
          ]);

        renamedReferences = {
          tasks:
            taskResult.modifiedCount ||
            0,

          notes:
            noteResult.modifiedCount ||
            0,

          studySessions:
            sessionResult.modifiedCount ||
            0,
        };
      }

      // ===================================================
      // RESPONSE
      //
      // Keep the Subject itself as the normal response shape
      // because the frontend expects the saved Subject object.
      // ===================================================

      res.status(200).json(
        subject
      );

      if (
        nameChanged
      ) {
        console.log(
          "SUBJECT NAME PROPAGATED:",
          {
            subjectId:
              String(
                subject._id
              ),

            oldName,

            newName:
              subject.name,

            ...renamedReferences,
          }
        );
      }
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
//
// DO NOT delete related user data.
//
// Tasks:
// subjectId   -> null
// subjectName -> ""
//
// Notes:
// subjectId   -> null
// subjectName -> ""
//
// Study Sessions:
// subjectId   -> null
// subjectName stays unchanged so historical Focus records
// still remember what the user studied.
// =========================================================

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

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

      // ===================================================
      // VERIFY OWNERSHIP
      // ===================================================

      const subject =
        await Subject.findOne({
          _id:
            id,

          userId:
            req.user.uid,
        });

      if (
        !subject
      ) {
        return res.status(404).json({
          message:
            "Subject not found",
        });
      }

      // ===================================================
      // UNLINK REFERENCES
      // ===================================================

      const [
        taskResult,
        noteResult,
        sessionResult,
      ] =
        await Promise.all([
          Task.updateMany(
            {
              userId:
                req.user.uid,

              subjectId:
                subject._id,
            },
            {
              $set: {
                subjectId:
                  null,

                subjectName:
                  "",
              },
            },
            {
              timestamps:
                false,
            }
          ),

          Note.updateMany(
            {
              userId:
                req.user.uid,

              subjectId:
                subject._id,
            },
            {
              $set: {
                subjectId:
                  null,

                subjectName:
                  "",
              },
            },
            {
              timestamps:
                false,
            }
          ),

          StudySession.updateMany(
            {
              userId:
                req.user.uid,

              subjectId:
                subject._id,
            },
            {
              $set: {
                subjectId:
                  null,
              },
            },
            {
              timestamps:
                false,
            }
          ),
        ]);

      // ===================================================
      // DELETE SUBJECT
      // ===================================================

      await subject.deleteOne();

      // ===================================================
      // RESPONSE
      // ===================================================

      res.status(200).json({
        message:
          "Subject deleted successfully",

        unlinked: {
          tasks:
            taskResult.modifiedCount ||
            0,

          notes:
            noteResult.modifiedCount ||
            0,

          studySessions:
            sessionResult.modifiedCount ||
            0,
        },
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