import {
  useState,
} from "react";

import {
  BookOpen,
  CalendarDays,
  ChevronUp,
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

  return (
    <form
      className={`add-task-form-v2 ${
        expanded
          ? "expanded"
          : ""
      }`}
      onSubmit={
        handleSubmit
      }
    >

      {/* ===================================================
          MAIN ROW
      =================================================== */}

      <div className="add-task-main-row">

        <div className="add-task-title-field">

          <Plus
            size={18}
            className="add-task-title-icon"
          />

          <input
            type="text"
            value={
              form.title
            }
            onFocus={() =>
              setExpanded(
                true
              )
            }
            onChange={(
              event
            ) =>
              updateField(
                "title",
                event.target.value
              )
            }
            placeholder="What needs to get done?"
            maxLength={200}
            autoComplete="off"
            disabled={
              submitting
            }
          />

        </div>

        <button
          type="submit"
          className="add-task-submit"
          disabled={
            submitting ||
            !form.title.trim()
          }
        >

          <Plus
            size={17}
          />

          <span>
            {submitting
              ? "Adding..."
              : "Add task"}
          </span>

        </button>

      </div>

      {/* ===================================================
          DETAILS
      =================================================== */}

      {expanded && (
        <>
          <div className="add-task-details">

            {/* =================================================
                SUBJECT
            ================================================= */}

            <label className="add-task-field">

              <span className="add-task-field-label">

                <BookOpen
                  size={14}
                />

                Subject

              </span>

              <StudySelect
                value={
                  form.subjectId
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "subjectId",
                    value
                  )
                }
                options={
                  subjectOptions
                }
                placeholder="No subject"
                className="task-study-select add-task-study-select"
                disabled={
                  submitting
                }
                ariaLabel="Choose task subject"
              />

            </label>

            {/* =================================================
                PRIORITY
            ================================================= */}

            <label className="add-task-field">

              <span className="add-task-field-label">

                <Flag
                  size={14}
                />

                Priority

              </span>

              <StudySelect
                value={
                  form.priority
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "priority",
                    value
                  )
                }
                options={
                  priorityOptions
                }
                placeholder="Medium"
                className="task-study-select add-task-study-select"
                disabled={
                  submitting
                }
                ariaLabel="Choose task priority"
              />

            </label>

            {/* =================================================
                DATE
            ================================================= */}

            <div className="add-task-field">

              <span className="add-task-field-label">

                <CalendarDays
                  size={14}
                />

                Due date

              </span>

              <StudyDatePicker
                value={
                  form.dueDate
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "dueDate",
                    value
                  )
                }
                placeholder="No due date"
                disabled={
                  submitting
                }
              />

            </div>

            {/* =================================================
                TIME
            ================================================= */}

            <label
              className={`add-task-field ${
                !form.dueDate
                  ? "disabled"
                  : ""
              }`}
            >

              <span className="add-task-field-label">

                <Clock3
                  size={14}
                />

                Due time

              </span>

              <StudyTimePicker
                value={
                  form.dueTime
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "dueTime",
                    value
                  )
                }
                disabled={
                  submitting ||
                  !form.dueDate
                }
                placeholder={
                  form.dueDate
                    ? "No time"
                    : "Add date first"
                }
                ariaLabel="Choose task due time"
              />

            </label>

          </div>

          <div className="add-task-footer">

            <div className="add-task-footer-left">

              {error ? (
                <span className="add-task-error">
                  {error}
                </span>
              ) : (
                <span className="add-task-hint">
                  Optional details
                </span>
              )}

            </div>

            <div className="add-task-footer-actions">

              <button
                type="button"
                className="add-task-reset"
                onClick={
                  resetForm
                }
                disabled={
                  submitting
                }
              >
                <RotateCcw
                  size={13}
                />

                Reset
              </button>

              <button
                type="button"
                className="add-task-collapse"
                onClick={() =>
                  setExpanded(
                    false
                  )
                }
                disabled={
                  submitting
                }
              >
                <ChevronUp
                  size={14}
                />

                Collapse
              </button>

            </div>

          </div>
        </>
      )}

    </form>
  );
}

export default AddTask;
