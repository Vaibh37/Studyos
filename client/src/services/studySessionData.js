import apiRequest from "./api";

import {
  createLocalId,
  localDb,
} from "./localDb";

// =========================================================
// SORT
// =========================================================

const sortSessions = (
  sessions
) => {
  return [
    ...sessions,
  ].sort(
    (a, b) =>
      new Date(
        b.startedAt ||
          b.endedAt ||
          b.createdAt ||
          0
      ) -
      new Date(
        a.startedAt ||
          a.endedAt ||
          a.createdAt ||
          0
      )
  );
};

// =========================================================
// GET ALL STUDY SESSIONS
// =========================================================

export const getStudySessions =
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

// =========================================================
// CREATE STUDY SESSION
// =========================================================

export const createStudySession =
  async (
    isGuest,
    sessionData
  ) => {
    // =====================================
    // GUEST
    // =====================================

    if (isGuest) {
      const now =
        new Date()
          .toISOString();

      const newSession = {
        _id:
          createLocalId(),

        subjectId:
          sessionData.subjectId ||
          null,

        subjectName:
          sessionData.subjectName ||
          "General Study",

        plannedMinutes:
          Number(
            sessionData.plannedMinutes
          ) || 1,

        durationSeconds:
          Number(
            sessionData.durationSeconds
          ) || 1,

        startedAt:
          sessionData.startedAt ||
          now,

        endedAt:
          sessionData.endedAt ||
          now,

        createdAt:
          now,

        updatedAt:
          now,
      };

      await localDb.put(
        "studySessions",
        newSession
      );

      return newSession;
    }

    // =====================================
    // ACCOUNT
    // =====================================

    return apiRequest(
      "/api/study-sessions",
      {
        method: "POST",

        body:
          JSON.stringify(
            sessionData
          ),
      }
    );
  };

// =========================================================
// DELETE ONE SESSION
// =========================================================

export const deleteStudySession =
  async (
    isGuest,
    id
  ) => {
    if (isGuest) {
      await localDb.remove(
        "studySessions",
        id
      );

      return {
        message:
          "Study session deleted",
      };
    }

    return apiRequest(
      `/api/study-sessions/${id}`,
      {
        method:
          "DELETE",
      }
    );
  };

// =========================================================
// CLEAR ALL STUDY SESSIONS
// =========================================================

export const clearStudySessions =
  async (isGuest) => {
    if (isGuest) {
      await localDb.clear(
        "studySessions"
      );

      return {
        message:
          "Study sessions cleared",
      };
    }

    const sessions =
      await getStudySessions(
        false
      );

    for (
      const session
      of sessions
    ) {
      await apiRequest(
        `/api/study-sessions/${session._id}`,
        {
          method:
            "DELETE",
        }
      );
    }

    return {
      message:
        "Study sessions cleared",
    };
  };