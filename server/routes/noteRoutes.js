const express =
  require("express");

const mongoose =
  require("mongoose");

const Note =
  require("../models/Note");

const Subject =
  require("../models/Subject");

const firebaseAuth =
  require(
    "../middleware/firebaseAuth"
  );

const router =
  express.Router();

// =========================================================
// ALL ROUTES REQUIRE LOGIN
// =========================================================

router.use(
  firebaseAuth
);

// =========================================================
// HELPERS
// =========================================================

const createHttpError = (
  status,
  message
) => {
  const error =
    new Error(message);

  error.status =
    status;

  return error;
};

// =========================================================
// ESCAPE SEARCH REGEX
// =========================================================

const escapeRegExp = (
  value
) => {
  return String(
    value
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

// =========================================================
// CLEAN TITLE
// =========================================================

const cleanTitle = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(
      /\s+/g,
      " "
    );
};

// =========================================================
// RESOLVE OWNED SUBJECT
// =========================================================

const resolveOwnedSubject =
  async (
    userId,
    rawSubjectId
  ) => {
    // Null / empty means:
    // note is intentionally unassigned.

    if (
      rawSubjectId ===
        null ||
      rawSubjectId ===
        undefined ||
      rawSubjectId ===
        ""
    ) {
      return null;
    }

    const subjectId =
      String(
        rawSubjectId
      ).trim();

    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          subjectId
        )
    ) {
      throw createHttpError(
        400,
        "Invalid subject ID"
      );
    }

    const subject =
      await Subject.findOne({
        _id:
          subjectId,

        userId,
      });

    if (!subject) {
      throw createHttpError(
        404,
        "Subject not found"
      );
    }

    return subject;
  };

// =========================================================
// SEND ROUTE ERROR
// =========================================================

const sendRouteError = (
  res,
  error,
  fallbackMessage
) => {
  const status =
    Number(
      error?.status
    ) || 500;

  if (
    status >= 500
  ) {
    console.error(
      fallbackMessage,
      error
    );
  }

  return res
    .status(status)
    .json({
      message:
        status >= 500
          ? fallbackMessage
          : error.message,
    });
};

// =========================================================
// GET ALL NOTES
//
// Optional query parameters:
//
// ?q=biology
// ?subjectId=<id>
// ?subjectId=none
// ?pinned=true
// =========================================================

router.get(
  "/",
  async (
    req,
    res
  ) => {
    try {
      const filter = {
        userId:
          req.user.uid,
      };

      // ===================================================
      // SUBJECT FILTER
      // ===================================================

      const rawSubjectId =
        req.query
          .subjectId;

      if (
        rawSubjectId ===
        "none"
      ) {
        filter.subjectId =
          null;
      } else if (
        rawSubjectId
      ) {
        if (
          !mongoose.Types
            .ObjectId
            .isValid(
              rawSubjectId
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
          rawSubjectId;
      }

      // ===================================================
      // PIN FILTER
      // ===================================================

      if (
        req.query.pinned ===
        "true"
      ) {
        filter.pinned =
          true;
      }

      if (
        req.query.pinned ===
        "false"
      ) {
        filter.pinned =
          false;
      }

      // ===================================================
      // SEARCH
      // ===================================================

      const search =
        typeof req.query.q ===
          "string"
          ? req.query.q
              .trim()
          : "";

      if (search) {
        const regex =
          new RegExp(
            escapeRegExp(
              search
            ),
            "i"
          );

        filter.$or = [
          {
            title:
              regex,
          },

          {
            content:
              regex,
          },

          {
            subjectName:
              regex,
          },
        ];
      }

      // ===================================================
      // FIND
      // ===================================================

      const notes =
        await Note.find(
          filter
        ).sort({
          pinned: -1,
          updatedAt: -1,
        });

      return res
        .status(200)
        .json(
          notes
        );
    } catch (error) {
      return sendRouteError(
        res,
        error,
        "Failed to fetch notes"
      );
    }
  }
);

// =========================================================
// GET ONE NOTE
// =========================================================

router.get(
  "/:id",
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } =
        req.params;

      if (
        !mongoose.Types
          .ObjectId
          .isValid(
            id
          )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid note ID",
          });
      }

      const note =
        await Note.findOne({
          _id:
            id,

          userId:
            req.user.uid,
        });

      if (!note) {
        return res
          .status(404)
          .json({
            message:
              "Note not found",
          });
      }

      return res
        .status(200)
        .json(
          note
        );
    } catch (error) {
      return sendRouteError(
        res,
        error,
        "Failed to fetch note"
      );
    }
  }
);

// =========================================================
// CREATE NOTE
// =========================================================

router.post(
  "/",
  async (
    req,
    res
  ) => {
    try {
      const {
        title,
        content,
        subjectId,
        pinned,
      } =
        req.body;

      // ===================================================
      // TITLE
      // ===================================================

      const safeTitle =
        cleanTitle(
          title
        );

      if (
        !safeTitle
      ) {
        return res
          .status(400)
          .json({
            message:
              "Note title is required",
          });
      }

      if (
        safeTitle.length >
        160
      ) {
        return res
          .status(400)
          .json({
            message:
              "Note title cannot exceed 160 characters",
          });
      }

      // ===================================================
      // CONTENT
      // ===================================================

      const safeContent =
        typeof content ===
        "string"
          ? content
          : "";

      if (
        safeContent.length >
        200000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Note content is too large",
          });
      }

      // ===================================================
      // PINNED
      // ===================================================

      if (
        pinned !==
          undefined &&
        typeof pinned !==
          "boolean"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Pinned must be true or false",
          });
      }

      // ===================================================
      // SUBJECT
      // ===================================================

      const subject =
        await resolveOwnedSubject(
          req.user.uid,
          subjectId
        );

      // ===================================================
      // CREATE
      // ===================================================

      const note =
        await Note.create({
          userId:
            req.user.uid,

          title:
            safeTitle,

          content:
            safeContent,

          subjectId:
            subject?._id ||
            null,

          subjectName:
            subject?.name ||
            "",

          pinned:
            Boolean(
              pinned
            ),
        });

      return res
        .status(201)
        .json(
          note
        );
    } catch (error) {
      return sendRouteError(
        res,
        error,
        "Failed to create note"
      );
    }
  }
);

// =========================================================
// UPDATE NOTE
// =========================================================

router.put(
  "/:id",
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } =
        req.params;

      if (
        !mongoose.Types
          .ObjectId
          .isValid(
            id
          )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid note ID",
          });
      }

      // ===================================================
      // OWN NOTE
      // ===================================================

      const note =
        await Note.findOne({
          _id:
            id,

          userId:
            req.user.uid,
        });

      if (!note) {
        return res
          .status(404)
          .json({
            message:
              "Note not found",
          });
      }

      const {
        title,
        content,
        subjectId,
        pinned,
      } =
        req.body;

      // ===================================================
      // TITLE
      // ===================================================

      if (
        title !==
        undefined
      ) {
        const safeTitle =
          cleanTitle(
            title
          );

        if (
          !safeTitle
        ) {
          return res
            .status(400)
            .json({
              message:
                "Note title cannot be empty",
            });
        }

        if (
          safeTitle.length >
          160
        ) {
          return res
            .status(400)
            .json({
              message:
                "Note title cannot exceed 160 characters",
            });
        }

        note.title =
          safeTitle;
      }

      // ===================================================
      // CONTENT
      // ===================================================

      if (
        content !==
        undefined
      ) {
        if (
          typeof content !==
          "string"
        ) {
          return res
            .status(400)
            .json({
              message:
                "Note content must be text",
            });
        }

        if (
          content.length >
          200000
        ) {
          return res
            .status(400)
            .json({
              message:
                "Note content is too large",
            });
        }

        note.content =
          content;
      }

      // ===================================================
      // PINNED
      // ===================================================

      if (
        pinned !==
        undefined
      ) {
        if (
          typeof pinned !==
          "boolean"
        ) {
          return res
            .status(400)
            .json({
              message:
                "Pinned must be true or false",
            });
        }

        note.pinned =
          pinned;
      }

      // ===================================================
      // SUBJECT
      // ===================================================

      if (
        subjectId !==
        undefined
      ) {
        const subject =
          await resolveOwnedSubject(
            req.user.uid,
            subjectId
          );

        note.subjectId =
          subject?._id ||
          null;

        note.subjectName =
          subject?.name ||
          "";
      }

      // ===================================================
      // SAVE
      // ===================================================

      await note.save();

      return res
        .status(200)
        .json(
          note
        );
    } catch (error) {
      return sendRouteError(
        res,
        error,
        "Failed to update note"
      );
    }
  }
);

// =========================================================
// DELETE NOTE
// =========================================================

router.delete(
  "/:id",
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } =
        req.params;

      if (
        !mongoose.Types
          .ObjectId
          .isValid(
            id
          )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid note ID",
          });
      }

      const note =
        await Note
          .findOneAndDelete({
            _id:
              id,

            userId:
              req.user.uid,
          });

      if (!note) {
        return res
          .status(404)
          .json({
            message:
              "Note not found",
          });
      }

      return res
        .status(200)
        .json({
          message:
            "Note deleted successfully",

          deletedId:
            note._id,
        });
    } catch (error) {
      return sendRouteError(
        res,
        error,
        "Failed to delete note"
      );
    }
  }
);

module.exports =
  router;