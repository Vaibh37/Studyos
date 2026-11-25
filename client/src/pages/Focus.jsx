import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BookOpen,
  CheckCircle2,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
  Trash2,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

import StudySelect from "../components/StudySelect";
import FocusZen from "../components/FocusZen";

import apiRequest from "../services/api";

import {
  connectSocket,
} from "../socket";

import {
  localDb,
} from "../services/localDb";

import {
  createStudySession,
  deleteStudySession,
  getStudySessions,
} from "../services/studySessionData";

import "../styles/focus-v2.css";


const TIMER_STORAGE_KEY_BASE =
  "studyos_active_focus_timer";


const PRESET_DURATIONS = [
  25,
  50,
  90,
];


// =========================================================
// DEFAULT FOCUS DURATION
// =========================================================

const getDefaultFocusMinutes =
  () => {
    const saved =
      Number(
        localStorage.getItem(
          "studyos_focus_duration"
        )
      );

    if (
      Number.isFinite(
        saved
      ) &&
      saved >= 1 &&
      saved <= 720
    ) {
      return Math.round(
        saved
      );
    }

    return 50;
  };


const getCustomValueForDuration =
  (
    minutes
  ) => {
    return PRESET_DURATIONS.includes(
      Number(
        minutes
      )
    )
      ? ""
      : String(
          minutes
        );
  };


// =========================================================
// FOCUS
// =========================================================

function Focus() {
  const {
    isGuest,
    firebaseUser,
  } = useAuth();


  const timerStorageKey =
    isGuest
      ? `${TIMER_STORAGE_KEY_BASE}:guest`
      : `${TIMER_STORAGE_KEY_BASE}:account:${
          firebaseUser?.uid ||
          "unknown"
        }`;


  const initialDefaultMinutes =
    getDefaultFocusMinutes();


  // =======================================================
  // DATA
  // =======================================================

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    sessions,
    setSessions,
  ] = useState([]);

  const [
    groups,
    setGroups,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  // =======================================================
  // MESSAGES
  // =======================================================

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");


  // =======================================================
  // TIMER CONFIG
  // =======================================================

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] = useState("");

  const [
    plannedMinutes,
    setPlannedMinutes,
  ] = useState(
    initialDefaultMinutes
  );

  const [
    customMinutes,
    setCustomMinutes,
  ] = useState(
    getCustomValueForDuration(
      initialDefaultMinutes
    )
  );

  const [
    selectedShareGroupId,
    setSelectedShareGroupId,
  ] = useState("");


  // =======================================================
  // TIMER STATE
  // =======================================================

  const [
    status,
    setStatus,
  ] = useState(
    "idle"
  );

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(
    () =>
      initialDefaultMinutes *
      60
  );

  const [
    targetEndAt,
    setTargetEndAt,
  ] = useState(null);

  const [
    startedAt,
    setStartedAt,
  ] = useState(null);

  const [activeRunId, setActiveRunId] = useState(null);

  const [
    activeSubjectId,
    setActiveSubjectId,
  ] = useState(null);

  const [
    activeSubjectName,
    setActiveSubjectName,
  ] = useState(
    "General Study"
  );

  const [
    activeGroupId,
    setActiveGroupId,
  ] = useState(null);

  const [
    activeGroupName,
    setActiveGroupName,
  ] = useState(null);

  const [
    savingSession,
    setSavingSession,
  ] = useState(false);

  const [
    hydrated,
    setHydrated,
  ] = useState(false);


  // =======================================================
  // DELETE SESSION
  // =======================================================

  const [
    sessionToDelete,
    setSessionToDelete,
  ] = useState(null);

  const [
    deletingSession,
    setDeletingSession,
  ] = useState(false);


  // =======================================================
  // REFS
  // =======================================================

  const zenAnchorRef = useRef(null);
  const [zenOpen, setZenOpen] = useState(false);

  const autoFinishLockRef =
    useRef(false);

  const finishSessionRef =
    useRef(null);


  // =======================================================
  // MESSAGE HELPERS
  // =======================================================

  const showSuccess =
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
  // SUBJECTS
  // =======================================================

  const fetchSubjects =
    async () => {
      let data;

      if (
        isGuest
      ) {
        data =
          await localDb.getAll(
            "subjects"
          );

        data =
          [
            ...data,
          ].sort(
            (
              first,
              second
            ) =>
              new Date(
                second.createdAt ||
                  0
              ) -
              new Date(
                first.createdAt ||
                  0
              )
          );
      } else {
        data =
          await apiRequest(
            "/api/subjects"
          );
      }

      setSubjects(
        Array.isArray(
          data
        )
          ? data
          : []
      );
    };


  // =======================================================
  // SESSIONS
  // =======================================================

  const fetchSessions =
    async () => {
      const data =
        await getStudySessions(
          isGuest
        );

      setSessions(
        Array.isArray(
          data
        )
          ? data
          : []
      );
    };


  // =======================================================
  // GROUPS
  // =======================================================

  const fetchGroups =
    async () => {
      if (
        isGuest
      ) {
        setGroups([]);

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

      return nextGroups;
    };


  // =======================================================
  // REFRESH
  // =======================================================

  const refreshData =
    async () => {
      try {
        setRefreshing(
          true
        );

        setError("");

        await Promise.all([
          fetchSubjects(),
          fetchSessions(),
          fetchGroups(),
        ]);

        if (
          status ===
          "idle"
        ) {
          const defaultMinutes =
            getDefaultFocusMinutes();

          setPlannedMinutes(
            defaultMinutes
          );

          setRemainingSeconds(
            defaultMinutes *
              60
          );

          setCustomMinutes(
            getCustomValueForDuration(
              defaultMinutes
            )
          );
        }

        showSuccess(
          "Focus data refreshed"
        );
      } catch (
        refreshError
      ) {
        console.error(
          refreshError
        );

        showError(
          refreshError?.message ||
            "Couldn't refresh Focus."
        );
      } finally {
        setRefreshing(
          false
        );
      }
    };


  // =======================================================
  // NOTIFICATION
  // =======================================================

  const sendCompletionNotification =
    (
      subjectName =
        activeSubjectName
    ) => {
      if (
        !(
          "Notification" in
          window
        )
      ) {
        return;
      }

      if (
        Notification.permission !==
        "granted"
      ) {
        return;
      }

      try {
        new Notification(
          "Focus session complete 🎯",
          {
            body:
              `${subjectName} session finished. Nice work.`,
          }
        );
      } catch (
        notificationError
      ) {
        console.error(
          "Notification failed:",
          notificationError
        );
      }
    };


  // =======================================================
  // REALTIME LIVE SHARING
  // =======================================================

  const waitForSocketConnection =
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

      return socket;
    };


  const emitSocketRequest =
    (
      socket,
      eventName,
      payload
    ) => {
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
                    `${eventName} timed out`
                  )
                );
              },
              8000
            );

          const handleResponse =
            (
              response
            ) => {
              window.clearTimeout(
                timeout
              );

              if (
                response?.ok
              ) {
                resolve(
                  response
                );

                return;
              }

              reject(
                new Error(
                  response?.message ||
                    "Realtime request failed"
                )
              );
            };

          if (
            typeof payload ===
            "undefined"
          ) {
            socket.emit(
              eventName,
              handleResponse
            );
          } else {
            socket.emit(
              eventName,
              payload,
              handleResponse
            );
          }
        }
      );
    };


  const joinLiveGroup =
    async (
      groupId
    ) => {
      if (
        isGuest ||
        !groupId
      ) {
        return null;
      }

      const socket =
        await waitForSocketConnection();

      await emitSocketRequest(
        socket,
        "group:join",
        {
          groupId:
            String(
              groupId
            ),
        }
      );

      return socket;
    };


  const startLiveShare =
    async ({
      groupId,
      subjectId,
      subjectName,
    }) => {
      const socket =
        await joinLiveGroup(
          groupId
        );

      if (
        !socket
      ) {
        return;
      }

      await emitSocketRequest(
        socket,
        "focus:start",
        {
          groupId:
            String(
              groupId
            ),

          subjectId:
            subjectId
              ? String(
                  subjectId
                )
              : null,

          subjectName:
            subjectName ||
            "General Study",
        }
      );
    };


  const stopLiveShare =
    async (
      durationSeconds = null
    ) => {
      if (
        isGuest
      ) {
        return null;
      }

      const socket =
        await waitForSocketConnection();

      const numericDuration =
        Number(
          durationSeconds
        );

      const payload =
        Number.isFinite(
          numericDuration
        ) &&
        numericDuration >= 1
          ? {
              durationSeconds:
                Math.floor(
                  numericDuration
                ),
            }
          : undefined;

      try {
        return await emitSocketRequest(
          socket,
          "focus:stop",
          payload
        );
      } catch (
        stopError
      ) {
        if (
          stopError?.message ===
          "No active live study session"
        ) {
          return null;
        }

        throw stopError;
      }
    };


  const stopLiveShareSafely =
    async (
      durationSeconds = null
    ) => {
      try {
        return await stopLiveShare(
          durationSeconds
        );
      } catch (
        stopError
      ) {
        console.warn(
          "Couldn't stop live sharing:",
          stopError?.message ||
            stopError
        );

        return null;
      }
    };


  const restoreLiveShare =
    async (
      groupId
    ) => {
      if (
        !groupId ||
        isGuest
      ) {
        return true;
      }

      try {
        await joinLiveGroup(
          groupId
        );

        return true;
      } catch (
        restoreShareError
      ) {
        console.warn(
          "Couldn't restore live group room:",
          restoreShareError?.message ||
            restoreShareError
        );

        return false;
      }
    };


  // =======================================================
  // RESTORE TIMER
  // =======================================================

  const restoreTimer =
    async () => {
      const raw =
        localStorage.getItem(
          timerStorageKey
        );

      if (
        !raw
      ) {
        return;
      }

      try {
        const saved =
          JSON.parse(
            raw
          );

        const savedPlanned =
          Number(
            saved.plannedMinutes
          );

        if (
          !Number.isFinite(
            savedPlanned
          ) ||
          savedPlanned < 1 ||
          savedPlanned > 720
        ) {
          throw new Error(
            "Invalid saved timer"
          );
        }

        const plannedSeconds =
          savedPlanned *
          60;

        setPlannedMinutes(
          savedPlanned
        );

        setCustomMinutes(
          getCustomValueForDuration(
            savedPlanned
          )
        );

        setSelectedSubjectId(
          saved.activeSubjectId ||
            ""
        );

        setActiveSubjectId(
          saved.activeSubjectId ||
            null
        );

        setActiveSubjectName(
          saved.activeSubjectName ||
            "General Study"
        );

        setStartedAt(
          saved.startedAt ||
            null
        );

        setActiveRunId(typeof saved.runId === "string" ? saved.runId : null);

        const savedShareGroupId =
          !isGuest &&
          saved.shareGroupId
            ? String(
                saved.shareGroupId
              )
            : "";

        const savedShareGroupName =
          savedShareGroupId
            ? saved.shareGroupName ||
              null
            : null;

        setSelectedShareGroupId(
          savedShareGroupId
        );

        setActiveGroupId(
          savedShareGroupId ||
            null
        );

        setActiveGroupName(
          savedShareGroupName
        );

        if (
          savedShareGroupId
        ) {
          restoreLiveShare(
            savedShareGroupId
          ).then(
            (
              restored
            ) => {
              if (
                !restored
              ) {
                setSelectedShareGroupId(
                  ""
                );

                setActiveGroupId(
                  null
                );

                setActiveGroupName(
                  null
                );

                stopLiveShareSafely();
              }
            }
          );
        }


        if (
          saved.status ===
            "running" &&
          saved.targetEndAt
        ) {
          const target =
            Number(
              saved.targetEndAt
            );

          if (
            Number.isFinite(
              target
            )
          ) {
            const remaining =
              Math.max(
                0,
                Math.ceil(
                  (
                    target -
                    Date.now()
                  ) /
                    1000
                )
              );

            if (
              remaining <= 0
            ) {
              localStorage.removeItem(
                timerStorageKey
              );

              const end =
                new Date();

              const fallbackStart =
                new Date(
                  end.getTime() -
                    plannedSeconds *
                      1000
                );

              try {
                const restoredSession =
                  await createStudySession(
                    isGuest,
                    {
                      subjectId:
                        saved.activeSubjectId ||
                        null,

                      subjectName:
                        saved.activeSubjectName ||
                        "General Study",

                      plannedMinutes:
                        savedPlanned,

                      durationSeconds:
                        plannedSeconds,

                      startedAt:
                        saved.startedAt ||
                        fallbackStart.toISOString(),

                      endedAt:
                        end.toISOString(),

                      runId: saved.runId || undefined,
                    }
                  );

                setSessions(
                  (
                    current
                  ) => [
                    restoredSession,
                    ...current,
                  ]
                );

                window.dispatchEvent(
                  new Event(
                    "studyos-sessions-updated"
                  )
                );

                showSuccess(
                  "Your focus session finished while you were away 🎯"
                );

                sendCompletionNotification(
                  saved.activeSubjectName ||
                    "General Study"
                );

                const defaultMinutes =
                  getDefaultFocusMinutes();

                setStatus(
                  "idle"
                );

                setPlannedMinutes(
                  defaultMinutes
                );

                setRemainingSeconds(
                  defaultMinutes *
                    60
                );

                setCustomMinutes(
                  getCustomValueForDuration(
                    defaultMinutes
                  )
                );

                setSelectedSubjectId(
                  ""
                );

                setActiveSubjectId(
                  null
                );

                setActiveSubjectName(
                  "General Study"
                );

                setStartedAt(
                  null
                );

                setActiveRunId(null);

                setTargetEndAt(
                  null
                );

                setSelectedShareGroupId(
                  ""
                );

                setActiveGroupId(
                  null
                );

                setActiveGroupName(
                  null
                );

                if (
                  savedShareGroupId
                ) {
                  await stopLiveShareSafely(
                    plannedSeconds
                  );
                }

                return;
              } catch (
                restoreError
              ) {
                console.error(
                  "Failed to restore completed timer:",
                  restoreError
                );

                setStatus(
                  "paused"
                );

                setRemainingSeconds(
                  0
                );

                setTargetEndAt(
                  null
                );

                showError(
                  "Your timer finished, but StudyOS couldn't save it. Press Finish to retry."
                );

                return;
              }
            }

            setStatus(
              "running"
            );

            setRemainingSeconds(
              remaining
            );

            setTargetEndAt(
              target
            );

            return;
          }
        }


        if (
          saved.status ===
            "paused"
        ) {
          const remaining =
            Math.max(
              0,
              Math.min(
                plannedSeconds,
                Number(
                  saved.remainingSeconds
                ) ||
                  plannedSeconds
              )
            );

          setStatus(
            "paused"
          );

          setRemainingSeconds(
            remaining
          );

          setTargetEndAt(
            null
          );

          return;
        }

        throw new Error(
          "Unknown saved timer status"
        );
      } catch (
        restoreError
      ) {
        console.error(
          "Timer restore failed:",
          restoreError
        );

        localStorage.removeItem(
          timerStorageKey
        );
      }
    };


  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    let cancelled =
      false;

    const initialize =
      async () => {
        try {
          setLoading(
            true
          );

          await Promise.all([
            fetchSubjects(),
            fetchSessions(),
            fetchGroups(),
          ]);

          if (
            cancelled
          ) {
            return;
          }

          await restoreTimer();
        } catch (
          initializeError
        ) {
          console.error(
            "Focus initialization failed:",
            initializeError
          );

          if (
            !cancelled
          ) {
            showError(
              initializeError?.message ||
                "Couldn't load Focus."
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setHydrated(
              true
            );

            setLoading(
              false
            );
          }
        }
      };

    initialize();

    return () => {
      cancelled =
        true;
    };
  }, [
    isGuest,
    timerStorageKey,
  ]);


  // =======================================================
  // PERSIST TIMER
  // =======================================================

  useEffect(() => {
    if (
      !hydrated
    ) {
      return;
    }

    if (
      status ===
      "idle"
    ) {
      localStorage.removeItem(
        timerStorageKey
      );

      return;
    }

    const snapshot = {
      version:
        2,

      status,

      plannedMinutes,

      remainingSeconds,

      targetEndAt,

      startedAt,

      runId: activeRunId,

      activeSubjectId,

      activeSubjectName,

      shareGroupId:
        activeGroupId,

      shareGroupName:
        activeGroupName,
    };

    localStorage.setItem(
      timerStorageKey,
      JSON.stringify(
        snapshot
      )
    );
  }, [
    hydrated,
    status,
    plannedMinutes,
    remainingSeconds,
    targetEndAt,
    startedAt,
    activeRunId,
    activeSubjectId,
    activeSubjectName,
    activeGroupId,
    activeGroupName,
    timerStorageKey,
  ]);


  // =======================================================
  // LIVE SHARE HEARTBEAT
  // =======================================================

  useEffect(() => {
    if (
      isGuest ||
      status ===
        "idle" ||
      !activeGroupId
    ) {
      return;
    }

    let cancelled =
      false;

    let socket =
      null;

    let heartbeatInterval =
      null;

    const handleReconnect =
      () => {
        if (
          cancelled ||
          !socket
        ) {
          return;
        }

        socket.emit(
          "group:join",
          {
            groupId:
              String(
                activeGroupId
              ),
          },
          () => {}
        );

        socket.emit(
          "focus:heartbeat"
        );
      };

    const startHeartbeat =
      async () => {
        try {
          socket =
            await joinLiveGroup(
              activeGroupId
            );

          if (
            cancelled ||
            !socket
          ) {
            return;
          }

          socket.emit(
            "focus:heartbeat"
          );

          socket.on(
            "connect",
            handleReconnect
          );

          heartbeatInterval =
            window.setInterval(
              () => {
                if (
                  socket?.connected
                ) {
                  socket.emit(
                    "focus:heartbeat"
                  );
                }
              },
              30000
            );
        } catch (
          heartbeatError
        ) {
          console.warn(
            "Live share heartbeat failed:",
            heartbeatError?.message ||
              heartbeatError
          );
        }
      };

    startHeartbeat();

    return () => {
      cancelled =
        true;

      if (
        heartbeatInterval
      ) {
        window.clearInterval(
          heartbeatInterval
        );
      }

      if (
        socket
      ) {
        socket.off(
          "connect",
          handleReconnect
        );
      }
    };
  }, [
    isGuest,
    status,
    activeGroupId,
  ]);


  // =======================================================
  // TIMER LOOP
  // =======================================================

  useEffect(() => {
    if (
      status !==
        "running" ||
      !targetEndAt
    ) {
      return;
    }

    const tick =
      () => {
        const remaining =
          Math.max(
            0,
            Math.ceil(
              (
                targetEndAt -
                Date.now()
              ) /
                1000
            )
          );

        setRemainingSeconds(
          remaining
        );

        if (
          remaining <= 0 &&
          !autoFinishLockRef.current
        ) {
          autoFinishLockRef.current =
            true;

          finishSessionRef.current?.(
            true,
            0
          );
        }
      };

    tick();

    const interval =
      window.setInterval(
        tick,
        250
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    status,
    targetEndAt,
  ]);


  // =======================================================
  // DURATION
  // =======================================================

  const chooseDuration =
    (
      minutes
    ) => {
      if (
        status !==
        "idle"
      ) {
        return;
      }

      setPlannedMinutes(
        minutes
      );

      setRemainingSeconds(
        minutes *
          60
      );

      setCustomMinutes("");
    };


  const handleCustomMinutes =
    (
      event
    ) => {
      if (
        status !==
        "idle"
      ) {
        return;
      }

      const value =
        event.target.value;

      setCustomMinutes(
        value
      );

      const number =
        Number(
          value
        );

      if (
        Number.isFinite(
          number
        ) &&
        number >= 1 &&
        number <= 720
      ) {
        const rounded =
          Math.round(
            number
          );

        setPlannedMinutes(
          rounded
        );

        setRemainingSeconds(
          rounded *
            60
        );
      }
    };


  // =======================================================
  // START
  // =======================================================

  const startSession =
    async () => {
      if (
        status !==
        "idle"
      ) {
        return;
      }

      const duration =
        Number(
          plannedMinutes
        );

      if (
        !Number.isFinite(
          duration
        ) ||
        duration < 1 ||
        duration > 720
      ) {
        showError(
          "Choose a duration between 1 and 720 minutes."
        );

        return;
      }

      // A signed-in timer must start on the server before it can
      // earn public leaderboard credit. Guests still use local storage.
      let issuedRunId = null;
      if (!isGuest) {
        try {
          const started = await apiRequest("/api/study-sessions/start", {
            method: "POST",
          });
          if (!started?.runId) {
            throw new Error("Server did not issue a Focus run");
          }
          issuedRunId = started.runId;
        } catch (startError) {
          showError(startError?.message || "Could not start verified Focus. Check your connection.");
          return;
        }
      }

      setActiveRunId(issuedRunId);

      const selectedSubject =
        subjects.find(
          (
            subject
          ) =>
            String(
              subject._id
            ) ===
            String(
              selectedSubjectId
            )
        );

      const selectedShareGroup =
        groups.find(
          (
            group
          ) =>
            String(
              group._id
            ) ===
            String(
              selectedShareGroupId
            )
        );

      const sessionSubjectId =
        selectedSubject?._id ||
        null;

      const sessionSubjectName =
        selectedSubject?.name ||
        "General Study";

      const shareGroupId =
        !isGuest &&
        selectedShareGroup
          ? String(
              selectedShareGroup._id
            )
          : null;

      const shareGroupName =
        shareGroupId
          ? selectedShareGroup.name ||
            "Study group"
          : null;

      const now =
        Date.now();

      const totalSeconds =
        duration *
        60;

      setActiveSubjectId(
        sessionSubjectId
      );

      setActiveSubjectName(
        sessionSubjectName
      );

      setActiveGroupId(
        shareGroupId
      );

      setActiveGroupName(
        shareGroupName
      );

      setStartedAt(
        new Date(
          now
        ).toISOString()
      );

      setRemainingSeconds(
        totalSeconds
      );

      setTargetEndAt(
        now +
          totalSeconds *
            1000
      );

      setStatus(
        "running"
      );

      autoFinishLockRef.current =
        false;

      setError("");
      setMessage("");

      if (
        shareGroupId
      ) {
        try {
          await startLiveShare({
            groupId:
              shareGroupId,

            subjectId:
              sessionSubjectId,

            subjectName:
              sessionSubjectName,
          });
        } catch (
          shareError
        ) {
          console.error(
            "Failed to start live sharing:",
            shareError
          );

          setSelectedShareGroupId(
            ""
          );

          setActiveGroupId(
            null
          );

          setActiveGroupName(
            null
          );

          showError(
            "Focus started, but live sharing couldn't connect. This session is private."
          );
        }
      } else if (
        !isGuest
      ) {
        stopLiveShareSafely();
      }
    };


  // =======================================================
  // PAUSE
  // =======================================================

  const pauseSession =
    () => {
      if (
        status !==
          "running" ||
        !targetEndAt
      ) {
        return;
      }

      const remaining =
        Math.max(
          0,
          Math.ceil(
            (
              targetEndAt -
              Date.now()
            ) /
              1000
          )
        );

      setRemainingSeconds(
        remaining
      );

      setTargetEndAt(
        null
      );

      setStatus(
        "paused"
      );
    };


  // =======================================================
  // RESUME
  // =======================================================

  const resumeSession =
    () => {
      if (
        status !==
        "paused"
      ) {
        return;
      }

      if (
        remainingSeconds <=
        0
      ) {
        return;
      }

      setTargetEndAt(
        Date.now() +
          remainingSeconds *
            1000
      );

      setStatus(
        "running"
      );

      autoFinishLockRef.current =
        false;
    };


  // =======================================================
  // FINISH
  // =======================================================

  const finishSession =
    async (
      automatic = false,
      forcedRemaining = null
    ) => {
      if (
        savingSession ||
        status ===
          "idle"
      ) {
        return;
      }

      const totalSeconds =
        plannedMinutes *
        60;

      let finalRemaining =
        remainingSeconds;

      if (
        forcedRemaining !==
        null
      ) {
        finalRemaining =
          forcedRemaining;
      } else if (
        status ===
          "running" &&
        targetEndAt
      ) {
        finalRemaining =
          Math.max(
            0,
            Math.ceil(
              (
                targetEndAt -
                Date.now()
              ) /
                1000
            )
          );
      }

      const durationSeconds =
        Math.max(
          0,
          totalSeconds -
            finalRemaining
        );

      if (
        durationSeconds <
        1
      ) {
        showError(
          "Study for at least one second before finishing the session."
        );

        autoFinishLockRef.current =
          false;

        return;
      }

      const endedAt =
        new Date();

      let startDate =
        startedAt
          ? new Date(
              startedAt
            )
          : null;

      if (
        !startDate ||
        Number.isNaN(
          startDate.getTime()
        )
      ) {
        startDate =
          new Date(
            endedAt.getTime() -
              durationSeconds *
                1000
          );
      }

      const completedSubjectName =
        activeSubjectName;

      try {
        setSavingSession(
          true
        );

        setError("");

        const savedSession =
          await createStudySession(
            isGuest,
            {
              subjectId:
                activeSubjectId,

              subjectName:
                activeSubjectName,

              plannedMinutes,

              durationSeconds,

              startedAt:
                startDate.toISOString(),

              endedAt:
                endedAt.toISOString(),

              runId: activeRunId || undefined,
            }
          );

        setSessions(
          (
            current
          ) => [
            savedSession,
            ...current,
          ]
        );

        if (
          activeGroupId
        ) {
          await stopLiveShareSafely(
            durationSeconds
          );
        }

        const defaultMinutes =
          getDefaultFocusMinutes();

        setStatus(
          "idle"
        );

        setPlannedMinutes(
          defaultMinutes
        );

        setRemainingSeconds(
          defaultMinutes *
            60
        );

        setCustomMinutes(
          getCustomValueForDuration(
            defaultMinutes
          )
        );

        setTargetEndAt(
          null
        );

        setStartedAt(
          null
        );

        setActiveRunId(null);

        setSelectedSubjectId(
          ""
        );

        setActiveSubjectId(
          null
        );

        setActiveSubjectName(
          "General Study"
        );

        setSelectedShareGroupId(
          ""
        );

        setActiveGroupId(
          null
        );

        setActiveGroupName(
          null
        );

        localStorage.removeItem(
          timerStorageKey
        );

        window.dispatchEvent(
          new Event(
            "studyos-sessions-updated"
          )
        );

        if (
          automatic
        ) {
          sendCompletionNotification(
            completedSubjectName
          );

          showSuccess(
            "Focus session complete 🎯"
          );
        } else {
          showSuccess(
            "Study session saved"
          );
        }
      } catch (
        saveError
      ) {
        console.error(
          "Failed to save session:",
          saveError
        );

        showError(
          saveError?.message ||
            "Couldn't save your study session."
        );

        autoFinishLockRef.current =
          false;
      } finally {
        setSavingSession(
          false
        );
      }
    };


  finishSessionRef.current =
    finishSession;


  // =======================================================
  // RESET
  // =======================================================

  const resetIdleTimer =
    () => {
      if (
        status !==
        "idle"
      ) {
        return;
      }

      const defaultMinutes =
        getDefaultFocusMinutes();

      setPlannedMinutes(
        defaultMinutes
      );

      setRemainingSeconds(
        defaultMinutes *
          60
      );

      setCustomMinutes(
        getCustomValueForDuration(
          defaultMinutes
        )
      );

      setSelectedSubjectId(
        ""
      );

      setSelectedShareGroupId(
        ""
      );

      setError("");
      setMessage("");
    };


  // =======================================================
  // DELETE SESSION
  // =======================================================

  const deleteSession =
    async () => {
      if (
        !sessionToDelete ||
        deletingSession
      ) {
        return;
      }

      try {
        setDeletingSession(
          true
        );

        await deleteStudySession(
          isGuest,
          sessionToDelete._id
        );

        setSessions(
          (
            current
          ) =>
            current.filter(
              (
                session
              ) =>
                String(
                  session._id
                ) !==
                String(
                  sessionToDelete._id
                )
            )
        );

        setSessionToDelete(
          null
        );

        window.dispatchEvent(
          new Event(
            "studyos-sessions-updated"
          )
        );

        showSuccess(
          "Study session deleted"
        );
      } catch (
        deleteError
      ) {
        console.error(
          deleteError
        );

        showError(
          deleteError?.message ||
            "Couldn't delete the session."
        );
      } finally {
        setDeletingSession(
          false
        );
      }
    };


  // =======================================================
  // DATE HELPERS
  // =======================================================

  const getDateKey =
    (
      date
    ) => {
      return [
        date.getFullYear(),

        String(
          date.getMonth() +
            1
        ).padStart(
          2,
          "0"
        ),

        String(
          date.getDate()
        ).padStart(
          2,
          "0"
        ),
      ].join("-");
    };


  const isToday =
    (
      value
    ) => {
      const date =
        new Date(
          value
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return false;
      }

      return (
        getDateKey(
          date
        ) ===
        getDateKey(
          new Date()
        )
      );
    };


  // =======================================================
  // STATS
  // =======================================================

  const stats =
    useMemo(() => {
      let totalSeconds = 0;
      let todaySeconds = 0;
      let weekSeconds = 0;

      const sevenDaysAgo =
        new Date();

      sevenDaysAgo.setDate(
        sevenDaysAgo.getDate() -
          6
      );

      sevenDaysAgo.setHours(
        0,
        0,
        0,
        0
      );

      sessions.forEach(
        (
          session
        ) => {
          const duration =
            Number(
              session.durationSeconds
            ) || 0;

          totalSeconds +=
            duration;

          if (
            isToday(
              session.endedAt
            )
          ) {
            todaySeconds +=
              duration;
          }

          const end =
            new Date(
              session.endedAt
            );

          if (
            !Number.isNaN(
              end.getTime()
            ) &&
            end >=
              sevenDaysAgo
          ) {
            weekSeconds +=
              duration;
          }
        }
      );

      return {
        totalSeconds,
        todaySeconds,
        weekSeconds,

        sessionCount:
          sessions.length,
      };
    }, [
      sessions,
    ]);


  // =======================================================
  // FORMAT TIMER
  // =======================================================

  const formatTimer =
    (
      seconds
    ) => {
      const safe =
        Math.max(
          0,
          Math.floor(
            seconds
          )
        );

      const hours =
        Math.floor(
          safe / 3600
        );

      const minutes =
        Math.floor(
          (
            safe %
            3600
          ) /
            60
        );

      const secs =
        safe %
        60;

      if (
        hours > 0
      ) {
        return `${hours}:${String(
          minutes
        ).padStart(
          2,
          "0"
        )}:${String(
          secs
        ).padStart(
          2,
          "0"
        )}`;
      }

      return `${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        secs
      ).padStart(
        2,
        "0"
      )}`;
    };


  // =======================================================
  // FORMAT STUDY TIME
  // =======================================================

  const formatStudyTime =
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

      const totalMinutes =
        Math.floor(
          safeSeconds /
            60
        );

      const hours =
        Math.floor(
          totalMinutes /
            60
        );

      const minutes =
        totalMinutes %
        60;

      if (
        hours > 0
      ) {
        return `${hours}h ${minutes}m`;
      }

      if (
        totalMinutes > 0
      ) {
        return `${totalMinutes}m`;
      }

      if (
        safeSeconds > 0
      ) {
        return `${safeSeconds}s`;
      }

      return "0m";
    };


  // =======================================================
  // SESSION DATE
  // =======================================================

  const formatSessionDate =
    (
      value
    ) => {
      const date =
        new Date(
          value
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "Unknown";
      }

      if (
        isToday(
          date
        )
      ) {
        return `Today · ${date.toLocaleTimeString(
          "en-IN",
          {
            hour:
              "2-digit",

            minute:
              "2-digit",
          }
        )}`;
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day:
            "numeric",

          month:
            "short",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      );
    };


  // =======================================================
  // PROGRESS
  // =======================================================

  const totalTimerSeconds =
    Math.max(
      1,
      plannedMinutes *
        60
    );


  const elapsedSeconds =
    Math.max(
      0,
      totalTimerSeconds -
        remainingSeconds
    );


  const progressPercent =
    Math.min(
      100,
      Math.max(
        0,
        (
          elapsedSeconds /
          totalTimerSeconds
        ) *
          100
      )
    );


  // =======================================================
  // LABEL
  // =======================================================

  const timerStatusLabel =
    () => {
      if (
        status ===
        "running"
      ) {
        return "Focusing";
      }

      if (
        status ===
        "paused"
      ) {
        return "Paused";
      }

      return "Ready";
    };


  // =======================================================
  // OPTIONS
  // =======================================================

  const subjectOptions =
    useMemo(
      () => [
        {
          value:
            "",

          label:
            "General Study",

          description:
            "Focus without linking a subject",
        },

        ...subjects.map(
          (
            subject
          ) => ({
            value:
              String(
                subject._id
              ),

            label:
              subject.name,

            description:
              subject.code ||
              "Subject",

            color:
              subject.color ||
              "#64748b",
          })
        ),
      ],
      [
        subjects,
      ]
    );


  const shareGroupOptions =
    useMemo(
      () => [
        {
          value:
            "",

          label:
            "Private",

          description:
            isGuest
              ? "Sign in to share live study status"
              : "Only you can see this focus session",
        },

        ...groups.map(
          (
            group
          ) => {
            const memberCount =
              Number(
                group.memberCount
              ) ||
              1;

            return {
              value:
                String(
                  group._id
                ),

              label:
                group.name,

              description:
                `${memberCount} ${
                  memberCount ===
                  1
                    ? "member"
                    : "members"
                } · share live`,
            };
          }
        ),
      ],
      [
        groups,
        isGuest,
      ]
    );


  // =======================================================
  // UI
  // =======================================================

  const [showAllSessions, setShowAllSessions] = useState(false);
  const [openSessionMenu, setOpenSessionMenu] = useState(null);

  useEffect(() => {
    if (openSessionMenu === null) return;

    const dismiss = (event) => {
      if (!event.target.closest?.(".v2f-history-menu")) {
        setOpenSessionMenu(null);
      }
    };

    const escape = (event) => {
      if (event.key === "Escape") {
        setOpenSessionMenu(null);
      }
    };

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [openSessionMenu]);

  const visibleSessions = showAllSessions
    ? sessions
    : sessions.slice(0, 3);

  return (
    <div className="v2f-page v2f-clean">

      <header className="v2f-header">
        <div>
          <h1>Focus</h1>
          <p>Make time for deep work.</p>
        </div>

        <div className="v2f-header-actions">
          <button
            type="button"
            className="v2f-refresh"
            disabled={refreshing}
            onClick={refreshData}
            aria-label="Refresh study sessions"
            title="Refresh study sessions"
          >
            <RefreshCw size={16} className={refreshing ? "v2f-spin" : ""} />
          </button>
          <button
            type="button"
            className="v2f-zen-trigger"
            disabled={loading || !hydrated || savingSession}
            onClick={() => setZenOpen(true)}
            aria-label="Enter Zen mode"
            aria-haspopup="dialog"
          >
            <span className="v2f-zen-symbol" aria-hidden="true">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path d="M20.5 15.1A8.9 8.9 0 0 1 8.9 3.5 9 9 0 1 0 20.5 15.1Z" fill="currentColor" />
              </svg>
            </span>
            <span className="v2f-zen-copy">
              <span className="v2f-zen-label">Zen mode</span>
              <span className="v2f-zen-note">Distraction-free</span>
            </span>
          </button>
        </div>
      </header>

      {message && (
        <div className="v2f-message is-success" role="status">
          <CheckCircle2 size={17} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="v2f-message is-error" role="alert">
          <div>
            <strong>Something went wrong</strong>
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <section className="v2f-loading">
          <RefreshCw size={22} className="v2f-spin" />
          <strong>Loading Focus</strong>
        </section>
      ) : (
        <>
          <section className="v2f-stats" aria-label="Focus statistics">

            <FocusStat
              label="Today"
              value={formatStudyTime(stats.todaySeconds)}
            />

            <FocusStat
              label="Last 7 days"
              value={formatStudyTime(stats.weekSeconds)}
            />

            <FocusStat
              label="Sessions"
              value={stats.sessionCount}
            />

            <FocusStat
              label="Total focus"
              value={formatStudyTime(stats.totalSeconds)}
            />

          </section>

          <section
            className="v2f-workspace"
            aria-label="Focus timer"
          >
            <div className="v2f-timer-card">

              <div className="v2f-config">

                <div className="v2f-config-block">
                  <span className="v2f-config-label">
                    Subject
                  </span>

                  <StudySelect
                    value={selectedSubjectId}
                    onChange={(value) =>
                      setSelectedSubjectId(String(value))
                    }
                    options={subjectOptions}
                    placeholder="General Study"
                    className="v2f-subject-select"
                    disabled={status !== "idle"}
                    ariaLabel="Choose Focus subject"
                  />
                </div>

                <div className="v2f-config-block">

                  <span className="v2f-config-label">
                    Share live
                  </span>

                  <StudySelect
                    value={selectedShareGroupId}
                    onChange={(value) =>
                      setSelectedShareGroupId(String(value))
                    }
                    options={shareGroupOptions}
                    placeholder="Private"
                    className="v2f-share-select"
                    disabled={status !== "idle" || isGuest}
                    ariaLabel="Choose live sharing group"
                  />

                  {isGuest && (
                    <span className="v2f-config-hint">
                      Sign in to share live.
                    </span>
                  )}

                </div>
              </div>

              <div className="v2f-timer-area">
                <div className="v2f-ring">

                  <svg
                    className="v2f-ring-svg"
                    viewBox="0 0 120 120"
                    aria-hidden="true"
                  >

                    <circle
                      className="v2f-ring-track"
                      cx="60"
                      cy="60"
                      r="52"
                      pathLength="100"
                    />

                    <circle
                      className="v2f-ring-progress"
                      cx="60"
                      cy="60"
                      r="52"
                      pathLength="100"
                      strokeDasharray="100"
                      strokeDashoffset={100 - progressPercent}
                    />

                  </svg>

                  <div className="v2f-ring-content">

                    <span className={`v2f-status is-${status}`}>
                      <span />
                      {timerStatusLabel()}
                    </span>

                    <strong
                      ref={zenAnchorRef}
                      className={`v2f-time${
                        remainingSeconds >= 3600 ? " is-long" : ""
                      }`}
                    >
                      {formatTimer(remainingSeconds)}
                    </strong>

                    <span
                      className="v2f-timer-subject"
                      title={
                        status === "idle"
                          ? undefined
                          : activeSubjectName
                      }
                    >
                      {status === "idle"
                        ? `${plannedMinutes} minute session`
                        : activeSubjectName}
                    </span>

                  </div>
                </div>
              </div>

              <div
                className="v2f-duration-row"
                role="group"
                aria-label="Session duration"
              >

                <div className="v2f-presets">

                  {PRESET_DURATIONS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      disabled={status !== "idle"}
                      className={
                        plannedMinutes === minutes &&
                        customMinutes === ""
                          ? "is-active"
                          : ""
                      }
                      aria-pressed={
                        plannedMinutes === minutes &&
                        customMinutes === ""
                      }
                      onClick={() => chooseDuration(minutes)}
                    >
                      {minutes} min
                    </button>
                  ))}

                </div>

                <label className="v2f-custom">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    placeholder="Custom"
                    aria-label="Custom duration in minutes"
                    value={customMinutes}
                    disabled={status !== "idle"}
                    onChange={handleCustomMinutes}
                  />
                  <span>min</span>
                </label>

              </div>

              <div className="v2f-controls">

                {status === "idle" && (
                  <>
                    <button
                      type="button"
                      className="v2f-primary-action"
                      onClick={startSession}
                    >
                      <Play size={17} />
                      Start focus
                    </button>

                    <button
                      type="button"
                      className="v2f-secondary-action v2f-reset"
                      onClick={resetIdleTimer}
                      title="Reset timer"
                      aria-label="Reset timer"
                    >
                      <RotateCcw size={17} />
                    </button>
                  </>
                )}

                {status === "running" && (
                  <>
                    <button
                      type="button"
                      className="v2f-primary-action"
                      onClick={pauseSession}
                    >
                      <Pause size={17} />
                      Pause
                    </button>

                    <button
                      type="button"
                      className="v2f-secondary-action"
                      disabled={savingSession}
                      onClick={() => finishSession(false)}
                    >
                      <CheckCircle2 size={17} />
                      {savingSession ? "Saving..." : "Finish"}
                    </button>
                  </>
                )}

                {status === "paused" && (
                  <>
                    {remainingSeconds > 0 && (
                      <button
                        type="button"
                        className="v2f-primary-action"
                        onClick={resumeSession}
                      >
                        <Play size={17} />
                        Resume
                      </button>
                    )}

                    <button
                      type="button"
                      className="v2f-secondary-action"
                      disabled={savingSession}
                      onClick={() => finishSession(false)}
                    >
                      <CheckCircle2 size={17} />
                      {savingSession ? "Saving..." : "Finish"}
                    </button>
                  </>
                )}

              </div>

              {status === "idle" ? (
                <p className="v2f-persistence-note">
                  Your timer stays active when you leave this page.
                </p>
              ) : (
                <div className="v2f-inline-session">

                  <span
                    className={`v2f-share-state ${
                      activeGroupId ? "is-live" : "is-private"
                    }`}
                  >
                    <span className="v2f-share-dot" />

                    {activeGroupId
                      ? `Live in ${activeGroupName || "study group"}`
                      : "Private session"}
                  </span>

                  <span>
                    {formatStudyTime(elapsedSeconds)} /
                    {" "}{plannedMinutes} min
                    {" "}&middot;{" "}
                    {Math.round(progressPercent)}%
                  </span>

                </div>
              )}

            </div>
          </section>

          <section
            className="v2f-history"
            aria-label="Study history"
          >

            <div className="v2f-history-header">

              <div className="v2f-history-heading">
                <h2>Recent sessions</h2>

                <span className="v2f-history-count">
                  {sessions.length}
                </span>
              </div>

              {sessions.length > 3 && (
                <button
                  type="button"
                  className="v2f-view-all"
                  aria-expanded={showAllSessions}
                  aria-controls="v2f-history-list"
                  onClick={() => {
                    setShowAllSessions((value) => !value);
                    setOpenSessionMenu(null);
                  }}
                >
                  {showAllSessions ? "Show less" : "View all"}
                </button>
              )}

            </div>

            {sessions.length === 0 ? (
              <div className="v2f-empty">
                <Timer size={24} />
                <strong>No study sessions yet</strong>
                <span>
                  Completed focus sessions will appear here.
                </span>
              </div>
            ) : (
              <div
                className="v2f-history-list"
                id="v2f-history-list"
              >

                {visibleSessions.map((session) => (
                  <article
                    className="v2f-history-item"
                    key={session._id}
                  >

                    <span className="v2f-history-icon">
                      <BookOpen size={17} />
                    </span>

                    <div className="v2f-history-copy">
                      <strong>
                        {session.subjectName || "General Study"}
                      </strong>
                      <span>
                        {formatSessionDate(
                          session.endedAt || session.startedAt
                        )}
                      </span>
                    </div>

                    <div className="v2f-history-duration">
                      <strong>
                        {formatStudyTime(session.durationSeconds)}
                      </strong>

                      <span>
                        {session.plannedMinutes
                          ? `Target ${session.plannedMinutes} min`
                          : "Focus session"}
                      </span>
                    </div>

                    <div className="v2f-history-menu">

                      <button
                        type="button"
                        className="v2f-more"
                        aria-label="Session actions"
                        aria-expanded={openSessionMenu === session._id}
                        onClick={() =>
                          setOpenSessionMenu((id) =>
                            id === session._id ? null : session._id
                          )
                        }
                      >
                        <MoreHorizontal size={19} />
                      </button>

                      {openSessionMenu === session._id && (
                        <div className="v2f-menu-popup">

                          <button
                            type="button"
                            onClick={() => {
                              setOpenSessionMenu(null);
                              setSessionToDelete(session);
                            }}
                          >
                            <Trash2 size={15} />
                            Delete session
                          </button>

                        </div>
                      )}

                    </div>

                  </article>
                ))}

              </div>
            )}

          </section>
        </>
      )}

      {zenOpen && (
        <FocusZen
          anchor={zenAnchorRef.current}
          time={formatTimer(remainingSeconds)}
          status={status}
          animate={true}
          error={error}
          saving={savingSession || (status === "paused" && remainingSeconds <= 0)}
          onToggle={status === "running" ? pauseSession : status === "paused" ? resumeSession : startSession}
          onClose={() => setZenOpen(false)}
        />
      )}

      {/* DELETE MODAL */}

      {sessionToDelete && (
        <div
          className="v2f-delete-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !deletingSession
            ) {
              setSessionToDelete(
                null
              );
            }
          }}
        >

          <div
            className="v2f-delete-modal"
            role="dialog"
            aria-modal="true" aria-labelledby="v2f-delete-title"
          >

            <span className="v2f-delete-icon">

              <Trash2
                size={22}
              />

            </span>


            <div className="v2f-delete-copy">

              <h2 id="v2f-delete-title">
                Delete session?
              </h2>

              <p>
                Remove the{" "}
                <strong>
                  {sessionToDelete.subjectName ||
                    "General Study"}
                </strong>{" "}
                session from your study history?
              </p>

              <span>
                This action cannot be undone.
              </span>

            </div>


            <div className="v2f-delete-actions">

              <button
                type="button"
                className="v2f-secondary-button"
                disabled={
                  deletingSession
                }
                onClick={() =>
                  setSessionToDelete(
                    null
                  )
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="v2f-danger-button"
                disabled={
                  deletingSession
                }
                onClick={
                  deleteSession
                }
              >

                <Trash2
                  size={16}
                />

                {deletingSession
                  ? "Deleting..."
                  : "Delete session"}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


// =========================================================
// STAT
// =========================================================

function FocusStat({ label, value }) {
  return (
    <article className="v2f-stat">
      <span className="v2f-stat-label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default Focus;