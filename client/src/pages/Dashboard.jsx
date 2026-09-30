import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  RefreshCw,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

import apiRequest from "../services/api";

import {
  localDb,
} from "../services/localDb";

import {
  getCalendarEvents,
} from "../services/calendarData";

import {
  getStudySessions,
} from "../services/studySessionData";

import {
  calculateGamification,
  formatGamificationXp,
} from "../services/gamification";


// =========================================================
// HELPERS
// =========================================================

const startOfDay = (
  value = new Date()
) => {
  const date =
    new Date(value);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};


const getDateKey = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

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


const subtractDays = (
  value,
  amount
) => {
  const date =
    startOfDay(value);

  date.setDate(
    date.getDate() -
      amount
  );

  return date;
};


const formatStudyTime = (
  seconds
) => {
  const safe =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const totalMinutes =
    Math.floor(
      safe / 60
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }

  if (safe > 0) {
    return `${Math.floor(
      safe
    )}s`;
  }

  return "0m";
};


const formatTaskTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const [
    hours,
    minutes,
  ] =
    String(value)
      .split(":")
      .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return value;
  }

  const date =
    new Date();

  date.setHours(
    hours,
    minutes,
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour:
        "numeric",

      minute:
        "2-digit",
    }
  );
};


const formatShortDate = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
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


const normalizePriority = (
  value
) => {
  if (
    value === "high" ||
    value === "low"
  ) {
    return value;
  }

  return "medium";
};


const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
};


// =========================================================
// DASHBOARD
// =========================================================

function Dashboard() {
  const {
    isGuest,
    firebaseUser,
  } = useAuth();


  // =======================================================
  // DATA
  // =======================================================

  const [
    tasks,
    setTasks,
  ] = useState([]);

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    sessions,
    setSessions,
  ] = useState([]);

  const [
    calendarItems,
    setCalendarItems,
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


  // =======================================================
  // NAME
  // =======================================================

  const [
    name,
    setName,
  ] = useState(
    () =>
      localStorage.getItem(
        "studyos_name"
      ) ||
      firebaseUser?.displayName ||
      ""
  );


  // =======================================================
  // DAILY GOAL
  // =======================================================

  const getGoalMinutes =
    () => {
      const hours =
        Number(
          localStorage.getItem(
            "studyos_study_goal"
          )
        );

      if (
        Number.isFinite(hours) &&
        hours > 0
      ) {
        return Math.round(
          hours * 60
        );
      }

      return 120;
    };


  const [
    dailyGoalMinutes,
    setDailyGoalMinutes,
  ] = useState(
    getGoalMinutes
  );


  // =======================================================
  // GREETING
  // =======================================================

  const getGreeting =
    () => {
      const hour =
        new Date()
          .getHours();

      if (hour < 12) {
        return "Good morning";
      }

      if (hour < 17) {
        return "Good afternoon";
      }

      return "Good evening";
    };


  // =======================================================
  // LOAD
  // =======================================================

  const loadDashboard =
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

        const [
          taskData,
          subjectData,
          sessionData,
          calendarData,
        ] =
          await Promise.all([
            tasksPromise,

            subjectsPromise,

            getStudySessions(
              isGuest
            ),

            getCalendarEvents(
              isGuest
            ),
          ]);

        setTasks(
          Array.isArray(
            taskData
          )
            ? taskData
            : []
        );

        setSubjects(
          Array.isArray(
            subjectData
          )
            ? subjectData
            : []
        );

        setSessions(
          Array.isArray(
            sessionData
          )
            ? sessionData
            : []
        );

        setCalendarItems(
          Array.isArray(
            calendarData
          )
            ? calendarData
            : []
        );

        setDailyGoalMinutes(
          getGoalMinutes()
        );
      } catch (
        loadError
      ) {
        console.error(
          "Dashboard load failed:",
          loadError
        );

        setError(
          loadError?.message ||
            "Could not load dashboard data."
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
    loadDashboard(
      false
    );
  }, [
    isGuest,
  ]);


  // =======================================================
  // NAME UPDATES
  // =======================================================

  useEffect(() => {
    const refreshName =
      () => {
        setName(
          localStorage.getItem(
            "studyos_name"
          ) ||
            firebaseUser?.displayName ||
            ""
        );
      };

    refreshName();

    window.addEventListener(
      "studyos-name-updated",
      refreshName
    );

    return () => {
      window.removeEventListener(
        "studyos-name-updated",
        refreshName
      );
    };
  }, [
    firebaseUser?.displayName,
  ]);


  // =======================================================
  // LIVE DATA UPDATES
  // =======================================================

  useEffect(() => {
    const refresh =
      () => {
        loadDashboard(
          false
        );
      };

    const events = [
      "studyos-tasks-updated",
      "studyos-subjects-updated",
      "studyos-events-updated",
      "studyos-sessions-updated",
      "studyos-preferences-updated",
      "studyos-focus-settings-updated",
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
  // TODAY
  // =======================================================

  const today =
    startOfDay(
      new Date()
    );

  const todayKey =
    getDateKey(
      today
    );


  // =======================================================
  // GAMIFICATION
  // =======================================================

  const gamification =
    useMemo(
      () =>
        calculateGamification({
          sessions,
          tasks,
          referenceDate:
            new Date(),
        }),
      [
        sessions,
        tasks,
      ]
    );


  // =======================================================
  // TODAY FOCUS
  // =======================================================

  const todaySessions =
    useMemo(() => {
      return sessions.filter(
        (
          session
        ) => {
          const date =
            new Date(
              session.startedAt ||
                session.endedAt ||
                session.createdAt
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
            todayKey
          );
        }
      );
    }, [
      sessions,
      todayKey,
    ]);


  const todayFocusSeconds =
    useMemo(() => {
      return todaySessions.reduce(
        (
          total,
          session
        ) =>
          total +
          Number(
            session.durationSeconds ||
              0
          ),
        0
      );
    }, [
      todaySessions,
    ]);


  const todayFocusMinutes =
    Math.floor(
      todayFocusSeconds /
        60
    );


  const goalProgress =
    dailyGoalMinutes > 0
      ? Math.min(
          100,
          Math.round(
            (
              todayFocusMinutes /
              dailyGoalMinutes
            ) *
              100
          )
        )
      : 0;


  // =======================================================
  // TASKS
  // =======================================================

  const pendingTasks =
    useMemo(() => {
      return tasks.filter(
        (
          task
        ) =>
          !task.completed
      );
    }, [
      tasks,
    ]);


  const completedToday =
    useMemo(() => {
      return tasks.filter(
        (
          task
        ) => {
          if (
            !task.completed ||
            !task.completedAt
          ) {
            return false;
          }

          return (
            getDateKey(
              task.completedAt
            ) ===
            todayKey
          );
        }
      ).length;
    }, [
      tasks,
      todayKey,
    ]);


  const dueTodayTasks =
    useMemo(() => {
      return pendingTasks.filter(
        (
          task
        ) =>
          getDateKey(
            task.dueDate
          ) ===
          todayKey
      );
    }, [
      pendingTasks,
      todayKey,
    ]);


  const overdueTasks =
    useMemo(() => {
      return pendingTasks.filter(
        (
          task
        ) => {
          const dueKey =
            getDateKey(
              task.dueDate
            );

          return (
            dueKey &&
            dueKey <
              todayKey
          );
        }
      );
    }, [
      pendingTasks,
      todayKey,
    ]);


  // =======================================================
  // TODAY PLAN
  // =======================================================

  const todayPlan =
    useMemo(() => {
      const candidates =
        pendingTasks.filter(
          (
            task
          ) => {
            const dueKey =
              getDateKey(
                task.dueDate
              );

            return (
              !dueKey ||
              dueKey <=
                todayKey
            );
          }
        );

      return [
        ...candidates,
      ]
        .sort(
          (
            first,
            second
          ) => {
            const firstDate =
              getDateKey(
                first.dueDate
              );

            const secondDate =
              getDateKey(
                second.dueDate
              );

            if (
              firstDate &&
              secondDate &&
              firstDate !==
                secondDate
            ) {
              return firstDate.localeCompare(
                secondDate
              );
            }

            if (
              firstDate &&
              !secondDate
            ) {
              return -1;
            }

            if (
              !firstDate &&
              secondDate
            ) {
              return 1;
            }

            return (
              PRIORITY_ORDER[
                normalizePriority(
                  first.priority
                )
              ] -
              PRIORITY_ORDER[
                normalizePriority(
                  second.priority
                )
              ]
            );
          }
        )
        .slice(
          0,
          6
        );
    }, [
      pendingTasks,
      todayKey,
    ]);


  // =======================================================
  // WEEK
  // =======================================================

  const weeklyActivity =
    useMemo(() => {
      const result =
        [];

      for (
        let index = 6;
        index >= 0;
        index--
      ) {
        const date =
          subtractDays(
            new Date(),
            index
          );

        const key =
          getDateKey(
            date
          );

        const daySeconds =
          sessions.reduce(
            (
              total,
              session
            ) => {
              const sessionDate =
                new Date(
                  session.startedAt ||
                    session.endedAt ||
                    session.createdAt
                );

              if (
                Number.isNaN(
                  sessionDate.getTime()
                )
              ) {
                return total;
              }

              if (
                getDateKey(
                  sessionDate
                ) !==
                key
              ) {
                return total;
              }

              return (
                total +
                Number(
                  session.durationSeconds ||
                    0
                )
              );
            },
            0
          );

        result.push({
          date,
          key,

          seconds:
            daySeconds,

          label:
            date.toLocaleDateString(
              "en-IN",
              {
                weekday:
                  "short",
              }
            ),
        });
      }

      return result;
    }, [
      sessions,
    ]);


  const weeklyFocusSeconds =
    weeklyActivity.reduce(
      (
        total,
        day
      ) =>
        total +
        day.seconds,
      0
    );


  const maxWeeklySeconds =
    Math.max(
      ...weeklyActivity.map(
        (
          day
        ) =>
          day.seconds
      ),
      1
    );


  // =======================================================
  // TOP SUBJECT
  // =======================================================

  const topSubject =
    useMemo(() => {
      const earliest =
        subtractDays(
          new Date(),
          6
        );

      const totals =
        new Map();

      sessions.forEach(
        (
          session
        ) => {
          const date =
            new Date(
              session.startedAt ||
                session.endedAt ||
                session.createdAt
            );

          if (
            Number.isNaN(
              date.getTime()
            ) ||
            date <
              earliest
          ) {
            return;
          }

          const subjectName =
            session.subjectName ||
            "General Study";

          totals.set(
            subjectName,
            (
              totals.get(
                subjectName
              ) || 0
            ) +
              Number(
                session.durationSeconds ||
                  0
              )
          );
        }
      );

      if (
        totals.size === 0
      ) {
        return null;
      }

      return [
        ...totals.entries(),
      ]
        .sort(
          (
            first,
            second
          ) =>
            second[1] -
            first[1]
        )
        .map(
          ([
            subjectName,
            seconds,
          ]) => ({
            subjectName,
            seconds,
          })
        )[0];
    }, [
      sessions,
      subjects,
    ]);


  // =======================================================
  // UPCOMING
  // =======================================================

  const upcomingItems =
    useMemo(() => {
      return calendarItems
        .map(
          (
            item
          ) => ({
            ...item,

            parsedDate:
              new Date(
                item.date
              ),
          })
        )
        .filter(
          (
            item
          ) => {
            if (
              Number.isNaN(
                item.parsedDate.getTime()
              )
            ) {
              return false;
            }

            return (
              startOfDay(
                item.parsedDate
              ) >=
              today
            );
          }
        )
        .sort(
          (
            first,
            second
          ) =>
            first.parsedDate -
            second.parsedDate
        )
        .slice(
          0,
          5
        );
    }, [
      calendarItems,
      todayKey,
    ]);


  // =======================================================
  // RECENT FOCUS
  // =======================================================

  const recentSessions =
    useMemo(() => {
      return [
        ...sessions,
      ]
        .sort(
          (
            first,
            second
          ) =>
            new Date(
              second.startedAt ||
                second.endedAt ||
                0
            ) -
            new Date(
              first.startedAt ||
                first.endedAt ||
                0
            )
        )
        .slice(
          0,
          4
        );
    }, [
      sessions,
    ]);


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="v2d-page">

      {/* HEADER */}

      <header className="v2d-header">

        <div className="v2d-header-copy">

          <span className="v2d-eyebrow">
            Workspace
          </span>

          <h1 className="v2d-title">
            {getGreeting()}
            {name
              ? `, ${name}`
              : ""}
            .
          </h1>

          <p className="v2d-description">
            Plan what matters, focus on the work,
            and review your progress.
          </p>

        </div>

        <button
          type="button"
          className="v2d-refresh"
          disabled={
            loading ||
            refreshing
          }
          onClick={() =>
            loadDashboard(
              true
            )
          }
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? "v2d-spin"
                : ""
            }
          />

          <span>
            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </span>
        </button>

      </header>


      {/* ERROR */}

      {error && (
        <div className="v2d-error">

          <AlertTriangle
            size={16}
          />

          <span>
            {error}
          </span>

        </div>
      )}


      {/* LEVEL */}

      <section className="v2d-level">

        <div className="v2d-level-main">

          <div className="v2d-level-mark">

            <Award
              size={20}
            />

            <span>
              {gamification.level}
            </span>

          </div>

          <div className="v2d-level-content">

            <div className="v2d-level-heading">

              <div>

                <span className="v2d-kicker">
                  Current level
                </span>

                <h2>
                  {gamification.title}
                </h2>

              </div>

              <strong>
                {formatGamificationXp(
                  gamification.totalXp
                )}
              </strong>

            </div>

            <div className="v2d-progress-track">

              <div
                className="v2d-progress-fill"
                style={{
                  width:
                    `${gamification.progress}%`,
                }}
              />

            </div>

            <div className="v2d-level-footer">

              <span>
                {gamification.xpIntoLevel.toLocaleString(
                  "en-IN"
                )}{" "}
                /{" "}
                {gamification.xpRequiredForLevel.toLocaleString(
                  "en-IN"
                )} XP
              </span>

              <span>
                {gamification.xpToNextLevel.toLocaleString(
                  "en-IN"
                )}{" "}
                XP to level{" "}
                {gamification.level +
                  1}
              </span>

            </div>

          </div>

        </div>

        <div className="v2d-level-metrics">

          <div>
            <span>
              XP this week
            </span>

            <strong>
              {gamification.weeklyXp.toLocaleString(
                "en-IN"
              )}
            </strong>
          </div>

          <div>
            <span>
              Current streak
            </span>

            <strong>
              {gamification.streak}d
            </strong>
          </div>

          <div>
            <span>
              Total sessions
            </span>

            <strong>
              {gamification.sessionCount}
            </strong>
          </div>

        </div>

      </section>


      {/* STATS */}

      <section className="v2d-stats">

        <MetricCard
          icon={
            <Timer
              size={18}
            />
          }
          label="Focus today"
          value={
            loading
              ? "—"
              : formatStudyTime(
                  todayFocusSeconds
                )
          }
          detail={`${todaySessions.length} ${
            todaySessions.length ===
            1
              ? "session"
              : "sessions"
          }`}
        />

        <MetricCard
          icon={
            <Target
              size={18}
            />
          }
          label="Daily goal"
          value={`${goalProgress}%`}
          detail={`${todayFocusMinutes} / ${dailyGoalMinutes} min`}
        />

        <MetricCard
          icon={
            <CheckCircle2
              size={18}
            />
          }
          label="Pending"
          value={
            pendingTasks.length
          }
          detail={`${completedToday} completed today`}
        />

        <MetricCard
          icon={
            <Flame
              size={18}
            />
          }
          label="Study streak"
          value={`${gamification.streak}d`}
          detail={`Best ${gamification.longestStreak} days`}
        />

      </section>


      {/* DAILY GOAL */}

      <section className="v2d-goal">

        <div className="v2d-goal-copy">

          <div>

            <span className="v2d-kicker">
              Today
            </span>

            <h2>
              Daily focus goal
            </h2>

          </div>

          <strong>
            {formatStudyTime(
              todayFocusSeconds
            )}
          </strong>

        </div>

        <div className="v2d-goal-track">

          <div
            className="v2d-goal-fill"
            style={{
              width:
                `${goalProgress}%`,
            }}
          />

        </div>

        <div className="v2d-goal-meta">

          <span>
            {goalProgress >=
            100
              ? "Goal completed"
              : `${Math.max(
                  0,
                  dailyGoalMinutes -
                    todayFocusMinutes
                )} min remaining`}
          </span>

          <span>
            Goal {dailyGoalMinutes} min
          </span>

        </div>

      </section>


      {/* PLAN */}

      <section className="v2d-main-grid">

        <div className="v2d-panel">

          <PanelHeader
            eyebrow="Plan"
            title="Today's tasks"
            count={
              todayPlan.length
            }
          />

          <div className="v2d-task-list">

            {loading ? (

              <EmptyState
                icon={
                  <Clock3
                    size={20}
                  />
                }
                title="Loading tasks"
                description="Getting today's plan ready."
              />

            ) : todayPlan.length ===
              0 ? (

              <EmptyState
                icon={
                  <CheckCircle2
                    size={20}
                  />
                }
                title="You're clear"
                description="No overdue or unscheduled tasks need attention."
              />

            ) : (

              todayPlan.map(
                (
                  task
                ) => {
                  const dueKey =
                    getDateKey(
                      task.dueDate
                    );

                  const overdue =
                    Boolean(
                      dueKey &&
                        dueKey <
                          todayKey
                    );

                  const priority =
                    normalizePriority(
                      task.priority
                    );

                  return (
                    <div
                      className={`v2d-task ${
                        overdue
                          ? "is-overdue"
                          : ""
                      }`}
                      key={
                        task._id
                      }
                    >

                      <span
                        className={`v2d-task-priority is-${priority}`}
                      />

                      <div className="v2d-task-copy">

                        <strong>
                          {task.title}
                        </strong>

                        <div className="v2d-task-meta">

                          {task.subjectName && (
                            <span>
                              <BookOpen
                                size={12}
                              />

                              {
                                task.subjectName
                              }
                            </span>
                          )}

                          {task.dueDate && (
                            <span
                              className={
                                overdue
                                  ? "is-danger"
                                  : ""
                              }
                            >
                              <CalendarDays
                                size={12}
                              />

                              {overdue
                                ? "Overdue · "
                                : ""}

                              {formatShortDate(
                                task.dueDate
                              )}
                            </span>
                          )}

                          {task.dueTime && (
                            <span>
                              <Clock3
                                size={12}
                              />

                              {formatTaskTime(
                                task.dueTime
                              )}
                            </span>
                          )}

                        </div>

                      </div>

                      <span
                        className={`v2d-priority-label is-${priority}`}
                      >
                        {priority}
                      </span>

                    </div>
                  );
                }
              )

            )}

          </div>

          {(dueTodayTasks.length >
            0 ||
            overdueTasks.length >
              0) && (
            <div className="v2d-task-summary">

              <span>
                {dueTodayTasks.length} due today
              </span>

              <span>
                {overdueTasks.length} overdue
              </span>

            </div>
          )}

        </div>


        {/* UPCOMING */}

        <div className="v2d-panel">

          <PanelHeader
            eyebrow="Schedule"
            title="Upcoming"
            count={
              upcomingItems.length
            }
          />

          <div className="v2d-upcoming-list">

            {upcomingItems.length ===
            0 ? (

              <EmptyState
                icon={
                  <CalendarDays
                    size={20}
                  />
                }
                title="Nothing upcoming"
                description="Tasks with deadlines and calendar events appear here."
              />

            ) : (

              upcomingItems.map(
                (
                  item
                ) => {
                  const taskItem =
                    item.source ===
                      "task" ||
                    item.type ===
                      "task";

                  return (
                    <div
                      className="v2d-upcoming"
                      key={
                        item._id
                      }
                    >

                      <div className="v2d-date">

                        <strong>
                          {item.parsedDate.getDate()}
                        </strong>

                        <span>
                          {item.parsedDate.toLocaleDateString(
                            "en-IN",
                            {
                              month:
                                "short",
                            }
                          )}
                        </span>

                      </div>

                      <div className="v2d-upcoming-copy">

                        <strong>
                          {item.title}
                        </strong>

                        <div>

                          <span>
                            {taskItem
                              ? "Task"
                              : item.type ||
                                "Event"}
                          </span>

                          {item.subjectName && (
                            <>
                              <span>·</span>

                              <span>
                                {
                                  item.subjectName
                                }
                              </span>
                            </>
                          )}

                          {item.dueTime && (
                            <>
                              <span>·</span>

                              <span>
                                {formatTaskTime(
                                  item.dueTime
                                )}
                              </span>
                            </>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                }
              )

            )}

          </div>

        </div>

      </section>


      {/* REVIEW */}

      <section className="v2d-review-grid">

        <div className="v2d-panel">

          <div className="v2d-panel-heading">

            <div>

              <span className="v2d-kicker">
                Activity
              </span>

              <h2>
                Last 7 days
              </h2>

              <p>
                Focus time recorded through StudyOS.
              </p>

            </div>

            <div className="v2d-week-total">

              <TrendingUp
                size={15}
              />

              <strong>
                {formatStudyTime(
                  weeklyFocusSeconds
                )}
              </strong>

            </div>

          </div>

          <div className="v2d-chart">

            {weeklyActivity.map(
              (
                day
              ) => {
                const height =
                  day.seconds ===
                  0
                    ? 3
                    : Math.max(
                        8,
                        (
                          day.seconds /
                          maxWeeklySeconds
                        ) *
                          100
                      );

                const currentDay =
                  day.key ===
                  todayKey;

                return (
                  <div
                    className="v2d-chart-column"
                    key={
                      day.key
                    }
                  >

                    <span className="v2d-chart-value">
                      {day.seconds >
                      0
                        ? formatStudyTime(
                            day.seconds
                          )
                        : "0"}
                    </span>

                    <div className="v2d-chart-track">

                      <div
                        className={`v2d-chart-bar ${
                          currentDay
                            ? "is-today"
                            : ""
                        }`}
                        style={{
                          height:
                            `${height}%`,
                        }}
                      />

                    </div>

                    <span
                      className={`v2d-chart-label ${
                        currentDay
                          ? "is-today"
                          : ""
                      }`}
                    >
                      {day.label}
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </div>


        {/* OVERVIEW */}

        <div className="v2d-panel">

          <PanelHeader
            eyebrow="Review"
            title="Study overview"
          />

          <div className="v2d-insights">

            <Insight
              icon={
                <BookOpen
                  size={16}
                />
              }
              label="Top subject"
              value={
                topSubject
                  ? topSubject.subjectName
                  : "No data"
              }
              detail={
                topSubject
                  ? formatStudyTime(
                      topSubject.seconds
                    )
                  : "Complete focus sessions to build insights."
              }
            />

            <Insight
              icon={
                <Zap
                  size={16}
                />
              }
              label="XP this week"
              value={
                formatGamificationXp(
                  gamification.weeklyXp
                )
              }
              detail={`${gamification.weeklyFocusXp} focus · ${gamification.weeklyTaskXp} tasks`}
            />

            <Insight
              icon={
                <CheckCircle2
                  size={16}
                />
              }
              label="Completed today"
              value={
                completedToday
              }
              detail="Tasks finished today"
            />

          </div>

        </div>

      </section>


      {/* RECENT */}

      <section className="v2d-panel v2d-recent">

        <PanelHeader
          eyebrow="Focus"
          title="Recent sessions"
          count={
            recentSessions.length
          }
        />

        {recentSessions.length ===
        0 ? (

          <EmptyState
            icon={
              <Timer
                size={20}
              />
            }
            title="No focus sessions yet"
            description="Your latest study sessions will appear here."
          />

        ) : (

          <div className="v2d-session-grid">

            {recentSessions.map(
              (
                session
              ) => (
                <div
                  className="v2d-session"
                  key={
                    session._id
                  }
                >

                  <span className="v2d-session-icon">
                    <BookOpen
                      size={15}
                    />
                  </span>

                  <div className="v2d-session-copy">

                    <strong>
                      {session.subjectName ||
                        "General Study"}
                    </strong>

                    <span>
                      {formatShortDate(
                        session.startedAt ||
                          session.endedAt
                      )}
                    </span>

                  </div>

                  <strong className="v2d-session-time">
                    {formatStudyTime(
                      session.durationSeconds
                    )}
                  </strong>

                </div>
              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}


// =========================================================
// METRIC
// =========================================================

function MetricCard({
  icon,
  label,
  value,
  detail,
}) {
  return (
    <article className="v2d-metric">

      <div className="v2d-metric-label">

        <span className="v2d-metric-icon">
          {icon}
        </span>

        <span>
          {label}
        </span>

      </div>

      <strong className="v2d-metric-value">
        {value}
      </strong>

      <span className="v2d-metric-detail">
        {detail}
      </span>

    </article>
  );
}


// =========================================================
// PANEL HEADER
// =========================================================

function PanelHeader({
  eyebrow,
  title,
  count,
}) {
  return (
    <div className="v2d-panel-heading">

      <div>

        <span className="v2d-kicker">
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>

      </div>

      {count !==
        undefined && (
        <span className="v2d-count">
          {count}
        </span>
      )}

    </div>
  );
}


// =========================================================
// INSIGHT
// =========================================================

function Insight({
  icon,
  label,
  value,
  detail,
}) {
  return (
    <div className="v2d-insight">

      <span className="v2d-insight-icon">
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
          {detail}
        </small>

      </div>

    </div>
  );
}


// =========================================================
// EMPTY
// =========================================================

function EmptyState({
  icon,
  title,
  description,
}) {
  return (
    <div className="v2d-empty">

      {icon}

      <strong>
        {title}
      </strong>

      <span>
        {description}
      </span>

    </div>
  );
}


export default Dashboard;
