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

import {
  useAuth,
} from "../context/AuthContext";

import StudySelect from "../components/StudySelect";

import "../styles/notes-v2.css";


// =========================================================
// HELPERS
// =========================================================

const getId = (
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

  return String(value);
};


const safeDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};


const formatRelativeTime = (
  value
) => {
  const date =
    safeDate(value);

  if (!date) {
    return "Unknown";
  }

  const now =
    new Date();

  const diff =
    now.getTime() -
    date.getTime();

  const minute =
    60 * 1000;

  const hour =
    minute * 60;

  const day =
    hour * 24;

  if (
    diff < minute
  ) {
    return "Just now";
  }

  if (
    diff < hour
  ) {
    return `${Math.floor(
      diff / minute
    )}m ago`;
  }

  if (
    diff < day
  ) {
    return `${Math.floor(
      diff / hour
    )}h ago`;
  }

  if (
    diff <
    day * 7
  ) {
    return `${Math.floor(
      diff / day
    )}d ago`;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",

      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    }
  );
};


const getWordCount = (
  value
) => {
  const clean =
    String(
      value ||
        ""
    ).trim();

  return clean
    ? clean
        .split(/\s+/)
        .filter(Boolean)
        .length
    : 0;
};


const getPreview = (
  content
) => {
  const clean =
    String(
      content ||
        ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (!clean) {
    return "Empty note";
  }

  return clean.length <=
    120
    ? clean
    : `${clean.slice(
        0,
        120
      )}…`;
};


// =========================================================
// NOTES
// =========================================================

function Notes() {
  const {
    isGuest,
  } = useAuth();


  // =======================================================
  // DATA
  // =======================================================

  const [
    notes,
    setNotes,
  ] = useState([]);

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    selectedNote,
    setSelectedNote,
  ] = useState(null);


  // =======================================================
  // EDITOR
  // =======================================================

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    subjectId,
    setSubjectId,
  ] = useState("");


  // =======================================================
  // FILTERS
  // =======================================================

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    subjectFilter,
    setSubjectFilter,
  ] = useState(
    "all"
  );

  const [
    sortBy,
    setSortBy,
  ] = useState(
    "updated"
  );


  // =======================================================
  // STATE
  // =======================================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    pinning,
    setPinning,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    savedMessage,
    setSavedMessage,
  ] = useState("");

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);


  // =======================================================
  // SUBJECT MAP
  // =======================================================

  const subjectMap =
    useMemo(() => {
      const map =
        new Map();

      subjects.forEach(
        (
          subject
        ) => {
          map.set(
            String(
              subject._id
            ),
            subject
          );
        }
      );

      return map;
    }, [
      subjects,
    ]);


  const getNoteSubject =
    (
      note
    ) => {
      const id =
        getId(
          note?.subjectId
        );

      return id
        ? subjectMap.get(
            id
          ) ||
            null
        : null;
    };


  const getNoteSubjectName =
    (
      note
    ) => {
      const subject =
        getNoteSubject(
          note
        );

      return (
        subject?.name ||
        note?.subjectName ||
        "Unassigned"
      );
    };


  const getNoteSubjectColor =
    (
      note
    ) => {
      return (
        getNoteSubject(
          note
        )?.color ||
        "#64748b"
      );
    };


  // =======================================================
  // SELECT
  // =======================================================

  const selectNote =
    (
      note
    ) => {
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

      setSubjectId(
        getId(
          note?.subjectId
        )
      );

      setSavedMessage("");
    };


  // =======================================================
  // LOAD
  // =======================================================

  const fetchNotesHub =
    async (
      manual = false
    ) => {
      try {
        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          noteData,
          subjectData,
        ] =
          await Promise.all([
            isGuest
              ? localDb.getAll(
                  "notes"
                )
              : apiRequest(
                  "/api/notes"
                ),

            isGuest
              ? localDb.getAll(
                  "subjects"
                )
              : apiRequest(
                  "/api/subjects"
                ),
          ]);

        let safeNotes =
          Array.isArray(
            noteData
          )
            ? noteData
            : [];

        const safeSubjects =
          Array.isArray(
            subjectData
          )
            ? subjectData
            : [];

        if (
          isGuest
        ) {
          safeNotes =
            [
              ...safeNotes,
            ].sort(
              (
                first,
                second
              ) => {
                const pinDiff =
                  Number(
                    Boolean(
                      second.pinned
                    )
                  ) -
                  Number(
                    Boolean(
                      first.pinned
                    )
                  );

                if (
                  pinDiff
                ) {
                  return pinDiff;
                }

                return (
                  new Date(
                    second.updatedAt ||
                      second.createdAt ||
                      0
                  ) -
                  new Date(
                    first.updatedAt ||
                      first.createdAt ||
                      0
                  )
                );
              }
            );
        }

        setNotes(
          safeNotes
        );

        setSubjects(
          safeSubjects
        );

        const currentId =
          selectedNote?._id;

        if (
          currentId
        ) {
          const refreshed =
            safeNotes.find(
              (
                note
              ) =>
                String(
                  note._id
                ) ===
                String(
                  currentId
                )
            );

          if (
            refreshed
          ) {
            selectNote(
              refreshed
            );

            return;
          }
        }

        if (
          safeNotes.length
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
          setSubjectId("");
        }
      } catch (
        loadError
      ) {
        console.error(
          "Failed to load Notes:",
          loadError
        );

        setError(
          loadError?.message ||
            "Failed to load notes."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };


  useEffect(() => {
    fetchNotesHub();
  }, [
    isGuest,
  ]);


  // =======================================================
  // SUBJECT UPDATES
  // =======================================================

  useEffect(() => {
    const refreshSubjects =
      async () => {
        try {
          const data =
            isGuest
              ? await localDb.getAll(
                  "subjects"
                )
              : await apiRequest(
                  "/api/subjects"
                );

          setSubjects(
            Array.isArray(
              data
            )
              ? data
              : []
          );
        } catch (
          refreshError
        ) {
          console.error(
            "Failed to refresh note subjects:",
            refreshError
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
  }, [
    isGuest,
  ]);


  // =======================================================
  // CHANGES
  // =======================================================

  const hasUnsavedChanges =
    useMemo(() => {
      if (
        !selectedNote
      ) {
        return false;
      }

      return (
        title !==
          (
            selectedNote.title ||
            ""
          ) ||
        content !==
          (
            selectedNote.content ||
            ""
          ) ||
        subjectId !==
          getId(
            selectedNote.subjectId
          )
      );
    }, [
      selectedNote,
      title,
      content,
      subjectId,
    ]);


  const buildCurrentPayload =
    (
      pinnedOverride
    ) => {
      const selectedSubject =
        subjectId
          ? subjectMap.get(
              String(
                subjectId
              )
            )
          : null;

      return {
        title:
          title.trim() ||
          "Untitled Note",

        content,

        subjectId:
          subjectId ||
          null,

        subjectName:
          selectedSubject?.name ||
          "",

        pinned:
          pinnedOverride !==
          undefined
            ? Boolean(
                pinnedOverride
              )
            : Boolean(
                selectedNote
                  ?.pinned
              ),
      };
    };


  // =======================================================
  // SAVE
  // =======================================================

  const saveCurrentNote =
    async ({
      silent = false,
      pinnedOverride,
    } = {}) => {
      if (
        !selectedNote ||
        saving
      ) {
        return false;
      }

      try {
        setSaving(true);
        setError("");

        if (
          !silent
        ) {
          setSavedMessage("");
        }

        const noteData =
          buildCurrentPayload(
            pinnedOverride
          );

        let updatedNote;

        if (
          isGuest
        ) {
          const now =
            new Date()
              .toISOString();

          updatedNote = {
            ...selectedNote,
            ...noteData,

            _id:
              selectedNote._id,

            createdAt:
              selectedNote.createdAt ||
              now,

            updatedAt:
              now,
          };

          await localDb.put(
            "notes",
            updatedNote
          );
        } else {
          updatedNote =
            await apiRequest(
              `/api/notes/${selectedNote._id}`,
              {
                method:
                  "PUT",

                body:
                  JSON.stringify({
                    title:
                      noteData.title,

                    content:
                      noteData.content,

                    subjectId:
                      noteData.subjectId,

                    pinned:
                      noteData.pinned,
                  }),
              }
            );
        }

        setNotes(
          (
            current
          ) =>
            current.map(
              (
                note
              ) =>
                String(
                  note._id
                ) ===
                String(
                  updatedNote._id
                )
                  ? updatedNote
                  : note
            )
        );

        selectNote(
          updatedNote
        );

        if (
          !silent
        ) {
          setSavedMessage(
            "Saved"
          );

          window.setTimeout(
            () =>
              setSavedMessage(
                ""
              ),
            1800
          );
        }

        window.dispatchEvent(
          new Event(
            "studyos-notes-updated"
          )
        );

        return true;
      } catch (
        saveError
      ) {
        console.error(
          "Failed to save note:",
          saveError
        );

        setError(
          saveError?.message ||
            "Failed to save note."
        );

        return false;
      } finally {
        setSaving(false);
      }
    };


  const saveNote =
    async () => {
      await saveCurrentNote({
        silent:
          false,
      });
    };


  // =======================================================
  // SWITCH NOTE
  // =======================================================

  const changeSelectedNote =
    async (
      note
    ) => {
      if (
        String(
          selectedNote?._id ||
            ""
        ) ===
        String(
          note?._id ||
            ""
        )
      ) {
        return;
      }

      if (
        saving ||
        creating ||
        deleting
      ) {
        return;
      }

      if (
        selectedNote &&
        hasUnsavedChanges
      ) {
        const saved =
          await saveCurrentNote({
            silent:
              true,
          });

        if (
          !saved
        ) {
          return;
        }
      }

      selectNote(
        note
      );
    };


  // =======================================================
  // CREATE
  // =======================================================

  const createNote =
    async () => {
      if (
        creating ||
        saving
      ) {
        return;
      }

      try {
        if (
          selectedNote &&
          hasUnsavedChanges
        ) {
          const saved =
            await saveCurrentNote({
              silent:
                true,
            });

          if (
            !saved
          ) {
            return;
          }
        }

        setCreating(true);
        setError("");

        const noteTitle =
          `Untitled Note ${
            notes.length + 1
          }`;

        const initialSubjectId =
          subjectFilter !==
            "all" &&
          subjectFilter !==
            "none"
            ? subjectFilter
            : "";

        const initialSubject =
          initialSubjectId
            ? subjectMap.get(
                String(
                  initialSubjectId
                )
              )
            : null;

        let newNote;

        if (
          isGuest
        ) {
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

            subjectId:
              initialSubjectId ||
              null,

            subjectName:
              initialSubject?.name ||
              "",

            pinned:
              false,

            createdAt:
              now,

            updatedAt:
              now,
          };

          await localDb.put(
            "notes",
            newNote
          );
        } else {
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

                    subjectId:
                      initialSubjectId ||
                      null,

                    pinned:
                      false,
                  }),
              }
            );
        }

        setNotes(
          (
            current
          ) => [
            newNote,
            ...current,
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
      } catch (
        createError
      ) {
        console.error(
          "Failed to create note:",
          createError
        );

        setError(
          createError?.message ||
            "Failed to create note."
        );
      } finally {
        setCreating(false);
      }
    };


  // =======================================================
  // PIN
  // =======================================================

  const togglePinned =
    async () => {
      if (
        !selectedNote ||
        pinning ||
        saving
      ) {
        return;
      }

      const nextPinned =
        !Boolean(
          selectedNote.pinned
        );

      try {
        setPinning(true);

        const saved =
          await saveCurrentNote({
            silent:
              true,

            pinnedOverride:
              nextPinned,
          });

        if (
          saved
        ) {
          setSavedMessage(
            nextPinned
              ? "Pinned"
              : "Unpinned"
          );

          window.setTimeout(
            () =>
              setSavedMessage(
                ""
              ),
            1600
          );
        }
      } finally {
        setPinning(false);
      }
    };


  // =======================================================
  // DELETE
  // =======================================================

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
      if (
        !deleting
      ) {
        setShowDeleteModal(
          false
        );
      }
    };


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

        if (
          isGuest
        ) {
          await localDb.remove(
            "notes",
            noteId
          );
        } else {
          await apiRequest(
            `/api/notes/${noteId}`,
            {
              method:
                "DELETE",
            }
          );
        }

        const remaining =
          notes.filter(
            (
              note
            ) =>
              String(
                note._id
              ) !==
              String(
                noteId
              )
          );

        setNotes(
          remaining
        );

        if (
          remaining.length
        ) {
          selectNote(
            remaining[0]
          );
        } else {
          setSelectedNote(
            null
          );

          setTitle("");
          setContent("");
          setSubjectId("");
        }

        setShowDeleteModal(
          false
        );

        window.dispatchEvent(
          new Event(
            "studyos-notes-updated"
          )
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Failed to delete note:",
          deleteError
        );

        setError(
          deleteError?.message ||
            "Failed to delete note."
        );
      } finally {
        setDeleting(false);
      }
    };


  // =======================================================
  // FILTERED NOTES
  // =======================================================

  const visibleNotes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        notes.filter(
          (
            note
          ) => {
            const noteSubjectId =
              getId(
                note.subjectId
              );

            if (
              subjectFilter ===
                "none" &&
              noteSubjectId
            ) {
              return false;
            }

            if (
              subjectFilter !==
                "all" &&
              subjectFilter !==
                "none" &&
              noteSubjectId !==
                subjectFilter
            ) {
              return false;
            }

            if (
              !query
            ) {
              return true;
            }

            return [
              note.title,
              note.content,
              getNoteSubjectName(
                note
              ),
            ]
              .filter(Boolean)
              .some(
                (
                  value
                ) =>
                  String(
                    value
                  )
                    .toLowerCase()
                    .includes(
                      query
                    )
              );
          }
        );

      return [
        ...filtered,
      ].sort(
        (
          first,
          second
        ) => {
          const pinDiff =
            Number(
              Boolean(
                second.pinned
              )
            ) -
            Number(
              Boolean(
                first.pinned
              )
            );

          if (
            pinDiff
          ) {
            return pinDiff;
          }

          if (
            sortBy ===
            "title"
          ) {
            return String(
              first.title ||
                ""
            ).localeCompare(
              String(
                second.title ||
                  ""
              )
            );
          }

          if (
            sortBy ===
            "created"
          ) {
            return (
              new Date(
                second.createdAt ||
                  0
              ) -
              new Date(
                first.createdAt ||
                  0
              )
            );
          }

          if (
            sortBy ===
            "words"
          ) {
            return (
              getWordCount(
                second.content
              ) -
              getWordCount(
                first.content
              )
            );
          }

          return (
            new Date(
              second.updatedAt ||
                second.createdAt ||
                0
            ) -
            new Date(
              first.updatedAt ||
                first.createdAt ||
                0
            )
          );
        }
      );
    }, [
      notes,
      search,
      subjectFilter,
      sortBy,
      subjectMap,
    ]);


  // =======================================================
  // STATS
  // =======================================================

  const noteStats =
    useMemo(() => {
      return {
        total:
          notes.length,

        pinned:
          notes.filter(
            (
              note
            ) =>
              Boolean(
                note.pinned
              )
          ).length,

        linked:
          notes.filter(
            (
              note
            ) =>
              Boolean(
                getId(
                  note.subjectId
                )
              )
          ).length,

        words:
          notes.reduce(
            (
              total,
              note
            ) =>
              total +
              getWordCount(
                note.content
              ),
            0
          ),
      };
    }, [
      notes,
    ]);


  const currentWordCount =
    useMemo(
      () =>
        getWordCount(
          content
        ),
      [
        content,
      ]
    );


  const currentCharacterCount =
    content.length;


  const currentSubject =
    subjectId
      ? subjectMap.get(
          String(
            subjectId
          )
        )
      : null;


  // =======================================================
  // OPTIONS
  // =======================================================

  const subjectFilterOptions =
    useMemo(
      () => [
        {
          value:
            "all",

          label:
            "All subjects",
        },

        {
          value:
            "none",

          label:
            "Unassigned",
        },

        ...subjects.map(
          (
            subject
          ) => ({
            value:
              String(
                subject._id
              ),

            label:
              subject.name,

            description:
              subject.code ||
              undefined,

            color:
              subject.color ||
              "#64748b",
          })
        ),
      ],
      [
        subjects,
      ]
    );


  const sortOptions = [
    {
      value:
        "updated",

      label:
        "Recently updated",
    },
    {
      value:
        "created",

      label:
        "Recently created",
    },
    {
      value:
        "title",

      label:
        "Title A–Z",
    },
    {
      value:
        "words",

      label:
        "Most words",
    },
  ];


  const editorSubjectOptions =
    useMemo(
      () => [
        {
          value:
            "",

          label:
            "Unassigned",
        },

        ...subjects.map(
          (
            subject
          ) => ({
            value:
              String(
                subject._id
              ),

            label:
              subject.name,

            description:
              subject.code ||
              undefined,

            color:
              subject.color ||
              "#64748b",
          })
        ),
      ],
      [
        subjects,
      ]
    );


  // =======================================================
  // KEYBOARD SAVE
  // =======================================================

  useEffect(() => {
    const handleKeyboard =
      (
        event
      ) => {
        if (
          (
            event.ctrlKey ||
            event.metaKey
          ) &&
          event.key
            .toLowerCase() ===
            "s"
        ) {
          event.preventDefault();

          if (
            selectedNote &&
            !saving
          ) {
            saveNote();
          }
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
  }, [
    selectedNote,
    saving,
    title,
    content,
    subjectId,
  ]);


  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="v2n-page">

      {/* HEADER */}

      <header className="v2n-header">

        <div>

          <span className="v2n-eyebrow">
            Knowledge workspace
          </span>

          <h1>
            Notes
          </h1>

          <p>
            Capture ideas, organize study material
            and connect your notes to subjects.
          </p>

        </div>


        <button
          type="button"
          className="v2n-primary-button"
          onClick={
            createNote
          }
          disabled={
            creating ||
            saving
          }
        >
          <Plus size={17} />

          {creating
            ? "Creating..."
            : "New note"}
        </button>

      </header>


      {/* ERROR */}

      {error && (
        <div className="v2n-error">

          <AlertTriangle
            size={17}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>

        </div>
      )}


      {/* STATS */}

      <section className="v2n-stats">

        <NoteStat
          icon={
            <FileText
              size={19}
            />
          }
          label="Notes"
          value={
            noteStats.total
          }
          description="Total notes"
        />

        <NoteStat
          icon={
            <Pin
              size={19}
            />
          }
          label="Pinned"
          value={
            noteStats.pinned
          }
          description="Important notes"
        />

        <NoteStat
          icon={
            <Link2
              size={19}
            />
          }
          label="Linked"
          value={
            noteStats.linked
          }
          description="Connected to subjects"
        />

        <NoteStat
          icon={
            <Type
              size={19}
            />
          }
          label="Words"
          value={
            noteStats.words
          }
          description="Across all notes"
        />

      </section>


      {/* TOOLBAR */}

      <section className="v2n-toolbar">

        <label className="v2n-search">

          <Search
            size={17}
          />

          <input
            type="text"
            placeholder="Search notes..."
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}

        </label>


        <StudySelect
          className="v2n-toolbar-select"
          value={
            subjectFilter
          }
          onChange={
            setSubjectFilter
          }
          options={
            subjectFilterOptions
          }
          ariaLabel="Filter notes by subject"
        />


        <StudySelect
          className="v2n-toolbar-select"
          value={
            sortBy
          }
          onChange={
            setSortBy
          }
          options={
            sortOptions
          }
          ariaLabel="Sort notes"
        />


        <button
          type="button"
          className="v2n-refresh"
          onClick={() =>
            fetchNotesHub(
              true
            )
          }
          disabled={
            refreshing ||
            saving
          }
        >

          <RefreshCw
            size={16}
            className={
              refreshing
                ? "v2n-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}

        </button>

      </section>


      {/* WORKSPACE */}

      <section className="v2n-workspace">

        {/* NOTE LIST */}

        <aside className="v2n-list-panel">

          <div className="v2n-list-header">

            <div>

              <span className="v2n-eyebrow">
                Library
              </span>

              <strong>
                Your notes
              </strong>

            </div>

            <span className="v2n-note-count">
              {visibleNotes.length}
            </span>

          </div>


          <div className="v2n-list">

            {loading ? (

              <div className="v2n-list-empty">

                <RefreshCw
                  size={20}
                  className="v2n-spin"
                />

                <strong>
                  Loading notes
                </strong>

                <span>
                  Preparing your workspace.
                </span>

              </div>

            ) : visibleNotes.length ===
              0 ? (

              <div className="v2n-list-empty">

                <FileText
                  size={25}
                />

                <strong>
                  {notes.length ===
                  0
                    ? "No notes yet"
                    : "No matches"}
                </strong>

                <span>
                  {notes.length ===
                  0
                    ? "Create your first study note."
                    : "Try another search or filter."}
                </span>

              </div>

            ) : (

              visibleNotes.map(
                (
                  note
                ) => {
                  const isSelected =
                    String(
                      selectedNote?._id ||
                        ""
                    ) ===
                    String(
                      note._id
                    );

                  const subjectName =
                    getNoteSubjectName(
                      note
                    );

                  const subjectColor =
                    getNoteSubjectColor(
                      note
                    );

                  return (
                    <button
                      key={
                        note._id
                      }
                      type="button"
                      className={`v2n-note-item ${
                        isSelected
                          ? "is-selected"
                          : ""
                      }`}
                      onClick={() =>
                        changeSelectedNote(
                          note
                        )
                      }
                      style={{
                        "--note-color":
                          subjectColor,
                      }}
                    >

                      <div className="v2n-note-item-top">

                        <strong>
                          {note.title ||
                            "Untitled Note"}
                        </strong>

                        {note.pinned && (
                          <Pin
                            size={14}
                          />
                        )}

                      </div>


                      <p>
                        {getPreview(
                          note.content
                        )}
                      </p>


                      <div className="v2n-note-item-footer">

                        <span className="v2n-note-subject">

                          <span className="v2n-note-dot" />

                          {subjectName}

                        </span>

                        <span>
                          {formatRelativeTime(
                            note.updatedAt ||
                              note.createdAt
                          )}
                        </span>

                      </div>

                    </button>
                  );
                }
              )

            )}

          </div>


          <div className="v2n-list-footer">

            <button
              type="button"
              className="v2n-list-create"
              onClick={
                createNote
              }
              disabled={
                creating ||
                saving
              }
            >
              <Plus size={16} />
              New note
            </button>

          </div>

        </aside>


        {/* EDITOR */}

        <main className="v2n-editor">

          {selectedNote ? (
            <>

              {/* EDITOR TOP */}

              <div className="v2n-editor-top">

                <div className="v2n-editor-status">

                  {selectedNote.pinned && (
                    <span className="v2n-status-badge">

                      <Pin
                        size={13}
                      />

                      Pinned

                    </span>
                  )}


                  {hasUnsavedChanges ? (
                    <span className="v2n-unsaved">
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="v2n-saved">

                      <Check
                        size={13}
                      />

                      {savedMessage ||
                        "Saved"}

                    </span>
                  )}

                </div>


                <div className="v2n-editor-actions">

                  <button
                    type="button"
                    className={`v2n-icon-button ${
                      selectedNote.pinned
                        ? "is-active"
                        : ""
                    }`}
                    onClick={
                      togglePinned
                    }
                    disabled={
                      pinning ||
                      saving
                    }
                    title={
                      selectedNote.pinned
                        ? "Unpin note"
                        : "Pin note"
                    }
                    aria-label={
                      selectedNote.pinned
                        ? "Unpin note"
                        : "Pin note"
                    }
                  >
                    {selectedNote.pinned
                      ? (
                        <PinOff
                          size={17}
                        />
                      )
                      : (
                        <Pin
                          size={17}
                        />
                      )}
                  </button>


                  <button
                    type="button"
                    className="v2n-save-button"
                    onClick={
                      saveNote
                    }
                    disabled={
                      saving ||
                      !hasUnsavedChanges
                    }
                  >

                    <Save
                      size={16}
                    />

                    {saving
                      ? "Saving..."
                      : "Save"}

                  </button>


                  <button
                    type="button"
                    className="v2n-delete-button"
                    onClick={
                      openDeleteModal
                    }
                    disabled={
                      deleting ||
                      saving
                    }
                  >

                    <Trash2
                      size={16}
                    />

                    Delete

                  </button>

                </div>

              </div>


              {/* TITLE */}

              <input
                className="v2n-title-input"
                value={
                  title
                }
                maxLength={160}
                onChange={(
                  event
                ) => {
                  setTitle(
                    event.target.value
                  );

                  setSavedMessage("");
                }}
                placeholder="Note title..."
              />


              {/* META */}

              <div className="v2n-meta">

                <StudySelect
                  className="v2n-editor-subject"
                  value={
                    subjectId
                  }
                  onChange={(
                    nextValue
                  ) => {
                    setSubjectId(
                      String(
                        nextValue
                      )
                    );

                    setSavedMessage("");
                  }}
                  options={
                    editorSubjectOptions
                  }
                  ariaLabel="Choose note subject"
                />


                <span>
                  <Type size={14} />

                  {currentWordCount}{" "}
                  {currentWordCount ===
                  1
                    ? "word"
                    : "words"}
                </span>


                <span>
                  <FileText
                    size={14}
                  />

                  {currentCharacterCount.toLocaleString()} chars
                </span>


                <span>
                  <Clock3
                    size={14}
                  />

                  Updated{" "}
                  {formatRelativeTime(
                    selectedNote.updatedAt ||
                      selectedNote.createdAt
                  )}
                </span>

              </div>


              {/* SUBJECT */}

              {currentSubject && (
                <div
                  className="v2n-subject-banner"
                  style={{
                    "--note-color":
                      currentSubject.color ||
                      "#64748b",
                  }}
                >

                  <span className="v2n-subject-icon">

                    <FolderOpen
                      size={17}
                    />

                  </span>

                  <div>

                    <strong>
                      {currentSubject.name}
                    </strong>

                    <span>
                      {currentSubject.code
                        ? `${currentSubject.code} · `
                        : ""}

                      Linked subject
                    </span>

                  </div>

                </div>
              )}


              {/* CONTENT */}

              <textarea
                className="v2n-content"
                placeholder="Start writing your study notes..."
                value={
                  content
                }
                maxLength={200000}
                onChange={(
                  event
                ) => {
                  setContent(
                    event.target.value
                  );

                  setSavedMessage("");
                }}
              />


              {/* FOOTER */}

              <footer className="v2n-editor-footer">

                <span>
                  Ctrl + S to save
                </span>

                <span>
                  {currentCharacterCount.toLocaleString()}
                  {" "}
                  / 200,000 characters
                </span>

              </footer>

            </>
          ) : (

            <div className="v2n-no-selection">

              <span className="v2n-no-selection-icon">

                <BookOpen
                  size={29}
                />

              </span>

              <span className="v2n-eyebrow">
                Knowledge base
              </span>

              <h2>
                No note selected
              </h2>

              <p>
                Create a note and connect it to one
                of your StudyOS subjects.
              </p>

              <button
                type="button"
                className="v2n-primary-button"
                onClick={
                  createNote
                }
                disabled={
                  creating
                }
              >
                <Plus size={16} />

                {creating
                  ? "Creating..."
                  : "Create note"}
              </button>

            </div>
          )}

        </main>

      </section>


      {/* DELETE */}

      {showDeleteModal && (
        <div
          className="v2n-delete-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !deleting
            ) {
              closeDeleteModal();
            }
          }}
        >

          <div
            className="v2n-delete-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="v2n-delete-icon">

              <Trash2
                size={22}
              />

            </div>


            <div className="v2n-delete-copy">

              <h2>
                Delete note?
              </h2>

              <p>
                Permanently delete{" "}
                <strong>
                  {selectedNote?.title ||
                    "Untitled Note"}
                </strong>
                ?
              </p>

              <span>
                This action cannot be undone.
              </span>

            </div>


            <div className="v2n-delete-actions">

              <button
                type="button"
                className="v2n-secondary-button"
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
                type="button"
                className="v2n-danger-button"
                onClick={
                  deleteNote
                }
                disabled={
                  deleting
                }
              >

                <Trash2
                  size={16}
                />

                {deleting
                  ? "Deleting..."
                  : "Delete note"}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


// =========================================================
// STAT
// =========================================================

function NoteStat({
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="v2n-stat">

      <div className="v2n-stat-heading">

        <span className="v2n-stat-icon">
          {icon}
        </span>

        <span>
          {label}
        </span>

      </div>

      <strong>
        {Number(
          value
        ).toLocaleString(
          "en-IN"
        )}
      </strong>

      <small>
        {description}
      </small>

    </article>
  );
}


export default Notes;