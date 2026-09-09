import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  Link2,
  Minus,
  Pin,
  RefreshCw,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

import apiRequest from "../services/api";

import {
  localDb,
} from "../services/localDb";

import {
  getStudySessions,
} from "../services/studySessionData";

// =========================================================
// DATE HELPERS
// =========================================================

const safeDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

const startOfDay = (
  value = new Date()
) => {
  const date =
    new Date(value);

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const addDays = (
  value,
  amount
) => {
  const date =
    new Date(value);

  date.setDate(
    date.getDate() +
      amount
  );

  return startOfDay(
    date
  );
};

const dateKey = (
  value
) => {
  const date =
    startOfDay(
      value
    );

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

// =========================================================
// GENERAL HELPERS
// =========================================================

const getSubjectId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return String(
      value._id ||
        value.id ||
        ""
    );
  }

  return String(
    value
  );
};

const formatStudyTime = (
  seconds
) => {
  const safe =
    Math.max(
      0,
      Number(seconds) ||
        0
    );

  const minutes =
    Math.floor(
      safe / 60
    );

  const hours =
    Math.floor(
      minutes / 60
    );

  const remaining =
    minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remaining}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  if (safe > 0) {
    return `${Math.floor(
      safe
    )}s`;
  }

  return "0m";
};

const formatChartValue = (
  seconds
) => {
  const minutes =
    Math.round(
      Math.max(
        0,
        Number(seconds) ||
          0
      ) / 60
    );

  if (
    minutes >= 60
  ) {
    const hours =
      minutes / 60;

    return `${hours.toFixed(
      hours >= 10
        ? 0
        : 1
    )}h`;
  }

  return `${minutes}m`;
};

const formatRelativeActivity = (
  value
) => {
  const date =
    safeDate(
      value
    );

  if (!date) {
    return "";
  }

  const now =
    new Date();

  const today =
    startOfDay(
      now
    );

  const target =
    startOfDay(
      date
    );

  const diffDays =
    Math.round(
      (
        today.getTime() -
        target.getTime()
      ) /
        86400000
    );

  const time =
    date.toLocaleTimeString(
      "en-IN",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );

  if (
    diffDays === 0
  ) {
    return `Today · ${time}`;
  }

  if (
    diffDays === 1
  ) {
    return `Yesterday · ${time}`;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "numeric",

      month:
        "short",
    }
  );
};

// =========================================================
// PROGRESS
// =========================================================

function Progress() {
  const {
    isGuest,
  } = useAuth();

  // =======================================================
  // DATA
  // =======================================================

  const [
    tasks,
    setTasks,
  ] = useState([]);

  const [
    sessions,
    setSessions,
  ] = useState([]);

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    notes,
    setNotes,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    dailyGoalMinutes,
    setDailyGoalMinutes,
  ] = useState(() => {
    const stored =
      Number(
        localStorage.getItem(
          "studyos_study_goal"
        )
      );

    return (
      Number.isFinite(
        stored
      ) &&
      stored > 0
        ? stored * 60
        : 120
    );
  });

  // =======================================================
  // LOAD
  // =======================================================

  const loadProgress =
    async (
      manual = false
    ) => {
      try {
        if (manual) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");

        const tasksPromise =
          isGuest
            ? localDb.getAll(
                "tasks"
              )
            : apiRequest(
                "/api/tasks"
              );

        const subjectsPromise =
          isGuest
            ? localDb.getAll(
                "subjects"
              )
            : apiRequest(
                "/api/subjects"
              );

        const notesPromise =
          isGuest
            ? localDb.getAll(
                "notes"
              )
            : apiRequest(
                "/api/notes"
              );

        const [
          taskData,
          sessionData,
          subjectData,
          noteData,
        ] =
          await Promise.all([
            tasksPromise,

            getStudySessions(
              isGuest
            ),

            subjectsPromise,

            notesPromise,
          ]);

        setTasks(
          Array.isArray(
            taskData
          )
            ? taskData
            : []
        );

        setSessions(
          Array.isArray(
            sessionData
          )
            ? sessionData
            : []
        );

        setSubjects(
          Array.isArray(
            subjectData
          )
            ? subjectData
            : []
        );

        setNotes(
          Array.isArray(
            noteData
          )
            ? noteData
            : []
        );

        const goal =
          Number(
            localStorage.getItem(
              "studyos_study_goal"
            )
          );

        setDailyGoalMinutes(
          Number.isFinite(
            goal
          ) &&
          goal > 0
            ? goal * 60
            : 120
        );
      } catch (
        loadError
      ) {
        console.error(
          "Progress load failed:",
          loadError
        );

        setError(
          loadError?.message ||
            "Could not load your progress."
        );
      } finally {
        setLoading(
          false
        );

        setRefreshing(
          false
        );
      }
    };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadProgress(
      false
    );
  }, [
    isGuest,
  ]);

  // =======================================================
  // LIVE UPDATES
  // =======================================================

  useEffect(() => {
    const refresh =
      () => {
        loadProgress(
          false
        );
      };

    const events = [
      "studyos-sessions-updated",
      "studyos-tasks-updated",
      "studyos-subjects-updated",
      "studyos-notes-updated",
      "studyos-focus-settings-updated",
      "studyos-preferences-updated",
    ];

    events.forEach(
      (
        eventName
      ) => {
        window.addEventListener(
          eventName,
          refresh
        );
      }
    );

    return () => {
      events.forEach(
        (
          eventName
        ) => {
          window.removeEventListener(
            eventName,
            refresh
          );
        }
      );
    };
  }, [
    isGuest,
  ]);

  // =======================================================
  // NORMALIZED SESSIONS
  // =======================================================

  const validSessions =
    useMemo(() => {
      return sessions
        .map(
          (
            session
          ) => {
            const duration =
              Number(
                session.durationSeconds
              ) ||
              0;

            const activityDate =
              safeDate(
                session.endedAt ||
                  session.startedAt ||
                  session.createdAt
              );

            return {
              ...session,

              _duration:
                Math.max(
                  0,
                  duration
                ),

              _date:
                activityDate,
            };
          }
        )
        .filter(
          (
            session
          ) =>
            session._duration >
              0 &&
            session._date
        );
    }, [
      sessions,
    ]);

  // =======================================================
  // TASKS
  // =======================================================

  const completedTasks =
    useMemo(
      () =>
        tasks.filter(
          (
            task
          ) =>
            Boolean(
              task.completed
            )
        ),
      [
        tasks,
      ]
    );

  const completedTimestamped =
    useMemo(() => {
      return completedTasks
        .map(
          (
            task
          ) => ({
            ...task,

            _date:
              safeDate(
                task.completedAt
              ),
          })
        )
        .filter(
          (
            task
          ) =>
            task._date
        );
    }, [
      completedTasks,
    ]);

  // =======================================================
  // BASIC TASK STATS
  // =======================================================

  const totalTasks =
    tasks.length;

  const completedCount =
    completedTasks.length;

  const pendingCount =
    Math.max(
      0,
      totalTasks -
        completedCount
    );

  const completionRate =
    totalTasks > 0
      ? Math.round(
          (
            completedCount /
            totalTasks
          ) *
            100
        )
      : 0;

  // =======================================================
  // TIME PERIODS
  // =======================================================

  const today =
    startOfDay(
      new Date()
    );

  const currentWeekStart =
    addDays(
      today,
      -6
    );

  const previousWeekStart =
    addDays(
      today,
      -13
    );

  const previousWeekEnd =
    addDays(
      today,
      -7
    );

  const thirtyDayStart =
    addDays(
      today,
      -29
    );

  // =======================================================
  // DAILY ACTIVITY MAP
  // =======================================================

  const focusByDay =
    useMemo(() => {
      const map =
        new Map();

      validSessions.forEach(
        (
          session
        ) => {
          const key =
            dateKey(
              session._date
            );

          map.set(
            key,
            (
              map.get(
                key
              ) ||
              0
            ) +
              session._duration
          );
        }
      );

      return map;
    }, [
      validSessions,
    ]);

  const tasksByDay =
    useMemo(() => {
      const map =
        new Map();

      completedTimestamped.forEach(
        (
          task
        ) => {
          const key =
            dateKey(
              task._date
            );

          map.set(
            key,
            (
              map.get(
                key
              ) ||
              0
            ) +
              1
          );
        }
      );

      return map;
    }, [
      completedTimestamped,
    ]);

  // =======================================================
  // CURRENT WEEK
  // =======================================================

  const weekActivity =
    useMemo(() => {
      return Array.from(
        {
          length:
            7,
        },
        (
          _,
          index
        ) => {
          const date =
            addDays(
              currentWeekStart,
              index
            );

          const key =
            dateKey(
              date
            );

          return {
            key,

            date,

            label:
              date.toLocaleDateString(
                "en-IN",
                {
                  weekday:
                    "short",
                }
              ),

            shortDate:
              date.toLocaleDateString(
                "en-IN",
                {
                  day:
                    "numeric",
                }
              ),

            focusSeconds:
              focusByDay.get(
                key
              ) ||
              0,

            tasks:
              tasksByDay.get(
                key
              ) ||
              0,

            isToday:
              key ===
              dateKey(
                today
              ),
          };
        }
      );
    }, [
      focusByDay,
      tasksByDay,
    ]);

  // =======================================================
  // WEEK TOTAL
  // =======================================================

  const weekStudySeconds =
    useMemo(
      () =>
        weekActivity.reduce(
          (
            total,
            day
          ) =>
            total +
            day.focusSeconds,
          0
        ),
      [
        weekActivity,
      ]
    );

  // =======================================================
  // PREVIOUS WEEK
  // =======================================================

  const previousWeekSeconds =
    useMemo(() => {
      return validSessions.reduce(
        (
          total,
          session
        ) => {
          const day =
            startOfDay(
              session._date
            );

          if (
            day <
              previousWeekStart ||
            day >
              previousWeekEnd
          ) {
            return total;
          }

          return (
            total +
            session._duration
          );
        },
        0
      );
    }, [
      validSessions,
    ]);

  // =======================================================
  // TREND
  // =======================================================

  const weekTrend =
    useMemo(() => {
      if (
        previousWeekSeconds ===
          0 &&
        weekStudySeconds ===
          0
      ) {
        return {
          direction:
            "flat",

          value:
            0,

          label:
            "No change",
        };
      }

      if (
        previousWeekSeconds ===
        0
      ) {
        return {
          direction:
            "up",

          value:
            null,

          label:
            "New activity",
        };
      }

      const change =
        Math.round(
          (
            (
              weekStudySeconds -
              previousWeekSeconds
            ) /
            previousWeekSeconds
          ) *
            100
        );

      if (
        change > 0
      ) {
        return {
          direction:
            "up",

          value:
            Math.abs(
              change
            ),

          label:
            "vs previous 7 days",
        };
      }

      if (
        change < 0
      ) {
        return {
          direction:
            "down",

          value:
            Math.abs(
              change
            ),

          label:
            "vs previous 7 days",
        };
      }

      return {
        direction:
          "flat",

        value:
          0,

        label:
          "vs previous 7 days",
      };
    }, [
      weekStudySeconds,
      previousWeekSeconds,
    ]);

  // =======================================================
  // TODAY
  // =======================================================

  const todayFocusSeconds =
    focusByDay.get(
      dateKey(
        today
      )
    ) ||
    0;

  const todayFocusMinutes =
    todayFocusSeconds /
    60;

  const goalPercent =
    dailyGoalMinutes > 0
      ? Math.round(
          (
            todayFocusMinutes /
            dailyGoalMinutes
          ) *
            100
        )
      : 0;

  const goalBarPercent =
    Math.min(
      100,
      Math.max(
        0,
        goalPercent
      )
    );

  const remainingGoalMinutes =
    Math.max(
      0,
      Math.ceil(
        dailyGoalMinutes -
          todayFocusMinutes
      )
    );

  // =======================================================
  // TOTAL STUDY
  // =======================================================

  const totalStudySeconds =
    useMemo(
      () =>
        validSessions.reduce(
          (
            total,
            session
          ) =>
            total +
            session._duration,
          0
        ),
      [
        validSessions,
      ]
    );

  // =======================================================
  // CURRENT STREAK
  // =======================================================

  const currentStreak =
    useMemo(() => {
      const activeDays =
        new Set(
          validSessions.map(
            (
              session
            ) =>
              dateKey(
                session._date
              )
          )
        );

      if (
        activeDays.size ===
        0
      ) {
        return 0;
      }

      let cursor =
        today;

      if (
        !activeDays.has(
          dateKey(
            cursor
          )
        )
      ) {
        cursor =
          addDays(
            cursor,
            -1
          );
      }

      let streak =
        0;

      while (
        activeDays.has(
          dateKey(
            cursor
          )
        )
      ) {
        streak +=
          1;

        cursor =
          addDays(
            cursor,
            -1
          );
      }

      return streak;
    }, [
      validSessions,
    ]);

  // =======================================================
  // 30 DAY CONSISTENCY
  // =======================================================

  const consistencyDays =
    useMemo(() => {
      return Array.from(
        {
          length:
            30,
        },
        (
          _,
          index
        ) => {
          const date =
            addDays(
              thirtyDayStart,
              index
            );

          const key =
            dateKey(
              date
            );

          const focusSeconds =
            focusByDay.get(
              key
            ) ||
            0;

          const taskCount =
            tasksByDay.get(
              key
            ) ||
            0;

          const minutes =
            focusSeconds /
            60;

          let level =
            0;

          if (
            focusSeconds >
              0 ||
            taskCount >
              0
          ) {
            level =
              1;
          }

          if (
            minutes >=
            30
          ) {
            level =
              2;
          }

          if (
            minutes >=
            60
          ) {
            level =
              3;
          }

          if (
            minutes >=
            dailyGoalMinutes
          ) {
            level =
              4;
          }

          return {
            key,
            date,
            focusSeconds,
            taskCount,
            level,
          };
        }
      );
    }, [
      focusByDay,
      tasksByDay,
      dailyGoalMinutes,
    ]);

  const active30Days =
    consistencyDays.filter(
      (
        day
      ) =>
        day.focusSeconds >
          0 ||
        day.taskCount >
          0
    ).length;

  const goalDays =
    consistencyDays.filter(
      (
        day
      ) =>
        day.focusSeconds /
          60 >=
        dailyGoalMinutes
    ).length;

  // =======================================================
  // SESSION INSIGHTS
  // =======================================================

  const longestSession =
    useMemo(() => {
      return validSessions.reduce(
        (
          longest,
          session
        ) =>
          Math.max(
            longest,
            session._duration
          ),
        0
      );
    }, [
      validSessions,
    ]);

  const averageSession =
    validSessions.length >
    0
      ? Math.round(
          totalStudySeconds /
            validSessions.length
        )
      : 0;

  // =======================================================
  // BEST DAY
  // =======================================================

  const bestDay =
    useMemo(() => {
      let best = {
        seconds:
          0,

        date:
          null,
      };

      focusByDay.forEach(
        (
          seconds,
          key
        ) => {
          if (
            seconds >
            best.seconds
          ) {
            best = {
              seconds,

              date:
                safeDate(
                  `${key}T12:00:00`
                ),
            };
          }
        }
      );

      return best;
    }, [
      focusByDay,
    ]);

  // =======================================================
  // COMPLETED TODAY
  // =======================================================

  const completedToday =
    completedTimestamped.filter(
      (
        task
      ) =>
        dateKey(
          task._date
        ) ===
        dateKey(
          today
        )
    ).length;

  // =======================================================
  // SUBJECT LOOKUP
  // =======================================================

  const subjectById =
    useMemo(() => {
      const map =
        new Map();

      subjects.forEach(
        (
          subject
        ) => {
          map.set(
            String(
              subject._id
            ),
            subject
          );
        }
      );

      return map;
    }, [
      subjects,
    ]);

  // =======================================================
  // SUBJECT ANALYTICS
  // =======================================================

  const subjectBreakdown =
    useMemo(() => {
      const map =
        new Map();

      subjects.forEach(
        (
          subject
        ) => {
          map.set(
            String(
              subject._id
            ),
            {
              id:
                String(
                  subject._id
                ),

              name:
                subject.name,

              color:
                subject.color ||
                "#6366f1",

              focusSeconds:
                0,

              sessions:
                0,

              tasks:
                0,

              completedTasks:
                0,

              notes:
                0,
            }
          );
        }
      );

      const general = {
        id:
          "general",

        name:
          "General Study",

        color:
          "#64748b",

        focusSeconds:
          0,

        sessions:
          0,

        tasks:
          0,

        completedTasks:
          0,

        notes:
          0,
      };

      validSessions.forEach(
        (
          session
        ) => {
          const id =
            getSubjectId(
              session.subjectId
            );

          let entry =
            id
              ? map.get(
                  id
                )
              : null;

          if (
            !entry &&
            session.subjectName
          ) {
            const matchingSubject =
              subjects.find(
                (
                  subject
                ) =>
                  subject.name
                    ?.trim()
                    .toLowerCase() ===
                  session.subjectName
                    ?.trim()
                    .toLowerCase()
              );

            if (
              matchingSubject
            ) {
              entry =
                map.get(
                  String(
                    matchingSubject._id
                  )
                );
            }
          }

          if (!entry) {
            general.focusSeconds +=
              session._duration;

            general.sessions +=
              1;

            return;
          }

          entry.focusSeconds +=
            session._duration;

          entry.sessions +=
            1;
        }
      );

      tasks.forEach(
        (
          task
        ) => {
          const id =
            getSubjectId(
              task.subjectId
            );

          const entry =
            id
              ? map.get(
                  id
                )
              : null;

          if (!entry) {
            return;
          }

          entry.tasks +=
            1;

          if (
            task.completed
          ) {
            entry.completedTasks +=
              1;
          }
        }
      );

      notes.forEach(
        (
          note
        ) => {
          const id =
            getSubjectId(
              note.subjectId
            );

          let entry =
            id
              ? map.get(
                  id
                )
              : null;

          if (
            !entry &&
            note.subjectName
          ) {
            const matchingSubject =
              subjects.find(
                (
                  subject
                ) =>
                  subject.name
                    ?.trim()
                    .toLowerCase() ===
                  note.subjectName
                    ?.trim()
                    .toLowerCase()
              );

            if (
              matchingSubject
            ) {
              entry =
                map.get(
                  String(
                    matchingSubject._id
                  )
                );
            }
          }

          if (
            entry
          ) {
            entry.notes +=
              1;
          }
        }
      );

      const result =
        Array.from(
          map.values()
        );

      if (
        general.focusSeconds >
          0
      ) {
        result.push(
          general
        );
      }

      return result.sort(
        (
          first,
          second
        ) =>
          second.focusSeconds -
          first.focusSeconds
      );
    }, [
      subjects,
      subjectById,
      validSessions,
      tasks,
      notes,
    ]);

  const totalSubjectFocus =
    subjectBreakdown.reduce(
      (
        total,
        subject
      ) =>
        total +
        subject.focusSeconds,
      0
    );

  const topSubject =
    subjectBreakdown.find(
      (
        subject
      ) =>
        subject.focusSeconds >
        0
    ) ||
    null;

  // =======================================================
  // NOTE STATS
  // =======================================================

  const linkedNotes =
    notes.filter(
      (
        note
      ) =>
        Boolean(
          getSubjectId(
            note.subjectId
          )
        )
    ).length;

  const pinnedNotes =
    notes.filter(
      (
        note
      ) =>
        Boolean(
          note.pinned
        )
    ).length;

  const notesUpdatedThisWeek =
    notes.filter(
      (
        note
      ) => {
        const date =
          safeDate(
            note.updatedAt ||
              note.createdAt
          );

        if (!date) {
          return false;
        }

        return (
          startOfDay(
            date
          ) >=
          currentWeekStart
        );
      }
    ).length;

  // =======================================================
  // RECENT ACTIVITY
  // =======================================================

  const recentActivity =
    useMemo(() => {
      const sessionItems =
        validSessions.map(
          (
            session
          ) => ({
            id:
              `session-${session._id || session.id || session._date.getTime()}`,

            type:
              "session",

            date:
              session._date,

            title:
              session.subjectName ||
              "Focus session",

            meta:
              formatStudyTime(
                session._duration
              ),
          })
        );

      const taskItems =
        completedTimestamped.map(
          (
            task
          ) => ({
            id:
              `task-${task._id || task.id}`,

            type:
              "task",

            date:
              task._date,

            title:
              task.title ||
              "Completed task",

            meta:
              "Completed",
          })
        );

      return [
        ...sessionItems,
        ...taskItems,
      ]
        .sort(
          (
            first,
            second
          ) =>
            second.date -
            first.date
        )
        .slice(
          0,
          8
        );
    }, [
      validSessions,
      completedTimestamped,
    ]);

  // =======================================================
  // CHART MAX
  // =======================================================

  const chartMax =
    Math.max(
      ...weekActivity.map(
        (
          day
        ) =>
          day.focusSeconds
      ),
      1
    );

  // =======================================================
  // INSIGHT
  // =======================================================

  const insight =
    useMemo(() => {
      if (
        totalStudySeconds ===
        0
      ) {
        return {
          icon:
            Target,

          title:
            "Start building your baseline",

          text:
            "Complete a Focus session and StudyOS will begin turning your activity into useful trends.",
        };
      }

      if (
        goalPercent >=
        100
      ) {
        return {
          icon:
            Award,

          title:
            "Daily goal complete",

          text:
            `You've reached ${goalPercent}% of today's Focus goal. Anything more today is extra momentum.`,
        };
      }

      if (
        currentStreak >=
        7
      ) {
        return {
          icon:
            Flame,

          title:
            "Strong consistency",

          text:
            `Your current Focus streak is ${currentStreak} days. Protect the habit before chasing bigger sessions.`,
        };
      }

      if (
        weekTrend.direction ===
        "up"
      ) {
        return {
          icon:
            TrendingUp,

          title:
            "Your week is moving up",

          text:
            weekTrend.value ===
            null
              ? "This week has study activity where the previous week had none."
              : `Your Focus time is ${weekTrend.value}% higher than the previous seven days.`,
        };
      }

      if (
        topSubject
      ) {
        return {
          icon:
            BookOpen,

          title:
            `${topSubject.name} leads your Focus time`,

          text:
            `You've logged ${formatStudyTime(
              topSubject.focusSeconds
            )} in this subject. Check the subject distribution below for balance.`,
        };
      }

      return {
        icon:
          Activity,

        title:
          "Keep the data honest",

        text:
          "Progress becomes more useful as Focus sessions and completed tasks accumulate naturally.",
      };
    }, [
      totalStudySeconds,
      goalPercent,
      currentStreak,
      weekTrend,
      topSubject,
    ]);

  const InsightIcon =
    insight.icon;

  // =======================================================
  // TREND ICON
  // =======================================================

  const TrendIcon =
    weekTrend.direction ===
    "up"
      ? ArrowUpRight
      : weekTrend.direction ===
          "down"
        ? ArrowDownRight
        : Minus;

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="dashboard progress-v4-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="dashboard-header progress-v4-header">

        <div>

          <span className="progress-v4-page-eyebrow">
            STUDY ANALYTICS
          </span>

          <h1>
            Progress
          </h1>

          <p>
            A real view of your Focus,
            task completion, consistency,
            subjects and study habits.
          </p>

        </div>

        <button
          type="button"
          className="progress-v4-refresh"
          onClick={() =>
            loadProgress(
              true
            )
          }
          disabled={
            refreshing
          }
        >

          <RefreshCw
            size={15}
            className={
              refreshing
                ? "progress-v4-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </header>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="progress-v4-error">

          <div>
            <strong>
              Progress could not load
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              loadProgress(
                true
              )
            }
          >
            Retry
          </button>

        </div>
      )}

      {/* ===================================================
          LOADING
      =================================================== */}

      {loading ? (

        <div className="dashboard-card progress-v4-loading">

          <RefreshCw
            size={22}
            className="progress-v4-spin"
          />

          <strong>
            Calculating your progress
          </strong>

          <span>
            Reading Focus, tasks,
            subjects and notes.
          </span>

        </div>

      ) : (

        <>
          {/* ===============================================
              HERO STATS
          =============================================== */}

          <section className="progress-v4-hero-stats">

            <ProgressStat
              icon={
                <Timer
                  size={19}
                />
              }
              label="Today"
              value={
                formatStudyTime(
                  todayFocusSeconds
                )
              }
              description={`${goalPercent}% of daily goal`}
            />

            <ProgressStat
              icon={
                <BarChart3
                  size={19}
                />
              }
              label="Last 7 days"
              value={
                formatStudyTime(
                  weekStudySeconds
                )
              }
              description={
                weekTrend.value ===
                null
                  ? weekTrend.label
                  : `${weekTrend.value}% ${weekTrend.label}`
              }
              trend={
                weekTrend.direction
              }
            />

            <ProgressStat
              icon={
                <Flame
                  size={19}
                />
              }
              label="Focus streak"
              value={`${currentStreak} ${
                currentStreak ===
                1
                  ? "day"
                  : "days"
              }`}
              description="Consecutive active days"
            />

            <ProgressStat
              icon={
                <CheckCircle2
                  size={19}
                />
              }
              label="Task completion"
              value={`${completionRate}%`}
              description={`${completedCount} of ${totalTasks} completed`}
            />

          </section>

          {/* ===============================================
              DAILY GOAL
          =============================================== */}

          <section className="dashboard-card progress-v4-goal-card">

            <div className="progress-v4-goal-top">

              <div>

                <span className="progress-v4-eyebrow">
                  TODAY'S TARGET
                </span>

                <h2>
                  Daily Focus goal
                </h2>

                <p>
                  {formatStudyTime(
                    todayFocusSeconds
                  )}
                  {" completed · "}

                  {remainingGoalMinutes >
                  0
                    ? `${formatStudyTime(
                        remainingGoalMinutes *
                          60
                      )} remaining`
                    : "Goal reached"}
                </p>

              </div>

              <div className="progress-v4-goal-percent">

                <Target
                  size={16}
                />

                <strong>
                  {goalPercent}%
                </strong>

              </div>

            </div>

            <div className="progress-v4-goal-track">

              <div
                style={{
                  width:
                    `${goalBarPercent}%`,
                }}
              />

            </div>

            <div className="progress-v4-goal-footer">

              <span>
                0m
              </span>

              <strong>
                Goal{" "}
                {formatStudyTime(
                  dailyGoalMinutes *
                    60
                )}
              </strong>

            </div>

          </section>

          {/* ===============================================
              MAIN GRID
          =============================================== */}

          <section className="progress-v4-main-grid">

            {/* =============================================
                WEEK CHART
            ============================================== */}

            <div className="dashboard-card progress-v4-panel">

              <div className="progress-v4-section-header">

                <div>

                  <span className="progress-v4-eyebrow">
                    FOCUS TREND
                  </span>

                  <h2>
                    Last 7 days
                  </h2>

                </div>

                <div
                  className={`progress-v4-trend trend-${weekTrend.direction}`}
                >

                  <TrendIcon
                    size={14}
                  />

                  <span>
                    {weekTrend.value ===
                    null
                      ? "New"
                      : `${weekTrend.value}%`}
                  </span>

                </div>

              </div>

              <div className="progress-v4-chart">

                {weekActivity.map(
                  (
                    day
                  ) => {
                    const percent =
                      day.focusSeconds >
                      0
                        ? Math.max(
                            5,
                            (
                              day.focusSeconds /
                              chartMax
                            ) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        className="progress-v4-chart-column"
                        key={
                          day.key
                        }
                      >

                        <span className="progress-v4-chart-value">
                          {day.focusSeconds >
                          0
                            ? formatChartValue(
                                day.focusSeconds
                              )
                            : ""}
                        </span>

                        <div className="progress-v4-chart-track">

                          <div
                            className={`progress-v4-chart-bar ${
                              day.isToday
                                ? "today"
                                : ""
                            }`}
                            style={{
                              height:
                                `${percent}%`,
                            }}
                          />

                        </div>

                        <strong
                          className={
                            day.isToday
                              ? "today"
                              : ""
                          }
                        >
                          {day.label}
                        </strong>

                        <small>
                          {day.shortDate}
                        </small>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

            {/* =============================================
                SESSION SUMMARY
            ============================================== */}

            <div className="dashboard-card progress-v4-panel">

              <div className="progress-v4-section-header">

                <div>

                  <span className="progress-v4-eyebrow">
                    FOCUS SESSIONS
                  </span>

                  <h2>
                    Study overview
                  </h2>

                </div>

                <Clock3
                  size={18}
                />

              </div>

              <div className="progress-v4-big-number">

                <strong>
                  {formatStudyTime(
                    totalStudySeconds
                  )}
                </strong>

                <span>
                  total Focus time
                </span>

              </div>

              <div className="progress-v4-overview-list">

                <div>
                  <span>
                    Sessions
                  </span>

                  <strong>
                    {validSessions.length}
                  </strong>
                </div>

                <div>
                  <span>
                    Average
                  </span>

                  <strong>
                    {formatStudyTime(
                      averageSession
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Longest
                  </span>

                  <strong>
                    {formatStudyTime(
                      longestSession
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Best day
                  </span>

                  <strong>
                    {bestDay.date
                      ? bestDay.date.toLocaleDateString(
                          "en-IN",
                          {
                            day:
                              "numeric",

                            month:
                              "short",
                          }
                        )
                      : "—"}
                  </strong>
                </div>

              </div>

            </div>

          </section>

          {/* ===============================================
              INSIGHTS
          =============================================== */}

          <section className="progress-v4-insights">

            <ProgressInsight
              icon={
                <CalendarCheck2
                  size={18}
                />
              }
              label="Active days"
              value={`${active30Days}/30`}
              description="Study activity in last 30 days"
            />

            <ProgressInsight
              icon={
                <Target
                  size={18}
                />
              }
              label="Goal days"
              value={
                goalDays
              }
              description="Days daily Focus goal was reached"
            />

            <ProgressInsight
              icon={
                <Award
                  size={18}
                />
              }
              label="Best Focus day"
              value={
                bestDay.seconds >
                0
                  ? formatStudyTime(
                      bestDay.seconds
                    )
                  : "—"
              }
              description={
                bestDay.date
                  ? bestDay.date.toLocaleDateString(
                      "en-IN",
                      {
                        day:
                          "numeric",

                        month:
                          "short",
                      }
                    )
                  : "No Focus data yet"
              }
            />

            <ProgressInsight
              icon={
                <TrendingUp
                  size={18}
                />
              }
              label="Weekly direction"
              value={
                weekTrend.direction ===
                "up"
                  ? "Improving"
                  : weekTrend.direction ===
                      "down"
                    ? "Lower"
                    : "Stable"
              }
              description={
                weekTrend.label
              }
            />

          </section>

          {/* ===============================================
              CONSISTENCY
          =============================================== */}

          <section className="dashboard-card progress-v4-panel progress-v4-consistency-card">

            <div className="progress-v4-section-header">

              <div>

                <span className="progress-v4-eyebrow">
                  CONSISTENCY
                </span>

                <h2>
                  Last 30 days
                </h2>

              </div>

              <span className="progress-v4-consistency-count">
                {active30Days}
                {" active days"}
              </span>

            </div>

            <div className="progress-v4-heatmap">

              {consistencyDays.map(
                (
                  day
                ) => (
                  <div
                    key={
                      day.key
                    }
                    className={`progress-v4-heatmap-day level-${day.level}`}
                    title={`${day.date.toLocaleDateString(
                      "en-IN",
                      {
                        day:
                          "numeric",

                        month:
                          "short",
                      }
                    )}: ${formatStudyTime(
                      day.focusSeconds
                    )}, ${day.taskCount} ${
                      day.taskCount ===
                      1
                        ? "task"
                        : "tasks"
                    }`}
                  >
                    <span>
                      {day.date.getDate()}
                    </span>
                  </div>
                )
              )}

            </div>

            <div className="progress-v4-heatmap-legend">

              <span>
                Less
              </span>

              <i className="level-0" />
              <i className="level-1" />
              <i className="level-2" />
              <i className="level-3" />
              <i className="level-4" />

              <span>
                Goal
              </span>

            </div>

          </section>

          {/* ===============================================
              SUBJECT + SIDE STACK
          =============================================== */}

          <section className="progress-v4-subject-grid">

            {/* =============================================
                SUBJECT PERFORMANCE
            ============================================== */}

            <div className="dashboard-card progress-v4-panel">

              <div className="progress-v4-section-header">

                <div>

                  <span className="progress-v4-eyebrow">
                    SUBJECTS
                  </span>

                  <h2>
                    Study distribution
                  </h2>

                </div>

                {topSubject && (
                  <span className="progress-v4-top-subject">

                    <BookOpen
                      size={13}
                    />

                    {topSubject.name}

                  </span>
                )}

              </div>

              {subjectBreakdown.length ===
              0 ? (

                <ProgressEmpty
                  icon={
                    <BookOpen
                      size={24}
                    />
                  }
                  title="No subject activity"
                  text="Link Focus sessions, tasks or notes to subjects to see their study profile here."
                />

              ) : (

                <div className="progress-v4-subject-list">

                  {subjectBreakdown.map(
                    (
                      subject
                    ) => {
                      const focusPercent =
                        totalSubjectFocus >
                        0
                          ? Math.round(
                              (
                                subject.focusSeconds /
                                totalSubjectFocus
                              ) *
                                100
                            )
                          : 0;

                      const taskPercent =
                        subject.tasks >
                        0
                          ? Math.round(
                              (
                                subject.completedTasks /
                                subject.tasks
                              ) *
                                100
                            )
                          : 0;

                      return (
                        <div
                          className="progress-v4-subject-row"
                          key={
                            subject.id
                          }
                          style={{
                            "--progress-subject-color":
                              subject.color,
                          }}
                        >

                          <div className="progress-v4-subject-top">

                            <div className="progress-v4-subject-name">

                              <span className="progress-v4-subject-dot" />

                              <div>
                                <strong>
                                  {subject.name}
                                </strong>

                                <span>
                                  {subject.sessions}
                                  {" "}
                                  {subject.sessions ===
                                  1
                                    ? "session"
                                    : "sessions"}

                                  {" · "}

                                  {subject.notes}
                                  {" "}
                                  {subject.notes ===
                                  1
                                    ? "note"
                                    : "notes"}
                                </span>
                              </div>

                            </div>

                            <div className="progress-v4-subject-focus">

                              <strong>
                                {formatStudyTime(
                                  subject.focusSeconds
                                )}
                              </strong>

                              <span>
                                {focusPercent}%
                              </span>

                            </div>

                          </div>

                          <div className="progress-v4-subject-track">

                            <div
                              style={{
                                width:
                                  `${focusPercent}%`,
                              }}
                            />

                          </div>

                          <div className="progress-v4-subject-meta">

                            <span>
                              <CheckCircle2
                                size={12}
                              />

                              {subject.completedTasks}
                              /
                              {subject.tasks}
                              {" tasks"}
                            </span>

                            <span>
                              {subject.tasks >
                              0
                                ? `${taskPercent}% completion`
                                : "No linked tasks"}
                            </span>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            {/* =============================================
                RIGHT STACK
            ============================================== */}

            <div className="progress-v4-side-stack">

              {/* TASKS */}

              <div className="dashboard-card progress-v4-panel progress-v4-task-card">

                <div className="progress-v4-section-header">

                  <div>

                    <span className="progress-v4-eyebrow">
                      TASKS
                    </span>

                    <h2>
                      Completion
                    </h2>

                  </div>

                  <span className="progress-v4-rate-badge">
                    {completionRate}%
                  </span>

                </div>

                <div className="progress-v4-task-track">

                  <div
                    style={{
                      width:
                        `${completionRate}%`,
                    }}
                  />

                </div>

                <div className="progress-v4-task-grid">

                  <div>
                    <span>
                      Total
                    </span>

                    <strong>
                      {totalTasks}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Completed
                    </span>

                    <strong>
                      {completedCount}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Pending
                    </span>

                    <strong>
                      {pendingCount}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Today
                    </span>

                    <strong>
                      {completedToday}
                    </strong>
                  </div>

                </div>

              </div>

              {/* NOTES */}

              <div className="dashboard-card progress-v4-panel progress-v4-notes-card">

                <div className="progress-v4-section-header">

                  <div>

                    <span className="progress-v4-eyebrow">
                      NOTES
                    </span>

                    <h2>
                      Knowledge base
                    </h2>

                  </div>

                  <FileText
                    size={18}
                  />

                </div>

                <div className="progress-v4-note-grid">

                  <div>

                    <FileText
                      size={15}
                    />

                    <span>
                      Total
                    </span>

                    <strong>
                      {notes.length}
                    </strong>

                  </div>

                  <div>

                    <Link2
                      size={15}
                    />

                    <span>
                      Linked
                    </span>

                    <strong>
                      {linkedNotes}
                    </strong>

                  </div>

                  <div>

                    <Pin
                      size={15}
                    />

                    <span>
                      Pinned
                    </span>

                    <strong>
                      {pinnedNotes}
                    </strong>

                  </div>

                  <div>

                    <TrendingUp
                      size={15}
                    />

                    <span>
                      Updated 7d
                    </span>

                    <strong>
                      {notesUpdatedThisWeek}
                    </strong>

                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* ===============================================
              RECENT + INSIGHT
          =============================================== */}

          <section className="progress-v4-activity-insight-grid">

            {/* RECENT */}

            <div className="dashboard-card progress-v4-panel">

              <div className="progress-v4-section-header">

                <div>

                  <span className="progress-v4-eyebrow">
                    RECENT
                  </span>

                  <h2>
                    Study activity
                  </h2>

                </div>

                <Activity
                  size={18}
                />

              </div>

              {recentActivity.length ===
              0 ? (

                <ProgressEmpty
                  icon={
                    <Activity
                      size={24}
                    />
                  }
                  title="No activity yet"
                  text="Focus sessions and completed tasks will appear here."
                />

              ) : (

                <div className="progress-v4-recent-list">

                  {recentActivity.map(
                    (
                      item
                    ) => {
                      const ItemIcon =
                        item.type ===
                        "session"
                          ? Timer
                          : CheckCircle2;

                      return (
                        <div
                          className="progress-v4-recent-item"
                          key={
                            item.id
                          }
                        >

                          <span
                            className={`progress-v4-recent-icon ${item.type}`}
                          >

                            <ItemIcon
                              size={15}
                            />

                          </span>

                          <div className="progress-v4-recent-copy">

                            <strong>
                              {item.title}
                            </strong>

                            <span>
                              {formatRelativeActivity(
                                item.date
                              )}
                            </span>

                          </div>

                          <strong className="progress-v4-recent-meta">
                            {item.meta}
                          </strong>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            {/* INSIGHT */}

            <div className="progress-v4-insight-card">

              <span className="progress-v4-insight-icon">

                <InsightIcon
                  size={22}
                />

              </span>

              <div className="progress-v4-insight-copy">

                <span className="progress-v4-eyebrow">
                  STUDYOS INSIGHT
                </span>

                <h2>
                  {insight.title}
                </h2>

                <p>
                  {insight.text}
                </p>

              </div>

              <div className="progress-v4-insight-footer">

                <span>

                  <BarChart3
                    size={13}
                  />

                  Total Focus

                  <strong>
                    {formatStudyTime(
                      totalStudySeconds
                    )}
                  </strong>

                </span>

                <span>

                  <CheckCircle2
                    size={13}
                  />

                  Completed

                  <strong>
                    {completedCount}
                  </strong>

                </span>

              </div>

            </div>

          </section>

        </>
      )}

    </div>
  );
}

// =========================================================
// HERO STAT
// =========================================================

function ProgressStat({
  icon,
  label,
  value,
  description,
  trend,
}) {
  return (
    <div className="progress-v4-stat">

      <span className="progress-v4-stat-icon">
        {icon}
      </span>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small
          className={
            trend
              ? `trend-${trend}`
              : ""
          }
        >
          {description}
        </small>

      </div>

    </div>
  );
}

// =========================================================
// SMALL INSIGHT
// =========================================================

function ProgressInsight({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="progress-v4-insight">

      <span className="progress-v4-insight-small-icon">
        {icon}
      </span>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>

      </div>

    </div>
  );
}

// =========================================================
// EMPTY
// =========================================================

function ProgressEmpty({
  icon,
  title,
  text,
}) {
  return (
    <div className="progress-v4-empty">

      {icon}

      <strong>
        {title}
      </strong>

      <p>
        {text}
      </p>

    </div>
  );
}

export default Progress;