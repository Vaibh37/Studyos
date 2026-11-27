const mongoose = require("mongoose");

const subjectSchema =
  new mongoose.Schema(
    {
      userId: {
        type: String,
        index: true,
        default: null,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      code: {
        type: String,
        default: "",
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      color: {
        type: String,
        default: "#6366f1",
      },
    },
    {
      timestamps: true,
    }
  );

// Owner-scoped list order; avoids a blocking sort on large study histories.
subjectSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.model(
    "Subject",
    subjectSchema
  );