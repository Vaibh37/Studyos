const mongoose =
  require("mongoose");

const {
  socialDB,
} =
  require(
    "../../config/socialDb"
  );

const liveSessionSchema =
  new mongoose.Schema(
    {
      userId: {
        type: String,
        required: true,
        index: true,
      },

      groupId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Group",

        required: true,
        index: true,
      },

      displayName: {
        type: String,
        trim: true,
        default: null,
      },

      picture: {
        type: String,
        default: null,
      },

      subjectId: {
        type: String,
        default: null,
      },

      subjectName: {
        type: String,
        trim: true,
        default:
          "General Study",
      },

      startedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      lastSeenAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

// =========================================
// ONE LIVE SESSION PER USER
// =========================================

liveSessionSchema.index(
  {
    userId: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  socialDB.model(
    "LiveSession",
    liveSessionSchema
  );