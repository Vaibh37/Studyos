import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";

function TaskItem({
  task,
  onToggle,
  onUpdate,
  onDelete,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedTitle = editTitle.trim();

    if (!trimmedTitle || saving) {
      return;
    }

    try {
      setSaving(true);

      await onUpdate(task._id, {
        title: trimmedTitle,
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="task task-editing">
        <input
          className="edit-task-input"
          type="text"
          value={editTitle}
          onChange={(event) =>
            setEditTitle(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSave();
            }

            if (event.key === "Escape") {
              handleCancel();
            }
          }}
          autoFocus
          disabled={saving}
        />

        <button
          type="button"
          className="task-action save-task"
          onClick={handleSave}
          disabled={saving}
          aria-label="Save task"
        >
          <Check size={16} />
        </button>

        <button
          type="button"
          className="task-action cancel-task"
          onClick={handleCancel}
          disabled={saving}
          aria-label="Cancel editing"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`task ${
        task.completed ? "completed" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={Boolean(task.completed)}
        onChange={() => onToggle(task._id)}
        aria-label={
          task.completed
            ? "Mark task as incomplete"
            : "Mark task as complete"
        }
      />

      <span className="task-title">
        {task.title}
      </span>

      <button
        type="button"
        className="task-action edit-task"
        onClick={() => {
          setEditTitle(task.title);
          setIsEditing(true);
        }}
        aria-label={`Edit ${task.title}`}
      >
        <Pencil size={16} />
      </button>

      <button
        type="button"
        className="task-action delete-task"
        onClick={() => onDelete(task._id)}
        aria-label={`Delete ${task.title}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default TaskItem;