const mongoose = require("mongoose");

const noteSchema =
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

      content: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Note",
    noteSchema
  );