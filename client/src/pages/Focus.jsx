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
        1,

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
    timerStorageKey,
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


  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="v2f-page">

      {/* HEADER */}

      <header className="v2f-header">

        <div>

          <span className="v2f-eyebrow">
            Deep work
          </span>

          <h1>
            Focus
          </h1>

          <p>
            Run distraction-free study sessions
            and build an accurate record of your
            focused work.
          </p>

        </div>


        <button
          type="button"
          className="v2f-refresh"
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
                ? "v2f-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}

        </button>

      </header>


      {/* SUCCESS */}

      {message && (
        <div className="v2f-message is-success">

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
        <div className="v2f-message is-error">

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

        <section className="v2f-loading">

          <RefreshCw
            size={22}
            className="v2f-spin"
          />

          <strong>
            Loading Focus
          </strong>

          <span>
            Preparing your timer and study history.
          </span>

        </section>

      ) : (
        <>

          {/* STATS */}

          <section className="v2f-stats">

            <FocusStat
              icon={
                <Clock3
                  size={19}
                />
              }
              label="Today"
              value={
                formatStudyTime(
                  stats.todaySeconds
                )
              }
              description="Focused today"
            />

            <FocusStat
              icon={
                <Flame
                  size={19}
                />
              }
              label="Last 7 days"
              value={
                formatStudyTime(
                  stats.weekSeconds
                )
              }
              description="Recent focus"
            />

            <FocusStat
              icon={
                <History
                  size={19}
                />
              }
              label="Sessions"
              value={
                stats.sessionCount
              }
              description="Completed sessions"
            />

            <FocusStat
              icon={
                <Timer
                  size={19}
                />
              }
              label="Total focus"
              value={
                formatStudyTime(
                  stats.totalSeconds
                )
              }
              description="All-time study"
            />

          </section>


          {/* TIMER WORKSPACE */}

          <section className="v2f-workspace">

            {/* TIMER */}

            <main className="v2f-timer-card">

              {/* CONFIG */}

              <div className="v2f-config">

                <div className="v2f-config-block">

                  <span className="v2f-config-label">
                    Subject
                  </span>

                  <StudySelect
                    value={
                      selectedSubjectId
                    }
                    onChange={(
                      value
                    ) =>
                      setSelectedSubjectId(
                        String(
                          value
                        )
                      )
                    }
                    options={
                      subjectOptions
                    }
                    placeholder="General Study"
                    className="v2f-subject-select"
                    disabled={
                      status !==
                      "idle"
                    }
                    ariaLabel="Choose Focus subject"
                  />

                </div>


                <div className="v2f-config-block">

                  <span className="v2f-config-label">
                    Duration
                  </span>

                  <div className="v2f-duration-row">

                    <div className="v2f-presets">

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
                                ? "is-active"
                                : ""
                            }
                            onClick={() =>
                              chooseDuration(
                                minutes
                              )
                            }
                          >
                            {minutes} min
                          </button>
                        )
                      )}

                    </div>


                    <label className="v2f-custom">

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

                    </label>

                  </div>

                </div>

              </div>


              {/* TIMER */}

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
                      strokeDashoffset={
                        100 -
                        progressPercent
                      }
                    />

                  </svg>


                  <div className="v2f-ring-content">

                    <span
                      className={`v2f-status is-${status}`}
                    >
                      <span />
                      {timerStatusLabel()}
                    </span>


                    <strong className="v2f-time">
                      {formatTimer(
                        remainingSeconds
                      )}
                    </strong>


                    <span className="v2f-timer-subject">
                      {status ===
                      "idle"
                        ? `${plannedMinutes} minute session`
                        : activeSubjectName}
                    </span>

                  </div>

                </div>

              </div>


              {/* CONTROLS */}

              <div className="v2f-controls">

                {status ===
                  "idle" && (
                  <>

                    <button
                      type="button"
                      className="v2f-primary-action"
                      onClick={
                        startSession
                      }
                    >

                      <Play
                        size={19}
                      />

                      Start focus

                    </button>


                    <button
                      type="button"
                      className="v2f-secondary-action"
                      onClick={
                        resetIdleTimer
                      }
                    >

                      <RotateCcw
                        size={18}
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
                      className="v2f-primary-action"
                      onClick={
                        pauseSession
                      }
                    >

                      <Pause
                        size={19}
                      />

                      Pause

                    </button>


                    <button
                      type="button"
                      className="v2f-secondary-action"
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
                        className="v2f-primary-action"
                        onClick={
                          resumeSession
                        }
                      >

                        <Play
                          size={19}
                        />

                        Resume

                      </button>
                    )}


                    <button
                      type="button"
                      className="v2f-secondary-action"
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


              <p className="v2f-persistence-note">
                Your timer keeps running if you refresh
                StudyOS or move to another page.
              </p>

            </main>


            {/* CURRENT SESSION */}

            <aside className="v2f-session-card">

              <span className="v2f-eyebrow">
                Current session
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
                  ? "Timer is running. Keep your attention on the work in front of you."
                  : "Session is paused. Resume whenever you're ready."}
              </p>


              <div className="v2f-session-metrics">

                <div>

                  <span>
                    Target
                  </span>

                  <strong>
                    {plannedMinutes} min
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
                    )}%
                  </strong>

                </div>

              </div>


              <div className="v2f-progress">

                <div
                  style={{
                    width:
                      `${progressPercent}%`,
                  }}
                />

              </div>


              <div className="v2f-session-note">

                <Clock3
                  size={16}
                />

                <span>
                  {status ===
                  "idle"
                    ? "Start whenever you're ready."
                    : status ===
                      "running"
                    ? "Session is being tracked."
                    : "Progress is safely paused."}
                </span>

              </div>

            </aside>

          </section>


          {/* HISTORY */}

          <section className="v2f-history">

            <div className="v2f-history-header">

              <div>

                <span className="v2f-eyebrow">
                  History
                </span>

                <h2>
                  Study sessions
                </h2>

                <p>
                  Your most recent completed focus blocks.
                </p>

              </div>


              <span className="v2f-history-count">
                {sessions.length}{" "}
                {sessions.length ===
                1
                  ? "session"
                  : "sessions"}
              </span>

            </div>


            {sessions.length ===
            0 ? (

              <div className="v2f-empty">

                <Timer
                  size={28}
                />

                <strong>
                  No study sessions yet
                </strong>

                <span>
                  Finish your first Focus session and
                  it will appear here.
                </span>

              </div>

            ) : (

              <div className="v2f-history-list">

                {sessions
                  .slice(
                    0,
                    10
                  )
                  .map(
                    (
                      session
                    ) => (
                      <article
                        className="v2f-history-item"
                        key={
                          session._id
                        }
                      >

                        <span className="v2f-history-icon">

                          <BookOpen
                            size={18}
                          />

                        </span>


                        <div className="v2f-history-copy">

                          <strong>
                            {session.subjectName ||
                              "General Study"}
                          </strong>

                          <span>
                            {formatSessionDate(
                              session.endedAt ||
                                session.startedAt
                            )}
                          </span>

                        </div>


                        <div className="v2f-history-duration">

                          <strong>
                            {formatStudyTime(
                              session.durationSeconds
                            )}
                          </strong>

                          <span>
                            {session.plannedMinutes
                              ? `Target ${session.plannedMinutes} min`
                              : "Focus session"}
                          </span>

                        </div>


                        <button
                          type="button"
                          className="v2f-delete"
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
                            size={17}
                          />

                        </button>

                      </article>
                    )
                  )}

              </div>

            )}

          </section>

        </>
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
            aria-modal="true"
          >

            <span className="v2f-delete-icon">

              <Trash2
                size={22}
              />

            </span>


            <div className="v2f-delete-copy">

              <h2>
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

function FocusStat({
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="v2f-stat">

      <span className="v2f-stat-icon">
        {icon}
      </span>


      <div>

        <span className="v2f-stat-label">
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>

      </div>

    </article>
  );
}


export default Focus;
