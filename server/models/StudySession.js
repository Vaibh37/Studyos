const mongoose = require("mongoose");

const studySessionSchema =
  new mongoose.Schema(
    {
      userId: {
        type: String,
        index: true,
        default: null,
      },

      subjectId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Subject",

        default: null,
      },

      subjectName: {
        type: String,
        default:
          "General Study",
        trim: true,
      },

      plannedMinutes: {
        type: Number,
        required: true,
        min: 1,
        max: 720,
      },

      durationSeconds: {
        type: Number,
        required: true,
        min: 1,
      },

      // Only a one-time server-issued run can earn public ranking credit.
      verified: { type: Boolean, default: false, index: true },

      startedAt: {
        type: Date,
        required: true,
      },

      endedAt: {
        type: Date,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "StudySession",
    studySessionSchema
  );