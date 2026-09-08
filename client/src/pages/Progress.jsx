import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  RefreshCw,
  Target,
  Timer,
  Trophy,
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

function Progress() {
  const {
    isGuest,
  } = useAuth();
  // =========================================================
  // DATA
  // =========================================================

  const [tasks, setTasks] =
    useState([]);

  const [sessions, setSessions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // =========================================================
  // DAILY GOAL
  // =========================================================

  const getDailyGoalMinutes =
    () => {
      const stored =
        Number(
          localStorage.getItem(
            "studyos_study_goal"
          )
        );

      if (
        Number.isFinite(stored) &&
        stored > 0
      ) {
        return stored * 60;
      }

      return 120;
    };

  const [
    dailyGoalMinutes,
    setDailyGoalMinutes,
  ] = useState(
    getDailyGoalMinutes
  );

  // =========================================================
  // DATE HELPERS
  // =========================================================

  const startOfDay = (
    date
  ) => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  };

  const subtractDays = (
    date,
    amount
  ) => {
    const copy =
      new Date(date);

    copy.setDate(
      copy.getDate() -
        amount
    );

    return startOfDay(
      copy
    );
  };

  const getDateKey = (
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

  const isSameDay = (
    a,
    b
  ) => {
    return (
      getDateKey(a) ===
      getDateKey(b)
    );
  };

  // =========================================================
  // FORMAT STUDY TIME
  // =========================================================

  const formatStudyTime = (
    seconds
  ) => {
    const safe =
      Math.max(
        0,
        Number(seconds) ||
          0
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
      totalMinutes > 0
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

  // =========================================================
  // LOAD DATA
  // =========================================================

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

        const taskPromise =
          isGuest
            ? localDb.getAll(
                "tasks"
              )
            : apiRequest(
                "/api/tasks"
              );

        const sessionPromise =
          getStudySessions(
            isGuest
          );

        const [
          taskData,
          sessionData,
        ] =
          await Promise.all([
            taskPromise,
            sessionPromise,
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

        setDailyGoalMinutes(
          getDailyGoalMinutes()
        );
      } catch (
        loadError
      ) {
        console.error(
          "Progress load failed:",
          loadError
        );

        setError(
          loadError.message ||
            "Couldn't load progress."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadProgress(false);
  }, [isGuest]);

  // =========================================================
  // LIVE TASK / SESSION UPDATE
  // =========================================================

  useEffect(() => {
    const refreshProgress =
      () => {
        loadProgress(false);
      };

    window.addEventListener(
      "studyos-sessions-updated",
      refreshProgress
    );

    window.addEventListener(
      "studyos-tasks-updated",
      refreshProgress
    );

    return () => {
      window.removeEventListener(
        "studyos-sessions-updated",
        refreshProgress
      );

      window.removeEventListener(
        "studyos-tasks-updated",
        refreshProgress
      );
    };
  }, [isGuest]);

  // =========================================================
  // TASK STATS
  // =========================================================

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed ===
        true
    );

  const totalTasks =
    tasks.length;

  const completedCount =
    completedTasks.length;

  const pendingCount =
    totalTasks -
    completedCount;

  const completionRate =
    totalTasks > 0
      ? Math.round(
          (completedCount /
            totalTasks) *
            100
        )
      : 0;

  // =========================================================
  // TASK HISTORY
  // =========================================================

  const timestampedTasks =
    useMemo(() => {
      return completedTasks.filter(
        (task) => {
          if (
            !task.completedAt
          ) {
            return false;
          }

          const date =
            new Date(
              task.completedAt
            );

          return !Number.isNaN(
            date.getTime()
          );
        }
      );
    }, [tasks]);

  const completedToday =
    timestampedTasks.filter(
      (task) =>
        isSameDay(
          new Date(
            task.completedAt
          ),
          new Date()
        )
    ).length;

  // =========================================================
  // VALID SESSIONS
  // =========================================================

  const validSessions =
    useMemo(() => {
      return sessions.filter(
        (session) => {
          const duration =
            Number(
              session.durationSeconds
            );

          const date =
            new Date(
              session.endedAt
            );

          return (
            Number.isFinite(
              duration
            ) &&
            duration > 0 &&
            !Number.isNaN(
              date.getTime()
            )
          );
        }
      );
    }, [sessions]);

  // =========================================================
  // SESSION TOTALS
  // =========================================================

  const totalStudySeconds =
    validSessions.reduce(
      (
        total,
        session
      ) =>
        total +
        Number(
          session.durationSeconds
        ),
      0
    );

  const todayStudySeconds =
    validSessions
      .filter(
        (session) =>
          isSameDay(
            new Date(
              session.endedAt
            ),
            new Date()
          )
      )
      .reduce(
        (
          total,
          session
        ) =>
          total +
          Number(
            session.durationSeconds
          ),
        0
      );

  // =========================================================
  // DAILY GOAL
  // =========================================================

  const todayStudyMinutes =
    todayStudySeconds /
    60;

  const dailyGoalPercent =
    Math.min(
      100,
      Math.round(
        (todayStudyMinutes /
          dailyGoalMinutes) *
          100
      )
    );

  // =========================================================
  // LAST 7 DAYS
  // =========================================================

  const weekActivity =
    useMemo(() => {
      const result = [];

      for (
        let i = 6;
        i >= 0;
        i--
      ) {
        const date =
          subtractDays(
            new Date(),
            i
          );

        const studySeconds =
          validSessions
            .filter(
              (session) =>
                isSameDay(
                  new Date(
                    session.endedAt
                  ),
                  date
                )
            )
            .reduce(
              (
                total,
                session
              ) =>
                total +
                Number(
                  session.durationSeconds
                ),
              0
            );

        const tasksCompleted =
          timestampedTasks.filter(
            (task) =>
              isSameDay(
                new Date(
                  task.completedAt
                ),
                date
              )
          ).length;

        result.push({
          key:
            getDateKey(
              date
            ),

          date,

          label:
            date.toLocaleDateString(
              "en-IN",
              {
                weekday:
                  "short",
              }
            ),

          studySeconds,

          studyMinutes:
            studySeconds /
            60,

          tasksCompleted,
        });
      }

      return result;
    }, [
      validSessions,
      timestampedTasks,
    ]);

  const weekStudySeconds =
    weekActivity.reduce(
      (
        total,
        day
      ) =>
        total +
        day.studySeconds,
      0
    );

  const weekTasksCompleted =
    weekActivity.reduce(
      (
        total,
        day
      ) =>
        total +
        day.tasksCompleted,
      0
    );

  const maxStudyMinutes =
    Math.max(
      ...weekActivity.map(
        (day) =>
          day.studyMinutes
      ),
      1
    );

  // =========================================================
  // STUDY STREAK
  // =========================================================

  const studyStreak =
    useMemo(() => {
      const activeDates =
        new Set();

      validSessions.forEach(
        (session) => {
          activeDates.add(
            getDateKey(
              new Date(
                session.endedAt
              )
            )
          );
        }
      );

      if (
        activeDates.size ===
        0
      ) {
        return 0;
      }

      let cursor =
        startOfDay(
          new Date()
        );

      /*
        If no study session
        today yet, yesterday
        can still maintain the
        current streak.
      */

      if (
        !activeDates.has(
          getDateKey(
            cursor
          )
        )
      ) {
        cursor =
          subtractDays(
            cursor,
            1
          );
      }

      let streak = 0;

      while (
        activeDates.has(
          getDateKey(
            cursor
          )
        )
      ) {
        streak += 1;

        cursor =
          subtractDays(
            cursor,
            1
          );
      }

      return streak;
    }, [validSessions]);

  // =========================================================
  // ACTIVE STUDY DAYS
  // =========================================================

  const activeStudyDays =
    useMemo(() => {
      const unique =
        new Set();

      validSessions.forEach(
        (session) => {
          unique.add(
            getDateKey(
              new Date(
                session.endedAt
              )
            )
          );
        }
      );

      return unique.size;
    }, [validSessions]);

  // =========================================================
  // LONGEST SESSION
  // =========================================================

  const longestSession =
    useMemo(() => {
      if (
        validSessions.length ===
        0
      ) {
        return null;
      }

      return [
        ...validSessions,
      ].sort(
        (a, b) =>
          Number(
            b.durationSeconds
          ) -
          Number(
            a.durationSeconds
          )
      )[0];
    }, [validSessions]);

  // =========================================================
  // AVERAGE SESSION
  // =========================================================

  const averageSessionSeconds =
    validSessions.length > 0
      ? totalStudySeconds /
        validSessions.length
      : 0;

  // =========================================================
  // SUBJECT BREAKDOWN
  // =========================================================

  const subjectBreakdown =
    useMemo(() => {
      const map = {};

      validSessions.forEach(
        (session) => {
          const name =
            session.subjectName?.trim() ||
            "General Study";

          if (!map[name]) {
            map[name] = {
              name,
              seconds: 0,
              sessions: 0,
            };
          }

          map[name].seconds +=
            Number(
              session.durationSeconds
            );

          map[name].sessions +=
            1;
        }
      );

      return Object.values(
        map
      ).sort(
        (a, b) =>
          b.seconds -
          a.seconds
      );
    }, [validSessions]);

  const topSubject =
    subjectBreakdown[0] ||
    null;

  // =========================================================
  // RECENT SESSIONS
  // =========================================================

  const recentSessions =
    [...validSessions]
      .sort(
        (a, b) =>
          new Date(
            b.endedAt
          ) -
          new Date(
            a.endedAt
          )
      )
      .slice(0, 5);

  // =========================================================
  // SESSION DATE FORMAT
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
        return "";
      }

      if (
        isSameDay(
          date,
          new Date()
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

          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      );
    };

  // =========================================================
  // INSIGHT
  // =========================================================

  const getInsight =
    () => {
      if (
        validSessions.length ===
          0 &&
        totalTasks === 0
      ) {
        return {
          icon: "🚀",

          title:
            "Your StudyOS history starts here",

          text:
            "Complete tasks and run Focus sessions to start building meaningful progress data.",
        };
      }

      if (
        dailyGoalPercent >=
        100
      ) {
        return {
          icon: "🗿",

          title:
            "Daily goal destroyed",

          text:
            `You've studied ${formatStudyTime(
              todayStudySeconds
            )} today and cleared your ${dailyGoalMinutes / 60}h target.`,
        };
      }

      if (
        studyStreak >= 7
      ) {
        return {
          icon: "🔥",

          title:
            `${studyStreak}-day study streak`,

          text:
            "You're past the motivation stage now. This is becoming a habit.",
        };
      }

      if (
        todayStudySeconds >
        0
      ) {
        return {
          icon: "⚡",

          title:
            "Momentum secured",

          text:
            `You've focused for ${formatStudyTime(
              todayStudySeconds
            )} today. Keep stacking sessions.`,
        };
      }

      return {
        icon: "🎯",

        title:
          "One session changes the chart",

        text:
          "Start a Focus session today and keep your study streak moving.",
      };
    };

  const insight =
    getInsight();

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="dashboard progress-v3-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="dashboard-header progress-v3-header">

        <div>

          <h1>
            Progress 📊
          </h1>

          <p>
            Your real study activity,
            task completion and focus
            history.
          </p>

        </div>

        <button
          type="button"
          className="progress-v3-refresh"
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
            size={16}
            className={
              refreshing
                ? "progress-v3-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </header>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="progress-v3-error">

          <div>

            <strong>
              Couldn't load progress
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

        <div className="dashboard-card">
          Loading progress...
        </div>

      ) : (

        <>
          {/* =================================================
              HERO STATS
          ================================================= */}

          <section className="progress-v3-hero-stats">

            <div className="progress-v3-stat">

              <Clock3
                size={20}
              />

              <div>

                <span>
                  Studied Today
                </span>

                <strong>
                  {formatStudyTime(
                    todayStudySeconds
                  )}
                </strong>

                <small>
                  {dailyGoalPercent}%
                  of daily goal
                </small>

              </div>

            </div>

            <div className="progress-v3-stat">

              <TrendingUp
                size={20}
              />

              <div>

                <span>
                  Last 7 Days
                </span>

                <strong>
                  {formatStudyTime(
                    weekStudySeconds
                  )}
                </strong>

                <small>
                  focused this week
                </small>

              </div>

            </div>

            <div className="progress-v3-stat">

              <Flame
                size={20}
              />

              <div>

                <span>
                  Study Streak
                </span>

                <strong>
                  {studyStreak}
                </strong>

                <small>
                  {studyStreak ===
                  1
                    ? "active day"
                    : "consecutive days"}
                </small>

              </div>

            </div>

            <div className="progress-v3-stat">

              <CheckCircle2
                size={20}
              />

              <div>

                <span>
                  Task Completion
                </span>

                <strong>
                  {
                    completionRate
                  }
                  %
                </strong>

                <small>
                  {completedCount} of{" "}
                  {totalTasks}
                </small>

              </div>

            </div>

          </section>

          {/* =================================================
              DAILY GOAL
          ================================================= */}

          <section className="dashboard-card progress-v3-goal-card">

            <div className="progress-v3-goal-top">

              <div>

                <span className="progress-v3-eyebrow">
                  DAILY STUDY GOAL
                </span>

                <h2>
                  {formatStudyTime(
                    todayStudySeconds
                  )}{" "}
                  /{" "}
                  {
                    dailyGoalMinutes /
                    60
                  }
                  h
                </h2>

                <p>
                  Keep stacking focused
                  minutes today.
                </p>

              </div>

              <div className="progress-v3-goal-percent">

                <Target
                  size={18}
                />

                <strong>
                  {
                    dailyGoalPercent
                  }
                  %
                </strong>

              </div>

            </div>

            <div className="progress-v3-goal-track">

              <div
                style={{
                  width:
                    `${dailyGoalPercent}%`,
                }}
              />

            </div>

          </section>

          {/* =================================================
              CHART + TASKS
          ================================================= */}

          <section className="progress-v3-main-grid">

            {/* 7 DAY STUDY CHART */}

            <div className="dashboard-card progress-v3-chart-card">

              <div className="progress-v3-section-header">

                <div>

                  <span className="progress-v3-eyebrow">
                    FOCUS ACTIVITY
                  </span>

                  <h2>
                    Last 7 Days
                  </h2>

                </div>

                <span className="progress-v3-week-total">

                  <Clock3
                    size={15}
                  />

                  {formatStudyTime(
                    weekStudySeconds
                  )}

                </span>

              </div>

              <div className="progress-v3-chart">

                {weekActivity.map(
                  (day) => {

                    const height =
                      day.studyMinutes <=
                      0
                        ? 4
                        : Math.max(
                            12,
                            (day.studyMinutes /
                              maxStudyMinutes) *
                              100
                          );

                    const today =
                      isSameDay(
                        day.date,
                        new Date()
                      );

                    return (
                      <div
                        className="progress-v3-chart-column"
                        key={
                          day.key
                        }
                      >

                        <span className="progress-v3-chart-value">

                          {day.studyMinutes >=
                          60
                            ? `${(
                                day.studyMinutes /
                                60
                              ).toFixed(
                                1
                              )}h`
                            : `${Math.round(
                                day.studyMinutes
                              )}m`}

                        </span>

                        <div className="progress-v3-chart-track">

                          <div
                            className={`progress-v3-chart-bar ${
                              today
                                ? "today"
                                : ""
                            }`}
                            style={{
                              height:
                                `${height}%`,
                            }}
                          />

                        </div>

                        <strong
                          className={
                            today
                              ? "today"
                              : ""
                          }
                        >
                          {
                            day.label
                          }
                        </strong>

                        <small>
                          {
                            day.tasksCompleted
                          }{" "}
                          tasks
                        </small>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

            {/* TASK OVERVIEW */}

            <div className="dashboard-card progress-v3-task-card">

              <span className="progress-v3-eyebrow">
                TASKS
              </span>

              <h2>
                Completion
              </h2>

              <div className="progress-v3-big-rate">

                <strong>
                  {
                    completionRate
                  }
                  %
                </strong>

                <span>
                  overall
                </span>

              </div>

              <div className="progress-v3-task-track">

                <div
                  style={{
                    width:
                      `${completionRate}%`,
                  }}
                />

              </div>

              <div className="progress-v3-task-breakdown">

                <div>

                  <span>
                    Total
                  </span>

                  <strong>
                    {
                      totalTasks
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    Completed
                  </span>

                  <strong>
                    {
                      completedCount
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    Pending
                  </span>

                  <strong>
                    {
                      pendingCount
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    Today
                  </span>

                  <strong>
                    {
                      completedToday
                    }
                  </strong>

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              INSIGHTS
          ================================================= */}

          <section className="progress-v3-insights">

            <div className="progress-v3-insight">

              <Timer
                size={19}
              />

              <div>

                <span>
                  Sessions
                </span>

                <strong>
                  {
                    validSessions.length
                  }
                </strong>

                <small>
                  total focus blocks
                </small>

              </div>

            </div>

            <div className="progress-v3-insight">

              <Trophy
                size={19}
              />

              <div>

                <span>
                  Longest Session
                </span>

                <strong>
                  {longestSession
                    ? formatStudyTime(
                        longestSession.durationSeconds
                      )
                    : "—"}
                </strong>

                <small>
                  {longestSession
                    ? longestSession.subjectName ||
                      "General Study"
                    : "No sessions yet"}
                </small>

              </div>

            </div>

            <div className="progress-v3-insight">

              <Activity
                size={19}
              />

              <div>

                <span>
                  Average Session
                </span>

                <strong>
                  {formatStudyTime(
                    averageSessionSeconds
                  )}
                </strong>

                <small>
                  per focus block
                </small>

              </div>

            </div>

            <div className="progress-v3-insight">

              <BarChart3
                size={19}
              />

              <div>

                <span>
                  Active Days
                </span>

                <strong>
                  {
                    activeStudyDays
                  }
                </strong>

                <small>
                  days studied
                </small>

              </div>

            </div>

          </section>

          {/* =================================================
              SUBJECTS + RECENT
          ================================================= */}

          <section className="progress-v3-bottom-grid">

            {/* SUBJECT BREAKDOWN */}

            <div className="dashboard-card">

              <div className="progress-v3-section-header">

                <div>

                  <span className="progress-v3-eyebrow">
                    SUBJECTS
                  </span>

                  <h2>
                    Study Distribution
                  </h2>

                </div>

                {topSubject && (
                  <span className="progress-v3-top-subject">

                    <BookOpen
                      size={14}
                    />

                    {
                      topSubject.name
                    }

                  </span>
                )}

              </div>

              {subjectBreakdown.length ===
              0 ? (

                <div className="progress-v3-empty">

                  <BookOpen
                    size={26}
                  />

                  <strong>
                    No subject data yet
                  </strong>

                  <p>
                    Complete Focus
                    sessions to build
                    your subject
                    breakdown.
                  </p>

                </div>

              ) : (

                <div className="progress-v3-subject-list">

                  {subjectBreakdown.map(
                    (subject) => {

                      const percent =
                        totalStudySeconds >
                        0
                          ? Math.round(
                              (subject.seconds /
                                totalStudySeconds) *
                                100
                            )
                          : 0;

                      return (
                        <div
                          className="progress-v3-subject-item"
                          key={
                            subject.name
                          }
                        >

                          <div className="progress-v3-subject-top">

                            <div>

                              <strong>
                                {
                                  subject.name
                                }
                              </strong>

                              <span>
                                {
                                  subject.sessions
                                }{" "}
                                {subject.sessions ===
                                1
                                  ? "session"
                                  : "sessions"}
                              </span>

                            </div>

                            <div>

                              <strong>
                                {formatStudyTime(
                                  subject.seconds
                                )}
                              </strong>

                              <span>
                                {
                                  percent
                                }
                                %
                              </span>

                            </div>

                          </div>

                          <div className="progress-v3-subject-track">

                            <div
                              style={{
                                width:
                                  `${percent}%`,
                              }}
                            />

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

            {/* RECENT SESSIONS */}

            <div className="dashboard-card">

              <div className="progress-v3-section-header">

                <div>

                  <span className="progress-v3-eyebrow">
                    RECENT
                  </span>

                  <h2>
                    Focus Sessions
                  </h2>

                </div>

              </div>

              {recentSessions.length ===
              0 ? (

                <div className="progress-v3-empty">

                  <Timer
                    size={26}
                  />

                  <strong>
                    No sessions yet
                  </strong>

                  <p>
                    Start studying from
                    the Focus page.
                  </p>

                </div>

              ) : (

                <div className="progress-v3-recent-list">

                  {recentSessions.map(
                    (session) => (

                      <div
                        className="progress-v3-recent"
                        key={
                          session._id
                        }
                      >

                        <div className="progress-v3-recent-icon">

                          <BookOpen
                            size={16}
                          />

                        </div>

                        <div className="progress-v3-recent-content">

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

                        <strong className="progress-v3-recent-duration">

                          {formatStudyTime(
                            session.durationSeconds
                          )}

                        </strong>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </section>

          {/* =================================================
              INSIGHT MESSAGE
          ================================================= */}

          <section className="progress-v3-motivation">

            <div className="progress-v3-motivation-icon">
              {
                insight.icon
              }
            </div>

            <div>

              <span className="progress-v3-eyebrow">
                STUDYOS INSIGHT
              </span>

              <h2>
                {
                  insight.title
                }
              </h2>

              <p>
                {
                  insight.text
                }
              </p>

            </div>

          </section>

          {/* SMALL WEEK INFO */}

          <div className="progress-v3-footnote">

            <span>
              This week:{" "}
              <strong>
                {
                  weekTasksCompleted
                }
              </strong>{" "}
              completed tasks
            </span>

            <span>
              ·
            </span>

            <span>
              Total focused:{" "}
              <strong>
                {formatStudyTime(
                  totalStudySeconds
                )}
              </strong>
            </span>

          </div>

        </>
      )}

    </div>
  );
}

export default Progress;