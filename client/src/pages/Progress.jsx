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

import "../styles/progress-v2.css";


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
    startOfDay(value);

  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
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

  return String(value);
};


const formatStudyTime = (
  seconds
) => {
  const safe =
    Math.max(
      0,
      Number(seconds) || 0
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

  if (
    hours > 0
  ) {
    return `${hours}h ${remaining}m`;
  }

  if (
    minutes > 0
  ) {
    return `${minutes}m`;
  }

  if (
    safe > 0
  ) {
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
        Number(seconds) || 0
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
    safeDate(value);

  if (!date) {
    return "";
  }

  const now =
    new Date();

  const today =
    startOfDay(now);

  const target =
    startOfDay(date);

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
        hour: "2-digit",
        minute: "2-digit",
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
      day: "numeric",
      month: "short",
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
        if (
          manual
        ) {
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


  useEffect(() => {
    loadProgress();
  }, [
    isGuest,
  ]);


  useEffect(() => {
    const refresh =
      () => {
        loadProgress();
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
              ) || 0;

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
  // PERIODS
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
  // DAILY ACTIVITY
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
              ) || 0
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
              ) || 0
            ) + 1
          );
        }
      );

      return map;
    }, [
      completedTimestamped,
    ]);


  // =======================================================
  // WEEK ACTIVITY
  // =======================================================

  const weekActivity =
    useMemo(() => {
      return Array.from(
        {
          length: 7,
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
              ) || 0,

            tasks:
              tasksByDay.get(
                key
              ) || 0,

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
      currentWeekStart,
      today,
    ]);


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
      previousWeekStart,
      previousWeekEnd,
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
  // TODAY GOAL
  // =======================================================

  const todayFocusSeconds =
    focusByDay.get(
      dateKey(
        today
      )
    ) || 0;


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
  // STREAK
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
        streak += 1;

        cursor =
          addDays(
            cursor,
            -1
          );
      }

      return streak;
    }, [
      validSessions,
      today,
    ]);


  // =======================================================
  // 30 DAY CONSISTENCY
  // =======================================================

  const consistencyDays =
    useMemo(() => {
      return Array.from(
        {
          length: 30,
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
            ) || 0;

          const taskCount =
            tasksByDay.get(
              key
            ) || 0;

          const minutes =
            focusSeconds /
            60;

          let level =
            0;

          if (
            focusSeconds > 0 ||
            taskCount > 0
          ) {
            level = 1;
          }

          if (
            minutes >= 30
          ) {
            level = 2;
          }

          if (
            minutes >= 60
          ) {
            level = 3;
          }

          if (
            minutes >=
            dailyGoalMinutes
          ) {
            level = 4;
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
      thirtyDayStart,
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

          if (
            !entry
          ) {
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

          if (
            !entry
          ) {
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
    ) || null;


  // =======================================================
  // NOTES
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

        if (
          !date
        ) {
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
  // RECENT
  // =======================================================

  const recentActivity =
    useMemo(() => {
      const sessionItems =
        validSessions.map(
          (
            session
          ) => ({
            id:
              `session-${
                session._id ||
                session.id ||
                session._date.getTime()
              }`,

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
              `task-${
                task._id ||
                task.id
              }`,

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
  // CHART
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
    <div className="v2p-page">

      <header className="v2p-header">

        <div>

          <span className="v2p-eyebrow">
            Study analytics
          </span>

          <h1>
            Progress
          </h1>

          <p>
            Understand your focus time,
            consistency, task completion and
            overall study patterns.
          </p>

        </div>


        <button
          type="button"
          className="v2p-refresh"
          disabled={
            refreshing
          }
          onClick={() =>
            loadProgress(
              true
            )
          }
        >

          <RefreshCw
            size={16}
            className={
              refreshing
                ? "v2p-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}

        </button>

      </header>


      {error && (
        <div className="v2p-error">

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


      {loading ? (

        <section className="v2p-loading">

          <RefreshCw
            size={23}
            className="v2p-spin"
          />

          <strong>
            Calculating your progress
          </strong>

          <span>
            Reading Focus, tasks,
            subjects and notes.
          </span>

        </section>

      ) : (
        <>

          {/* =================================================
              TOP STATS
              ================================================= */}

          <section className="v2p-stats">

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


          {/* =================================================
              DAILY GOAL
              ================================================= */}

          <section className="v2p-goal">

            <div className="v2p-goal-top">

              <div>

                <span className="v2p-eyebrow">
                  Today's target
                </span>

                <h2>
                  Daily focus goal
                </h2>

                <p>
                  {formatStudyTime(
                    todayFocusSeconds
                  )} completed
                  {" · "}

                  {remainingGoalMinutes >
                  0
                    ? `${formatStudyTime(
                        remainingGoalMinutes *
                          60
                      )} remaining`
                    : "Goal reached"}
                </p>

              </div>


              <div className="v2p-goal-value">

                <Target
                  size={18}
                />

                <strong>
                  {goalPercent}%
                </strong>

              </div>

            </div>


            <div className="v2p-goal-track">

              <div
                style={{
                  width:
                    `${goalBarPercent}%`,
                }}
              />

            </div>


            <div className="v2p-goal-footer">

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


          {/* =================================================
              WEEK
              ================================================= */}

          <section className="v2p-main-grid">

            <article className="v2p-panel">

              <div className="v2p-panel-header">

                <div>

                  <span className="v2p-eyebrow">
                    Focus trend
                  </span>

                  <h2>
                    Last 7 days
                  </h2>

                  <p>
                    Daily focused study time.
                  </p>

                </div>


                <div
                  className={`v2p-trend is-${weekTrend.direction}`}
                >

                  <TrendIcon
                    size={16}
                  />

                  <span>
                    {weekTrend.value ===
                    null
                      ? "New"
                      : `${weekTrend.value}%`}
                  </span>

                </div>

              </div>


              <div className="v2p-chart">

                {weekActivity.map(
                  (
                    day
                  ) => {
                    const percent =
                      day.focusSeconds >
                      0
                        ? Math.max(
                            6,
                            (
                              day.focusSeconds /
                              chartMax
                            ) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        className="v2p-chart-column"
                        key={
                          day.key
                        }
                      >

                        <span className="v2p-chart-value">
                          {day.focusSeconds >
                          0
                            ? formatChartValue(
                                day.focusSeconds
                              )
                            : "0"}
                        </span>


                        <div className="v2p-chart-track">

                          <div
                            className={`v2p-chart-bar ${
                              day.isToday
                                ? "is-today"
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
                              ? "is-today"
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

            </article>


            <article className="v2p-panel v2p-overview">

              <div className="v2p-panel-header">

                <div>

                  <span className="v2p-eyebrow">
                    Focus sessions
                  </span>

                  <h2>
                    Study overview
                  </h2>

                </div>

                <Clock3
                  size={20}
                />

              </div>


              <div className="v2p-total-focus">

                <strong>
                  {formatStudyTime(
                    totalStudySeconds
                  )}
                </strong>

                <span>
                  total focus time
                </span>

              </div>


              <div className="v2p-overview-list">

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

            </article>

          </section>


          {/* =================================================
              INSIGHTS
              ================================================= */}

          <section className="v2p-insights">

            <ProgressInsight
              icon={
                <CalendarCheck2
                  size={19}
                />
              }
              label="Active days"
              value={`${active30Days}/30`}
              description="Study activity in last 30 days"
            />


            <ProgressInsight
              icon={
                <Target
                  size={19}
                />
              }
              label="Goal days"
              value={
                goalDays
              }
              description="Days your daily focus goal was reached"
            />


            <ProgressInsight
              icon={
                <Award
                  size={19}
                />
              }
              label="Best focus day"
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
                  : "No focus data yet"
              }
            />


            <ProgressInsight
              icon={
                <TrendingUp
                  size={19}
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


          {/* =================================================
              CONSISTENCY
              ================================================= */}

          <section className="v2p-panel v2p-consistency">

            <div className="v2p-panel-header">

              <div>

                <span className="v2p-eyebrow">
                  Consistency
                </span>

                <h2>
                  Last 30 days
                </h2>

                <p>
                  Focus and completed-task activity.
                </p>

              </div>


              <span className="v2p-count-badge">
                {active30Days} active days
              </span>

            </div>


            <div className="v2p-heatmap">

              {consistencyDays.map(
                (
                  day
                ) => (
                  <div
                    key={
                      day.key
                    }
                    className={`v2p-heatmap-day level-${day.level}`}
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


            <div className="v2p-heatmap-legend">

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


          {/* =================================================
              LOWER FLOW
              ================================================= */}

          <section className="v2p-lower-grid">

            {/* LEFT COLUMN */}

            <div className="v2p-lower-column">

              {/* SUBJECT DISTRIBUTION */}

              <article className="v2p-panel">

                <div className="v2p-panel-header">

                  <div>

                    <span className="v2p-eyebrow">
                      Subjects
                    </span>

                    <h2>
                      Study distribution
                    </h2>

                    <p>
                      Where your focused time is going.
                    </p>

                  </div>


                  {topSubject && (
                    <span className="v2p-top-subject">

                      <BookOpen
                        size={14}
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
                        size={26}
                      />
                    }
                    title="No subject activity"
                    text="Link focus sessions, tasks or notes to subjects to build this view."
                  />

                ) : (

                  <div className="v2p-subject-list">

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
                            className="v2p-subject"
                            key={
                              subject.id
                            }
                            style={{
                              "--subject-progress-color":
                                subject.color,
                            }}
                          >

                            <div className="v2p-subject-top">

                              <div className="v2p-subject-name">

                                <span className="v2p-subject-dot" />


                                <div>

                                  <strong>
                                    {subject.name}
                                  </strong>

                                  <span>
                                    {subject.sessions}{" "}
                                    {subject.sessions ===
                                    1
                                      ? "session"
                                      : "sessions"}
                                    {" · "}
                                    {subject.notes}{" "}
                                    {subject.notes ===
                                    1
                                      ? "note"
                                      : "notes"}
                                  </span>

                                </div>

                              </div>


                              <div className="v2p-subject-focus">

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


                            <div className="v2p-subject-track">

                              <div
                                style={{
                                  width:
                                    `${focusPercent}%`,
                                }}
                              />

                            </div>


                            <div className="v2p-subject-meta">

                              <span>

                                <CheckCircle2
                                  size={14}
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

              </article>


              {/* RECENT ACTIVITY */}

              <article className="v2p-panel">

                <div className="v2p-panel-header">

                  <div>

                    <span className="v2p-eyebrow">
                      Recent
                    </span>

                    <h2>
                      Study activity
                    </h2>

                    <p>
                      Your latest focus sessions and completed tasks.
                    </p>

                  </div>


                  <Activity
                    size={20}
                  />

                </div>


                {recentActivity.length ===
                0 ? (

                  <ProgressEmpty
                    icon={
                      <Activity
                        size={26}
                      />
                    }
                    title="No activity yet"
                    text="Focus sessions and completed tasks will appear here."
                  />

                ) : (

                  <div className="v2p-recent-list">

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
                            className="v2p-recent-item"
                            key={
                              item.id
                            }
                          >

                            <span
                              className={`v2p-recent-icon is-${item.type}`}
                            >

                              <ItemIcon
                                size={16}
                              />

                            </span>


                            <div className="v2p-recent-copy">

                              <strong>
                                {item.title}
                              </strong>

                              <span>
                                {formatRelativeActivity(
                                  item.date
                                )}
                              </span>

                            </div>


                            <strong className="v2p-recent-meta">
                              {item.meta}
                            </strong>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </article>

            </div>


            {/* RIGHT COLUMN */}

            <div className="v2p-lower-column">

              {/* TASKS */}

              <article className="v2p-panel">

                <div className="v2p-panel-header">

                  <div>

                    <span className="v2p-eyebrow">
                      Tasks
                    </span>

                    <h2>
                      Completion
                    </h2>

                  </div>


                  <span className="v2p-rate">
                    {completionRate}%
                  </span>

                </div>


                <div className="v2p-task-track">

                  <div
                    style={{
                      width:
                        `${completionRate}%`,
                    }}
                  />

                </div>


                <div className="v2p-small-grid">

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

              </article>


              {/* NOTES */}

              <article className="v2p-panel">

                <div className="v2p-panel-header">

                  <div>

                    <span className="v2p-eyebrow">
                      Notes
                    </span>

                    <h2>
                      Knowledge base
                    </h2>

                  </div>


                  <FileText
                    size={20}
                  />

                </div>


                <div className="v2p-note-grid">

                  <div>

                    <FileText
                      size={17}
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
                      size={17}
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
                      size={17}
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
                      size={17}
                    />

                    <span>
                      Updated 7d
                    </span>

                    <strong>
                      {notesUpdatedThisWeek}
                    </strong>

                  </div>

                </div>

              </article>


              {/* STUDYOS INSIGHT */}

              <article className="v2p-study-insight">

                <span className="v2p-study-insight-icon">

                  <InsightIcon
                    size={24}
                  />

                </span>


                <div className="v2p-study-insight-copy">

                  <span className="v2p-eyebrow">
                    StudyOS insight
                  </span>

                  <h2>
                    {insight.title}
                  </h2>

                  <p>
                    {insight.text}
                  </p>

                </div>


                <div className="v2p-study-insight-footer">

                  <span>

                    <BarChart3
                      size={15}
                    />

                    Total focus

                    <strong>
                      {formatStudyTime(
                        totalStudySeconds
                      )}
                    </strong>

                  </span>


                  <span>

                    <CheckCircle2
                      size={15}
                    />

                    Completed

                    <strong>
                      {completedCount}
                    </strong>

                  </span>

                </div>

              </article>

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
    <article className="v2p-stat">

      <span className="v2p-stat-icon">
        {icon}
      </span>


      <div>

        <span className="v2p-stat-label">
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small
          className={
            trend
              ? `is-${trend}`
              : ""
          }
        >
          {description}
        </small>

      </div>

    </article>
  );
}


// =========================================================
// INSIGHT
// =========================================================

function ProgressInsight({
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="v2p-insight">

      <span className="v2p-insight-icon">
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

    </article>
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
    <div className="v2p-empty">

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
