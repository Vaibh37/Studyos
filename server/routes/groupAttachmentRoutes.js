const { publicGroupMessage } = require("../utils/publicGroupMessage");
const express =
  require("express");

const mongoose =
  require("mongoose");

const crypto = require("crypto");
const GroupAttachmentUpload = require("../models/social/GroupAttachmentUpload");

const firebaseAuth =
  require(
    "../middleware/firebaseAuth"
  );

const {
  attachmentUploadLimiter,
  attachmentFinalizeLimiter,
} =
  require(
    "../middleware/rateLimiters"
  );

const GroupMember =
  require(
    "../models/social/GroupMember"
  );

const GroupMessage =
  require(
    "../models/social/GroupMessage"
  );

const {
  createGroupStorageKey,
  createUploadUrl,
  getStoredObjectMetadata,
  createDownloadUrl,
  sanitizeFileName,
} = require(
  "../services/r2Storage"
);

const {
  GroupReplyError,
  buildReplySnapshot,
} = require(
  "../utils/groupMessageReply"
);


const router =
  express.Router();


// =========================================================
// CONFIG
// =========================================================

const MAX_FILE_SIZE =
  25 *
  1024 *
  1024;


const ALLOWED_MIME_TYPES =
  new Set([
    // Images
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",

    // Documents
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",

    // Microsoft Office
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Archives
    "application/zip",
    "application/x-zip-compressed",
  ]);


// =========================================================
// GROUP ROOM
// =========================================================

const { getGroupRoom } = require("../utils/groupRoomAccess");


// =========================================================
// CHECK GROUP MEMBERSHIP
// =========================================================

async function getMembership(
  groupId,
  userId
) {
  return GroupMember.findOne({
    groupId,
    userId,
  });
}


// =========================================================
// CREATE PRESIGNED UPLOAD URL
//
// POST
// /api/groups/:groupId/attachments/upload-url
// =========================================================

router.post(
  "/:groupId/attachments/upload-url",
  firebaseAuth,
  attachmentUploadLimiter,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
      } =
        req.params;

      const {
        fileName,
        mimeType,
        size,
      } =
        req.body;


      // -----------------------------------------
      // GROUP ID
      // -----------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          groupId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }


      // -----------------------------------------
      // MEMBERSHIP
      // -----------------------------------------

      const membership =
        await getMembership(
          groupId,
          req.user.uid
        );


      if (!membership) {
        return res
          .status(403)
          .json({
            message:
              "You are not a member of this group",
          });
      }


      // -----------------------------------------
      // FILE NAME
      // -----------------------------------------

      if (
        typeof fileName !==
          "string" ||
        !fileName.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "File name is required",
          });
      }


      if (
        fileName.length >
        255
      ) {
        return res
          .status(400)
          .json({
            message:
              "File name is too long",
          });
      }


      // -----------------------------------------
      // MIME TYPE
      // -----------------------------------------

      if (
        typeof mimeType !==
          "string" ||
        !ALLOWED_MIME_TYPES.has(
          mimeType
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "This file type is not supported",
          });
      }


      // -----------------------------------------
      // FILE SIZE
      // -----------------------------------------

      const numericSize =
        Number(size);


      if (
        !Number.isSafeInteger(
          numericSize
        ) ||
        numericSize <= 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid file size",
          });
      }


      if (
        numericSize >
        MAX_FILE_SIZE
      ) {
        return res
          .status(413)
          .json({
            message:
              "File is larger than the 25 MB limit",
          });
      }


      // -----------------------------------------
      // STORAGE KEY
      // -----------------------------------------

      const safeFileName =
        sanitizeFileName(
          fileName
        );


      const storageKey =
        createGroupStorageKey(
          groupId,
          safeFileName
        );


      // -----------------------------------------
      // SIGNED R2 URL
      // -----------------------------------------

      const {
        uploadUrl,
        expiresIn,
      } =
        await createUploadUrl({
          storageKey,
          mimeType,
          size: numericSize,
        });


      // An issued upload belongs only to the requesting Firebase UID.
      // URL expiration is 5 minutes; allow 1 hour to finish processing.
      await GroupAttachmentUpload.create({
        groupId,
        userId: req.user.uid,
        storageKey,
        fileName: safeFileName,
        mimeType,
        size: numericSize,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      // -----------------------------------------
      // RESPONSE
      // -----------------------------------------

      return res.json({
        uploadUrl,

        expiresIn,

        attachment: {
          storageKey,

          fileName:
            safeFileName,

          mimeType,

          size:
            numericSize,
        },
      });
    } catch (error) {
      console.error(
        "CREATE ATTACHMENT UPLOAD URL ERROR:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to prepare file upload",
        });
    }
  }
);


// =========================================================
// FINALIZE UPLOAD + CREATE CHAT MESSAGE
//
// POST
// /api/groups/:groupId/attachments/finalize
//
// New batch body:
// {
//   attachments: [
//     {
//       storageKey,
//       fileName,
//       mimeType,
//       size
//     }
//   ],
//   message
// }
//
// Legacy single-file body is still supported:
// {
//   storageKey,
//   fileName,
//   mimeType,
//   size,
//   message
// }
// =========================================================

router.post(
  "/:groupId/attachments/finalize",
  firebaseAuth,
  attachmentFinalizeLimiter,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
      } =
        req.params;


      const body =
        req.body ||
        {};


      const {
        storageKey,
        fileName,
        mimeType,
        size,
        message = "",
        replyToMessageId,
      } =
        body;


      // -----------------------------------------
      // GROUP ID
      // -----------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          groupId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }


      // -----------------------------------------
      // MEMBERSHIP
      // -----------------------------------------

      const membership =
        await getMembership(
          groupId,
          req.user.uid
        );


      if (!membership) {
        return res
          .status(403)
          .json({
            message:
              "You are not a member of this group",
          });
      }


      // -----------------------------------------
      // NORMALIZE ATTACHMENTS
      //
      // Accept:
      // - new attachments[]
      // - old single-file fields
      // -----------------------------------------

      let requestedAttachments;


      if (
        body.attachments !==
        undefined
      ) {
        if (
          !Array.isArray(
            body.attachments
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Attachments must be an array",
            });
        }


        requestedAttachments =
          body.attachments;
      } else {
        requestedAttachments = [
          {
            storageKey,
            fileName,
            mimeType,
            size,
          },
        ];
      }


      // -----------------------------------------
      // ATTACHMENT COUNT
      // -----------------------------------------

      if (
        requestedAttachments.length ===
        0
      ) {
        return res
          .status(400)
          .json({
            message:
              "At least one attachment is required",
          });
      }


      if (
        requestedAttachments.length >
        10
      ) {
        return res
          .status(400)
          .json({
            message:
              "You can attach up to 10 files at once",
          });
      }


      // -----------------------------------------
      // OPTIONAL MESSAGE / CAPTION
      // -----------------------------------------

      if (
        typeof message !==
        "string"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Message must be text",
          });
      }


      const text =
        message.trim();


      if (
        text.length >
        2000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Message must be 2000 characters or less",
          });
      }


      // -----------------------------------------
      // REPLY SNAPSHOT
      // -----------------------------------------

      const replyTo =
        await buildReplySnapshot({
          groupId,

          userId:
            req.user.uid,

          replyToMessageId,
        });

      // -----------------------------------------
      // VALIDATE REQUEST METADATA
      // -----------------------------------------

      const normalizedAttachments =
        [];


      const storageKeys =
        new Set();


      const expectedPrefix =
        `groups/${groupId}/`;


      for (
        let index = 0;
        index <
        requestedAttachments.length;
        index += 1
      ) {
        const requested =
          requestedAttachments[
            index
          ];


        if (
          !requested ||
          typeof requested !==
            "object" ||
          Array.isArray(
            requested
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                `Attachment ${index + 1} is invalid`,
            });
        }


        const requestedStorageKey =
          requested.storageKey;


        const requestedFileName =
          requested.fileName;


        const requestedMimeType =
          requested.mimeType;


        const expectedSize =
          Number(
            requested.size
          );


        // ---------------------------------------
        // STORAGE KEY
        // ---------------------------------------

        if (
          typeof requestedStorageKey !==
            "string" ||
          !requestedStorageKey.trim()
        ) {
          return res
            .status(400)
            .json({
              message:
                `Attachment ${index + 1} is missing its storage key`,
            });
        }


        if (
          !requestedStorageKey.startsWith(
            expectedPrefix
          )
        ) {
          return res
            .status(403)
            .json({
              message:
                "Invalid attachment storage key",
            });
        }


        if (
          storageKeys.has(
            requestedStorageKey
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "The same file cannot be attached twice",
            });
        }


        storageKeys.add(
          requestedStorageKey
        );


        // ---------------------------------------
        // FILE NAME
        // ---------------------------------------

        if (
          typeof requestedFileName !==
            "string" ||
          !requestedFileName.trim()
        ) {
          return res
            .status(400)
            .json({
              message:
                `Attachment ${index + 1} is missing its file name`,
            });
        }


        const safeFileName =
          sanitizeFileName(
            requestedFileName
          );


        // ---------------------------------------
        // MIME TYPE
        // ---------------------------------------

        if (
          typeof requestedMimeType !==
            "string" ||
          !ALLOWED_MIME_TYPES.has(
            requestedMimeType
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                `Attachment ${index + 1} has an unsupported file type`,
            });
        }


        // ---------------------------------------
        // SIZE
        // ---------------------------------------

        if (
          !Number.isFinite(
            expectedSize
          ) ||
          expectedSize <=
            0
        ) {
          return res
            .status(400)
            .json({
              message:
                `Attachment ${index + 1} has an invalid file size`,
            });
        }


        if (
          expectedSize >
          MAX_FILE_SIZE
        ) {
          return res
            .status(413)
            .json({
              message:
                `${safeFileName} is larger than the 25 MB limit`,
            });
        }


        normalizedAttachments.push({
          storageKey:
            requestedStorageKey,

          fileName:
            safeFileName,

          mimeType:
            requestedMimeType,

          size:
            expectedSize,
        });
      }


      // -----------------------------------------
      // REQUIRE THE ORIGINAL USER'S UNEXPIRED UPLOAD AUTHORIZATION
      // -----------------------------------------

      const attachmentKeys = normalizedAttachments.map((item) => item.storageKey);
      const issuedUploads = await GroupAttachmentUpload.find({
        groupId,
        userId: req.user.uid,
        storageKey: { $in: attachmentKeys },
        expiresAt: { $gt: new Date() },
        consumedAt: null,
        claimId: null,
      }).lean();

      const issuedByStorageKey = new Map(
        issuedUploads.map((item) => [item.storageKey, item])
      );

      for (const attachment of normalizedAttachments) {
        const issued = issuedByStorageKey.get(attachment.storageKey);
        if (
          !issued ||
          issued.fileName !== attachment.fileName ||
          issued.mimeType !== attachment.mimeType ||
          issued.size !== attachment.size
        ) {
          return res.status(403).json({
            message: "Upload authorization missing, expired, or belongs to another account. Upload the file again.",
          });
        }
      }

      // -----------------------------------------
      // PREVENT REUSING R2 OBJECTS
      // -----------------------------------------

      const alreadyUsed =
        await GroupMessage.exists({
          groupId,

          "attachments.storageKey": {
            $in:
              attachmentKeys,
          },
        });


      if (alreadyUsed) {
        return res
          .status(409)
          .json({
            message:
              "One or more files have already been attached",
          });
      }


      // -----------------------------------------
      // VERIFY EVERY R2 OBJECT
      // -----------------------------------------

      const verifiedAttachments =
        [];


      for (
        let index = 0;
        index <
        normalizedAttachments.length;
        index += 1
      ) {
        const requested =
          normalizedAttachments[
            index
          ];


        let storedObject;


        try {
          storedObject =
            await getStoredObjectMetadata(
              requested.storageKey
            );
        } catch (
          storageError
        ) {
          const statusCode =
            storageError
              ?.$metadata
              ?.httpStatusCode;


          if (
            statusCode ===
              404 ||
            storageError?.name ===
              "NotFound" ||
            storageError?.name ===
              "NoSuchKey"
          ) {
            return res
              .status(400)
              .json({
                message:
                  `${requested.fileName} was not found in storage`,
              });
          }


          throw storageError;
        }


        // ---------------------------------------
        // ACTUAL SIZE
        // ---------------------------------------

        if (
          !storedObject.size ||
          storedObject.size <=
            0
        ) {
          return res
            .status(400)
            .json({
              message:
                `${requested.fileName} is empty`,
            });
        }


        if (
          storedObject.size >
          MAX_FILE_SIZE
        ) {
          return res
            .status(413)
            .json({
              message:
                `${requested.fileName} exceeds the 25 MB limit`,
            });
        }


        if (
          storedObject.size !==
          requested.size
        ) {
          return res
            .status(400)
            .json({
              message:
                `${requested.fileName} size does not match the selected file`,
            });
        }


        // ---------------------------------------
        // ACTUAL CONTENT TYPE
        // ---------------------------------------

        if (
          !ALLOWED_MIME_TYPES.has(
            storedObject.mimeType
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                `${requested.fileName} has an unsupported stored file type`,
            });
        }


        if (
          storedObject.mimeType !==
          requested.mimeType
        ) {
          return res
            .status(400)
            .json({
              message:
                `${requested.fileName} type does not match the selected file`,
            });
        }


        // ---------------------------------------
        // FINAL METADATA
        // ---------------------------------------

        verifiedAttachments.push({
          storageKey:
            requested.storageKey,

          fileName:
            requested.fileName,

          mimeType:
            storedObject.mimeType,

          size:
            storedObject.size,

          uploadedBy:
            req.user.uid,

          uploadedAt:
            new Date(),
        });
      }


      // -----------------------------------------
      // CREATE ONE GROUP MESSAGE
      // -----------------------------------------

      // Claim every issued object once before creating the group message.
      // Concurrent finalize calls cannot reuse a claimed upload.
      const claimId = crypto.randomUUID();
      const claimQuery = {
        groupId,
        userId: req.user.uid,
        storageKey: { $in: attachmentKeys },
        expiresAt: { $gt: new Date() },
        consumedAt: null,
        claimId: null,
      };
      const claimResult = await GroupAttachmentUpload.updateMany(
        claimQuery,
        { $set: { claimId } }
      );

      if (claimResult.modifiedCount !== attachmentKeys.length) {
        // Release any subset claimed by this request if another request won.
        await GroupAttachmentUpload.updateMany(
          { claimId },
          { $set: { claimId: null } }
        );
        return res.status(409).json({
          message: "One or more uploads have already been finalized or expired.",
        });
      }

      let savedMessage;
      try {
        savedMessage = await GroupMessage.create({
          groupId,

          userId:
            req.user.uid,

          displayName:
            membership.displayName ||
            req.user.name ||
            null,

          picture:
            membership.picture ||
            req.user.picture ||
            null,

          message:
            text ||
            null,

          replyTo,

          attachments:
            verifiedAttachments,

          reactions:
            [],

          isUnsent:
            false,

          unsentAt:
            null,

          deletedFor:
            [],
        });
      } catch (createError) {
        await GroupAttachmentUpload.updateMany(
          { claimId },
          { $set: { claimId: null } }
        );
        throw createError;
      }

      await GroupAttachmentUpload.updateMany(
        { claimId },
        { $set: { consumedAt: new Date(), claimId: null } }
      );


      const outgoingMessage =
        publicGroupMessage(savedMessage);


      // -----------------------------------------
      // REALTIME BROADCAST — ONCE
      // -----------------------------------------

      const io =
        req.app.get(
          "io"
        );


      if (io) {
        io
          .to(
            getGroupRoom(
              groupId
            )
          )
          .emit(
            "group:message:new",
            outgoingMessage
          );
      }


      // -----------------------------------------
      // RESPONSE
      // -----------------------------------------

      return res
        .status(201)
        .json({
          message:
            outgoingMessage,
        });
    } catch (error) {
      if (
        error instanceof
        GroupReplyError
      ) {
        return res
          .status(
            error.statusCode ||
            400
          )
          .json({
            message:
              error.message,
          });
      }

      console.error(
        "FINALIZE ATTACHMENT ERROR:",
        error
      );


      if (
        error.name ===
        "ValidationError"
      ) {
        return res
          .status(400)
          .json({
            message:
              error.message,
          });
      }


      return res
        .status(500)
        .json({
          message:
            "Failed to finalize attachment",
        });
    }
  }
);

// =========================================================
// CREATE PRESIGNED DOWNLOAD URL
//
// GET
// /api/groups/:groupId/messages/:messageId/attachments/download-url
//
// Query:
// ?storageKey=groups/...
// =========================================================

router.get(
  "/:groupId/messages/:messageId/attachments/download-url",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
        messageId,
      } =
        req.params;

      const {
        storageKey,
      } =
        req.query;


      // -----------------------------------------
      // IDS
      // -----------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          groupId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }


      if (
        !mongoose.Types.ObjectId.isValid(
          messageId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid message ID",
          });
      }


      // -----------------------------------------
      // MEMBERSHIP
      // -----------------------------------------

      const membership =
        await getMembership(
          groupId,
          req.user.uid
        );


      if (!membership) {
        return res
          .status(403)
          .json({
            message:
              "You are not a member of this group",
          });
      }


      // -----------------------------------------
      // STORAGE KEY
      // -----------------------------------------

      if (
        typeof storageKey !==
          "string" ||
        !storageKey.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Storage key is required",
          });
      }


      // -----------------------------------------
      // MESSAGE
      // -----------------------------------------

      const message =
        await GroupMessage.findOne({
          _id:
            messageId,

          groupId,

          // Match the existing message-read authorization semantics.
          deletedFor: { $ne: req.user.uid },
        }).lean();


      if (!message) {
        return res
          .status(404)
          .json({
            message:
              "Message not found",
          });
      }


      // -----------------------------------------
      // ATTACHMENT MUST BELONG TO MESSAGE
      // -----------------------------------------

      // -----------------------------------------
      // UNSENT MESSAGE
      // -----------------------------------------

      if (
        message.isUnsent
      ) {
        return res
          .status(404)
          .json({
            message:
              "Attachment not found",
          });
      }

      const attachment =
        (
          message.attachments ||
          []
        ).find(
          (
            item
          ) =>
            item.storageKey ===
            storageKey
        );


      if (!attachment) {
        return res
          .status(404)
          .json({
            message:
              "Attachment not found",
          });
      }


      // -----------------------------------------
      // SIGNED DOWNLOAD URL
      // -----------------------------------------

      const {
        downloadUrl,
        expiresIn,
      } =
        await createDownloadUrl({
          storageKey:
            attachment.storageKey,

          fileName:
            attachment.fileName,
        });


      // -----------------------------------------
      // RESPONSE
      // -----------------------------------------

      return res.json({
        downloadUrl,

        expiresIn,

        attachment: {
          fileName:
            attachment.fileName,

          mimeType:
            attachment.mimeType,

          size:
            attachment.size,
        },
      });
    } catch (error) {
      console.error(
        "CREATE ATTACHMENT DOWNLOAD URL ERROR:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to prepare file download",
        });
    }
  }
);


// =========================================================
// EXPORT
// =========================================================

module.exports =
  router;




