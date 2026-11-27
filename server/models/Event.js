const mongoose = require("mongoose");

const eventSchema =
  new mongoose.Schema(
    {
      userId: {
        type: String,
        index: true,
        default: null,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      date: {
        type: Date,
        required: true,
      },

      type: {
        type: String,

        enum: [
          "exam",
          "assignment",
          "project",
          "study",
          "other",
        ],

        default: "other",
      },
    },
    {
      timestamps: true,
    }
  );

// Owner-scoped list order; avoids a blocking sort on large study histories.
eventSchema.index({ userId: 1, date: 1 });

module.exports =
  mongoose.model(
    "Event",
    eventSchema
  );