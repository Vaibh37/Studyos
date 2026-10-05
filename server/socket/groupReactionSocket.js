const GroupMember =
  require(
    "../models/social/GroupMember"
  );

const GroupMessage =
  require(
    "../models/social/GroupMessage"
  );


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
// ALLOWED REACTIONS
// =========================================

const ALLOWED_REACTIONS =
  new Set([
    "👍",
    "❤️",
    "😂",
    "🔥",
    "🎉",
    "👀",
  ]);


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
// REGISTER GROUP REACTION SOCKET
// =========================================

const registerGroupReactionSocket =
  (
    io,
    socket
  ) => {

    // =====================================
    // TOGGLE MESSAGE REACTION
    // =====================================

    socket.on(
      "group:message:reaction-toggle",
      async (
        data = {},
        callback
      ) => {
        try {
          const {
            groupId,
            messageId,
            emoji,
          } = data;


          // ---------------------------------
          // REQUIRED VALUES
          // ---------------------------------

          if (
            !groupId ||
            !messageId ||
            !emoji
          ) {
            return callback?.({
              ok: false,

              message:
                "Group ID, message ID and emoji are required",
            });
          }


          const normalizedEmoji =
            String(
              emoji
            ).trim();


          // ---------------------------------
          // REACTION WHITELIST
          // ---------------------------------

          if (
            !ALLOWED_REACTIONS.has(
              normalizedEmoji
            )
          ) {
            return callback?.({
              ok: false,

              message:
                "Unsupported reaction",
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
          // MESSAGE CHECK
          // ---------------------------------

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


          // ---------------------------------
          // NO REACTIONS ON UNSENT MESSAGES
          // ---------------------------------

          if (
            groupMessage.isUnsent
          ) {
            return callback?.({
              ok: false,

              message:
                "You cannot react to an unsent message",
            });
          }


          // ---------------------------------
          // NORMALIZE REACTIONS ARRAY
          // ---------------------------------

          if (
            !Array.isArray(
              groupMessage.reactions
            )
          ) {
            groupMessage.reactions =
              [];
          }


          const currentUserId =
            String(
              socket.user.uid
            );


          // ---------------------------------
          // FIND SAME USER + SAME EMOJI
          // ---------------------------------

          const existingIndex =
            groupMessage.reactions.findIndex(
              (
                reaction
              ) =>
                String(
                  reaction.userId
                ) ===
                  currentUserId &&
                reaction.emoji ===
                  normalizedEmoji
            );


          let action;


          // ---------------------------------
          // REMOVE EXISTING REACTION
          // ---------------------------------

          if (
            existingIndex !==
            -1
          ) {
            groupMessage.reactions.splice(
              existingIndex,
              1
            );

            action =
              "removed";
          }


          // ---------------------------------
          // ADD NEW REACTION
          // ---------------------------------

          else {
            groupMessage.reactions.push({
              emoji:
                normalizedEmoji,

              userId:
                currentUserId,

              displayName:
                membership.displayName ||
                socket.user.name ||
                null,

              picture:
                membership.picture ||
                socket.user.picture ||
                null,

              reactedAt:
                new Date(),
            });

            action =
              "added";
          }


          // ---------------------------------
          // SAVE
          // ---------------------------------

          await groupMessage.save();


          // ---------------------------------
          // ENSURE SOCKET IS IN GROUP ROOM
          // ---------------------------------

          socket.join(
            getGroupRoom(
              groupId
            )
          );


          // ---------------------------------
          // PAYLOAD
          // ---------------------------------

          const update = {
            groupId:
              String(
                groupMessage.groupId
              ),

            messageId:
              String(
                groupMessage._id
              ),

            reactions:
              groupMessage.reactions.map(
                (
                  reaction
                ) => ({
                  emoji:
                    reaction.emoji,

                  userId:
                    reaction.userId,

                  displayName:
                    reaction.displayName ||
                    null,

                  picture:
                    reaction.picture ||
                    null,

                  reactedAt:
                    reaction.reactedAt,
                })
              ),

            action,

            reaction: {
              emoji:
                normalizedEmoji,

              userId:
                currentUserId,
            },
          };


          // ---------------------------------
          // BROADCAST TO EVERYONE
          // ---------------------------------

          io
            .to(
              getGroupRoom(
                groupId
              )
            )
            .emit(
              "group:message:reaction-updated",
              update
            );


          callback?.({
            ok: true,

            update,
          });
        } catch (error) {
          console.error(
            "GROUP MESSAGE REACTION SOCKET ERROR:",
            error.message
          );


          if (
            error.name ===
            "CastError"
          ) {
            return callback?.({
              ok: false,

              message:
                "Invalid group or message ID",
            });
          }


          callback?.({
            ok: false,

            message:
              "Failed to update reaction",
          });
        }
      }
    );
  };


module.exports =
  registerGroupReactionSocket;