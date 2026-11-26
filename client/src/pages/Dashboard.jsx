import { WorkspaceSkeleton, SkeletonBlock } from "../components/WorkspaceStates";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  Play,
  Plus,
  RefreshCw,
  Target,
  Zap,
} from "../components/icons";

import { useAuth } from "../context/AuthContext";
import { readStudyData } from "../services/api";
import { localDb } from "../services/localDb";
import { getCalendarEvents } from "../services/calendarData";
import { getStudySessions } from "../services/studySessionData";
import { calculateGamification } from "../services/gamification";
import "../styles/dashboard-clean.css";

const dateKey = (input) => {
  if (!input) return "";

  if (
    typeof input === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(input)
  ) {
    return input;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (safe > 0 && safe < 60) return `${safe}s`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getDailyGoal = () => {
  const hours = Number(
    localStorage.getItem("studyos_study_goal")
  );

  return Number.isFinite(hours) && hours > 0
    ? Math.round(hours * 60)
    : 120;
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const priorityOrder = {
  high: 0,
  medium: 1,
  low: 2,
};

function Dashboard() {
  const { isGuest, firebaseUser } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);

  const [dailyGoal, setDailyGoal] = useState(getDailyGoal);

  const [name, setName] = useState(
    () =>
      localStorage.getItem("studyos_name") ||
      firebaseUser?.displayName ||
      ""
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // LOAD DATA

  const loadDashboard = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const tasksPromise = isGuest
          ? localDb.getAll("tasks")
          : readStudyData("/api/tasks", { fresh: manual });
        const [taskData, sessionData, eventData] = await Promise.all([
          tasksPromise,
          getStudySessions(isGuest, { cache: true, fresh: manual }),
          getCalendarEvents(isGuest, { cache: true, fresh: manual, tasksPromise }),
        ]);

        setTasks(
          Array.isArray(taskData) ? taskData : []
        );

        setSessions(
          Array.isArray(sessionData) ? sessionData : []
        );

        setCalendarItems(
          Array.isArray(eventData) ? eventData : []
        );

        setDailyGoal(getDailyGoal());
      } catch (cause) {
        console.error("Dashboard load failed:", cause);

        setError(
          cause?.message ||
            "Could not load your dashboard. Please retry."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isGuest]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // PROFILE NAME

  useEffect(() => {
    const updateName = () => {
      setName(
        localStorage.getItem("studyos_name") ||
          firebaseUser?.displayName ||
          ""
      );
    };

    updateName();

    window.addEventListener(
      "studyos-name-updated",
      updateName
    );

    return () => {
      window.removeEventListener(
        "studyos-name-updated",
        updateName
      );
    };
  }, [firebaseUser?.displayName]);

  // DATA REFRESH EVENTS

  useEffect(() => {
    const events = [
      "studyos-tasks-updated",
      "studyos-events-updated",
      "studyos-sessions-updated",
      "studyos-preferences-updated",
      "studyos-focus-settings-updated",
    ];

    const refresh = () => loadDashboard();

    events.forEach((event) => {
      window.addEventListener(event, refresh);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, refresh);
      });
    };
  }, [loadDashboard]);

  // PROGRESS

  const today = dateKey(new Date());

  const stats = useMemo(
    () =>
      calculateGamification({
        sessions,
        tasks,
        referenceDate: new Date(),
      }),
    [sessions, tasks]
  );

  const todaySessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          dateKey(
            session.startedAt ||
              session.endedAt ||
              session.createdAt
          ) === today
      ),
    [sessions, today]
  );

  const focusedSeconds = todaySessions.reduce(
    (sum, session) =>
      sum + (Number(session.durationSeconds) || 0),
    0
  );

  const focusedMinutes = Math.floor(focusedSeconds / 60);

  const goalPercent =
    dailyGoal > 0
      ? Math.min(
          100,
          Math.round((focusedMinutes / dailyGoal) * 100)
        )
      : 0;

  const remainingMinutes = Math.max(
    0,
    dailyGoal - focusedMinutes
  );

  // TASKS

  const pendingTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks]
  );

  const completedToday = tasks.filter(
    (task) =>
      task.completed &&
      dateKey(task.completedAt) === today
  ).length;

  const todayTasks = useMemo(
    () =>
      pendingTasks
        .filter(
          (task) =>
            !task.dueDate ||
            dateKey(task.dueDate) <= today
        )
        .sort((a, b) => {
          const firstDate = dateKey(a.dueDate);
          const secondDate = dateKey(b.dueDate);

          if (
            firstDate &&
            secondDate &&
            firstDate !== secondDate
          ) {
            return firstDate.localeCompare(secondDate);
          }

          if (firstDate !== secondDate) {
            return firstDate ? -1 : 1;
          }

          return (
            (priorityOrder[a.priority] ?? 1) -
            (priorityOrder[b.priority] ?? 1)
          );
        }),
    [pendingTasks, today]
  );

  // CALENDAR

  const upcoming = useMemo(
    () =>
      calendarItems
        .filter(
          (event) => dateKey(event.date) >= today
        )
        .sort((a, b) =>
          String(a.date).localeCompare(String(b.date))
        ),
    [calendarItems, today]
  );

  const todayLabel = new Date().toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );

  const number = (value) =>
    Number(value || 0).toLocaleString("en-IN");

  const ready = !loading && !error;

  const overview = [
    {
      label: "Daily focus",
      value: formatDuration(focusedSeconds),
      to: "/app/focus",
    },
    {
      label: "Pending tasks",
      value: number(pendingTasks.length),
      to: "/app/tasks",
    },
    {
      label: "Weekly XP",
      value: number(stats.weeklyXp),
      to: "/app/leaderboard",
    },
    {
      label: "Current level",
      value: number(stats.level),
      to: "/app/progress",
    },
  ];

  return (
    <div className="ds-clean" aria-busy={loading}>

      {/* HEADER */}

      <header className="ds-header">

        <div className="ds-heading">

          <p className="ds-date">
            {todayLabel}
          </p>

          <h1>
            {getGreeting()}
            {name ? `, ${name}` : ""}.
          </h1>

        </div>

        <div className="ds-header-actions">

          <button
            type="button"
            className="ds-button ds-refresh"
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
            onClick={() => loadDashboard(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "ds-spin" : ""}
            />
          </button>

          <Link
            to="/app/focus"
            className="ds-button ds-primary"
          >
            <Play size={15} weight="fill" />
            Start focus
          </Link>

        </div>

      </header>


      {/* ERROR */}

      {error && (
        <div className="ds-error" role="alert">
          {error}
        </div>
      )}


      {/* OVERVIEW */}

      <section
        className="ds-overview"
        aria-label="Study overview"
      >

        {overview.map(item => (

          <Link
            key={item.label}
            to={item.to}
            className="ds-metric"
          >

            <span>{item.label}</span>

            <strong>
              {loading ? <SkeletonBlock width={56} height={26} /> : ready ? item.value : "—"}
            </strong>

          </Link>

        ))}

      </section>


      {/* PROGRESS */}

      <section
        className="ds-progress-grid"
        aria-label="Study progress"
      >

        {/* DAILY GOAL */}

        <article className="ds-progress-card">

          <div className="ds-section-heading">

            <h2>
              <Target size={17} />
              Daily study goal
            </h2>

            <strong className="ds-percentage">
              {ready ? `${goalPercent}%` : "—"}
            </strong>

          </div>

          <div className="ds-progress-values">

            <strong>
              {ready
                ? formatDuration(focusedSeconds)
                : "—"}
            </strong>

            <span>
              of {dailyGoal} min
            </span>

          </div>

          <div
            className="ds-track"
            role="progressbar"
            aria-label="Daily study goal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              ready ? goalPercent : undefined
            }
          >

            <span
              style={{
                width: `${ready ? goalPercent : 0}%`,
              }}
            />

          </div>

          <div className="ds-progress-footer">

            <span>
              {!ready
                ? "—"
                : goalPercent === 100
                  ? "Daily goal complete"
                  : `${remainingMinutes} min remaining`}
            </span>

            <Link
              to="/app/settings"
              className="ds-text-link"
            >
              Edit goal
              <ArrowRight size={14} />
            </Link>

          </div>

        </article>


        {/* LEVEL PROGRESS */}

        <article className="ds-progress-card">

          <div className="ds-section-heading">

            <h2>
              <Zap size={17} />
              Level progress
            </h2>

            <Link
              to="/app/progress"
              className="ds-text-link"
              aria-label="View progress details"
            >
              <ArrowRight size={17} />
            </Link>

          </div>

          <div className="ds-progress-values">

            <strong>
              {ready
                ? `Level ${stats.level}`
                : "—"}
            </strong>

            {ready && (
              <span>{stats.title}</span>
            )}

          </div>

          <div
            className="ds-track"
            role="progressbar"
            aria-label="Level progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              ready ? stats.progress : undefined
            }
          >

            <span
              style={{
                width: `${ready ? stats.progress : 0}%`,
              }}
            />

          </div>

          <div className="ds-progress-footer">

            <span>

              {ready
                ? `${number(stats.xpIntoLevel)} / ${number(stats.xpRequiredForLevel)} XP`
                : "—"}

            </span>

            <span
              className="ds-study-streak"
              title="Consecutive days with qualifying Focus sessions"
            >
              <Flame size={15} />

              {ready
                ? `${stats.streak}d study streak`
                : "—"}

            </span>

          </div>

          <div className="ds-total-xp">

            {ready
              ? `${number(stats.totalXp)} total XP`
              : "—"}

          </div>

        </article>

      </section>


      {/* STUDY WORKSPACE */}

      <section
        className="ds-workspace"
        aria-label="Study plan"
      >

        {/* TASKS */}

        <article className="ds-task-panel">

          <div className="ds-panel-heading">

            <h2>

              Your tasks

              <span className="ds-count">
                {ready ? todayTasks.length : "—"}
              </span>

            </h2>

            <Link
              to="/app/tasks"
              className="ds-text-link"
            >
              All tasks
              <ArrowRight size={15} />
            </Link>

          </div>

          <p className="ds-panel-description">
            Due today, overdue and unscheduled tasks.
          </p>

          {loading ? (
            <WorkspaceSkeleton label="tasks" count={3} />
          ) : error ? (

            <p className="ds-placeholder">
              Tasks temporarily unavailable.
            </p>

          ) : todayTasks.length === 0 ? (

            <div className="ds-empty">

              <CheckCircle2 size={22} />

              <div>

                <strong>You're all caught up</strong>

                <p>No tasks need your attention.</p>

              </div>

              <Link
                to="/app/tasks"
                className="ds-text-link"
              >
                <Plus size={16} />
                Add task
              </Link>

            </div>

          ) : (

            <ul className="ds-list">

              {todayTasks.slice(0, 5).map(
                (task, index) => {

                  const isOverdue =
                    Boolean(task.dueDate) &&
                    dateKey(task.dueDate) < today;

                  const isDueToday =
                    dateKey(task.dueDate) === today;

                  return (

                    <li
                      key={task._id || task.id || index}
                      className="ds-task-row"
                    >

                      <span
                        className={`ds-task-dot ${
                          isOverdue ? "is-overdue" : ""
                        }`}
                        aria-hidden="true"
                      />

                      <div className="ds-item-copy">

                        <strong>
                          {task.title}
                        </strong>

                        <span>
                          {task.subjectName || "General"}
                        </span>

                      </div>

                      {isOverdue ? (

                        <span className="ds-overdue">
                          Overdue
                        </span>

                      ) : isDueToday ? (

                        <span className="ds-today">
                          Today
                        </span>

                      ) : null}

                    </li>

                  );

                }
              )}

            </ul>

          )}

          {ready && (

            <div className="ds-task-footer">

              <span>

                <CheckCircle2 size={15} />

                {completedToday} completed today

              </span>

              {todayTasks.length > 5 && (

                <Link
                  to="/app/tasks"
                  className="ds-text-link"
                >
                  View {todayTasks.length - 5} more
                  <ArrowRight size={14} />
                </Link>

              )}

            </div>

          )}

        </article>


        {/* RIGHT COLUMN */}

        <div className="ds-right-column">

          {/* UPCOMING EVENTS */}

          <article className="ds-upcoming">

            <div className="ds-panel-heading">

              <h2>

                Upcoming

                <span className="ds-count">
                  {ready ? upcoming.length : "—"}
                </span>

              </h2>

              <Link
                to="/app/calendar"
                className="ds-text-link"
              >
                Calendar
                <ArrowRight size={15} />
              </Link>

            </div>

            {loading ? (
              <WorkspaceSkeleton label="calendar events" count={2} />
            ) : error ? (

              <p className="ds-placeholder">
                Calendar temporarily unavailable.
              </p>

            ) : upcoming.length === 0 ? (

              <div className="ds-empty ds-calendar-empty">

                <CalendarDays size={22} />

                <div>

                  <strong>No upcoming events</strong>

                  <p>Your schedule is clear.</p>

                </div>

              </div>

            ) : (

              <ul className="ds-list">

                {upcoming.slice(0, 4).map(
                  (event, index) => (

                    <li
                      className="ds-event-row"
                      key={event._id || event.id || index}
                    >

                      <CalendarDays size={17} />

                      <div className="ds-item-copy">

                        <strong>{event.title}</strong>

                        <span>

                          {new Date(
                            `${dateKey(event.date)}T00:00:00`
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}

                          {event.subjectName
                            ? ` · ${event.subjectName}`
                            : ""}

                        </span>

                      </div>

                      {dateKey(event.date) === today && (

                        <span className="ds-today">
                          Today
                        </span>

                      )}

                    </li>

                  )
                )}

              </ul>

            )}

            <div className="ds-upcoming-footer">

              <Link
                to="/app/calendar"
                className="ds-text-link"
              >
                <Plus size={16} />
                Add event
              </Link>

              {ready && upcoming.length > 4 && (

                <Link
                  to="/app/calendar"
                  className="ds-text-link"
                >
                  View {upcoming.length - 4} more
                </Link>

              )}

            </div>

          </article>


          {/* QUICK ACCESS */}

          <article className="ds-quick-access">

            <div className="ds-panel-heading">
              <h2>Quick access</h2>
            </div>

            <nav aria-label="Quick access">

              <Link to="/app/notes">

                <span>
                  <Plus size={16} />
                  Notes
                </span>

                <ArrowRight size={15} />

              </Link>

              <Link to="/app/tasks">

                <span>
                  <CheckCircle2 size={16} />
                  Manage tasks
                </span>

                <ArrowRight size={15} />

              </Link>

              <Link to="/app/progress">

                <span>
                  <Target size={16} />
                  View progress
                </span>

                <ArrowRight size={15} />

              </Link>

            </nav>

          </article>

        </div>

      </section>

    </div>
  );
}

export default Dashboard;