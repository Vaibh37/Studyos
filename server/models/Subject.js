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

module.exports =
  mongoose.model(
    "Subject",
    subjectSchema
  );