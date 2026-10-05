import {
  useCallback,
  useEffect,
} from "react";

import {
  connectSocket,
} from "../socket";


// =========================================================
// APPLY REACTION UPDATE TO MESSAGE ARRAY
// =========================================================

const applyReactionUpdate =
  (
    messages,
    update
  ) => {
    if (
      !Array.isArray(
        messages
      ) ||
      !update?.messageId
    ) {
      return messages;
    }


    const messageId =
      String(
        update.messageId
      );


    return messages.map(
      (
        message
      ) => {
        if (
          String(
            message?._id
          ) !==
          messageId
        ) {
          return message;
        }


        return {
          ...message,

          reactions:
            Array.isArray(
              update.reactions
            )
              ? update.reactions
              : [],
        };
      }
    );
  };


// =========================================================
// HOOK
// =========================================================

function useGroupReactions({
  selectedGroupId,
  setMessages,
  isGuest = false,
}) {

  // =======================================================
  // RECEIVE REALTIME REACTION UPDATES
  // =======================================================

  useEffect(
    () => {
      if (
        isGuest
      ) {
        return undefined;
      }


      let active =
        true;

      let connectedSocket =
        null;


      const handleReactionUpdate =
        (
          update = {}
        ) => {
          if (
            !active ||
            !update?.groupId ||
            !update?.messageId
          ) {
            return;
          }


          const updateGroupId =
            String(
              update.groupId
            );


          const currentGroupId =
            String(
              selectedGroupId ||
              ""
            );


          // ---------------------------------
          // ONLY MODIFY CURRENT OPEN CHAT
          // ---------------------------------

          if (
            updateGroupId !==
            currentGroupId
          ) {
            return;
          }


          setMessages(
            (
              current
            ) =>
              applyReactionUpdate(
                current,
                update
              )
          );
        };


      const connect =
        async () => {
          try {
            const socket =
              await connectSocket();


            if (
              !active
            ) {
              return;
            }


            connectedSocket =
              socket;


            socket.on(
              "group:message:reaction-updated",
              handleReactionUpdate
            );
          } catch (
            error
          ) {
            console.error(
              "Reaction socket failed:",
              error
            );
          }
        };


      connect();


      return () => {
        active =
          false;


        if (
          connectedSocket
        ) {
          connectedSocket.off(
            "group:message:reaction-updated",
            handleReactionUpdate
          );
        }
      };
    },
    [
      selectedGroupId,
      isGuest,
      setMessages,
    ]
  );


  // =======================================================
  // TOGGLE REACTION
  // =======================================================

  const toggleReaction =
    useCallback(
      async (
        messageId,
        emoji
      ) => {
        const groupId =
          String(
            selectedGroupId ||
            ""
          );


        if (
          !groupId ||
          !messageId ||
          !emoji ||
          isGuest
        ) {
          return {
            ok:
              false,
          };
        }


        try {
          const socket =
            await connectSocket();


          return await new Promise(
            (
              resolve
            ) => {
              socket.emit(
                "group:message:reaction-toggle",
                {
                  groupId,

                  messageId:
                    String(
                      messageId
                    ),

                  emoji,
                },
                (
                  response
                ) => {

                  if (
                    response?.ok &&
                    response?.update
                  ) {

                    // -------------------------
                    // APPLY ACK IMMEDIATELY
                    //
                    // Server also broadcasts the
                    // same state. Replacing the
                    // reactions array makes the
                    // duplicate event harmless.
                    // -------------------------

                    setMessages(
                      (
                        current
                      ) =>
                        applyReactionUpdate(
                          current,
                          response.update
                        )
                    );
                  }


                  resolve(
                    response || {
                      ok:
                        false,

                      message:
                        "No response from server",
                    }
                  );
                }
              );
            }
          );
        } catch (
          error
        ) {
          console.error(
            "Toggle reaction failed:",
            error
          );


          return {
            ok:
              false,

            message:
              "Couldn't update reaction",
          };
        }
      },
      [
        selectedGroupId,
        isGuest,
        setMessages,
      ]
    );


  // =======================================================
  // PUBLIC API
  // =======================================================

  return {
    toggleReaction,
  };
}


export default useGroupReactions;