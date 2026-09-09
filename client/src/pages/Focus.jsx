import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  History,
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

import apiRequest from "../services/api";

import {
  localDb,
} from "../services/localDb";

import {
  createStudySession,
  deleteStudySession,
  getStudySessions,
} from "../services/studySessionData";

import "./Focus.selects.css";

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
      Number.isFinite(saved) &&
      saved >= 1 &&
      saved <= 720
    ) {
      return Math.round(saved);
    }

    return 50;
  };

const getCustomValueForDuration =
  (minutes) => {
    return PRESET_DURATIONS.includes(
      Number(minutes)
    )
      ? ""
      : String(minutes);
  };

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

  // =========================================================
  // DEFAULT TIMER
  // =========================================================

  const initialDefaultMinutes =
    getDefaultFocusMinutes();

  // =========================================================
  // DATA
  // =========================================================

  const [subjects, setSubjects] =
    useState([]);

  const [sessions, setSessions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  // =========================================================
  // STATUS MESSAGES
  // =========================================================

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // =========================================================
  // TIMER CONFIG
  // =========================================================

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

  // =========================================================
  // TIMER STATE
  // =========================================================

  const [status, setStatus] =
    useState("idle");

  /*
    status:
    idle
    running
    paused
  */

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

  /*
    Freeze subject information
    once the session begins.

    That way renaming/deleting a
    subject doesn't mutate the
    current timer.
  */

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
    savingSession,
    setSavingSession,
  ] = useState(false);

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  // =========================================================
  // DELETE SESSION
  // =========================================================

  const [
    sessionToDelete,
    setSessionToDelete,
  ] = useState(null);

  const [
    deletingSession,
    setDeletingSession,
  ] = useState(false);

  // =========================================================
  // REFS
  // =========================================================

  const autoFinishLockRef =
    useRef(false);

  const finishSessionRef =
    useRef(null);

  // =========================================================
  // MESSAGE HELPERS
  // =========================================================

  const showSuccess = (
    text
  ) => {
    setError("");
    setMessage(text);

    window.setTimeout(
      () => {
        setMessage("");
      },
      3000
    );
  };

  const showError = (
    text
  ) => {
    setMessage("");
    setError(text);
  };

  // =========================================================
  // FETCH SUBJECTS
  // =========================================================

  const fetchSubjects =
    async () => {
      let data;

      if (isGuest) {
        data =
          await localDb.getAll(
            "subjects"
          );

        data = [
          ...data,
        ].sort(
          (a, b) =>
            new Date(
              b.createdAt || 0
            ) -
            new Date(
              a.createdAt || 0
            )
        );
      } else {
        data =
          await apiRequest(
            "/api/subjects"
          );
      }

      setSubjects(
        Array.isArray(data)
          ? data
          : []
      );
    };

  // =========================================================
  // FETCH SESSIONS
  // =========================================================

  const fetchSessions =
    async () => {
      const data =
        await getStudySessions(
          isGuest
        );

      setSessions(
        Array.isArray(data)
          ? data
          : []
      );
    };

  // =========================================================
  // REFRESH
  // =========================================================

  const refreshData =
    async () => {
      try {
        setRefreshing(true);

        setError("");

        await Promise.all([
          fetchSubjects(),
          fetchSessions(),
        ]);

        /*
          When timer is idle,
          refresh also picks up
          the newest Settings
          default duration.
        */

        if (
          status === "idle"
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
          refreshError.message ||
            "Couldn't refresh Focus."
        );
      } finally {
        setRefreshing(false);
      }
    };

  // =========================================================
  // COMPLETION NOTIFICATION
  // =========================================================

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
            body: `${subjectName} session finished. Nice work.`,
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

  // =========================================================
  // RESTORE TIMER
  // =========================================================

  const restoreTimer =
    async () => {
      const raw =
        localStorage.getItem(
          timerStorageKey
        );

      if (!raw) {
        return;
      }

      try {
        const saved =
          JSON.parse(raw);

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

        // =====================================================
        // RUNNING TIMER
        // =====================================================

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
                  (target -
                    Date.now()) /
                    1000
                )
              );

            /*
              Timer completed while
              browser/page was away.
            */

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
                    }
                  );

                setSessions(
                  (
                    currentSessions
                  ) => [
                    restoredSession,
                    ...currentSessions,
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

                /*
                  After restoring a
                  completed session,
                  return timer to the
                  current Settings
                  default.
                */

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

                setTargetEndAt(
                  null
                );

                return;
              } catch (
                restoreError
              ) {
                console.error(
                  "Failed to restore completed timer:",
                  restoreError
                );

                /*
                  Don't lose study
                  progress if backend
                  couldn't save.
                */

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

        // =====================================================
        // PAUSED TIMER
        // =====================================================

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

        /*
          Unknown timer state.
        */

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

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    let cancelled =
      false;

    const initialize =
      async () => {
        try {
          setLoading(true);

          await Promise.all([
            fetchSubjects(),
            fetchSessions(),
          ]);

          if (cancelled) {
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
              initializeError.message ||
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
      cancelled = true;
    };
  }, [
    isGuest,
    timerStorageKey,
  ]);

  // =========================================================
  // PERSIST TIMER
  // =========================================================

  useEffect(() => {
    if (!hydrated) {
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
      version: 1,

      status,

      plannedMinutes,

      remainingSeconds,

      targetEndAt,

      startedAt,

      activeSubjectId,

      activeSubjectName,
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
    activeSubjectId,
    activeSubjectName,
  ]);

  // =========================================================
  // TIMER LOOP
  // =========================================================

  useEffect(() => {
    if (
      status !==
        "running" ||
      !targetEndAt
    ) {
      return;
    }

    const tick = () => {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (targetEndAt -
              Date.now()) /
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

  // =========================================================
  // CHOOSE PRESET
  // =========================================================

  const chooseDuration = (
    minutes
  ) => {
    if (
      status !== "idle"
    ) {
      return;
    }

    setPlannedMinutes(
      minutes
    );

    setRemainingSeconds(
      minutes * 60
    );

    setCustomMinutes(
      ""
    );
  };

  // =========================================================
  // CUSTOM DURATION
  // =========================================================

  const handleCustomMinutes =
    (event) => {
      if (
        status !== "idle"
      ) {
        return;
      }

      const value =
        event.target.value;

      setCustomMinutes(
        value
      );

      const number =
        Number(value);

      if (
        Number.isFinite(number) &&
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

  // =========================================================
  // START SESSION
  // =========================================================

  const startSession =
    () => {
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

      const selectedSubject =
        subjects.find(
          (subject) =>
            subject._id ===
            selectedSubjectId
        );

      const now =
        Date.now();

      const totalSeconds =
        duration *
        60;

      setActiveSubjectId(
        selectedSubject?._id ||
          null
      );

      setActiveSubjectName(
        selectedSubject?.name ||
          "General Study"
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
    };

  // =========================================================
  // PAUSE SESSION
  // =========================================================

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
            (targetEndAt -
              Date.now()) /
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

  // =========================================================
  // RESUME SESSION
  // =========================================================

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

  // =========================================================
  // FINISH + SAVE SESSION
  // =========================================================

  const finishSession =
    async (
      automatic = false,
      forcedRemaining = null
    ) => {
      if (
        savingSession ||
        status === "idle"
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
              (targetEndAt -
                Date.now()) /
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
            }
          );

        setSessions(
          (
            currentSessions
          ) => [
            savedSession,
            ...currentSessions,
          ]
        );

        /*
          After completing a
          session, use whatever
          default is currently
          configured in Settings.
        */

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

        setSelectedSubjectId(
          ""
        );

        setActiveSubjectId(
          null
        );

        setActiveSubjectName(
          "General Study"
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
          saveError.message ||
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

  // =========================================================
  // RESET IDLE TIMER
  // =========================================================

  const resetIdleTimer =
    () => {
      if (
        status !== "idle"
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

      setError("");
      setMessage("");
    };

  // =========================================================
  // DELETE SESSION
  // =========================================================

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
            currentSessions
          ) =>
            currentSessions.filter(
              (session) =>
                session._id !==
                sessionToDelete._id
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
          deleteError.message ||
            "Couldn't delete the session."
        );
      } finally {
        setDeletingSession(
          false
        );
      }
    };

  // =========================================================
  // DATE HELPERS
  // =========================================================

  const getDateKey =
    (date) => {
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
    (value) => {
      const date =
        new Date(value);

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

  // =========================================================
  // SESSION STATS
  // =========================================================

  const stats =
    useMemo(() => {
      let totalSeconds =
        0;

      let todaySeconds =
        0;

      let weekSeconds =
        0;

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
        (session) => {
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
    }, [sessions]);

  // =========================================================
  // FORMAT TIMER
  // =========================================================

  const formatTimer =
    (seconds) => {
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
          (safe % 3600) /
            60
        );

      const secs =
        safe % 60;

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

  // =========================================================
  // FORMAT STUDY TIME
  // =========================================================

  const formatStudyTime =
    (seconds) => {
      const safeSeconds =
        Math.max(
          0,
          Math.floor(
            Number(seconds) ||
              0
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

  // =========================================================
  // SESSION DATE
  // =========================================================

  const formatSessionDate =
    (value) => {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "Unknown";
      }

      if (
        isToday(date)
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

  // =========================================================
  // TIMER PROGRESS
  // =========================================================

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
        (elapsedSeconds /
          totalTimerSeconds) *
          100
      )
    );

  const progressDegrees =
    progressPercent *
    3.6;

  // =========================================================
  // STATUS LABEL
  // =========================================================

  const timerStatusLabel =
    () => {
      if (
        status ===
        "running"
      ) {
        return "FOCUSING";
      }

      if (
        status ===
        "paused"
      ) {
        return "PAUSED";
      }

      return "READY";
    };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="dashboard focus-v1-page">

      {/* HEADER */}

      <header className="dashboard-header focus-v1-header">

        <div>

          <h1>
            Focus ⏱️
          </h1>

          <p>
            Run focused study
            sessions and build a
            real record of your
            study time.
          </p>

        </div>

        <button
          type="button"
          className="focus-v1-refresh"
          disabled={
            refreshing
          }
          onClick={
            refreshData
          }
        >

          <RefreshCw
            size={16}
            className={
              refreshing
                ? "focus-v1-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </header>

      {/* SUCCESS MESSAGE */}

      {message && (
        <div className="focus-v1-message success">

          <CheckCircle2
            size={17}
          />

          <span>
            {message}
          </span>

        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="focus-v1-message error">

          <div>

            <strong>
              Something went wrong
            </strong>

            <span>
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            Dismiss
          </button>

        </div>
      )}

      {loading ? (

        <div className="dashboard-card">
          Loading Focus...
        </div>

      ) : (

        <>
          {/* =================================================
              STATS
          ================================================= */}

          <section className="focus-v1-stats">

            <div className="focus-v1-stat">

              <Clock3
                size={19}
              />

              <div>

                <span>
                  Today
                </span>

                <strong>
                  {formatStudyTime(
                    stats.todaySeconds
                  )}
                </strong>

              </div>

            </div>

            <div className="focus-v1-stat">

              <Flame
                size={19}
              />

              <div>

                <span>
                  Last 7 Days
                </span>

                <strong>
                  {formatStudyTime(
                    stats.weekSeconds
                  )}
                </strong>

              </div>

            </div>

            <div className="focus-v1-stat">

              <History
                size={19}
              />

              <div>

                <span>
                  Sessions
                </span>

                <strong>
                  {
                    stats.sessionCount
                  }
                </strong>

              </div>

            </div>

            <div className="focus-v1-stat">

              <Timer
                size={19}
              />

              <div>

                <span>
                  Total Focus
                </span>

                <strong>
                  {formatStudyTime(
                    stats.totalSeconds
                  )}
                </strong>

              </div>

            </div>

          </section>

          {/* =================================================
              MAIN TIMER
          ================================================= */}

          <section className="focus-v1-main-grid">

            <div className="dashboard-card focus-v1-timer-card">

              {/* CONFIG */}

              <div className="focus-v1-config">

                <div className="focus-v1-config-block">

                  <label>
                    Subject
                  </label>

                  <div className="focus-v1-select-wrap focus-v2-select-wrap">

                    <BookOpen
                      size={16}
                    />

                    <StudySelect
                      value={
                        selectedSubjectId
                      }
                      onChange={
                        setSelectedSubjectId
                      }
                      options={[
                        {
                          value: "",
                          label: "General Study",
                          description: "Focus without linking a subject",
                        },
                        ...subjects.map(
                          (subject) => ({
                            value: subject._id,
                            label: subject.name,
                            description: subject.code || "Subject",
                            color: subject.color || "#6366f1",
                          })
                        ),
                      ]}
                      placeholder="General Study"
                      className="focus-v2-subject-select"
                      disabled={
                        status !==
                        "idle"
                      }
                      ariaLabel="Choose Focus subject"
                    />

                  </div>

                </div>

                {/* DURATION */}

                <div className="focus-v1-config-block">

                  <label>
                    Duration
                  </label>

                  <div className="focus-v1-presets">

                    {PRESET_DURATIONS.map(
                      (
                        minutes
                      ) => (

                        <button
                          key={
                            minutes
                          }
                          type="button"
                          disabled={
                            status !==
                            "idle"
                          }
                          className={
                            plannedMinutes ===
                              minutes &&
                            customMinutes ===
                              ""
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            chooseDuration(
                              minutes
                            )
                          }
                        >
                          {minutes}m
                        </button>

                      )
                    )}

                  </div>

                  <div className="focus-v1-custom">

                    <input
                      type="number"
                      min="1"
                      max="720"
                      placeholder="Custom"
                      value={
                        customMinutes
                      }
                      disabled={
                        status !==
                        "idle"
                      }
                      onChange={
                        handleCustomMinutes
                      }
                    />

                    <span>
                      min
                    </span>

                  </div>

                </div>

              </div>

              {/* =================================================
                  TIMER RING
              ================================================= */}

              <div className="focus-v1-timer-area">

                <div
                  className="focus-v1-ring"
                  style={{
                    "--focus-progress":
                      `${progressDegrees}deg`,
                  }}
                >

                  <div className="focus-v1-ring-inner">

                    <span
                      className={`focus-v1-status ${status}`}
                    >
                      {timerStatusLabel()}
                    </span>

                    <strong>
                      {formatTimer(
                        remainingSeconds
                      )}
                    </strong>

                    <small>
                      {status ===
                      "idle"
                        ? `${plannedMinutes} minute session`
                        : activeSubjectName}
                    </small>

                  </div>

                </div>

              </div>

              {/* =================================================
                  CONTROLS
              ================================================= */}

              <div className="focus-v1-controls">

                {status ===
                  "idle" && (
                  <>

                    <button
                      type="button"
                      className="focus-v1-primary"
                      onClick={
                        startSession
                      }
                    >

                      <Play
                        size={18}
                      />

                      Start Focus

                    </button>

                    <button
                      type="button"
                      className="focus-v1-secondary"
                      onClick={
                        resetIdleTimer
                      }
                    >

                      <RotateCcw
                        size={17}
                      />

                      Reset

                    </button>

                  </>
                )}

                {status ===
                  "running" && (
                  <>

                    <button
                      type="button"
                      className="focus-v1-primary"
                      onClick={
                        pauseSession
                      }
                    >

                      <Pause
                        size={18}
                      />

                      Pause

                    </button>

                    <button
                      type="button"
                      className="focus-v1-finish"
                      disabled={
                        savingSession
                      }
                      onClick={() =>
                        finishSession(
                          false
                        )
                      }
                    >

                      <CheckCircle2
                        size={18}
                      />

                      {savingSession
                        ? "Saving..."
                        : "Finish"}

                    </button>

                  </>
                )}

                {status ===
                  "paused" && (
                  <>

                    {remainingSeconds >
                      0 && (

                      <button
                        type="button"
                        className="focus-v1-primary"
                        onClick={
                          resumeSession
                        }
                      >

                        <Play
                          size={18}
                        />

                        Resume

                      </button>

                    )}

                    <button
                      type="button"
                      className="focus-v1-finish"
                      disabled={
                        savingSession
                      }
                      onClick={() =>
                        finishSession(
                          false
                        )
                      }
                    >

                      <CheckCircle2
                        size={18}
                      />

                      {savingSession
                        ? "Saving..."
                        : "Finish"}

                    </button>

                  </>
                )}

              </div>

              <p className="focus-v1-persistence-note">
                You can refresh StudyOS
                or move to another page.
                Your timer will continue
                correctly.
              </p>

            </div>

            {/* =================================================
                CURRENT SESSION
            ================================================= */}

            <aside className="dashboard-card focus-v1-side-card">

              <span className="focus-v1-eyebrow">
                CURRENT SESSION
              </span>

              <h2>
                {status ===
                "idle"
                  ? "Ready when you are."
                  : activeSubjectName}
              </h2>

              <p>
                {status ===
                "idle"
                  ? "Choose a subject and duration, then start a focused block."
                  : status ===
                    "running"
                  ? "Timer is running. Stay with the task in front of you."
                  : "Session is paused. Resume when you're ready."}
              </p>

              <div className="focus-v1-session-details">

                <div>

                  <span>
                    Target
                  </span>

                  <strong>
                    {
                      plannedMinutes
                    }{" "}
                    min
                  </strong>

                </div>

                <div>

                  <span>
                    Studied
                  </span>

                  <strong>
                    {formatStudyTime(
                      elapsedSeconds
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Progress
                  </span>

                  <strong>
                    {Math.round(
                      progressPercent
                    )}
                    %
                  </strong>

                </div>

              </div>

              <div className="focus-v1-mini-progress">

                <div
                  style={{
                    width:
                      `${progressPercent}%`,
                  }}
                />

              </div>

            </aside>

          </section>

          {/* =================================================
              HISTORY
          ================================================= */}

          <section className="dashboard-card focus-v1-history">

            <div className="focus-v1-section-header">

              <div>

                <span className="focus-v1-eyebrow">
                  HISTORY
                </span>

                <h2>
                  Study Sessions
                </h2>

                <p>
                  Your most recent
                  focused study blocks.
                </p>

              </div>

              <span className="focus-v1-history-count">
                {sessions.length}{" "}
                {sessions.length ===
                1
                  ? "session"
                  : "sessions"}
              </span>

            </div>

            {sessions.length ===
            0 ? (

              <div className="focus-v1-empty">

                <Timer
                  size={28}
                />

                <strong>
                  No study sessions yet
                </strong>

                <p>
                  Finish your first
                  Focus session and
                  it'll appear here.
                </p>

              </div>

            ) : (

              <div className="focus-v1-history-list">

                {sessions
                  .slice(
                    0,
                    10
                  )
                  .map(
                    (
                      session
                    ) => (

                      <div
                        className="focus-v1-history-item"
                        key={
                          session._id
                        }
                      >

                        <div className="focus-v1-history-icon">

                          <BookOpen
                            size={17}
                          />

                        </div>

                        <div className="focus-v1-history-content">

                          <strong>
                            {session.subjectName ||
                              "General Study"}
                          </strong>

                          <span>
                            {formatSessionDate(
                              session.endedAt
                            )}
                          </span>

                        </div>

                        <div className="focus-v1-history-duration">

                          <strong>
                            {formatStudyTime(
                              session.durationSeconds
                            )}
                          </strong>

                          <span>
                            target{" "}
                            {
                              session.plannedMinutes
                            }
                            m
                          </span>

                        </div>

                        <button
                          type="button"
                          className="focus-v1-delete"
                          aria-label={`Delete ${
                            session.subjectName ||
                            "study"
                          } session`}
                          onClick={() =>
                            setSessionToDelete(
                              session
                            )
                          }
                        >

                          <Trash2
                            size={16}
                          />

                        </button>

                      </div>

                    )
                  )}

              </div>

            )}

          </section>

        </>
      )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {sessionToDelete && (

        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (
              !deletingSession
            ) {
              setSessionToDelete(
                null
              );
            }
          }}
        >

          <div
            className="delete-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="delete-modal-icon">
              🗑️
            </div>

            <h2>
              Delete this session?
            </h2>

            <p>
              This removes the{" "}

              <strong>
                {sessionToDelete.subjectName ||
                  "General Study"}
              </strong>{" "}

              session from your
              progress history.
            </p>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="cancel-delete-button"
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
                className="confirm-delete-button"
                disabled={
                  deletingSession
                }
                onClick={
                  deleteSession
                }
              >

                {deletingSession
                  ? "Deleting..."
                  : "Delete Session"}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Focus;