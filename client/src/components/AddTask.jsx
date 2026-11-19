import {
  useState,
} from "react";

import {
  BookOpen,
  CalendarDays,
  Clock3,
  Flag,
  Plus,
  RotateCcw,
} from "lucide-react";

import StudyDatePicker from "./StudyDatePicker";
import StudySelect from "./StudySelect";
import StudyTimePicker from "./StudyTimePicker";

import "../pages/Tasks.composer.css";

// =========================================================
// DEFAULT FORM
// =========================================================

const createInitialForm =
  () => ({
    title: "",
    subjectId: "",
    priority:
      "medium",
    dueDate: "",
    dueTime: "",
  });

// =========================================================
// ADD TASK
// =========================================================

function AddTask({
  onAdd,
  subjects = [],
}) {
  const [
    form,
    setForm,
  ] = useState(
    createInitialForm
  );

  const [
    expanded,
    setExpanded,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  // =======================================================
  // UPDATE FIELD
  // =======================================================

  const updateField =
    (
      field,
      value
    ) => {
      setForm(
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
  // RESET
  // =======================================================

  const resetForm =
    () => {
      setForm(
        createInitialForm()
      );

      setError("");
    };

  // =======================================================
  // SUBMIT
  // =======================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      const title =
        form.title.trim();

      if (
        !title
      ) {
        setError(
          "Enter a task first."
        );

        return;
      }

      try {
        setSubmitting(
          true
        );

        setError("");

        const result =
          await onAdd({
            title,

            subjectId:
              form.subjectId,

            priority:
              form.priority,

            dueDate:
              form.dueDate,

            dueTime:
              form.dueDate
                ? form.dueTime
                : "",
          });

        if (
          result ===
          false
        ) {
          return;
        }

        setForm(
          createInitialForm()
        );

        setExpanded(
          false
        );
      } catch (
        submitError
      ) {
        console.error(
          "Failed to add task:",
          submitError
        );

        setError(
          submitError?.message ||
            "Could not add task."
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  // =======================================================
  // SUBJECT OPTIONS
  // =======================================================

  const subjectOptions = [
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
          "#737373",
      })
    ),
  ];

  // =======================================================
  // PRIORITY OPTIONS
  // =======================================================

  const priorityOptions = [
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

  // =======================================================
  // UI
  // =======================================================

  const detailCount = [
    Boolean(form.subjectId),
    form.priority !== "medium",
    Boolean(form.dueDate),
    Boolean(form.dueTime),
  ].filter(Boolean).length;

  return (
    <form
      className={`add-task-form-v2 tc-clean ${
        expanded ? "expanded" : ""
      }`}
      onSubmit={handleSubmit}
    >

      <div className="add-task-main-row">

        <div className="add-task-title-field">
          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              updateField("title", event.target.value)
            }
            placeholder="What needs to get done?"
            aria-label="Task title"
            maxLength={200}
            autoComplete="off"
            disabled={submitting}
          />
        </div>

        <div className="tc-actions">

          {expanded && (
            <button
              type="button"
              className="tc-reset"
              title="Reset task draft"
              aria-label="Reset task draft"
              onClick={resetForm}
              disabled={submitting}
            >
              <RotateCcw size={15} />
            </button>
          )}

          <button
            type="button"
            className={`tc-details-toggle ${
              expanded ? "is-active" : ""
            }`}
            aria-expanded={expanded}
            aria-controls="tc-optional-details"
            aria-label="Toggle task details"
            title="Task details"
            onClick={() =>
              setExpanded((current) => !current)
            }
            disabled={submitting}
          >
            <Flag size={15} />

            <span>Details</span>

            {detailCount > 0 && (
              <small>{detailCount}</small>
            )}
          </button>

          <button
            type="submit"
            className="add-task-submit"
            aria-label="Add task"
            disabled={submitting || !form.title.trim()}
          >
            <Plus size={16} />

            <span>
              {submitting ? "Adding..." : "Add task"}
            </span>
          </button>

        </div>

      </div>

      <div
        id="tc-optional-details"
        hidden={!expanded}
      >

        {expanded && (
          <div className="add-task-details">

            <div className="add-task-field">

              <span className="add-task-field-label">
                <BookOpen size={13} />
                Subject
              </span>

              <StudySelect
                value={form.subjectId}
                onChange={(value) =>
                  updateField("subjectId", value)
                }
                options={subjectOptions}
                placeholder="No subject"
                className="task-study-select add-task-study-select"
                disabled={submitting}
                ariaLabel="Choose task subject"
              />

            </div>

            <div className="add-task-field">

              <span className="add-task-field-label">
                <Flag size={13} />
                Priority
              </span>

              <StudySelect
                value={form.priority}
                onChange={(value) =>
                  updateField("priority", value)
                }
                options={priorityOptions}
                placeholder="Medium"
                className="task-study-select add-task-study-select"
                disabled={submitting}
                ariaLabel="Choose task priority"
              />

            </div>

            <div className="add-task-field">

              <span className="add-task-field-label">
                <CalendarDays size={13} />
                Due date
              </span>

              <StudyDatePicker
                value={form.dueDate}
                onChange={(value) =>
                  updateField("dueDate", value)
                }
                placeholder="No due date"
                disabled={submitting}
              />

            </div>

            <div
              className={`add-task-field ${
                !form.dueDate ? "disabled" : ""
              }`}
            >

              <span className="add-task-field-label">
                <Clock3 size={13} />
                Due time
              </span>

              <StudyTimePicker
                value={form.dueTime}
                onChange={(value) =>
                  updateField("dueTime", value)
                }
                disabled={submitting || !form.dueDate}
                placeholder={
                  form.dueDate
                    ? "No time"
                    : "Add date first"
                }
                ariaLabel="Choose task due time"
              />

            </div>

          </div>
        )}

      </div>

      {error && (
        <p className="tc-error" role="alert">
          {error}
        </p>
      )}

    </form>
  );
}

export default AddTask;