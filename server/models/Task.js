const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
      index: true,
    },

    subjectName: {
      type: String,
      default: "",
      trim: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },

    dueDate: {
      type: Date,
      default: null,
      index: true,
    },

    dueTime: {
      type: String,
      default: "",
      trim: true,
    },

    completed: {
      type: Boolean,
      default: false,
      index: true,
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

// =========================================================
// INDEXES
// =========================================================

taskSchema.index({
  userId: 1,
  completed: 1,
  dueDate: 1,
});

taskSchema.index({
  userId: 1,
  priority: 1,
});

// =========================================================
// NORMALIZE TASK BEFORE SAVE
// =========================================================

taskSchema.pre("save", function () {
  if (!this.subjectId) {
    this.subjectName = "";
  }

  if (!this.dueDate) {
    this.dueTime = "";
  }

  if (
    this.completed &&
    !this.completedAt
  ) {
    this.completedAt =
      new Date();
  }

  if (!this.completed) {
    this.completedAt =
      null;
  }
});

module.exports =
  mongoose.model(
    "Task",
    taskSchema
  );