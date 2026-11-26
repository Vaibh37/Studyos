import { WorkspaceSkeleton, WorkspaceEmpty, SkeletonBlock, WorkspaceDisclosure } from "../components/WorkspaceStates";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Hash,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  X,
} from "../components/icons";

import apiRequest, { readStudyData } from "../services/api";

import {
  createLocalId,
  localDb,
} from "../services/localDb";

import {
  getStudySessions,
} from "../services/studySessionData";

import {
  useAuth,
} from "../context/AuthContext";

import StudySelect from "../components/StudySelect";

import "../styles/subjects-v2.css";


// =========================================================
// COLORS
// =========================================================

const SUBJECT_COLORS = [
  "#2563eb",
  "#0f766e",
  "#15803d",
  "#a16207",
  "#c2410c",
  "#b91c1c",
  "#7c3aed",
  "#475569",
];


const SUBJECT_SORT_OPTIONS = [
  {
    value: "activity",
    label: "Recent activity",
  },
  {
    value: "name",
    label: "Name",
  },
  {
    value: "focus",
    label: "Most studied",
  },
  {
    value: "tasks",
    label: "Most pending tasks",
  },
];


// =========================================================
// HELPERS
// =========================================================

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


const formatStudyTime = (
  seconds
) => {
  const safe =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const minutes =
    Math.floor(
      safe / 60
    );

  const hours =
    Math.floor(
      minutes / 60
    );

  const remainingMinutes =
    minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  if (safe > 0) {
    return `${Math.floor(
      safe
    )}s`;
  }

  return "0m";
};


const formatRelativeDate = (
  value
) => {
  const date =
    safeDate(value);

  if (!date) {
    return "Never";
  }

  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const target =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  const difference =
    Math.round(
      (
        today -
        target
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    );

  if (
    difference === 0
  ) {
    return "Today";
  }

  if (
    difference === 1
  ) {
    return "Yesterday";
  }

  if (
    difference > 1 &&
    difference < 7
  ) {
    return `${difference} days ago`;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
};


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

  return String(value);
};


const sessionBelongsToSubject = (
  session,
  subject
) => {
  const sessionSubjectId =
    getSubjectId(
      session.subjectId
    );

  if (
    sessionSubjectId &&
    sessionSubjectId ===
      String(subject._id)
  ) {
    return true;
  }

  if (
    !sessionSubjectId &&
    session.subjectName &&
    subject.name
  ) {
    return (
      session.subjectName
        .trim()
        .toLowerCase() ===
      subject.name
        .trim()
        .toLowerCase()
    );
  }

  return false;
};


const taskBelongsToSubject = (
  task,
  subject
) => {
  return (
    getSubjectId(
      task.subjectId
    ) ===
    String(subject._id)
  );
};


const noteBelongsToSubject = (
  note,
  subject
) => {
  const noteSubjectId =
    getSubjectId(
      note.subjectId
    );

  if (
    noteSubjectId &&
    noteSubjectId ===
      String(subject._id)
  ) {
    return true;
  }

  if (
    !noteSubjectId &&
    note.subjectName &&
    subject.name
  ) {
    return (
      note.subjectName
        .trim()
        .toLowerCase() ===
      subject.name
        .trim()
        .toLowerCase()
    );
  }

  return false;
};


// =========================================================
// SUBJECTS
// =========================================================

function Subjects() {
  const {
    isGuest,
  } = useAuth();

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    tasks,
    setTasks,
  ] = useState([]);

  const [
    sessions,
    setSessions,
  ] = useState([]);

  const [
    notes,
    setNotes,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    sortBy,
    setSortBy,
  ] = useState(
    "activity"
  );

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingSubject,
    setEditingSubject,
  ] = useState(null);

  const [
    name,
    setName,
  ] = useState("");

  const [
    code,
    setCode,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    color,
    setColor,
  ] = useState(
    "#2563eb"
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  const [
    deleting,
    setDeleting,
  ] = useState(false);


  // =======================================================
  // LOAD
  // =======================================================

  const loadSubjectsHub =
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

        const subjectsPromise =
          isGuest
            ? localDb.getAll(
                "subjects"
              )
            : readStudyData("/api/subjects", { fresh: manual });

        const tasksPromise =
          isGuest
            ? localDb.getAll(
                "tasks"
              )
            : readStudyData("/api/tasks", { fresh: manual });

        const notesPromise =
          isGuest
            ? localDb.getAll(
                "notes"
              )
            : readStudyData("/api/notes", { fresh: manual });

        const [
          subjectData,
          taskData,
          sessionData,
          noteData,
        ] =
          await Promise.all([
            subjectsPromise,
            tasksPromise,
            getStudySessions(isGuest, { cache: true, fresh: manual }),
            notesPromise,
          ]);

        setSubjects(
          Array.isArray(
            subjectData
          )
            ? subjectData
            : []
        );

        setTasks(
          Array.isArray(
            taskData
          )
            ? taskData
            : []
        );

        setSessions(
          Array.isArray(
            sessionData
          )
            ? sessionData
            : []
        );

        setNotes(
          Array.isArray(
            noteData
          )
            ? noteData
            : []
        );
      } catch (
        loadError
      ) {
        console.error(
          "Failed to load subjects:",
          loadError
        );

        setError(
          loadError?.message ||
            "Could not load subject data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };


  useEffect(() => {
    loadSubjectsHub();
  }, [
    isGuest,
  ]);


  useEffect(() => {
    const refresh =
      () =>
        loadSubjectsHub();

    const events = [
      "studyos-tasks-updated",
      "studyos-sessions-updated",
      "studyos-notes-updated",
    ];

    events.forEach(
      (
        eventName
      ) =>
        window.addEventListener(
          eventName,
          refresh
        )
    );

    return () => {
      events.forEach(
        (
          eventName
        ) =>
          window.removeEventListener(
            eventName,
            refresh
          )
      );
    };
  }, [
    isGuest,
  ]);


  // =======================================================
  // FORM
  // =======================================================

  const resetForm =
    () => {
      if (saving) {
        return;
      }

      setName("");
      setCode("");
      setDescription("");
      setColor(
        "#2563eb"
      );

      setEditingSubject(null);
      setFormError("");
      setShowForm(false);
    };


  const openAddForm =
    () => {
      setEditingSubject(null);

      setName("");
      setCode("");
      setDescription("");
      setColor(
        "#2563eb"
      );

      setFormError("");
      setShowForm(true);
    };


  const openEditForm =
    (
      subject
    ) => {
      setEditingSubject(
        subject
      );

      setName(
        subject.name ||
          ""
      );

      setCode(
        subject.code ||
          ""
      );

      setDescription(
        subject.description ||
          ""
      );

      setColor(
        subject.color ||
          "#2563eb"
      );

      setFormError("");
      setShowForm(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };


  const saveSubject =
    async (
      event
    ) => {
      event.preventDefault();

      const trimmedName =
        name.trim();

      const trimmedCode =
        code.trim();

      const trimmedDescription =
        description.trim();

      if (
        !trimmedName
      ) {
        setFormError(
          "Subject name is required."
        );

        return;
      }

      if (
        trimmedName.length >
        80
      ) {
        setFormError(
          "Subject name is too long."
        );

        return;
      }

      try {
        setSaving(true);
        setFormError("");

        const subjectData = {
          name:
            trimmedName,

          code:
            trimmedCode,

          description:
            trimmedDescription,

          color,
        };

        let savedSubject;

        if (
          isGuest
        ) {
          const now =
            new Date()
              .toISOString();

          savedSubject =
            editingSubject
              ? {
                  ...editingSubject,
                  ...subjectData,

                  _id:
                    editingSubject._id,

                  createdAt:
                    editingSubject.createdAt ||
                    now,

                  updatedAt:
                    now,
                }
              : {
                  _id:
                    createLocalId(),

                  ...subjectData,

                  createdAt:
                    now,

                  updatedAt:
                    now,
                };

          await localDb.put(
            "subjects",
            savedSubject
          );
        } else {
          savedSubject =
            await apiRequest(
              editingSubject
                ? `/api/subjects/${editingSubject._id}`
                : "/api/subjects",
              {
                method:
                  editingSubject
                    ? "PUT"
                    : "POST",

                body:
                  JSON.stringify(
                    subjectData
                  ),
              }
            );
        }

        if (
          editingSubject
        ) {
          setSubjects(
            (
              current
            ) =>
              current.map(
                (
                  subject
                ) =>
                  String(
                    subject._id
                  ) ===
                  String(
                    savedSubject._id
                  )
                    ? savedSubject
                    : subject
              )
          );
        } else {
          setSubjects(
            (
              current
            ) => [
              savedSubject,
              ...current,
            ]
          );
        }

        window.dispatchEvent(
          new Event(
            "studyos-subjects-updated"
          )
        );

        resetForm();
      } catch (
        saveError
      ) {
        console.error(
          "Failed to save subject:",
          saveError
        );

        setFormError(
          saveError?.message ||
            "Could not save subject."
        );
      } finally {
        setSaving(false);
      }
    };


  // =======================================================
  // DELETE
  // =======================================================

  const closeDeleteConfirmation =
    () => {
      if (!deleting) {
        setDeleteTarget(null);
      }
    };


  const confirmDeleteSubject =
    async () => {
      if (
        !deleteTarget
      ) {
        return;
      }

      try {
        setDeleting(true);
        setError("");

        if (
          isGuest
        ) {
          await localDb.remove(
            "subjects",
            deleteTarget._id
          );
        } else {
          await apiRequest(
            `/api/subjects/${deleteTarget._id}`,
            {
              method:
                "DELETE",
            }
          );
        }

        setSubjects(
          (
            current
          ) =>
            current.filter(
              (
                subject
              ) =>
                String(
                  subject._id
                ) !==
                String(
                  deleteTarget._id
                )
            )
        );

        window.dispatchEvent(
          new Event(
            "studyos-subjects-updated"
          )
        );

        setDeleteTarget(null);
      } catch (
        deleteError
      ) {
        console.error(
          "Failed to delete subject:",
          deleteError
        );

        setError(
          deleteError?.message ||
            "Could not delete subject."
        );
      } finally {
        setDeleting(false);
      }
    };


  // =======================================================
  // METRICS
  // =======================================================

  const subjectMetrics =
    useMemo(() => {
      const map =
        new Map();

      const now =
        new Date();

      const weekStart =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6
        );

      weekStart.setHours(
        0,
        0,
        0,
        0
      );

      subjects.forEach(
        (
          subject
        ) => {
          const subjectTasks =
            tasks.filter(
              (
                task
              ) =>
                taskBelongsToSubject(
                  task,
                  subject
                )
            );

          const subjectSessions =
            sessions.filter(
              (
                session
              ) =>
                sessionBelongsToSubject(
                  session,
                  subject
                )
            );

          const subjectNotes =
            notes.filter(
              (
                note
              ) =>
                noteBelongsToSubject(
                  note,
                  subject
                )
            );

          const completedTasks =
            subjectTasks.filter(
              (
                task
              ) =>
                Boolean(
                  task.completed
                )
            ).length;

          const pendingTasks =
            subjectTasks.length -
            completedTasks;

          const completionRate =
            subjectTasks.length >
            0
              ? Math.round(
                  (
                    completedTasks /
                    subjectTasks.length
                  ) *
                    100
                )
              : 0;

          const totalFocusSeconds =
            subjectSessions.reduce(
              (
                total,
                session
              ) =>
                total +
                Math.max(
                  0,
                  Number(
                    session.durationSeconds
                  ) || 0
                ),
              0
            );

          const weekFocusSeconds =
            subjectSessions.reduce(
              (
                total,
                session
              ) => {
                const date =
                  safeDate(
                    session.startedAt ||
                      session.endedAt ||
                      session.createdAt
                  );

                if (
                  !date ||
                  date <
                    weekStart
                ) {
                  return total;
                }

                return (
                  total +
                  Math.max(
                    0,
                    Number(
                      session.durationSeconds
                    ) || 0
                  )
                );
              },
              0
            );

          const lastSession =
            [
              ...subjectSessions,
            ]
              .map(
                (
                  session
                ) => ({
                  ...session,

                  _studyDate:
                    safeDate(
                      session.startedAt ||
                        session.endedAt ||
                        session.createdAt
                    ),
                })
              )
              .filter(
                (
                  session
                ) =>
                  session._studyDate
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  second._studyDate -
                  first._studyDate
              )[0] ||
            null;

          map.set(
            String(
              subject._id
            ),
            {
              taskCount:
                subjectTasks.length,

              completedTasks,

              pendingTasks,

              completionRate,

              sessionCount:
                subjectSessions.length,

              noteCount:
                subjectNotes.length,

              totalFocusSeconds,

              weekFocusSeconds,

              lastStudiedAt:
                lastSession
                  ? lastSession._studyDate
                  : null,
            }
          );
        }
      );

      return map;
    }, [
      subjects,
      tasks,
      sessions,
      notes,
    ]);


  const overallStats =
    useMemo(() => {
      let pendingTasks = 0;
      let completedTasks = 0;
      let totalFocusSeconds = 0;
      let weekFocusSeconds = 0;

      subjectMetrics.forEach(
        (
          metrics
        ) => {
          pendingTasks +=
            metrics.pendingTasks;

          completedTasks +=
            metrics.completedTasks;

          totalFocusSeconds +=
            metrics.totalFocusSeconds;

          weekFocusSeconds +=
            metrics.weekFocusSeconds;
        }
      );

      return {
        pendingTasks,
        completedTasks,
        totalFocusSeconds,
        weekFocusSeconds,
      };
    }, [
      subjectMetrics,
    ]);


  // =======================================================
  // FILTER / SORT
  // =======================================================

  const visibleSubjects =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        subjects.filter(
          (
            subject
          ) => {
            if (!query) {
              return true;
            }

            return [
              subject.name,
              subject.code,
              subject.description,
            ]
              .filter(Boolean)
              .some(
                (
                  value
                ) =>
                  String(value)
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
          const firstMetrics =
            subjectMetrics.get(
              String(
                first._id
              )
            );

          const secondMetrics =
            subjectMetrics.get(
              String(
                second._id
              )
            );

          if (
            sortBy === "name"
          ) {
            return first.name.localeCompare(
              second.name
            );
          }

          if (
            sortBy === "focus"
          ) {
            return (
              (
                secondMetrics?.totalFocusSeconds ||
                0
              ) -
              (
                firstMetrics?.totalFocusSeconds ||
                0
              )
            );
          }

          if (
            sortBy === "tasks"
          ) {
            return (
              (
                secondMetrics?.pendingTasks ||
                0
              ) -
              (
                firstMetrics?.pendingTasks ||
                0
              )
            );
          }

          const firstActivity =
            firstMetrics
              ?.lastStudiedAt
              ?.getTime?.() ||
            safeDate(
              first.createdAt
            )?.getTime() ||
            0;

          const secondActivity =
            secondMetrics
              ?.lastStudiedAt
              ?.getTime?.() ||
            safeDate(
              second.createdAt
            )?.getTime() ||
            0;

          return (
            secondActivity -
            firstActivity
          );
        }
      );
    }, [
      subjects,
      subjectMetrics,
      search,
      sortBy,
    ]);


  // =======================================================
  // UI
  // =======================================================

  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

  useEffect(() => {
    if (showForm) {
      document
        .querySelector(".v2s-clean .v2s-form-card")
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [showForm, editingSubject]);

  return (
    <div className="v2s-page v2s-clean">

      <header className="v2s-header">

        <div className="v2s-header-copy">

          <span className="v2s-eyebrow">
            Study library
          </span>

          <h1>
            Subjects
          </h1>

          <p>
            Manage your study areas and track their progress.
          </p>

        </div>

        <button
          type="button"
          className="v2s-primary-button"
          onClick={
            openAddForm
          }
        >
          <Plus size={17} />
          Add subject
        </button>

      </header>


      {error && (
        <div className="v2s-error">

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


      <section className="v2s-stats">

        <SubjectStat
          loading={loading}
          icon={
            <BookOpen size={19} />
          }
          label="Subjects"
          value={
            subjects.length
          }
          description="Active study areas"
        />

        <SubjectStat
          loading={loading}
          icon={
            <Timer size={19} />
          }
          label="Focus this week"
          value={
            formatStudyTime(
              overallStats.weekFocusSeconds
            )
          }
          description="Across all subjects"
        />

        <SubjectStat
          loading={loading}
          icon={
            <ListChecks size={19} />
          }
          label="Pending tasks"
          value={
            overallStats.pendingTasks
          }
          description="Linked to subjects"
        />

        <SubjectStat
          loading={loading}
          icon={
            <CheckCircle2 size={19} />
          }
          label="Completed"
          value={
            overallStats.completedTasks
          }
          description="Finished subject tasks"
        />

      </section>


      {showForm && (
        <section className="v2s-form-card">

          <div className="v2s-form-header">

            <div>

              <span className="v2s-eyebrow">
                {editingSubject
                  ? "Edit subject"
                  : "New subject"}
              </span>

              <h2>
                {editingSubject
                  ? "Update subject"
                  : "Create a subject"}
              </h2>

              <p>
                Give it a clear name and optional
                code, description and color.
              </p>

            </div>

            <button
              type="button"
              className="v2s-icon-button"
              onClick={
                resetForm
              }
              disabled={
                saving
              }
              aria-label="Close subject form"
            >
              <X size={18} />
            </button>

          </div>


          <form
            className="v2s-form"
            onSubmit={
              saveSubject
            }
          >

            <div className="v2s-form-grid">

              <label className="v2s-field">

                <span>
                  Subject name
                </span>

                <div className="v2s-input">

                  <BookOpen
                    size={16}
                  />

                  <input
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Mathematics"
                    value={
                      name
                    }
                    onChange={(
                      event
                    ) => {
                      setName(
                        event.target.value
                      );

                      setFormError("");
                    }}
                    disabled={
                      saving
                    }
                    autoFocus
                  />

                </div>

              </label>


              <label className="v2s-field">

                <span>
                  Subject code
                </span>

                <div className="v2s-input">

                  <Hash
                    size={16}
                  />

                  <input
                    type="text"
                    maxLength={30}
                    placeholder="e.g. MATH101"
                    value={
                      code
                    }
                    onChange={(
                      event
                    ) =>
                      setCode(
                        event.target.value
                      )
                    }
                    disabled={
                      saving
                    }
                  />

                </div>

              </label>

            </div>


            <label className="v2s-field">

              <span>
                Description
              </span>

              <textarea
                maxLength={300}
                placeholder="What are you studying in this subject?"
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target.value
                  )
                }
                disabled={
                  saving
                }
              />

              <small>
                {description.length}/300
              </small>

            </label>


            <div className="v2s-color-field">

              <span>
                Subject color
              </span>

              <div className="v2s-colors">

                {SUBJECT_COLORS.map(
                  (
                    option
                  ) => (
                    <button
                      key={
                        option
                      }
                      type="button"
                      className={
                        color ===
                        option
                          ? "is-active"
                          : ""
                      }
                      style={{
                        "--v2s-color":
                          option,
                      }}
                      onClick={() =>
                        setColor(
                          option
                        )
                      }
                      disabled={
                        saving
                      }
                      aria-label={`Use color ${option}`}
                      aria-pressed={
                        color ===
                        option
                      }
                    >
                      {color ===
                        option && (
                        <CheckCircle2
                          size={15}
                        />
                      )}
                    </button>
                  )
                )}

              </div>

            </div>


            {formError && (
              <div className="v2s-form-error">

                <AlertTriangle
                  size={15}
                />

                {formError}

              </div>
            )}


            <div className="v2s-form-actions">

              <button
                type="button"
                className="v2s-secondary-button"
                onClick={
                  resetForm
                }
                disabled={
                  saving
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="v2s-primary-button"
                disabled={
                  saving ||
                  !name.trim()
                }
              >

                {editingSubject
                  ? (
                    <Pencil
                      size={16}
                    />
                  )
                  : (
                    <Plus
                      size={16}
                    />
                  )}

                {saving
                  ? "Saving..."
                  : editingSubject
                    ? "Save changes"
                    : "Create subject"}

              </button>

            </div>

          </form>

        </section>
      )}


      <section className="v2s-toolbar">

        <label className="v2s-search">

          <Search
            size={17}
          />

          <input
            type="text"
            value={
              search
            }
            placeholder="Search subjects..." aria-label="Search subjects"
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
          value={
            sortBy
          }
          onChange={
            setSortBy
          }
          options={
            SUBJECT_SORT_OPTIONS
          }
          placeholder="Recent activity"
          className="v2s-sort-select"
          ariaLabel="Sort subjects"
        />


        <button
          type="button"
          className="v2s-refresh" aria-label="Refresh subjects" title="Refresh subjects"
          onClick={() =>
            loadSubjectsHub(
              true
            )
          }
          disabled={
            refreshing
          }
        >

          <RefreshCw
            size={16}
            className={
              refreshing
                ? "v2s-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}

        </button>

      </section>


      {loading ? (
        <WorkspaceSkeleton kind="subjects" count={5} />
      ) : subjects.length ===
        0 ? (
        <EmptyState
          icon={
            <BookOpen size={30} />
          }
          title="No subjects yet"
          description="Create a subject to start linking tasks, notes and focus sessions."
          action={
            <button
              type="button"
              className="v2s-primary-button"
              onClick={
                openAddForm
              }
            >
              <Plus size={16} />
              Create first subject
            </button>
          }
        />
      ) : visibleSubjects.length ===
        0 ? (
        <EmptyState
          icon={
            <Search size={28} />
          }
          title="No matching subjects"
          description="Try another search term."
        />
      ) : (
        <section className="sl-list" aria-label="Subjects">

          <div
            className="sl-list-heading"
            aria-hidden="true"
          >
            <span>Subject</span>
            <span>Total focus</span>
            <span>This week</span>
            <span>Tasks</span>
            <span>Actions</span>
          </div>

          {visibleSubjects.map(
            (
              subject
            ) => {
              const metrics =
                subjectMetrics.get(
                  String(
                    subject._id
                  )
                ) || {
                  taskCount: 0,
                  completedTasks: 0,
                  pendingTasks: 0,
                  completionRate: 0,
                  sessionCount: 0,
                  noteCount: 0,
                  totalFocusSeconds: 0,
                  weekFocusSeconds: 0,
                  lastStudiedAt: null,
                };

              const id = String(subject._id);
              const expanded = expandedSubjectId === id;
              const detailId = `subject-details-${id}`;

              return (
                <article
                  key={id}
                  className={`sl-item${expanded ? " is-expanded" : ""}`}
                  style={{
                    "--sl-color": subject.color || "#475569",
                  }}
                >

                  <div className="sl-row">

                    <button
                      type="button"
                      className="sl-name-button"
                      aria-expanded={expanded}
                      aria-controls={detailId}
                      onClick={() =>
                        setExpandedSubjectId((current) =>
                          current === id ? null : id
                        )
                      }
                    >

                      <ChevronRight
                        size={15}
                        className="sl-chevron"
                        aria-hidden="true"
                      />

                      <span className="sl-subject-icon">
                        <BookOpen
                          size={17}
                          aria-hidden="true"
                        />
                      </span>

                      <span className="sl-name-copy">

                        <strong>
                          {subject.name}
                        </strong>

                        {subject.code && (
                          <small>
                            {subject.code}
                          </small>
                        )}

                      </span>

                    </button>


                    <div className="sl-metric sl-total">

                      <span className="sl-mobile-label">
                        Total focus
                      </span>

                      <strong>
                        {formatStudyTime(
                          metrics.totalFocusSeconds
                        )}
                      </strong>

                    </div>


                    <div className="sl-metric sl-week">

                      <span className="sl-mobile-label">
                        This week
                      </span>

                      <strong>
                        {formatStudyTime(
                          metrics.weekFocusSeconds
                        )}
                      </strong>

                    </div>


                    <div className="sl-completion">

                      <div className="sl-completion-copy">

                        <span>
                          {metrics.taskCount
                            ? `${metrics.completedTasks}/${metrics.taskCount} tasks`
                            : "No tasks"}
                        </span>

                        {metrics.taskCount > 0 && (
                          <strong>
                            {metrics.completionRate}%
                          </strong>
                        )}

                      </div>

                      {metrics.taskCount > 0 && (
                        <div
                          className="sl-track"
                          role="progressbar"
                          aria-label={`Task completion for ${subject.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={metrics.completionRate}
                        >

                          <div
                            style={{
                              width: `${metrics.completionRate}%`,
                            }}
                          />

                        </div>
                      )}

                    </div>


                    <div className="sl-actions">

                      <button
                        type="button"
                        title="Edit subject"
                        aria-label={`Edit ${subject.name}`}
                        onClick={() => openEditForm(subject)}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className="is-danger"
                        title="Delete subject"
                        aria-label={`Delete ${subject.name}`}
                        onClick={() => setDeleteTarget(subject)}
                      >
                        <Trash2 size={15} />
                      </button>

                    </div>

                  </div>


                  <WorkspaceDisclosure id={detailId} open={expanded}>
                    <div className="sl-details">

                    <p>
                      {subject.description ||
                        "No description added yet."}
                    </p>

                    <dl className="sl-detail-stats">

                      <div>
                        <dt>Pending</dt>
                        <dd>{metrics.pendingTasks}</dd>
                      </div>

                      <div>
                        <dt>Completed</dt>
                        <dd>{metrics.completedTasks}</dd>
                      </div>

                      <div>
                        <dt>Sessions</dt>
                        <dd>{metrics.sessionCount}</dd>
                      </div>

                      <div>
                        <dt>Notes</dt>
                        <dd>{metrics.noteCount}</dd>
                      </div>

                      <div>
                        <dt>Last studied</dt>
                        <dd>
                          {formatRelativeDate(
                            metrics.lastStudiedAt
                          )}
                        </dd>
                      </div>

                    </dl>

                    </div>
                  </WorkspaceDisclosure>

                </article>
              );
            }
          )}

        </section>
      )}


      {deleteTarget && (
        <div
          className="v2s-delete-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !deleting
            ) {
              closeDeleteConfirmation();
            }
          }}
        >

          <div
            className="v2s-delete-modal"
            role="dialog"
            aria-modal="true"
          >

            <div className="v2s-delete-icon">
              <Trash2 size={21} />
            </div>

            <div className="v2s-delete-copy">

              <h2>
                Delete subject?
              </h2>

              <p>
                Remove{" "}
                <strong>
                  {deleteTarget.name}
                </strong>{" "}
                from StudyOS?
              </p>

              <span>
                This action cannot be undone.
              </span>

            </div>

            <div className="v2s-delete-actions">

              <button
                type="button"
                className="v2s-secondary-button"
                onClick={
                  closeDeleteConfirmation
                }
                disabled={
                  deleting
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="v2s-danger-button"
                onClick={
                  confirmDeleteSubject
                }
                disabled={
                  deleting
                }
              >

                <Trash2 size={16} />

                {deleting
                  ? "Deleting..."
                  : "Delete subject"}

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

function SubjectStat({
  loading,
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="v2s-stat">

      <div className="v2s-stat-heading">

        <span className="v2s-stat-icon">
          {icon}
        </span>

        <span>
          {label}
        </span>

      </div>

      <strong>
        {loading ? <SkeletonBlock width={42} height={22} /> : value}
      </strong>

      <small>
        {loading ? <SkeletonBlock width={85} height={10} /> : description}
      </small>

    </article>
  );
}


// =========================================================
// EMPTY
// =========================================================

function EmptyState({ icon, title, description, action }) {
  return <WorkspaceEmpty icon={icon} title={title} description={description} action={action} />;
}


export default Subjects;
