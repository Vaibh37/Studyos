import {
  useEffect,
  useState,
} from "react";

import apiRequest from "../services/api";

import {
  createLocalId,
  localDb,
} from "../services/localDb";

import {
  useAuth,
} from "../context/AuthContext";

function Notes() {
  const {
    isGuest,
  } = useAuth();

  const [
    notes,
    setNotes,
  ] = useState([]);

  const [
    selectedNote,
    setSelectedNote,
  ] = useState(null);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  // =========================================
  // DELETE MODAL
  // =========================================

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  // =========================================================
  // SELECT NOTE
  // =========================================================

  const selectNote =
    (note) => {
      setSelectedNote(
        note
      );

      setTitle(
        note?.title ||
          ""
      );

      setContent(
        note?.content ||
          ""
      );
    };

  // =========================================================
  // FETCH NOTES
  // =========================================================

  const fetchNotes =
    async () => {
      try {
        setLoading(true);
        setError("");

        let data;

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          data =
            await localDb.getAll(
              "notes"
            );

          data =
            data.sort(
              (
                a,
                b
              ) =>
                new Date(
                  b.updatedAt ||
                    b.createdAt ||
                    0
                ) -
                new Date(
                  a.updatedAt ||
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
              "/api/notes"
            );
        }

        const safeNotes =
          Array.isArray(data)
            ? data
            : [];

        setNotes(
          safeNotes
        );

        if (
          safeNotes.length >
          0
        ) {
          selectNote(
            safeNotes[0]
          );
        } else {
          setSelectedNote(
            null
          );

          setTitle("");
          setContent("");
        }
      } catch (error) {
        console.error(
          "Failed to fetch notes:",
          error
        );

        setError(
          error.message ||
            "Failed to load notes."
        );
      } finally {
        setLoading(false);
      }
    };

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    fetchNotes();
  }, [isGuest]);

  // =========================================================
  // CREATE NOTE
  // =========================================================

  const createNote =
    async () => {
      if (creating) {
        return;
      }

      try {
        setCreating(true);
        setError("");

        let newNote;

        const noteTitle =
          `Untitled Note ${
            notes.length +
            1
          }`;

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          const now =
            new Date()
              .toISOString();

          newNote = {
            _id:
              createLocalId(),

            title:
              noteTitle,

            content:
              "",

            createdAt:
              now,

            updatedAt:
              now,
          };

          await localDb.put(
            "notes",
            newNote
          );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
          newNote =
            await apiRequest(
              "/api/notes",
              {
                method:
                  "POST",

                body:
                  JSON.stringify({
                    title:
                      noteTitle,

                    content:
                      "",
                  }),
              }
            );
        }

        setNotes(
          (
            currentNotes
          ) => [
            newNote,
            ...currentNotes,
          ]
        );

        selectNote(
          newNote
        );

        window.dispatchEvent(
          new Event(
            "studyos-notes-updated"
          )
        );
      } catch (error) {
        console.error(
          "Failed to create note:",
          error
        );

        setError(
          error.message ||
            "Failed to create note."
        );
      } finally {
        setCreating(false);
      }
    };

  // =========================================================
  // SAVE NOTE
  // =========================================================

  const saveNote =
    async () => {
      if (
        !selectedNote ||
        saving
      ) {
        return;
      }

      try {
        setSaving(true);
        setError("");

        let updatedNote;

        const noteData = {
          title:
            title.trim() ||
            "Untitled Note",

          content,
        };

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          updatedNote = {
            ...selectedNote,

            ...noteData,

            _id:
              selectedNote._id,

            createdAt:
              selectedNote.createdAt ||
              new Date()
                .toISOString(),

            updatedAt:
              new Date()
                .toISOString(),
          };

          await localDb.put(
            "notes",
            updatedNote
          );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
          updatedNote =
            await apiRequest(
              `/api/notes/${selectedNote._id}`,
              {
                method:
                  "PUT",

                body:
                  JSON.stringify(
                    noteData
                  ),
              }
            );
        }

        setNotes(
          (
            currentNotes
          ) =>
            currentNotes.map(
              (note) =>
                note._id ===
                updatedNote._id
                  ? updatedNote
                  : note
            )
        );

        selectNote(
          updatedNote
        );

        window.dispatchEvent(
          new Event(
            "studyos-notes-updated"
          )
        );
      } catch (error) {
        console.error(
          "Failed to save note:",
          error
        );

        setError(
          error.message ||
            "Failed to save note."
        );
      } finally {
        setSaving(false);
      }
    };

  // =========================================================
  // DELETE MODAL
  // =========================================================

  const openDeleteModal =
    () => {
      if (
        !selectedNote ||
        deleting
      ) {
        return;
      }

      setShowDeleteModal(
        true
      );
    };

  const closeDeleteModal =
    () => {
      if (deleting) {
        return;
      }

      setShowDeleteModal(
        false
      );
    };

  // =========================================================
  // DELETE NOTE
  // =========================================================

  const deleteNote =
    async () => {
      if (
        !selectedNote ||
        deleting
      ) {
        return;
      }

      try {
        setDeleting(true);
        setError("");

        const noteId =
          selectedNote._id;

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          await localDb.remove(
            "notes",
            noteId
          );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
          await apiRequest(
            `/api/notes/${noteId}`,
            {
              method:
                "DELETE",
            }
          );
        }

        const remainingNotes =
          notes.filter(
            (note) =>
              note._id !==
              noteId
          );

        setNotes(
          remainingNotes
        );

        if (
          remainingNotes.length >
          0
        ) {
          selectNote(
            remainingNotes[0]
          );
        } else {
          setSelectedNote(
            null
          );

          setTitle("");
          setContent("");
        }

        setShowDeleteModal(
          false
        );

        window.dispatchEvent(
          new Event(
            "studyos-notes-updated"
          )
        );
      } catch (error) {
        console.error(
          "Failed to delete note:",
          error
        );

        setError(
          error.message ||
            "Failed to delete note."
        );
      } finally {
        setDeleting(false);
      }
    };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredNotes =
    notes.filter(
      (note) => {
        const searchText =
          search
            .trim()
            .toLowerCase();

        const noteTitle =
          (
            note.title ||
            ""
          ).toLowerCase();

        const noteContent =
          (
            note.content ||
            ""
          ).toLowerCase();

        return (
          noteTitle.includes(
            searchText
          ) ||
          noteContent.includes(
            searchText
          )
        );
      }
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="notes-page">

      <header className="dashboard-header">

        <div>

          <h1>
            Notes 📝
          </h1>

          <p>
            Keep your study material organized in one place.
          </p>

        </div>

      </header>

      {error && (

        <div className="dashboard-card">

          <p className="notes-status">
            {error}
          </p>

        </div>

      )}

      <div className="notes-container">

        {/* =========================
            SIDEBAR
        ========================= */}

        <aside className="notes-sidebar">

          <button
            className="new-note-button"
            onClick={createNote}
            disabled={creating}
          >
            {creating
              ? "Creating..."
              : "+ New Note"}
          </button>

          <input
            className="notes-search"
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          <div className="notes-list">

            {loading ? (

              <p className="notes-status">
                Loading notes...
              </p>

            ) : filteredNotes.length ===
              0 ? (

              <p className="empty-notes">

                {search
                  ? "No matching notes."
                  : "No notes yet."}

              </p>

            ) : (

              filteredNotes.map(
                (note) => (

                  <button
                    key={
                      note._id
                    }

                    className={`note-list-item ${
                      selectedNote?._id ===
                      note._id
                        ? "selected"
                        : ""
                    }`}

                    onClick={() =>
                      selectNote(
                        note
                      )
                    }
                  >

                    <strong>
                      {note.title ||
                        "Untitled Note"}
                    </strong>

                    <span>

                      {note.content
                        ? note.content.slice(
                            0,
                            60
                          )
                        : "Empty note"}

                    </span>

                  </button>

                )
              )

            )}

          </div>

        </aside>

        {/* =========================
            EDITOR
        ========================= */}

        <section className="note-editor">

          {selectedNote ? (

            <>

              <div className="note-editor-header">

                <input
                  className="note-title-input"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Note title..."
                />

                <div className="note-actions">

                  <button
                    onClick={saveNote}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save"}
                  </button>

                  <button
                    className="danger-button"
                    onClick={
                      openDeleteModal
                    }
                    disabled={
                      deleting
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

              <textarea
                className="note-content-input"
                placeholder="Start writing your notes..."
                value={content}
                onChange={(event) =>
                  setContent(
                    event.target.value
                  )
                }
              />

            </>

          ) : (

            <div className="no-note-selected">

              <h2>
                No note selected 📝
              </h2>

              <p>
                Create a new note to get started.
              </p>

              <button
                className="new-note-button"
                onClick={createNote}
                disabled={
                  creating
                }
              >
                {creating
                  ? "Creating..."
                  : "+ Create Note"}
              </button>

            </div>

          )}

        </section>

      </div>

      {/* =========================
          DELETE CONFIRMATION MODAL
      ========================= */}

      {showDeleteModal && (

        <div
          className="delete-modal-overlay"
          onClick={
            closeDeleteModal
          }
        >

          <div
            className="delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="delete-modal-icon">
              🗑️
            </div>

            <h2>
              Delete this note?
            </h2>

            <p>

              This will permanently delete{" "}

              <strong>
                "
                {selectedNote?.title ||
                  "Untitled Note"}
                "
              </strong>

              .
              <br />

              This action cannot be undone.

            </p>

            <div className="delete-modal-actions">

              <button
                className="cancel-delete-button"
                onClick={
                  closeDeleteModal
                }
                disabled={
                  deleting
                }
              >
                Cancel
              </button>

              <button
                className="confirm-delete-button"
                onClick={
                  deleteNote
                }
                disabled={
                  deleting
                }
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Note"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Notes;