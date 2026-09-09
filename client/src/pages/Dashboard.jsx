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
  Sparkles,
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
    startOfDay(
      value
    );

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
      Number(
        seconds
      ) || 0
    );

  const totalMinutes =
    Math.floor(
      safe / 60
    );

  const hours =
    Math.floor(
      totalMinutes /
        60
    );

  const minutes =
    totalMinutes %
    60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (
    totalMinutes >
    0
  ) {
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
    String(
      value
    )
      .split(":")
      .map(Number);

  if (
    Number.isNaN(
      hours
    ) ||
    Number.isNaN(
      minutes
    )
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
  // PROFILE NAME
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
        Number.isFinite(
          hours
        ) &&
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
  // LOAD DATA
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
  // PROFILE UPDATES
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
  // LIVE APP UPDATES
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
      (eventName) => {
        window.addEventListener(
          eventName,
          refresh
        );
      }
    );

    return () => {
      events.forEach(
        (eventName) => {
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
  // TODAY'S FOCUS
  // =======================================================

  const todaySessions =
    useMemo(() => {
      return sessions.filter(
        (session) => {
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
  // TASK STATS
  // =======================================================

  const pendingTasks =
    useMemo(() => {
      return tasks.filter(
        (task) =>
          !task.completed
      );
    }, [
      tasks,
    ]);

  const completedToday =
    useMemo(() => {
      return tasks.filter(
        (task) => {
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
        (task) =>
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
        (task) => {
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
          (task) => {
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
  // WEEKLY FOCUS
  // =======================================================

  const weeklyActivity =
    useMemo(() => {
      const result = [];

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
        (day) =>
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
        (session) => {
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
        totals.size ===
        0
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
    ]);

  // =======================================================
  // UPCOMING
  // =======================================================

  const upcomingItems =
    useMemo(() => {
      return calendarItems
        .map(
          (item) => ({
            ...item,

            parsedDate:
              new Date(
                item.date
              ),
          })
        )
        .filter(
          (item) => {
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
  // SUBJECT COLOR
  // =======================================================

  const getSubjectColor =
    (
      subjectName
    ) => {
      const subject =
        subjects.find(
          (item) =>
            item.name ===
            subjectName
        );

      return (
        subject?.color ||
        "#6366f1"
      );
    };

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="dashboard dashboard-v3">

      {/* HEADER */}

      <header className="dashboard-header dashboard-v3-header">

        <div>

          <span className="dashboard-v3-eyebrow">
            Overview
          </span>

          <h1>
            {name
              ? `${getGreeting()}, ${name}`
              : getGreeting()}
          </h1>

          <p>
            Your study activity,
            priorities and progress
            in one place.
          </p>

        </div>

        <button
          type="button"
          className="dashboard-v3-refresh"
          disabled={
            refreshing
          }
          onClick={() =>
            loadDashboard(
              true
            )
          }
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "dashboard-v3-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </header>

      {/* ERROR */}

      {error && (
        <div className="dashboard-v3-error">

          <AlertTriangle
            size={16}
          />

          <span>
            {error}
          </span>

        </div>
      )}

      {/* ===================================================
          GAMIFICATION HERO
      =================================================== */}

      <section className="dashboard-card dashboard-v3-level-card">

        <div className="dashboard-v3-level-main">

          <div className="dashboard-v3-level-badge">

            <Award
              size={25}
            />

            <span>
              {gamification.level}
            </span>

          </div>

          <div className="dashboard-v3-level-content">

            <div className="dashboard-v3-level-heading">

              <div>

                <span className="dashboard-v3-eyebrow">
                  Level {gamification.level}
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

            <div className="dashboard-v3-xp-track">

              <div
                className="dashboard-v3-xp-progress"
                style={{
                  width:
                    `${gamification.progress}%`,
                }}
              />

            </div>

            <div className="dashboard-v3-level-footer">

              <span>
                {gamification.xpToNextLevel >
                0
                  ? `${gamification.xpToNextLevel} XP to Level ${
                      gamification.level +
                      1
                    }`
                  : "Maximum level reached"}
              </span>

              <span>
                {gamification.progress}% complete
              </span>

            </div>

          </div>

        </div>

        <div className="dashboard-v3-level-stats">

          <div>

            <Zap
              size={15}
            />

            <span>
              This week
            </span>

            <strong>
              +{gamification.weeklyXp} XP
            </strong>

          </div>

          <div>

            <Flame
              size={15}
            />

            <span>
              Current streak
            </span>

            <strong>
              {gamification.streak} days
            </strong>

          </div>

          <div>

            <Sparkles
              size={15}
            />

            <span>
              Today
            </span>

            <strong>
              +{gamification.todayXp} XP
            </strong>

          </div>

        </div>

      </section>

      {/* PRIMARY STATS */}

      <section className="dashboard-v3-stats">

        <DashboardStat
          icon={
            <Timer
              size={19}
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
          description={`${todaySessions.length} ${
            todaySessions.length ===
            1
              ? "session"
              : "sessions"
          } today`}
        />

        <DashboardStat
          icon={
            <Target
              size={19}
            />
          }
          label="Daily goal"
          value={`${goalProgress}%`}
          description={`${todayFocusMinutes} / ${dailyGoalMinutes} min`}
        />

        <DashboardStat
          icon={
            <CheckCircle2
              size={19}
            />
          }
          label="Pending tasks"
          value={
            pendingTasks.length
          }
          description={`${completedToday} completed today`}
        />

        <DashboardStat
          icon={
            <Flame
              size={19}
            />
          }
          label="Study streak"
          value={
            gamification.streak
          }
          description={`Best: ${gamification.longestStreak} days`}
        />

      </section>

      {/* DAILY GOAL */}

      <section className="dashboard-card dashboard-v3-goal-card">

        <div className="dashboard-v3-goal-header">

          <div>

            <span className="dashboard-v3-eyebrow">
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

        <div className="dashboard-v3-goal-track">

          <div
            className="dashboard-v3-goal-progress"
            style={{
              width:
                `${goalProgress}%`,
            }}
          />

        </div>

        <div className="dashboard-v3-goal-footer">

          <span>
            {goalProgress >=
            100
              ? "Daily goal completed"
              : `${Math.max(
                  0,
                  dailyGoalMinutes -
                    todayFocusMinutes
                )} min remaining`}
          </span>

          <span>
            Goal:{" "}
            {dailyGoalMinutes} min
          </span>

        </div>

      </section>

      {/* MAIN GRID */}

      <section className="dashboard-v3-main-grid">

        <div className="dashboard-card dashboard-v3-panel">

          <div className="dashboard-v3-panel-header">

            <div>

              <span className="dashboard-v3-eyebrow">
                Plan
              </span>

              <h2>
                Today's tasks
              </h2>

            </div>

            <span className="dashboard-v3-count">
              {todayPlan.length}
            </span>

          </div>

          <div className="dashboard-v3-task-list">

            {loading ? (

              <DashboardEmpty
                icon={
                  <Clock3
                    size={22}
                  />
                }
                title="Loading tasks"
                description="Getting today's plan ready."
              />

            ) : todayPlan.length ===
              0 ? (

              <DashboardEmpty
                icon={
                  <CheckCircle2
                    size={23}
                  />
                }
                title="You're clear"
                description="No overdue or unscheduled tasks need attention."
              />

            ) : (

              todayPlan.map(
                (task) => {
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

                  return (
                    <div
                      className={`dashboard-v3-task ${
                        overdue
                          ? "overdue"
                          : ""
                      }`}
                      key={
                        task._id
                      }
                    >

                      <div
                        className={`dashboard-v3-priority priority-${normalizePriority(
                          task.priority
                        )}`}
                      />

                      <div className="dashboard-v3-task-content">

                        <strong>
                          {task.title}
                        </strong>

                        <div className="dashboard-v3-task-meta">

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
                                  ? "overdue"
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
                        className={`dashboard-v3-priority-label ${normalizePriority(
                          task.priority
                        )}`}
                      >
                        {normalizePriority(
                          task.priority
                        )}
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
            <div className="dashboard-v3-task-summary">

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

        <div className="dashboard-card dashboard-v3-panel">

          <div className="dashboard-v3-panel-header">

            <div>

              <span className="dashboard-v3-eyebrow">
                Schedule
              </span>

              <h2>
                Upcoming
              </h2>

            </div>

            <span className="dashboard-v3-count">
              {
                upcomingItems.length
              }
            </span>

          </div>

          <div className="dashboard-v3-upcoming-list">

            {upcomingItems.length ===
            0 ? (

              <DashboardEmpty
                icon={
                  <CalendarDays
                    size={23}
                  />
                }
                title="Nothing upcoming"
                description="Tasks with deadlines and Calendar events appear here."
              />

            ) : (

              upcomingItems.map(
                (item) => {
                  const taskItem =
                    item.source ===
                      "task" ||
                    item.type ===
                      "task";

                  return (
                    <div
                      className={`dashboard-v3-upcoming-item ${
                        taskItem
                          ? "task"
                          : ""
                      }`}
                      key={
                        item._id
                      }
                    >

                      <div className="dashboard-v3-date-box">

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

                      <div className="dashboard-v3-upcoming-content">

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

      {/* SECONDARY GRID */}

      <section className="dashboard-v3-secondary-grid">

        <div className="dashboard-card dashboard-v3-week-card">

          <div className="dashboard-v3-panel-header">

            <div>

              <span className="dashboard-v3-eyebrow">
                Activity
              </span>

              <h2>
                Last 7 days
              </h2>

              <p>
                Focus time recorded through StudyOS.
              </p>

            </div>

            <div className="dashboard-v3-week-total">

              <TrendingUp
                size={16}
              />

              <strong>
                {formatStudyTime(
                  weeklyFocusSeconds
                )}
              </strong>

            </div>

          </div>

          <div className="dashboard-v3-week-chart">

            {weeklyActivity.map(
              (day) => {
                const percentage =
                  day.seconds ===
                  0
                    ? 4
                    : Math.max(
                        10,
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
                    className="dashboard-v3-week-column"
                    key={
                      day.key
                    }
                  >

                    <span className="dashboard-v3-week-value">
                      {day.seconds >
                      0
                        ? formatStudyTime(
                            day.seconds
                          )
                        : "0"}
                    </span>

                    <div className="dashboard-v3-week-track">

                      <div
                        className={`dashboard-v3-week-bar ${
                          currentDay
                            ? "today"
                            : ""
                        }`}
                        style={{
                          height:
                            `${percentage}%`,
                        }}
                      />

                    </div>

                    <span
                      className={`dashboard-v3-week-label ${
                        currentDay
                          ? "today"
                          : ""
                      }`}
                    >
                      {
                        day.label
                      }
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* STUDY OVERVIEW */}

        <div className="dashboard-card dashboard-v3-insight-card">

          <div className="dashboard-v3-panel-header">

            <div>

              <span className="dashboard-v3-eyebrow">
                Insight
              </span>

              <h2>
                Study overview
              </h2>

            </div>

          </div>

          <div className="dashboard-v3-insight-list">

            <InsightRow
              icon={
                <BookOpen
                  size={17}
                />
              }
              label="Top subject"
              value={
                topSubject
                  ? topSubject.subjectName
                  : "No data"
              }
              description={
                topSubject
                  ? formatStudyTime(
                      topSubject.seconds
                    )
                  : "Complete Focus sessions to build insights."
              }
              color={
                topSubject
                  ? getSubjectColor(
                      topSubject.subjectName
                    )
                  : undefined
              }
            />

            <InsightRow
              icon={
                <Zap
                  size={17}
                />
              }
              label="XP this week"
              value={
                formatGamificationXp(
                  gamification.weeklyXp
                )
              }
              description={`${gamification.weeklyFocusXp} from Focus · ${gamification.weeklyTaskXp} from tasks`}
            />

            <InsightRow
              icon={
                <CheckCircle2
                  size={17}
                />
              }
              label="Completed today"
              value={
                completedToday
              }
              description="Tasks finished today"
            />

          </div>

        </div>

      </section>

      {/* RECENT FOCUS */}

      <section className="dashboard-card dashboard-v3-recent-card">

        <div className="dashboard-v3-panel-header">

          <div>

            <span className="dashboard-v3-eyebrow">
              Focus
            </span>

            <h2>
              Recent sessions
            </h2>

          </div>

          <span className="dashboard-v3-count">
            {
              recentSessions.length
            }
          </span>

        </div>

        {recentSessions.length ===
        0 ? (

          <DashboardEmpty
            icon={
              <Timer
                size={23}
              />
            }
            title="No Focus sessions yet"
            description="Your latest study sessions will appear here."
          />

        ) : (

          <div className="dashboard-v3-recent-grid">

            {recentSessions.map(
              (session) => (
                <div
                  className="dashboard-v3-session"
                  key={
                    session._id
                  }
                >

                  <div
                    className="dashboard-v3-session-icon"
                    style={{
                      "--dashboard-subject-color":
                        getSubjectColor(
                          session.subjectName ||
                            "General Study"
                        ),
                    }}
                  >

                    <BookOpen
                      size={16}
                    />

                  </div>

                  <div className="dashboard-v3-session-content">

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

                  <strong className="dashboard-v3-session-duration">
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
// STAT
// =========================================================

function DashboardStat({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="dashboard-v3-stat">

      <div className="dashboard-v3-stat-top">

        <span className="dashboard-v3-stat-icon">
          {icon}
        </span>

        <span>
          {label}
        </span>

      </div>

      <strong>
        {value}
      </strong>

      <small>
        {description}
      </small>

    </div>
  );
}

// =========================================================
// INSIGHT
// =========================================================

function InsightRow({
  icon,
  label,
  value,
  description,
  color,
}) {
  return (
    <div className="dashboard-v3-insight-row">

      <span
        className="dashboard-v3-insight-icon"
        style={
          color
            ? {
                "--dashboard-subject-color":
                  color,
              }
            : undefined
        }
      >
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

function DashboardEmpty({
  icon,
  title,
  description,
}) {
  return (
    <div className="dashboard-v3-empty">

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