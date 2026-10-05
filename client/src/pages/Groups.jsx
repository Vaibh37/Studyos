import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronLeft,
  ChevronDown,
  Globe2,
  LockKeyhole,
  Copy,
  Crown,
  LogIn,
  MessageCircle,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  NavLink,
} from "react-router";

import {
  useAuth,
} from "../context/AuthContext";

import apiRequest from "../services/api";

import {
  connectSocket,
} from "../socket";

import "../styles/groups-v2.css";


// =========================================================
// HELPERS
// =========================================================

const formatElapsed =
  (
    startedAt,
    now
  ) => {
    const start =
      new Date(
        startedAt
      ).getTime();

    if (
      !Number.isFinite(
        start
      )
    ) {
      return "0m";
    }

    const totalSeconds =
      Math.max(
        0,
        Math.floor(
          (
            now -
            start
          ) /
            1000
        )
      );

    const hours =
      Math.floor(
        totalSeconds /
          3600
      );

    const minutes =
      Math.floor(
        (
          totalSeconds %
          3600
        ) /
          60
      );

    const seconds =
      totalSeconds %
      60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  };


const formatLeaderboardTime =
  (
    seconds
  ) => {
    const safeSeconds =
      Math.max(
        0,
        Math.floor(
          Number(
            seconds
          ) || 0
        )
      );

    const hours =
      Math.floor(
        safeSeconds /
          3600
      );

    const minutes =
      Math.floor(
        (
          safeSeconds %
          3600
        ) /
          60
      );

    const secs =
      safeSeconds %
      60;

    if (
      hours > 0
    ) {
      return `${hours}h ${minutes}m`;
    }

    if (
      minutes > 0
    ) {
      return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
  };


const getInitial =
  (
    value
  ) => {
    const text =
      String(
        value ||
        "S"
      ).trim();

    return text
      .charAt(0)
      .toUpperCase() ||
      "S";
  };


// =========================================================
// GROUPS
// =========================================================

function Groups() {
  const {
    isGuest,
    firebaseUser,
  } = useAuth();


  // =======================================================
  // DATA
  // =======================================================

  const [
    groups,
    setGroups,
  ] = useState([]);

  const [
    selectedGroupId,
    setSelectedGroupId,
  ] = useState("");

  const [
    mobileGroupOpen,
    setMobileGroupOpen,
  ] = useState(false);

  const [
    mobileActionOpen,
    setMobileActionOpen,
  ] = useState(null);

  const [
    mobileMembersOpen,
    setMobileMembersOpen,
  ] = useState(false);

  const [
    members,
    setMembers,
  ] = useState([]);

  const [
    liveUsers,
    setLiveUsers,
  ] = useState([]);

  const [
    leaderboard,
    setLeaderboard,
  ] = useState([]);

  const [
    loadingLeaderboard,
    setLoadingLeaderboard,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingGroup,
    setLoadingGroup,
  ] = useState(false);

  const [
    now,
    setNow,
  ] = useState(
    Date.now()
  );


  // =======================================================
  // CREATE GROUP
  // =======================================================

  const [
    groupName,
    setGroupName,
  ] = useState("");

  const [
    groupDescription,
    setGroupDescription,
  ] = useState("");

  const [
    groupVisibility,
    setGroupVisibility,
  ] = useState(
    "private"
  );

  const [
    visibilityMenuOpen,
    setVisibilityMenuOpen,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);


  // =======================================================
  // JOIN GROUP
  // =======================================================

  const [
    inviteCode,
    setInviteCode,
  ] = useState("");

  const [
    joining,
    setJoining,
  ] = useState(false);


  // =======================================================
  // FEEDBACK
  // =======================================================

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    regenerating,
    setRegenerating,
  ] = useState(false);


  // =======================================================
  // DERIVED
  // =======================================================

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


  const sortedLiveUsers =
    useMemo(
      () =>
        [
          ...liveUsers,
        ].sort(
          (
            first,
            second
          ) =>
            new Date(
              first.startedAt
            ) -
            new Date(
              second.startedAt
            )
        ),
      [
        liveUsers,
      ]
    );


  const canManageInvite =
    selectedGroup?.role ===
      "owner" ||
    selectedGroup?.role ===
      "admin";


  // =======================================================
  // FEEDBACK HELPERS
  // =======================================================

  const showMessage =
    (
      text
    ) => {
      setError("");
      setMessage(
        text
      );

      window.setTimeout(
        () => {
          setMessage("");
        },
        3000
      );
    };


  const showError =
    (
      text
    ) => {
      setMessage("");
      setError(
        text
      );
    };


  // =======================================================
  // LOAD GROUPS
  // =======================================================

  const loadGroups =
    async (
      preferredGroupId =
        null
    ) => {
      if (isGuest) {
        setGroups([]);
        setSelectedGroupId("");
        return [];
      }

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

      setSelectedGroupId(
        (
          current
        ) => {
          const preferred =
            preferredGroupId
              ? String(
                  preferredGroupId
                )
              : "";

          if (
            preferred &&
            nextGroups.some(
              (
                group
              ) =>
                String(
                  group._id
                ) ===
                preferred
            )
          ) {
            return preferred;
          }

          if (
            current &&
            nextGroups.some(
              (
                group
              ) =>
                String(
                  group._id
                ) ===
                String(
                  current
                )
            )
          ) {
            return current;
          }

          return nextGroups[0]?._id
            ? String(
                nextGroups[0]._id
              )
            : "";
        }
      );

      return nextGroups;
    };


  // =======================================================
  // LOAD MEMBERS
  // =======================================================

  const loadMembers =
    async (
      groupId
    ) => {
      if (
        isGuest ||
        !groupId
      ) {
        setMembers([]);
        return;
      }

      try {
        setLoadingGroup(true);

        const data =
          await apiRequest(
            `/api/groups/${groupId}/members`
          );

        setMembers(
          Array.isArray(
            data?.members
          )
            ? data.members
            : []
        );
      } finally {
        setLoadingGroup(false);
      }
    };


  // =======================================================
  // LOAD LEADERBOARD
  // =======================================================

  const loadLeaderboard =
    async (
      groupId
    ) => {
      if (
        isGuest ||
        !groupId
      ) {
        setLeaderboard([]);
        return [];
      }

      try {
        setLoadingLeaderboard(
          true
        );

        const data =
          await apiRequest(
            `/api/groups/${groupId}/leaderboard`
          );

        const nextLeaderboard =
          Array.isArray(
            data?.leaderboard
          )
            ? data.leaderboard
            : [];

        setLeaderboard(
          nextLeaderboard
        );

        return nextLeaderboard;
      } finally {
        setLoadingLeaderboard(
          false
        );
      }
    };


  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const initialize =
        async () => {
          try {
            setLoading(true);
            setError("");

            if (!isGuest) {
              await loadGroups();
            }
          } catch (
            loadError
          ) {
            console.error(
              "Groups load failed:",
              loadError
            );

            if (!cancelled) {
              showError(
                loadError?.message ||
                  "Couldn't load your study groups."
              );
            }
          } finally {
            if (!cancelled) {
              setLoading(false);
            }
          }
        };

      initialize();

      return () => {
        cancelled =
          true;
      };
    },
    [
      isGuest,
    ]
  );


  // =======================================================
  // SELECTED GROUP MEMBERS
  // =======================================================

  useEffect(
    () => {
      if (
        isGuest ||
        !selectedGroupId
      ) {
        setMembers([]);
        return;
      }

      loadMembers(
        selectedGroupId
      ).catch(
        (
          memberError
        ) => {
          console.error(
            "Group members load failed:",
            memberError
          );

          showError(
            memberError?.message ||
              "Couldn't load group members."
          );
        }
      );
    },
    [
      isGuest,
      selectedGroupId,
    ]
  );


  // =======================================================
  // SELECTED GROUP LEADERBOARD
  // =======================================================

  useEffect(
    () => {
      if (
        isGuest ||
        !selectedGroupId
      ) {
        setLeaderboard([]);
        return;
      }

      loadLeaderboard(
        selectedGroupId
      ).catch(
        (
          leaderboardError
        ) => {
          console.error(
            "Group leaderboard load failed:",
            leaderboardError
          );

          showError(
            leaderboardError?.message ||
              "Couldn't load the group leaderboard."
          );
        }
      );
    },
    [
      isGuest,
      selectedGroupId,
    ]
  );


  // =======================================================
  // REALTIME LIVE STUDY USERS
  // =======================================================

  useEffect(
    () => {
      if (
        isGuest ||
        !selectedGroupId
      ) {
        setLiveUsers([]);
        return undefined;
      }

      let active =
        true;

      let connectedSocket =
        null;

      const handleLiveUsers =
        (
          sessions
        ) => {
          if (!active) {
            return;
          }

          const next =
            Array.isArray(
              sessions
            )
              ? sessions.filter(
                  (
                    session
                  ) =>
                    String(
                      session.groupId
                    ) ===
                    String(
                      selectedGroupId
                    )
                )
              : [];

          setLiveUsers(
            next
          );
        };

      const handleLeaderboardUpdated =
        (
          payload = {}
        ) => {
          if (
            !active ||
            String(
              payload.groupId
            ) !==
              String(
                selectedGroupId
              )
          ) {
            return;
          }

          loadLeaderboard(
            selectedGroupId
          ).catch(
            (
              leaderboardError
            ) => {
              console.error(
                "Realtime leaderboard refresh failed:",
                leaderboardError
              );
            }
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

            if (!socket.connected) {
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
                            "Realtime connection timed out"
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
            }

            if (!active) {
              return;
            }

            socket.on(
              "focus:live-users",
              handleLiveUsers
            );

            socket.on(
              "group:leaderboard-updated",
              handleLeaderboardUpdated
            );

            socket.emit(
              "group:join",
              {
                groupId:
                  String(
                    selectedGroupId
                  ),
              },
              (
                response
              ) => {
                if (
                  !response?.ok &&
                  active
                ) {
                  showError(
                    response?.message ||
                      "Couldn't join the realtime group room."
                  );
                }
              }
            );
          } catch (
            socketError
          ) {
            console.error(
              "Group realtime connection failed:",
              socketError
            );

            if (active) {
              showError(
                "Group loaded, but live presence couldn't connect."
              );
            }
          }
        };

      setLiveUsers([]);
      connect();

      return () => {
        active =
          false;

        if (connectedSocket) {
          connectedSocket.off(
            "focus:live-users",
            handleLiveUsers
          );

          connectedSocket.off(
            "group:leaderboard-updated",
            handleLeaderboardUpdated
          );
        }
      };
    },
    [
      isGuest,
      selectedGroupId,
    ]
  );


  // =======================================================
  // LIVE ELAPSED CLOCK
  // =======================================================

  useEffect(
    () => {
      if (
        liveUsers.length ===
        0
      ) {
        return undefined;
      }

      setNow(
        Date.now()
      );

      const interval =
        window.setInterval(
          () => {
            setNow(
              Date.now()
            );
          },
          1000
        );

      return () => {
        window.clearInterval(
          interval
        );
      };
    },
    [
      liveUsers.length,
    ]
  );


  // =======================================================
  // CREATE
  // =======================================================

  const createGroup =
    async (
      event
    ) => {
      event.preventDefault();

      const name =
        groupName.trim();

      if (
        name.length < 2
      ) {
        showError(
          "Group name must be at least 2 characters."
        );

        return;
      }

      try {
        setCreating(true);
        setError("");

        const data =
          await apiRequest(
            "/api/groups",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  name,

                  description:
                    groupDescription.trim(),

                  visibility:
                    groupVisibility,
                }),
            }
          );

        const createdId =
          data?.group?._id ||
          null;

        setGroupName("");
        setGroupDescription("");

        setGroupVisibility(
          "private"
        );

        await loadGroups(
          createdId
        );

        showMessage(
          "Study group created"
        );
      } catch (
        createError
      ) {
        console.error(
          "Create group failed:",
          createError
        );

        showError(
          createError?.message ||
            "Couldn't create the group."
        );
      } finally {
        setCreating(false);
      }
    };


  // =======================================================
  // JOIN
  // =======================================================

  const joinGroup =
    async (
      event
    ) => {
      event.preventDefault();

      const code =
        inviteCode
          .trim()
          .toUpperCase();

      if (!code) {
        showError(
          "Enter an invite code."
        );

        return;
      }

      try {
        setJoining(true);
        setError("");

        const data =
          await apiRequest(
            "/api/groups/join",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  inviteCode:
                    code,
                }),
            }
          );

        const joinedId =
          data?.group?._id ||
          data?.groupId ||
          null;

        setInviteCode("");

        await loadGroups(
          joinedId
        );

        showMessage(
          "Joined study group"
        );
      } catch (
        joinError
      ) {
        console.error(
          "Join group failed:",
          joinError
        );

        showError(
          joinError?.message ||
            "Couldn't join the group."
        );
      } finally {
        setJoining(false);
      }
    };


  // =======================================================
  // COPY INVITE
  // =======================================================

  const copyInviteCode =
    async () => {
      if (
        !selectedGroup?.inviteCode
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          selectedGroup.inviteCode
        );

        setCopied(true);

        window.setTimeout(
          () => {
            setCopied(false);
          },
          1600
        );
      } catch (
        copyError
      ) {
        console.error(
          "Copy invite failed:",
          copyError
        );

        showError(
          "Couldn't copy the invite code."
        );
      }
    };


  // =======================================================
  // REGENERATE INVITE
  // =======================================================

  const regenerateInviteCode =
    async () => {
      if (
        !selectedGroupId ||
        !canManageInvite
      ) {
        return;
      }

      try {
        setRegenerating(true);
        setError("");

        await apiRequest(
          `/api/groups/${selectedGroupId}/invite-code/regenerate`,
          {
            method:
              "POST",
          }
        );

        await loadGroups(
          selectedGroupId
        );

        showMessage(
          "Invite code regenerated"
        );
      } catch (
        regenerateError
      ) {
        console.error(
          "Invite regeneration failed:",
          regenerateError
        );

        showError(
          regenerateError?.message ||
            "Couldn't regenerate the invite code."
        );
      } finally {
        setRegenerating(false);
      }
    };


  // =======================================================
  // REFRESH
  // =======================================================

  const refresh =
    async () => {
      if (isGuest) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        await loadGroups(
          selectedGroupId
        );

        if (selectedGroupId) {
          await Promise.all([
            loadMembers(
              selectedGroupId
            ),

            loadLeaderboard(
              selectedGroupId
            ),
          ]);
        }

        showMessage(
          "Study groups refreshed"
        );
      } catch (
        refreshError
      ) {
        console.error(
          "Groups refresh failed:",
          refreshError
        );

        showError(
          refreshError?.message ||
            "Couldn't refresh study groups."
        );
      } finally {
        setLoading(false);
      }
    };


  // =======================================================
  // GUEST
  // =======================================================

  if (isGuest) {
    return (
      <div className="v2g-page">

        <header className="v2g-header">

          <div>

            <span className="v2g-eyebrow">
              Social study
            </span>

            <h1>
              Study Groups
            </h1>

            <p>
              Sign in to create groups, join friends and see who is studying live.
            </p>

          </div>

        </header>


        <section className="v2g-empty-card">

          <UsersRound
            size={30}
          />

          <h2>
            Groups need an account
          </h2>

          <p>
            Guest study data stays local. Sign in when you want realtime group features.
          </p>

        </section>

      </div>
    );
  }


  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="v2g-page">

      <header className="v2g-header">

        <div>

          <span className="v2g-eyebrow">
            Social study
          </span>

          <h1>
            Study Groups
          </h1>

          <p>
            Create a room, invite your friends and see shared Focus sessions as they happen.
          </p>

        </div>


        <button
          type="button"
          className="v2g-refresh"
          onClick={
            refresh
          }
          disabled={
            loading
          }
        >

          <RefreshCw
            size={17}
          />

          Refresh

        </button>

      </header>


      {message && (
        <div className="v2g-message is-success">
          {message}
        </div>
      )}


      {error && (
        <div className="v2g-message is-error">
          {error}
        </div>
      )}


      <section className="v2g-actions-grid">

        <form
          className={`v2g-action-card ${
            mobileActionOpen === "create"
              ? "is-mobile-expanded"
              : ""
          }`}
          onSubmit={
            createGroup
          }
        >

          <button
            type="button"
            className="v2g-mobile-action-toggle"
            onClick={() =>
              setMobileActionOpen(
                mobileActionOpen ===
                  "create"
                  ? null
                  : "create"
              )
            }
            aria-expanded={
              mobileActionOpen ===
              "create"
            }
          >
            <span className="v2g-mobile-action-toggle-icon">
              <Plus size={18} />
            </span>

            <span className="v2g-mobile-action-toggle-copy">
              <strong>
                Create
              </strong>

              <small>
                New room
              </small>
            </span>

            <ChevronDown
              size={17}
              className="v2g-mobile-action-chevron"
            />
          </button>


          <div className="v2g-action-heading">

            <span className="v2g-action-icon">

              <Plus
                size={18}
              />

            </span>


            <div>

              <h2>
                Create group
              </h2>

              <p>
                Start a new study room and invite people with a code.
              </p>

            </div>

          </div>


          <input
            type="text"
            value={
              groupName
            }
            onChange={(
              event
            ) =>
              setGroupName(
                event.target.value
              )
            }
            placeholder="Group name"
            maxLength={60}
          />


          <textarea
            value={
              groupDescription
            }
            onChange={(
              event
            ) =>
              setGroupDescription(
                event.target.value
              )
            }
            placeholder="Description (optional)"
            maxLength={300}
            rows={3}
          />


          <div className="v2g-action-row">

            <div
              className="v2g-visibility-field"
              onBlur={(
                event
              ) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget
                  )
                ) {
                  setVisibilityMenuOpen(
                    false
                  );
                }
              }}
            >

              <button
                type="button"
                className={`v2g-visibility-trigger ${
                  visibilityMenuOpen
                    ? "is-open"
                    : ""
                }`}
                aria-haspopup="listbox"
                aria-expanded={
                  visibilityMenuOpen
                }
                onClick={() =>
                  setVisibilityMenuOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
              >

                <span className="v2g-visibility-trigger-main">

                  <span className="v2g-visibility-trigger-icon">

                    {groupVisibility ===
                    "public" ? (

                      <Globe2
                        size={15}
                      />

                    ) : (

                      <LockKeyhole
                        size={15}
                      />

                    )}

                  </span>


                  <span className="v2g-visibility-trigger-copy">

                    <strong>
                      {groupVisibility ===
                      "public"
                        ? "Public"
                        : "Private"}
                    </strong>

                    <small>
                      {groupVisibility ===
                      "public"
                        ? "Anyone with access can discover it"
                        : "Invite code required to join"}
                    </small>

                  </span>

                </span>


                <ChevronDown
                  size={15}
                  className={`v2g-visibility-chevron ${
                    visibilityMenuOpen
                      ? "is-open"
                      : ""
                  }`}
                />

              </button>


              {visibilityMenuOpen && (

                <div
                  className="v2g-visibility-menu"
                  role="listbox"
                  aria-label="Group visibility"
                >

                  <button
                    type="button"
                    className={`v2g-visibility-option ${
                      groupVisibility ===
                      "private"
                        ? "is-selected"
                        : ""
                    }`}
                    role="option"
                    aria-selected={
                      groupVisibility ===
                      "private"
                    }
                    onClick={() => {
                      setGroupVisibility(
                        "private"
                      );

                      setVisibilityMenuOpen(
                        false
                      );
                    }}
                  >

                    <span className="v2g-visibility-option-icon">

                      <LockKeyhole
                        size={15}
                      />

                    </span>


                    <span className="v2g-visibility-option-copy">

                      <strong>
                        Private
                      </strong>

                      <small>
                        Only people with an invite code can join
                      </small>

                    </span>


                    {groupVisibility ===
                      "private" && (

                      <Check
                        size={15}
                        className="v2g-visibility-check"
                      />

                    )}

                  </button>


                  <button
                    type="button"
                    className={`v2g-visibility-option ${
                      groupVisibility ===
                      "public"
                        ? "is-selected"
                        : ""
                    }`}
                    role="option"
                    aria-selected={
                      groupVisibility ===
                      "public"
                    }
                    onClick={() => {
                      setGroupVisibility(
                        "public"
                      );

                      setVisibilityMenuOpen(
                        false
                      );
                    }}
                  >

                    <span className="v2g-visibility-option-icon">

                      <Globe2
                        size={15}
                      />

                    </span>


                    <span className="v2g-visibility-option-copy">

                      <strong>
                        Public
                      </strong>

                      <small>
                        Visible and open for people to discover
                      </small>

                    </span>


                    {groupVisibility ===
                      "public" && (

                      <Check
                        size={15}
                        className="v2g-visibility-check"
                      />

                    )}

                  </button>

                </div>

              )}

            </div>


            <button
              type="submit"
              className="v2g-primary-button"
              disabled={
                creating
              }
            >

              {creating
                ? "Creating..."
                : "Create"}

            </button>

          </div>

        </form>


        <form
          className={`v2g-action-card ${
            mobileActionOpen === "join"
              ? "is-mobile-expanded"
              : ""
          }`}
          onSubmit={
            joinGroup
          }
        >

          <button
            type="button"
            className="v2g-mobile-action-toggle"
            onClick={() =>
              setMobileActionOpen(
                mobileActionOpen ===
                  "join"
                  ? null
                  : "join"
              )
            }
            aria-expanded={
              mobileActionOpen ===
              "join"
            }
          >
            <span className="v2g-mobile-action-toggle-icon">
              <LogIn size={18} />
            </span>

            <span className="v2g-mobile-action-toggle-copy">
              <strong>
                Join
              </strong>

              <small>
                Use a code
              </small>
            </span>

            <ChevronDown
              size={17}
              className="v2g-mobile-action-chevron"
            />
          </button>


          <div className="v2g-action-heading">

            <span className="v2g-action-icon">

              <LogIn
                size={18}
              />

            </span>


            <div>

              <h2>
                Join group
              </h2>

              <p>
                Enter a group invite code and jump straight into the room.
              </p>

            </div>

          </div>


          <div className="v2g-join-spacer" />


          <input
            type="text"
            value={
              inviteCode
            }
            onChange={(
              event
            ) =>
              setInviteCode(
                event.target.value.toUpperCase()
              )
            }
            placeholder="Invite code"
            maxLength={32}
            autoCapitalize="characters"
          />


          <button
            type="submit"
            className="v2g-secondary-button"
            disabled={
              joining
            }
          >

            <LogIn
              size={16}
            />

            {joining
              ? "Joining..."
              : "Join group"}

          </button>

        </form>

      </section>


      <section className="v2g-groups-section">

        <div className="v2g-section-heading">

          <div>

            <span className="v2g-eyebrow">
              Your rooms
            </span>

            <h2>
              My Groups
            </h2>

          </div>


          <span className="v2g-count-pill">
            {groups.length}{" "}
            {groups.length ===
            1
              ? "group"
              : "groups"}
          </span>

        </div>


        {loading ? (

          <div className="v2g-empty-card compact">

            <RefreshCw
              size={24}
            />

            <h3>
              Loading groups...
            </h3>

          </div>

        ) : groups.length ===
        0 ? (

          <div className="v2g-empty-card compact">

            <UsersRound
              size={26}
            />

            <h3>
              No groups yet
            </h3>

            <p>
              Create one above or join a friend's room with an invite code.
            </p>

          </div>

        ) : (

          <div className="v2g-group-grid">

            {groups.map(
              (
                group
              ) => {
                const active =
                  String(
                    group._id
                  ) ===
                  String(
                    selectedGroupId
                  );

                return (
                  <button
                    type="button"
                    key={
                      group._id
                    }
                    className={`v2g-group-card ${
                      active
                        ? "is-active"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedGroupId(
                        String(
                          group._id
                        )
                      );

                      setMobileGroupOpen(
                        true
                      );
                    }}
                  >

                    <div className="v2g-group-card-top">

                      <span className="v2g-group-avatar">
                        {getInitial(
                          group.name
                        )}
                      </span>

                      <span className="v2g-role-pill">
                        {group.role ||
                          "member"}
                      </span>

                    </div>


                    <strong>
                      {group.name}
                    </strong>


                    <p>
                      {group.description ||
                        "A StudyOS study group."}
                    </p>


                    <span className="v2g-group-meta">

                      {Number(
                        group.memberCount
                      ) ||
                        1}{" "}

                      members Â·{" "}

                      {group.visibility ||
                        "private"}

                    </span>

                  </button>
                );
              }
            )}

          </div>

        )}

      </section>


      {selectedGroup && (

        <section
          className={`v2g-room ${
            mobileGroupOpen
              ? "is-mobile-open"
              : ""
          }`}
        >

          <div className="v2g-room-header">

            <button
              type="button"
              className="v2g-mobile-room-back"
              onClick={() =>
                setMobileGroupOpen(
                  false
                )
              }
              aria-label="Back to groups"
              title="Back to groups"
            >
              <ChevronLeft
                size={20}
              />
            </button>

            <div className="v2g-room-title">

              <span className="v2g-group-avatar large">
                {getInitial(
                  selectedGroup.name
                )}
              </span>


              <div>

                <span className="v2g-eyebrow">
                  Open group
                </span>

                <h2>
                  {selectedGroup.name}
                </h2>

                <p>
                  {selectedGroup.description ||
                    "Study together and share Focus activity live."}
                </p>

              </div>

            </div>


            <div className="v2g-room-tags">

              <span>
                {selectedGroup.role ||
                  "member"}
              </span>

              <span>
                {selectedGroup.visibility ||
                  "private"}
              </span>

              <NavLink
                to={`/app/chats?group=${selectedGroupId}`}
                className="v2g-secondary-button"
                style={{
                  textDecoration:
                    "none",
                }}
              >
                <MessageCircle
                  size={15}
                />

                Open chat
              </NavLink>

            </div>

          </div>


          <div className="v2g-room-grid">

            <article className="v2g-panel v2g-live-panel">

              <div className="v2g-panel-heading">

                <div>

                  <span className="v2g-eyebrow">
                    Realtime
                  </span>

                  <h3>
                    Studying now
                  </h3>

                </div>


                <span className="v2g-live-count">

                  <Radio
                    size={15}
                  />

                  {sortedLiveUsers.length}

                </span>

              </div>


              {sortedLiveUsers.length ===
              0 ? (

                <div className="v2g-panel-empty">

                  <Radio
                    size={22}
                  />

                  <strong>
                    Nobody is studying right now
                  </strong>

                  <span>
                    Start a Focus session and share it with {selectedGroup.name}.
                  </span>

                </div>

              ) : (

                <div className="v2g-live-list">

                  {sortedLiveUsers.map(
                    (
                      liveUser
                    ) => {
                      const isYou =
                        String(
                          liveUser.userId
                        ) ===
                        String(
                          firebaseUser?.uid
                        );

                      const name =
                        isYou
                          ? "You"
                          : liveUser.displayName ||
                            "Student";

                      return (
                        <div
                          className="v2g-live-user"
                          key={
                            liveUser._id ||
                            liveUser.userId
                          }
                        >

                          {liveUser.picture ? (

                            <img
                              src={
                                liveUser.picture
                              }
                              alt=""
                              className="v2g-member-picture"
                            />

                          ) : (

                            <span className="v2g-member-avatar">
                              {getInitial(
                                name
                              )}
                            </span>

                          )}


                          <div className="v2g-live-copy">

                            <div>

                              <strong>
                                {name}
                              </strong>

                              <span className="v2g-live-dot" />

                            </div>

                            <span>
                              {liveUser.subjectName ||
                                "General Study"}
                            </span>

                          </div>


                          <strong className="v2g-live-time">
                            {formatElapsed(
                              liveUser.startedAt,
                              now
                            )}
                          </strong>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </article>


            <article className="v2g-panel">

              <div className="v2g-panel-heading">

                <div>

                  <span className="v2g-eyebrow">
                    Access
                  </span>

                  <h3>
                    Invite code
                  </h3>

                </div>

              </div>


              <div className="v2g-invite-box">

                <code>
                  {selectedGroup.inviteCode ||
                    "â€”"}
                </code>


                <button
                  type="button"
                  onClick={
                    copyInviteCode
                  }
                  disabled={
                    !selectedGroup.inviteCode
                  }
                  aria-label="Copy invite code"
                >

                  {copied ? (

                    <Check
                      size={17}
                    />

                  ) : (

                    <Copy
                      size={17}
                    />

                  )}

                </button>

              </div>


              <p className="v2g-panel-copy">
                Anyone with this code can join the group.
              </p>


              {canManageInvite && (

                <button
                  type="button"
                  className="v2g-secondary-button full"
                  onClick={
                    regenerateInviteCode
                  }
                  disabled={
                    regenerating
                  }
                >

                  <RefreshCw
                    size={16}
                  />

                  {regenerating
                    ? "Regenerating..."
                    : "Regenerate code"}

                </button>

              )}

            </article>


            <article
              className={`v2g-panel v2g-members-panel ${
                mobileMembersOpen
                  ? "is-mobile-expanded"
                  : ""
              }`}
            >

              <div
                className="v2g-panel-heading v2g-members-toggle"
                role="button"
                tabIndex={0}
                aria-expanded={mobileMembersOpen}
                onClick={() => {
                  setMobileMembersOpen(
                    (open) =>
                      !open
                  );
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();

                    setMobileMembersOpen(
                      (open) =>
                        !open
                    );
                  }
                }}
              >

                <div>

                  <span className="v2g-eyebrow">
                    People
                  </span>

                  <h3>
                    Members
                  </h3>

                </div>


                <span className="v2g-count-pill">
                  {members.length}
                </span>

                <ChevronDown
                  size={17}
                  className="v2g-members-chevron"
                />

              </div>


              {loadingGroup ? (

                <div className="v2g-panel-empty small">

                  <RefreshCw
                    size={20}
                  />

                  <span>
                    Loading members...
                  </span>

                </div>

              ) : (

                <div className="v2g-member-list">

                  {members.map(
                    (
                      member
                    ) => (
                      <div
                        className="v2g-member-row"
                        key={
                          member._id ||
                          member.userId
                        }
                      >

                        {member.picture ? (

                          <img
                            src={
                              member.picture
                            }
                            alt=""
                            className="v2g-member-picture"
                          />

                        ) : (

                          <span className="v2g-member-avatar">
                            {getInitial(
                              member.displayName ||
                                "Student"
                            )}
                          </span>

                        )}


                        <div className="v2g-member-copy">

                          <strong>

                            {String(
                              member.userId
                            ) ===
                            String(
                              firebaseUser?.uid
                            )
                              ? "You"
                              : member.displayName ||
                                "Student"}

                          </strong>

                          <span>
                            {member.role ||
                              "member"}
                          </span>

                        </div>


                        <span className="v2g-role-icon">

                          {member.role ===
                          "owner" ? (

                            <Crown
                              size={16}
                            />

                          ) : member.role ===
                            "admin" ? (

                            <ShieldCheck
                              size={16}
                            />

                          ) : (

                            <UserRound
                              size={16}
                            />

                          )}

                        </span>

                      </div>
                    )
                  )}

                </div>

              )}

            </article>


            <article className="v2g-panel v2g-leaderboard-panel">

            <div className="v2g-panel-heading">

              <div>

                <span className="v2g-eyebrow">
                  This week
                </span>

                <h3>
                  Group leaderboard
                </h3>

              </div>


              <span className="v2g-leaderboard-title-icon">

                <Trophy
                  size={17}
                />

              </span>

            </div>


            {loadingLeaderboard ? (

              <div className="v2g-panel-empty small">

                <RefreshCw
                  size={20}
                />

                <span>
                  Loading leaderboard...
                </span>

              </div>

            ) : leaderboard.length ===
            0 ? (

              <div className="v2g-panel-empty small">

                <Trophy
                  size={22}
                />

                <strong>
                  No leaderboard data yet
                </strong>

                <span>
                  Finish a shared Focus session in {selectedGroup.name} to start the ranking.
                </span>

              </div>

            ) : (

              <div className="v2g-leaderboard-list">

                {leaderboard.map(
                  (
                    entry
                  ) => {
                    const isYou =
                      String(
                        entry.userId
                      ) ===
                      String(
                        firebaseUser?.uid
                      );

                    const displayName =
                      isYou
                        ? "You"
                        : entry.displayName ||
                          "Student";

                    return (
                      <div
                        className={`v2g-leaderboard-row ${
                          isYou
                            ? "is-you"
                            : ""
                        }`}
                        key={
                          entry.userId
                        }
                      >

                        <div
                          className={`v2g-rank ${
                            Number(
                              entry.rank
                            ) <= 3
                              ? `is-top-${entry.rank}`
                              : ""
                          }`}
                        >

                          {Number(
                            entry.rank
                          ) === 1 ? (

                            <Crown
                              size={16}
                            />

                          ) : (

                            <span>
                              #{entry.rank}
                            </span>

                          )}

                        </div>


                        {entry.picture ? (

                          <img
                            src={
                              entry.picture
                            }
                            alt=""
                            className="v2g-member-picture"
                          />

                        ) : (

                          <span className="v2g-member-avatar">
                            {getInitial(
                              displayName
                            )}
                          </span>

                        )}


                        <div className="v2g-leaderboard-copy">

                          <div>

                            <strong>
                              {displayName}
                            </strong>


                            {isYou && (

                              <span className="v2g-you-pill">
                                You
                              </span>

                            )}

                          </div>


                          <span>

                            {Number(
                              entry.sessionCount
                            ) || 0}{" "}

                            {Number(
                              entry.sessionCount
                            ) === 1
                              ? "session"
                              : "sessions"}

                            {" Â· "}

                            {entry.role ||
                              "member"}

                          </span>

                        </div>


                        <strong className="v2g-leaderboard-time">

                          {formatLeaderboardTime(
                            entry.totalSeconds
                          )}

                        </strong>

                      </div>
                    );
                  }
                )}

              </div>

            )}

            </article>

          </div>

        </section>

      )}

    </div>
  );
}


export default Groups;
