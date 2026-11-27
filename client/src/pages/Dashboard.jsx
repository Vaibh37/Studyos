import { readProfileName } from "../services/profileName";
import { WorkspaceSkeleton, SkeletonBlock } from "../components/WorkspaceStates";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  FileText,
  ListChecks,
  CalendarDays,
  CheckCircle2,
  Flame,
  Play,
  Plus,
  RefreshCw,
} from "../components/icons";

import { useAuth } from "../context/AuthContext";
import apiRequest, { readDashboardData } from "../services/api";
import { createLocalId, localDb } from "../services/localDb";
import { getCalendarEvents } from "../services/calendarData";
import { getStudySessions } from "../services/studySessionData";
import { getDashboardWeek } from "../services/dashboardWeek";
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
      readProfileName(localStorage, firebaseUser, isGuest)
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const taskLock = useRef(false);
  const loadSequence = useRef(0);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);

  async function saveTask(task, title) {
    if (taskLock.current || loading || refreshing) return;
    const id = task?._id || task?.id;
    if (task && !id) return;
    taskLock.current = true;
    setSavingTask(true);
    setTaskError("");
    try {
      const timestamp = new Date().toISOString();
      const payload = task
        ? { completed: true }
        : { title, subjectId: null, priority: "medium", dueDate: null, dueTime: "" };
      const saved = isGuest
        ? await localDb.put("tasks", task
          ? { ...task, ...payload, completedAt: timestamp, updatedAt: timestamp }
          : { ...payload, _id: createLocalId(), subjectName: "", completed: false,
            completedAt: null, createdAt: timestamp, updatedAt: timestamp })
        : await apiRequest(task ? `/api/tasks/${encodeURIComponent(id)}` : "/api/tasks", {
          method: task ? "PATCH" : "POST", body: JSON.stringify(payload),
        });
      if (!saved?._id || (task && String(saved._id) !== String(id))) {
        throw new Error("Could not verify the saved task. Refresh your dashboard.");
      }
      setTasks(current => task
        ? current.map(item => String(item._id || item.id) === String(id) ? saved : item)
        : [saved, ...current]);
      if (!task) { setTaskTitle(""); setAddingTask(false); }
      window.dispatchEvent(new Event("studyos-tasks-updated"));
    } catch (cause) {
      setTaskError(cause?.message || "Could not save task. Please retry.");
    } finally {
      taskLock.current = false;
      setSavingTask(false);
    }
  }

  // LOAD DATA

  const loadDashboard = useCallback(
    async (manual = false, background = false) => {
      const sequence = ++loadSequence.current;
      if (manual) setRefreshing(true);
      else if (!background) setLoading(true);

      setError("");

      try {
        const bundle = isGuest ? null : readDashboardData({ fresh: manual });
        const tasksPromise = isGuest
          ? localDb.getAll("tasks")
          : bundle.then(data => data.tasks);
        const [taskData, sessionData, eventData] = await Promise.all([
          tasksPromise,
          isGuest ? getStudySessions(true) : bundle.then(data => data.sessions),
          getCalendarEvents(isGuest, { tasksPromise, eventsPromise: bundle?.then(data => data.events) }),
        ]);

        if (sequence !== loadSequence.current) return;

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
        if (sequence !== loadSequence.current) return;
        console.error("Dashboard load failed:", cause);

        setError(
          cause?.message ||
            "Could not load your dashboard. Please retry."
        );
      } finally {
        if (sequence === loadSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
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
        readProfileName(localStorage, firebaseUser, isGuest)
      );
    };

    updateName();

    window.addEventListener(
      "studyos-name-updated",
      updateName
    );

    window.addEventListener("storage", updateName);
    return () => {
      window.removeEventListener(
        "studyos-name-updated",
        updateName
      );
      window.removeEventListener("storage", updateName);
    };
  }, [firebaseUser?.uid, firebaseUser?.displayName, isGuest]);

  // DATA REFRESH EVENTS

  useEffect(() => {
    const events = [
      "studyos-tasks-updated",
      "studyos-events-updated",
      "studyos-sessions-updated",
      "studyos-preferences-updated",
      "studyos-focus-settings-updated",
    ];

    const refresh = () => loadDashboard(false, true);

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
          Math.floor((focusedMinutes / dailyGoal) * 100)
        )
      : 0;

  const remainingMinutes = Math.max(
    0,
    dailyGoal - focusedMinutes
  );

  const targetPercent = Math.round(focusedSeconds / (dailyGoal * 60) * 100);
  const goalReached = focusedMinutes >= dailyGoal;
  const week = useMemo(() => getDashboardWeek(sessions, new Date(`${today}T12:00:00`)), [sessions, today]);
  const activeDay = week.days.find(day => day.key === selectedDay) || week.days.find(day => day.key === today) || week.days[0];

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

  const disabled = !ready || savingTask || refreshing;
  const value = (content, width = 72, height = 20) => loading
    ? <SkeletonBlock width={width} height={height} />
    : ready ? content : "—";

  return (
    <div className="ds-clean" aria-busy={loading}>
      <header className="ds-header">
        <div className="ds-heading">
          <p className="ds-date">{todayLabel}</p>
          <h1>{getGreeting()}{name ? `, ${name}` : ""}.</h1>
        </div>
        <div id="studyos-dashboard-streak" className="ds-streak-slot" />
      </header>
      {error && <div className="ds-error" role="alert">{error}</div>}

      <div className="ds-dashboard-grid">
        <section className="ds-focus-panel" aria-labelledby="ds-focus-heading">
          <div className="ds-focus-header">
            <h2 id="ds-focus-heading">Today's focus</h2>
            <button type="button" className="ds-focus-refresh" aria-label="Refresh dashboard"
              title="Refresh dashboard" onClick={() => loadDashboard(true)} disabled={loading || refreshing || savingTask}>
              <RefreshCw size={17} className={refreshing ? "ds-spin" : ""} />
            </button>
          </div>
          <div className="ds-focus-summary">
            <strong className="ds-focus-value">{value(formatDuration(focusedSeconds), 112, 38)}</strong>
            {ready && <span className="ds-goal-status">
              {goalReached ? <><CheckCircle2 size={15} /> Goal achieved</> : `${remainingMinutes} min remaining`}
            </span>}
          </div>
          <div className="ds-track ds-focus-track" role="progressbar" aria-label="Daily study goal"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready ? goalPercent : undefined}>
            <span style={{ width: `${ready ? goalPercent : 0}%` }} />
          </div>
          <div className="ds-focus-meta">
            <Link to="/app/settings" className="ds-goal-link" aria-label="Edit daily goal">{formatDuration(dailyGoal * 60)} daily goal <ArrowUpRight size={12} /></Link>
            <span>{ready ? `${targetPercent}% of target` : "—"}</span>
          </div>
          <Link to="/app/focus" className="ds-focus-start"><Play size={16} weight="fill" /> Start focus <ArrowUpRight size={17} /></Link>
        </section>

        <section className="ds-task-panel" aria-labelledby="ds-task-heading">
          <div className="ds-panel-heading">
            <h2 id="ds-task-heading">Today's tasks <span className="ds-count">{ready ? todayTasks.length : "—"}</span></h2>
            <Link to="/app/tasks" className="ds-text-link">All tasks <ArrowUpRight size={15} /></Link>
          </div>
          {loading ? <WorkspaceSkeleton label="tasks" count={3} /> : error ?
            <p className="ds-placeholder">Tasks temporarily unavailable.</p> : todayTasks.length === 0 ?
              <div className="ds-empty"><CheckCircle2 size={22} /><div><strong>You're all caught up</strong><p>No tasks need your attention.</p></div></div> :
              <ul className="ds-list">
                {todayTasks.slice(0, 5).map((task, index) => {
                  const due = dateKey(task.dueDate);
                  return <li key={task._id || task.id || index} className="ds-task-row">
                    <button type="button" className="ds-task-check" disabled={disabled || !(task._id || task.id)}
                      aria-label={`Mark ${task.title} as complete`} onClick={() => saveTask(task)}><span><Check size={12} weight="bold" /></span></button>
                    <div className="ds-item-copy"><strong>{task.title}</strong><span>{task.subjectName || "General"}</span></div>
                    {due && due < today ? <span className="ds-overdue">Overdue</span> : due === today ? <span className="ds-today">Today</span> : null}
                  </li>;
                })}
              </ul>}
          {taskError && <p className="ds-task-error" role="alert">{taskError}</p>}
          {ready && <>
            <div className="ds-task-footer">
              <button type="button" className="ds-add-task" disabled={disabled} aria-expanded={addingTask} onClick={() => setAddingTask(open => !open)}><Plus size={16} /> Add task</button>
              <span aria-live="polite">{completedToday} completed today</span>
            </div>
            {addingTask && <form className="ds-task-form" onSubmit={event => { event.preventDefault(); if (taskTitle.trim()) saveTask(null, taskTitle.trim()); }}>
              <input autoFocus aria-label="New task title" placeholder="What do you need to do?" value={taskTitle} maxLength={200} required onChange={event => setTaskTitle(event.target.value)} />
              <button type="submit" disabled={disabled || !taskTitle.trim()} className="ds-form-submit">Add</button>
            </form>}
            {todayTasks.length > 5 && <Link to="/app/tasks" className="ds-text-link ds-view-more">View {todayTasks.length - 5} more <ArrowRight size={14} /></Link>}
            {pendingTasks.length > todayTasks.length && <Link to="/app/tasks" className="ds-text-link ds-view-more">{pendingTasks.length - todayTasks.length} upcoming tasks <ArrowRight size={14} /></Link>}
          </>}
        </section>

        <section className="ds-activity-panel" aria-labelledby="ds-activity-heading">
          <div className="ds-panel-heading"><h2 id="ds-activity-heading">Weekly activity</h2><span className="ds-text-link">This week</span></div>
          <div className="ds-activity-value" aria-live="polite"><strong>{value(formatDuration(activeDay.seconds))}</strong><span>{activeDay.label}{activeDay.key === today ? " · Today" : ""}</span></div>
          <div className="ds-chart" aria-label="Daily focus hours for this week">
            <div className="ds-chart-grid" aria-hidden="true"><span>{week.axisHours}h</span><span>{week.axisHours / 2}h</span><span>0h</span></div>
            <div className="ds-chart-bars" role="group" aria-label="Select a weekday">
              {week.days.map(day => <button key={day.key} type="button" className="ds-chart-day" disabled={!ready || day.key > today}
                aria-pressed={activeDay.key === day.key} aria-label={`${day.label}: ${ready ? formatDuration(day.seconds) : "unavailable"}`}
                onClick={() => setSelectedDay(day.key)}>
                <span className="ds-chart-column"><span className="ds-chart-fill" style={{height: `${ready ? (day.seconds / (week.axisHours * 3600)) * 100 : 0}%`}} /></span>
                <span className="ds-chart-label">{day.shortLabel}</span>
              </button>)}
            </div>
          </div>
        </section>

        <section className="ds-level-panel" aria-labelledby="ds-level-heading">
          <div className="ds-panel-heading"><h2 id="ds-level-heading">{ready ? `Level ${stats.level}` : "Level progress"} {ready && <span className="ds-level-title">{stats.title}</span>}</h2>
            <Link to="/app/progress" className="ds-text-link" aria-label="View progress details"><ArrowUpRight size={17} /></Link></div>
          <div className="ds-track" role="progressbar" aria-label="Level progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready ? stats.progress : undefined}>
            <span style={{ width: `${ready ? stats.progress : 0}%` }} /></div>
          <div className="ds-progress-footer"><span>{ready ? `${number(stats.xpIntoLevel)} / ${number(stats.xpRequiredForLevel)} XP` : "—"}</span><Link to="/app/leaderboard" className="ds-text-link">{ready ? `${number(stats.weeklyXp)} weekly XP` : "—"}</Link></div>
          <div className="ds-progress-footer"><span>{ready ? `${number(stats.totalXp)} total XP` : "—"}</span><span className="ds-study-streak" title="Consecutive days with qualifying Focus sessions"><Flame size={14} /> {ready ? `${stats.streak}d study streak` : "—"}</span></div>
        </section>

        <section className="ds-upcoming" aria-labelledby="ds-upcoming-heading">
          <div className="ds-panel-heading"><h2 id="ds-upcoming-heading">Upcoming <span className="ds-count">{ready ? upcoming.length : "—"}</span></h2><Link to="/app/calendar" className="ds-text-link">Calendar <ArrowUpRight size={15} /></Link></div>
          {loading ? <WorkspaceSkeleton label="calendar events" count={2} /> : error ? <p className="ds-placeholder">Calendar temporarily unavailable.</p> : upcoming.length === 0 ?
            <div className="ds-empty"><CalendarDays size={22} /><div><strong>No upcoming events</strong><p>Your schedule is clear.</p></div><Link to="/app/calendar" className="ds-text-link ds-event-add" aria-label="Add event"><Plus size={19} /></Link></div> :
            <><ul className="ds-list">{upcoming.slice(0, 4).map((event, index) => <li key={event._id || event.id || index} className="ds-event-row"><CalendarDays size={17} /><div className="ds-item-copy"><strong>{event.title}</strong><span>{new Date(`${dateKey(event.date)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{event.subjectName ? ` · ${event.subjectName}` : ""}</span></div>{dateKey(event.date) === today && <span className="ds-today">Today</span>}</li>)}</ul>
              <div className="ds-task-footer"><Link to="/app/calendar" className="ds-text-link"><Plus size={16} /> Add event</Link>{upcoming.length > 4 && <Link to="/app/calendar" className="ds-text-link">View {upcoming.length - 4} more</Link>}</div></>}
        </section>

        <nav className="ds-quick-access" aria-label="Quick access">
          <Link to="/app/notes"><FileText size={17} /> Notes</Link>
          <Link to="/app/tasks"><ListChecks size={17} /> Tasks</Link>
          <Link to="/app/progress"><BarChart3 size={17} /> Progress</Link>
        </nav>
      </div>
    </div>
  );
}

export default Dashboard;
