const mongoose =
  require("mongoose");

const {
  socialDB,
} =
  require("../../config/socialDb");


// =========================================================
// REACTION
// =========================================================

const reactionSchema =
  new mongoose.Schema(
    {
      emoji: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          32,
      },


      userId: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },


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


      reactedAt: {
        type:
          Date,

        default:
          Date.now,
      },
    },
    {
      _id:
        false,
    }
  );


// =========================================================
// ATTACHMENT
// =========================================================

const attachmentSchema =
  new mongoose.Schema(
    {
      storageKey: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },


      fileName: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          255,
      },


      mimeType: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },


      size: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },


      uploadedBy: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },


      uploadedAt: {
        type:
          Date,

        default:
          Date.now,
      },
    },
    {
      _id:
        false,
    }
  );


// =========================================================
// REPLY SNAPSHOT
// =========================================================

const replySchema =
  new mongoose.Schema(
    {
      messageId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "GroupMessage",

        required:
          true,
      },


      userId: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },


      displayName: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },


      message: {
        type:
          String,

        trim:
          true,

        maxlength:
          2000,

        default:
          null,
      },


      attachmentCount: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },


      firstAttachmentName: {
        type:
          String,

        trim:
          true,

        maxlength:
          255,

        default:
          null,
      },
    },
    {
      _id:
        false,
    }
  );


// =========================================================
// GROUP MESSAGE
// =========================================================

const groupMessageSchema =
  new mongoose.Schema(
    {
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


      userId: {
        type:
          String,

        required:
          true,

        index:
          true,

        trim:
          true,
      },


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
      // MESSAGE BODY
      // =====================================================

      message: {
        type:
          String,

        trim:
          true,

        maxlength:
          2000,

        default:
          null,
      },


      // =====================================================
      // REPLY TO MESSAGE
      // =====================================================

      replyTo: {
        type:
          replySchema,

        default:
          null,
      },


      // =====================================================
      // ATTACHMENTS
      // =====================================================

      attachments: {
        type: [
          attachmentSchema,
        ],

        default:
          [],
      },


      // =====================================================
      // EDITING
      // =====================================================

      editedAt: {
        type:
          Date,

        default:
          null,
      },


      // =====================================================
      // UNSEND FOR EVERYONE
      // =====================================================

      isUnsent: {
        type:
          Boolean,

        default:
          false,
      },


      unsentAt: {
        type:
          Date,

        default:
          null,
      },


      // =====================================================
      // REACTIONS
      // =====================================================

      reactions: {
        type: [
          reactionSchema,
        ],

        default:
          [],
      },


      // =====================================================
      // DELETE FOR ME
      // =====================================================

      deletedFor: {
        type: [
          {
            type:
              String,

            trim:
              true,
          },
        ],

        default:
          [],
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

groupMessageSchema.index({
  groupId:
    1,

  createdAt:
    -1,
});


groupMessageSchema.index({
  groupId:
    1,

  userId:
    1,

  createdAt:
    -1,
});


// =========================================================
// MODEL
// =========================================================

const GroupMessage =
  socialDB.models.GroupMessage ||
  socialDB.model(
    "GroupMessage",
    groupMessageSchema
  );


module.exports =
  GroupMessage;