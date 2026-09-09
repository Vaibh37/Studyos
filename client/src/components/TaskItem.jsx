import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import StudyDatePicker from "./StudyDatePicker";
import StudySelect from "./StudySelect";

// =========================================================
// HELPERS
// =========================================================

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

const formatDueDate = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day:
        "numeric",

      month:
        "short",
    }
  );
};

const formatDueTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const [
    hours,
    minutes,
  ] = String(
    value
  )
    .split(":")
    .map(
      Number
    );

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
    undefined,
    {
      hour:
        "numeric",

      minute:
        "2-digit",
    }
  );
};

const normalizePriority = (
  value
) => {
  if (
    value ===
      "high" ||
    value ===
      "low"
  ) {
    return value;
  }

  return "medium";
};

// =========================================================
// PRIORITY OPTIONS
// =========================================================

const PRIORITY_OPTIONS = [
  {
    value:
      "low",

    label:
      "Low",

    description:
      "Can wait",
  },

  {
    value:
      "medium",

    label:
      "Medium",

    description:
      "Normal priority",
  },

  {
    value:
      "high",

    label:
      "High",

    description:
      "Needs attention",
  },
];

// =========================================================
// DELETE MODAL
// =========================================================

function DeleteTaskModal({
  taskTitle,
  deleting,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
            "Escape" &&
          !deleting
        ) {
          onCancel();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    deleting,
    onCancel,
  ]);

  useEffect(() => {
    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="studyos-modal-backdrop"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !deleting
        ) {
          onCancel();
        }
      }}
    >
      <div
        className="studyos-modal task-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
      >

        <div className="task-delete-modal-icon">

          <Trash2
            size={20}
          />

        </div>

        <div className="task-delete-modal-content">

          <div className="task-delete-modal-header">

            <div>

              <span className="page-eyebrow">
                Delete task
              </span>

              <h3 id="delete-task-title">
                Remove this task?
              </h3>

            </div>

            <button
              type="button"
              className="task-modal-close"
              onClick={
                onCancel
              }
              disabled={
                deleting
              }
              aria-label="Close delete dialog"
            >

              <X
                size={18}
              />

            </button>

          </div>

          <p>
            This will permanently
            delete{" "}

            <strong>
              {taskTitle}
            </strong>
            . This action cannot
            be undone.
          </p>

          <div className="task-delete-modal-actions">

            <button
              type="button"
              className="task-modal-cancel"
              onClick={
                onCancel
              }
              disabled={
                deleting
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="task-modal-delete"
              onClick={
                onConfirm
              }
              disabled={
                deleting
              }
            >

              <Trash2
                size={15}
              />

              {deleting
                ? "Deleting..."
                : "Delete task"}

            </button>

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}

// =========================================================
// TASK ITEM
// =========================================================

function TaskItem({
  task,
  subjects = [],
  onToggle,
  onUpdate,
  onDelete,
}) {
  // =======================================================
  // STATE
  // =======================================================

  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    deleteModalOpen,
    setDeleteModalOpen,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    editForm,
    setEditForm,
  ] = useState({
    title:
      task.title ||
      "",

    subjectId:
      getSubjectId(
        task.subjectId
      ),

    priority:
      normalizePriority(
        task.priority
      ),

    dueDate:
      getDateKey(
        task.dueDate
      ),

    dueTime:
      task.dueTime ||
      "",
  });

  // =======================================================
  // SYNC FORM
  // =======================================================

  useEffect(() => {
    if (
      isEditing
    ) {
      return;
    }

    setEditForm({
      title:
        task.title ||
        "",

      subjectId:
        getSubjectId(
          task.subjectId
        ),

      priority:
        normalizePriority(
          task.priority
        ),

      dueDate:
        getDateKey(
          task.dueDate
        ),

      dueTime:
        task.dueTime ||
        "",
    });
  }, [
    task,
    isEditing,
  ]);

  // =======================================================
  // DERIVED
  // =======================================================

  const todayKey =
    getTodayKey();

  const dueDateKey =
    getDateKey(
      task.dueDate
    );

  const isOverdue =
    Boolean(
      dueDateKey &&
        !task.completed &&
        dueDateKey <
          todayKey
    );

  const isDueToday =
    Boolean(
      dueDateKey &&
        !task.completed &&
        dueDateKey ===
          todayKey
    );

  const priority =
    normalizePriority(
      task.priority
    );

  const selectedSubject =
    useMemo(() => {
      const taskSubjectId =
        getSubjectId(
          task.subjectId
        );

      if (
        !taskSubjectId
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
            taskSubjectId
        ) ||
        null
      );
    }, [
      subjects,
      task.subjectId,
    ]);

  const subjectName =
    selectedSubject?.name ||
    task.subjectName ||
    "";

  // =======================================================
  // SUBJECT OPTIONS
  // =======================================================

  const subjectOptions =
    useMemo(
      () => [
        {
          value:
            "",

          label:
            "No subject",

          description:
            "Keep this task unassigned",
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
  // UPDATE EDIT FIELD
  // =======================================================

  const updateEditField =
    (
      field,
      value
    ) => {
      setEditForm(
        (
          current
        ) => {
          const next = {
            ...current,

            [field]:
              value,
          };

          if (
            field ===
              "dueDate" &&
            !value
          ) {
            next.dueTime =
              "";
          }

          return next;
        }
      );

      if (
        error
      ) {
        setError("");
      }
    };

  // =======================================================
  // START EDIT
  // =======================================================

  const startEditing =
    () => {
      setEditForm({
        title:
          task.title ||
          "",

        subjectId:
          getSubjectId(
            task.subjectId
          ),

        priority:
          normalizePriority(
            task.priority
          ),

        dueDate:
          getDateKey(
            task.dueDate
          ),

        dueTime:
          task.dueTime ||
          "",
      });

      setError("");

      setIsEditing(
        true
      );
    };

  // =======================================================
  // CANCEL EDIT
  // =======================================================

  const cancelEditing =
    () => {
      if (
        saving
      ) {
        return;
      }

      setError("");

      setIsEditing(
        false
      );
    };

  // =======================================================
  // SAVE
  // =======================================================

  const handleSave =
    async () => {
      const title =
        editForm.title.trim();

      if (
        !title
      ) {
        setError(
          "Task title cannot be empty."
        );

        return;
      }

      if (
        saving
      ) {
        return;
      }

      try {
        setSaving(
          true
        );

        setError("");

        await onUpdate(
          task._id,
          {
            title,

            subjectId:
              editForm.subjectId ||
              null,

            priority:
              normalizePriority(
                editForm.priority
              ),

            dueDate:
              editForm.dueDate ||
              null,

            dueTime:
              editForm.dueDate
                ? editForm.dueTime
                : "",
          }
        );

        setIsEditing(
          false
        );
      } catch (
        saveError
      ) {
        console.error(
          "Failed to update task:",
          saveError
        );

        setError(
          saveError?.message ||
            "Could not save task."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  // =======================================================
  // DELETE
  // =======================================================

  const openDeleteModal =
    () => {
      if (
        deleting
      ) {
        return;
      }

      setError("");

      setDeleteModalOpen(
        true
      );
    };

  const closeDeleteModal =
    () => {
      if (
        deleting
      ) {
        return;
      }

      setDeleteModalOpen(
        false
      );
    };

  const handleDelete =
    async () => {
      if (
        deleting
      ) {
        return;
      }

      try {
        setDeleting(
          true
        );

        setError("");

        await onDelete(
          task._id
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

        setDeleteModalOpen(
          false
        );
      } finally {
        setDeleting(
          false
        );
      }
    };

  // =======================================================
  // EDIT MODE
  // =======================================================

  if (
    isEditing
  ) {
    return (
      <article className="task task-v2 task-editing-v2">

        <div className="task-edit-layout">

          {/* =================================================
              TITLE
          ================================================= */}

          <label className="task-edit-title">

            <span>
              Task
            </span>

            <input
              type="text"
              value={
                editForm.title
              }
              onChange={(
                event
              ) =>
                updateEditField(
                  "title",
                  event.target.value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  event.preventDefault();

                  handleSave();
                }

                if (
                  event.key ===
                  "Escape"
                ) {
                  cancelEditing();
                }
              }}
              maxLength={200}
              autoFocus
              disabled={
                saving
              }
            />

          </label>

          {/* =================================================
              DETAILS
          ================================================= */}

          <div className="task-edit-fields">

            {/* SUBJECT */}

            <label className="task-edit-field">

              <span>

                <BookOpen
                  size={14}
                />

                Subject

              </span>

              <StudySelect
                value={
                  editForm.subjectId
                }
                onChange={(
                  value
                ) =>
                  updateEditField(
                    "subjectId",
                    value
                  )
                }
                options={
                  subjectOptions
                }
                placeholder="No subject"
                className="task-study-select task-edit-study-select"
                disabled={
                  saving
                }
                ariaLabel="Choose task subject"
              />

            </label>

            {/* PRIORITY */}

            <label className="task-edit-field">

              <span>
                Priority
              </span>

              <StudySelect
                value={
                  editForm.priority
                }
                onChange={(
                  value
                ) =>
                  updateEditField(
                    "priority",
                    value
                  )
                }
                options={
                  PRIORITY_OPTIONS
                }
                placeholder="Medium"
                className="task-study-select task-edit-study-select"
                disabled={
                  saving
                }
                ariaLabel="Choose task priority"
              />

            </label>

            {/* DUE DATE */}

            <div className="task-edit-field">

              <span>

                <CalendarDays
                  size={14}
                />

                Due date

              </span>

              <StudyDatePicker
                value={
                  editForm.dueDate
                }
                onChange={(
                  value
                ) =>
                  updateEditField(
                    "dueDate",
                    value
                  )
                }
                placeholder="Choose date"
                disabled={
                  saving
                }
              />

            </div>

            {/* TIME */}

            <label className="task-edit-field">

              <span>

                <Clock3
                  size={14}
                />

                Time

              </span>

              <input
                type="time"
                value={
                  editForm.dueTime
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "dueTime",
                    event.target.value
                  )
                }
                disabled={
                  saving ||
                  !editForm.dueDate
                }
              />

            </label>

          </div>

          {/* ERROR */}

          {error && (
            <div className="task-inline-error">

              <AlertCircle
                size={15}
              />

              <span>
                {error}
              </span>

            </div>
          )}

          {/* ACTIONS */}

          <div className="task-edit-actions">

            <button
              type="button"
              className="task-action-button task-cancel-button"
              onClick={
                cancelEditing
              }
              disabled={
                saving
              }
            >

              <X
                size={16}
              />

              Cancel

            </button>

            <button
              type="button"
              className="task-action-button task-save-button"
              onClick={
                handleSave
              }
              disabled={
                saving ||
                !editForm.title.trim()
              }
            >

              <Check
                size={16}
              />

              {saving
                ? "Saving..."
                : "Save"}

            </button>

          </div>

        </div>

      </article>
    );
  }

  // =======================================================
  // NORMAL MODE
  // =======================================================

  return (
    <>
      <article
        className={[
          "task",
          "task-v2",

          task.completed
            ? "completed"
            : "",

          isOverdue
            ? "overdue"
            : "",

          isDueToday
            ? "due-today"
            : "",

          `priority-${priority}`,
        ]
          .filter(
            Boolean
          )
          .join(" ")}
      >

        {/* =================================================
            COMPLETE
        ================================================= */}

        <button
          type="button"
          className="task-complete-button"
          onClick={() =>
            onToggle(
              task._id
            )
          }
          aria-label={
            task.completed
              ? `Mark ${task.title} as incomplete`
              : `Mark ${task.title} as complete`
          }
        >

          {task.completed && (
            <Check
              size={15}
            />
          )}

        </button>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="task-v2-content">

          <div className="task-v2-title-row">

            <span className="task-title">
              {task.title}
            </span>

            <span
              className={`task-priority-badge priority-${priority}`}
            >
              {priority}
            </span>

          </div>

          {/* META */}

          <div className="task-meta-row">

            {subjectName && (
              <span
                className="task-meta-item task-subject-chip"
                style={
                  selectedSubject
                    ?.color
                    ? {
                        "--task-subject-color":
                          selectedSubject.color,
                      }
                    : undefined
                }
              >

                <BookOpen
                  size={13}
                />

                {subjectName}

              </span>
            )}

            {task.dueDate && (
              <span
                className={[
                  "task-meta-item",
                  "task-due-chip",

                  isOverdue
                    ? "overdue"
                    : "",

                  isDueToday
                    ? "today"
                    : "",
                ]
                  .filter(
                    Boolean
                  )
                  .join(" ")}
              >

                <CalendarDays
                  size={13}
                />

                {isOverdue
                  ? "Overdue · "
                  : isDueToday
                    ? "Today · "
                    : ""}

                {formatDueDate(
                  task.dueDate
                )}

              </span>
            )}

            {task.dueTime && (
              <span className="task-meta-item">

                <Clock3
                  size={13}
                />

                {formatDueTime(
                  task.dueTime
                )}

              </span>
            )}

          </div>

        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="task-v2-actions">

          <button
            type="button"
            className="task-icon-button"
            onClick={
              startEditing
            }
            disabled={
              deleting
            }
            aria-label={`Edit ${task.title}`}
            title="Edit task"
          >

            <Pencil
              size={16}
            />

          </button>

          <button
            type="button"
            className="task-icon-button task-delete-button"
            onClick={
              openDeleteModal
            }
            disabled={
              deleting
            }
            aria-label={`Delete ${task.title}`}
            title="Delete task"
          >

            <Trash2
              size={16}
            />

          </button>

        </div>

        {error && (
          <div className="task-inline-error task-inline-error-bottom">

            <AlertCircle
              size={14}
            />

            {error}

          </div>
        )}

      </article>

      {deleteModalOpen && (
        <DeleteTaskModal
          taskTitle={
            task.title
          }
          deleting={
            deleting
          }
          onCancel={
            closeDeleteModal
          }
          onConfirm={
            handleDelete
          }
        />
      )}

    </>
  );
}

export default TaskItem;