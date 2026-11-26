import { WorkspaceSkeleton, WorkspaceEmpty } from "../components/WorkspaceStates";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  FileText,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
  Save,
  Trash2,
  X,
  AlertCircle,
  StickyNote,
} from "../components/icons";
import apiRequest, { readStudyData } from "../services/api";
import { createLocalId, localDb } from "../services/localDb";
import { useAuth } from "../context/AuthContext";
import StudySelect from "../components/StudySelect";
import "../styles/notes-phase2.css";

const RichNoteEditor = lazy(() => import("../components/RichNoteEditor"));

const idOf = (value) =>
  value && typeof value === "object"
    ? String(value._id || value.id || "")
    : String(value || "");

const words = (text) =>
  String(text || "").trim().split(/\s+/).filter(Boolean).length;

const dated = (value) => new Date(value || 0).getTime() || 0;

const timestamp = (note) =>
  dated(note.updatedAt || note.createdAt);

function updatedAgo(value) {
  const time = dated(value);
  if (!time) return "Recently";

  const elapsed = Math.max(0, Date.now() - time);

  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000)
    return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000)
    return `${Math.floor(elapsed / 3_600_000)}h ago`;
  if (elapsed < 604_800_000)
    return `${Math.floor(elapsed / 86_400_000)}d ago`;

  return new Date(time).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function NoteTile({ note, subject, active, onOpen }) {
  const text = String(note.content || "").trim();
  const preview = text ? text.slice(0, 600) : "Start writing your ideas…";

  return (
    <button
      type="button"
      className={`n3-tile${active ? " is-active" : ""}`}
      style={{
        "--n3-accent": subject?.color || "#858585",
      }}
      aria-current={active ? "true" : undefined}
      onClick={() => onOpen(note)}
    >
      <span className="n3-tile-top">
        <span className="n3-tile-icon">
          <FileText size={17} />
        </span>

        {note.pinned && (
          <Pin
            size={14}
            className="n3-tile-pin"
            aria-label="Pinned"
          />
        )}
      </span>

      <strong className="n3-tile-title">
        {note.title || "Untitled Note"}
      </strong>

      <span className="n3-tile-preview">
        {preview}
      </span>

      <span className="n3-tile-bottom">
        <span className="n3-subject-tag">
          <i />
          {subject?.name ||
            note.subjectName ||
            "Personal"}
        </span>

        <span>
          {updatedAgo(
            note.updatedAt || note.createdAt
          )}
        </span>
      </span>
    </button>
  );
}

export default function Notes() {
  const { isGuest } = useAuth();

  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedNote, setSelectedNote] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia("(max-width: 900px)").matches);

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

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  const selectedNoteRef = useRef(null);
  const savingRef = useRef(false);
  const editVersion = useRef(0);
  const titleInputRef = useRef(null);
  const focusNewTitle = useRef(false);

  const markEdited = () => {
    editVersion.current += 1;
    setSavedNotice("");
    setError("");
  };

  const subjectsById = useMemo(
    () =>
      new Map(
        subjects.map((subject) => [
          String(subject._id),
          subject,
        ])
      ),
    [subjects]
  );

  const subjectFor = (note) =>
    subjectsById.get(idOf(note?.subjectId));

  const selectNote = (note) => {
    selectedNoteRef.current = note;
    setSelectedNote(note);

    setTitle(note?.title || "");
    setContent(note?.content || "");
    setSubjectId(idOf(note?.subjectId));

    setSavedNotice("");
  };

  const loadNotes = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [noteData, subjectData] =
          await Promise.all([
            isGuest
              ? localDb.getAll("notes")
              : readStudyData("/api/notes", { fresh: manual }),

            isGuest
              ? localDb.getAll("subjects")
              : readStudyData("/api/subjects", { fresh: manual }),
          ]);

        const allNotes = Array.isArray(noteData)
          ? noteData
          : [];

        setNotes(allNotes);

        setSubjects(
          Array.isArray(subjectData)
            ? subjectData
            : []
        );

        const currentId = idOf(
          selectedNoteRef.current?._id
        );

        const next =
          allNotes.find(
            (note) =>
              idOf(note._id) === currentId
          ) ||
          allNotes[0] ||
          null;

        selectNote(next);
      } catch (failure) {
        console.error("Loading notes failed", failure);

        setError(
          failure?.message || "Could not load notes."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isGuest]
  );

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const refreshSubjects = async () => {
      try {
        const data = isGuest
          ? await localDb.getAll("subjects")
          : await readStudyData("/api/subjects", { fresh: true });

        setSubjects(
          Array.isArray(data) ? data : []
        );
      } catch (failure) {
        console.error(
          "Refreshing subjects failed",
          failure
        );
      }
    };

    window.addEventListener(
      "studyos-subjects-updated",
      refreshSubjects
    );

    return () => {
      window.removeEventListener(
        "studyos-subjects-updated",
        refreshSubjects
      );
    };
  }, [isGuest]);

  const dirty =
    Boolean(selectedNote) &&
    (title !== (selectedNote.title || "") ||
      content !== (selectedNote.content || "") ||
      subjectId !== idOf(selectedNote.subjectId));

  const saveNote = async ({
    pinned,
    silent = false,
  } = {}) => {
    if (
      !selectedNote ||
      savingRef.current ||
      refreshing ||
      creating ||
      deleting
    ) return false;

    if (content.length > 200000) {
      setError("Note exceeds the 200,000 character limit.");
      return false;
    }

    const savedVersion = editVersion.current;

    savingRef.current = true;
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: title.trim() || "Untitled Note",
        content,
        subjectId: subjectId || null,
        pinned:
          pinned === undefined
            ? Boolean(selectedNote.pinned)
            : Boolean(pinned),
      };

      let updated;

      if (isGuest) {
        updated = {
          ...selectedNote,
          ...payload,
          subjectName:
            subjectsById.get(subjectId)?.name || "",
          updatedAt: new Date().toISOString(),
        };

        await localDb.put("notes", updated);
      } else {
        updated = await apiRequest(
          `/api/notes/${selectedNote._id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      }

      setNotes((current) =>
        current.map((note) =>
          idOf(note._id) === idOf(updated._id)
            ? updated
            : note
        )
      );

      selectedNoteRef.current = updated;
      setSelectedNote(updated);

      const unchanged =
        editVersion.current === savedVersion;

      if (unchanged) {
        setTitle(updated.title || "");
        setContent(updated.content || "");
        setSubjectId(idOf(updated.subjectId));
      }

      if (!silent) {
        setSavedNotice("Saved");
      }

      window.dispatchEvent(
        new Event("studyos-notes-updated")
      );

      return unchanged;
    } catch (failure) {
      console.error("Saving note failed", failure);

      setError(
        failure?.message ||
          "Could not save the note."
      );

      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const openNote = async (note) => {
    if (
      savingRef.current ||
      creating ||
      deleting ||
      loading ||
      refreshing ||
      confirmDelete
    ) return;

    if (idOf(selectedNote?._id) === idOf(note._id)) {
      setEditorOpen(
        window.matchMedia("(max-width: 900px)").matches
      );
      return;
    }

    if (
      selectedNote &&
      idOf(selectedNote._id) !== idOf(note._id) &&
      dirty
    ) {
      const saved = await saveNote({
        silent: true,
      });

      if (!saved) return;
    }

    selectNote(note);

    setEditorOpen(
      window.matchMedia("(max-width: 900px)").matches
    );
  };

  const closeEditor = async () => {
    if (savingRef.current || deleting || refreshing) return;

    if (dirty) {
      const saved = await saveNote({
        silent: true,
      });

      if (!saved) return;
    }

    setEditorOpen(false);
  };

  const createNote = async () => {
    if (creating || savingRef.current || deleting || loading || refreshing) return;

    if (dirty) {
      const saved = await saveNote({
        silent: true,
      });

      if (!saved) return;
    }

    setCreating(true);
    setError("");

    try {
      const initialSubject =
        subjectFilter !== "all" &&
        subjectFilter !== "none"
          ? subjectFilter
          : "";

      const payload = {
        title: "Untitled Note",
        content: "",
        subjectId: initialSubject || null,
        pinned: false,
      };

      let newNote;

      if (isGuest) {
        const now = new Date().toISOString();

        newNote = {
          _id: createLocalId(),
          ...payload,
          subjectName:
            subjectsById.get(initialSubject)?.name ||
            "",
          createdAt: now,
          updatedAt: now,
        };

        await localDb.put("notes", newNote);
      } else {
        newNote = await apiRequest("/api/notes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setNotes((current) => [
        newNote,
        ...current,
      ]);

      setSearch("");

      if (subjectFilter === "none") {
        setSubjectFilter("all");
      }

      focusNewTitle.current = true;
      selectNote(newNote);

      setEditorOpen(
        window.matchMedia("(max-width: 900px)").matches
      );

      window.dispatchEvent(
        new Event("studyos-notes-updated")
      );
    } catch (failure) {
      console.error("Creating note failed", failure);

      setError(
        failure?.message ||
          "Could not create a note."
      );
    } finally {
      setCreating(false);
    }
  };

  const togglePin = async () => {
    if (!selectedNote || pinning || savingRef.current || refreshing || deleting) return;

    setPinning(true);

    try {
      const next = !selectedNote.pinned;

      const saved = await saveNote({
        pinned: next,
        silent: true,
      });

      if (saved) {
        setSavedNotice(
          next ? "Pinned" : "Unpinned"
        );
      }
    } finally {
      setPinning(false);
    }
  };

  const deleteNote = async () => {
    if (!selectedNote || deleting || savingRef.current || refreshing) return;

    setDeleting(true);
    setError("");

    try {
      const target = selectedNote._id;

      if (isGuest) {
        await localDb.remove("notes", target);
      } else {
        await apiRequest(
          `/api/notes/${target}`,
          { method: "DELETE" }
        );
      }

      const remaining = notes.filter(
        (note) =>
          idOf(note._id) !== idOf(target)
      );

      setNotes(remaining);
      selectNote(remaining[0] || null);

      setEditorOpen(false);
      setConfirmDelete(false);

      window.dispatchEvent(
        new Event("studyos-notes-updated")
      );
    } catch (failure) {
      console.error("Deleting note failed", failure);

      setError(
        failure?.message ||
          "Could not delete the note."
      );
    } finally {
      setDeleting(false);
    }
  };

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes
      .filter((note) => {
        const sid = idOf(note.subjectId);

        if (subjectFilter === "none" && sid)
          return false;

        if (
          subjectFilter !== "all" &&
          subjectFilter !== "none" &&
          sid !== subjectFilter
        ) {
          return false;
        }

        if (!query) return true;

        return [
          note.title,
          note.content,
          subjectsById.get(sid)?.name,
          note.subjectName,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return Number(b.pinned) - Number(a.pinned);
        }

        if (sortBy === "title") {
          return String(a.title || "").localeCompare(
            String(b.title || "")
          );
        }

        if (sortBy === "created") {
          return (
            dated(b.createdAt) -
            dated(a.createdAt)
          );
        }

        if (sortBy === "words") {
          return (
            words(b.content) -
            words(a.content)
          );
        }

        return timestamp(b) - timestamp(a);
      });
  }, [
    notes,
    search,
    sortBy,
    subjectFilter,
    subjectsById,
  ]);

  const subjectOptions = useMemo(
    () => [
      { value: "all", label: "All subjects" },
      { value: "none", label: "Unassigned" },

      ...subjects.map((subject) => ({
        value: String(subject._id),
        label: subject.name,
        description: subject.code || undefined,
        color: subject.color || "#858585",
      })),
    ],
    [subjects]
  );

  const editorSubjectOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...subjectOptions.slice(2),
    ],
    [subjectOptions]
  );

  const sortOptions = [
    { value: "updated", label: "Last edited" },
    { value: "created", label: "Newest" },
    { value: "title", label: "Title A–Z" },
    { value: "words", label: "Most words" },
  ];

  const pinnedCount = notes.filter(
    (note) => note.pinned
  ).length;

  useEffect(() => {
    if (!editorOpen) return;

    const previous =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [editorOpen]);

  useEffect(() => {
    const onKey = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        if (!selectedNote || !dirty) return;

        event.preventDefault();

        if (!saving) saveNote();
      }

      if (
        event.key === "Escape" &&
        confirmDelete &&
        !deleting
      ) {
        setConfirmDelete(false);
      } else if (
        event.key === "Escape" &&
        editorOpen &&
        !confirmDelete
      ) {
        closeEditor();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });

  useEffect(() => {
    if (
      !dirty ||
      saving ||
      creating ||
      deleting ||
      pinning ||
      refreshing ||
      loading ||
      confirmDelete ||
      error
    ) return;

    const timer = window.setTimeout(() => {
      saveNote({ silent: true });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    dirty,
    title,
    content,
    subjectId,
    selectedNote,
    subjectsById,
    isGuest,
    saving,
    creating,
    deleting,
    pinning,
    refreshing,
    loading,
    confirmDelete,
    error,
  ]);

  useEffect(() => {
    if (!dirty && !saving) return;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () =>
      window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  useEffect(() => {
    if (!focusNewTitle.current || creating) return;

    focusNewTitle.current = false;

    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedNote, creating, editorOpen]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");

    const onResize = () => {
      setMobileLayout(query.matches);
      if (!query.matches) setEditorOpen(false);
    };

    query.addEventListener("change", onResize);

    return () =>
      query.removeEventListener("change", onResize);
  }, []);

  return (
    <div className="n3-page n3-clean">
      <header className="n3-header">
        <div>
          <span className="n3-eyebrow">
            YOUR WORKSPACE
          </span>

          <h1>Notes</h1>

          <p>
            A home for everything worth remembering.
          </p>
        </div>

        <button
          className="n3-new"
          type="button"
          onClick={createNote}
          disabled={creating || saving || loading || refreshing || deleting}
        >
          <Plus size={19} />

          <span>
            {creating ? "Creating…" : "New note"}
          </span>
        </button>
      </header>

      {error && (
        <div className="n3-error" role="alert">
          <AlertCircle size={17} />

          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div
        className={`n3-workspace${
          selectedNote ? "" : " is-empty"
        }`}
      >
        <section
          className="n3-library"
          aria-label="Your notes"
        >
      <div
        className="n3-summary"
        aria-label="Note library summary"
      >
        <span>
          <StickyNote size={15} />
          <strong>{loading ? "—" : notes.length}</strong> notes
        </span>

        <span>
          <Pin size={15} />
          <strong>{loading ? "—" : pinnedCount}</strong> pinned
        </span>

        <button
          type="button"
          onClick={() => loadNotes(true)}
          disabled={loading || refreshing || saving || dirty || creating || deleting}
          title="Refresh notes"
        >
          <RefreshCw
            size={16}
            className={
              refreshing ? "n3-spin" : ""
            }
          />

          Refresh
        </button>
      </div>

      <section
        className="n3-controls"
        aria-label="Find notes"
      >
        <label className="n3-search">
          <Search size={18} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search your notes"
            aria-label="Search notes"
          />

          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={16} />
            </button>
          )}
        </label>

        <StudySelect
          className="n3-select"
          value={subjectFilter}
          onChange={setSubjectFilter}
          options={subjectOptions}
          ariaLabel="Filter by subject"
        />

        <StudySelect
          className="n3-select"
          value={sortBy}
          onChange={setSortBy}
          options={sortOptions}
          ariaLabel="Sort notes"
        />
      </section>


          <div className="n3-library-heading">
            <h2>Your notes</h2>

            <span>
              {loading ? "—" : visibleNotes.length}
            </span>
          </div>

          {loading ? (
            <WorkspaceSkeleton kind="notes" />
          ) : visibleNotes.length === 0 ? (
            <WorkspaceEmpty
              icon={<BookOpen size={24} />}
              title={notes.length ? "No matching notes" : "Your ideas start here"}
              description={notes.length ? "Try another keyword or subject." : "Write something down and find it here anytime."}
              action={!notes.length && (
                <button className="n3-empty-action" type="button" disabled={creating} onClick={createNote}>
                  <Plus size={17} /> Create your first note
                </button>
              )}
            />
          ) : (
            <div className="n3-masonry">

              {[
                {
                  label: "Pinned",
                  items: visibleNotes.filter((note) => note.pinned),
                },
                {
                  label: "All notes",
                  items: visibleNotes.filter((note) => !note.pinned),
                },
              ].map((group) =>
                group.items.length > 0 ? (
                  <div
                    className="nr-note-group"
                    key={group.label}
                  >

                    <div className="nr-group-label">
                      {group.label}
                    </div>

                    {group.items.map((note) => (
                      <NoteTile
                        key={note._id}
                        note={note}
                        subject={subjectFor(note)}
                        active={
                          idOf(selectedNote?._id) === idOf(note._id)
                        }
                        onOpen={openNote}
                      />
                    ))}

                  </div>
                ) : null
              )}

            </div>
          )}
        </section>

        {!selectedNote && (
          <div className="nr-no-document">
            <BookOpen size={30} />
            <h2>No note selected</h2>
            <p>Create a note to start writing.</p>
          </div>
        )}

        {selectedNote && (editorOpen || !mobileLayout) && (
          <div
            className={`n3-editor-layer${
              editorOpen ? " is-open" : ""
            }`}
          >
            <div
              className="n3-editor-backdrop"
              onClick={closeEditor}
              aria-hidden="true"
            />

            <section
              className="n3-editor"
              role={
                editorOpen ? "dialog" : undefined
              }
              aria-modal={
                editorOpen ? "true" : undefined
              }
              aria-label="Note editor"
            >
              <div
                className="n3-sheet-handle"
                aria-hidden="true"
              />

              <div className="n3-editor-bar">
                <button
                  type="button"
                  className="n3-back"
                  onClick={closeEditor}
                  aria-label="Back to notes"
                >
                  <ArrowLeft size={20} />
                </button>

                <span
                  className={`n3-save-status${dirty && error ? " is-error" : saving || dirty ? " is-pending" : " is-saved"}`}
                  role="status"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="n3-spin" />
                      Saving...
                    </>
                  ) : dirty ? (
                    error ? "Save failed" : "Unsaved changes"
                  ) : (
                    <>
                      <Check size={15} />
                      {savedNotice || "Saved"}
                    </>
                  )}
                </span>

                <div className="n3-editor-tools">
                  <button
                    type="button"
                    onClick={togglePin}
                    disabled={pinning || saving}
                    aria-label={
                      selectedNote.pinned
                        ? "Unpin note"
                        : "Pin note"
                    }
                    title={
                      selectedNote.pinned
                        ? "Unpin"
                        : "Pin"
                    }
                  >
                    {selectedNote.pinned ? (
                      <PinOff size={19} />
                    ) : (
                      <Pin size={19} />
                    )}
                  </button>

                  <button
                    type="button"
                    className="n3-delete-trigger"
                    onClick={() =>
                      setConfirmDelete(true)
                    }
                    disabled={deleting || saving}
                    aria-label="Delete note"
                    title="Delete"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
              </div>

              <div className="n3-editor-scroll">
                <input
                  className="n3-title-input"
                  ref={titleInputRef}
                  type="text"
                  maxLength={160}
                  value={title}
                  placeholder="Untitled note"
                  onChange={(event) => {
                    setTitle(event.target.value);
                    markEdited();
                  }}
                  aria-label="Note title"
                />

                <div className="n3-note-meta">
                  <StudySelect
                    className="n3-editor-select"
                    value={subjectId}
                    onChange={(value) => {
                      setSubjectId(String(value));
                      markEdited();
                    }}
                    options={editorSubjectOptions}
                    ariaLabel="Choose note subject"
                  />

                  <span>
                    <Clock3 size={14} />

                    {updatedAgo(
                      selectedNote.updatedAt ||
                        selectedNote.createdAt
                    )}
                  </span>
                </div>

                <div className="n3-editor-paper">

                  <Suspense fallback={<WorkspaceSkeleton count={3} label="note editor" />}>
                    <RichNoteEditor
                      key={idOf(selectedNote._id)}
                      value={content}
                      onChange={(value) => {
                        setContent(value);
                        markEdited();
                      }}
                    />
                  </Suspense>

                </div>

                <div className="n3-editor-count">
                  <span>
                    {words(content)} words
                  </span>

                  <span>
                    {content.length.toLocaleString(
                      "en-IN"
                    )} characters
                  </span>
                </div>
              </div>

              <div className="n3-editor-footer">
                <span
                  className={`n3-footer-hint${error && dirty ? " is-error" : ""}`}
                >
                  {error && dirty
                    ? error
                    : "Autosave enabled"}
                </span>

                <button
                  type="button"
                  className="n3-save"
                  onClick={() => saveNote()}
                  disabled={!dirty || saving}
                >
                  <Save size={17} />

                  {saving
                    ? "Saving…"
                    : "Save note"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {confirmDelete && selectedNote && (
        <div
          className="n3-confirm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !deleting
            ) {
              setConfirmDelete(false);
            }
          }}
        >
          <section
            className="n3-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="n3-confirm-heading"
            aria-describedby="n3-confirm-desc"
          >
            <span className="n3-confirm-icon">
              <Trash2 size={22} />
            </span>

            <h2 id="n3-confirm-heading">
              Delete this note?
            </h2>

            <p id="n3-confirm-desc">
              “
              {selectedNote.title ||
                "Untitled Note"}
              ” will be permanently deleted.
            </p>

            <div>
              <button
                type="button"
                onClick={() =>
                  setConfirmDelete(false)
                }
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="is-danger"
                type="button"
                onClick={deleteNote}
                disabled={deleting}
              >
                {deleting
                  ? "Deleting…"
                  : "Delete note"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
