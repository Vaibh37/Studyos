import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowDown,
  ChevronLeft,
  Ellipsis,
  Maximize2,
  MessageCircle,
  Minimize2,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
  Undo2,
  UsersRound,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router";

import {
  useAuth,
} from "../context/AuthContext";

import apiRequest from "../services/api";

import {
  uploadGroupAttachment,
} from "../services/groupAttachmentData";

import ChatAttachmentButton from "../components/chat/ChatAttachmentButton";

import ChatAttachmentCard from "../components/chat/ChatAttachmentCard";

import {
  connectSocket,
} from "../socket";

import useGroupTyping from "../hooks/useGroupTyping";

import useGroupReactions from "../hooks/useGroupReactions";

import "../styles/chats.css";


// =========================================================
// HELPERS
// =========================================================

const getInitial = (value) => {
  const text = String(
    value || "S"
  ).trim();

  return (
    text
      .charAt(0)
      .toUpperCase() || "S"
  );
};


const formatMessageTime = (value) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};


const formatDayLabel = (value) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const today =
    new Date();

  const yesterday =
    new Date();

  yesterday.setDate(
    today.getDate() - 1
  );

  const sameDay = (
    first,
    second
  ) =>
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate();

  if (
    sameDay(
      date,
      today
    )
  ) {
    return "Today";
  }

  if (
    sameDay(
      date,
      yesterday
    )
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",

      year:
        date.getFullYear() ===
        today.getFullYear()
          ? undefined
          : "numeric",
    }
  );
};


const isSameMessageDay = (
  first,
  second
) => {
  if (
    !first ||
    !second
  ) {
    return false;
  }

  const firstDate =
    new Date(first);

  const secondDate =
    new Date(second);

  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
};


const shouldShowSender = (
  current,
  previous
) => {
  if (!previous) {
    return true;
  }

  if (
    String(
      current.userId
    ) !==
    String(
      previous.userId
    )
  ) {
    return true;
  }

  if (
    current.isUnsent ||
    previous.isUnsent
  ) {
    return true;
  }

  const currentTime =
    new Date(
      current.createdAt
    ).getTime();

  const previousTime =
    new Date(
      previous.createdAt
    ).getTime();

  if (
    !Number.isFinite(
      currentTime
    ) ||
    !Number.isFinite(
      previousTime
    )
  ) {
    return true;
  }

  return (
    currentTime -
      previousTime >
    5 * 60 * 1000
  );
};


const mergeMessages = (
  current,
  incoming
) => {
  const byId =
    new Map();

  for (
    const message
    of [
      ...current,
      ...incoming,
    ]
  ) {
    if (
      !message?._id
    ) {
      continue;
    }

    byId.set(
      String(
        message._id
      ),
      message
    );
  }

  return [
    ...byId.values(),
  ]
    .sort(
      (
        first,
        second
      ) =>
        new Date(
          first.createdAt
        ) -
        new Date(
          second.createdAt
        )
    )
    .slice(-250);
};


// =========================================================
// REACTIONS
// =========================================================

const REACTION_OPTIONS = [
  "\u{1F44D}",
  "\u2764\uFE0F",
  "\u{1F602}",
  "\u{1F525}",
  "\u{1F389}",
  "\u{1F440}",
];


const getReactionGroups =
  (
    reactions,
    currentUserId
  ) => {
    if (
      !Array.isArray(
        reactions
      ) ||
      reactions.length ===
        0
    ) {
      return [];
    }


    const grouped =
      new Map();


    reactions.forEach(
      (
        reaction
      ) => {
        const emoji =
          String(
            reaction?.emoji ||
              ""
          ).trim();


        if (!emoji) {
          return;
        }


        if (
          !grouped.has(
            emoji
          )
        ) {
          grouped.set(
            emoji,
            {
              emoji,

              count:
                0,

              reactedByMe:
                false,

              names:
                [],
            }
          );
        }


        const group =
          grouped.get(
            emoji
          );


        group.count +=
          1;


        if (
          String(
            reaction?.userId ||
              ""
          ) ===
          String(
            currentUserId ||
              ""
          )
        ) {
          group.reactedByMe =
            true;
        }


        const name =
          String(
            reaction?.displayName ||
              ""
          ).trim();


        if (
          name &&
          !group.names.includes(
            name
          )
        ) {
          group.names.push(
            name
          );
        }
      }
    );


    const optionOrder =
      new Map(
        REACTION_OPTIONS.map(
          (
            emoji,
            index
          ) => [
            emoji,
            index,
          ]
        )
      );


    return [
      ...grouped.values(),
    ].sort(
      (
        first,
        second
      ) => {
        const firstOrder =
          optionOrder.has(
            first.emoji
          )
            ? optionOrder.get(
                first.emoji
              )
            : 999;

        const secondOrder =
          optionOrder.has(
            second.emoji
          )
            ? optionOrder.get(
                second.emoji
              )
            : 999;


        return (
          firstOrder -
          secondOrder
        );
      }
    );
  };


const getReplyPreviewText =
  (
    message
  ) => {
    const safeMessage =
      message &&
      typeof message ===
        "object"
        ? message
        : {};

    const text =
      String(
        safeMessage.message ||
          ""
      ).trim();

    if (text) {
      return text;
    }

    const attachments =
      Array.isArray(
        safeMessage.attachments
      )
        ? safeMessage.attachments
        : [];

    const attachmentCount =
      attachments.length > 0
        ? attachments.length
        : Number(
            safeMessage.attachmentCount ||
              0
          );

    const firstAttachmentName =
      String(
        attachments[0]?.fileName ||
          safeMessage.firstAttachmentName ||
          ""
      ).trim();

    if (attachmentCount > 0) {
      if (firstAttachmentName) {
        return attachmentCount > 1
          ? `${firstAttachmentName} +${attachmentCount - 1}`
          : firstAttachmentName;
      }

      return attachmentCount === 1
        ? "Attachment"
        : `${attachmentCount} attachments`;
    }

    if (
      safeMessage.messageId
    ) {
      return "Message unavailable";
    }

    return "Message";
  };

// =========================================================
// CHATS
// =========================================================

function Chats() {
  const {
    isGuest,
    firebaseUser,
  } = useAuth();

  const location =
    useLocation();

  const navigate =
    useNavigate();


  // =======================================================
  // STATE
  // =======================================================

  const [
    groups,
    setGroups,
  ] = useState([]);

  const [
    loadingGroups,
    setLoadingGroups,
  ] = useState(true);

  const [
    selectedGroupId,
    setSelectedGroupId,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    sending,
    setSending,
  ] = useState(false);


  const [
    uploadingAttachment,
    setUploadingAttachment,
  ] =
    useState(false);

  const [
    pendingAttachments,
    setPendingAttachments,
  ] =
    useState([]);

  const [
    roomSearch,
    setRoomSearch,
  ] = useState("");

  const [
    unreadByGroup,
    setUnreadByGroup,
  ] = useState({});

  const [
    lastMessageByGroup,
    setLastMessageByGroup,
  ] = useState({});

  const [
    error,
    setError,
  ] = useState("");

  const [
    hasNewBelow,
    setHasNewBelow,
  ] = useState(false);

  const [
    isFullscreen,
    setIsFullscreen,
  ] = useState(false);

  const [
    messageMenu,
    setMessageMenu,
  ] = useState(null);

  const [
    replyingTo,
    setReplyingTo,
  ] = useState(null);

  const [
    confirmAction,
    setConfirmAction,
  ] = useState(null);

  const [
    actioningMessageId,
    setActioningMessageId,
  ] = useState("");

  const [
    readReceiptsByGroup,
    setReadReceiptsByGroup,
  ] = useState({});

  const [
    mobileConversationOpen,
    setMobileConversationOpen,
  ] = useState(
    () =>
      new URLSearchParams(
        window.location.search
      ).has(
        "group"
      )
  );


  // =======================================================
  // REFS
  // =======================================================

  const selectedGroupIdRef =
    useRef("");

  const firebaseUidRef =
    useRef(
      firebaseUser?.uid ||
        ""
    );

  const messagesRef =
    useRef([]);

  const messageRequestRef =
    useRef(0);

  const messageViewportRef =
    useRef(null);

  const messageListRef =
    useRef(null);

  const composerTextareaRef =
    useRef(null);

  const stickToBottomRef =
    useRef(true);

  const forceBottomRef =
    useRef(false);

  const scrollFrameRef =
    useRef(null);

  const lastMarkedReadByGroupRef =
    useRef({});


  // =======================================================
  // GROUP TYPING
  // =======================================================

  const {
    typingLabel,
    handleTypingChange,
    stopTyping,
  } = useGroupTyping({
    selectedGroupId,

    currentUserId:
      firebaseUser?.uid ||
      "",

    isGuest,
  });


  const {
    toggleReaction,
  } = useGroupReactions({
    selectedGroupId,

    setMessages,

    isGuest,
  });


  // =======================================================
  // DERIVED
  // =======================================================

  const requestedGroupId =
    useMemo(
      () => {
        const params =
          new URLSearchParams(
            location.search
          );

        return (
          params.get(
            "group"
          ) || ""
        );
      },
      [
        location.search,
      ]
    );


  const selectedGroup =
    useMemo(
      () =>
        groups.find(
          (
            group
          ) =>
            String(
              group._id
            ) ===
            String(
              selectedGroupId
            )
        ) ||
        null,
      [
        groups,
        selectedGroupId,
      ]
    );


  const filteredGroups =
    useMemo(
      () => {
        const query =
          roomSearch
            .trim()
            .toLowerCase();

        if (!query) {
          return groups;
        }

        return groups.filter(
          (
            group
          ) => {
            const searchable =
              [
                group.name,
                group.description,
                group.role,
              ]
                .filter(
                  Boolean
                )
                .join(" ")
                .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );
      },
      [
        groups,
        roomSearch,
      ]
    );


  const totalUnread =
    useMemo(
      () =>
        Object.values(
          unreadByGroup
        ).reduce(
          (
            total,
            value
          ) =>
            total +
            (
              Number(
                value
              ) || 0
            ),
          0
        ),
      [
        unreadByGroup,
      ]
    );


  const latestOwnMessageId =
    useMemo(
      () => {
        for (
          let index =
            messages.length - 1;
          index >= 0;
          index -= 1
        ) {
          const message =
            messages[index];

          if (
            !message?._id ||
            message.isUnsent
          ) {
            continue;
          }

          if (
            String(
              message.userId
            ) ===
            String(
              firebaseUser?.uid
            )
          ) {
            return String(
              message._id
            );
          }
        }

        return "";
      },
      [
        messages,
        firebaseUser?.uid,
      ]
    );


  const seenReaders =
    useMemo(
      () => {
        if (
          !selectedGroupId ||
          !latestOwnMessageId
        ) {
          return [];
        }

        const messageIndexById =
          new Map();

        messages.forEach(
          (
            message,
            index
          ) => {
            if (
              message?._id
            ) {
              messageIndexById.set(
                String(
                  message._id
                ),
                index
              );
            }
          }
        );

        const ownMessageIndex =
          messageIndexById.get(
            latestOwnMessageId
          );

        if (
          ownMessageIndex ===
          undefined
        ) {
          return [];
        }

        const receipts =
          Object.values(
            readReceiptsByGroup[
              String(
                selectedGroupId
              )
            ] ||
              {}
          );

        return receipts.filter(
          (
            receipt
          ) => {
            if (
              !receipt?.userId ||
              !receipt?.messageId
            ) {
              return false;
            }

            if (
              String(
                receipt.userId
              ) ===
              String(
                firebaseUser?.uid
              )
            ) {
              return false;
            }

            const readIndex =
              messageIndexById.get(
                String(
                  receipt.messageId
                )
              );

            return (
              readIndex !==
                undefined &&
              readIndex >=
                ownMessageIndex
            );
          }
        );
      },
      [
        messages,
        selectedGroupId,
        latestOwnMessageId,
        readReceiptsByGroup,
        firebaseUser?.uid,
      ]
    );


  const seenLabel =
    useMemo(
      () => {
        if (
          seenReaders.length ===
          0
        ) {
          return "";
        }

        if (
          seenReaders.length ===
          1
        ) {
          const reader =
            seenReaders[0];

          const name =
            String(
              reader.displayName ||
                ""
            ).trim();

          return name
            ? `Seen by ${name}`
            : "Seen";
        }

        return `Seen by ${seenReaders.length}`;
      },
      [
        seenReaders,
      ]
    );


  // =======================================================
  // SYNC REFS
  // =======================================================

  useEffect(
    () => {
      selectedGroupIdRef.current =
        selectedGroupId;
    },
    [
      selectedGroupId,
    ]
  );


  useEffect(
    () => {
      firebaseUidRef.current =
        firebaseUser?.uid ||
        "";
    },
    [
      firebaseUser?.uid,
    ]
  );


  useEffect(
    () => {
      messagesRef.current =
        messages;
    },
    [
      messages,
    ]
  );

  useEffect(
    () => {
      if (
        !replyingTo?._id
      ) {
        return;
      }

      const currentReplyTarget =
        messages.find(
          (
            message
          ) =>
            String(
              message._id
            ) ===
            String(
              replyingTo._id
            )
        );

      if (
        !currentReplyTarget ||
        currentReplyTarget.isUnsent
      ) {
        setReplyingTo(
          null
        );
      }
    },
    [
      messages,
      replyingTo?._id,
    ]
  );


  // =======================================================
  // TEXTAREA AUTO HEIGHT
  // =======================================================

  useEffect(
    () => {
      const textarea =
        composerTextareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height =
        "auto";

      const nextHeight =
        Math.min(
          textarea.scrollHeight,
          132
        );

      textarea.style.height =
        `${nextHeight}px`;
    },
    [
      input,
    ]
  );


  // =======================================================
  // FULLSCREEN
  // =======================================================

  const toggleFullscreen =
    () => {
      setMessageMenu(
        null
      );

      setIsFullscreen(
        (
          current
        ) =>
          !current
      );
    };


  useEffect(
    () => {
      if (
        !isFullscreen
      ) {
        return undefined;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      return () => {
        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      isFullscreen,
    ]
  );


  // =======================================================
  // ESC
  // =======================================================

  useEffect(
    () => {
      const handleKeyDown =
        (
          event
        ) => {
          if (
            event.key !==
            "Escape"
          ) {
            return;
          }

          if (
            confirmAction
          ) {
            setConfirmAction(
              null
            );

            return;
          }

          if (
            messageMenu
          ) {
            setMessageMenu(
              null
            );

            return;
          }

          if (
            replyingTo
          ) {
            setReplyingTo(
              null
            );

            return;
          }

          if (
            isFullscreen
          ) {
            setIsFullscreen(
              false
            );
          }
        };

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      confirmAction,
      messageMenu,
      replyingTo,
      isFullscreen,
    ]
  );


  // =======================================================
  // FLOATING MESSAGE MENU
  // =======================================================

  const openMessageMenu =
    (
      event,
      message,
      isYou
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const rect =
        event.currentTarget
          .getBoundingClientRect();

      const menuWidth =
        205;

      const viewportPadding =
        12;

      const gap =
        8;

      let left =
        isYou
          ? rect.right -
            menuWidth
          : rect.left;

      left =
        Math.max(
          viewportPadding,
          Math.min(
            left,
            window.innerWidth -
              menuWidth -
              viewportPadding
          )
        );

      const bottom =
        Math.max(
          viewportPadding,
          window.innerHeight -
            rect.top +
            gap
        );

      const currentMessageId =
        String(
          messageMenu?.message?._id ||
          ""
        );

      const nextMessageId =
        String(
          message?._id ||
          ""
        );

      if (
        currentMessageId &&
        currentMessageId ===
          nextMessageId
      ) {
        setMessageMenu(
          null
        );

        return;
      }

      setMessageMenu({
        message,
        isYou,
        bottom,
        left,
      });
    };


  useEffect(
    () => {
      if (
        !messageMenu
      ) {
        return undefined;
      }

      const closeMenu =
        () => {
          setMessageMenu(
            null
          );
        };

      const handlePointerDown =
        (
          event
        ) => {
          if (
            event.target.closest(
              ".chats-floating-message-menu"
            ) ||
            event.target.closest(
              ".chats-message-more"
            )
          ) {
            return;
          }

          closeMenu();
        };

      document.addEventListener(
        "pointerdown",
        handlePointerDown
      );

      window.addEventListener(
        "resize",
        closeMenu
      );

      window.addEventListener(
        "scroll",
        closeMenu,
        true
      );

      return () => {
        document.removeEventListener(
          "pointerdown",
          handlePointerDown
        );

        window.removeEventListener(
          "resize",
          closeMenu
        );

        window.removeEventListener(
          "scroll",
          closeMenu,
          true
        );
      };
    },
    [
      messageMenu,
    ]
  );


  // =======================================================
  // SOCKET HELPERS
  // =======================================================

  const getConnectedSocket =
    async () => {
      const socket =
        await connectSocket();

      if (
        socket.connected
      ) {
        return socket;
      }

      await new Promise(
        (
          resolve,
          reject
        ) => {
          const timeout =
            window.setTimeout(
              () => {
                cleanup();

                reject(
                  new Error(
                    "Connection timed out"
                  )
                );
              },
              8000
            );

          const cleanup =
            () => {
              window.clearTimeout(
                timeout
              );

              socket.off(
                "connect",
                handleConnect
              );

              socket.off(
                "connect_error",
                handleError
              );
            };

          const handleConnect =
            () => {
              cleanup();
              resolve();
            };

          const handleError =
            (
              socketError
            ) => {
              cleanup();

              reject(
                socketError
              );
            };

          socket.once(
            "connect",
            handleConnect
          );

          socket.once(
            "connect_error",
            handleError
          );
        }
      );

      return socket;
    };


  const emitWithAck =
    async (
      eventName,
      payload
    ) => {
      const socket =
        await getConnectedSocket();

      return new Promise(
        (
          resolve,
          reject
        ) => {
          const timeout =
            window.setTimeout(
              () => {
                reject(
                  new Error(
                    "Request timed out"
                  )
                );
              },
              8000
            );

          socket.emit(
            eventName,
            payload,
            (
              result
            ) => {
              window.clearTimeout(
                timeout
              );

              if (
                result?.ok
              ) {
                resolve(
                  result
                );

                return;
              }

              reject(
                new Error(
                  result?.message ||
                    "Request failed"
                )
              );
            }
          );
        }
      );
    };


  // =======================================================
  // READ RECEIPTS
  // =======================================================

  const applyReadReceipt =
    (
      receipt
    ) => {
      if (
        !receipt?.groupId ||
        !receipt?.userId ||
        !receipt?.messageId
      ) {
        return;
      }

      const groupId =
        String(
          receipt.groupId
        );

      const userId =
        String(
          receipt.userId
        );

      setReadReceiptsByGroup(
        (
          current
        ) => ({
          ...current,

          [
            groupId
          ]: {
            ...(
              current[
                groupId
              ] ||
              {}
            ),

            [
              userId
            ]: {
              ...(
                current[
                  groupId
                ]?.[
                  userId
                ] ||
                {}
              ),

              ...receipt,

              groupId,

              userId,

              messageId:
                String(
                  receipt.messageId
                ),
            },
          },
        })
      );
    };


  const hydrateReadReceipts =
    (
      groupId,
      members
    ) => {
      const key =
        String(
          groupId
        );

      const nextReceipts =
        {};

      for (
        const member
        of Array.isArray(
          members
        )
          ? members
          : []
      ) {
        if (
          !member?.userId ||
          !member?.lastReadMessageId
        ) {
          continue;
        }

        const userId =
          String(
            member.userId
          );

        const messageId =
          String(
            member.lastReadMessageId
          );

        nextReceipts[
          userId
        ] = {
          groupId:
            key,

          userId,

          displayName:
            member.displayName ||
            null,

          picture:
            member.picture ||
            null,

          messageId,

          readAt:
            member.lastReadAt ||
            null,
        };

      }

      setReadReceiptsByGroup(
        (
          current
        ) => ({
          ...current,

          [
            key
          ]:
            nextReceipts,
        })
      );
    };


  const loadReadReceipts =
    async (
      groupId
    ) => {
      if (
        isGuest ||
        !groupId
      ) {
        return [];
      }

      try {
        const data =
          await apiRequest(
            `/api/groups/${groupId}/members`
          );

        const members =
          Array.isArray(
            data?.members
          )
            ? data.members
            : [];

        hydrateReadReceipts(
          groupId,
          members
        );

        return members;
      } catch (
        receiptError
      ) {
        console.error(
          "Read receipt load failed:",
          receiptError
        );

        return [];
      }
    };


  const markMessageRead =
    async (
      groupId,
      message
    ) => {
      if (
        isGuest ||
        !groupId ||
        !message?._id ||
        document.visibilityState !==
          "visible"
      ) {
        return;
      }

      const groupKey =
        String(
          groupId
        );

      if (
        groupKey !==
        String(
          selectedGroupIdRef.current ||
            ""
        )
      ) {
        return;
      }

      const messageId =
        String(
          message._id
        );

      if (
        lastMarkedReadByGroupRef
          .current[
            groupKey
          ] ===
        messageId
      ) {
        return;
      }

      lastMarkedReadByGroupRef
        .current[
          groupKey
        ] =
          messageId;

      try {
        const result =
          await emitWithAck(
            "group:message:read",
            {
              groupId:
                groupKey,

              messageId,
            }
          );

        if (
          result?.receipt
        ) {
          applyReadReceipt(
            result.receipt
          );
        }
      } catch (
        receiptError
      ) {
        if (
          lastMarkedReadByGroupRef
            .current[
              groupKey
            ] ===
          messageId
        ) {
          delete lastMarkedReadByGroupRef
            .current[
              groupKey
            ];
        }

        console.error(
          "Mark message read failed:",
          receiptError
        );
      }
    };


  const markLatestMessageRead =
    () => {
      const groupId =
        String(
          selectedGroupIdRef.current ||
            ""
        );

      const latestMessage =
        messagesRef.current[
          messagesRef.current.length -
            1
        ];

      if (
        !groupId ||
        !latestMessage
      ) {
        return;
      }

      markMessageRead(
        groupId,
        latestMessage
      );
    };


  // =======================================================
  // MESSAGE LOCAL HELPERS
  // =======================================================

  const applyUnsentMessage =
    (
      updatedMessage
    ) => {
      if (
        !updatedMessage?._id
      ) {
        return;
      }

      const messageId =
        String(
          updatedMessage._id
        );

      const groupId =
        String(
          updatedMessage.groupId ||
            selectedGroupIdRef.current ||
            ""
        );

      const activeGroupId =
        String(
          selectedGroupIdRef.current ||
            ""
        );

      if (
        groupId ===
        activeGroupId
      ) {
        const nextMessages =
          messagesRef.current.map(
            (
              message
            ) => {
              if (
                String(
                  message._id
                ) !==
                messageId
              ) {
                return message;
              }

              return {
                ...message,
                ...updatedMessage,

                message:
                  null,

                isUnsent:
                  true,
              };
            }
          );

        messagesRef.current =
          nextMessages;

        setMessages(
          nextMessages
        );
      }

      setLastMessageByGroup(
        (
          current
        ) => {
          const currentLast =
            current[
              groupId
            ];

          if (
            !currentLast ||
            String(
              currentLast._id
            ) !==
            messageId
          ) {
            return current;
          }

          return {
            ...current,

            [
              groupId
            ]: {
              ...currentLast,
              ...updatedMessage,

              message:
                null,

              isUnsent:
                true,
            },
          };
        }
      );
    };


  const removeMessageLocally =
    (
      messageId,
      groupId
    ) => {
      const id =
        String(
          messageId
        );

      const targetGroupId =
        String(
          groupId
        );

      const nextMessages =
        messagesRef.current.filter(
          (
            message
          ) =>
            String(
              message._id
            ) !==
            id
        );

      messagesRef.current =
        nextMessages;

      setMessages(
        nextMessages
      );

      const latest =
        nextMessages[
          nextMessages.length -
            1
        ] ||
        null;

      setLastMessageByGroup(
        (
          current
        ) => {
          const currentLast =
            current[
              targetGroupId
            ];

          if (
            currentLast &&
            String(
              currentLast._id
            ) !==
            id
          ) {
            return current;
          }

          return {
            ...current,

            [
              targetGroupId
            ]:
              latest,
          };
        }
      );
    };


  // =======================================================
  // SCROLL
  // =======================================================

  const scrollToBottom =
    (
      smooth = false
    ) => {
      const viewport =
        messageViewportRef.current;

      if (!viewport) {
        return;
      }

      if (smooth) {
        viewport.scrollTo({
          top:
            viewport.scrollHeight,

          behavior:
            "smooth",
        });
      } else {
        viewport.scrollTop =
          viewport.scrollHeight;
      }

      stickToBottomRef.current =
        true;

      setHasNewBelow(
        false
      );
    };


  useEffect(
    () => {
      const list =
        messageListRef.current;

      const viewport =
        messageViewportRef.current;

      if (
        !list ||
        !viewport ||
        typeof ResizeObserver ===
          "undefined"
      ) {
        return undefined;
      }

      let frame =
        null;

      const pinToBottom =
        () => {
          if (
            !stickToBottomRef.current &&
            !forceBottomRef.current
          ) {
            return;
          }

          if (frame) {
            window.cancelAnimationFrame(
              frame
            );
          }

          frame =
            window.requestAnimationFrame(
              () => {
                frame =
                  null;

                scrollToBottom(
                  false
                );
              }
            );
        };

      const observer =
        new ResizeObserver(
          pinToBottom
        );

      observer.observe(
        list
      );

      observer.observe(
        viewport
      );

      pinToBottom();

      return () => {
        observer.disconnect();

        if (frame) {
          window.cancelAnimationFrame(
            frame
          );
        }
      };
    },
    [
      selectedGroupId,
      messages.length,
      mobileConversationOpen,
    ]
  );

  const handleUserMessageScrollIntent =
    () => {
      forceBottomRef.current =
        false;
    };


  const handleMessageScroll =
    () => {
      if (
        scrollFrameRef.current
      ) {
        return;
      }

      scrollFrameRef.current =
        window.requestAnimationFrame(
          () => {
            scrollFrameRef.current =
              null;

            const viewport =
              messageViewportRef.current;

            if (!viewport) {
              return;
            }

            if (
              forceBottomRef.current
            ) {
              stickToBottomRef.current =
                true;

              return;
            }


            const distanceFromBottom =
              viewport.scrollHeight -
              viewport.scrollTop -
              viewport.clientHeight;

            const atBottom =
              distanceFromBottom <
              90;

            stickToBottomRef.current =
              atBottom;

            if (
              atBottom
            ) {
              setHasNewBelow(
                false
              );

              markLatestMessageRead();
            }
          }
        );
    };


  useEffect(
    () => {
      return () => {
        if (
          scrollFrameRef.current
        ) {
          window.cancelAnimationFrame(
            scrollFrameRef.current
          );
        }
      };
    },
    []
  );


  // =======================================================
  // TAB VISIBILITY
  // =======================================================

  useEffect(
    () => {
      const handleVisibility =
        () => {
          if (
            document.visibilityState ===
              "visible" &&
            stickToBottomRef.current
          ) {
            window.requestAnimationFrame(
              () => {
                scrollToBottom(
                  false
                );

                markLatestMessageRead();
              }
            );
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


  // =======================================================
  // LOAD GROUPS
  // =======================================================

  const loadGroups =
    async () => {
      if (isGuest) {
        setGroups([]);

        setLoadingGroups(
          false
        );

        return [];
      }

      try {
        setLoadingGroups(
          true
        );

        setError("");

        const data =
          await apiRequest(
            "/api/groups/mine"
          );

        const nextGroups =
          Array.isArray(
            data
          )
            ? data
            : Array.isArray(
                data?.groups
              )
            ? data.groups
            : [];

        setGroups(
          nextGroups
        );

        return nextGroups;
      } catch (
        loadError
      ) {
        console.error(
          "Chats groups load failed:",
          loadError
        );

        setError(
          loadError?.message ||
            "Couldn't load your study groups."
        );

        return [];
      } finally {
        setLoadingGroups(
          false
        );
      }
    };


  // =======================================================
  // LOAD MESSAGES
  // =======================================================

  const loadMessages =
    async (
      groupId
    ) => {
      if (
        isGuest ||
        !groupId
      ) {
        messageRequestRef.current +=
          1;

        messagesRef.current =
          [];

        setMessages([]);

        setLoadingMessages(
          false
        );

        return [];
      }

      const requestId =
        messageRequestRef.current +
        1;

      messageRequestRef.current =
        requestId;

      try {
        setLoadingMessages(
          true
        );

        const data =
          await apiRequest(
            `/api/groups/${groupId}/messages`
          );

        const nextMessages =
          Array.isArray(
            data?.messages
          )
            ? data.messages
            : [];

        if (
          messageRequestRef.current !==
          requestId
        ) {
          return nextMessages;
        }

        const merged =
          mergeMessages(
            [],
            nextMessages
          );

        messagesRef.current =
          merged;

        setMessages(
          merged
        );

        const latest =
          merged[
            merged.length -
              1
          ];

        setLastMessageByGroup(
          (
            current
          ) => ({
            ...current,

            [
              String(
                groupId
              )
            ]:
              latest ||
              null,
          })
        );

        forceBottomRef.current =
          true;

        return merged;
      } catch (
        loadError
      ) {
        if (
          messageRequestRef.current ===
          requestId
        ) {
          console.error(
            "Chat history load failed:",
            loadError
          );

          setError(
            loadError?.message ||
              "Couldn't load messages."
          );
        }

        return [];
      } finally {
        if (
          messageRequestRef.current ===
          requestId
        ) {
          setLoadingMessages(
            false
          );
        }
      }
    };


  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(
    () => {
      if (isGuest) {
        setGroups([]);

        messagesRef.current =
          [];

        setMessages([]);

        setSelectedGroupId(
          ""
        );

        setLoadingGroups(
          false
        );

        return;
      }

      loadGroups();
    },
    [
      isGuest,
    ]
  );


  // =======================================================
  // RESOLVE SELECTED GROUP
  // =======================================================

  useEffect(
    () => {
      if (
        groups.length ===
        0
      ) {
        setSelectedGroupId(
          ""
        );

        return;
      }

      const requestedIsValid =
        requestedGroupId &&
        groups.some(
          (
            group
          ) =>
            String(
              group._id
            ) ===
            String(
              requestedGroupId
            )
        );

      const currentIsValid =
        selectedGroupId &&
        groups.some(
          (
            group
          ) =>
            String(
              group._id
            ) ===
            String(
              selectedGroupId
            )
        );

      const nextId =
        requestedIsValid
          ? String(
              requestedGroupId
            )
          : currentIsValid
          ? String(
              selectedGroupId
            )
          : String(
              groups[0]._id
            );

      if (
        nextId !==
        selectedGroupId
      ) {
        setSelectedGroupId(
          nextId
        );
      }

      if (
        requestedGroupId !==
        nextId
      ) {
        navigate(
          `/app/chats?group=${encodeURIComponent(
            nextId
          )}`,
          {
            replace:
              true,
          }
        );
      }
    },
    [
      groups,
      requestedGroupId,
      selectedGroupId,
      navigate,
    ]
  );


  // =======================================================
  // SELECT GROUP
  // =======================================================

  const selectGroup =
    (
      groupId
    ) => {
      const nextId =
        String(
          groupId
        );

      setMobileConversationOpen(
        true
      );

      if (
        nextId ===
        selectedGroupId
      ) {
        return;
      }

      setMessageMenu(
        null
      );

      setConfirmAction(
        null
      );

      setSelectedGroupId(
        nextId
      );

      messagesRef.current =
        [];

      setMessages([]);

      setInput("");
      setError("");

      setHasNewBelow(
        false
      );

      stickToBottomRef.current =
        true;

      forceBottomRef.current =
        true;

      setUnreadByGroup(
        (
          current
        ) => ({
          ...current,

          [
            nextId
          ]:
            0,
        })
      );

      navigate(
        `/app/chats?group=${encodeURIComponent(
          nextId
        )}`,
        {
          replace:
            true,
        }
      );
    };


  // =======================================================
  // SELECTED CHAT LOAD
  // =======================================================

  useEffect(
    () => {
      if (
        !selectedGroupId ||
        isGuest
      ) {
        messagesRef.current =
          [];

        setMessages([]);

        return;
      }

      messagesRef.current =
        [];

      setMessages([]);

      setInput("");
      setError("");

      setMessageMenu(
        null
      );

      setConfirmAction(
        null
      );

      setHasNewBelow(
        false
      );

      stickToBottomRef.current =
        true;

      forceBottomRef.current =
        true;

      setUnreadByGroup(
        (
          current
        ) => ({
          ...current,

          [
            String(
              selectedGroupId
            )
          ]:
            0,
        })
      );

      loadMessages(
        selectedGroupId
      );

      loadReadReceipts(
        selectedGroupId
      );
    },
    [
      selectedGroupId,
      isGuest,
    ]
  );


  // =======================================================
  // MOBILE OPEN — FORCE LATEST MESSAGE
  // =======================================================

  useEffect(
    () => {
      if (
        !mobileConversationOpen ||
        !selectedGroupId
      ) {
        return undefined;
      }

      stickToBottomRef.current =
        true;

      forceBottomRef.current =
        true;

      let secondFrame =
        null;

      const firstFrame =
        window.requestAnimationFrame(
          () => {
            secondFrame =
              window.requestAnimationFrame(
                () => {
                  scrollToBottom(
                    false
                  );


                  markLatestMessageRead();
                }
              );
          }
        );

      return () => {
        window.cancelAnimationFrame(
          firstFrame
        );

        if (secondFrame) {
          window.cancelAnimationFrame(
            secondFrame
          );
        }
      };
    },
    [
      mobileConversationOpen,
      selectedGroupId,
    ]
  );

  // =======================================================
  // AUTO SCROLL
  // =======================================================

  useEffect(
    () => {
      if (
        messages.length ===
        0
      ) {
        return undefined;
      }

      if (
        document.visibilityState !==
        "visible"
      ) {
        return undefined;
      }

      const frame =
        window.requestAnimationFrame(
          () => {
            if (
              forceBottomRef.current
            ) {

              scrollToBottom(
                false
              );

              markLatestMessageRead();

              return;
            }

            if (
              stickToBottomRef.current
            ) {
              scrollToBottom(
                false
              );

              markLatestMessageRead();
            }
          }
        );

      return () => {
        window.cancelAnimationFrame(
          frame
        );
      };
    },
    [
      messages,
      selectedGroupId,
    ]
  );


  // =======================================================
  // SOCKET
  // =======================================================

  useEffect(
    () => {
      if (
        isGuest ||
        groups.length ===
        0
      ) {
        return undefined;
      }

      let active =
        true;

      let connectedSocket =
        null;


      const joinAllRooms =
        (
          socket
        ) => {
          for (
            const group
            of groups
          ) {
            if (
              !group?._id
            ) {
              continue;
            }

            socket.emit(
              "group:join",
              {
                groupId:
                  String(
                    group._id
                  ),
              }
            );
          }
        };


      const handleConnect =
        () => {
          if (
            !active ||
            !connectedSocket
          ) {
            return;
          }

          joinAllRooms(
            connectedSocket
          );
        };


      const handleNewMessage =
        (
          incomingMessage = {}
        ) => {
          if (
            !active ||
            !incomingMessage?._id ||
            !incomingMessage?.groupId
          ) {
            return;
          }

          const incomingGroupId =
            String(
              incomingMessage.groupId
            );

          setLastMessageByGroup(
            (
              current
            ) => ({
              ...current,

              [
                incomingGroupId
              ]:
                incomingMessage,
            })
          );

          const activeGroupId =
            String(
              selectedGroupIdRef.current ||
                ""
            );

          if (
            incomingGroupId !==
            activeGroupId
          ) {
            setUnreadByGroup(
              (
                current
              ) => ({
                ...current,

                [
                  incomingGroupId
                ]:
                  (
                    Number(
                      current[
                        incomingGroupId
                      ]
                    ) || 0
                  ) + 1,
              })
            );

            return;
          }

          const isOwnMessage =
            String(
              incomingMessage.userId
            ) ===
            String(
              firebaseUidRef.current
            );

          const wasAtBottom =
            stickToBottomRef.current;

          if (
            isOwnMessage
          ) {
            stickToBottomRef.current =
              true;

            forceBottomRef.current =
              true;
          }

          const nextMessages =
            mergeMessages(
              messagesRef.current,
              [
                incomingMessage,
              ]
            );

          messagesRef.current =
            nextMessages;

          setMessages(
            nextMessages
          );

          if (
            (
              isOwnMessage ||
              wasAtBottom
            ) &&
            document.visibilityState ===
              "visible"
          ) {
            markMessageRead(
              incomingGroupId,
              incomingMessage
            );
          }

          if (
            !isOwnMessage &&
            !wasAtBottom
          ) {
            setHasNewBelow(
              true
            );
          }
        };


      const handleUnsentMessage =
        (
          unsentMessage = {}
        ) => {
          if (
            !active ||
            !unsentMessage?._id
          ) {
            return;
          }


          applyUnsentMessage(
            unsentMessage
          );


          const unsentMessageId =
            String(
              unsentMessage._id
            );


          setMessages(
            (
              currentMessages
            ) => {
              const nextMessages =
                currentMessages.map(
                  (
                    currentMessage
                  ) => {
                    const replyMessageId =
                      String(
                        currentMessage.replyTo?.messageId ||
                          ""
                      );


                    if (
                      replyMessageId !==
                      unsentMessageId
                    ) {
                      return currentMessage;
                    }


                    return {
                      ...currentMessage,

                      replyTo: {
                        ...currentMessage.replyTo,

                        message:
                          null,

                        attachmentCount:
                          0,

                        firstAttachmentName:
                          null,
                      },
                    };
                  }
                );


              messagesRef.current =
                nextMessages;


              return nextMessages;
            }
          );
        };


      const handleReadReceipt =
        (
          receipt = {}
        ) => {
          if (
            !active
          ) {
            return;
          }

          applyReadReceipt(
            receipt
          );
        };


      const connect =
        async () => {
          try {
            const socket =
              await connectSocket();

            if (!active) {
              return;
            }

            connectedSocket =
              socket;

            socket.on(
              "connect",
              handleConnect
            );

            socket.on(
              "group:message:new",
              handleNewMessage
            );

            socket.on(
              "group:message:unsent",
              handleUnsentMessage
            );

            socket.on(
              "group:message:read-updated",
              handleReadReceipt
            );

            if (
              socket.connected
            ) {
              joinAllRooms(
                socket
              );
            }
          } catch (
            socketError
          ) {
            console.error(
              "Chats socket failed:",
              socketError
            );

            if (
              active
            ) {
              setError(
                "Messages loaded, but live updates couldn't connect."
              );
            }
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
            "connect",
            handleConnect
          );

          connectedSocket.off(
            "group:message:new",
            handleNewMessage
          );

          connectedSocket.off(
            "group:message:unsent",
            handleUnsentMessage
          );

          connectedSocket.off(
            "group:message:read-updated",
            handleReadReceipt
          );
        }
      };
    },
    [
      groups,
      isGuest,
    ]
  );


  // =======================================================
  // REACTIONS
  // =======================================================

  const handleReactionToggle =
    async (
      messageId,
      emoji
    ) => {
      if (
        !messageId ||
        !emoji
      ) {
        return;
      }


      const response =
        await toggleReaction(
          messageId,
          emoji
        );


      if (
        !response?.ok
      ) {
        setError(
          response?.message ||
            "Couldn't update reaction."
        );

        return;
      }


      setError("");
    };


  // =======================================================
  // ATTACHMENT UPLOADED
  // =======================================================

  const handleAttachmentUploaded =
    (
      uploadedMessage
    ) => {
      if (
        !uploadedMessage?._id ||
        !selectedGroupId
      ) {
        return;
      }


      stickToBottomRef.current =
        true;

      forceBottomRef.current =
        true;


      const nextMessages =
        mergeMessages(
          messagesRef.current,
          [
            uploadedMessage,
          ]
        );


      messagesRef.current =
        nextMessages;


      setMessages(
        nextMessages
      );


      setLastMessageByGroup(
        (
          current
        ) => ({
          ...current,

          [
            String(
              selectedGroupId
            )
          ]:
            uploadedMessage,
        })
      );


      setInput("");
    };


  // =======================================================
  // STAGED ATTACHMENTS
  //
  // Files stay only in browser memory until Send.
  // Nothing reaches R2 before the user sends the message.
  // =======================================================

  const stageAttachmentFiles =
    (
      incomingFiles
    ) => {
      const files =
        Array.from(
          incomingFiles ||
            []
        ).filter(
          Boolean
        );


      if (
        files.length ===
        0
      ) {
        return;
      }


      const acceptedTypes =
        new Set([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",

          "application/pdf",
          "text/plain",
          "text/csv",
          "application/json",

          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",

          "application/zip",
          "application/x-zip-compressed",
        ]);


      const maxFiles =
        10;

      const maxFileSize =
        25 *
        1024 *
        1024;


      const validFiles =
        [];


      let validationMessage =
        "";


      for (
        const file
        of files
      ) {
        if (
          !acceptedTypes.has(
            file.type
          )
        ) {
          validationMessage =
            `${file.name || "This file"} has an unsupported file type.`;

          continue;
        }


        if (
          file.size >
          maxFileSize
        ) {
          validationMessage =
            `${file.name || "This file"} is larger than 25 MB.`;

          continue;
        }


        validFiles.push(
          file
        );
      }


      if (
        validFiles.length ===
        0
      ) {
        if (
          validationMessage
        ) {
          setError(
            validationMessage
          );
        }

        return;
      }


      const existingKeys =
        new Set(
          pendingAttachments.map(
            (
              item
            ) =>
              [
                item.file.name,
                item.file.size,
                item.file.lastModified,
              ].join(
                ":"
              )
          )
        );


      const freshFiles =
        validFiles.filter(
          (
            file
          ) => {
            const key =
              [
                file.name,
                file.size,
                file.lastModified,
              ].join(
                ":"
              );


            return !existingKeys.has(
              key
            );
          }
        );


      const availableSlots =
        Math.max(
          0,
          maxFiles -
            pendingAttachments.length
        );


      if (
        availableSlots ===
        0
      ) {
        setError(
          "You can attach up to 10 files at once."
        );

        return;
      }


      if (
        freshFiles.length >
        availableSlots
      ) {
        validationMessage =
          "You can attach up to 10 files at once.";
      }


      const filesToStage =
        freshFiles.slice(
          0,
          availableSlots
        );


      const timestamp =
        Date.now();


      const staged =
        filesToStage.map(
          (
            file,
            index
          ) => ({
            id:
              `${timestamp}-${file.lastModified}-${index}-${file.name}`,

            file,

            previewUrl:
              file.type.startsWith(
                "image/"
              )
                ? URL.createObjectURL(
                    file
                  )
                : "",

            status:
              "pending",

            error:
              "",
          })
        );


      if (
        staged.length ===
        0
      ) {
        return;
      }


      setPendingAttachments(
        (
          current
        ) => [
          ...current,
          ...staged,
        ]
      );


      setError(
        validationMessage
      );
    };


  const removePendingAttachment =
    (
      attachmentId
    ) => {
      setPendingAttachments(
        (
          current
        ) => {
          const target =
            current.find(
              (
                item
              ) =>
                item.id ===
                attachmentId
            );


          if (
            target?.previewUrl
          ) {
            URL.revokeObjectURL(
              target.previewUrl
            );
          }


          return current.filter(
            (
              item
            ) =>
              item.id !==
              attachmentId
          );
        }
      );
    };


  const clearPendingAttachments =
    () => {
      setPendingAttachments(
        (
          current
        ) => {
          for (
            const item
            of current
          ) {
            if (
              item.previewUrl
            ) {
              URL.revokeObjectURL(
                item.previewUrl
              );
            }
          }


          return [];
        }
      );


      setError(
        ""
      );
    };

  // -------------------------------------------------------
  // CLEAR STAGED FILES WHEN SWITCHING ROOMS
  // -------------------------------------------------------

  useEffect(
    () => {
      setPendingAttachments(
        (
          current
        ) => {
          for (
            const item
            of current
          ) {
            if (
              item.previewUrl
            ) {
              URL.revokeObjectURL(
                item.previewUrl
              );
            }
          }


          return [];
        }
      );
    },
    [
      selectedGroupId,
    ]
  );


  // =======================================================
  // PASTE ATTACHMENT
  //
  // Normal text paste stays normal.
  // Clipboard files are staged locally.
  // =======================================================

  const handleComposerPaste =
    (
      event
    ) => {
      const clipboard =
        event.clipboardData;


      if (!clipboard) {
        return;
      }


      const directFiles =
        Array.from(
          clipboard.files ||
            []
        );


      const itemFiles =
        Array.from(
          clipboard.items ||
            []
        )
          .filter(
            (
              item
            ) =>
              item.kind ===
              "file"
          )
          .map(
            (
              item
            ) =>
              item.getAsFile()
          )
          .filter(
            Boolean
          );


      const files =
        directFiles.length
          ? directFiles
          : itemFiles;


      // Normal text paste.
      if (
        files.length ===
        0
      ) {
        return;
      }


      event.preventDefault();


      if (
        !selectedGroupId ||
        uploadingAttachment ||
        sending ||
        isGuest
      ) {
        return;
      }


      stageAttachmentFiles(
        files
      );
    };

  // =======================================================
  // DRAG + DROP ATTACHMENT
  //
  // Dropped files are staged locally.
  // They are uploaded only when Send is pressed.
  // =======================================================

  const isFileDrag =
    (
      event
    ) => {
      return Array.from(
        event?.dataTransfer?.types ||
          []
      ).includes(
        "Files"
      );
    };


  const handleConversationDragEnter =
    (
      event
    ) => {
      if (
        !isFileDrag(
          event
        ) ||
        !selectedGroupId ||
        uploadingAttachment ||
        sending ||
        isGuest
      ) {
        return;
      }


      event.preventDefault();


      event.currentTarget.classList.add(
        "is-file-dragging"
      );
    };


  const handleConversationDragOver =
    (
      event
    ) => {
      if (
        !isFileDrag(
          event
        ) ||
        !selectedGroupId ||
        uploadingAttachment ||
        sending ||
        isGuest
      ) {
        return;
      }


      event.preventDefault();


      if (
        event.dataTransfer
      ) {
        event.dataTransfer.dropEffect =
          "copy";
      }


      event.currentTarget.classList.add(
        "is-file-dragging"
      );
    };


  const handleConversationDragLeave =
    (
      event
    ) => {
      if (
        !isFileDrag(
          event
        )
      ) {
        return;
      }


      const nextTarget =
        event.relatedTarget;


      if (
        nextTarget &&
        event.currentTarget.contains(
          nextTarget
        )
      ) {
        return;
      }


      event.currentTarget.classList.remove(
        "is-file-dragging"
      );
    };


  const handleConversationDrop =
    (
      event
    ) => {
      if (
        !isFileDrag(
          event
        )
      ) {
        return;
      }


      event.preventDefault();


      event.currentTarget.classList.remove(
        "is-file-dragging"
      );


      if (
        !selectedGroupId ||
        uploadingAttachment ||
        sending ||
        isGuest
      ) {
        return;
      }


      const files =
        Array.from(
          event.dataTransfer?.files ||
            []
        );


      if (
        files.length ===
        0
      ) {
        return;
      }


      stageAttachmentFiles(
        files
      );
    };

  // =======================================================
  // SEND
  //
  // Supports:
  // - text only
  // - attachments only
  // - text + attachments
  //
  // Staged files are uploaded only here.
  // =======================================================

  const sendMessage =
    async (
      event
    ) => {
      event?.preventDefault?.();


      const text =
        input.trim();


      const stagedAttachments =
        [
          ...pendingAttachments,
        ];


      const hasAttachments =
        stagedAttachments.length >
        0;


      if (
        sending ||
        uploadingAttachment ||
        (
          !text &&
          !hasAttachments
        ) ||
        !selectedGroupId
      ) {
        return;
      }


      if (
        text.length >
        2000
      ) {
        setError(
          "Messages can be up to 2000 characters."
        );

        return;
      }


      stopTyping(
        selectedGroupId
      );


      try {
        setSending(
          true
        );


        setUploadingAttachment(
          hasAttachments
        );


        setError(
          ""
        );


        stickToBottomRef.current =
          true;


        forceBottomRef.current =
          true;


        // ---------------------------------
        // ATTACHMENT MESSAGE
        // ---------------------------------

        if (
          hasAttachments
        ) {
          for (
            let index = 0;
            index <
            stagedAttachments.length;
            index += 1
          ) {
            const item =
              stagedAttachments[
                index
              ];


            // ---------------------------------
            // MARK CURRENT FILE UPLOADING
            // ---------------------------------

            setPendingAttachments(
              (
                current
              ) =>
                current.map(
                  (
                    pending
                  ) =>
                    pending.id ===
                    item.id
                      ? {
                          ...pending,

                          status:
                            "uploading",

                          error:
                            "",
                        }
                      : pending
                )
            );


            try {
              const uploadedMessage =
                await uploadGroupAttachment({
                  groupId:
                    String(
                      selectedGroupId
                    ),

                  file:
                    item.file,

                  message:
                    index === 0
                      ? text
                      : "",

                  replyToMessageId:
                    index === 0
                      ? String(
                          replyingTo?._id ||
                            ""
                        )
                      : "",
                });


              handleAttachmentUploaded(
                uploadedMessage
              );


              if (
                item.previewUrl
              ) {
                URL.revokeObjectURL(
                  item.previewUrl
                );
              }


              setPendingAttachments(
                (
                  current
                ) =>
                  current.filter(
                    (
                      pending
                    ) =>
                      pending.id !==
                      item.id
                  )
              );
            } catch (
              uploadError
            ) {
              setPendingAttachments(
                (
                  current
                ) =>
                  current.map(
                    (
                      pending
                    ) =>
                      pending.id ===
                      item.id
                        ? {
                            ...pending,

                            status:
                              "error",

                            error:
                              uploadError?.message ||
                              "Upload failed",
                          }
                        : pending
                  )
              );


              throw uploadError;
            }
          }


          setInput(
            ""
          );


          setReplyingTo(
            null
          );


          return;
        }


        // ---------------------------------
        // TEXT-ONLY MESSAGE
        // ---------------------------------

        const response =
          await emitWithAck(
            "group:message:send",
            {
              groupId:
                String(
                  selectedGroupId
                ),

              message:
                text,

              replyToMessageId:
                String(
                  replyingTo?._id ||
                    ""
                ),
            }
          );


        if (
          response?.message?._id
        ) {
          const nextMessages =
            mergeMessages(
              messagesRef.current,
              [
                response.message,
              ]
            );


          messagesRef.current =
            nextMessages;


          setMessages(
            nextMessages
          );


          setLastMessageByGroup(
            (
              current
            ) => ({
              ...current,

              [
                String(
                  selectedGroupId
                )
              ]:
                response.message,
            })
          );
        }


        setInput(
          ""
        );


        setReplyingTo(
          null
        );
      } catch (
        sendError
      ) {
        console.error(
          "Send group message failed:",
          sendError
        );


        setError(
          sendError?.message ||
            "Couldn't send the message."
        );
      } finally {
        setUploadingAttachment(
          false
        );


        setSending(
          false
        );
      }
    };

  // =======================================================
  // MESSAGE ACTIONS
  // =======================================================

  const jumpToReplySource =
    async (
      messageId
    ) => {
      const safeMessageId =
        String(
          messageId ||
            ""
        ).trim();


      if (!safeMessageId) {
        return;
      }


      const focusReplySource =
        () => {
          const messageElement =
            document.querySelector(
              `[data-message-id="${safeMessageId}"]`
            );


          if (!messageElement) {
            return false;
          }


          messageElement.scrollIntoView({
            behavior:
              "smooth",

            block:
              "center",
          });


          messageElement.classList.remove(
            "is-reply-target"
          );


          window.requestAnimationFrame(
            () => {
              messageElement.classList.add(
                "is-reply-target"
              );


              window.setTimeout(
                () => {
                  messageElement.classList.remove(
                    "is-reply-target"
                  );
                },
                1600
              );
            }
          );


          return true;
        };


      // Already loaded.
      if (
        focusReplySource()
      ) {
        return;
      }


      const safeGroupId =
        String(
          selectedGroupId ||
            ""
        ).trim();


      if (
        !safeGroupId ||
        isGuest
      ) {
        return;
      }


      try {
        const data =
          await apiRequest(
            `/api/groups/${safeGroupId}/messages/${safeMessageId}`
          );


        const sourceMessage =
          data?.message;


        if (
          !sourceMessage?._id
        ) {
          setError(
            "Original message is unavailable."
          );

          return;
        }


        // Do not let the normal message-update effect
        // pull us back to the bottom while inserting
        // the older source message.
        stickToBottomRef.current =
          false;

        forceBottomRef.current =
          false;


        const nextMessages =
          mergeMessages(
            messagesRef.current,
            [
              sourceMessage,
            ]
          );


        messagesRef.current =
          nextMessages;

        setMessages(
          nextMessages
        );


        // Wait for React to render the fetched message.
        window.requestAnimationFrame(
          () => {
            window.requestAnimationFrame(
              () => {
                if (
                  !focusReplySource()
                ) {
                  setError(
                    "Original message is unavailable."
                  );
                }
              }
            );
          }
        );
      } catch (
        jumpError
      ) {
        console.error(
          "Reply source load failed:",
          jumpError
        );


        setError(
          jumpError?.message ||
            "Original message is unavailable."
        );
      }
    };

  const startReply =
    (
      message
    ) => {
      if (
        !message?._id ||
        message.isUnsent
      ) {
        return;
      }

      setMessageMenu(
        null
      );

      setReplyingTo(
        message
      );

      window.requestAnimationFrame(
        () => {
          composerTextareaRef.current?.focus();
        }
      );
    };

  const requestMessageAction =
    (
      type,
      message
    ) => {
      setMessageMenu(
        null
      );

      setConfirmAction({
        type,
        message,
      });
    };


  const runConfirmedAction =
    async () => {
      const action =
        confirmAction;

      if (
        !action?.message?._id ||
        !selectedGroupId
      ) {
        return;
      }

      const message =
        action.message;

      const messageId =
        String(
          message._id
        );

      const groupId =
        String(
          message.groupId ||
            selectedGroupId
        );

      try {
        setActioningMessageId(
          messageId
        );

        setError("");


        if (
          action.type ===
          "unsend"
        ) {
          const result =
            await emitWithAck(
              "group:message:unsend",
              {
                groupId,
                messageId,
              }
            );

          if (
            result?.message
          ) {
            applyUnsentMessage(
              result.message
            );
          }

          setConfirmAction(
            null
          );

          return;
        }


        if (
          action.type ===
          "delete"
        ) {
          await emitWithAck(
            "group:message:delete-for-me",
            {
              groupId,
              messageId,
            }
          );

          removeMessageLocally(
            messageId,
            groupId
          );

          setConfirmAction(
            null
          );
        }
      } catch (
        actionError
      ) {
        console.error(
          "Message action failed:",
          actionError
        );

        setError(
          actionError?.message ||
            "Couldn't update the message."
        );
      } finally {
        setActioningMessageId(
          ""
        );
      }
    };


  // =======================================================
  // REFRESH
  // =======================================================

  const refresh =
    async () => {
      setMessageMenu(
        null
      );

      setError("");

      const nextGroups =
        await loadGroups();

      const currentId =
        selectedGroupIdRef.current;

      if (
        currentId &&
        nextGroups.some(
          (
            group
          ) =>
            String(
              group._id
            ) ===
            String(
              currentId
            )
        )
      ) {
        await loadMessages(
          currentId
        );

        await loadReadReceipts(
          currentId
        );
      }
    };


  // =======================================================
  // GUEST
  // =======================================================

  if (isGuest) {
    return (
      <div className="chats-page">

        <section className="chats-guest-card">

          <span className="chats-guest-icon">
            <MessageCircle
              size={28}
            />
          </span>

          <span className="chats-eyebrow">
            Messages
          </span>

          <h1>
            Sign in to use Chats
          </h1>

          <p>
            Group conversations are available to signed-in StudyOS members.
          </p>

          <NavLink
            to="/get-started"
            className="chats-primary-link"
          >
            Sign in
          </NavLink>

        </section>

      </div>
    );
  }


  // =======================================================
  // UI
  // =======================================================

  return (
    <div
      className={`chats-page ${
        isFullscreen
          ? "is-fullscreen"
          : ""
      } ${
        mobileConversationOpen
          ? "is-mobile-conversation-open"
          : ""
      }`}
    >

      <header className="chats-page-header">

        <div>

          <span className="chats-eyebrow">
            Messages
          </span>

          <h1>
            Chats
          </h1>

          <p>
            Conversations with your study groups.
          </p>

        </div>


        <div className="chats-page-actions">

          <NavLink
            to="/app/groups"
            className="chats-secondary-link"
          >

            <ChevronLeft
              size={16}
            />

            Study Groups

          </NavLink>

        </div>

      </header>


      {error && (
        <div className="chats-error">
          {error}
        </div>
      )}


      <section className="chats-workspace">

        {/* =================================================
            ROOMS
        ================================================= */}

        <aside className="chats-rooms">

          <div className="chats-rooms-header">

            <div>

              <span className="chats-eyebrow">
                Your groups
              </span>

              <div className="chats-rooms-title-row">

                <h2>
                  Rooms
                </h2>

                {totalUnread >
                  0 && (

                  <span className="chats-total-unread">
                    {totalUnread >
                    99
                      ? "99+"
                      : totalUnread}
                  </span>

                )}

              </div>

            </div>


            <button
              type="button"
              className="chats-icon-button"
              onClick={
                refresh
              }
              aria-label="Refresh chats"
              title="Refresh chats"
            >
              <RefreshCw
                size={16}
              />
            </button>

          </div>


          <label className="chats-search">

            <Search
              size={16}
            />

            <input
              value={
                roomSearch
              }
              onChange={(
                event
              ) =>
                setRoomSearch(
                  event.target.value
                )
              }
              placeholder="Search rooms"
            />

          </label>


          <div className="chats-room-list">

            {loadingGroups ? (

              <div className="chats-rooms-empty">

                <RefreshCw
                  size={20}
                />

                <span>
                  Loading rooms...
                </span>

              </div>

            ) : groups.length ===
            0 ? (

              <div className="chats-rooms-empty">

                <UsersRound
                  size={22}
                />

                <strong>
                  No study groups yet
                </strong>

                <span>
                  Create or join a group to start chatting.
                </span>

                <NavLink
                  to="/app/groups"
                  className="chats-inline-link"
                >
                  Open Study Groups
                </NavLink>

              </div>

            ) : filteredGroups.length ===
            0 ? (

              <div className="chats-rooms-empty compact">

                <Search
                  size={20}
                />

                <span>
                  No rooms match "{roomSearch}".
                </span>

              </div>

            ) : (

              filteredGroups.map(
                (
                  group
                ) => {
                  const groupId =
                    String(
                      group._id
                    );

                  const active =
                    groupId ===
                    String(
                      selectedGroupId
                    );

                  const unread =
                    Number(
                      unreadByGroup[
                        groupId
                      ]
                    ) || 0;

                  const latest =
                    lastMessageByGroup[
                      groupId
                    ];

                  let preview =
                    group.description ||
                    "No messages yet";

                  if (
                    latest?.isUnsent
                  ) {
                    preview =
                      "Message unsent";
                  } else if (
                    latest?.message
                  ) {
                    preview =
                      `${
                        String(
                          latest.userId
                        ) ===
                        String(
                          firebaseUser?.uid
                        )
                          ? "You: "
                          : ""
                      }${latest.message}`;
                  }

                  return (
                    <button
                      type="button"
                      key={
                        groupId
                      }
                      className={`chats-room-item ${
                        active
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() =>
                        selectGroup(
                          groupId
                        )
                      }
                    >

                      <span className="chats-room-avatar">
                        {getInitial(
                          group.name
                        )}
                      </span>


                      <span className="chats-room-copy">

                        <span className="chats-room-name-row">

                          <strong>
                            {group.name}
                          </strong>

                          {unread >
                            0 && (

                            <span className="chats-unread">
                              {unread >
                              99
                                ? "99+"
                                : unread}
                            </span>

                          )}

                        </span>


                        <span className="chats-room-preview">
                          {preview}
                        </span>


                        <span className="chats-room-meta">

                          <span>
                            {Number(
                              group.memberCount
                            ) || 1}{" "}
                            members
                          </span>

                          <span>
                            {group.role ||
                              "member"}
                          </span>

                        </span>

                      </span>

                    </button>
                  );
                }
              )

            )}

          </div>

        </aside>


        {/* =================================================
            CONVERSATION
        ================================================= */}

        <main
          className="chats-conversation"
          onDragEnter={
            handleConversationDragEnter
          }
          onDragOver={
            handleConversationDragOver
          }
          onDragLeave={
            handleConversationDragLeave
          }
          onDrop={
            handleConversationDrop
          }
        >

          {!selectedGroup ? (

            <div className="chats-conversation-empty">

              <span className="chats-empty-orbit">
                <MessageCircle
                  size={30}
                />
              </span>

              <span className="chats-eyebrow">
                Messages
              </span>

              <h2>
                Select a room
              </h2>

              <p>
                Choose a study group to open its conversation.
              </p>

            </div>

          ) : (

            <>

              {/* =============================================
                  ROOM HEADER
              ============================================= */}

              <header className="chats-conversation-header">

                <button
                  type="button"
                  className="chats-mobile-back-button"
                  onClick={() =>
                    setMobileConversationOpen(
                      false
                    )
                  }
                  aria-label="Back to rooms"
                  title="Back to rooms"
                >
                  <ChevronLeft
                    size={20}
                  />
                </button>


                <div className="chats-active-room">

                  <span className="chats-active-avatar">
                    {getInitial(
                      selectedGroup.name
                    )}
                  </span>


                  <div>

                    <div className="chats-active-title">

                      <h2>
                        {selectedGroup.name}
                      </h2>

                    </div>

                    <span>

                      {Number(
                        selectedGroup.memberCount
                      ) || 1}{" "}
                      members
                      {" · "}
                      {selectedGroup.role ||
                        "member"}

                    </span>

                  </div>

                </div>


                <div className="chats-conversation-actions">

                  <button
                    type="button"
                    className="chats-fullscreen-button"
                    onClick={
                      toggleFullscreen
                    }
                    aria-label={
                      isFullscreen
                        ? "Exit fullscreen chat"
                        : "Open fullscreen chat"
                    }
                    title={
                      isFullscreen
                        ? "Exit fullscreen (Esc)"
                        : "Fullscreen chat"
                    }
                  >

                    {isFullscreen ? (

                      <Minimize2
                        size={17}
                      />

                    ) : (

                      <Maximize2
                        size={17}
                      />

                    )}

                  </button>


                  <NavLink
                    to="/app/groups"
                    className="chats-room-details-link"
                  >
                    Details
                  </NavLink>

                </div>

              </header>


              {/* =============================================
                  MESSAGE VIEWPORT
              ============================================= */}

              <div className="chats-message-stage">

                <div
                  ref={
                    messageViewportRef
                  }
                  className="chats-message-viewport"
                  onScroll={
                    handleMessageScroll
                  }
                  onWheel={
                    handleUserMessageScrollIntent
                  }
                  onTouchMove={
                    handleUserMessageScrollIntent
                  }
                >

                  {loadingMessages ? (

                    <div className="chats-loading-state">

                      <RefreshCw
                        size={22}
                      />

                      <strong>
                        Loading messages
                      </strong>

                    </div>

                  ) : messages.length ===
                  0 ? (

                    <div className="chats-first-message">

                      <span className="chats-first-icon">

                        <MessageCircle
                          size={25}
                        />

                      </span>

                      <h3>
                        No messages yet
                      </h3>

                      <p>
                        Start the conversation in {selectedGroup.name}.
                      </p>

                    </div>

                  ) : (

                    <div
                      ref={
                        messageListRef
                      }
                      className="chats-message-list"
                    >

                      {messages.map(
                        (
                          chatMessage,
                          index
                        ) => {
                          const previous =
                            index >
                            0
                              ? messages[
                                  index -
                                    1
                                ]
                              : null;

                          const showDay =
                            !previous ||
                            !isSameMessageDay(
                              chatMessage.createdAt,
                              previous.createdAt
                            );

                          const showSender =
                            shouldShowSender(
                              chatMessage,
                              previous
                            );

                          const isYou =
                            String(
                              chatMessage.userId
                            ) ===
                            String(
                              firebaseUser?.uid
                            );

                          const senderName =
                            isYou
                              ? "You"
                              : chatMessage.displayName ||
                                "Student";

                          const messageId =
                            String(
                              chatMessage._id
                            );

                          const actioning =
                            actioningMessageId ===
                            messageId;

                          const menuOpen =
                            String(
                              messageMenu?.message?._id ||
                                ""
                            ) ===
                            messageId;


                          const replySenderName =
                            String(
                              chatMessage.replyTo?.userId ||
                                ""
                            ) ===
                            String(
                              firebaseUser?.uid ||
                                ""
                            )
                              ? "You"
                              : chatMessage.replyTo?.displayName ||
                                "Student";


                          const replyPreview =
                            getReplyPreviewText(
                              chatMessage.replyTo
                            );

                          const reactionGroups =
                            getReactionGroups(
                              chatMessage.reactions,
                              firebaseUser?.uid
                            );


                          return (
                            <div
                              className="chats-message-block"
                              key={
                                chatMessage._id
                              }
                              data-message-id={
                                messageId
                              }
                            >

                              {showDay && (

                                <div className="chats-day-divider">

                                  <span>
                                    {formatDayLabel(
                                      chatMessage.createdAt
                                    )}
                                  </span>

                                </div>

                              )}


                              <div
                                className={`chats-message-row ${
                                  isYou
                                    ? "is-you"
                                    : ""
                                } ${
                                  showSender
                                    ? "is-group-start"
                                    : "is-group-continuation"
                                } ${
                                  chatMessage.isUnsent
                                    ? "is-unsent"
                                    : ""
                                }`}
                              >

                                <div className="chats-message-avatar-slot">

                                  {showSender &&
                                    (
                                      chatMessage.picture ? (

                                        <img
                                          src={
                                            chatMessage.picture
                                          }
                                          alt=""
                                          className="chats-message-avatar"
                                        />

                                      ) : (

                                        <span className="chats-message-avatar fallback">

                                          {getInitial(
                                            senderName
                                          )}

                                        </span>

                                      )
                                    )}

                                </div>


                                <div className="chats-message-content">

                                  {showSender && (

                                    <div className="chats-message-meta">

                                      <strong>
                                        {senderName}
                                      </strong>

                                      <span>
                                        {formatMessageTime(
                                          chatMessage.createdAt
                                        )}
                                      </span>

                                    </div>

                                  )}


                                  {chatMessage.isUnsent ? (

                                    <div className="chats-message-bubble chats-unsent-message">

                                      <Undo2
                                        size={13}
                                      />

                                      <span>
                                        This message was unsent
                                      </span>

                                    </div>

                                  ) : (

                                    <>
  {chatMessage.replyTo && (
  <div
    className="chats-message-reply-quote"
    role="button"
    tabIndex={0}
    title="Jump to original message"
    onClick={() =>
      jumpToReplySource(
        chatMessage.replyTo?.messageId
      )
    }
    onKeyDown={(
      event
    ) => {
      if (
        event.key ===
          "Enter" ||
        event.key ===
          " "
      ) {
        event.preventDefault();

        jumpToReplySource(
          chatMessage.replyTo?.messageId
        );
      }
    }}
  >
    <strong>
      {replySenderName}
    </strong>

    <span>
      {replyPreview}
    </span>
  </div>
)}

  {chatMessage.message && (
    <div className="chats-message-bubble">
      {chatMessage.message}
    </div>
  )}


  {Array.isArray(
    chatMessage.attachments
  ) &&
    chatMessage.attachments.length >
      0 && (

    <div className="chats-message-attachments">

      {chatMessage.attachments.map(
        (
          attachment,
          attachmentIndex
        ) => (

          <ChatAttachmentCard
            key={
              attachment.storageKey ||
              `${messageId}-${attachmentIndex}`
            }
            groupId={
              String(
                chatMessage.groupId ||
                  selectedGroupId
              )
            }
            messageId={
              messageId
            }
            attachment={
              attachment
            }
          />

        )
      )}

    </div>

  )}
</>

                                  )}


                                  {!chatMessage.isUnsent &&
                                    reactionGroups.length >
                                      0 && (

                                    <div className="chats-message-reactions">

                                      {reactionGroups.map(
                                        (
                                          reaction
                                        ) => (

                                          <button
                                            key={
                                              reaction.emoji
                                            }
                                            type="button"
                                            className={`chats-reaction-pill ${
                                              reaction.reactedByMe
                                                ? "is-mine"
                                                : ""
                                            }`}
                                            onClick={() =>
                                              handleReactionToggle(
                                                messageId,
                                                reaction.emoji
                                              )
                                            }
                                            title={
                                              reaction.names.length >
                                              0
                                                ? reaction.names.join(
                                                    ", "
                                                  )
                                                : "React"
                                            }
                                            aria-label={`${reaction.emoji} reaction, ${reaction.count}`}
                                          >

                                            <span className="chats-reaction-emoji">
                                              {reaction.emoji}
                                            </span>

                                            <span className="chats-reaction-count">
                                              {reaction.count}
                                            </span>

                                          </button>

                                        )
                                      )}

                                    </div>

                                  )}


                                  {isYou &&
                                    messageId ===
                                      latestOwnMessageId &&
                                    seenLabel && (

                                    <div className="chats-read-receipt">
                                      {seenLabel}
                                    </div>

                                  )}

                                </div>


                                {!chatMessage.isUnsent && (

                                  <button
                                    type="button"
                                    className={`chats-message-more ${
                                      menuOpen
                                        ? "is-open"
                                        : ""
                                    }`}
                                    onPointerDown={(
                                      event
                                    ) =>
                                      event.stopPropagation()
                                    }
                                    onClick={(
                                      event
                                    ) =>
                                      openMessageMenu(
                                        event,
                                        chatMessage,
                                        isYou
                                      )
                                    }
                                    aria-label="Message options"
                                    aria-expanded={
                                      menuOpen
                                    }
                                    disabled={
                                      actioning
                                    }
                                  >

                                    <Ellipsis
                                      size={16}
                                    />

                                  </button>

                                )}

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                  )}

                </div>


                {hasNewBelow && (

                  <button
                    type="button"
                    className="chats-new-messages-button"
                    onClick={() =>
                      scrollToBottom(
                        true
                      )
                    }
                  >

                    <ArrowDown
                      size={15}
                    />

                    New messages

                  </button>

                )}

              </div>


              {typingLabel && (

                <div
                  className="chats-typing-indicator"
                  role="status"
                  aria-live="polite"
                >

                  <span
                    className="chats-typing-dots"
                    aria-hidden="true"
                  >

                    <span />
                    <span />
                    <span />

                  </span>

                  <span className="chats-typing-label">
                    {typingLabel}
                  </span>

                </div>

              )}


              {/* =============================================
                  COMPOSER
              ============================================= */}

              <form
                className="chats-composer"
                onSubmit={
                  sendMessage
                }
              >

                <ChatAttachmentButton
                  groupId={
                    String(
                      selectedGroupId ||
                        ""
                    )
                  }
                  message={
                    input
                  }
                  disabled={
                    sending ||
                    uploadingAttachment ||
                    isGuest
                  }
                  onFilesSelected={
                    stageAttachmentFiles
                  }
                  onError={(
                    attachmentError
                  ) => {
                    setError(
                      attachmentError?.message ||
                        "Couldn't attach the file."
                    );
                  }}
                />


                <div className="chats-composer-input">

                  {replyingTo && (

                    <div className="chats-reply-composer">

                      <div className="chats-reply-composer-copy">

                        <strong>
                          Replying to {String(
                            replyingTo.userId
                          ) ===
                          String(
                            firebaseUser?.uid
                          )
                            ? "yourself"
                            : replyingTo.displayName ||
                              "Student"}
                        </strong>

                        <span>
                          {getReplyPreviewText(
                            replyingTo
                          )}
                        </span>

                      </div>


                      <button
                        type="button"
                        className="chats-reply-composer-close"
                        onClick={() =>
                          setReplyingTo(
                            null
                          )
                        }
                        aria-label="Cancel reply"
                        title="Cancel reply"
                      >
                        <X
                          size={16}
                        />
                      </button>

                    </div>

                  )}

                  {pendingAttachments.length >
                    0 && (
                    <div className="chats-pending-attachments-shell">

                      <div className="chats-pending-attachments-header">

                        <span className="chats-pending-attachments-count">
                          {pendingAttachments.length}

                          {pendingAttachments.length ===
                          1
                            ? " attachment"
                            : " attachments"}
                        </span>


                        <button
                          type="button"
                          className="chats-pending-clear"
                          onClick={
                            clearPendingAttachments
                          }
                          disabled={
                            sending ||
                            uploadingAttachment
                          }
                        >
                          Clear all
                        </button>

                      </div>


                      <div className="chats-pending-attachments">

                        {pendingAttachments.map(
                          (
                            item
                          ) => (
                            <div
                              key={
                                item.id
                              }
                              className={`chats-pending-attachment ${
                                item.previewUrl
                                  ? "is-image"
                                  : "is-file"
                              }`}
                            >
                              {item.previewUrl ? (
                                <img
                                  src={
                                    item.previewUrl
                                  }
                                  alt={
                                    item.file.name ||
                                    "Pending attachment"
                                  }
                                />
                              ) : (
                                <div className="chats-pending-file">

                                  <span>
                                    FILE
                                  </span>

                                  <strong
                                    title={
                                      item.file.name
                                    }
                                  >
                                    {item.file.name}
                                  </strong>

                                </div>
                              )}


                              {item.status ===


                                "uploading" && (


                                <div className="chats-pending-upload-state is-uploading">


                                  <span className="chats-pending-upload-spinner" />



                                  <span>


                                    Uploading


                                  </span>


                                </div>


                              )}




                              {item.status ===


                                "error" && (


                                <div


                                  className="chats-pending-upload-state is-error"


                                  title={


                                    item.error ||


                                    "Upload failed"


                                  }


                                >


                                  <span>


                                    Upload failed


                                  </span>


                                </div>


                              )}




                              <button


                                type="button"


                                className="chats-pending-remove"
                                onClick={() => {
                                  removePendingAttachment(
                                    item.id
                                  );
                                }}
                                aria-label={`Remove ${
                                  item.file.name ||
                                  "attachment"
                                }`}
                                title="Remove attachment"
                              disabled={
                                sending ||
                                uploadingAttachment
                              }
                              >
                                ×
                              </button>

                            </div>
                          )
                        )}

                      </div>

                    </div>
                  )}

                  <textarea
                    ref={
                      composerTextareaRef
                    }
                    value={
                      input
                    }
                    onPaste={
                      handleComposerPaste
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        event.target.value;

                      setInput(
                        value
                      );

                      handleTypingChange(
                        value
                      );
                    }}
                    onBlur={() =>
                      stopTyping()
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        sendMessage(
                          event
                        );
                      }
                    }}
                    placeholder={`Message ${selectedGroup.name}`}
                    disabled={
                      uploadingAttachment
                    }
                    rows={1}
                    maxLength={2000}
                    aria-label={`Message ${selectedGroup.name}`}
                  />

                  <span className="chats-character-count">
                    {input.length}/2000
                  </span>

                </div>


                <button
                  type="submit"
                  className="chats-send-button"
                  disabled={
                    sending ||
                    uploadingAttachment ||
                    (
                      !input.trim() &&
                      pendingAttachments.length ===
                        0
                    )
                  }
                  aria-label="Send message"
                >

                  <Send
                    size={18}
                  />

                </button>

              </form>

            </>

          )}

        </main>

      </section>


      {/* ===================================================
          FLOATING MESSAGE MENU
      =================================================== */}

      {messageMenu &&
        createPortal(

          <div
            className="chats-floating-message-menu"
            style={{
              top:
                "auto",

              bottom:
                messageMenu.bottom,

              left:
                messageMenu.left,
            }}
            onPointerDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="chats-message-reaction-picker">

              {REACTION_OPTIONS.map(
                (
                  emoji
                ) => {

                  const reactedByMe =
                    Array.isArray(
                      messageMenu.message?.reactions
                    ) &&
                    messageMenu.message.reactions.some(
                      (
                        reaction
                      ) =>
                        reaction?.emoji ===
                          emoji &&
                        String(
                          reaction?.userId ||
                            ""
                        ) ===
                          String(
                            firebaseUser?.uid ||
                              ""
                          )
                    );


                  return (

                    <button
                      key={
                        emoji
                      }
                      type="button"
                      className={`chats-message-reaction-option ${
                        reactedByMe
                          ? "is-active"
                          : ""
                      }`}
                      onClick={async () => {
                        const messageId =
                          messageMenu.message?._id;


                        setMessageMenu(
                          null
                        );


                        await handleReactionToggle(
                          messageId,
                          emoji
                        );
                      }}
                      aria-label={`React with ${emoji}`}
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>

                  );
                }
              )}

            </div>


            <div className="chats-message-menu-divider" />


            <button
              type="button"
              className="chats-message-menu-item"
              onClick={() =>
                startReply(
                  messageMenu.message
                )
              }
            >

              <Reply
                size={14}
              />

              <span>
                Reply
              </span>

            </button>


            {messageMenu.isYou && (

              <button
                type="button"
                className="chats-message-menu-item is-danger"
                onClick={() =>
                  requestMessageAction(
                    "unsend",
                    messageMenu.message
                  )
                }
              >

                <Undo2
                  size={14}
                />

                <span>
                  Unsend
                </span>

              </button>

            )}


            <button
              type="button"
              className="chats-message-menu-item"
              onClick={() =>
                requestMessageAction(
                  "delete",
                  messageMenu.message
                )
              }
            >

              <Trash2
                size={14}
              />

              <span>
                Delete for me
              </span>

            </button>

          </div>,

          document.body
        )}


      {/* ===================================================
          CONFIRMATION DIALOG
      =================================================== */}

      {confirmAction &&
        createPortal(

          <div
            className="chats-confirm-backdrop"
            role="presentation"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                  event.currentTarget &&
                !actioningMessageId
              ) {
                setConfirmAction(
                  null
                );
              }
            }}
          >

            <div
              className="chats-confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="chats-confirm-title"
            >

              <button
                type="button"
                className="chats-confirm-close"
                onClick={() =>
                  setConfirmAction(
                    null
                  )
                }
                disabled={
                  Boolean(
                    actioningMessageId
                  )
                }
                aria-label="Close"
              >

                <X
                  size={17}
                />

              </button>


              <span
                className={`chats-confirm-icon ${
                  confirmAction.type ===
                  "unsend"
                    ? "is-danger"
                    : ""
                }`}
              >

                {confirmAction.type ===
                "unsend" ? (

                  <Undo2
                    size={20}
                  />

                ) : (

                  <Trash2
                    size={20}
                  />

                )}

              </span>


              <h3 id="chats-confirm-title">

                {confirmAction.type ===
                "unsend"
                  ? "Unsend message?"
                  : "Delete message for you?"}

              </h3>


              <p>

                {confirmAction.type ===
                "unsend"
                  ? "The original message will be removed for everyone in this group."
                  : "This message will disappear from your chat only. Other members can still see it."}

              </p>


              <div className="chats-confirm-preview">

                {confirmAction.message?.message ||
                  "This message was unsent"}

              </div>


              <div className="chats-confirm-actions">

                <button
                  type="button"
                  className="chats-confirm-cancel"
                  onClick={() =>
                    setConfirmAction(
                      null
                    )
                  }
                  disabled={
                    Boolean(
                      actioningMessageId
                    )
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className={`chats-confirm-submit ${
                    confirmAction.type ===
                    "unsend"
                      ? "is-danger"
                      : ""
                  }`}
                  onClick={
                    runConfirmedAction
                  }
                  disabled={
                    Boolean(
                      actioningMessageId

                    )
                  }
                >

                  {actioningMessageId
                    ? "Working..."
                    : confirmAction.type ===
                      "unsend"
                    ? "Unsend"
                    : "Delete for me"}

                </button>

              </div>

            </div>

          </div>,

          document.body
        )}

    </div>
  );
}


export default Chats;















