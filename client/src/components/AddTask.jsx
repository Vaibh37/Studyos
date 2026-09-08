import { useState } from "react";

function AddTask({ onAdd }) {
  const [title, setTitle] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    onAdd(trimmedTitle);
    setTitle("");
  };

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="What do you need to study?"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <button type="submit">Add Task</button>
    </form>
  );
}

export default AddTask;