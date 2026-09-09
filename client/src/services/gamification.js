// =========================================================
// STUDYOS GAMIFICATION ENGINE V1
// =========================================================
//
// XP is derived from real StudyOS activity.
//
// We deliberately do NOT permanently increment an XP number
// every time something happens yet.
//
// Why?
// - prevents XP/data desync
// - existing activity gets credited automatically
// - deleting invalid activity also removes its XP
// - leaderboard can later use the same scoring rules
//
// =========================================================


// =========================================================
// CONFIG
// =========================================================

export const GAMIFICATION_CONFIG = {
  // 1 XP for every full Focus minute.
  XP_PER_FOCUS_MINUTE: 1,

  // Prevent one giant / accidental session from farming
  // unlimited XP.
  MAX_FOCUS_XP_PER_SESSION: 180,

  // Task completion XP.
  TASK_COMPLETION_XP: 15,

  // Extra reward depending on task priority.
  TASK_PRIORITY_BONUS: {
    low: 0,
    medium: 3,
    high: 7,
  },

  // Streak reward added to the summary.
  //
  // This is intentionally modest so actual studying
  // remains more important than just opening the app.
  STREAK_XP_PER_DAY: 5,

  // Cap streak-based XP.
  MAX_STREAK_BONUS_DAYS: 7,
};


// =========================================================
// LEVEL TITLES
// =========================================================

const LEVEL_TITLES = [
  {
    minLevel: 1,
    title: "Starter",
  },

  {
    minLevel: 3,
    title: "Learner",
  },

  {
    minLevel: 5,
    title: "Focused",
  },

  {
    minLevel: 8,
    title: "Consistent",
  },

  {
    minLevel: 12,
    title: "Scholar",
  },

  {
    minLevel: 16,
    title: "Strategist",
  },

  {
    minLevel: 21,
    title: "Master",
  },

  {
    minLevel: 30,
    title: "Elite",
  },
];


// =========================================================
// BASIC HELPERS
// =========================================================

const safeNumber = (
  value
) => {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return number;
};


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
// DATE HELPERS
// =========================================================

export const getGamificationDateKey =
  (
    value = new Date()
  ) => {
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


const startOfDay = (
  value = new Date()
) => {
  const date =
    new Date(
      value
    );

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};


const subtractDays = (
  value,
  days
) => {
  const date =
    startOfDay(
      value
    );

  date.setDate(
    date.getDate() -
      days
  );

  return date;
};


// =========================================================
// SESSION DATE
// =========================================================

const getSessionDate = (
  session
) => {
  const value =
    session?.startedAt ||
    session?.endedAt ||
    session?.createdAt;

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


// =========================================================
// TASK COMPLETION DATE
// =========================================================

const getTaskCompletionDate =
  (
    task
  ) => {
    const value =
      task?.completedAt;

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


// =========================================================
// FOCUS SESSION XP
// =========================================================

export const getSessionXp = (
  session
) => {
  const durationSeconds =
    Math.max(
      0,
      safeNumber(
        session?.durationSeconds
      )
    );

  const fullMinutes =
    Math.floor(
      durationSeconds /
        60
    );

  const rawXp =
    fullMinutes *
    GAMIFICATION_CONFIG
      .XP_PER_FOCUS_MINUTE;

  return Math.min(
    rawXp,
    GAMIFICATION_CONFIG
      .MAX_FOCUS_XP_PER_SESSION
  );
};


// =========================================================
// TASK XP
// =========================================================

export const getTaskXp = (
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

  const priorityBonus =
    GAMIFICATION_CONFIG
      .TASK_PRIORITY_BONUS[
        priority
      ] || 0;

  return (
    GAMIFICATION_CONFIG
      .TASK_COMPLETION_XP +
    priorityBonus
  );
};


// =========================================================
// STUDY STREAK
// =========================================================

export const calculateStudyStreak =
  (
    sessions = [],
    referenceDate =
      new Date()
  ) => {
    const activeDates =
      new Set();

    sessions.forEach(
      (
        session
      ) => {
        // Sessions shorter than one minute do not protect
        // a streak.

        const durationSeconds =
          safeNumber(
            session
              ?.durationSeconds
          );

        if (
          durationSeconds <
          60
        ) {
          return;
        }

        const date =
          getSessionDate(
            session
          );

        if (!date) {
          return;
        }

        const key =
          getGamificationDateKey(
            date
          );

        if (key) {
          activeDates.add(
            key
          );
        }
      }
    );

    if (
      activeDates.size ===
      0
    ) {
      return 0;
    }

    let cursor =
      startOfDay(
        referenceDate
      );

    // A streak should not immediately reset during the
    // current day before the student has studied.
    //
    // If today has no session, begin checking yesterday.

    if (
      !activeDates.has(
        getGamificationDateKey(
          cursor
        )
      )
    ) {
      cursor =
        subtractDays(
          cursor,
          1
        );
    }

    let streak =
      0;

    while (
      activeDates.has(
        getGamificationDateKey(
          cursor
        )
      )
    ) {
      streak += 1;

      cursor =
        subtractDays(
          cursor,
          1
        );
    }

    return streak;
  };


// =========================================================
// LONGEST STUDY STREAK
// =========================================================

export const calculateLongestStreak =
  (
    sessions = []
  ) => {
    const keys =
      [
        ...new Set(
          sessions
            .filter(
              (
                session
              ) =>
                safeNumber(
                  session
                    ?.durationSeconds
                ) >= 60
            )
            .map(
              (
                session
              ) =>
                getSessionDate(
                  session
                )
            )
            .filter(
              Boolean
            )
            .map(
              (
                date
              ) =>
                getGamificationDateKey(
                  date
                )
            )
            .filter(
              Boolean
            )
        ),
      ].sort();

    if (
      keys.length ===
      0
    ) {
      return 0;
    }

    let longest =
      1;

    let current =
      1;

    for (
      let index = 1;
      index <
      keys.length;
      index++
    ) {
      const previous =
        new Date(
          `${keys[index - 1]}T00:00:00`
        );

      const currentDate =
        new Date(
          `${keys[index]}T00:00:00`
        );

      const difference =
        Math.round(
          (
            currentDate -
            previous
          ) /
            (
              1000 *
              60 *
              60 *
              24
            )
        );

      if (
        difference ===
        1
      ) {
        current += 1;

        longest =
          Math.max(
            longest,
            current
          );
      } else {
        current =
          1;
      }
    }

    return longest;
  };


// =========================================================
// XP REQUIRED TO REACH LEVEL
// =========================================================
//
// Level growth becomes gradually harder:
//
// Level 1 = 0 XP
// Level 2 ≈ 100 XP
// Later levels require progressively more effort.
//
// =========================================================

export const getTotalXpForLevel =
  (
    level
  ) => {
    const safeLevel =
      Math.max(
        1,
        Math.floor(
          safeNumber(
            level
          )
        )
      );

    if (
      safeLevel <=
      1
    ) {
      return 0;
    }

    return Math.floor(
      100 *
        Math.pow(
          safeLevel -
            1,
          1.45
        )
    );
  };


// =========================================================
// LEVEL FROM XP
// =========================================================

export const calculateLevel =
  (
    xp
  ) => {
    const safeXp =
      Math.max(
        0,
        Math.floor(
          safeNumber(
            xp
          )
        )
      );

    let level =
      1;

    // Safety ceiling.
    //
    // Nobody is realistically reaching this from normal
    // StudyOS usage, but it prevents accidental infinite
    // loops if corrupted data somehow appears.

    while (
      level < 500 &&
      safeXp >=
        getTotalXpForLevel(
          level + 1
        )
    ) {
      level += 1;
    }

    const levelStartXp =
      getTotalXpForLevel(
        level
      );

    const nextLevelXp =
      getTotalXpForLevel(
        level + 1
      );

    const xpIntoLevel =
      Math.max(
        0,
        safeXp -
          levelStartXp
      );

    const xpRequiredForLevel =
      Math.max(
        1,
        nextLevelXp -
          levelStartXp
      );

    const progress =
      Math.min(
        100,
        Math.round(
          (
            xpIntoLevel /
            xpRequiredForLevel
          ) *
            100
        )
      );

    return {
      level,

      totalXp:
        safeXp,

      levelStartXp,

      nextLevelXp,

      xpIntoLevel,

      xpRequiredForLevel,

      xpToNextLevel:
        Math.max(
          0,
          nextLevelXp -
            safeXp
        ),

      progress,
    };
  };


// =========================================================
// LEVEL TITLE
// =========================================================

export const getLevelTitle =
  (
    level
  ) => {
    const safeLevel =
      Math.max(
        1,
        Number(
          level
        ) || 1
      );

    let title =
      LEVEL_TITLES[0]
        .title;

    LEVEL_TITLES.forEach(
      (
        item
      ) => {
        if (
          safeLevel >=
          item.minLevel
        ) {
          title =
            item.title;
        }
      }
    );

    return title;
  };


// =========================================================
// XP IN DATE RANGE
// =========================================================

const calculateXpInRange =
  ({
    sessions,
    tasks,
    startDate,
    endDate,
  }) => {
    const start =
      startOfDay(
        startDate
      );

    const end =
      new Date(
        endDate
      );

    end.setHours(
      23,
      59,
      59,
      999
    );

    let focusXp =
      0;

    let taskXp =
      0;

    sessions.forEach(
      (
        session
      ) => {
        const date =
          getSessionDate(
            session
          );

        if (
          !date ||
          date < start ||
          date > end
        ) {
          return;
        }

        focusXp +=
          getSessionXp(
            session
          );
      }
    );

    tasks.forEach(
      (
        task
      ) => {
        if (
          !task.completed
        ) {
          return;
        }

        const date =
          getTaskCompletionDate(
            task
          );

        if (
          !date ||
          date < start ||
          date > end
        ) {
          return;
        }

        taskXp +=
          getTaskXp(
            task
          );
      }
    );

    return {
      focusXp,
      taskXp,

      totalXp:
        focusXp +
        taskXp,
    };
  };


// =========================================================
// MAIN GAMIFICATION SUMMARY
// =========================================================

export const calculateGamification =
  ({
    sessions = [],
    tasks = [],
    referenceDate =
      new Date(),
  } = {}) => {
    const safeSessions =
      Array.isArray(
        sessions
      )
        ? sessions
        : [];

    const safeTasks =
      Array.isArray(
        tasks
      )
        ? tasks
        : [];

    // =====================================================
    // BASE XP — ALL TIME
    // =====================================================

    const focusXp =
      safeSessions.reduce(
        (
          total,
          session
        ) =>
          total +
          getSessionXp(
            session
          ),
        0
      );

    const taskXp =
      safeTasks.reduce(
        (
          total,
          task
        ) =>
          total +
          getTaskXp(
            task
          ),
        0
      );

    // =====================================================
    // STREAK
    // =====================================================

    const streak =
      calculateStudyStreak(
        safeSessions,
        referenceDate
      );

    const longestStreak =
      calculateLongestStreak(
        safeSessions
      );

    const streakBonusDays =
      Math.min(
        streak,
        GAMIFICATION_CONFIG
          .MAX_STREAK_BONUS_DAYS
      );

    const streakXp =
      streakBonusDays *
      GAMIFICATION_CONFIG
        .STREAK_XP_PER_DAY;

    // =====================================================
    // TOTAL XP
    // =====================================================

    const totalXp =
      focusXp +
      taskXp +
      streakXp;

    const levelInfo =
      calculateLevel(
        totalXp
      );

    // =====================================================
    // TODAY XP
    // =====================================================

    const today =
      startOfDay(
        referenceDate
      );

    const todayXp =
      calculateXpInRange({
        sessions:
          safeSessions,

        tasks:
          safeTasks,

        startDate:
          today,

        endDate:
          today,
      });

    // =====================================================
    // WEEK XP
    // =====================================================

    const weekStart =
      subtractDays(
        today,
        6
      );

    const weekXp =
      calculateXpInRange({
        sessions:
          safeSessions,

        tasks:
          safeTasks,

        startDate:
          weekStart,

        endDate:
          today,
      });

    // =====================================================
    // TOTAL FOCUS TIME
    // =====================================================

    const totalFocusSeconds =
      safeSessions.reduce(
        (
          total,
          session
        ) =>
          total +
          Math.max(
            0,
            safeNumber(
              session
                ?.durationSeconds
            )
          ),
        0
      );

    // =====================================================
    // COMPLETED TASKS
    // =====================================================

    const completedTasks =
      safeTasks.filter(
        (
          task
        ) =>
          Boolean(
            task.completed
          )
      ).length;

    // =====================================================
    // RETURN
    // =====================================================

    return {
      ...levelInfo,

      title:
        getLevelTitle(
          levelInfo.level
        ),

      xpBreakdown: {
        focus:
          focusXp,

        tasks:
          taskXp,

        streak:
          streakXp,
      },

      todayXp:
        todayXp.totalXp,

      todayFocusXp:
        todayXp.focusXp,

      todayTaskXp:
        todayXp.taskXp,

      weeklyXp:
        weekXp.totalXp,

      weeklyFocusXp:
        weekXp.focusXp,

      weeklyTaskXp:
        weekXp.taskXp,

      streak,

      longestStreak,

      totalFocusSeconds,

      completedTasks,

      sessionCount:
        safeSessions.length,
    };
  };


// =========================================================
// OPTIONAL FORMATTING
// =========================================================

export const formatGamificationXp =
  (
    value
  ) => {
    const xp =
      Math.max(
        0,
        Math.floor(
          safeNumber(
            value
          )
        )
      );

    return `${xp.toLocaleString(
      "en-IN"
    )} XP`;
  };