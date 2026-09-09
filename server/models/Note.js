const mongoose = require("mongoose");

// =========================================================
// NOTE SCHEMA
// =========================================================

const noteSchema =
  new mongoose.Schema(
    {
      // =====================================================
      // OWNER
      // =====================================================

      userId: {
        type: String,
        required: true,
        index: true,
        trim: true,
      },

      // =====================================================
      // NOTE CONTENT
      // =====================================================

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160,
      },

      content: {
        type: String,
        default: "",
        maxlength: 200000,
      },

      // =====================================================
      // SUBJECT LINK
      // =====================================================

      subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        default: null,
        index: true,
      },

      // Keep the name as a lightweight snapshot.
      // The frontend still prefers the live Subject record
      // whenever that Subject exists.
      subjectName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 120,
      },

      // =====================================================
      // PINNING
      // =====================================================

      pinned: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

// =========================================================
// INDEXES
// =========================================================

noteSchema.index({
  userId: 1,
  pinned: -1,
  updatedAt: -1,
});

noteSchema.index({
  userId: 1,
  subjectId: 1,
  updatedAt: -1,
});

// =========================================================
// NORMALIZATION
// =========================================================

noteSchema.pre(
  "save",
  function () {
    if (!this.subjectId) {
      this.subjectName = "";
    }
  }
);

// =========================================================
// MODEL
// =========================================================

module.exports =
  mongoose.model(
    "Note",
    noteSchema
  );