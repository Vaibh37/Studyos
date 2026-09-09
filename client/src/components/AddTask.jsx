import {
  useState,
} from "react";

import {
  BookOpen,
  Clock3,
  Flag,
  Plus,
} from "lucide-react";

import StudyDatePicker from "./StudyDatePicker";
import StudySelect from "./StudySelect";

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
        (current) => {
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

      setExpanded(
        false
      );
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

        resetForm();
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
          "#6366f1",
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
            placeholder="Add a task..."
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
        <div className="add-task-details">

          {/* =================================================
              SUBJECT
          ================================================= */}

          <label className="add-task-field">

            <span className="add-task-field-label">

              <BookOpen
                size={15}
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
                size={15}
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
              placeholder="Choose date"
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
                size={15}
              />

              Due time

            </span>

            <input
              type="time"
              value={
                form.dueTime
              }
              onChange={(
                event
              ) =>
                updateField(
                  "dueTime",
                  event.target.value
                )
              }
              disabled={
                submitting ||
                !form.dueDate
              }
            />

          </label>

        </div>
      )}

      {/* ===================================================
          FOOTER
      =================================================== */}

      {expanded && (
        <div className="add-task-footer">

          <div className="add-task-footer-left">

            {error && (
              <span className="add-task-error">
                {error}
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
              Collapse
            </button>

          </div>

        </div>
      )}

    </form>
  );
}

export default AddTask;