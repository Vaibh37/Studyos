import {
  useEffect,
  useState,
} from "react";

import AddTask from "../components/AddTask";
import TaskItem from "../components/TaskItem";

import apiRequest from "../services/api";

import {
  createLocalId,
  localDb,
} from "../services/localDb";

import {
  useAuth,
} from "../context/AuthContext";

function Tasks() {
  const {
    isGuest,
  } = useAuth();

  const [
    tasks,
    setTasks,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  // =========================================================
  // FETCH TASKS
  // =========================================================

  const fetchTasks =
    async () => {
      try {
        setLoading(true);

        let data;

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          data =
            await localDb.getAll(
              "tasks"
            );

          data =
            data.sort(
              (
                a,
                b
              ) =>
                new Date(
                  b.createdAt ||
                    0
                ) -
                new Date(
                  a.createdAt ||
                    0
                )
            );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
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
      } finally {
        setLoading(false);
      }
    };

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    fetchTasks();
  }, [isGuest]);

  // =========================================================
  // ADD TASK
  // =========================================================

  const addTask =
    async (title) => {
      try {
        let newTask;

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          const cleanTitle =
            String(
              title || ""
            ).trim();

          if (!cleanTitle) {
            return;
          }

          const timestamp =
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
              timestamp,

            updatedAt:
              timestamp,
          };

          await localDb.put(
            "tasks",
            newTask
          );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
          newTask =
            await apiRequest(
              "/api/tasks",
              {
                method:
                  "POST",

                body:
                  JSON.stringify({
                    title,
                  }),
              }
            );
        }

        setTasks(
          (
            currentTasks
          ) => [
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
            item._id ===
            id
        );

      if (!task) {
        return;
      }

      try {
        let updatedTask;

        const nextCompleted =
          !task.completed;

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
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
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
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
            currentTasks
          ) =>
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
  // UPDATE TASK
  // =========================================================

  const updateTask =
    async (
      id,
      updates
    ) => {
      try {
        let updatedTask;

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          const existing =
            tasks.find(
              (task) =>
                task._id ===
                id
            );

          if (!existing) {
            throw new Error(
              "Task not found"
            );
          }

          updatedTask = {
            ...existing,
            ...updates,

            _id:
              existing._id,

            updatedAt:
              new Date()
                .toISOString(),
          };

          if (
            updates.title !==
            undefined
          ) {
            const cleanTitle =
              String(
                updates.title
              ).trim();

            if (!cleanTitle) {
              throw new Error(
                "Task title cannot be empty"
              );
            }

            updatedTask.title =
              cleanTitle;
          }

          await localDb.put(
            "tasks",
            updatedTask
          );
        }

        // =====================================
        // ACCOUNT
        // =====================================

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
            currentTasks
          ) =>
            currentTasks.map(
              (task) =>
                task._id ===
                updatedTask._id
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
      } catch (error) {
        console.error(
          "Failed to update task:",
          error
        );

        throw error;
      }
    };

  // =========================================================
  // DELETE TASK
  // =========================================================

  const deleteTask =
    async (id) => {
      try {
        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          await localDb.remove(
            "tasks",
            id
          );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
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
            currentTasks
          ) =>
            currentTasks.filter(
              (task) =>
                task._id !==
                id
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
  // STATS
  // =========================================================

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed ===
        true
    ).length;

  const pendingTasks =
    tasks.length -
    completedTasks;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="dashboard">

      <header className="dashboard-header">

        <div>

          <h1>
            Tasks ✅
          </h1>

          <p>
            Manage everything you
            need to get done.
          </p>

        </div>

      </header>

      <section className="stats-grid">

        <StatBox
          label="Total Tasks"
          value={
            tasks.length
          }
        />

        <StatBox
          label="Pending"
          value={
            pendingTasks
          }
        />

        <StatBox
          label="Completed"
          value={
            completedTasks
          }
        />

      </section>

      <div className="dashboard-card">

        <div className="card-header">

          <h2>
            All Tasks
          </h2>

        </div>

        <AddTask
          onAdd={
            addTask
          }
        />

        <div className="task-list">

          {loading ? (

            <p>
              Loading tasks...
            </p>

          ) : tasks.length ===
            0 ? (

            <p>
              No tasks yet. Add
              something you need to
              study! 📚
            </p>

          ) : (

            tasks.map(
              (task) => (

                <TaskItem
                  key={
                    task._id
                  }

                  task={
                    task
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

      </div>

    </div>
  );
}

function StatBox({
  label,
  value,
}) {
  return (
    <div className="stat-card">

      <span className="stat-label">
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <span className="stat-description">
        Current count
      </span>

    </div>
  );
}

export default Tasks;