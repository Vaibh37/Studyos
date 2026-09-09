import apiRequest from "./api";

import {
  createLocalId,
  localDb,
} from "./localDb";

// =========================================================
// HELPERS
// =========================================================

const sortEvents = (
  events
) => {
  return [
    ...events,
  ].sort(
    (a, b) => {
      const dateA =
        new Date(
          a.date
        );

      const dateB =
        new Date(
          b.date
        );

      return (
        dateA - dateB
      );
    }
  );
};

const sortSessions = (
  sessions
) => {
  return [
    ...sessions,
  ].sort(
    (a, b) =>
      new Date(
        b.startedAt
      ) -
      new Date(
        a.startedAt
      )
  );
};

// =========================================================
// TASK → CALENDAR ITEM
// =========================================================

const taskToCalendarEvent =
  (task) => {
    return {
      _id:
        `task:${task._id}`,

      title:
        task.title,

      date:
        task.dueDate,

      type:
        "task",

      source:
        "task",

      taskId:
        task._id,

      subjectId:
        task.subjectId ||
        null,

      subjectName:
        task.subjectName ||
        "",

      priority:
        task.priority ||
        "medium",

      dueTime:
        task.dueTime ||
        "",

      completed:
        Boolean(
          task.completed
        ),

      createdAt:
        task.createdAt,

      updatedAt:
        task.updatedAt,
    };
  };

// =========================================================
// GET EVENTS + TASK DEADLINES
// =========================================================

export const getCalendarEvents =
  async (isGuest) => {
    let events = [];
    let tasks = [];

    // =====================================================
    // GUEST MODE
    // =====================================================

    if (isGuest) {
      [
        events,
        tasks,
      ] =
        await Promise.all([
          localDb.getAll(
            "events"
          ),

          localDb.getAll(
            "tasks"
          ),
        ]);
    }

    // =====================================================
    // ACCOUNT MODE
    // =====================================================

    else {
      [
        events,
        tasks,
      ] =
        await Promise.all([
          apiRequest(
            "/api/events"
          ),

          apiRequest(
            "/api/tasks"
          ),
        ]);
    }

    const safeEvents =
      Array.isArray(
        events
      )
        ? events
        : [];

    const safeTasks =
      Array.isArray(
        tasks
      )
        ? tasks
        : [];

    // =====================================================
    // ONLY PENDING TASKS WITH DEADLINES
    // =====================================================

    const taskEvents =
      safeTasks
        .filter(
          (task) =>
            Boolean(
              task.dueDate
            ) &&
            !task.completed
        )
        .map(
          taskToCalendarEvent
        );

    // =====================================================
    // MERGE WITHOUT DUPLICATING DATABASE RECORDS
    // =====================================================

    return sortEvents([
      ...safeEvents,
      ...taskEvents,
    ]);
  };

// =========================================================
// CREATE EVENT
// =========================================================

export const createCalendarEvent =
  async (
    isGuest,
    eventData
  ) => {
    if (isGuest) {
      const now =
        new Date()
          .toISOString();

      const newEvent = {
        _id:
          createLocalId(),

        title:
          eventData.title,

        date:
          eventData.date,

        type:
          eventData.type ||
          "other",

        createdAt:
          now,

        updatedAt:
          now,
      };

      await localDb.put(
        "events",
        newEvent
      );

      return newEvent;
    }

    return apiRequest(
      "/api/events",
      {
        method:
          "POST",

        body:
          JSON.stringify(
            eventData
          ),
      }
    );
  };

// =========================================================
// UPDATE EVENT
// =========================================================

export const updateCalendarEvent =
  async (
    isGuest,
    id,
    eventData,
    existingEvent = null
  ) => {
    // =====================================================
    // TASK DEADLINES ARE NOT CALENDAR EVENTS
    // =====================================================

    if (
      String(
        id
      ).startsWith(
        "task:"
      )
    ) {
      throw new Error(
        "Task deadlines must be edited from Tasks."
      );
    }

    // =====================================================
    // GUEST EVENT
    // =====================================================

    if (isGuest) {
      let currentEvent =
        existingEvent;

      if (!currentEvent) {
        currentEvent =
          await localDb.getOne(
            "events",
            id
          );
      }

      if (!currentEvent) {
        throw new Error(
          "Event not found"
        );
      }

      const updatedEvent = {
        ...currentEvent,

        ...eventData,

        _id:
          currentEvent._id,

        updatedAt:
          new Date()
            .toISOString(),
      };

      await localDb.put(
        "events",
        updatedEvent
      );

      return updatedEvent;
    }

    // =====================================================
    // ACCOUNT EVENT
    // =====================================================

    return apiRequest(
      `/api/events/${id}`,
      {
        method:
          "PUT",

        body:
          JSON.stringify(
            eventData
          ),
      }
    );
  };

// =========================================================
// DELETE EVENT
// =========================================================

export const deleteCalendarEvent =
  async (
    isGuest,
    id
  ) => {
    // =====================================================
    // TASK DEADLINES ARE CONTROLLED FROM TASKS
    // =====================================================

    if (
      String(
        id
      ).startsWith(
        "task:"
      )
    ) {
      throw new Error(
        "Task deadlines must be deleted from Tasks."
      );
    }

    // =====================================================
    // GUEST EVENT
    // =====================================================

    if (isGuest) {
      await localDb.remove(
        "events",
        id
      );

      return {
        message:
          "Event deleted successfully",
      };
    }

    // =====================================================
    // ACCOUNT EVENT
    // =====================================================

    return apiRequest(
      `/api/events/${id}`,
      {
        method:
          "DELETE",
      }
    );
  };

// =========================================================
// GET STUDY SESSIONS
// =========================================================

export const getCalendarStudySessions =
  async (isGuest) => {
    if (isGuest) {
      const sessions =
        await localDb.getAll(
          "studySessions"
        );

      return sortSessions(
        sessions
      );
    }

    const sessions =
      await apiRequest(
        "/api/study-sessions"
      );

    return Array.isArray(
      sessions
    )
      ? sessions
      : [];
  };