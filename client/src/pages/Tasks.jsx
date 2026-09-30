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

import "../styles/tasks-v2.css";


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
    value: "all",
    label: "All priorities",
  },
  {
    value: "high",
    label: "High priority",
  },
  {
    value: "medium",
    label: "Medium priority",
  },
  {
    value: "low",
    label: "Low priority",
  },
];


const normalizePriority = (
  priority
) => {
  if (
    priority === "high" ||
    priority === "low"
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

  return String(value);
};


const getDateKey = (
  value
) => {
  if (!value) {
    return "";
  }

  try {
    return new Date(value)
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
        now.getMonth() + 1
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
  // FETCH
  // =======================================================

  const fetchPageData =
    async () => {
      try {
        setLoading(true);

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
        setLoading(false);
      }
    };


  useEffect(() => {
    fetchPageData();
  }, [
    isGuest,
  ]);


  // =======================================================
  // SUBJECT
  // =======================================================

  const getSubjectById =
    (
      subjectId
    ) => {
      const id =
        getSubjectId(
          subjectId
        );

      if (!id) {
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
  // ADD
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
                  ).toISOString()
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
            String(id)
        );

      if (!task) {
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
  // UPDATE
  // =======================================================

  const updateTask =
    async (
      id,
      updates
    ) => {
      try {
        setError("");

        let updatedTask;

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
                String(id)
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

          if (
            updates.priority !==
            undefined
          ) {
            nextUpdates.priority =
              normalizePriority(
                updates.priority
              );
          }

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

          if (
            updates.dueDate !==
            undefined
          ) {
            nextUpdates.dueDate =
              updates.dueDate
                ? new Date(
                    updates.dueDate
                  ).toISOString()
                : null;

            if (
              !updates.dueDate
            ) {
              nextUpdates.dueTime =
                "";
            }
          }

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
        } else {
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
  // DELETE
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
                String(id)
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
  // OPTIONS
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
              "#737373",
          })
        ),
      ],
      [
        subjects,
      ]
    );


  // =======================================================
  // FILTERING
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
          if (
            first.completed !==
            second.completed
          ) {
            return first.completed
              ? 1
              : -1;
          }

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
    <div className="v2t-page">

      {/* HEADER */}

      <header className="v2t-header">

        <div>

          <span className="v2t-eyebrow">
            Plan
          </span>

          <h1>
            Tasks
          </h1>

          <p>
            Organize your work,
            prioritize what matters,
            and stay ahead of deadlines.
          </p>

        </div>

      </header>


      {/* STATS */}

      <section className="v2t-stats">

        <TaskStat
          icon={
            <ListTodo
              size={18}
            />
          }
          label="Pending"
          value={
            stats.pending
          }
          description={
            stats.pending ===
            1
              ? "Task remaining"
              : "Tasks remaining"
          }
        />

        <TaskStat
          icon={
            <CalendarClock
              size={18}
            />
          }
          label="Due today"
          value={
            stats.dueToday
          }
          description="Needs attention today"
        />

        <TaskStat
          icon={
            <AlertTriangle
              size={18}
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

        <TaskStat
          icon={
            <CheckCircle2
              size={18}
            />
          }
          label="Completed"
          value={
            stats.completed
          }
          description={`${stats.total} total tasks`}
        />

      </section>


      {/* WORKSPACE */}

      <section className="v2t-workspace">

        <div className="v2t-workspace-header">

          <div>

            <span className="v2t-eyebrow">
              Planner
            </span>

            <h2>
              Your tasks
            </h2>

          </div>

          <span className="v2t-result-count">
            {filteredTasks.length}{" "}
            {filteredTasks.length ===
            1
              ? "task"
              : "tasks"}
          </span>

        </div>


        {/* ADD */}

        <AddTask
          onAdd={
            addTask
          }
          subjects={
            subjects
          }
        />


        {/* TABS */}

        <div className="v2t-tabs">

          <button
            type="button"
            className={
              activeView ===
              "all"
                ? "is-active"
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
                ? "is-active"
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
              <span>
                {stats.dueToday}
              </span>
            )}
          </button>

          <button
            type="button"
            className={
              activeView ===
              "upcoming"
                ? "is-active"
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
                ? "is-active"
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


        {/* FILTERS */}

        <div className="v2t-filters">

          <label className="v2t-search">

            <Search
              size={16}
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
            className="v2t-select"
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
            className="v2t-select"
            ariaLabel="Filter by subject"
          />

          {filtersActive && (
            <button
              type="button"
              className="v2t-clear"
              onClick={
                clearFilters
              }
            >
              Clear
            </button>
          )}

        </div>


        {/* ERROR */}

        {error && (
          <div
            className="v2t-error"
            role="alert"
          >
            <AlertTriangle
              size={15}
            />

            {error}
          </div>
        )}


        {/* LIST */}

        <div className="v2t-list">

          {loading ? (

            <div className="v2t-empty">

              <span className="v2t-loading-line" />
              <span className="v2t-loading-line is-short" />

              <p>
                Loading tasks...
              </p>

            </div>

          ) : filteredTasks.length ===
            0 ? (

            <div className="v2t-empty">

              <ListTodo
                size={26}
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
                  : "Try another filter or clear the current search."}
              </p>

              {tasks.length >
                0 &&
                filtersActive && (
                  <button
                    type="button"
                    className="v2t-clear"
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
// STAT
// =========================================================

function TaskStat({
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="v2t-stat">

      <div className="v2t-stat-heading">

        <span className="v2t-stat-icon">
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

    </article>
  );
}


export default Tasks;