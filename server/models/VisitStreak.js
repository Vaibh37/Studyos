
const mongoose = require("mongoose");

const visitStreakSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    count: {
      type: Number,
      default: 0,
      min: 0,
    },

    best: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastDate: {
      type: String,
      default: "",
    },

    // Keep the same day boundary across devices.
    timeZone: {
      type: String,
      default: "UTC",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "VisitStreak",
  visitStreakSchema
);
