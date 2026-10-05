import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  connectSocket,
} from "../socket";


// =========================================
// SETTINGS
// =========================================

const TYPING_IDLE_MS =
  2200;


// =========================================
// LABEL
// =========================================

const buildTypingLabel =
  (
    users
  ) => {
    if (
      !Array.isArray(
        users
      ) ||
      users.length ===
        0
    ) {
      return "";
    }


    const names =
      users
        .map(
          (
            user
          ) =>
            String(
              user?.displayName ||
                "Member"
            ).trim()
        )
        .filter(
          Boolean
        );


    if (
      names.length ===
      0
    ) {
      return "";
    }


    if (
      names.length ===
      1
    ) {
      return `${names[0]} is typing`;
    }


    if (
      names.length ===
      2
    ) {
      return `${names[0]} and ${names[1]} are typing`;
    }


    const others =
      names.length -
      2;


    return `${names[0]}, ${names[1]} and ${others} ${
      others ===
      1
        ? "other"
        : "others"
    } are typing`;
  };


// =========================================
// HOOK
// =========================================

function useGroupTyping({
  selectedGroupId,
  currentUserId,
  isGuest = false,
}) {

  // =======================================
  // STATE
  // =======================================

  const [
    typingByGroup,
    setTypingByGroup,
  ] = useState({});


  // =======================================
  // REFS
  // =======================================

  const selectedGroupIdRef =
    useRef(
      selectedGroupId ||
        ""
    );

  const currentUserIdRef =
    useRef(
      currentUserId ||
        ""
    );

  const localTypingGroupRef =
    useRef("");

  const stopTimerRef =
    useRef(null);

  const mountedRef =
    useRef(true);


  // =======================================
  // KEEP REFS CURRENT
  // =======================================

  useEffect(
    () => {
      selectedGroupIdRef.current =
        selectedGroupId ||
        "";
    },
    [
      selectedGroupId,
    ]
  );


  useEffect(
    () => {
      currentUserIdRef.current =
        currentUserId ||
        "";
    },
    [
      currentUserId,
    ]
  );


  // =======================================
  // CLEAR STOP TIMER
  // =======================================

  const clearStopTimer =
    () => {
      if (
        stopTimerRef.current
      ) {
        window.clearTimeout(
          stopTimerRef.current
        );

        stopTimerRef.current =
          null;
      }
    };


  // =======================================
  // EMIT STOP
  // =======================================

  const stopTyping =
    async (
      groupIdOverride =
        null
    ) => {

      clearStopTimer();


      const groupId =
        String(
          groupIdOverride ||
          localTypingGroupRef.current ||
          ""
        );


      if (
        !groupId ||
        isGuest
      ) {
        localTypingGroupRef.current =
          "";

        return;
      }


      localTypingGroupRef.current =
        "";


      try {
        const socket =
          await connectSocket();


        socket.emit(
          "group:typing:stop",
          {
            groupId,
          }
        );
      } catch (
        error
      ) {
        console.error(
          "Stop typing failed:",
          error
        );
      }
    };


  // =======================================
  // START / CONTINUE TYPING
  // =======================================

  const startTyping =
    async () => {

      const groupId =
        String(
          selectedGroupIdRef.current ||
          ""
        );


      if (
        !groupId ||
        isGuest
      ) {
        return;
      }


      clearStopTimer();


      // -----------------------------------
      // FIRST KEYSTROKE
      // -----------------------------------

      if (
        localTypingGroupRef.current !==
        groupId
      ) {

        const previousGroupId =
          localTypingGroupRef.current;


        if (
          previousGroupId &&
          previousGroupId !==
            groupId
        ) {
          try {
            const socket =
              await connectSocket();


            socket.emit(
              "group:typing:stop",
              {
                groupId:
                  previousGroupId,
              }
            );
          } catch (
            error
          ) {
            console.error(
              "Previous typing stop failed:",
              error
            );
          }
        }


        localTypingGroupRef.current =
          groupId;


        try {
          const socket =
            await connectSocket();


          socket.emit(
            "group:typing:start",
            {
              groupId,
            }
          );
        } catch (
          error
        ) {
          localTypingGroupRef.current =
            "";

          console.error(
            "Start typing failed:",
            error
          );

          return;
        }
      }


      // -----------------------------------
      // AUTO STOP AFTER INACTIVITY
      // -----------------------------------

      stopTimerRef.current =
        window.setTimeout(
          () => {
            stopTyping(
              groupId
            );
          },
          TYPING_IDLE_MS
        );
    };


  // =======================================
  // INPUT CHANGE
  // =======================================

  const handleTypingChange =
    (
      value
    ) => {

      const text =
        String(
          value ||
          ""
        );


      if (
        !text.trim()
      ) {
        stopTyping();

        return;
      }


      startTyping();
    };


  // =======================================
  // RECEIVE TYPING UPDATES
  // =======================================

  useEffect(
    () => {
      if (
        isGuest
      ) {
        setTypingByGroup(
          {}
        );

        return undefined;
      }


      let active =
        true;

      let connectedSocket =
        null;


      const handleTypingUpdate =
        (
          payload = {}
        ) => {
          if (
            !active ||
            !payload?.groupId ||
            !payload?.userId
          ) {
            return;
          }


          const groupId =
            String(
              payload.groupId
            );

          const userId =
            String(
              payload.userId
            );


          // ---------------------------------
          // NEVER SHOW YOURSELF
          // ---------------------------------

          if (
            userId ===
            String(
              currentUserIdRef.current ||
              ""
            )
          ) {
            return;
          }


          setTypingByGroup(
            (
              current
            ) => {

              const currentGroup =
                current[
                  groupId
                ] ||
                {};


              // -----------------------------
              // START
              // -----------------------------

              if (
                payload.isTyping
              ) {
                return {
                  ...current,

                  [
                    groupId
                  ]: {
                    ...currentGroup,

                    [
                      userId
                    ]: {
                      groupId,

                      userId,

                      displayName:
                        payload.displayName ||
                        "Member",

                      picture:
                        payload.picture ||
                        null,
                    },
                  },
                };
              }


              // -----------------------------
              // STOP
              // -----------------------------

              if (
                !currentGroup[
                  userId
                ]
              ) {
                return current;
              }


              const nextGroup = {
                ...currentGroup,
              };


              delete nextGroup[
                userId
              ];


              const next = {
                ...current,
              };


              if (
                Object.keys(
                  nextGroup
                ).length ===
                0
              ) {
                delete next[
                  groupId
                ];
              } else {
                next[
                  groupId
                ] =
                  nextGroup;
              }


              return next;
            }
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
              "group:typing:update",
              handleTypingUpdate
            );
          } catch (
            error
          ) {
            console.error(
              "Typing socket failed:",
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
            "group:typing:update",
            handleTypingUpdate
          );
        }
      };
    },
    [
      isGuest,
    ]
  );


  // =======================================
  // STOP WHEN GROUP CHANGES
  // =======================================

  useEffect(
    () => {
      const activeTypingGroup =
        localTypingGroupRef.current;


      if (
        activeTypingGroup &&
        activeTypingGroup !==
          String(
            selectedGroupId ||
            ""
          )
      ) {
        stopTyping(
          activeTypingGroup
        );
      }
    },
    [
      selectedGroupId,
    ]
  );


  // =======================================
  // STOP WHEN TAB HIDES
  // =======================================

  useEffect(
    () => {
      const handleVisibility =
        () => {
          if (
            document.visibilityState !==
            "visible"
          ) {
            stopTyping();
          }
        };


      document.addEventListener(
        "visibilitychange",
        handleVisibility
      );


      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibility
        );
      };
    },
    []
  );


  // =======================================
  // UNMOUNT CLEANUP
  // =======================================

  useEffect(
    () => {
      mountedRef.current =
        true;


      return () => {
        mountedRef.current =
          false;

        clearStopTimer();


        const groupId =
          localTypingGroupRef.current;


        if (
          groupId &&
          !isGuest
        ) {
          connectSocket()
            .then(
              (
                socket
              ) => {
                socket.emit(
                  "group:typing:stop",
                  {
                    groupId,
                  }
                );
              }
            )
            .catch(
              () => {}
            );
        }


        localTypingGroupRef.current =
          "";
      };
    },
    [
      isGuest,
    ]
  );


  // =======================================
  // CURRENT GROUP TYPERS
  // =======================================

  const typingUsers =
    useMemo(
      () => {
        const groupId =
          String(
            selectedGroupId ||
            ""
          );


        if (
          !groupId
        ) {
          return [];
        }


        return Object.values(
          typingByGroup[
            groupId
          ] ||
            {}
        );
      },
      [
        typingByGroup,
        selectedGroupId,
      ]
    );


  // =======================================
  // LABEL
  // =======================================

  const typingLabel =
    useMemo(
      () =>
        buildTypingLabel(
          typingUsers
        ),
      [
        typingUsers,
      ]
    );


  // =======================================
  // PUBLIC API
  // =======================================

  return {
    typingUsers,

    typingLabel,

    isSomeoneTyping:
      typingUsers.length >
      0,

    handleTypingChange,

    stopTyping,
  };
}


export default useGroupTyping;