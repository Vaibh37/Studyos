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

  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  const axisStep = Math.max(
    900,
    Math.ceil(chartMax / 4 / 900) * 900
  );

  const axisMax = axisStep * 4;

  const axisTicks = Array.from(
    { length: 5 },
    (_, index) => axisMax - index * axisStep
  );

  const visibleActivity = showAllActivity
    ? recentActivity
    : recentActivity.slice(0, 3);

  const visibleSubjects = showAllSubjects
    ? subjectBreakdown
    : subjectBreakdown.slice(0, 4);

  const trendText =
    weekTrend.value === null
      ? weekTrend.label
      : `${weekTrend.direction === "up" ? "+" : weekTrend.direction === "down" ? "-" : ""}${weekTrend.value}% ${weekTrend.label}`;

  const bestDate = bestDay.date
    ? bestDay.date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "—";

  return (
    <div className="sp-page">

      {/* HEADER */}

      <header className="sp-header">
        <div>
          <h1>Progress</h1>
          <p>Your study activity at a glance.</p>
        </div>

        <button
          type="button"
          className="sp-icon-button"
          disabled={refreshing}
          onClick={() => loadProgress(true)}
          aria-label="Refresh progress"
          title="Refresh progress"
        >
          <RefreshCw
            size={17}
            className={refreshing ? "sp-spin" : ""}
          />
        </button>
      </header>

      {error && (
        <div className="sp-error" role="alert">
          <div>
            <strong>Progress could not load</strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadProgress(true)}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="sp-loading">
          <RefreshCw size={22} className="sp-spin" />
          <strong>Loading progress</strong>
          <span>Reading your study activity.</span>
        </div>
      ) : (
        <>

          {/* PRIMARY METRICS */}

          <section className="sp-stats" aria-label="Key metrics">

            <StudyMetric
              label="Today"
              value={formatStudyTime(todayFocusSeconds)}
              detail={`${goalPercent}% of daily goal`}
            />

            <StudyMetric
              label="Last 7 days"
              value={formatStudyTime(weekStudySeconds)}
              detail={trendText}
              trend={weekTrend.direction}
            />

            <StudyMetric
              label="Focus streak"
              value={`${currentStreak} ${currentStreak === 1 ? "day" : "days"}`}
              detail="Consecutive active days"
            />

            <StudyMetric
              label="Task completion"
              value={`${completionRate}%`}
              detail={`${completedCount} of ${totalTasks} completed`}
            />

          </section>

          {/* DAILY GOAL */}

          <section className="sp-daily-goal">

            <div className="sp-section-heading">
              <div>
                <h2>Daily focus goal</h2>
                <p>
                  {formatStudyTime(todayFocusSeconds)}
                  {" / "}
                  {formatStudyTime(dailyGoalMinutes * 60)}
                </p>
              </div>

              <strong className="sp-goal-percent">
                {goalPercent}%
              </strong>
            </div>

            <div
              className="sp-track"
              role="progressbar"
              aria-label="Daily focus goal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={goalBarPercent}
              aria-valuetext={`${goalPercent}%`}
            >
              <div style={{ width: `${goalBarPercent}%` }} />
            </div>

            <div className="sp-goal-caption">
              {remainingGoalMinutes > 0
                ? `${formatStudyTime(remainingGoalMinutes * 60)} remaining`
                : "Daily goal reached"}
            </div>

          </section>

          {/* WEEKLY CHART AND OVERVIEW */}

          <section className="sp-main-grid">

            <article className="sp-chart-panel">

              <div className="sp-section-heading">

                <div>
                  <h2>Focus activity</h2>
                  <p>Last 7 days</p>
                </div>

                <span className={`sp-trend is-${weekTrend.direction}`}>
                  <TrendIcon size={15} />
                  {weekTrend.value === null
                    ? "New activity"
                    : `${weekTrend.value}%`}
                </span>

              </div>

              <div className="sp-chart">

                <div className="sp-axis" aria-hidden="true">
                  {axisTicks.map((tick) => (
                    <span key={tick}>
                      {tick === 0 ? "0" : formatChartValue(tick)}
                    </span>
                  ))}
                </div>

                <div className="sp-chart-content">

                  <div className="sp-chart-gridlines" aria-hidden="true">
                    {axisTicks.map((tick) => (
                      <div key={tick} />
                    ))}
                  </div>

                  <div className="sp-chart-columns">

                    {weekActivity.map((day) => (
                      <div
                        key={day.key}
                        className={`sp-chart-column ${day.isToday ? "is-today" : ""}`}
                        title={`${day.label}: ${formatStudyTime(day.focusSeconds)}`}
                      >

                        <span className="sp-chart-value">
                          {formatStudyTime(day.focusSeconds)}
                        </span>

                        <div className="sp-chart-slot">
                          <div
                            className="sp-chart-bar"
                            style={{
                              height: `${Math.min(100, (day.focusSeconds / axisMax) * 100)}%`,
                            }}
                          />
                        </div>

                        <strong>{day.label}</strong>
                        <small>{day.shortDate}</small>

                      </div>
                    ))}

                  </div>
                </div>
              </div>

            </article>

            <article className="sp-overview">

              <div className="sp-section-heading">
                <h2>Study overview</h2>
                <Clock3 size={17} />
              </div>

              <div className="sp-total">
                <strong>{formatStudyTime(totalStudySeconds)}</strong>
                <span>Total focus time</span>
              </div>

              <div className="sp-info-list">

                <StudyDetail
                  label="Sessions"
                  value={validSessions.length}
                />

                <StudyDetail
                  label="Average session"
                  value={formatStudyTime(averageSession)}
                />

                <StudyDetail
                  label="Longest session"
                  value={formatStudyTime(longestSession)}
                />

                <StudyDetail
                  label="Best day"
                  value={bestDate}
                />

              </div>
            </article>

          </section>

          {/* CONSISTENCY */}

          <section className="sp-consistency">

            <div className="sp-section-heading">

              <div>
                <h2>Consistency</h2>
                <p>Activity over the last 30 days</p>
              </div>

              <span className="sp-muted">
                {active30Days} active days
              </span>

            </div>

            <div className="sp-consistency-body">

              <div className="sp-heatmap-wrap">

                <div className="sp-heatmap">

                  {consistencyDays.map((day) => {
                    const description =
                      `${day.date.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}: ${formatStudyTime(day.focusSeconds)}, ${day.taskCount} tasks`;

                    return (
                      <div
                        key={day.key}
                        className={`sp-heatmap-cell level-${day.level}`}
                        title={description}
                        aria-label={description}
                      >
                        {day.date.getDate()}
                      </div>
                    );
                  })}

                </div>

                <div className="sp-heatmap-legend">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <i
                      key={level}
                      className={`level-${level}`}
                    />
                  ))}
                  <span>Goal</span>
                </div>

              </div>

              <div className="sp-consistency-metrics">

                <StudyMetric
                  label="Active days"
                  value={`${active30Days}/30`}
                />

                <StudyMetric
                  label="Goal days"
                  value={goalDays}
                />

                <StudyMetric
                  label="Best focus day"
                  value={
                    bestDay.seconds > 0
                      ? formatStudyTime(bestDay.seconds)
                      : "—"
                  }
                  detail={bestDate}
                />

                <StudyMetric
                  label="Weekly direction"
                  value={
                    weekTrend.direction === "up"
                      ? "Improving"
                      : weekTrend.direction === "down"
                        ? "Lower"
                        : "Stable"
                  }
                />

              </div>

            </div>
          </section>

          {/* SUBJECT DISTRIBUTION */}

          <section className="sp-subjects">

            <div className="sp-section-heading">

              <div>
                <h2>Study distribution</h2>
                <p>Focus time by subject</p>
              </div>

              {subjectBreakdown.length > 4 && (
                <button
                  type="button"
                  className="sp-text-button"
                  aria-expanded={showAllSubjects}
                  aria-controls="sp-subject-list"
                  onClick={() => setShowAllSubjects((value) => !value)}
                >
                  {showAllSubjects
                    ? "Show less"
                    : `View all (${subjectBreakdown.length})`}
                </button>
              )}

            </div>

            {subjectBreakdown.length === 0 ? (
              <StudyEmpty
                icon={<BookOpen size={24} />}
                title="No subject activity"
                text="Link sessions, tasks or notes to a subject."
              />
            ) : (
              <div id="sp-subject-list">

                <div className="sp-subject-table-head">
                  <span>Subject</span>
                  <span>Focus time</span>
                  <span>Distribution</span>
                  <span>Tasks</span>
                </div>

                {visibleSubjects.map((subject) => {

                  const focusPercent =
                    totalSubjectFocus > 0
                      ? Math.round(
                          subject.focusSeconds /
                          totalSubjectFocus * 100
                        )
                      : 0;

                  const taskPercent =
                    subject.tasks > 0
                      ? Math.round(
                          subject.completedTasks /
                          subject.tasks * 100
                        )
                      : 0;

                  return (

                    <article
                      className="sp-subject-row"
                      key={subject.id}
                      style={{ "--sp-subject-color": subject.color }}
                    >

                      <div className="sp-subject-name">

                        <span className="sp-subject-dot" />

                        <div>
                          <strong>{subject.name}</strong>
                          <small>
                            {subject.sessions} {subject.sessions === 1 ? "session" : "sessions"}
                            {" · "}
                            {subject.notes} {subject.notes === 1 ? "note" : "notes"}
                          </small>
                        </div>

                      </div>

                      <div className="sp-subject-time">
                        <strong>{formatStudyTime(subject.focusSeconds)}</strong>
                      </div>

                      <div className="sp-subject-share">

                        <div className="sp-track">
                          <div
                            style={{
                              width: `${focusPercent}%`,
                              background: subject.color,
                            }}
                          />
                        </div>

                        <span>{focusPercent}%</span>
                      </div>

                      <div className="sp-subject-tasks">

                        <strong>
                          {subject.completedTasks}/{subject.tasks}
                        </strong>

                        <small>
                          {subject.tasks > 0
                            ? `${taskPercent}% done`
                            : "No tasks"}
                        </small>

                      </div>

                    </article>

                  );
                })}

              </div>
            )}

          </section>

          {/* TASKS AND NOTES */}

          <section className="sp-secondary-grid">

            <article className="sp-summary-panel">

              <div className="sp-section-heading">
                <h2>Tasks</h2>
                <strong>{completionRate}%</strong>
              </div>

              <div
                className="sp-track"
                role="progressbar"
                aria-label="Task completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completionRate}
              >
                <div style={{ width: `${completionRate}%` }} />
              </div>

              <div className="sp-mini-stats">

                <StudyMetric label="Total" value={totalTasks} />
                <StudyMetric label="Completed" value={completedCount} />
                <StudyMetric label="Pending" value={pendingCount} />
                <StudyMetric label="Today" value={completedToday} />

              </div>

            </article>

            <article className="sp-summary-panel">

              <div className="sp-section-heading">
                <h2>Notes</h2>
                <FileText size={17} />
              </div>

              <div className="sp-mini-stats">

                <StudyMetric label="Total" value={notes.length} />
                <StudyMetric label="Linked" value={linkedNotes} />
                <StudyMetric label="Pinned" value={pinnedNotes} />
                <StudyMetric label="Updated 7d" value={notesUpdatedThisWeek} />

              </div>

            </article>

          </section>

          {/* RECENT ACTIVITY */}

          <section className="sp-activity">

            <div className="sp-section-heading">

              <h2>Recent activity</h2>

              {recentActivity.length > 3 && (
                <button
                  type="button"
                  className="sp-text-button"
                  aria-expanded={showAllActivity}
                  aria-controls="sp-activity-list"
                  onClick={() => setShowAllActivity((value) => !value)}
                >
                  {showAllActivity ? "Show less" : "View all"}
                </button>
              )}

            </div>

            {recentActivity.length === 0 ? (
              <StudyEmpty
                icon={<Activity size={24} />}
                title="No activity yet"
                text="Focus sessions and completed tasks will appear here."
              />
            ) : (
              <div id="sp-activity-list">

                {visibleActivity.map((item) => {

                  const ItemIcon =
                    item.type === "session"
                      ? Timer
                      : CheckCircle2;

                  return (
                    <article
                      className="sp-activity-row"
                      key={item.id}
                    >

                      <span className={`sp-activity-icon is-${item.type}`}>
                        <ItemIcon size={18} />
                      </span>

                      <div className="sp-activity-copy">
                        <strong>{item.title}</strong>
                        <small>{formatRelativeActivity(item.date)}</small>
                      </div>

                      <strong className="sp-activity-meta">
                        {item.meta}
                      </strong>

                    </article>
                  );
                })}

              </div>
            )}

          </section>

          {/* INSIGHT */}

          <aside className="sp-insight">

            <InsightIcon size={19} />

            <div>
              <strong>{insight.title}</strong>
              <p>{insight.text}</p>
            </div>

          </aside>

        </>
      )}

    </div>
  );
}


function StudyMetric({ label, value, detail, trend }) {
  return (
    <div className="sp-metric">

      <span className="sp-metric-label">
        {label}
      </span>

      <strong>{value}</strong>

      {detail && (
        <small className={trend ? `is-${trend}` : ""}>
          {detail}
        </small>
      )}

    </div>
  );
}


function StudyDetail({ label, value }) {
  return (
    <div className="sp-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


function StudyEmpty({ icon, title, text }) {
  return (
    <div className="sp-empty">
      {icon}
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}


export default Progress;