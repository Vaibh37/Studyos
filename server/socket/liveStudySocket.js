const GroupMember =
  require(
    "../models/social/GroupMember"
  );

const LiveSession =
  require(
    "../models/social/LiveSession"
  );

const GroupStudySession =
  require(
    "../models/social/GroupStudySession"
  );

const GroupMessage =
  require(
    "../models/social/GroupMessage"
  );
const {
  deleteStoredObject,
} = require(
  "../services/r2Storage"
);

const {
  GroupReplyError,
  buildReplySnapshot,
} = require(
  "../utils/groupMessageReply"
);

const {
  createSocketRateLimiter,
} = require(
  "../utils/socketRateLimiter"
);


// =========================================
// GROUP MESSAGE RATE LIMIT
// =========================================
//
// Burst: 5 messages / 3 seconds
// Sustained: 30 messages / minute
// =========================================

const groupMessageSendLimiter =
  createSocketRateLimiter([
    {
      windowMs:
        3 * 1000,

      max:
        5,
    },
    {
      windowMs:
        60 * 1000,

      max:
        30,
    },
  ]);


// =========================================
// ROOM NAME
// =========================================

const getGroupRoom =
  (
    groupId
  ) => {
    return `group:${groupId}`;
  };


// =========================================
// SEND LIVE USERS
// =========================================

const emitLiveUsers =
  async (
    io,
    groupId
  ) => {
    const liveSessions =
      await LiveSession.find({
        groupId,
      })
        .sort({
          startedAt: 1,
        })
        .lean();

    io
      .to(
        getGroupRoom(
          groupId
        )
      )
      .emit(
        "focus:live-users",
        liveSessions
      );
  };


// =========================================
// MEMBER CHECK
// =========================================

const getMembership =
  async (
    groupId,
    userId
  ) => {
    return GroupMember.findOne({
      groupId,
      userId,
    });
  };


// =========================================
// REGISTER LIVE STUDY EVENTS
// =========================================

const registerLiveStudySocket =
  (
    io,
    socket
  ) => {


    // =====================================
    // JOIN GROUP ROOM
    // =====================================

    socket.on(
      "group:join",
      async (
        data = {},
        callback
      ) => {
        try {
          const {
            groupId,
          } = data;

          if (!groupId) {
            return callback?.({
              ok: false,

              message:
                "Group ID is required",
            });
          }

          const membership =
            await getMembership(
              groupId,
              socket.user.uid
            );

          if (!membership) {
            return callback?.({
              ok: false,

              message:
                "You are not a member of this group",
            });
          }

          socket.join(
            getGroupRoom(
              groupId
            )
          );

          const liveSessions =
            await LiveSession.find({
              groupId,
            })
              .sort({
                startedAt: 1,
              })
              .lean();

          socket.emit(
            "focus:live-users",
            liveSessions
          );

          callback?.({
            ok: true,
          });
        } catch (error) {
          console.error(
            "GROUP JOIN SOCKET ERROR:",
            error.message
          );

          callback?.({
            ok: false,

            message:
              "Failed to join group room",
          });
        }
      }
    );


    // =====================================
    // SEND GROUP CHAT MESSAGE
    // =====================================

    socket.on(
      "group:message:send",
      async (
        data = {},
        callback
      ) => {
        try {
          const rateLimitResult =
            groupMessageSendLimiter(
              socket.user.uid
            );

          if (
            !rateLimitResult.allowed
          ) {
            return callback?.({
              ok: false,

              message:
                "You are sending messages too quickly. Please wait a moment.",

              retryAfterMs:
                rateLimitResult.retryAfterMs,
            });
          }

          const {
            groupId,
            message,
            replyToMessageId,
          } = data;

          if (!groupId) {
            return callback?.({
              ok: false,

              message:
                "Group ID is required",
            });
          }

          if (
            typeof message !==
              "string" ||
            !message.trim()
          ) {
            return callback?.({
              ok: false,

              message:
                "Message cannot be empty",
            });
          }

          const text =
            message.trim();

          if (
            text.length >
            2000
          ) {
            return callback?.({
              ok: false,

              message:
                "Message must be 2000 characters or less",
            });
          }

          const membership =
            await getMembership(
              groupId,
              socket.user.uid
            );

          if (!membership) {
            return callback?.({
              ok: false,

              message:
                "You are not a member of this group",
            });
          }

          const replyTo =
            await buildReplySnapshot({
              groupId,

              userId:
                socket.user.uid,

              replyToMessageId,
            });

          const savedMessage =
            await GroupMessage.create({
              groupId,

              userId:
                socket.user.uid,

              displayName:
                membership.displayName ||
                socket.user.name ||
                null,

              picture:
                membership.picture ||
                socket.user.picture ||
                null,

              message:
                text,

              replyTo,

              isUnsent:
                false,

              unsentAt:
                null,

              deletedFor:
                [],
            });

          socket.join(
            getGroupRoom(
              groupId
            )
          );

          const outgoingMessage =
            savedMessage.toObject();

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

          callback?.({
            ok: true,

            message:
              outgoingMessage,
          });
        } catch (error) {
          if (
            error instanceof
            GroupReplyError
          ) {
            return callback?.({
              ok: false,

              message:
                error.message,
            });
          }

          console.error(
            "GROUP MESSAGE SEND SOCKET ERROR:",
            error.message
          );

          callback?.({
            ok: false,

            message:
              "Failed to send group message",
          });
        }
      }
    );


    // =====================================
    // UNSEND MESSAGE FOR EVERYONE
    //
    // Only the original sender can do this.
    //
    // Text is removed.
    // Reactions are removed.
    // Attachment objects are deleted from R2.
    // Attachment metadata is removed after
    // successful R2 cleanup.
    // =====================================

    socket.on(
      "group:message:unsend",
      async (
        data = {},
        callback
      ) => {
        try {
          const {
            groupId,
            messageId,
          } = data;


          if (
            !groupId ||
            !messageId
          ) {
            return callback?.({
              ok: false,

              message:
                "Group ID and message ID are required",
            });
          }


          const membership =
            await getMembership(
              groupId,
              socket.user.uid
            );


          if (!membership) {
            return callback?.({
              ok: false,

              message:
                "You are not a member of this group",
            });
          }


          const groupMessage =
            await GroupMessage.findOne({
              _id:
                messageId,

              groupId,
            });


          if (!groupMessage) {
            return callback?.({
              ok: false,

              message:
                "Message not found",
            });
          }


          if (
            String(
              groupMessage.userId
            ) !==
            String(
              socket.user.uid
            )
          ) {
            return callback?.({
              ok: false,

              message:
                "You can only unsend your own messages",
            });
          }


          // ---------------------------------
          // CLEAN ATTACHMENTS FROM R2
          //
          // Failed deletions stay in Mongo so
          // another unsend attempt can retry.
          // ---------------------------------

          const cleanupAttachments =
            async () => {
              const attachments =
                Array.isArray(
                  groupMessage.attachments
                )
                  ? [
                      ...groupMessage.attachments,
                    ]
                  : [];


              if (
                attachments.length ===
                0
              ) {
                return;
              }


              const failedAttachments =
                [];


              for (
                const attachment
                of attachments
              ) {
                const storageKey =
                  attachment?.storageKey;


                if (
                  !storageKey
                ) {
                  continue;
                }


                try {
                  await deleteStoredObject(
                    storageKey
                  );
                } catch (
                  deleteError
                ) {
                  console.error(
                    "R2 ATTACHMENT DELETE ERROR:",
                    deleteError.message
                  );


                  failedAttachments.push(
                    typeof attachment.toObject ===
                      "function"
                      ? attachment.toObject()
                      : attachment
                  );
                }
              }


              groupMessage.attachments =
                failedAttachments;


              await groupMessage.save();
            };


          const scrubReplySnapshots =
            async () => {
              await GroupMessage.updateMany(
                {
                  groupId,

                  "replyTo.messageId":
                    groupMessage._id,
                },
                {
                  $set: {
                    "replyTo.message":
                      null,

                    "replyTo.attachmentCount":
                      0,

                    "replyTo.firstAttachmentName":
                      null,
                  },
                }
              );
            };


          // ---------------------------------
          // ALREADY UNSENT
          //
          // Keep this idempotent.
          // Also retry any attachment cleanup
          // that previously failed.
          // ---------------------------------

          if (
            groupMessage.isUnsent
          ) {
            groupMessage.message =
              null;

            groupMessage.reactions =
              [];


            await groupMessage.save();


            await cleanupAttachments();


            await scrubReplySnapshots();


            const existingMessage = {
              ...groupMessage.toObject(),

              attachments:
                [],

              reactions:
                [],
            };


            return callback?.({
              ok: true,

              message:
                existingMessage,
            });
          }


          // ---------------------------------
          // MARK MESSAGE UNSENT FIRST
          //
          // Attachments remain temporarily in
          // Mongo so cleanup can be retried if
          // R2 ever fails.
          // ---------------------------------

          groupMessage.message =
            null;

          groupMessage.reactions =
            [];

          groupMessage.isUnsent =
            true;

          groupMessage.unsentAt =
            new Date();


          await groupMessage.save();


          // ---------------------------------
          // DELETE R2 OBJECTS
          // ---------------------------------

          await cleanupAttachments();


          await scrubReplySnapshots();


          // ---------------------------------
          // CLIENTS SHOULD NEVER RECEIVE
          // ATTACHMENTS FROM AN UNSENT MESSAGE
          // ---------------------------------

          const outgoingMessage = {
            ...groupMessage.toObject(),

            attachments:
              [],

            reactions:
              [],
          };


          // ---------------------------------
          // BROADCAST UNSENT MESSAGE
          // ---------------------------------

          io
            .to(
              getGroupRoom(
                groupId
              )
            )
            .emit(
              "group:message:unsent",
              outgoingMessage
            );


          callback?.({
            ok: true,

            message:
              outgoingMessage,
          });
        } catch (
          error
        ) {
          console.error(
            "GROUP MESSAGE UNSEND SOCKET ERROR:",
            error.message
          );


          if (
            error.name ===
            "CastError"
          ) {
            return callback?.({
              ok: false,

              message:
                "Invalid message or group ID",
            });
          }


          callback?.({
            ok: false,

            message:
              "Failed to unsend message",
          });
        }
      }
    );

    // =====================================
    // DELETE MESSAGE FOR ME
    // =====================================

    socket.on(
      "group:message:delete-for-me",
      async (
        data = {},
        callback
      ) => {
        try {
          const {
            groupId,
            messageId,
          } = data;

          if (
            !groupId ||
            !messageId
          ) {
            return callback?.({
              ok: false,

              message:
                "Group ID and message ID are required",
            });
          }

          const membership =
            await getMembership(
              groupId,
              socket.user.uid
            );

          if (!membership) {
            return callback?.({
              ok: false,

              message:
                "You are not a member of this group",
            });
          }

          const groupMessage =
            await GroupMessage
              .findOneAndUpdate(
                {
                  _id:
                    messageId,

                  groupId,
                },
                {
                  $addToSet: {
                    deletedFor:
                      socket.user.uid,
                  },
                },
                {
                  new:
                    true,
                }
              );

          if (!groupMessage) {
            return callback?.({
              ok: false,

              message:
                "Message not found",
            });
          }


          // ---------------------------------
          // PRIVATE ACTION.
          // DO NOT BROADCAST.
          // ---------------------------------

          callback?.({
            ok: true,

            messageId:
              String(
                groupMessage._id
              ),

            groupId:
              String(
                groupMessage.groupId
              ),
          });
        } catch (error) {
          console.error(
            "GROUP MESSAGE DELETE FOR ME SOCKET ERROR:",
            error.message
          );

          if (
            error.name ===
            "CastError"
          ) {
            return callback?.({
              ok: false,

              message:
                "Invalid message or group ID",
            });
          }

          callback?.({
            ok: false,

            message:
              "Failed to delete message",
          });
        }
      }
    );


    // =====================================
    // MARK MESSAGE AS READ
    //
    // The member stores only their newest
    // read message instead of one receipt
    // document per message.
    // =====================================

    socket.on(
      "group:message:read",
      async (
        data = {},
        callback
      ) => {
        try {
          const {
            groupId,
            messageId,
          } = data;


          // ---------------------------------
          // BASIC VALIDATION
          // ---------------------------------

          if (
            !groupId ||
            !messageId
          ) {
            return callback?.({
              ok: false,

              message:
                "Group ID and message ID are required",
            });
          }


          // ---------------------------------
          // MEMBERSHIP CHECK
          // ---------------------------------

          const membership =
            await getMembership(
              groupId,
              socket.user.uid
            );

          if (!membership) {
            return callback?.({
              ok: false,

              message:
                "You are not a member of this group",
            });
          }


          // ---------------------------------
          // MESSAGE MUST EXIST IN SAME GROUP
          // ---------------------------------

          const groupMessage =
            await GroupMessage
              .findOne({
                _id:
                  messageId,

                groupId,
              })
              .select({
                _id: 1,

                groupId: 1,

                createdAt: 1,
              })
              .lean();

          if (!groupMessage) {
            return callback?.({
              ok: false,

              message:
                "Message not found",
            });
          }


          // ---------------------------------
          // NEVER MOVE RECEIPT BACKWARDS
          // ---------------------------------

          if (
            membership.lastReadMessageId &&
            String(
              membership.lastReadMessageId
            ) !==
            String(
              groupMessage._id
            )
          ) {
            const previousReadMessage =
              await GroupMessage
                .findOne({
                  _id:
                    membership
                      .lastReadMessageId,

                  groupId,
                })
                .select({
                  _id: 1,

                  createdAt: 1,
                })
                .lean();


            if (
              previousReadMessage &&
              new Date(
                previousReadMessage
                  .createdAt
              ).getTime() >
              new Date(
                groupMessage
                  .createdAt
              ).getTime()
            ) {
              return callback?.({
                ok: true,

                receipt: {
                  groupId:
                    String(
                      groupId
                    ),

                  userId:
                    String(
                      socket.user.uid
                    ),

                  displayName:
                    membership
                      .displayName ||
                    socket.user.name ||
                    null,

                  picture:
                    membership.picture ||
                    socket.user.picture ||
                    null,

                  messageId:
                    String(
                      membership
                        .lastReadMessageId
                    ),

                  readAt:
                    membership
                      .lastReadAt ||
                    null,
                },
              });
            }
          }


          // ---------------------------------
          // SAME MESSAGE ALREADY READ
          //
          // Do not keep rewriting readAt when
          // scroll events repeatedly fire.
          // ---------------------------------

          if (
            membership.lastReadMessageId &&
            String(
              membership.lastReadMessageId
            ) ===
            String(
              groupMessage._id
            )
          ) {
            return callback?.({
              ok: true,

              receipt: {
                groupId:
                  String(
                    groupId
                  ),

                userId:
                  String(
                    socket.user.uid
                  ),

                displayName:
                  membership
                    .displayName ||
                  socket.user.name ||
                  null,

                picture:
                  membership.picture ||
                  socket.user.picture ||
                  null,

                messageId:
                  String(
                    groupMessage._id
                  ),

                readAt:
                  membership
                    .lastReadAt ||
                  null,
              },
            });
          }


          // ---------------------------------
          // ADVANCE READ POSITION
          // ---------------------------------

          const readAt =
            new Date();

          membership.lastReadMessageId =
            groupMessage._id;

          membership.lastReadAt =
            readAt;

          await membership.save();


          socket.join(
            getGroupRoom(
              groupId
            )
          );


          const receipt = {
            groupId:
              String(
                groupId
              ),

            userId:
              String(
                socket.user.uid
              ),

            displayName:
              membership.displayName ||
              socket.user.name ||
              null,

            picture:
              membership.picture ||
              socket.user.picture ||
              null,

            messageId:
              String(
                groupMessage._id
              ),

            readAt,
          };


          // ---------------------------------
          // REALTIME RECEIPT
          // ---------------------------------

          io
            .to(
              getGroupRoom(
                groupId
              )
            )
            .emit(
              "group:message:read-updated",
              receipt
            );


          callback?.({
            ok: true,

            receipt,
          });
        } catch (error) {
          console.error(
            "GROUP MESSAGE READ SOCKET ERROR:",
            error.message
          );

          if (
            error.name ===
            "CastError"
          ) {
            return callback?.({
              ok: false,

              message:
                "Invalid message or group ID",
            });
          }

          callback?.({
            ok: false,

            message:
              "Failed to update read receipt",
          });
        }
      }
    );


    // =====================================
    // START LIVE STUDY SESSION
    // =====================================

    socket.on(
      "focus:start",
      async (
        data = {},
        callback
      ) => {
        try {
          const {
            groupId,

            subjectId =
              null,

            subjectName =
              "General Study",
          } = data;

          if (!groupId) {
            return callback?.({
              ok: false,

              message:
                "Group ID is required",
            });
          }

          const membership =
            await getMembership(
              groupId,
              socket.user.uid
            );

          if (!membership) {
            return callback?.({
              ok: false,

              message:
                "You are not a member of this group",
            });
          }

          const previousSession =
            await LiveSession.findOne({
              userId:
                socket.user.uid,
            });

          const previousGroupId =
            previousSession
              ?.groupId
              ?.toString();

          const liveSession =
            await LiveSession
              .findOneAndUpdate(
                {
                  userId:
                    socket.user.uid,
                },
                {
                  userId:
                    socket.user.uid,

                  groupId,

                  displayName:
                    socket.user.name,

                  picture:
                    socket.user.picture,

                  subjectId,

                  subjectName:
                    subjectName ||
                    "General Study",

                  startedAt:
                    new Date(),

                  lastSeenAt:
                    new Date(),
                },
                {
                  new:
                    true,

                  upsert:
                    true,

                  runValidators:
                    true,
                }
              );

          socket.join(
            getGroupRoom(
              groupId
            )
          );

          if (
            previousGroupId &&
            previousGroupId !==
              String(
                groupId
              )
          ) {
            await emitLiveUsers(
              io,
              previousGroupId
            );
          }

          await emitLiveUsers(
            io,
            groupId
          );

          callback?.({
            ok: true,

            liveSession,
          });
        } catch (error) {
          console.error(
            "FOCUS START SOCKET ERROR:",
            error.message
          );

          callback?.({
            ok: false,

            message:
              "Failed to start live study session",
          });
        }
      }
    );


    // =====================================
    // HEARTBEAT
    // =====================================

    socket.on(
      "focus:heartbeat",
      async () => {
        try {
          await LiveSession
            .findOneAndUpdate(
              {
                userId:
                  socket.user.uid,
              },
              {
                lastSeenAt:
                  new Date(),
              }
            );
        } catch (error) {
          console.error(
            "FOCUS HEARTBEAT ERROR:",
            error.message
          );
        }
      }
    );


    // =====================================
    // STOP LIVE STUDY SESSION
    // =====================================

    socket.on(
      "focus:stop",
      async (
        data = {},
        callback
      ) => {


        // ---------------------------------
        // BACKWARD COMPATIBILITY
        //
        // Old:
        //
        // socket.emit(
        //   "focus:stop",
        //   callback
        // )
        // ---------------------------------

        if (
          typeof data ===
          "function"
        ) {
          callback =
            data;

          data =
            {};
        }


        try {
          const liveSession =
            await LiveSession.findOne({
              userId:
                socket.user.uid,
            });

          if (!liveSession) {
            return callback?.({
              ok: false,

              message:
                "No active live study session",
            });
          }


          const endedAt =
            new Date();

          const startedAt =
            new Date(
              liveSession.startedAt
            );


          // ---------------------------------
          // MAX POSSIBLE WALL DURATION
          // ---------------------------------

          const wallDurationSeconds =
            Math.max(
              1,

              Math.floor(
                (
                  endedAt.getTime() -
                  startedAt.getTime()
                ) /
                  1000
              )
            );


          // ---------------------------------
          // ACTUAL FOCUSED TIME
          // ---------------------------------

          const requestedDuration =
            Number(
              data?.durationSeconds
            );

          const hasValidDuration =
            Number.isFinite(
              requestedDuration
            ) &&
            requestedDuration >=
              1;

          const durationSeconds =
            hasValidDuration
              ? Math.min(
                  Math.floor(
                    requestedDuration
                  ),

                  wallDurationSeconds
                )
              : null;


          // ---------------------------------
          // SAVE GROUP STUDY HISTORY
          // ---------------------------------

          if (
            durationSeconds
          ) {
            try {
              await GroupStudySession
                .create({
                  liveSessionId:
                    liveSession._id,

                  groupId:
                    liveSession.groupId,

                  userId:
                    liveSession.userId,

                  displayName:
                    liveSession
                      .displayName,

                  picture:
                    liveSession.picture,

                  subjectId:
                    liveSession.subjectId,

                  subjectName:
                    liveSession
                      .subjectName ||
                    "General Study",

                  startedAt:
                    liveSession.startedAt,

                  endedAt,

                  durationSeconds,
                });
            } catch (
              recordError
            ) {
              if (
                recordError.code !==
                11000
              ) {
                throw recordError;
              }
            }
          }


          // ---------------------------------
          // REMOVE LIVE PRESENCE
          // ---------------------------------

          await LiveSession.deleteOne({
            _id:
              liveSession._id,
          });


          const groupId =
            liveSession
              .groupId
              .toString();


          // ---------------------------------
          // UPDATE LIVE USERS
          // ---------------------------------

          await emitLiveUsers(
            io,
            groupId
          );


          // ---------------------------------
          // UPDATE LEADERBOARD
          // ---------------------------------

          if (
            durationSeconds
          ) {
            io
              .to(
                getGroupRoom(
                  groupId
                )
              )
              .emit(
                "group:leaderboard-updated",
                {
                  groupId,
                }
              );
          }


          callback?.({
            ok: true,

            recorded:
              Boolean(
                durationSeconds
              ),

            durationSeconds:
              durationSeconds ||
              0,
          });
        } catch (error) {
          console.error(
            "FOCUS STOP SOCKET ERROR:",
            error.message
          );

          callback?.({
            ok: false,

            message:
              "Failed to stop live study session",
          });
        }
      }
    );
  };


module.exports =
  registerLiveStudySocket;




