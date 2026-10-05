const mongoose =
  require("mongoose");

const {
  socialDB,
} =
  require(
    "../../config/socialDb"
  );

const groupSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 60,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },

      ownerId: {
        type: String,
        required: true,
        index: true,
      },

      inviteCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
      },

      visibility: {
        type: String,
        enum: [
          "private",
          "public",
        ],
        default: "private",
      },

      memberCount: {
        type: Number,
        default: 1,
        min: 1,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  socialDB.model(
    "Group",
    groupSchema
  );
