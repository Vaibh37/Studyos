const mongoose =
  require("mongoose");

const leaderboardProfileSchema =
  new mongoose.Schema(
    {
      userId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      displayName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 32,
      },

      isPublic: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

leaderboardProfileSchema.index({
  isPublic: 1,
  updatedAt: -1,
});

module.exports =
  mongoose.model(
    "LeaderboardProfile",
    leaderboardProfileSchema
  );