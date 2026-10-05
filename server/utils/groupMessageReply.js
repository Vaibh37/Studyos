const mongoose =
  require("mongoose");

const GroupMessage =
  require(
    "../models/social/GroupMessage"
  );


// =========================================
// REPLY ERROR
// =========================================

class GroupReplyError extends Error {
  constructor(
    message,
    statusCode = 400
  ) {
    super(
      message
    );

    this.name =
      "GroupReplyError";

    this.statusCode =
      statusCode;
  }
}


// =========================================
// BUILD REPLY SNAPSHOT
//
// Client sends only the original message ID.
// The server reads the real original message
// and builds the reply preview from it.
// =========================================

const buildReplySnapshot =
  async ({
    groupId,
    userId,
    replyToMessageId,
  }) => {
    const safeReplyId =
      String(
        replyToMessageId ||
        ""
      ).trim();


    // No reply selected.
    if (!safeReplyId) {
      return null;
    }


    // Prevent invalid MongoDB IDs.
    if (
      !mongoose.Types.ObjectId.isValid(
        safeReplyId
      )
    ) {
      throw new GroupReplyError(
        "The message you are replying to is invalid."
      );
    }


    // The replied-to message must belong
    // to the same group.
    const originalMessage =
      await GroupMessage.findOne({
        _id:
          safeReplyId,

        groupId,
      })
        .lean();


    if (!originalMessage) {
      throw new GroupReplyError(
        "The message you are replying to was not found.",
        404
      );
    }


    // Do not allow replying to something
    // the current user deleted for themselves.
    if (
      Array.isArray(
        originalMessage.deletedFor
      ) &&
      originalMessage.deletedFor.includes(
        String(
          userId
        )
      )
    ) {
      throw new GroupReplyError(
        "You cannot reply to a message you deleted."
      );
    }


    // An unsent message should no longer
    // be replyable.
    if (
      originalMessage.isUnsent
    ) {
      throw new GroupReplyError(
        "You cannot reply to an unsent message."
      );
    }


    const attachments =
      Array.isArray(
        originalMessage.attachments
      )
        ? originalMessage.attachments
        : [];


    // Store a small immutable snapshot.
    // No nested reply chain is copied.
    return {
      messageId:
        originalMessage._id,

      userId:
        String(
          originalMessage.userId
        ),

      displayName:
        originalMessage.displayName ||
        null,

      message:
        originalMessage.message ||
        null,

      attachmentCount:
        attachments.length,

      firstAttachmentName:
        attachments[0]?.fileName ||
        null,
    };
  };


module.exports = {
  GroupReplyError,
  buildReplySnapshot,
};