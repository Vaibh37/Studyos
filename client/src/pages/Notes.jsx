import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock3,
  FileText,
  FolderOpen,
  Link2,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Type,
  X,
} from "lucide-react";

import apiRequest from "../services/api";
import {
  createLocalId,
  localDb,
} from "../services/localDb";
import { useAuth } from "../context/AuthContext";
import StudySelect from "../components/StudySelect";

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }
  return String(value);
};

const safeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatRelativeTime = (value) => {
  const date = safeDate(value);
  if (!date) return "Unknown";

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

const getWordCount = (value) => {
  const clean = String(value || "").trim();
  return clean ? clean.split(/\s+/).filter(Boolean).length : 0;
};

const getPreview = (content) => {
  const clean = String(content || "").replace(/\s+/g, " ").trim();
  if (!clean) return "Empty note";
  return clean.length <= 92 ? clean : `${clean.slice(0, 92)}…`;
};

function Notes() {
  const { isGuest } = useAuth();

  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const subjectMap = useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => {
      map.set(String(subject._id), subject);
    });
    return map;
  }, [subjects]);

  const getNoteSubject = (note) => {
    const id = getId(note?.subjectId);
    return id ? subjectMap.get(id) || null : null;
  };

  const getNoteSubjectName = (note) => {
    const subject = getNoteSubject(note);
    return subject?.name || note?.subjectName || "Unassigned";
  };

  const getNoteSubjectColor = (note) => {
    return getNoteSubject(note)?.color || "#64748b";
  };

  const selectNote = (note) => {
    setSelectedNote(note);
    setTitle(note?.title || "");
    setContent(note?.content || "");
    setSubjectId(getId(note?.subjectId));
    setSavedMessage("");
  };

  const fetchNotesHub = async (manual = false) => {
    try {
      manual ? setRefreshing(true) : setLoading(true);
      setError("");

      const [noteData, subjectData] = await Promise.all([
        isGuest ? localDb.getAll("notes") : apiRequest("/api/notes"),
        isGuest ? localDb.getAll("subjects") : apiRequest("/api/subjects"),
      ]);

      let safeNotes = Array.isArray(noteData) ? noteData : [];
      const safeSubjects = Array.isArray(subjectData) ? subjectData : [];

      if (isGuest) {
        safeNotes = [...safeNotes].sort((a, b) => {
          const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
          if (pinDiff) return pinDiff;
          return (
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0)
          );
        });
      }

      setNotes(safeNotes);
      setSubjects(safeSubjects);

      const currentId = selectedNote?._id;
      if (currentId) {
        const refreshed = safeNotes.find(
          (note) => String(note._id) === String(currentId)
        );
        if (refreshed) {
          selectNote(refreshed);
          return;
        }
      }

      if (safeNotes.length) {
        selectNote(safeNotes[0]);
      } else {
        setSelectedNote(null);
        setTitle("");
        setContent("");
        setSubjectId("");
      }
    } catch (loadError) {
      console.error("Failed to load Notes V2:", loadError);
      setError(loadError?.message || "Failed to load notes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotesHub(false);
  }, [isGuest]);

  useEffect(() => {
    const refreshSubjects = async () => {
      try {
        const data = isGuest
          ? await localDb.getAll("subjects")
          : await apiRequest("/api/subjects");
        setSubjects(Array.isArray(data) ? data : []);
      } catch (refreshError) {
        console.error("Failed to refresh note subjects:", refreshError);
      }
    };

    window.addEventListener("studyos-subjects-updated", refreshSubjects);
    return () => {
      window.removeEventListener("studyos-subjects-updated", refreshSubjects);
    };
  }, [isGuest]);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedNote) return false;
    return (
      title !== (selectedNote.title || "") ||
      content !== (selectedNote.content || "") ||
      subjectId !== getId(selectedNote.subjectId)
    );
  }, [selectedNote, title, content, subjectId]);

  const buildCurrentPayload = (pinnedOverride) => {
    const selectedSubject = subjectId
      ? subjectMap.get(String(subjectId))
      : null;

    return {
      title: title.trim() || "Untitled Note",
      content,
      subjectId: subjectId || null,
      subjectName: selectedSubject?.name || "",
      pinned:
        pinnedOverride !== undefined
          ? Boolean(pinnedOverride)
          : Boolean(selectedNote?.pinned),
    };
  };

  const saveCurrentNote = async ({ silent = false, pinnedOverride } = {}) => {
    if (!selectedNote || saving) return false;

    try {
      setSaving(true);
      setError("");
      if (!silent) setSavedMessage("");

      const noteData = buildCurrentPayload(pinnedOverride);
      let updatedNote;

      if (isGuest) {
        const now = new Date().toISOString();
        updatedNote = {
          ...selectedNote,
          ...noteData,
          _id: selectedNote._id,
          createdAt: selectedNote.createdAt || now,
          updatedAt: now,
        };
        await localDb.put("notes", updatedNote);
      } else {
        updatedNote = await apiRequest(`/api/notes/${selectedNote._id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: noteData.title,
            content: noteData.content,
            subjectId: noteData.subjectId,
            pinned: noteData.pinned,
          }),
        });
      }

      setNotes((current) =>
        current.map((note) =>
          String(note._id) === String(updatedNote._id) ? updatedNote : note
        )
      );
      selectNote(updatedNote);

      if (!silent) {
        setSavedMessage("Saved");
        window.setTimeout(() => setSavedMessage(""), 1800);
      }

      window.dispatchEvent(new Event("studyos-notes-updated"));
      return true;
    } catch (saveError) {
      console.error("Failed to save note:", saveError);
      setError(saveError?.message || "Failed to save note.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    await saveCurrentNote({ silent: false });
  };

  const changeSelectedNote = async (note) => {
    if (String(selectedNote?._id || "") === String(note?._id || "")) return;
    if (saving || creating || deleting) return;

    if (selectedNote && hasUnsavedChanges) {
      const saved = await saveCurrentNote({ silent: true });
      if (!saved) return;
    }

    selectNote(note);
  };

  const createNote = async () => {
    if (creating || saving) return;

    try {
      if (selectedNote && hasUnsavedChanges) {
        const saved = await saveCurrentNote({ silent: true });
        if (!saved) return;
      }

      setCreating(true);
      setError("");

      const noteTitle = `Untitled Note ${notes.length + 1}`;
      const initialSubjectId =
        subjectFilter !== "all" && subjectFilter !== "none"
          ? subjectFilter
          : "";
      const initialSubject = initialSubjectId
        ? subjectMap.get(String(initialSubjectId))
        : null;

      let newNote;

      if (isGuest) {
        const now = new Date().toISOString();
        newNote = {
          _id: createLocalId(),
          title: noteTitle,
          content: "",
          subjectId: initialSubjectId || null,
          subjectName: initialSubject?.name || "",
          pinned: false,
          createdAt: now,
          updatedAt: now,
        };
        await localDb.put("notes", newNote);
      } else {
        newNote = await apiRequest("/api/notes", {
          method: "POST",
          body: JSON.stringify({
            title: noteTitle,
            content: "",
            subjectId: initialSubjectId || null,
            pinned: false,
          }),
        });
      }

      setNotes((current) => [newNote, ...current]);
      selectNote(newNote);
      window.dispatchEvent(new Event("studyos-notes-updated"));
    } catch (createError) {
      console.error("Failed to create note:", createError);
      setError(createError?.message || "Failed to create note.");
    } finally {
      setCreating(false);
    }
  };

  const togglePinned = async () => {
    if (!selectedNote || pinning || saving) return;

    const nextPinned = !Boolean(selectedNote.pinned);

    try {
      setPinning(true);
      const saved = await saveCurrentNote({
        silent: true,
        pinnedOverride: nextPinned,
      });

      if (saved) {
        setSavedMessage(nextPinned ? "Pinned" : "Unpinned");
        window.setTimeout(() => setSavedMessage(""), 1600);
      }
    } finally {
      setPinning(false);
    }
  };

  const openDeleteModal = () => {
    if (!selectedNote || deleting) return;
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (!deleting) setShowDeleteModal(false);
  };

  const deleteNote = async () => {
    if (!selectedNote || deleting) return;

    try {
      setDeleting(true);
      setError("");
      const noteId = selectedNote._id;

      if (isGuest) {
        await localDb.remove("notes", noteId);
      } else {
        await apiRequest(`/api/notes/${noteId}`, { method: "DELETE" });
      }

      const remaining = notes.filter(
        (note) => String(note._id) !== String(noteId)
      );
      setNotes(remaining);

      if (remaining.length) {
        selectNote(remaining[0]);
      } else {
        setSelectedNote(null);
        setTitle("");
        setContent("");
        setSubjectId("");
      }

      setShowDeleteModal(false);
      window.dispatchEvent(new Event("studyos-notes-updated"));
    } catch (deleteError) {
      console.error("Failed to delete note:", deleteError);
      setError(deleteError?.message || "Failed to delete note.");
    } finally {
      setDeleting(false);
    }
  };

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = notes.filter((note) => {
      const noteSubjectId = getId(note.subjectId);

      if (subjectFilter === "none" && noteSubjectId) return false;
      if (
        subjectFilter !== "all" &&
        subjectFilter !== "none" &&
        noteSubjectId !== subjectFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [note.title, note.content, getNoteSubjectName(note)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    return [...filtered].sort((a, b) => {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDiff) return pinDiff;

      if (sortBy === "title") {
        return String(a.title || "").localeCompare(String(b.title || ""));
      }
      if (sortBy === "created") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "words") {
        return getWordCount(b.content) - getWordCount(a.content);
      }
      return (
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0)
      );
    });
  }, [notes, search, subjectFilter, sortBy, subjectMap]);

  const noteStats = useMemo(() => {
    return {
      total: notes.length,
      pinned: notes.filter((note) => Boolean(note.pinned)).length,
      linked: notes.filter((note) => Boolean(getId(note.subjectId))).length,
      words: notes.reduce((total, note) => total + getWordCount(note.content), 0),
    };
  }, [notes]);

  const currentWordCount = useMemo(() => getWordCount(content), [content]);
  const currentCharacterCount = content.length;
  const currentSubject = subjectId
    ? subjectMap.get(String(subjectId))
    : null;

  const subjectFilterOptions = useMemo(
    () => [
      { value: "all", label: "All subjects" },
      { value: "none", label: "Unassigned" },
      ...subjects.map((subject) => ({
        value: String(subject._id),
        label: subject.name,
        description: subject.code || undefined,
        color: subject.color || "#6366f1",
      })),
    ],
    [subjects]
  );

  const sortOptions = [
    { value: "updated", label: "Recently updated" },
    { value: "created", label: "Recently created" },
    { value: "title", label: "Title A–Z" },
    { value: "words", label: "Most words" },
  ];

  const editorSubjectOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...subjects.map((subject) => ({
        value: String(subject._id),
        label: subject.name,
        description: subject.code || undefined,
        color: subject.color || "#6366f1",
      })),
    ],
    [subjects]
  );

  useEffect(() => {
    const handleKeyboard = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (selectedNote && !saving) saveNote();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [selectedNote, saving, title, content, subjectId]);

  return (
    <div className="dashboard notes-v2-page">
      <header className="dashboard-header notes-v2-header">
        <div>
          <span className="notes-v2-eyebrow">KNOWLEDGE WORKSPACE</span>
          <h1>Notes</h1>
          <p>
            Capture study material, connect notes to subjects and keep important
            ideas pinned.
          </p>
        </div>

        <button
          type="button"
          className="notes-v2-new-button"
          onClick={createNote}
          disabled={creating || saving}
        >
          <Plus size={16} />
          {creating ? "Creating..." : "New note"}
        </button>
      </header>

      {error && (
        <div className="notes-v2-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X size={15} />
          </button>
        </div>
      )}

      <section className="notes-v2-stats">
        <NoteStat icon={<FileText size={17} />} label="Notes" value={noteStats.total} description="Total notes" />
        <NoteStat icon={<Pin size={17} />} label="Pinned" value={noteStats.pinned} description="Important notes" />
        <NoteStat icon={<Link2 size={17} />} label="Linked" value={noteStats.linked} description="Connected to subjects" />
        <NoteStat icon={<Type size={17} />} label="Words" value={noteStats.words} description="Across all notes" />
      </section>

      <section className="notes-v2-toolbar">
        <div className="notes-v2-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <StudySelect
          className="notes-v2-toolbar-select"
          value={subjectFilter}
          onChange={setSubjectFilter}
          options={subjectFilterOptions}
          ariaLabel="Filter notes by subject"
        />

        <StudySelect
          className="notes-v2-toolbar-select"
          value={sortBy}
          onChange={setSortBy}
          options={sortOptions}
          ariaLabel="Sort notes"
        />

        <button
          type="button"
          className="notes-v2-refresh"
          onClick={() => fetchNotesHub(true)}
          disabled={refreshing || saving}
        >
          <RefreshCw size={15} className={refreshing ? "notes-v2-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      <section className="notes-v2-workspace">
        <aside className="notes-v2-sidebar">
          <div className="notes-v2-sidebar-header">
            <div>
              <strong>Your notes</strong>
              <span>
                {visibleNotes.length} {visibleNotes.length === 1 ? "note" : "notes"}
              </span>
            </div>
          </div>

          <div className="notes-v2-list">
            {loading ? (
              <div className="notes-v2-list-empty">
                <RefreshCw size={18} className="notes-v2-spin" />
                <span>Loading notes...</span>
              </div>
            ) : visibleNotes.length === 0 ? (
              <div className="notes-v2-list-empty">
                <FileText size={22} />
                <strong>{notes.length === 0 ? "No notes yet" : "No matches"}</strong>
                <span>
                  {notes.length === 0
                    ? "Create your first study note."
                    : "Try another search or filter."}
                </span>
              </div>
            ) : (
              visibleNotes.map((note) => {
                const isSelected =
                  String(selectedNote?._id || "") === String(note._id);
                const subjectName = getNoteSubjectName(note);
                const subjectColor = getNoteSubjectColor(note);

                return (
                  <button
                    key={note._id}
                    type="button"
                    className={`notes-v2-list-item ${isSelected ? "selected" : ""}`}
                    onClick={() => changeSelectedNote(note)}
                    style={{ "--note-subject-color": subjectColor }}
                  >
                    <div className="notes-v2-list-item-top">
                      <strong>{note.title || "Untitled Note"}</strong>
                      {note.pinned && <Pin size={12} />}
                    </div>
                    <p>{getPreview(note.content)}</p>
                    <div className="notes-v2-list-item-footer">
                      <span className="notes-v2-subject-chip">
                        <span className="notes-v2-subject-dot" />
                        {subjectName}
                      </span>
                      <span className="notes-v2-list-date">
                        {formatRelativeTime(note.updatedAt || note.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="notes-v2-sidebar-create"
            onClick={createNote}
            disabled={creating || saving}
          >
            <Plus size={15} />
            New note
          </button>
        </aside>

        <main className="notes-v2-editor">
          {selectedNote ? (
            <>
              <div className="notes-v2-editor-header">
                <div className="notes-v2-editor-status">
                  {selectedNote.pinned && (
                    <span className="notes-v2-pinned-badge">
                      <Pin size={12} /> Pinned
                    </span>
                  )}

                  {hasUnsavedChanges ? (
                    <span className="notes-v2-unsaved">Unsaved changes</span>
                  ) : (
                    <span className="notes-v2-saved">
                      <Check size={12} /> {savedMessage || "Saved"}
                    </span>
                  )}
                </div>

                <div className="notes-v2-editor-actions">
                  <button
                    type="button"
                    className={`notes-v2-icon-action ${selectedNote.pinned ? "active" : ""}`}
                    onClick={togglePinned}
                    disabled={pinning || saving}
                    title={selectedNote.pinned ? "Unpin note" : "Pin note"}
                    aria-label={selectedNote.pinned ? "Unpin note" : "Pin note"}
                  >
                    {selectedNote.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                  </button>

                  <button
                    type="button"
                    className="notes-v2-save-button"
                    onClick={saveNote}
                    disabled={saving || !hasUnsavedChanges}
                  >
                    <Save size={15} />
                    {saving ? "Saving..." : "Save"}
                  </button>

                  <button
                    type="button"
                    className="notes-v2-delete-button"
                    onClick={openDeleteModal}
                    disabled={deleting || saving}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>

              <input
                className="notes-v2-title-input"
                value={title}
                maxLength={160}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSavedMessage("");
                }}
                placeholder="Note title..."
              />

              <div className="notes-v2-meta">
                <StudySelect
                  className="notes-v2-editor-subject-select"
                  value={subjectId}
                  onChange={(nextValue) => {
                    setSubjectId(String(nextValue));
                    setSavedMessage("");
                  }}
                  options={editorSubjectOptions}
                  ariaLabel="Choose note subject"
                />

                <span className="notes-v2-meta-item">
                  <Type size={13} />
                  {currentWordCount} {currentWordCount === 1 ? "word" : "words"}
                </span>
                <span className="notes-v2-meta-item">
                  <FileText size={13} /> {currentCharacterCount} chars
                </span>
                <span className="notes-v2-meta-item">
                  <Clock3 size={13} /> Updated {formatRelativeTime(selectedNote.updatedAt || selectedNote.createdAt)}
                </span>
              </div>

              {currentSubject && (
                <div
                  className="notes-v2-subject-banner"
                  style={{
                    "--note-subject-color": currentSubject.color || "#6366f1",
                  }}
                >
                  <span className="notes-v2-subject-banner-icon">
                    <FolderOpen size={15} />
                  </span>
                  <div>
                    <strong>{currentSubject.name}</strong>
                    <span>
                      {currentSubject.code ? `${currentSubject.code} · ` : ""}
                      Linked subject
                    </span>
                  </div>
                </div>
              )}

              <textarea
                className="notes-v2-content-input"
                placeholder="Start writing your study notes..."
                value={content}
                maxLength={200000}
                onChange={(event) => {
                  setContent(event.target.value);
                  setSavedMessage("");
                }}
              />

              <div className="notes-v2-editor-footer">
                <span>Ctrl + S to save</span>
                <span>
                  {currentCharacterCount.toLocaleString()} / 200,000 characters
                </span>
              </div>
            </>
          ) : (
            <div className="notes-v2-no-selection">
              <div className="notes-v2-no-selection-icon">
                <FileText size={28} />
              </div>
              <span className="notes-v2-eyebrow">YOUR KNOWLEDGE BASE</span>
              <h2>No note selected</h2>
              <p>Create a note and connect it to one of your StudyOS subjects.</p>
              <button
                type="button"
                className="notes-v2-new-button"
                onClick={createNote}
                disabled={creating}
              >
                <Plus size={15} />
                {creating ? "Creating..." : "Create note"}
              </button>
            </div>
          )}
        </main>
      </section>

      {showDeleteModal && (
        <div
          className="delete-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              closeDeleteModal();
            }
          }}
        >
          <div
            className="delete-modal notes-v2-delete-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="delete-modal-icon">
              <Trash2 size={21} />
            </div>
            <div className="delete-modal-content">
              <h2>Delete note?</h2>
              <p>
                Permanently delete <strong>{selectedNote?.title || "Untitled Note"}</strong>?
              </p>
              <span>This action cannot be undone.</span>
            </div>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-cancel-button"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-confirm-button"
                onClick={deleteNote}
                disabled={deleting}
              >
                <Trash2 size={15} />
                {deleting ? "Deleting..." : "Delete note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteStat({ icon, label, value, description }) {
  return (
    <div className="notes-v2-stat">
      <div className="notes-v2-stat-top">
        <span className="notes-v2-stat-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <strong>{Number(value).toLocaleString()}</strong>
      <small>{description}</small>
    </div>
  );
}

export default Notes;
