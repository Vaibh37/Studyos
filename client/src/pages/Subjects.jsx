import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Hash,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Timer,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import apiRequest from "../services/api";

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

// =========================================================
// COLORS
// =========================================================

const SUBJECT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
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

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
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

  if (difference === 0) {
    return "Today";
  }

  if (difference === 1) {
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

  // =======================================================
  // DATA
  // =======================================================

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

  // =======================================================
  // SEARCH / SORT
  // =======================================================

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

  // =======================================================
  // FORM
  // =======================================================

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
    "#6366f1"
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  // =======================================================
  // DELETE
  // =======================================================

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
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");

        const subjectsPromise =
          isGuest
            ? localDb.getAll(
                "subjects"
              )
            : apiRequest(
                "/api/subjects"
              );

        const tasksPromise =
          isGuest
            ? localDb.getAll(
                "tasks"
              )
            : apiRequest(
                "/api/tasks"
              );

        const notesPromise =
          isGuest
            ? localDb.getAll(
                "notes"
              )
            : apiRequest(
                "/api/notes"
              );

        const [
          subjectData,
          taskData,
          sessionData,
          noteData,
        ] =
          await Promise.all([
            subjectsPromise,
            tasksPromise,
            getStudySessions(
              isGuest
            ),
            notesPromise,
          ]);

        const safeSubjects =
          Array.isArray(
            subjectData
          )
            ? subjectData
            : [];

        const safeTasks =
          Array.isArray(
            taskData
          )
            ? taskData
            : [];

        const safeSessions =
          Array.isArray(
            sessionData
          )
            ? sessionData
            : [];

        const safeNotes =
          Array.isArray(
            noteData
          )
            ? noteData
            : [];

        setSubjects(
          safeSubjects
        );

        setTasks(
          safeTasks
        );

        setSessions(
          safeSessions
        );

        setNotes(
          safeNotes
        );
      } catch (
        loadError
      ) {
        console.error(
          "Failed to load Subjects V2:",
          loadError
        );

        setError(
          loadError?.message ||
            "Could not load subject data."
        );
      } finally {
        setLoading(
          false
        );

        setRefreshing(
          false
        );
      }
    };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadSubjectsHub(
      false
    );
  }, [
    isGuest,
  ]);

  // =======================================================
  // LIVE UPDATES
  // =======================================================

  useEffect(() => {
    const refresh =
      () => {
        loadSubjectsHub(
          false
        );
      };

    const events = [
      "studyos-tasks-updated",
      "studyos-sessions-updated",
      "studyos-notes-updated",
    ];

    events.forEach(
      (
        eventName
      ) => {
        window.addEventListener(
          eventName,
          refresh
        );
      }
    );

    return () => {
      events.forEach(
        (
          eventName
        ) => {
          window.removeEventListener(
            eventName,
            refresh
          );
        }
      );
    };
  }, [
    isGuest,
  ]);

  // =======================================================
  // RESET FORM
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
        "#6366f1"
      );

      setEditingSubject(
        null
      );

      setFormError("");

      setShowForm(
        false
      );
    };

  // =======================================================
  // ADD
  // =======================================================

  const openAddForm =
    () => {
      setEditingSubject(
        null
      );

      setName("");
      setCode("");
      setDescription("");
      setColor(
        "#6366f1"
      );

      setFormError("");

      setShowForm(
        true
      );
    };

  // =======================================================
  // EDIT
  // =======================================================

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
          "#6366f1"
      );

      setFormError("");

      setShowForm(
        true
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  // =======================================================
  // SAVE
  // =======================================================

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
        setSaving(
          true
        );

        setFormError("");

        let savedSubject;

        const subjectData = {
          name:
            trimmedName,

          code:
            trimmedCode,

          description:
            trimmedDescription,

          color,
        };

        if (isGuest) {
          const now =
            new Date()
              .toISOString();

          if (
            editingSubject
          ) {
            savedSubject = {
              ...editingSubject,
              ...subjectData,

              _id:
                editingSubject._id,

              createdAt:
                editingSubject.createdAt ||
                now,

              updatedAt:
                now,
            };
          } else {
            savedSubject = {
              _id:
                createLocalId(),

              ...subjectData,

              createdAt:
                now,

              updatedAt:
                now,
            };
          }

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
        setSaving(
          false
        );
      }
    };

  // =======================================================
  // DELETE
  // =======================================================

  const openDeleteConfirmation =
    (
      subject
    ) => {
      setDeleteTarget(
        subject
      );
    };

  const closeDeleteConfirmation =
    () => {
      if (
        deleting
      ) {
        return;
      }

      setDeleteTarget(
        null
      );
    };

  const confirmDeleteSubject =
    async () => {
      if (
        !deleteTarget
      ) {
        return;
      }

      try {
        setDeleting(
          true
        );

        setError("");

        if (isGuest) {
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

        setDeleteTarget(
          null
        );
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
        setDeleting(
          false
        );
      }
    };

  // =======================================================
  // SUBJECT METRICS
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
          now.getDate() -
            6
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
                  ) ||
                    0
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
                    ) ||
                      0
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

          const lastStudiedAt =
            lastSession
              ? lastSession._studyDate
              : null;

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

              lastStudiedAt,
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

  // =======================================================
  // OVERALL STATS
  // =======================================================

  const overallStats =
    useMemo(() => {
      let pendingTasks =
        0;

      let completedTasks =
        0;

      let totalFocusSeconds =
        0;

      let weekFocusSeconds =
        0;

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
            if (
              !query
            ) {
              return true;
            }

            return [
              subject.name,
              subject.code,
              subject.description,
            ]
              .filter(
                Boolean
              )
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
            sortBy ===
            "name"
          ) {
            return first.name.localeCompare(
              second.name
            );
          }

          if (
            sortBy ===
            "focus"
          ) {
            return (
              (
                secondMetrics
                  ?.totalFocusSeconds ||
                0
              ) -
              (
                firstMetrics
                  ?.totalFocusSeconds ||
                0
              )
            );
          }

          if (
            sortBy ===
            "tasks"
          ) {
            return (
              (
                secondMetrics
                  ?.pendingTasks ||
                0
              ) -
              (
                firstMetrics
                  ?.pendingTasks ||
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

  return (
    <div className="dashboard subjects-v2-page">

      <header className="dashboard-header subjects-v2-header">

        <div>

          <span className="subjects-v2-eyebrow">
            STUDY LIBRARY
          </span>

          <h1>
            Subjects
          </h1>

          <p>
            Organize your coursework
            and see real Focus and
            task activity for every
            subject.
          </p>

        </div>

        <button
          type="button"
          className="subjects-v2-add-button"
          onClick={
            openAddForm
          }
        >

          <Plus
            size={16}
          />

          Add subject

        </button>

      </header>

      {error && (
        <div className="subjects-v2-error">

          <AlertTriangle
            size={16}
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
            <X
              size={15}
            />
          </button>

        </div>
      )}

      <section className="subjects-v2-stats">

        <SubjectStat
          icon={
            <BookOpen
              size={18}
            />
          }
          label="Subjects"
          value={
            subjects.length
          }
          description="Active study areas"
        />

        <SubjectStat
          icon={
            <Timer
              size={18}
            />
          }
          label="Focus this week"
          value={
            formatStudyTime(
              overallStats.weekFocusSeconds
            )
          }
          description="Across your subjects"
        />

        <SubjectStat
          icon={
            <ListChecks
              size={18}
            />
          }
          label="Pending tasks"
          value={
            overallStats.pendingTasks
          }
          description="Linked to subjects"
        />

        <SubjectStat
          icon={
            <CheckCircle2
              size={18}
            />
          }
          label="Completed"
          value={
            overallStats.completedTasks
          }
          description="Linked subject tasks"
        />

      </section>

      {showForm && (
        <section className="dashboard-card subjects-v2-form-card">

          <div className="subjects-v2-form-header">

            <div>

              <span className="subjects-v2-eyebrow">
                {editingSubject
                  ? "EDIT SUBJECT"
                  : "NEW SUBJECT"}
              </span>

              <h2>
                {editingSubject
                  ? "Update subject"
                  : "Create subject"}
              </h2>

              <p>
                Add a clear name,
                optional code and a
                visual color.
              </p>

            </div>

            <button
              type="button"
              className="subjects-v2-icon-button"
              onClick={
                resetForm
              }
              disabled={
                saving
              }
              aria-label="Close subject form"
            >

              <X
                size={17}
              />

            </button>

          </div>

          <form
            className="subjects-v2-form"
            onSubmit={
              saveSubject
            }
          >

            <div className="subjects-v2-form-grid">

              <label className="subjects-v2-field">

                <span>
                  Subject name
                </span>

                <div className="subjects-v2-input-wrap">

                  <BookOpen
                    size={15}
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
                        event.target
                          .value
                      );

                      setFormError(
                        ""
                      );
                    }}
                    disabled={
                      saving
                    }
                    autoFocus
                  />

                </div>

              </label>

              <label className="subjects-v2-field">

                <span>
                  Subject code
                </span>

                <div className="subjects-v2-input-wrap">

                  <Hash
                    size={15}
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
                        event.target
                          .value
                      )
                    }
                    disabled={
                      saving
                    }
                  />

                </div>

              </label>

            </div>

            <label className="subjects-v2-field">

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
                    event.target
                      .value
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

            <div className="subjects-v2-color-field">

              <span>
                Subject color
              </span>

              <div className="subjects-v2-color-options">

                {SUBJECT_COLORS.map(
                  (
                    option
                  ) => (
                    <button
                      key={
                        option
                      }
                      type="button"
                      className={`subjects-v2-color-option ${
                        color ===
                        option
                          ? "active"
                          : ""
                      }`}
                      style={{
                        "--subject-picker-color":
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
                          size={13}
                        />
                      )}
                    </button>
                  )
                )}

              </div>

            </div>

            {formError && (
              <div className="subjects-v2-form-error">

                <AlertTriangle
                  size={14}
                />

                {formError}

              </div>
            )}

            <div className="subjects-v2-form-actions">

              <button
                type="button"
                className="subjects-v2-secondary-button"
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
                className="subjects-v2-primary-button"
                disabled={
                  saving ||
                  !name.trim()
                }
              >

                {editingSubject ? (
                  <Pencil
                    size={15}
                  />
                ) : (
                  <Plus
                    size={15}
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

      <section className="subjects-v2-toolbar">

        <div className="subjects-v2-search">

          <Search
            size={15}
          />

          <input
            type="text"
            value={
              search
            }
            placeholder="Search subjects..."
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
              <X
                size={14}
              />
            </button>
          )}

        </div>

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
          className="subjects-v2-sort-select"
          ariaLabel="Sort subjects"
        />

        <button
          type="button"
          className="subjects-v2-refresh"
          onClick={() =>
            loadSubjectsHub(
              true
            )
          }
          disabled={
            refreshing
          }
        >
          <TrendingUp
            size={15}
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </section>

      {loading ? (

        <section className="dashboard-card subjects-v2-empty">

          <BookOpen
            size={25}
          />

          <strong>
            Loading subjects
          </strong>

          <span>
            Building your subject
            overview.
          </span>

        </section>

      ) : subjects.length ===
        0 ? (

        <section className="dashboard-card subjects-v2-empty">

          <BookOpen
            size={27}
          />

          <strong>
            No subjects yet
          </strong>

          <span>
            Create a subject to start
            linking tasks and Focus
            sessions.
          </span>

          <button
            type="button"
            className="subjects-v2-primary-button"
            onClick={
              openAddForm
            }
          >
            <Plus
              size={15}
            />

            Create first subject
          </button>

        </section>

      ) : visibleSubjects.length ===
        0 ? (

        <section className="dashboard-card subjects-v2-empty">

          <Search
            size={25}
          />

          <strong>
            No matching subjects
          </strong>

          <span>
            Try a different search.
          </span>

        </section>

      ) : (

        <section className="subjects-v2-grid">

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

              return (
                <article
                  key={
                    subject._id
                  }
                  className="subjects-v2-card"
                  style={{
                    "--subject-color":
                      subject.color ||
                      "#6366f1",
                  }}
                >

                  <div className="subjects-v2-card-accent" />

                  <div className="subjects-v2-card-header">

                    <div className="subjects-v2-card-icon">

                      <BookOpen
                        size={19}
                      />

                    </div>

                    <div className="subjects-v2-card-heading">

                      <div>

                        <h2>
                          {subject.name}
                        </h2>

                        {subject.code && (
                          <span className="subjects-v2-code">
                            {subject.code}
                          </span>
                        )}

                      </div>

                    </div>

                    <div className="subjects-v2-card-actions">

                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(
                            subject
                          )
                        }
                        aria-label={`Edit ${subject.name}`}
                        title="Edit subject"
                      >

                        <Pencil
                          size={15}
                        />

                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() =>
                          openDeleteConfirmation(
                            subject
                          )
                        }
                        aria-label={`Delete ${subject.name}`}
                        title="Delete subject"
                      >

                        <Trash2
                          size={15}
                        />

                      </button>

                    </div>

                  </div>

                  <p className="subjects-v2-description">

                    {subject.description ||
                      "No description added yet."}

                  </p>

                  <div className="subjects-v2-focus-block">

                    <div>

                      <span>
                        <Timer
                          size={13}
                        />

                        Total focus
                      </span>

                      <strong>
                        {formatStudyTime(
                          metrics.totalFocusSeconds
                        )}
                      </strong>

                    </div>

                    <div>

                      <span>
                        <Clock3
                          size={13}
                        />

                        This week
                      </span>

                      <strong>
                        {formatStudyTime(
                          metrics.weekFocusSeconds
                        )}
                      </strong>

                    </div>

                  </div>

                  <div className="subjects-v2-progress">

                    <div className="subjects-v2-progress-heading">

                      <span>
                        Task completion
                      </span>

                      <strong>
                        {metrics.completionRate}%
                      </strong>

                    </div>

                    <div className="subjects-v2-progress-track">

                      <div
                        className="subjects-v2-progress-bar"
                        style={{
                          width:
                            `${metrics.completionRate}%`,
                        }}
                      />

                    </div>

                  </div>

                  <div className="subjects-v2-mini-stats">

                    <div>

                      <ListChecks
                        size={14}
                      />

                      <span>
                        Pending
                      </span>

                      <strong>
                        {metrics.pendingTasks}
                      </strong>

                    </div>

                    <div>

                      <CheckCircle2
                        size={14}
                      />

                      <span>
                        Done
                      </span>

                      <strong>
                        {metrics.completedTasks}
                      </strong>

                    </div>

                    <div>

                      <Timer
                        size={14}
                      />

                      <span>
                        Sessions
                      </span>

                      <strong>
                        {metrics.sessionCount}
                      </strong>

                    </div>

                  </div>

                  <div className="subjects-v2-card-footer">

                    <span>
                      {metrics.noteCount}
                      {" "}
                      {metrics.noteCount ===
                      1
                        ? "note"
                        : "notes"}
                    </span>

                    <strong>
                      Last studied{" "}
                      {formatRelativeDate(
                        metrics.lastStudiedAt
                      )}
                    </strong>

                  </div>

                </article>
              );
            }
          )}

        </section>

      )}

      {deleteTarget && (
        <div
          className="delete-modal-overlay"
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

          <div className="delete-modal subjects-v2-delete-modal">

            <div className="delete-modal-icon">

              <Trash2
                size={21}
              />

            </div>

            <div className="delete-modal-content">

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
                This action cannot be
                undone.
              </span>

            </div>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="delete-cancel-button"
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
                className="delete-confirm-button"
                onClick={
                  confirmDeleteSubject
                }
                disabled={
                  deleting
                }
              >

                <Trash2
                  size={15}
                />

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
// STAT CARD
// =========================================================

function SubjectStat({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="subjects-v2-stat">

      <div className="subjects-v2-stat-top">

        <span className="subjects-v2-stat-icon">
          {icon}
        </span>

        <span>
          {label}
        </span>

      </div>

      <strong>
        {value}
      </strong>

      <small>
        {description}
      </small>

    </div>
  );
}

export default Subjects;