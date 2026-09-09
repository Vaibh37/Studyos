import apiRequest from "./api";

import {
  localDb,
} from "./localDb";

import {
  createCalendarEvent,
} from "./calendarData";

import {
  createStudySession,
} from "./studySessionData";

// =========================================================
// GUEST STORES
// =========================================================

const GUEST_STORES = [
  "tasks",
  "subjects",
  "notes",
  "events",
  "studySessions",
];

// =========================================================
// READ COMPLETE GUEST SNAPSHOT
// =========================================================

export const getGuestDataSnapshot =
  async () => {
    const [
      tasks,
      subjects,
      notes,
      events,
      studySessions,
    ] = await Promise.all([
      localDb.getAll(
        "tasks"
      ),

      localDb.getAll(
        "subjects"
      ),

      localDb.getAll(
        "notes"
      ),

      localDb.getAll(
        "events"
      ),

      localDb.getAll(
        "studySessions"
      ),
    ]);

    return {
      tasks:
        Array.isArray(tasks)
          ? tasks
          : [],

      subjects:
        Array.isArray(subjects)
          ? subjects
          : [],

      notes:
        Array.isArray(notes)
          ? notes
          : [],

      events:
        Array.isArray(events)
          ? events
          : [],

      studySessions:
        Array.isArray(
          studySessions
        )
          ? studySessions
          : [],
    };
  };

// =========================================================
// COUNT GUEST DATA
// =========================================================

export const getGuestDataCount =
  async () => {
    const data =
      await getGuestDataSnapshot();

    return (
      data.tasks.length +
      data.subjects.length +
      data.notes.length +
      data.events.length +
      data.studySessions.length
    );
  };

// =========================================================
// HAS GUEST DATA
// =========================================================

export const hasGuestData =
  async () => {
    return (
      await getGuestDataCount()
    ) > 0;
  };

// =========================================================
// CLEAR GUEST DATA
// =========================================================

export const clearGuestData =
  async () => {
    await Promise.all(
      GUEST_STORES.map(
        (storeName) =>
          localDb.clear(
            storeName
          )
      )
    );
  };

// =========================================================
// MIGRATE GUEST DATA TO CURRENT SIGNED-IN ACCOUNT
// =========================================================

export const migrateGuestDataToAccount =
  async ({
    clearAfterSuccess = true,
  } = {}) => {
    const guestData =
      await getGuestDataSnapshot();

    const totalItems =
      guestData.tasks.length +
      guestData.subjects.length +
      guestData.notes.length +
      guestData.events.length +
      guestData.studySessions.length;

    if (totalItems === 0) {
      return {
        migrated: false,
        totalItems: 0,

        counts: {
          tasks: 0,
          subjects: 0,
          notes: 0,
          events: 0,
          studySessions: 0,
        },
      };
    }

    const subjectIdMap =
      new Map();

    const migratedCounts = {
      tasks: 0,
      subjects: 0,
      notes: 0,
      events: 0,
      studySessions: 0,
    };

    // =====================================================
    // SUBJECTS FIRST
    // =====================================================

    for (
      const subject
      of guestData.subjects
    ) {
      const createdSubject =
        await apiRequest(
          "/api/subjects",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                name:
                  subject.name ||
                  "Untitled Subject",

                code:
                  subject.code ||
                  "",

                description:
                  subject.description ||
                  "",

                color:
                  subject.color ||
                  "#6366f1",
              }),
          }
        );

      if (
        subject?._id &&
        createdSubject?._id
      ) {
        subjectIdMap.set(
          String(
            subject._id
          ),
          createdSubject._id
        );
      }

      migratedCounts.subjects +=
        1;
    }

    // =====================================================
    // NOTES
    //
    // Notes V2 can be linked to Subjects and pinned.
    // Subjects were migrated first, so remap the guest
    // subject ID to the newly-created account Subject ID.
    // =====================================================

    for (
      const note
      of guestData.notes
    ) {
      const mappedSubjectId =
        note.subjectId
          ? subjectIdMap.get(
              String(
                note.subjectId
              )
            ) ||
            null
          : null;

      await apiRequest(
        "/api/notes",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              title:
                note.title ||
                "Untitled Note",

              content:
                note.content ||
                "",

              subjectId:
                mappedSubjectId,

              pinned:
                Boolean(
                  note.pinned
                ),
            }),
        }
      );

      migratedCounts.notes +=
        1;
    }

    // =====================================================
    // EVENTS
    // =====================================================

    for (
      const calendarEvent
      of guestData.events
    ) {
      await createCalendarEvent(
        false,
        {
          title:
            calendarEvent.title ||
            "Untitled Event",

          date:
            calendarEvent.date,

          type:
            calendarEvent.type ||
            "other",
        }
      );

      migratedCounts.events +=
        1;
    }

    // =====================================================
    // TASKS
    //
    // Tasks V2 stores more than a title. Preserve the guest
    // subject link, priority and deadline fields while
    // remapping the old local Subject ID to the new account
    // Subject ID created above.
    // =====================================================

    for (
      const task
      of guestData.tasks
    ) {
      const mappedSubjectId =
        task.subjectId
          ? subjectIdMap.get(
              String(
                task.subjectId
              )
            ) ||
            null
          : null;

      const safePriority =
        [
          "low",
          "medium",
          "high",
        ].includes(
          task.priority
        )
          ? task.priority
          : "medium";

      const safeDueDate =
        task.dueDate ||
        null;

      const safeDueTime =
        safeDueDate &&
        typeof task.dueTime ===
          "string"
          ? task.dueTime
          : "";

      const createdTask =
        await apiRequest(
          "/api/tasks",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                title:
                  task.title ||
                  "Untitled Task",

                subjectId:
                  mappedSubjectId,

                priority:
                  safePriority,

                dueDate:
                  safeDueDate,

                dueTime:
                  safeDueTime,
              }),
          }
        );

      if (task.completed) {
        await apiRequest(
          `/api/tasks/${createdTask._id}`,
          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                completed:
                  true,
              }),
          }
        );
      }

      migratedCounts.tasks +=
        1;
    }

    // =====================================================
    // STUDY SESSIONS
    // =====================================================

    for (
      const session
      of guestData.studySessions
    ) {
      const mappedSubjectId =
        session.subjectId
          ? subjectIdMap.get(
              String(
                session.subjectId
              )
            ) ||
            null
          : null;

      await createStudySession(
        false,
        {
          subjectId:
            mappedSubjectId,

          subjectName:
            session.subjectName ||
            "General Study",

          plannedMinutes:
            Number(
              session.plannedMinutes
            ) ||
            1,

          durationSeconds:
            Number(
              session.durationSeconds
            ) ||
            1,

          startedAt:
            session.startedAt,

          endedAt:
            session.endedAt,
        }
      );

      migratedCounts.studySessions +=
        1;
    }

    // =====================================================
    // CLEAR GUEST DATA ONLY AFTER FULL SUCCESS
    // =====================================================

    if (clearAfterSuccess) {
      await clearGuestData();
    }

    // =====================================================
    // SYNC OPEN STUDYOS PAGES
    // =====================================================

    [
      "studyos-tasks-updated",
      "studyos-subjects-updated",
      "studyos-notes-updated",
      "studyos-events-updated",
      "studyos-sessions-updated",
    ].forEach(
      (eventName) => {
        window.dispatchEvent(
          new Event(
            eventName
          )
        );
      }
    );

    return {
      migrated: true,
      totalItems,
      counts:
        migratedCounts,
    };
  };

export default {
  getGuestDataSnapshot,
  getGuestDataCount,
  hasGuestData,
  clearGuestData,
  migrateGuestDataToAccount,
};