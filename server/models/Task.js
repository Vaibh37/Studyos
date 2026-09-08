const mongoose = require("mongoose");

const taskSchema =
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

      completed: {
        type: Boolean,
        default: false,
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Task",
    taskSchema
  );