import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
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

import "../styles/calendar-v2.css";


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
        Number(
          match[1]
        ),
        Number(
          match[2]
        ) - 1,
        Number(
          match[3]
        )
      );
    }
  }

  const date =
    new Date(
      value
    );

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
    Number(
      match[1]
    ),
    Number(
      match[2]
    ) - 1,
    Number(
      match[3]
    )
  );
};


const isSameDay = (
  first,
  second
) => {
  return (
    getDateKey(
      first
    ) ===
    getDateKey(
      second
    )
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
    new Date(
      value
    );

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
      Number(
        seconds
      ) || 0
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

  if (
    hours > 0
  ) {
    return `${hours}h ${minutes}m`;
  }

  if (
    totalMinutes > 0
  ) {
    return `${totalMinutes}m`;
  }

  if (
    safe > 0
  ) {
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
    new Date(
      value
    );

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
    String(
      value
    )
      .split(":")
      .map(
        Number
      );

  if (
    Number.isNaN(
      hour
    ) ||
    Number.isNaN(
      minute
    )
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
    eventType ||
      "other"
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
  // CALENDAR STATE
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
  // FORM
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


  const showSuccess =
    (
      text
    ) => {
      setError("");
      setMessage(
        text
      );

      window.setTimeout(
        () => {
          setMessage("");
        },
        3000
      );
    };


  const showError =
    (
      text
    ) => {
      setMessage("");
      setError(
        text
      );
    };


  // =======================================================
  // LOAD
  // =======================================================

  const loadCalendarData =
    async (
      manual = false
    ) => {
      try {
        if (
          manual
        ) {
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

        if (
          manual
        ) {
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


  useEffect(() => {
    loadCalendarData();
  }, [
    isGuest,
  ]);


  useEffect(() => {
    const refresh =
      () => {
        loadCalendarData();
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
  // SORTED EVENTS
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

          if (
            !firstDate
          ) {
            return 1;
          }

          if (
            !secondDate
          ) {
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
  // DAYS
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
  // DAY DATA
  // =======================================================

  const getEventsForDate =
    (
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


  const getSessionsForDate =
    (
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
  // MONTH STATS
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

          if (
            !date
          ) {
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
        month:
          "long",

        year:
          "numeric",
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


  const selectDate =
    (
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
  // FORM
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


  const openAddForm =
    () => {
      if (
        saving
      ) {
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


  const openEditForm =
    (
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


  const saveEvent =
    async (
      submitEvent
    ) => {
      submitEvent.preventDefault();

      if (
        saving
      ) {
        return;
      }

      const cleanTitle =
        title.trim();

      if (
        !cleanTitle
      ) {
        showError(
          "Event title is required."
        );

        return;
      }

      const chosenDate =
        parseDateInput(
          formDate
        );

      if (
        !chosenDate
      ) {
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

        if (
          editing
        ) {
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
  // DELETE
  // =======================================================

  const openDeleteModal =
    (
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
      if (
        deleting
      ) {
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
    <div className="v2c-page">

      {/* HEADER */}

      <header className="v2c-header">

        <div>

          <span className="v2c-eyebrow">
            Schedule
          </span>

          <h1>
            Calendar
          </h1>

          <p>
            Plan upcoming work and see what you
            actually studied throughout the month.
          </p>

        </div>


        <div className="v2c-header-actions">

          <button
            type="button"
            className="v2c-secondary-button"
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
                  ? "v2c-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing"
              : "Refresh"}

          </button>


          <button
            type="button"
            className="v2c-primary-button"
            onClick={
              openAddForm
            }
          >

            <Plus
              size={17}
            />

            Add event

          </button>

        </div>

      </header>


      {/* MESSAGES */}

      {message && (
        <div className="v2c-message is-success">

          <CheckCircle2
            size={17}
          />

          <span>
            {message}
          </span>

        </div>
      )}


      {error && (
        <div className="v2c-message is-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            <X
              size={16}
            />
          </button>

        </div>
      )}


      {/* EVENT FORM */}

      {showForm && (
        <section className="v2c-form-card">

          <div className="v2c-form-header">

            <div>

              <span className="v2c-eyebrow">
                {editingEventId
                  ? "Edit event"
                  : "New event"}
              </span>

              <h2>
                {editingEventId
                  ? "Update event"
                  : "Add to your schedule"}
              </h2>

              <p>
                {editingEventId
                  ? "Update the event details below."
                  : formatSelectedDate(
                      selectedDate
                    )}
              </p>

            </div>


            <button
              type="button"
              className="v2c-icon-button"
              onClick={
                resetForm
              }
              disabled={
                saving
              }
              aria-label="Close event form"
            >

              <X
                size={18}
              />

            </button>

          </div>


          <form
            className="v2c-form"
            onSubmit={
              saveEvent
            }
          >

            <label className="v2c-field">

              <span>
                Event title
              </span>

              <input
                type="text"
                placeholder="e.g. Physics exam"
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
                    event.target.value
                  )
                }
                autoFocus
              />

            </label>


            <div className="v2c-field">

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


            <div className="v2c-field">

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
                className="v2c-type-select"
                disabled={
                  saving
                }
                ariaLabel="Choose event type"
              />

            </div>


            <div className="v2c-form-actions">

              <button
                type="button"
                className="v2c-secondary-button"
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
                className="v2c-primary-button"
                disabled={
                  saving
                }
              >

                {saving
                  ? "Saving..."
                  : editingEventId
                    ? "Save changes"
                    : "Add event"}

              </button>

            </div>

          </form>

        </section>
      )}


      {/* MONTH SUMMARY */}

      <section className="v2c-summary">

        <article>

          <span className="v2c-summary-icon">
            <CalendarDays
              size={19}
            />
          </span>

          <div>
            <span>
              Scheduled this month
            </span>

            <strong>
              {monthEventCount}
            </strong>
          </div>

        </article>


        <article>

          <span className="v2c-summary-icon">
            <Timer
              size={19}
            />
          </span>

          <div>
            <span>
              Focus this month
            </span>

            <strong>
              {formatStudyTime(
                monthStudySeconds
              )}
            </strong>
          </div>

        </article>

      </section>


      {/* MAIN */}

      <section className="v2c-layout">

        {/* MONTH CALENDAR */}

        <section className="v2c-calendar">

          <div className="v2c-calendar-header">

            <div>

              <span className="v2c-eyebrow">
                Month
              </span>

              <h2>
                {monthName}
              </h2>

            </div>


            <div className="v2c-navigation">

              <button
                type="button"
                onClick={
                  previousMonth
                }
                aria-label="Previous month"
              >
                <ChevronLeft
                  size={18}
                />
              </button>


              <button
                type="button"
                className="v2c-today"
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
                  size={18}
                />
              </button>

            </div>

          </div>


          {/* WEEKDAYS */}

          <div className="v2c-weekdays">

            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>

          </div>


          {/* DAYS */}

          <div className="v2c-grid">

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
                      "v2c-day",

                      !currentMonth
                        ? "is-other-month"
                        : "",

                      today
                        ? "is-today"
                        : "",

                      selected
                        ? "is-selected"
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

                    <div className="v2c-day-top">

                      <span className="v2c-day-number">
                        {date.getDate()}
                      </span>

                      {dayEvents.length >
                        0 && (
                        <span className="v2c-day-count">
                          {dayEvents.length}
                        </span>
                      )}

                    </div>


                    {dayEvents.length >
                      0 && (
                      <div className="v2c-event-dots">

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
                                className={`v2c-event-dot is-${getTypeClass(
                                  calendarEvent.type
                                )}`}
                              />
                            )
                          )}

                      </div>
                    )}


                    {daySessions.length >
                      0 && (
                      <div className="v2c-day-focus">

                        <Timer
                          size={12}
                        />

                        <span>
                          {formatStudyTime(
                            dayStudySeconds
                          )}
                        </span>

                      </div>
                    )}

                  </button>
                );
              }
            )}

          </div>

        </section>


        {/* SELECTED DAY */}

        <aside className="v2c-selected">

          <div className="v2c-selected-header">

            <div>

              <span className="v2c-eyebrow">
                Selected date
              </span>

              <h2>
                {selectedDate.toLocaleDateString(
                  "en-IN",
                  {
                    day:
                      "numeric",

                    month:
                      "short",
                  }
                )}
              </h2>

            </div>


            <button
              type="button"
              className="v2c-add-small"
              onClick={
                openAddForm
              }
              aria-label="Add event"
            >
              <Plus
                size={18}
              />
            </button>

          </div>


          <p className="v2c-full-date">
            {formatSelectedDate(
              selectedDate
            )}
          </p>


          {/* DAY SUMMARY */}

          <div className="v2c-day-summary">

            <div>

              <CalendarDays
                size={16}
              />

              <span>
                {selectedDateEvents.length} scheduled
              </span>

            </div>


            <div>

              <Timer
                size={16}
              />

              <span>
                {formatStudyTime(
                  selectedStudySeconds
                )} focused
              </span>

            </div>

          </div>


          {/* SCHEDULED */}

          <section className="v2c-section">

            <div className="v2c-section-header">

              <h3>
                Scheduled
              </h3>

              <span>
                {selectedDateEvents.length}
              </span>

            </div>


            {loading ? (

              <div className="v2c-empty-small">
                Loading schedule...
              </div>

            ) : selectedDateEvents.length ===
              0 ? (

              <div className="v2c-empty-small">

                <CalendarDays
                  size={22}
                />

                <strong>
                  Nothing scheduled
                </strong>

                <span>
                  This day is clear.
                </span>

              </div>

            ) : (

              <div className="v2c-event-list">

                {selectedDateEvents.map(
                  (
                    calendarEvent
                  ) => {
                    const task =
                      isTaskEvent(
                        calendarEvent
                      );

                    const typeClass =
                      getTypeClass(
                        calendarEvent.type
                      );

                    return (
                      <article
                        className="v2c-event"
                        key={
                          calendarEvent._id
                        }
                      >

                        <span
                          className={`v2c-event-marker is-${typeClass}`}
                        />


                        <div className="v2c-event-content">

                          <strong>
                            {calendarEvent.title}
                          </strong>


                          <div className="v2c-event-meta">

                            <span
                              className={`v2c-type is-${typeClass}`}
                            >
                              {getTypeLabel(
                                calendarEvent.type
                              )}
                            </span>


                            {task &&
                              calendarEvent.subjectName && (
                                <span>

                                  <BookOpen
                                    size={13}
                                  />

                                  {calendarEvent.subjectName}

                                </span>
                              )}


                            {task &&
                              calendarEvent.priority && (
                                <span
                                  className={`v2c-priority is-${calendarEvent.priority}`}
                                >
                                  {calendarEvent.priority}
                                </span>
                              )}


                            {task &&
                              calendarEvent.dueTime && (
                                <span>

                                  <Clock3
                                    size={13}
                                  />

                                  {formatTaskTime(
                                    calendarEvent.dueTime
                                  )}

                                </span>
                              )}

                          </div>

                        </div>


                        {!task && (
                          <div className="v2c-event-actions">

                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  calendarEvent
                                )
                              }
                              aria-label={`Edit ${calendarEvent.title}`}
                            >
                              <Pencil
                                size={16}
                              />
                            </button>


                            <button
                              type="button"
                              className="is-danger"
                              onClick={() =>
                                openDeleteModal(
                                  calendarEvent
                                )
                              }
                              aria-label={`Delete ${calendarEvent.title}`}
                            >
                              <Trash2
                                size={16}
                              />
                            </button>

                          </div>
                        )}

                      </article>
                    );
                  }
                )}

              </div>

            )}

          </section>


          {/* FOCUS HISTORY */}

          <section className="v2c-section">

            <div className="v2c-section-header">

              <h3>
                Focus history
              </h3>

              <span>
                {selectedDateSessions.length}
              </span>

            </div>


            {selectedDateSessions.length ===
            0 ? (

              <div className="v2c-empty-small">

                <Timer
                  size={22}
                />

                <strong>
                  No focus sessions
                </strong>

                <span>
                  Nothing recorded for this day.
                </span>

              </div>

            ) : (

              <div className="v2c-session-list">

                {selectedDateSessions.map(
                  (
                    session
                  ) => (
                    <article
                      className="v2c-session"
                      key={
                        session._id
                      }
                    >

                      <span className="v2c-session-icon">

                        <BookOpen
                          size={16}
                        />

                      </span>


                      <div>

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


                      <strong className="v2c-session-duration">
                        {formatStudyTime(
                          session.durationSeconds
                        )}
                      </strong>

                    </article>
                  )
                )}

              </div>

            )}

          </section>

        </aside>

      </section>


      {/* DELETE MODAL */}

      {deleteEventId && (
        <div
          className="v2c-delete-overlay"
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
            className="v2c-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v2c-delete-title"
          >

            <span className="v2c-delete-icon">

              <Trash2
                size={22}
              />

            </span>


            <div className="v2c-delete-copy">

              <h2 id="v2c-delete-title">
                Delete event?
              </h2>

              <p>
                Permanently delete{" "}
                <strong>
                  {eventBeingDeleted?.title ||
                    "this event"}
                </strong>
                ?
              </p>

              <span>
                This action cannot be undone.
              </span>

            </div>


            <div className="v2c-delete-actions">

              <button
                type="button"
                className="v2c-secondary-button"
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
                className="v2c-danger-button"
                disabled={
                  deleting
                }
                onClick={
                  deleteEvent
                }
              >

                <Trash2
                  size={16}
                />

                {deleting
                  ? "Deleting..."
                  : "Delete event"}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


export default Calendar;