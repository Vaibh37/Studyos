import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Timer,
  Trash2,
  X,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  getCalendarStudySessions,
  updateCalendarEvent,
} from "../services/calendarData";

import StudyDatePicker from "../components/StudyDatePicker";
import StudySelect from "../components/StudySelect";

import "./Calendar.selects.css";

// =========================================================
// EVENT TYPES
// =========================================================

const EVENT_TYPES = [
  {
    value: "assignment",
    label: "Assignment",
    description: "Homework, submission or coursework",
  },
  {
    value: "exam",
    label: "Exam",
    description: "Test, quiz or examination",
  },
  {
    value: "project",
    label: "Project",
    description: "Project milestone or deadline",
  },
  {
    value: "study",
    label: "Study",
    description: "Planned study block",
  },
  {
    value: "other",
    label: "Other",
    description: "Anything else on your schedule",
  },
];

// =========================================================
// DATE HELPERS
// =========================================================

const getDateKey = (
  date
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};

const parseEventDate = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    typeof value ===
    "string"
  ) {
    const match =
      value.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) -
          1,
        Number(match[3])
      );
    }
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

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

const parseDateInput = (
  value
) => {
  const match =
    String(
      value || ""
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return null;
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) -
      1,
    Number(match[3])
  );
};

const isSameDay = (
  first,
  second
) => {
  return (
    getDateKey(first) ===
    getDateKey(second)
  );
};

const formatSelectedDate = (
  date
) => {
  return date.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
};

// =========================================================
// STUDY HELPERS
// =========================================================

const getSessionDate = (
  session
) => {
  const value =
    session.startedAt ||
    session.endedAt;

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
      Number(seconds) ||
        0
    );

  const totalMinutes =
    Math.floor(
      safe / 60
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (
    totalMinutes > 0
  ) {
    return `${totalMinutes}m`;
  }

  if (safe > 0) {
    return `${Math.floor(
      safe
    )}s`;
  }

  return "0m";
};

const formatSessionTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const formatTaskTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const [
    hour,
    minute,
  ] =
    String(value)
      .split(":")
      .map(Number);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return value;
  }

  const date =
    new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

// =========================================================
// EVENT HELPERS
// =========================================================

const getTypeClass = (
  eventType
) => {
  return String(
    eventType || "other"
  )
    .toLowerCase()
    .replace(
      /\s+/g,
      "-"
    );
};

const getTypeLabel = (
  eventType
) => {
  const normalized =
    String(
      eventType ||
        "other"
    ).toLowerCase();

  if (
    normalized ===
    "task"
  ) {
    return "Task";
  }

  return (
    EVENT_TYPES.find(
      (
        item
      ) =>
        item.value ===
        normalized
    )?.label ||
    "Other"
  );
};

const isTaskEvent = (
  calendarEvent
) => {
  return (
    calendarEvent?.source ===
      "task" ||
    calendarEvent?.type ===
      "task"
  );
};

// =========================================================
// CALENDAR
// =========================================================

function Calendar() {
  const {
    isGuest,
  } = useAuth();

  // =======================================================
  // DATA
  // =======================================================

  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    sessions,
    setSessions,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  // =======================================================
  // CALENDAR
  // =======================================================

  const [
    currentDate,
    setCurrentDate,
  ] = useState(
    new Date()
  );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    new Date()
  );

  // =======================================================
  // EVENT FORM
  // =======================================================

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingEventId,
    setEditingEventId,
  ] = useState(null);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    type,
    setType,
  ] = useState(
    "assignment"
  );

  const [
    formDate,
    setFormDate,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  // =======================================================
  // DELETE
  // =======================================================

  const [
    deleteEventId,
    setDeleteEventId,
  ] = useState(null);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  // =======================================================
  // MESSAGES
  // =======================================================

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  // =======================================================
  // MESSAGE HELPERS
  // =======================================================

  const showSuccess = (
    text
  ) => {
    setError("");
    setMessage(text);

    window.setTimeout(
      () => {
        setMessage("");
      },
      3000
    );
  };

  const showError = (
    text
  ) => {
    setMessage("");
    setError(text);
  };

  // =======================================================
  // LOAD
  // =======================================================

  const loadCalendarData =
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

        const [
          eventData,
          sessionData,
        ] =
          await Promise.all([
            getCalendarEvents(
              isGuest
            ),

            getCalendarStudySessions(
              isGuest
            ),
          ]);

        setEvents(
          Array.isArray(
            eventData
          )
            ? eventData
            : []
        );

        setSessions(
          Array.isArray(
            sessionData
          )
            ? sessionData
            : []
        );

        if (manual) {
          showSuccess(
            "Calendar refreshed"
          );
        }
      } catch (
        loadError
      ) {
        console.error(
          "Calendar load failed:",
          loadError
        );

        showError(
          loadError?.message ||
            "Couldn't load Calendar."
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
    loadCalendarData(
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
        loadCalendarData(
          false
        );
      };

    const eventNames = [
      "studyos-sessions-updated",
      "studyos-tasks-updated",
      "studyos-events-updated",
    ];

    eventNames.forEach(
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
      eventNames.forEach(
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
  // SORT EVENTS
  // =======================================================

  const sortedEvents =
    useMemo(() => {
      return [
        ...events,
      ].sort(
        (
          first,
          second
        ) => {
          const firstDate =
            parseEventDate(
              first.date
            );

          const secondDate =
            parseEventDate(
              second.date
            );

          if (
            !firstDate &&
            !secondDate
          ) {
            return 0;
          }

          if (!firstDate) {
            return 1;
          }

          if (!secondDate) {
            return -1;
          }

          return (
            firstDate -
            secondDate
          );
        }
      );
    }, [
      events,
    ]);

  // =======================================================
  // CALENDAR DAYS
  // =======================================================

  const calendarDays =
    useMemo(() => {
      const year =
        currentDate.getFullYear();

      const month =
        currentDate.getMonth();

      const firstDay =
        new Date(
          year,
          month,
          1
        );

      const firstWeekday =
        firstDay.getDay();

      const daysInMonth =
        new Date(
          year,
          month + 1,
          0
        ).getDate();

      const previousMonthDays =
        new Date(
          year,
          month,
          0
        ).getDate();

      const days = [];

      for (
        let index =
          firstWeekday - 1;
        index >= 0;
        index--
      ) {
        days.push({
          date:
            new Date(
              year,
              month - 1,
              previousMonthDays -
                index
            ),

          currentMonth:
            false,
        });
      }

      for (
        let day = 1;
        day <=
        daysInMonth;
        day++
      ) {
        days.push({
          date:
            new Date(
              year,
              month,
              day
            ),

          currentMonth:
            true,
        });
      }

      let nextDay = 1;

      while (
        days.length < 42
      ) {
        days.push({
          date:
            new Date(
              year,
              month + 1,
              nextDay
            ),

          currentMonth:
            false,
        });

        nextDay++;
      }

      return days;
    }, [
      currentDate,
    ]);

  // =======================================================
  // EVENTS FOR DATE
  // =======================================================

  const getEventsForDate = (
    date
  ) => {
    return sortedEvents.filter(
      (
        calendarEvent
      ) => {
        const eventDate =
          parseEventDate(
            calendarEvent.date
          );

        return (
          eventDate &&
          isSameDay(
            eventDate,
            date
          )
        );
      }
    );
  };

  // =======================================================
  // SESSIONS FOR DATE
  // =======================================================

  const getSessionsForDate = (
    date
  ) => {
    return sessions
      .filter(
        (
          session
        ) => {
          const sessionDate =
            getSessionDate(
              session
            );

          return (
            sessionDate &&
            isSameDay(
              sessionDate,
              date
            )
          );
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          new Date(
            second.startedAt ||
              second.endedAt
          ) -
          new Date(
            first.startedAt ||
              first.endedAt
          )
      );
  };

  // =======================================================
  // SELECTED DATE DATA
  // =======================================================

  const selectedDateEvents =
    getEventsForDate(
      selectedDate
    );

  const selectedDateSessions =
    getSessionsForDate(
      selectedDate
    );

  const selectedStudySeconds =
    selectedDateSessions.reduce(
      (
        total,
        session
      ) =>
        total +
        Number(
          session.durationSeconds ||
            0
        ),
      0
    );

  // =======================================================
  // MONTH FOCUS
  // =======================================================

  const monthStudySeconds =
    useMemo(() => {
      return sessions.reduce(
        (
          total,
          session
        ) => {
          const date =
            getSessionDate(
              session
            );

          if (!date) {
            return total;
          }

          if (
            date.getMonth() !==
              currentDate.getMonth() ||
            date.getFullYear() !==
              currentDate.getFullYear()
          ) {
            return total;
          }

          return (
            total +
            Number(
              session.durationSeconds ||
                0
            )
          );
        },
        0
      );
    }, [
      sessions,
      currentDate,
    ]);

  const monthEventCount =
    useMemo(() => {
      return events.filter(
        (
          calendarEvent
        ) => {
          const date =
            parseEventDate(
              calendarEvent.date
            );

          return (
            date &&
            date.getMonth() ===
              currentDate.getMonth() &&
            date.getFullYear() ===
              currentDate.getFullYear()
          );
        }
      ).length;
    }, [
      events,
      currentDate,
    ]);

  const monthName =
    currentDate.toLocaleDateString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );

  // =======================================================
  // NAVIGATION
  // =======================================================

  const previousMonth =
    () => {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() -
            1,
          1
        )
      );
    };

  const nextMonth =
    () => {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() +
            1,
          1
        )
      );
    };

  const goToToday =
    () => {
      const today =
        new Date();

      setCurrentDate(
        today
      );

      setSelectedDate(
        today
      );

      setShowForm(
        false
      );

      setEditingEventId(
        null
      );
    };

  // =======================================================
  // SELECT DATE
  // =======================================================

  const selectDate = (
    date
  ) => {
    setSelectedDate(
      date
    );

    if (
      date.getMonth() !==
        currentDate.getMonth() ||
      date.getFullYear() !==
        currentDate.getFullYear()
    ) {
      setCurrentDate(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          1
        )
      );
    }

    if (
      showForm &&
      !editingEventId
    ) {
      setFormDate(
        getDateKey(
          date
        )
      );
    }
  };

  // =======================================================
  // RESET FORM
  // =======================================================

  const resetForm =
    () => {
      setShowForm(
        false
      );

      setEditingEventId(
        null
      );

      setTitle("");
      setType(
        "assignment"
      );
      setFormDate("");
    };

  // =======================================================
  // ADD EVENT
  // =======================================================

  const openAddForm =
    () => {
      if (saving) {
        return;
      }

      setEditingEventId(
        null
      );

      setTitle("");

      setType(
        "assignment"
      );

      setFormDate(
        getDateKey(
          selectedDate
        )
      );

      setShowForm(
        true
      );

      setError("");
    };

  // =======================================================
  // EDIT EVENT
  // =======================================================

  const openEditForm = (
    calendarEvent
  ) => {
    if (
      saving ||
      isTaskEvent(
        calendarEvent
      )
    ) {
      return;
    }

    const eventDate =
      parseEventDate(
        calendarEvent.date
      );

    const normalizedType =
      String(
        calendarEvent.type ||
          "other"
      ).toLowerCase();

    setEditingEventId(
      calendarEvent._id
    );

    setTitle(
      calendarEvent.title ||
        ""
    );

    setType(
      EVENT_TYPES.some(
        (
          item
        ) =>
          item.value ===
          normalizedType
      )
        ? normalizedType
        : "other"
    );

    setFormDate(
      eventDate
        ? getDateKey(
            eventDate
          )
        : getDateKey(
            selectedDate
          )
    );

    setShowForm(
      true
    );

    setError("");
  };

  // =======================================================
  // SAVE EVENT
  // =======================================================

  const saveEvent =
    async (
      submitEvent
    ) => {
      submitEvent.preventDefault();

      if (saving) {
        return;
      }

      const cleanTitle =
        title.trim();

      if (!cleanTitle) {
        showError(
          "Event title is required."
        );

        return;
      }

      const chosenDate =
        parseDateInput(
          formDate
        );

      if (!chosenDate) {
        showError(
          "Choose a valid event date."
        );

        return;
      }

      try {
        setSaving(
          true
        );

        setError("");

        const editing =
          Boolean(
            editingEventId
          );

        const eventData = {
          title:
            cleanTitle,

          date:
            formDate,

          type,
        };

        const savedEvent =
          editing
            ? await updateCalendarEvent(
                isGuest,
                editingEventId,
                eventData,
                events.find(
                  (
                    calendarEvent
                  ) =>
                    calendarEvent._id ===
                    editingEventId
                ) ||
                  null
              )
            : await createCalendarEvent(
                isGuest,
                eventData
              );

        if (editing) {
          setEvents(
            (
              currentEvents
            ) =>
              currentEvents.map(
                (
                  calendarEvent
                ) =>
                  calendarEvent._id ===
                  savedEvent._id
                    ? savedEvent
                    : calendarEvent
              )
          );

          showSuccess(
            "Event updated"
          );
        } else {
          setEvents(
            (
              currentEvents
            ) => [
              ...currentEvents,
              savedEvent,
            ]
          );

          showSuccess(
            "Event added"
          );
        }

        setSelectedDate(
          chosenDate
        );

        setCurrentDate(
          new Date(
            chosenDate.getFullYear(),
            chosenDate.getMonth(),
            1
          )
        );

        window.dispatchEvent(
          new Event(
            "studyos-events-updated"
          )
        );

        resetForm();
      } catch (
        saveError
      ) {
        console.error(
          "Failed to save event:",
          saveError
        );

        showError(
          saveError?.message ||
            "Couldn't save the event."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  // =======================================================
  // DELETE EVENT
  // =======================================================

  const openDeleteModal = (
    calendarEvent
  ) => {
    if (
      deleting ||
      isTaskEvent(
        calendarEvent
      )
    ) {
      return;
    }

    setDeleteEventId(
      calendarEvent._id
    );
  };

  const closeDeleteModal =
    () => {
      if (deleting) {
        return;
      }

      setDeleteEventId(
        null
      );
    };

  const eventBeingDeleted =
    events.find(
      (
        calendarEvent
      ) =>
        calendarEvent._id ===
        deleteEventId
    );

  const deleteEvent =
    async () => {
      if (
        !deleteEventId ||
        deleting
      ) {
        return;
      }

      try {
        setDeleting(
          true
        );

        await deleteCalendarEvent(
          isGuest,
          deleteEventId
        );

        setEvents(
          (
            currentEvents
          ) =>
            currentEvents.filter(
              (
                calendarEvent
              ) =>
                calendarEvent._id !==
                deleteEventId
            )
        );

        if (
          editingEventId ===
          deleteEventId
        ) {
          resetForm();
        }

        setDeleteEventId(
          null
        );

        window.dispatchEvent(
          new Event(
            "studyos-events-updated"
          )
        );

        showSuccess(
          "Event deleted"
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Delete failed:",
          deleteError
        );

        showError(
          deleteError?.message ||
            "Couldn't delete the event."
        );
      } finally {
        setDeleting(
          false
        );
      }
    };

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="calendar-page calendar-v3-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="dashboard-header calendar-v3-header">

        <div>

          <h1>
            Calendar
          </h1>

          <p>
            Plan upcoming work and see
            what you actually studied.
          </p>

        </div>

        <div className="calendar-v3-header-actions">

          <button
            type="button"
            className="calendar-v3-refresh"
            disabled={
              refreshing
            }
            onClick={() =>
              loadCalendarData(
                true
              )
            }
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "calendar-v3-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>

          <button
            type="button"
            className="add-event-button"
            onClick={
              openAddForm
            }
          >

            <Plus
              size={17}
            />

            Add Event

          </button>

        </div>

      </header>

      {/* ===================================================
          MESSAGES
      =================================================== */}

      {message && (
        <div className="calendar-v2-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="calendar-v2-message error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            Dismiss
          </button>

        </div>
      )}

      {/* ===================================================
          EVENT FORM
      =================================================== */}

      {showForm && (
        <div className="calendar-form-card dashboard-card">

          <div className="card-header">

            <div>

              <h2>
                {editingEventId
                  ? "Edit Event"
                  : "Add Event"}
              </h2>

              <p className="selected-date-label">

                {editingEventId
                  ? "Update the scheduled event."
                  : formatSelectedDate(
                      selectedDate
                    )}

              </p>

            </div>

            <button
              type="button"
              className="close-form-button"
              onClick={
                resetForm
              }
              disabled={
                saving
              }
              aria-label="Close event form"
            >

              <X
                size={17}
              />

            </button>

          </div>

          <form
            className="calendar-event-form calendar-v2-form"
            onSubmit={
              saveEvent
            }
          >

            {/* TITLE */}

            <label>

              Event title

              <input
                type="text"
                placeholder="e.g. Physics Exam"
                value={
                  title
                }
                maxLength={100}
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
                autoFocus
              />

            </label>

            {/* DATE */}

            <div className="calendar-v3-form-field">

              <span>
                Date
              </span>

              <StudyDatePicker
                value={
                  formDate
                }
                onChange={
                  setFormDate
                }
                placeholder="Choose date"
                disabled={
                  saving
                }
              />

            </div>

            {/* EVENT TYPE */}

            <div className="calendar-v3-form-field">

              <span>
                Event type
              </span>

              <StudySelect
                value={
                  type
                }
                onChange={
                  setType
                }
                options={
                  EVENT_TYPES
                }
                placeholder="Assignment"
                className="calendar-v3-type-select"
                disabled={
                  saving
                }
                ariaLabel="Choose event type"
              />

            </div>

            {/* ACTIONS */}

            <div className="calendar-v2-form-actions">

              <button
                type="button"
                className="calendar-v2-cancel"
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
                className="calendar-v2-save"
                disabled={
                  saving
                }
              >

                {saving
                  ? "Saving..."
                  : editingEventId
                    ? "Save Changes"
                    : "Add Event"}

              </button>

            </div>

          </form>

        </div>
      )}

      {/* ===================================================
          MONTH SUMMARY
      =================================================== */}

      <section className="calendar-v3-summary">

        <div>

          <CalendarDays
            size={18}
          />

          <span>
            Scheduled this month
          </span>

          <strong>
            {monthEventCount}
          </strong>

        </div>

        <div>

          <Timer
            size={18}
          />

          <span>
            Focus this month
          </span>

          <strong>
            {formatStudyTime(
              monthStudySeconds
            )}
          </strong>

        </div>

      </section>

      {/* ===================================================
          MAIN LAYOUT
      =================================================== */}

      <section className="calendar-layout">

        {/* =================================================
            MONTH
        ================================================= */}

        <div className="calendar-card dashboard-card">

          <div className="calendar-header">

            <div>

              <span className="calendar-small-label">
                MONTH
              </span>

              <h2>
                {monthName}
              </h2>

            </div>

            <div className="calendar-navigation">

              <button
                type="button"
                onClick={
                  previousMonth
                }
                aria-label="Previous month"
              >
                <ChevronLeft
                  size={17}
                />
              </button>

              <button
                type="button"
                className="today-button"
                onClick={
                  goToToday
                }
              >
                Today
              </button>

              <button
                type="button"
                onClick={
                  nextMonth
                }
                aria-label="Next month"
              >
                <ChevronRight
                  size={17}
                />
              </button>

            </div>

          </div>

          {/* WEEKDAYS */}

          <div className="calendar-weekdays">

            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>

          </div>

          {/* DAYS */}

          <div className="calendar-grid">

            {calendarDays.map(
              (
                {
                  date,
                  currentMonth,
                },
                index
              ) => {
                const dayEvents =
                  getEventsForDate(
                    date
                  );

                const daySessions =
                  getSessionsForDate(
                    date
                  );

                const dayStudySeconds =
                  daySessions.reduce(
                    (
                      total,
                      session
                    ) =>
                      total +
                      Number(
                        session.durationSeconds ||
                          0
                      ),
                    0
                  );

                const today =
                  isSameDay(
                    date,
                    new Date()
                  );

                const selected =
                  isSameDay(
                    date,
                    selectedDate
                  );

                return (
                  <button
                    type="button"
                    key={`${getDateKey(
                      date
                    )}-${index}`}
                    className={[
                      "calendar-day",

                      !currentMonth
                        ? "other-month"
                        : "",

                      today
                        ? "today"
                        : "",

                      selected
                        ? "selected"
                        : "",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(" ")}
                    onClick={() =>
                      selectDate(
                        date
                      )
                    }
                  >

                    <span className="calendar-day-number">
                      {date.getDate()}
                    </span>

                    {dayEvents.length >
                      0 && (
                      <div className="calendar-event-dots">

                        {dayEvents
                          .slice(
                            0,
                            3
                          )
                          .map(
                            (
                              calendarEvent
                            ) => (
                              <span
                                key={
                                  calendarEvent._id
                                }
                                className={`calendar-event-dot calendar-dot-${getTypeClass(
                                  calendarEvent.type
                                )}`}
                              />
                            )
                          )}

                      </div>
                    )}

                    {daySessions.length >
                      0 && (
                      <div className="calendar-v3-focus-indicator">

                        <Timer
                          size={10}
                        />

                        <span>
                          {formatStudyTime(
                            dayStudySeconds
                          )}
                        </span>

                      </div>
                    )}

                    {dayEvents.length >
                      0 && (
                      <span className="calendar-event-count">
                        {dayEvents.length}
                      </span>
                    )}

                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* =================================================
            SELECTED DATE
        ================================================= */}

        <aside className="selected-date-card dashboard-card calendar-v3-selected">

          <div className="selected-date-header">

            <div>

              <span>
                Selected date
              </span>

              <h2>
                {selectedDate.toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                  }
                )}
              </h2>

            </div>

            <button
              type="button"
              className="small-add-event-button"
              onClick={
                openAddForm
              }
              aria-label="Add event"
            >

              <Plus
                size={17}
              />

            </button>

          </div>

          <p className="selected-full-date">
            {formatSelectedDate(
              selectedDate
            )}
          </p>

          {/* DAILY SUMMARY */}

          <div className="calendar-v3-day-summary">

            <div>

              <CalendarDays
                size={15}
              />

              <span>
                {selectedDateEvents.length}
                {" scheduled"}
              </span>

            </div>

            <div>

              <Clock3
                size={15}
              />

              <span>
                {formatStudyTime(
                  selectedStudySeconds
                )}
                {" focused"}
              </span>

            </div>

          </div>

          {/* =================================================
              SCHEDULED
          ================================================= */}

          <div className="calendar-v3-section">

            <div className="calendar-v3-section-title">

              <span>
                SCHEDULED
              </span>

              <strong>
                {selectedDateEvents.length}
              </strong>

            </div>

            {loading ? (

              <p className="calendar-empty">
                Loading...
              </p>

            ) : selectedDateEvents.length ===
              0 ? (

              <div className="calendar-v3-mini-empty">

                <CalendarDays
                  size={20}
                />

                <span>
                  Nothing scheduled.
                </span>

              </div>

            ) : (

              selectedDateEvents.map(
                (
                  calendarEvent
                ) => {
                  const task =
                    isTaskEvent(
                      calendarEvent
                    );

                  return (
                    <div
                      className={[
                        "calendar-event-item",
                        "calendar-v2-event-item",

                        task
                          ? "calendar-task-event"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(" ")}
                      key={
                        calendarEvent._id
                      }
                    >

                      {/* TYPE MARKER */}

                      <div
                        className={`calendar-v2-type-marker ${getTypeClass(
                          calendarEvent.type
                        )}`}
                      />

                      {/* CONTENT */}

                      <div className="calendar-event-info">

                        <strong className="calendar-event-title">
                          {calendarEvent.title}
                        </strong>

                        <div className="calendar-task-meta">

                          <span
                            className={`calendar-v2-type ${getTypeClass(
                              calendarEvent.type
                            )}`}
                          >
                            {getTypeLabel(
                              calendarEvent.type
                            )}
                          </span>

                          {task &&
                            calendarEvent.subjectName && (
                              <span className="calendar-task-subject">

                                <BookOpen
                                  size={11}
                                />

                                {calendarEvent.subjectName}

                              </span>
                            )}

                          {task &&
                            calendarEvent.priority && (
                              <span
                                className={`calendar-task-priority ${calendarEvent.priority}`}
                              >
                                {calendarEvent.priority}
                              </span>
                            )}

                          {task &&
                            calendarEvent.dueTime && (
                              <span className="calendar-task-time">

                                <Clock3
                                  size={11}
                                />

                                {formatTaskTime(
                                  calendarEvent.dueTime
                                )}

                              </span>
                            )}

                        </div>

                      </div>

                      {/* NORMAL EVENT ACTIONS */}

                      {!task && (
                        <div className="calendar-v2-event-actions">

                          <button
                            type="button"
                            className="calendar-v2-edit"
                            onClick={() =>
                              openEditForm(
                                calendarEvent
                              )
                            }
                            aria-label={`Edit ${calendarEvent.title}`}
                          >

                            <Pencil
                              size={15}
                            />

                          </button>

                          <button
                            type="button"
                            className="calendar-v2-delete"
                            onClick={() =>
                              openDeleteModal(
                                calendarEvent
                              )
                            }
                            aria-label={`Delete ${calendarEvent.title}`}
                          >

                            <Trash2
                              size={15}
                            />

                          </button>

                        </div>
                      )}

                    </div>
                  );
                }
              )

            )}

          </div>

          {/* =================================================
              FOCUS HISTORY
          ================================================= */}

          <div className="calendar-v3-section calendar-v3-focus-section">

            <div className="calendar-v3-section-title">

              <span>
                STUDIED
              </span>

              <strong>
                {selectedDateSessions.length}
              </strong>

            </div>

            {selectedDateSessions.length ===
            0 ? (

              <div className="calendar-v3-mini-empty">

                <Timer
                  size={20}
                />

                <span>
                  No Focus sessions.
                </span>

              </div>

            ) : (

              selectedDateSessions.map(
                (
                  session
                ) => (
                  <div
                    className="calendar-v3-session"
                    key={
                      session._id
                    }
                  >

                    <div className="calendar-v3-session-icon">

                      <BookOpen
                        size={15}
                      />

                    </div>

                    <div className="calendar-v3-session-content">

                      <strong>
                        {session.subjectName ||
                          "General Study"}
                      </strong>

                      <span>
                        {formatSessionTime(
                          session.startedAt ||
                            session.endedAt
                        )}
                      </span>

                    </div>

                    <strong className="calendar-v3-session-duration">

                      {formatStudyTime(
                        session.durationSeconds
                      )}

                    </strong>

                  </div>
                )
              )

            )}

          </div>

        </aside>

      </section>

      {/* ===================================================
          DELETE MODAL
      =================================================== */}

      {deleteEventId && (

        <div
          className="delete-modal-overlay"
          onClick={
            closeDeleteModal
          }
        >

          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-delete-title"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="delete-modal-icon">

              <Trash2
                size={21}
              />

            </div>

            <h2 id="calendar-delete-title">
              Delete this event?
            </h2>

            <p>
              This will permanently
              delete{" "}

              <strong>
                "
                {eventBeingDeleted?.title ||
                  "this event"}
                "
              </strong>
              .
            </p>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="cancel-delete-button"
                disabled={
                  deleting
                }
                onClick={
                  closeDeleteModal
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-button"
                disabled={
                  deleting
                }
                onClick={
                  deleteEvent
                }
              >

                {deleting
                  ? "Deleting..."
                  : "Delete Event"}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default Calendar;