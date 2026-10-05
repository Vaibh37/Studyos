const mongoose =
  require("mongoose");

const {
  socialDB,
} =
  require("../../config/socialDb");


// =========================================================
// GROUP MEMBER
// =========================================================

const groupMemberSchema =
  new mongoose.Schema(
    {
      // =====================================================
      // GROUP
      // =====================================================

      groupId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Group",

        required:
          true,

        index:
          true,
      },


      // =====================================================
      // USER
      //
      // Firebase UID
      // =====================================================

      userId: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true,
      },


      // =====================================================
      // ROLE
      // =====================================================

      role: {
        type:
          String,

        enum: [
          "owner",
          "admin",
          "member",
        ],

        default:
          "member",

        required:
          true,
      },


      // =====================================================
      // PROFILE SNAPSHOT
      // =====================================================

      displayName: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },


      picture: {
        type:
          String,

        default:
          null,
      },


      // =====================================================
      // MEMBERSHIP
      // =====================================================

      joinedAt: {
        type:
          Date,

        default:
          Date.now,
      },


      // =====================================================
      // READ RECEIPTS
      //
      // Stores the newest group message this member has read.
      // =====================================================

      lastReadMessageId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "GroupMessage",

        default:
          null,
      },


      lastReadAt: {
        type:
          Date,

        default:
          null,
      },
    },
    {
      timestamps:
        true,
    }
  );


// =========================================================
// INDEXES
// =========================================================

// A Firebase user can only be a member of a group once.

groupMemberSchema.index(
  {
    groupId:
      1,

    userId:
      1,
  },
  {
    unique:
      true,
  }
);


// Useful for loading all groups for one user.

groupMemberSchema.index({
  userId:
    1,

  joinedAt:
    -1,
});


// Useful for loading a group's member list.

groupMemberSchema.index({
  groupId:
    1,

  joinedAt:
    1,
});


// =========================================================
// MODEL
// =========================================================

const GroupMember =
  socialDB.models.GroupMember ||
  socialDB.model(
    "GroupMember",
    groupMemberSchema
  );


module.exports =
  GroupMember;