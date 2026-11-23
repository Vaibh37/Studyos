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
  Share2,
  Crown,
  LogIn,
  MessageCircle,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Trophy,
  MoreHorizontal,
  Trash2,
  LogOut,
  Link2,
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
import { getTurnstileToken } from "../services/turnstile";

import {
  connectSocket,
} from "../socket";

import GroupActions from "../components/groups/GroupActions";
import MobileGroupActions from "../components/groups/MobileGroupActions";
import "../styles/groups-v2.css";
import "../styles/groups-polish.css";
import "../styles/community-clean.css";
import "../styles/group-management.css";


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

function CommunityAvatar({ src, name }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className="v2g-member-avatar"
        aria-hidden="true"
      >
        {getInitial(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="v2g-member-picture"
      onError={() => setFailed(true)}
    />
  );
}

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
  ] = useState(() => window.matchMedia("(min-width: 761px)").matches);

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

  const [memberMenu, setMemberMenu] = useState("");
  const [groupActionBusy, setGroupActionBusy] = useState(false);


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



  const inviteLink = selectedGroup?.inviteCode
    ? new URL(
        "/app/groups?invite=" + encodeURIComponent(selectedGroup.inviteCode),
        window.location.origin
      ).href
    : "";

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
        const turnstileToken = await getTurnstileToken("group-create");

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
                  turnstileToken,
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
        return true;
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
        const turnstileToken = await getTurnstileToken("group-join");

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
                  turnstileToken,
                }),
            }
          );

        const joinedId =
          data?.group?._id ||
          data?.groupId ||
          null;

        setInviteCode("");

        const inviteUrl = new URL(window.location.href);
        inviteUrl.searchParams.delete("invite");
        inviteUrl.searchParams.delete("code");

        window.history.replaceState(
          window.history.state,
          "",
          inviteUrl.pathname + inviteUrl.search + inviteUrl.hash
        );

        await loadGroups(
          joinedId
        );

        showMessage(
          "Joined study group"
        );
        return true;
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

  const copyInviteLink =
    async () => {
      if (
        !selectedGroup?.inviteCode
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          inviteLink
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
          "Couldn't copy the invite link."
        );
      }
    };


  // =======================================================
  // SHARE INVITE LINK
  // =======================================================

  const shareInviteLink = async () => {
    if (!inviteLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join " + selectedGroup.name + " on StudyOS",
          url: inviteLink,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    await copyInviteLink();
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
          "Invite link regenerated"
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
            "Couldn't regenerate the invite link."
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



  const runGroupAction = async (operation, successMessage, exiting = false) => {
    if (groupActionBusy || !selectedGroupId) return;

    const groupId = selectedGroupId;
    setGroupActionBusy(true);
    setError("");

    try {
      await operation(groupId);
      setMemberMenu("");

      if (exiting) {
        setMobileGroupOpen(false);
        await loadGroups();
      } else {
        await Promise.all([
          loadGroups(groupId),
          loadMembers(groupId),
        ]);
      }

      showMessage(successMessage);
    } catch (actionError) {
      showError(actionError?.message || "Group action failed.");
    } finally {
      setGroupActionBusy(false);
    }
  };

  const changeMemberRole = (member) => runGroupAction(
    groupId => apiRequest(
      "/api/groups/" + groupId + "/members/" +
        encodeURIComponent(member.userId) + "/role",
      {
        method: "PATCH",
        body: JSON.stringify({
          role: member.role === "admin" ? "member" : "admin"
        }),
      }
    ),
    "Member role updated"
  );

  const removeGroupMember = (member) => runGroupAction(
    groupId => apiRequest(
      "/api/groups/" + groupId + "/members/" +
        encodeURIComponent(member.userId),
      { method: "DELETE" }
    ),
    "Member removed"
  );

  const exitSelectedGroup = (deleteGroup) => runGroupAction(
    groupId => apiRequest(
      "/api/groups/" + groupId + (deleteGroup ? "" : "/leave"),
      { method: "DELETE" }
    ),
    deleteGroup ? "Group deleted" : "You left the group",
    true
  );


  // =======================================================
  // GUEST
  // =======================================================

  if (isGuest) {
    return (
      <div className="v2g-page community-groups">

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
    <div className="v2g-page community-groups">

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


      <div className="sgm-desktop">
      <GroupActions
        error={error}
        clearError={() => setError("")}
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        joining={joining}
        joinGroup={joinGroup}
        groupName={groupName}
        setGroupName={setGroupName}
        groupDescription={groupDescription}
        setGroupDescription={setGroupDescription}
        groupVisibility={groupVisibility}
        setGroupVisibility={setGroupVisibility}
        creating={creating}
        createGroup={createGroup}
      />
      </div>
      <div className="sgm-mobile">
      <MobileGroupActions
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        joining={joining}
        joinGroup={joinGroup}
        groupName={groupName}
        setGroupName={setGroupName}
        groupDescription={groupDescription}
        setGroupDescription={setGroupDescription}
        groupVisibility={groupVisibility}
        setGroupVisibility={setGroupVisibility}
        creating={creating}
        createGroup={createGroup}
      />
      </div>


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
              Create a group or join with an invite code.
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
                    aria-pressed={active}
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

                      {(Number(group.memberCount) || 1) === 1 ? "member" : "members"} ·{" "}

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

              <details className="sg-group-options">
                <summary aria-label="Group options" title="Group options">
                  <MoreHorizontal size={18} />
                </summary>

                <div className="sg-group-options-menu">
                  {canManageInvite && (
                    <button
                      type="button"
                      disabled={regenerating}
                      onClick={event => {
                        event.currentTarget.closest("details")
                          ?.removeAttribute("open");
                        regenerateInviteCode();
                      }}
                    >
                      <RefreshCw size={15} />
                      Regenerate invite link
                    </button>
                  )}

                  <button
                    type="button"
                    className="is-danger"
                    disabled={groupActionBusy}
                    onClick={() =>
                      exitSelectedGroup(selectedGroup.role === "owner")
                    }
                  >
                    {selectedGroup.role === "owner"
                      ? <Trash2 size={15} />
                      : <LogOut size={15} />}
                    {selectedGroup.role === "owner"
                      ? "Delete group"
                      : "Leave group"}
                  </button>
                </div>
              </details>



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

                          <CommunityAvatar key={liveUser.picture || "fallback"} src={liveUser.picture} name={name} />


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



            <article className="v2g-panel sg-invite-card">
              <div className="v2g-panel-heading">
                <div>
                  <h3>Invite friends</h3>
                </div>
              </div>

              <div className="sg-invite-compact">
                <div className="sg-invite-info">
                  <Link2 size={17} />
                  <div>
                    <strong>Group invite link</strong>
                    <span>Anyone with the link can join</span>
                  </div>
                </div>

                <div className="sg-invite-buttons">
                  <button
                    type="button"
                    className="v2g-secondary-button"
                    onClick={copyInviteLink}
                    disabled={!inviteLink}
                  >
                    {copied
                      ? <Check size={15} />
                      : <Copy size={15} />}
                    {copied ? "Copied" : "Copy link"}
                  </button>

                  {typeof navigator !== "undefined" &&
                    typeof navigator.share === "function" && (
                    <button
                      type="button"
                      className="sg-invite-share-button"
                      onClick={shareInviteLink}
                      disabled={!inviteLink}
                      aria-label="Share invite link"
                      title="Share invite link"
                    >
                      <Share2 size={16} />
                    </button>
                  )}
                </div>
              </div>
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

                        <CommunityAvatar key={member.picture || "fallback"} src={member.picture} name={member.displayName || "Student"} />


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

                        {String(member.userId) !== String(firebaseUser?.uid) &&
                          ((selectedGroup.role === "owner" && member.role !== "owner") ||
                            (selectedGroup.role === "admin" && member.role === "member")) && (
                            <button
                              type="button"
                              className="sg-inline-member-menu"
                              aria-label={"Actions for " + (member.displayName || "member")}
                              aria-expanded={memberMenu === member.userId}
                              disabled={groupActionBusy}
                              onClick={() => setMemberMenu(
                                current => current === member.userId ? "" : member.userId
                              )}
                            >
                              <MoreHorizontal size={17} />
                            </button>
                          )}

                        {memberMenu === member.userId &&
                          String(member.userId) !== String(firebaseUser?.uid) &&
                          ((selectedGroup.role === "owner" && member.role !== "owner") ||
                            (selectedGroup.role === "admin" && member.role === "member")) && (
                            <div className="sg-inline-member-actions">
                              {selectedGroup.role === "owner" && (
                                <button
                                  type="button"
                                  disabled={groupActionBusy}
                                  onClick={() => changeMemberRole(member)}
                                >
                                  {member.role === "admin" ? "Remove admin" : "Make admin"}
                                </button>
                              )}
                              <button
                                type="button"
                                className="is-danger"
                                disabled={groupActionBusy}
                                onClick={() => removeGroupMember(member)}
                              >
                                Remove member
                              </button>
                            </div>
                          )}

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


                        <CommunityAvatar key={entry.picture || "fallback"} src={entry.picture} name={displayName} />


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

                            {" · "}

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
