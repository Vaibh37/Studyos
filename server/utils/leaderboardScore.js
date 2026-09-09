// =========================================================
// STUDYOS VERIFIED LEADERBOARD SCORE V1
// =========================================================
//
// This score is intentionally calculated SERVER-SIDE.
//
// It is separate from the user's personal all-time XP.
//
// Ranking period:
// Last 7 days.
//
// Anti-spam:
// - 1 XP per verified Focus minute
// - max 180 XP from one session
// - max 360 Focus XP per day
// - task XP has a daily cap
//
// =========================================================


// =========================================================
// CONFIG
// =========================================================

const CONFIG = {
  XP_PER_FOCUS_MINUTE: 1,

  MAX_FOCUS_XP_PER_SESSION:
    180,

  MAX_FOCUS_XP_PER_DAY:
    360,

  TASK_COMPLETION_XP:
    15,

  TASK_PRIORITY_BONUS: {
    low: 0,
    medium: 3,
    high: 7,
  },

  MAX_TASK_XP_PER_DAY:
    100,

  PERIOD_DAYS:
    7,
};


// =========================================================
// NUMBER
// =========================================================

const safeNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};


// =========================================================
// PRIORITY
// =========================================================

const normalizePriority = (
  value
) => {
  const priority =
    String(
      value ||
        "medium"
    ).toLowerCase();

  if (
    priority === "high" ||
    priority === "low"
  ) {
    return priority;
  }

  return "medium";
};


// =========================================================
// DATE KEY
//
// UTC is used deliberately.
//
// That keeps ranking calculations deterministic on the
// backend regardless of where the API server is hosted.
// =========================================================

const getDateKey = (
  value
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
};


// =========================================================
// PERIOD START
// =========================================================

const getLeaderboardStartDate =
  (
    referenceDate =
      new Date()
  ) => {
    const end =
      new Date(
        referenceDate
      );

    const start =
      new Date(end);

    start.setUTCDate(
      start.getUTCDate() -
        (
          CONFIG.PERIOD_DAYS -
          1
        )
    );

    start.setUTCHours(
      0,
      0,
      0,
      0
    );

    return start;
  };


// =========================================================
// SESSION XP
// =========================================================

const getSessionXp = (
  session
) => {
  const durationSeconds =
    Math.max(
      0,
      safeNumber(
        session
          ?.durationSeconds
      )
    );

  const minutes =
    Math.floor(
      durationSeconds /
        60
    );

  const rawXp =
    minutes *
    CONFIG
      .XP_PER_FOCUS_MINUTE;

  return Math.min(
    rawXp,
    CONFIG
      .MAX_FOCUS_XP_PER_SESSION
  );
};


// =========================================================
// TASK XP
// =========================================================

const getTaskXp = (
  task
) => {
  if (
    !task?.completed
  ) {
    return 0;
  }

  const priority =
    normalizePriority(
      task.priority
    );

  return (
    CONFIG
      .TASK_COMPLETION_XP +
    (
      CONFIG
        .TASK_PRIORITY_BONUS[
          priority
        ] || 0
    )
  );
};


// =========================================================
// CALCULATE ONE USER
// =========================================================

const calculateLeaderboardScore =
  ({
    sessions = [],
    tasks = [],
    referenceDate =
      new Date(),
  } = {}) => {
    const startDate =
      getLeaderboardStartDate(
        referenceDate
      );

    const daily =
      new Map();

    const ensureDay =
      (key) => {
        if (
          !daily.has(key)
        ) {
          daily.set(
            key,
            {
              focusXp: 0,
              taskXp: 0,

              focusMinutes:
                0,

              completedTasks:
                0,
            }
          );
        }

        return daily.get(
          key
        );
      };

    // =====================================================
    // FOCUS
    // =====================================================

    sessions.forEach(
      (session) => {
        const date =
          new Date(
            session?.startedAt ||
              session?.endedAt ||
              session?.createdAt
          );

        if (
          Number.isNaN(
            date.getTime()
          ) ||
          date <
            startDate ||
          date >
            referenceDate
        ) {
          return;
        }

        const key =
          getDateKey(date);

        if (!key) {
          return;
        }

        const day =
          ensureDay(key);

        const sessionXp =
          getSessionXp(
            session
          );

        const availableXp =
          Math.max(
            0,
            CONFIG
              .MAX_FOCUS_XP_PER_DAY -
              day.focusXp
          );

        const awardedXp =
          Math.min(
            sessionXp,
            availableXp
          );

        day.focusXp +=
          awardedXp;

        // Since Focus is 1 XP / minute,
        // verified minutes match awarded Focus XP.

        day.focusMinutes +=
          awardedXp;
      }
    );

    // =====================================================
    // TASKS
    // =====================================================

    tasks.forEach(
      (task) => {
        if (
          !task?.completed ||
          !task?.completedAt
        ) {
          return;
        }

        const date =
          new Date(
            task.completedAt
          );

        if (
          Number.isNaN(
            date.getTime()
          ) ||
          date <
            startDate ||
          date >
            referenceDate
        ) {
          return;
        }

        const key =
          getDateKey(date);

        if (!key) {
          return;
        }

        const day =
          ensureDay(key);

        const taskXp =
          getTaskXp(
            task
          );

        const availableXp =
          Math.max(
            0,
            CONFIG
              .MAX_TASK_XP_PER_DAY -
              day.taskXp
          );

        const awardedXp =
          Math.min(
            taskXp,
            availableXp
          );

        if (
          awardedXp >
          0
        ) {
          day.taskXp +=
            awardedXp;

          day.completedTasks +=
            1;
        }
      }
    );

    // =====================================================
    // TOTAL
    // =====================================================

    let focusXp =
      0;

    let taskXp =
      0;

    let focusMinutes =
      0;

    let completedTasks =
      0;

    daily.forEach(
      (day) => {
        focusXp +=
          day.focusXp;

        taskXp +=
          day.taskXp;

        focusMinutes +=
          day.focusMinutes;

        completedTasks +=
          day.completedTasks;
      }
    );

    return {
      score:
        focusXp +
        taskXp,

      focusXp,

      taskXp,

      focusMinutes,

      completedTasks,

      periodDays:
        CONFIG
          .PERIOD_DAYS,

      periodStart:
        startDate,
    };
  };


module.exports = {
  CONFIG,

  getLeaderboardStartDate,

  calculateLeaderboardScore,
};