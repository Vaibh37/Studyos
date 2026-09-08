import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Flame,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import StatCard from "../components/StatCard";
import AddTask from "../components/AddTask";

import { useAuth } from "../context/AuthContext";
import apiRequest from "../services/api";

import {
  createLocalId,
  localDb,
} from "../services/localDb";

import {
  getCalendarEvents,
} from "../services/calendarData";

function Dashboard() {
  const {
    isGuest,
  } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);

  const [loadingTasks, setLoadingTasks] =
    useState(true);

  const [loadingEvents, setLoadingEvents] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [name, setName] = useState(
    localStorage
      .getItem("studyos_name")
      ?.trim() || ""
  );

  // =========================================================
  // DATE HELPERS
  // =========================================================

  const startOfDay = (date) => {
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
    const copy = new Date(date);

    copy.setDate(
      copy.getDate() - amount
    );

    return startOfDay(copy);
  };

  const getDateKey = (date) => {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const isSameDay = (a, b) => {
    return (
      getDateKey(a) ===
      getDateKey(b)
    );
  };

  // =========================================================
  // SAFE EVENT DATE
  // =========================================================

  const parseEventDate = (
    value
  ) => {
    if (!value) {
      return null;
    }

    /*
      Mongo may return:
      2026-09-08T00:00:00.000Z

      Or Calendar may send:
      2026-09-08

      We want the calendar DAY,
      not timezone weirdness.
    */

    if (
      typeof value === "string"
    ) {
      const match =
        value.match(
          /^(\d{4})-(\d{2})-(\d{2})/
        );

      if (match) {
        const year =
          Number(match[1]);

        const month =
          Number(match[2]);

        const day =
          Number(match[3]);

        return new Date(
          year,
          month - 1,
          day
        );
      }
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

    return startOfDay(date);
  };

  // =========================================================
  // GREETING
  // =========================================================

  const getGreeting = () => {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  };

  // =========================================================
  // FETCH TASKS
  // =========================================================

  const fetchTasks =
    async () => {
      try {
        setLoadingTasks(true);

        let data;

        if (isGuest) {
          data =
            await localDb.getAll(
              "tasks"
            );

          data = [
            ...data,
          ].sort(
            (a, b) =>
              new Date(
                b.createdAt || 0
              ) -
              new Date(
                a.createdAt || 0
              )
          );
        } else {
          data =
            await apiRequest(
              "/api/tasks"
            );
        }

        setTasks(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to fetch tasks:",
          error
        );

        setTasks([]);
      } finally {
        setLoadingTasks(false);
      }
    };

  // =========================================================
  // FETCH EVENTS
  // =========================================================

  const fetchEvents =
    async () => {
      try {
        setLoadingEvents(true);

        const data =
          await getCalendarEvents(
            isGuest
          );

        setEvents(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to fetch events:",
          error
        );

        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };

  // =========================================================
  // INITIAL / ACCOUNT MODE LOAD
  // =========================================================

  useEffect(() => {
    fetchTasks();
    fetchEvents();
  }, [isGuest]);

  // =========================================================
  // LIVE TASK / CALENDAR SYNC
  // =========================================================

  useEffect(() => {
    const handleTasksUpdated =
      () => {
        fetchTasks();
      };

    const handleEventsUpdated =
      () => {
        fetchEvents();
      };

    window.addEventListener(
      "studyos-tasks-updated",
      handleTasksUpdated
    );

    window.addEventListener(
      "studyos-events-updated",
      handleEventsUpdated
    );

    return () => {
      window.removeEventListener(
        "studyos-tasks-updated",
        handleTasksUpdated
      );

      window.removeEventListener(
        "studyos-events-updated",
        handleEventsUpdated
      );
    };
  }, [isGuest]);

  // =========================================================
  // LIVE NAME UPDATE
  // =========================================================

  useEffect(() => {
    const updateName = () => {
      const savedName =
        localStorage
          .getItem(
            "studyos_name"
          )
          ?.trim() || "";

      setName(savedName);
    };

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
  }, []);

  // =========================================================
  // REFRESH DASHBOARD
  // =========================================================

  const refreshDashboard =
    async () => {
      try {
        setRefreshing(true);

        await Promise.all([
          fetchTasks(),
          fetchEvents(),
        ]);
      } finally {
        setRefreshing(false);
      }
    };

  // =========================================================
  // ADD TASK
  // =========================================================

  const addTask =
    async (title) => {
      const cleanTitle =
        String(
          title || ""
        ).trim();

      if (!cleanTitle) {
        return;
      }

      try {
        let newTask;

        if (isGuest) {
          const now =
            new Date()
              .toISOString();

          newTask = {
            _id:
              createLocalId(),

            title:
              cleanTitle,

            completed:
              false,

            completedAt:
              null,

            createdAt:
              now,

            updatedAt:
              now,
          };

          await localDb.put(
            "tasks",
            newTask
          );
        } else {
          newTask =
            await apiRequest(
              "/api/tasks",
              {
                method:
                  "POST",

                body:
                  JSON.stringify({
                    title:
                      cleanTitle,
                  }),
              }
            );
        }

        setTasks(
          (currentTasks) => [
            newTask,
            ...currentTasks,
          ]
        );

        window.dispatchEvent(
          new Event(
            "studyos-tasks-updated"
          )
        );
      } catch (error) {
        console.error(
          "Failed to add task:",
          error
        );
      }
    };

  // =========================================================
  // TOGGLE TASK
  // =========================================================

  const toggleTask =
    async (id) => {
      const task =
        tasks.find(
          (item) =>
            item._id === id
        );

      if (!task) {
        return;
      }

      const nextCompleted =
        !task.completed;

      try {
        let updatedTask;

        if (isGuest) {
          const now =
            new Date()
              .toISOString();

          updatedTask = {
            ...task,

            completed:
              nextCompleted,

            completedAt:
              nextCompleted
                ? task.completedAt ||
                  now
                : null,

            updatedAt:
              now,
          };

          await localDb.put(
            "tasks",
            updatedTask
          );
        } else {
          updatedTask =
            await apiRequest(
              `/api/tasks/${id}`,
              {
                method:
                  "PATCH",

                body:
                  JSON.stringify({
                    completed:
                      nextCompleted,
                  }),
              }
            );
        }

        setTasks(
          (currentTasks) =>
            currentTasks.map(
              (item) =>
                item._id ===
                updatedTask._id
                  ? updatedTask
                  : item
            )
        );

        window.dispatchEvent(
          new Event(
            "studyos-tasks-updated"
          )
        );
      } catch (error) {
        console.error(
          "Failed to toggle task:",
          error
        );
      }
    };

  // =========================================================
  // DELETE TASK
  // =========================================================

  const deleteTask =
    async (id) => {
      try {
        if (isGuest) {
          await localDb.remove(
            "tasks",
            id
          );
        } else {
          await apiRequest(
            `/api/tasks/${id}`,
            {
              method:
                "DELETE",
            }
          );
        }

        setTasks(
          (currentTasks) =>
            currentTasks.filter(
              (task) =>
                task._id !== id
            )
        );

        window.dispatchEvent(
          new Event(
            "studyos-tasks-updated"
          )
        );
      } catch (error) {
        console.error(
          "Failed to delete task:",
          error
        );
      }
    };

  // =========================================================
  // TASK STATS
  // =========================================================

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed === true
    );

  const completedCount =
    completedTasks.length;

  const pendingCount =
    tasks.length -
    completedCount;

  const completionRate =
    tasks.length > 0
      ? Math.round(
          (completedCount /
            tasks.length) *
            100
        )
      : 0;

  // =========================================================
  // COMPLETION HISTORY
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

  // =========================================================
  // COMPLETED TODAY
  // =========================================================

  const completedToday =
    useMemo(() => {
      const today =
        new Date();

      return timestampedTasks.filter(
        (task) =>
          isSameDay(
            new Date(
              task.completedAt
            ),
            today
          )
      ).length;
    }, [timestampedTasks]);

  // =========================================================
  // LAST 7 DAYS
  // =========================================================

  const weeklyActivity =
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

        const count =
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
          date,
          count,

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
    }, [timestampedTasks]);

  const weeklyCompleted =
    weeklyActivity.reduce(
      (total, day) =>
        total + day.count,
      0
    );

  const maxWeekValue =
    Math.max(
      ...weeklyActivity.map(
        (day) =>
          day.count
      ),
      1
    );

  // =========================================================
  // REAL STREAK
  // =========================================================

  const currentStreak =
    useMemo(() => {
      const activeDates =
        new Set();

      timestampedTasks.forEach(
        (task) => {
          activeDates.add(
            getDateKey(
              new Date(
                task.completedAt
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
        Nothing completed today yet?

        Yesterday may still be the
        current streak.
      */

      if (
        !activeDates.has(
          getDateKey(cursor)
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
          getDateKey(cursor)
        )
      ) {
        streak++;

        cursor =
          subtractDays(
            cursor,
            1
          );
      }

      return streak;
    }, [timestampedTasks]);

  // =========================================================
  // UPCOMING EVENTS
  // =========================================================

  const upcomingEvents =
    useMemo(() => {
      const today =
        startOfDay(
          new Date()
        );

      return events
        .map((event) => ({
          ...event,

          parsedDate:
            parseEventDate(
              event.date
            ),
        }))
        .filter(
          (event) =>
            event.parsedDate &&
            event.parsedDate >=
              today
        )
        .sort(
          (a, b) =>
            a.parsedDate -
            b.parsedDate
        )
        .slice(0, 5);
    }, [events]);

  // =========================================================
  // EVENT DATE LABEL
  // =========================================================

  const formatEventDate = (
    date
  ) => {
    if (!date) {
      return "Unknown date";
    }

    const today =
      startOfDay(
        new Date()
      );

    const target =
      startOfDay(date);

    const difference =
      Math.round(
        (target - today) /
          (1000 *
            60 *
            60 *
            24)
      );

    if (difference === 0) {
      return "Today";
    }

    if (difference === 1) {
      return "Tomorrow";
    }

    if (
      difference > 1 &&
      difference < 7
    ) {
      return date.toLocaleDateString(
        "en-IN",
        {
          weekday:
            "long",
        }
      );
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
  // UI
  // =========================================================

  return (
    <div className="dashboard dashboard-v2">

      {/* HEADER */}

      <header className="dashboard-header dashboard-v2-header">

        <div>

          <h1>
            {name
              ? `${getGreeting()}, ${name} 👋`
              : `${getGreeting()} 👋`}
          </h1>

          <p>
            Here's what's happening
            with your studies today.
          </p>

        </div>

        <button
          type="button"
          className="dashboard-v2-refresh"
          disabled={
            refreshing
          }
          onClick={
            refreshDashboard
          }
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "dashboard-v2-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </header>

      {/* =====================================================
          REAL STATS
      ===================================================== */}

      <section className="stats-grid">

        <StatCard
          label="Completed Today"
          value={completedToday}
          description={
            completedToday === 1
              ? "1 task finished today"
              : `${completedToday} tasks finished today`
          }
        />

        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          description={
            `${completedCount} of ${tasks.length} completed`
          }
        />

        <StatCard
          label="Study Streak"
          value={`${currentStreak} 🔥`}
          description={
            currentStreak === 1
              ? "1 active day"
              : `${currentStreak} consecutive days`
          }
        />

      </section>

      {/* =====================================================
          QUICK SUMMARY
      ===================================================== */}

      <section className="dashboard-v2-summary-grid">

        <div className="dashboard-v2-summary-card">

          <div className="dashboard-v2-summary-icon">
            <CheckCircle2
              size={19}
            />
          </div>

          <div>
            <span>
              Pending
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>

        </div>

        <div className="dashboard-v2-summary-card">

          <div className="dashboard-v2-summary-icon">
            <TrendingUp
              size={19}
            />
          </div>

          <div>
            <span>
              Last 7 Days
            </span>

            <strong>
              {weeklyCompleted}
            </strong>
          </div>

        </div>

        <div className="dashboard-v2-summary-card">

          <div className="dashboard-v2-summary-icon">
            <CalendarDays
              size={19}
            />
          </div>

          <div>
            <span>
              Upcoming
            </span>

            <strong>
              {
                upcomingEvents.length
              }
            </strong>
          </div>

        </div>

        <div className="dashboard-v2-summary-card">

          <div className="dashboard-v2-summary-icon">
            <Flame
              size={19}
            />
          </div>

          <div>
            <span>
              Current Streak
            </span>

            <strong>
              {currentStreak}
            </strong>
          </div>

        </div>

      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <section className="dashboard-grid">

        {/* TODAY TASKS */}

        <div className="dashboard-card">

          <div className="card-header">

            <div>
              <h2>
                Today's Tasks
              </h2>

              <span className="dashboard-v2-card-subtitle">
                Keep the momentum
                moving.
              </span>
            </div>

            <span className="task-count">
              {tasks.length}{" "}
              {tasks.length ===
              1
                ? "task"
                : "tasks"}
            </span>

          </div>

          <AddTask
            onAdd={addTask}
          />

          <div className="task-list">

            {loadingTasks ? (

              <p>
                Loading tasks...
              </p>

            ) : tasks.length ===
              0 ? (

              <div className="dashboard-v2-empty">

                <CheckCircle2
                  size={26}
                />

                <strong>
                  Nothing on the list
                </strong>

                <span>
                  Add your first study
                  task above.
                </span>

              </div>

            ) : (

              tasks
                .slice(0, 6)
                .map((task) => (

                  <div
                    className={`task ${
                      task.completed
                        ? "completed"
                        : ""
                    }`}
                    key={
                      task._id
                    }
                  >

                    <input
                      type="checkbox"
                      checked={Boolean(
                        task.completed
                      )}
                      onChange={() =>
                        toggleTask(
                          task._id
                        )
                      }
                      aria-label={
                        task.completed
                          ? `Mark ${task.title} as incomplete`
                          : `Mark ${task.title} as complete`
                      }
                    />

                    <span className="task-title">
                      {task.title}
                    </span>

                    <button
                      type="button"
                      className="task-action delete-task"
                      onClick={() =>
                        deleteTask(
                          task._id
                        )
                      }
                      aria-label={`Delete ${task.title}`}
                    >
                      ×
                    </button>

                  </div>

                ))

            )}

            {tasks.length >
              6 && (
              <div className="dashboard-v2-more">
                +{" "}
                {tasks.length -
                  6}{" "}
                more tasks in Tasks
              </div>
            )}

          </div>

        </div>

        {/* UPCOMING EVENTS */}

        <div className="dashboard-card">

          <div className="card-header">

            <div>
              <h2>
                Upcoming
              </h2>

              <span className="dashboard-v2-card-subtitle">
                Your nearest
                deadlines and events.
              </span>
            </div>

            <span className="task-count">
              {
                upcomingEvents.length
              }{" "}
              {upcomingEvents.length ===
              1
                ? "event"
                : "events"}
            </span>

          </div>

          <div className="upcoming-list">

            {loadingEvents ? (

              <p>
                Loading events...
              </p>

            ) : upcomingEvents.length ===
              0 ? (

              <div className="dashboard-v2-empty">

                <CalendarDays
                  size={26}
                />

                <strong>
                  Nothing upcoming
                </strong>

                <span>
                  Add an exam,
                  assignment or study
                  event from Calendar.
                </span>

              </div>

            ) : (

              upcomingEvents.map(
                (event) => (

                  <div
                    className="upcoming-item dashboard-v2-event"
                    key={
                      event._id
                    }
                  >

                    <div className="dashboard-v2-event-date">

                      <strong>
                        {event.parsedDate.getDate()}
                      </strong>

                      <span>
                        {event.parsedDate.toLocaleDateString(
                          "en-IN",
                          {
                            month:
                              "short",
                          }
                        )}
                      </span>

                    </div>

                    <div className="dashboard-v2-event-content">

                      <strong>
                        {
                          event.title
                        }
                      </strong>

                      <span>
                        {formatEventDate(
                          event.parsedDate
                        )}{" "}
                        ·{" "}
                        {event.type}
                      </span>

                    </div>

                  </div>

                )
              )

            )}

          </div>

        </div>

      </section>

      {/* =====================================================
          WEEK ACTIVITY
      ===================================================== */}

      <section className="dashboard-card dashboard-v2-week-card">

        <div className="dashboard-v2-week-header">

          <div>

            <span className="dashboard-v2-eyebrow">
              ACTIVITY
            </span>

            <h2>
              Last 7 days
            </h2>

            <p>
              Tasks completed each
              day.
            </p>

          </div>

          <div className="dashboard-v2-week-total">

            <TrendingUp
              size={17}
            />

            <strong>
              {weeklyCompleted}
            </strong>

            <span>
              completed
            </span>

          </div>

        </div>

        <div className="dashboard-v2-week-chart">

          {weeklyActivity.map(
            (day) => {

              const height =
                day.count === 0
                  ? 5
                  : Math.max(
                      18,
                      (day.count /
                        maxWeekValue) *
                        100
                    );

              const today =
                isSameDay(
                  day.date,
                  new Date()
                );

              return (
                <div
                  className="dashboard-v2-week-column"
                  key={
                    getDateKey(
                      day.date
                    )
                  }
                >

                  <span className="dashboard-v2-week-value">
                    {
                      day.count
                    }
                  </span>

                  <div className="dashboard-v2-week-track">

                    <div
                      className={`dashboard-v2-week-bar ${
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

                  <span
                    className={`dashboard-v2-week-label ${
                      today
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

      </section>

    </div>
  );
}

export default Dashboard;