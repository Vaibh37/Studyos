
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
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import apiRequest from "../services/api";
import { localDb } from "../services/localDb";
import { getCalendarEvents } from "../services/calendarData";
import { getStudySessions } from "../services/studySessionData";
import { calculateGamification } from "../services/gamification";
import "../styles/dashboard-professional.css";

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
        const [taskData, sessionData, eventData] =
          await Promise.all([
            isGuest
              ? localDb.getAll("tasks")
              : apiRequest("/api/tasks"),

            getStudySessions(isGuest),
            getCalendarEvents(isGuest),
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

  return (
    <div className="sdb" aria-busy={loading}>
      {/* HEADER */}

      <header className="sdb-header">
        <div>
          <p className="sdb-kicker">
            Dashboard
            <span aria-hidden="true">/</span>
            {todayLabel}
          </p>

          <h1>
            {getGreeting()}
            {name ? `, ${name}` : ""}.
          </h1>

          <p className="sdb-header-subtitle">
            Your study plan for today, all in one place.
          </p>
        </div>

        <button
          type="button"
          className="sdb-button sdb-button--secondary"
          onClick={() => loadDashboard(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "sdb-spinning" : ""}
          />
          Refresh
        </button>
      </header>

      {error && (
        <div className="sdb-error" role="alert">
          {error}
        </div>
      )}

      {/* DAILY OVERVIEW */}

      <section
        className="sdb-overview"
        aria-label="Today's study summary"
      >
        <article className="sdb-card sdb-focus">
          <div className="sdb-card-label">
            <Target size={18} />
            Daily focus
          </div>

          <div className="sdb-focus-main">
            <div className="sdb-focus-value">
              <strong>
                {loading
                  ? "—"
                  : formatDuration(focusedSeconds)}
              </strong>

              <span>of {dailyGoal} min goal</span>
            </div>

            <Link
              to="/app/focus"
              className="sdb-button sdb-button--primary"
            >
              <Play size={16} fill="currentColor" />
              Start focus
            </Link>
          </div>

          <div
            className="sdb-progress"
            role="progressbar"
            aria-label="Daily focus progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goalPercent}
          >
            <span
              style={{ width: `${goalPercent}%` }}
            />
          </div>

          <div className="sdb-progress-caption">
            <span>
              {goalPercent === 100
                ? "Daily goal complete"
                : `${remainingMinutes} min remaining`}
            </span>

            <strong>{goalPercent}%</strong>
          </div>
        </article>

        {/* LEVEL */}

        <article className="sdb-card sdb-level">
          <div className="sdb-level-heading">
            <div>
              <div className="sdb-card-label">
                <Zap size={18} />
                Level progress
              </div>

              <h2>
                Level {stats.level}
                <span>{stats.title}</span>
              </h2>
            </div>

            <Link
              className="sdb-icon-button"
              to="/app/progress"
              aria-label="Open progress details"
            >
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="sdb-level-caption">
            <span>
              {number(stats.xpIntoLevel)} /{" "}
              {number(stats.xpRequiredForLevel)} XP
            </span>

            <span>
              {number(stats.totalXp)} total XP
            </span>
          </div>

          <div
            className="sdb-progress"
            role="progressbar"
            aria-label="Level progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stats.progress}
          >
            <span
              style={{ width: `${stats.progress}%` }}
            />
          </div>

          <div className="sdb-level-meta">
            <span className="sdb-streak">
              <Flame size={16} />
              <strong>{stats.streak}d</strong>
              streak
            </span>

            <span className="sdb-weekly">
              <Zap size={16} />
              {number(stats.weeklyXp)} XP this week
            </span>
          </div>
        </article>
      </section>

      {/* TASKS AND CALENDAR */}

      <section
        className="sdb-work"
        aria-label="Study plan"
      >
        {/* TASKS */}

        <article className="sdb-card sdb-panel">
          <div className="sdb-panel-header">
            <div className="sdb-panel-title">
              <h2>Today's tasks</h2>
              <span className="sdb-counter">
                {todayTasks.length}
              </span>
            </div>

            <Link
              to="/app/tasks"
              className="sdb-link"
            >
              All tasks
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <p className="sdb-placeholder">
              Loading tasks…
            </p>
          ) : todayTasks.length === 0 ? (
            <div className="sdb-empty">
              <CheckCircle2 size={22} />

              <div>
                <strong>You're all caught up</strong>
                <p>
                  Nothing needs your attention today.
                </p>
              </div>

              <Link
                to="/app/tasks"
                className="sdb-inline-action"
              >
                <Plus size={16} />
                Add task
              </Link>
            </div>
          ) : (
            <ul className="sdb-list">
              {todayTasks.slice(0, 4).map(
                (task, index) => {
                  const isOverdue =
                    dateKey(task.dueDate) < today &&
                    Boolean(task.dueDate);

                  return (
                    <li
                      className="sdb-task"
                      key={task._id || index}
                    >
                      <span
                        className="sdb-task-dot"
                        aria-hidden="true"
                      />

                      <div className="sdb-item-text">
                        <strong>{task.title}</strong>
                        <span>
                          {task.subjectName || "General"}
                          {task.dueDate
                            ? ` · ${
                                isOverdue
                                  ? "Overdue"
                                  : "Due today"
                              }`
                            : ""}
                        </span>
                      </div>

                      {isOverdue && (
                        <span className="sdb-overdue">
                          Overdue
                        </span>
                      )}
                    </li>
                  );
                }
              )}
            </ul>
          )}

          {(todayTasks.length > 4 ||
            completedToday > 0) && (
            <div className="sdb-panel-footer">
              <span>
                {completedToday} completed today
              </span>

              {todayTasks.length > 4 && (
                <Link to="/app/tasks">
                  View {todayTasks.length - 4} more
                </Link>
              )}
            </div>
          )}
        </article>

        {/* UPCOMING */}

        <article className="sdb-card sdb-panel">
          <div className="sdb-panel-header">
            <div className="sdb-panel-title">
              <h2>Upcoming</h2>
              <span className="sdb-counter">
                {upcoming.length}
              </span>
            </div>

            <Link
              to="/app/calendar"
              className="sdb-link"
            >
              Calendar
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <p className="sdb-placeholder">
              Loading calendar…
            </p>
          ) : upcoming.length === 0 ? (
            <div className="sdb-empty">
              <CalendarDays size={22} />

              <div>
                <strong>No upcoming events</strong>
                <p>
                  Your schedule is clear for now.
                </p>
              </div>

              <Link
                to="/app/calendar"
                className="sdb-inline-action"
              >
                <Plus size={16} />
                Add event
              </Link>
            </div>
          ) : (
            <ul className="sdb-list">
              {upcoming.slice(0, 4).map(
                (event, index) => (
                  <li
                    className="sdb-task"
                    key={event._id || index}
                  >
                    <span className="sdb-calendar-icon">
                      <CalendarDays size={17} />
                    </span>

                    <div className="sdb-item-text">
                      <strong>{event.title}</strong>
                      <span>
                        {new Date(
                          event.date
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
                      <span className="sdb-today">
                        Today
                      </span>
                    )}
                  </li>
                )
              )}
            </ul>
          )}

          {upcoming.length > 4 && (
            <div className="sdb-panel-footer">
              <span />
              <Link to="/app/calendar">
                View {upcoming.length - 4} more
              </Link>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default Dashboard;
