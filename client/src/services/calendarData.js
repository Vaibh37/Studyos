import apiRequest from "./api";

import {
  createLocalId,
  localDb,
} from "./localDb";

// =========================================================
// HELPERS
// =========================================================

const sortEvents = (events) => {
  return [...events].sort(
    (a, b) =>
      new Date(a.date) -
      new Date(b.date)
  );
};

const sortSessions = (sessions) => {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.startedAt) -
      new Date(a.startedAt)
  );
};

// =========================================================
// GET EVENTS
// =========================================================

export const getCalendarEvents =
  async (isGuest) => {
    if (isGuest) {
      const events =
        await localDb.getAll(
          "events"
        );

      return sortEvents(
        events
      );
    }

    const events =
      await apiRequest(
        "/api/events"
      );

    return Array.isArray(events)
      ? events
      : [];
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
        method: "POST",

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

    return apiRequest(
      `/api/events/${id}`,
      {
        method: "PUT",

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