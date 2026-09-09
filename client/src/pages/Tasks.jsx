import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Search,
} from "lucide-react";

import AddTask from "../components/AddTask";
import TaskItem from "../components/TaskItem";
import StudySelect from "../components/StudySelect";

import apiRequest from "../services/api";

import {
  createLocalId,
  localDb,
} from "../services/localDb";

import {
  useAuth,
} from "../context/AuthContext";

import "./Tasks.selects.css";

// =========================================================
// HELPERS
// =========================================================

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
};

const PRIORITY_FILTER_OPTIONS = [
  {
    value:
      "all",

    label:
      "All priorities",
  },

  {
    value:
      "high",

    label:
      "High priority",
  },

  {
    value:
      "medium",

    label:
      "Medium priority",
  },

  {
    value:
      "low",

    label:
      "Low priority",
  },
];

const normalizePriority = (
  priority
) => {
  if (
    priority ===
      "high" ||
    priority ===
      "low"
  ) {
    return priority;
  }

  return "medium";
};

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

const getDateKey = (
  value
) => {
  if (!value) {
    return "";
  }

  try {
    return new Date(
      value
    )
      .toISOString()
      .slice(
        0,
        10
      );
  } catch {
    return "";
  }
};

const getTodayKey =
  () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() +
          1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
  };

const normalizeTaskPayload = (
  value
) => {
  if (
    typeof value ===
    "string"
  ) {
    return {
      title:
        value.trim(),

      subjectId:
        "",

      priority:
        "medium",

      dueDate:
        "",

      dueTime:
        "",
    };
  }

  return {
    title:
      String(
        value?.title ||
          ""
      ).trim(),

    subjectId:
      getSubjectId(
        value?.subjectId
      ),

    priority:
      normalizePriority(
        value?.priority
      ),

    dueDate:
      value?.dueDate ||
      "",

    dueTime:
      value?.dueTime ||
      "",
  };
};

// =========================================================
// TASKS
// =========================================================

function Tasks() {
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
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  // =======================================================
  // FILTERS
  // =======================================================

  const [
    activeView,
    setActiveView,
  ] = useState(
    "all"
  );

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState(
    "all"
  );

  const [
    subjectFilter,
    setSubjectFilter,
  ] = useState(
    "all"
  );

  // =======================================================
  // FETCH PAGE DATA
  // =======================================================

  const fetchPageData =
    async () => {
      try {
        setLoading(
          true
        );

        setError("");

        let taskData = [];
        let subjectData = [];

        if (
          isGuest
        ) {
          [
            taskData,
            subjectData,
          ] =
            await Promise.all([
              localDb.getAll(
                "tasks"
              ),

              localDb.getAll(
                "subjects"
              ),
            ]);
        } else {
          [
            taskData,
            subjectData,
          ] =
            await Promise.all([
              apiRequest(
                "/api/tasks"
              ),

              apiRequest(
                "/api/subjects"
              ),
            ]);
        }

        const normalizedTasks =
          Array.isArray(
            taskData
          )
            ? taskData.map(
                (
                  task
                ) => ({
                  ...task,

                  priority:
                    normalizePriority(
                      task.priority
                    ),

                  subjectId:
                    getSubjectId(
                      task.subjectId
                    ) ||
                    null,

                  subjectName:
                    task.subjectName ||
                    "",

                  dueDate:
                    task.dueDate ||
                    null,

                  dueTime:
                    task.dueTime ||
                    "",
                })
              )
            : [];

        setTasks(
          normalizedTasks
        );

        setSubjects(
          Array.isArray(
            subjectData
          )
            ? subjectData
            : []
        );
      } catch (
        fetchError
      ) {
        console.error(
          "Failed to load tasks:",
          fetchError
        );

        setError(
          fetchError?.message ||
            "Could not load your tasks."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  // =======================================================
  // LOAD
  // =======================================================

  useEffect(() => {
    fetchPageData();
  }, [
    isGuest,
  ]);

  // =======================================================
  // SUBJECT HELPER
  // =======================================================

  const getSubjectById =
    (
      subjectId
    ) => {
      const id =
        getSubjectId(
          subjectId
        );

      if (
        !id
      ) {
        return null;
      }

      return (
        subjects.find(
          (
            subject
          ) =>
            String(
              subject._id
            ) ===
            id
        ) ||
        null
      );
    };

  // =======================================================
  // ADD TASK
  // =======================================================

  const addTask =
    async (
      input
    ) => {
      const payload =
        normalizeTaskPayload(
          input
        );

      if (
        !payload.title
      ) {
        return null;
      }

      try {
        setError("");

        let newTask;

        // =================================================
        // GUEST
        // =================================================

        if (
          isGuest
        ) {
          const timestamp =
            new Date()
              .toISOString();

          const subject =
            getSubjectById(
              payload.subjectId
            );

          newTask = {
            _id:
              createLocalId(),

            title:
              payload.title,

            subjectId:
              subject?._id ||
              null,

            subjectName:
              subject?.name ||
              "",

            priority:
              payload.priority,

            dueDate:
              payload.dueDate
                ? new Date(
                    payload.dueDate
                  )
                    .toISOString()
                : null,

            dueTime:
              payload.dueDate
                ? payload.dueTime
                : "",

            completed:
              false,

            completedAt:
              null,

            createdAt:
              timestamp,

            updatedAt:
              timestamp,
          };

          await localDb.put(
            "tasks",
            newTask
          );
        }

        // =================================================
        // ACCOUNT
        // =================================================

        else {
          newTask =
            await apiRequest(
              "/api/tasks",
              {
                method:
                  "POST",

                body:
                  JSON.stringify({
                    title:
                      payload.title,

                    subjectId:
                      payload.subjectId ||
                      null,

                    priority:
                      payload.priority,

                    dueDate:
                      payload.dueDate ||
                      null,

                    dueTime:
                      payload.dueTime ||
                      "",
                  }),
              }
            );
        }

        setTasks(
          (
            current
          ) => [
            newTask,
            ...current,
          ]
        );

        window.dispatchEvent(
          new Event(
            "studyos-tasks-updated"
          )
        );

        return newTask;
      } catch (
        addError
      ) {
        console.error(
          "Failed to add task:",
          addError
        );

        setError(
          addError?.message ||
            "Could not create task."
        );

        throw addError;
      }
    };

  // =======================================================
  // TOGGLE
  // =======================================================

  const toggleTask =
    async (
      id
    ) => {
      const task =
        tasks.find(
          (
            item
          ) =>
            String(
              item._id
            ) ===
            String(
              id
            )
        );

      if (
        !task
      ) {
        return;
      }

      try {
        setError("");

        let updatedTask;

        const nextCompleted =
          !task.completed;

        if (
          isGuest
        ) {
          updatedTask = {
            ...task,

            completed:
              nextCompleted,

            completedAt:
              nextCompleted
                ? new Date()
                    .toISOString()
                : null,

            updatedAt:
              new Date()
                .toISOString(),
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
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                String(
                  item._id
                ) ===
                String(
                  updatedTask._id
                )
                  ? updatedTask
                  : item
            )
        );

        window.dispatchEvent(
          new Event(
            "studyos-tasks-updated"
          )
        );
      } catch (
        toggleError
      ) {
        console.error(
          "Failed to toggle task:",
          toggleError
        );

        setError(
          toggleError?.message ||
            "Could not update task."
        );
      }
    };

  // =======================================================
  // UPDATE TASK
  // =======================================================

  const updateTask =
    async (
      id,
      updates
    ) => {
      try {
        setError("");

        let updatedTask;

        // =================================================
        // GUEST
        // =================================================

        if (
          isGuest
        ) {
          const existing =
            tasks.find(
              (
                task
              ) =>
                String(
                  task._id
                ) ===
                String(
                  id
                )
            );

          if (
            !existing
          ) {
            throw new Error(
              "Task not found"
            );
          }

          const nextUpdates = {
            ...updates,
          };

          // TITLE

          if (
            updates.title !==
            undefined
          ) {
            const cleanTitle =
              String(
                updates.title
              ).trim();

            if (
              !cleanTitle
            ) {
              throw new Error(
                "Task title cannot be empty"
              );
            }

            nextUpdates.title =
              cleanTitle;
          }

          // PRIORITY

          if (
            updates.priority !==
            undefined
          ) {
            nextUpdates.priority =
              normalizePriority(
                updates.priority
              );
          }

          // SUBJECT

          if (
            updates.subjectId !==
            undefined
          ) {
            const subject =
              getSubjectById(
                updates.subjectId
              );

            nextUpdates.subjectId =
              subject?._id ||
              null;

            nextUpdates.subjectName =
              subject?.name ||
              "";
          }

          // DUE DATE

          if (
            updates.dueDate !==
            undefined
          ) {
            nextUpdates.dueDate =
              updates.dueDate
                ? new Date(
                    updates.dueDate
                  )
                    .toISOString()
                : null;

            if (
              !updates.dueDate
            ) {
              nextUpdates.dueTime =
                "";
            }
          }

          // DUE TIME

          if (
            updates.dueTime !==
            undefined
          ) {
            nextUpdates.dueTime =
              nextUpdates.dueDate ||
              existing.dueDate
                ? updates.dueTime
                : "";
          }

          // COMPLETION

          if (
            updates.completed !==
            undefined
          ) {
            nextUpdates.completedAt =
              updates.completed
                ? existing.completedAt ||
                  new Date()
                    .toISOString()
                : null;
          }

          updatedTask = {
            ...existing,
            ...nextUpdates,

            _id:
              existing._id,

            updatedAt:
              new Date()
                .toISOString(),
          };

          await localDb.put(
            "tasks",
            updatedTask
          );
        }

        // =================================================
        // ACCOUNT
        // =================================================

        else {
          updatedTask =
            await apiRequest(
              `/api/tasks/${id}`,
              {
                method:
                  "PATCH",

                body:
                  JSON.stringify(
                    updates
                  ),
              }
            );
        }

        setTasks(
          (
            current
          ) =>
            current.map(
              (
                task
              ) =>
                String(
                  task._id
                ) ===
                String(
                  updatedTask._id
                )
                  ? updatedTask
                  : task
            )
        );

        window.dispatchEvent(
          new Event(
            "studyos-tasks-updated"
          )
        );

        return updatedTask;
      } catch (
        updateError
      ) {
        console.error(
          "Failed to update task:",
          updateError
        );

        setError(
          updateError?.message ||
            "Could not update task."
        );

        throw updateError;
      }
    };

  // =======================================================
  // DELETE TASK
  // =======================================================

  const deleteTask =
    async (
      id
    ) => {
      try {
        setError("");

        if (
          isGuest
        ) {
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
          (
            current
          ) =>
            current.filter(
              (
                task
              ) =>
                String(
                  task._id
                ) !==
                String(
                  id
                )
            )
        );

        window.dispatchEvent(
          new Event(
            "studyos-tasks-updated"
          )
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Failed to delete task:",
          deleteError
        );

        setError(
          deleteError?.message ||
            "Could not delete task."
        );

        throw deleteError;
      }
    };

  // =======================================================
  // STATS
  // =======================================================

  const todayKey =
    getTodayKey();

  const stats =
    useMemo(() => {
      const completed =
        tasks.filter(
          (
            task
          ) =>
            task.completed
        ).length;

      const pending =
        tasks.length -
        completed;

      const dueToday =
        tasks.filter(
          (
            task
          ) =>
            !task.completed &&
            getDateKey(
              task.dueDate
            ) ===
              todayKey
        ).length;

      const overdue =
        tasks.filter(
          (
            task
          ) => {
            if (
              task.completed ||
              !task.dueDate
            ) {
              return false;
            }

            return (
              getDateKey(
                task.dueDate
              ) <
              todayKey
            );
          }
        ).length;

      return {
        total:
          tasks.length,

        pending,

        completed,

        dueToday,

        overdue,
      };
    }, [
      tasks,
      todayKey,
    ]);

  // =======================================================
  // FILTER OPTIONS
  // =======================================================

  const subjectFilterOptions =
    useMemo(
      () => [
        {
          value:
            "all",

          label:
            "All subjects",
        },

        ...subjects.map(
          (
            subject
          ) => ({
            value:
              subject._id,

            label:
              subject.name,

            description:
              subject.code ||
              "Subject",

            color:
              subject.color ||
              "#6366f1",
          })
        ),
      ],
      [
        subjects,
      ]
    );

  // =======================================================
  // FILTER TASKS
  // =======================================================

  const filteredTasks =
    useMemo(() => {
      const cleanSearch =
        searchQuery
          .trim()
          .toLowerCase();

      const filtered =
        tasks.filter(
          (
            task
          ) => {
            // SEARCH

            if (
              cleanSearch &&
              !String(
                task.title ||
                  ""
              )
                .toLowerCase()
                .includes(
                  cleanSearch
                )
            ) {
              return false;
            }

            // PRIORITY

            if (
              priorityFilter !==
                "all" &&
              normalizePriority(
                task.priority
              ) !==
                priorityFilter
            ) {
              return false;
            }

            // SUBJECT

            if (
              subjectFilter !==
              "all"
            ) {
              if (
                getSubjectId(
                  task.subjectId
                ) !==
                String(
                  subjectFilter
                )
              ) {
                return false;
              }
            }

            // VIEW

            const taskDate =
              getDateKey(
                task.dueDate
              );

            if (
              activeView ===
              "today"
            ) {
              return (
                !task.completed &&
                taskDate ===
                  todayKey
              );
            }

            if (
              activeView ===
              "upcoming"
            ) {
              return (
                !task.completed &&
                Boolean(
                  taskDate
                ) &&
                taskDate >
                  todayKey
              );
            }

            if (
              activeView ===
              "completed"
            ) {
              return Boolean(
                task.completed
              );
            }

            return true;
          }
        );

      return [
        ...filtered,
      ].sort(
        (
          first,
          second
        ) => {
          // Completed last

          if (
            first.completed !==
            second.completed
          ) {
            return first.completed
              ? 1
              : -1;
          }

          // Due date

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

          // Priority

          const priorityDifference =
            PRIORITY_ORDER[
              normalizePriority(
                first.priority
              )
            ] -
            PRIORITY_ORDER[
              normalizePriority(
                second.priority
              )
            ];

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference;
          }

          // Newest first

          return (
            new Date(
              second.createdAt ||
                0
            ) -
            new Date(
              first.createdAt ||
                0
            )
          );
        }
      );
    }, [
      tasks,
      searchQuery,
      priorityFilter,
      subjectFilter,
      activeView,
      todayKey,
    ]);

  // =======================================================
  // CLEAR FILTERS
  // =======================================================

  const clearFilters =
    () => {
      setSearchQuery("");

      setPriorityFilter(
        "all"
      );

      setSubjectFilter(
        "all"
      );

      setActiveView(
        "all"
      );
    };

  const filtersActive =
    Boolean(
      searchQuery.trim()
    ) ||
    priorityFilter !==
      "all" ||
    subjectFilter !==
      "all" ||
    activeView !==
      "all";

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="dashboard tasks-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="dashboard-header">

        <div>

          <span className="page-eyebrow">
            Study planning
          </span>

          <h1>
            Tasks
          </h1>

          <p>
            Plan what matters,
            prioritize your work,
            and keep deadlines
            under control.
          </p>

        </div>

      </header>

      {/* ===================================================
          STATS
      =================================================== */}

      <section className="stats-grid tasks-stats-grid">

        <StatBox
          icon={
            <ListTodo
              size={19}
            />
          }
          label="Pending"
          value={
            stats.pending
          }
          description={
            stats.pending ===
            1
              ? "Task left"
              : "Tasks left"
          }
        />

        <StatBox
          icon={
            <CalendarClock
              size={19}
            />
          }
          label="Due today"
          value={
            stats.dueToday
          }
          description="Needs attention today"
        />

        <StatBox
          icon={
            <AlertTriangle
              size={19}
            />
          }
          label="Overdue"
          value={
            stats.overdue
          }
          description={
            stats.overdue
              ? "Review these first"
              : "Nothing overdue"
          }
        />

        <StatBox
          icon={
            <CheckCircle2
              size={19}
            />
          }
          label="Completed"
          value={
            stats.completed
          }
          description={`${stats.total} total tasks`}
        />

      </section>

      {/* ===================================================
          MAIN CARD
      =================================================== */}

      <section className="dashboard-card tasks-main-card">

        <div className="card-header tasks-card-header">

          <div>

            <span className="page-eyebrow">
              Planner
            </span>

            <h2>
              Your tasks
            </h2>

          </div>

          <span className="tasks-result-count">

            {filteredTasks.length}
            {" "}

            {filteredTasks.length ===
            1
              ? "task"
              : "tasks"}

          </span>

        </div>

        {/* =================================================
            ADD TASK
        ================================================= */}

        <AddTask
          onAdd={
            addTask
          }
          subjects={
            subjects
          }
        />

        {/* =================================================
            VIEW TABS
        ================================================= */}

        <div className="task-view-tabs">

          <button
            type="button"
            className={
              activeView ===
              "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveView(
                "all"
              )
            }
          >
            All
          </button>

          <button
            type="button"
            className={
              activeView ===
              "today"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveView(
                "today"
              )
            }
          >

            Today

            {stats.dueToday >
              0 && (
              <span className="task-tab-count">
                {stats.dueToday}
              </span>
            )}

          </button>

          <button
            type="button"
            className={
              activeView ===
              "upcoming"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveView(
                "upcoming"
              )
            }
          >
            Upcoming
          </button>

          <button
            type="button"
            className={
              activeView ===
              "completed"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveView(
                "completed"
              )
            }
          >
            Completed
          </button>

        </div>

        {/* =================================================
            FILTER BAR
        ================================================= */}

        <div className="task-filter-bar">

          <label className="task-search-field">

            <Search
              size={17}
            />

            <input
              type="search"
              value={
                searchQuery
              }
              onChange={(
                event
              ) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search tasks..."
            />

          </label>

          <StudySelect
            value={
              priorityFilter
            }
            onChange={
              setPriorityFilter
            }
            options={
              PRIORITY_FILTER_OPTIONS
            }
            placeholder="All priorities"
            className="task-study-select task-filter-study-select"
            ariaLabel="Filter by priority"
          />

          <StudySelect
            value={
              subjectFilter
            }
            onChange={
              setSubjectFilter
            }
            options={
              subjectFilterOptions
            }
            placeholder="All subjects"
            className="task-study-select task-filter-study-select"
            ariaLabel="Filter by subject"
          />

          {filtersActive && (
            <button
              type="button"
              className="task-clear-filters"
              onClick={
                clearFilters
              }
            >
              Clear
            </button>
          )}

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className="task-error-message"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* =================================================
            TASK LIST
        ================================================= */}

        <div className="task-list">

          {loading ? (

            <div className="tasks-empty-state">

              <div className="tasks-loading-line" />

              <div className="tasks-loading-line short" />

              <span>
                Loading tasks...
              </span>

            </div>

          ) : filteredTasks.length ===
            0 ? (

            <div className="tasks-empty-state">

              <ListTodo
                size={28}
              />

              <h3>

                {tasks.length ===
                0
                  ? "No tasks yet"
                  : "Nothing matches this view"}

              </h3>

              <p>

                {tasks.length ===
                0
                  ? "Create your first task and start planning your study work."
                  : "Try another filter or clear your current search."}

              </p>

              {tasks.length >
                0 &&
                filtersActive && (
                  <button
                    type="button"
                    className="task-clear-filters"
                    onClick={
                      clearFilters
                    }
                  >
                    Clear filters
                  </button>
                )}

            </div>

          ) : (

            filteredTasks.map(
              (
                task
              ) => (
                <TaskItem
                  key={
                    task._id
                  }
                  task={
                    task
                  }
                  subjects={
                    subjects
                  }
                  onToggle={
                    toggleTask
                  }
                  onUpdate={
                    updateTask
                  }
                  onDelete={
                    deleteTask
                  }
                />
              )
            )

          )}

        </div>

      </section>

    </div>
  );
}

// =========================================================
// STAT BOX
// =========================================================

function StatBox({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="stat-card task-stat-card">

      <div className="task-stat-heading">

        <span className="task-stat-icon">
          {icon}
        </span>

        <span className="stat-label">
          {label}
        </span>

      </div>

      <strong>
        {value}
      </strong>

      <span className="stat-description">
        {description}
      </span>

    </div>
  );
}

export default Tasks;