const express =
  require("express");

const LeaderboardProfile =
  require(
    "../models/LeaderboardProfile"
  );

const Task =
  require(
    "../models/Task"
  );

const StudySession =
  require(
    "../models/StudySession"
  );

const firebaseAuth =
  require(
    "../middleware/firebaseAuth"
  );

const {
  calculateLeaderboardScore,
  getLeaderboardStartDate,
} = require(
  "../utils/leaderboardScore"
);

const router =
  express.Router();


// =========================================================
// ALL LEADERBOARD ROUTES REQUIRE ACCOUNT LOGIN
// =========================================================

router.use(
  firebaseAuth
);


// =========================================================
// HELPERS
// =========================================================

const cleanDisplayName = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .slice(
      0,
      32
    );
};


const getDefaultName = (
  user
) => {
  const tokenName =
    cleanDisplayName(
      user?.name
    );

  if (tokenName) {
    return tokenName;
  }

  return "StudyOS Student";
};


// =========================================================
// CURRENT USER LEADERBOARD SETTINGS
// =========================================================

router.get(
  "/me",
  async (
    req,
    res
  ) => {
    try {
      const profile =
        await LeaderboardProfile.findOne({
          userId:
            req.user.uid,
        }).lean();

      if (!profile) {
        return res
          .status(200)
          .json({
            profile: {
              displayName:
                getDefaultName(
                  req.user
                ),

              isPublic:
                false,
            },
          });
      }

      return res
        .status(200)
        .json({
          profile: {
            displayName:
              profile.displayName,

            isPublic:
              profile.isPublic,
          },
        });
    } catch (error) {
      console.error(
        "GET LEADERBOARD PROFILE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to load leaderboard settings",
        });
    }
  }
);


// =========================================================
// UPDATE CURRENT USER LEADERBOARD SETTINGS
// =========================================================

router.patch(
  "/me",
  async (
    req,
    res
  ) => {
    try {
      const {
        displayName,
        isPublic,
      } = req.body;

      const cleanName =
        cleanDisplayName(
          displayName
        );

      if (
        cleanName.length <
          2
      ) {
        return res
          .status(400)
          .json({
            message:
              "Leaderboard name must be at least 2 characters",
          });
      }

      if (
        typeof isPublic !==
        "boolean"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Leaderboard visibility must be true or false",
          });
      }

      const profile =
        await LeaderboardProfile.findOneAndUpdate(
          {
            userId:
              req.user.uid,
          },
          {
            $set: {
              displayName:
                cleanName,

              isPublic,
            },
          },
          {
            new: true,

            upsert: true,

            runValidators:
              true,

            setDefaultsOnInsert:
              true,
          }
        );

      return res
        .status(200)
        .json({
          profile: {
            displayName:
              profile.displayName,

            isPublic:
              profile.isPublic,
          },
        });
    } catch (error) {
      console.error(
        "UPDATE LEADERBOARD PROFILE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to update leaderboard settings",
        });
    }
  }
);


// =========================================================
// PUBLIC LEADERBOARD
//
// IMPORTANT:
//
// We return only:
// - leaderboard display name
// - ranking score
// - aggregate Focus minutes
// - aggregate completed task count
//
// No email.
// No subject names.
// No task titles.
// No session records.
// =========================================================

router.get(
  "/",
  async (
    req,
    res
  ) => {
    try {
      const profiles =
        await LeaderboardProfile.find({
          isPublic:
            true,
        })
          .select({
            userId: 1,
            displayName: 1,
          })
          .lean();

      if (
        profiles.length ===
        0
      ) {
        return res
          .status(200)
          .json({
            period:
              "last-7-days",

            leaderboard:
              [],

            currentUserRank:
              null,
          });
      }

      const userIds =
        profiles.map(
          (profile) =>
            profile.userId
        );

      const now =
        new Date();

      const startDate =
        getLeaderboardStartDate(
          now
        );

      // ===================================================
      // LOAD ONLY DATA REQUIRED FOR CURRENT RANKING PERIOD
      // ===================================================

      const [
        sessions,
        tasks,
      ] =
        await Promise.all([
          StudySession.find({
            userId: {
              $in:
                userIds,
            },

            startedAt: {
              $gte:
                startDate,

              $lte:
                now,
            },
          })
            .select({
              userId: 1,

              durationSeconds:
                1,

              startedAt:
                1,

              endedAt:
                1,

              createdAt:
                1,
            })
            .lean(),

          Task.find({
            userId: {
              $in:
                userIds,
            },

            completed:
              true,

            completedAt: {
              $gte:
                startDate,

              $lte:
                now,
            },
          })
            .select({
              userId: 1,

              completed:
                1,

              completedAt:
                1,

              priority:
                1,
            })
            .lean(),
        ]);

      // ===================================================
      // GROUP PRIVATE DATA BY USER
      // ===================================================

      const sessionsByUser =
        new Map();

      const tasksByUser =
        new Map();

      sessions.forEach(
        (session) => {
          if (
            !sessionsByUser.has(
              session.userId
            )
          ) {
            sessionsByUser.set(
              session.userId,
              []
            );
          }

          sessionsByUser
            .get(
              session.userId
            )
            .push(
              session
            );
        }
      );

      tasks.forEach(
        (task) => {
          if (
            !tasksByUser.has(
              task.userId
            )
          ) {
            tasksByUser.set(
              task.userId,
              []
            );
          }

          tasksByUser
            .get(
              task.userId
            )
            .push(
              task
            );
        }
      );

      // ===================================================
      // CALCULATE PUBLIC AGGREGATES
      // ===================================================

      const calculated =
        profiles.map(
          (profile) => {
            const metrics =
              calculateLeaderboardScore({
                sessions:
                  sessionsByUser.get(
                    profile.userId
                  ) || [],

                tasks:
                  tasksByUser.get(
                    profile.userId
                  ) || [],

                referenceDate:
                  now,
              });

            return {
              userId:
                profile.userId,

              displayName:
                profile.displayName,

              score:
                metrics.score,

              focusMinutes:
                metrics.focusMinutes,

              completedTasks:
                metrics.completedTasks,
            };
          }
        );

      // ===================================================
      // RANK
      // ===================================================

      calculated.sort(
        (
          first,
          second
        ) => {
          if (
            second.score !==
            first.score
          ) {
            return (
              second.score -
              first.score
            );
          }

          if (
            second.focusMinutes !==
            first.focusMinutes
          ) {
            return (
              second.focusMinutes -
              first.focusMinutes
            );
          }

          return first.displayName.localeCompare(
            second.displayName
          );
        }
      );

      const leaderboard =
        calculated.map(
          (
            item,
            index
          ) => ({
            rank:
              index + 1,

            displayName:
              item.displayName,

            score:
              item.score,

            focusMinutes:
              item.focusMinutes,

            completedTasks:
              item.completedTasks,

            isCurrentUser:
              item.userId ===
              req.user.uid,
          })
        );

      const currentUser =
        leaderboard.find(
          (item) =>
            item.isCurrentUser
        );

      return res
        .status(200)
        .json({
          period:
            "last-7-days",

          periodStart:
            startDate,

          leaderboard,

          currentUserRank:
            currentUser?.rank ||
            null,
        });
    } catch (error) {
      console.error(
        "GET LEADERBOARD ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to load leaderboard",
        });
    }
  }
);


module.exports =
  router;