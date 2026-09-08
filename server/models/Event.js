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

module.exports =
  mongoose.model(
    "Event",
    eventSchema
  );