const GroupMember =
  require(
    "../models/social/GroupMember"
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
// REGISTER GROUP TYPING SOCKET
// =========================================

const registerGroupTypingSocket =
  (
    io,
    socket
  ) => {

    /*
      Stores only this socket's
      currently-active typing groups.

      Nothing here is persisted
      to MongoDB.
    */

    const typingGroups =
      new Map();


    // =====================================
    // START TYPING
    // =====================================

    socket.on(
      "group:typing:start",
      async (
        data = {},
        callback
      ) => {
        try {
          const {
            groupId,
          } = data;


          // ---------------------------------
          // VALIDATE GROUP
          // ---------------------------------

          if (!groupId) {
            return callback?.({
              ok: false,

              message:
                "Group ID is required",
            });
          }


          const groupKey =
            String(
              groupId
            );


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
          // MAKE SURE SOCKET IS IN ROOM
          // ---------------------------------

          socket.join(
            getGroupRoom(
              groupKey
            )
          );


          // ---------------------------------
          // ALREADY TYPING
          //
          // Frontend should normally emit
          // start only once, but this prevents
          // duplicate broadcasts anyway.
          // ---------------------------------

          if (
            typingGroups.has(
              groupKey
            )
          ) {
            return callback?.({
              ok: true,
            });
          }


          const typingUser = {
            groupId:
              groupKey,

            userId:
              String(
                socket.user.uid
              ),

            displayName:
              membership.displayName ||
              socket.user.name ||
              "Member",

            picture:
              membership.picture ||
              socket.user.picture ||
              null,
          };


          typingGroups.set(
            groupKey,
            typingUser
          );


          // ---------------------------------
          // DON'T SEND BACK TO TYPER
          // ---------------------------------

          socket
            .to(
              getGroupRoom(
                groupKey
              )
            )
            .emit(
              "group:typing:update",
              {
                ...typingUser,

                isTyping:
                  true,
              }
            );


          callback?.({
            ok: true,
          });
        } catch (error) {
          console.error(
            "GROUP TYPING START SOCKET ERROR:",
            error.message
          );


          if (
            error.name ===
            "CastError"
          ) {
            return callback?.({
              ok: false,

              message:
                "Invalid group ID",
            });
          }


          callback?.({
            ok: false,

            message:
              "Failed to start typing indicator",
          });
        }
      }
    );


    // =====================================
    // STOP TYPING
    // =====================================

    socket.on(
      "group:typing:stop",
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


          const groupKey =
            String(
              groupId
            );


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
          // ALREADY STOPPED
          // ---------------------------------

          if (
            !typingGroups.has(
              groupKey
            )
          ) {
            return callback?.({
              ok: true,
            });
          }


          const existingTypingUser =
            typingGroups.get(
              groupKey
            );


          typingGroups.delete(
            groupKey
          );


          socket
            .to(
              getGroupRoom(
                groupKey
              )
            )
            .emit(
              "group:typing:update",
              {
                groupId:
                  groupKey,

                userId:
                  String(
                    socket.user.uid
                  ),

                displayName:
                  existingTypingUser
                    ?.displayName ||
                  membership.displayName ||
                  socket.user.name ||
                  "Member",

                picture:
                  existingTypingUser
                    ?.picture ||
                  membership.picture ||
                  socket.user.picture ||
                  null,

                isTyping:
                  false,
              }
            );


          callback?.({
            ok: true,
          });
        } catch (error) {
          console.error(
            "GROUP TYPING STOP SOCKET ERROR:",
            error.message
          );


          if (
            error.name ===
            "CastError"
          ) {
            return callback?.({
              ok: false,

              message:
                "Invalid group ID",
            });
          }


          callback?.({
            ok: false,

            message:
              "Failed to stop typing indicator",
          });
        }
      }
    );


    // =====================================
    // DISCONNECT CLEANUP
    //
    // "disconnecting" is intentional.
    // At this point Socket.IO still knows
    // which rooms this socket belongs to.
    // =====================================

    socket.on(
      "disconnecting",
      () => {

        for (
          const [
            groupId,
            typingUser,
          ]
          of typingGroups.entries()
        ) {

          socket
            .to(
              getGroupRoom(
                groupId
              )
            )
            .emit(
              "group:typing:update",
              {
                groupId:
                  String(
                    groupId
                  ),

                userId:
                  String(
                    socket.user.uid
                  ),

                displayName:
                  typingUser
                    ?.displayName ||
                  socket.user.name ||
                  "Member",

                picture:
                  typingUser
                    ?.picture ||
                  socket.user.picture ||
                  null,

                isTyping:
                  false,
              }
            );
        }


        typingGroups.clear();
      }
    );
  };


module.exports =
  registerGroupTypingSocket;