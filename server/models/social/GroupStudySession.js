const mongoose = require("mongoose");

const {
  socialDB,
} = require("../../config/socialDb");

const groupStudySessionSchema =
  new mongoose.Schema(
    {
      liveSessionId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      groupId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Group",

        required:
          true,

        index:
          true,
      },

      userId: {
        type:
          String,

        required:
          true,

        index:
          true,

        trim:
          true,
      },

      displayName: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      picture: {
        type:
          String,

        default:
          null,
      },

      subjectId: {
        type:
          String,

        default:
          null,
      },

      subjectName: {
        type:
          String,

        trim:
          true,

        default:
          "General Study",
      },

      startedAt: {
        type:
          Date,

        required:
          true,
      },

      endedAt: {
        type:
          Date,

        required:
          true,
      },

      durationSeconds: {
        type:
          Number,

        required:
          true,

        min:
          1,
      },
    },
    {
      timestamps:
        true,
    }
  );

groupStudySessionSchema.index({
  groupId:
    1,

  endedAt:
    -1,
});

groupStudySessionSchema.index({
  groupId:
    1,

  userId:
    1,

  endedAt:
    -1,
});

module.exports =
  socialDB.model(
    "GroupStudySession",
    groupStudySessionSchema
  );