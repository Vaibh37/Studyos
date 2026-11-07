
const express = require("express");

const firebaseAuth = require(
  "../middleware/firebaseAuth"
);

const VisitStreak = require(
  "../models/VisitStreak"
);

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

function getTimeZone(value) {
  const requested =
    typeof value === "string" && value.length <= 64
      ? value
      : "UTC";

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: requested,
    });

    return requested;
  } catch {
    return "UTC";
  }
}

function dateKeyInTimeZone(timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function ordinalDay(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || "")) {
    return NaN;
  }

  const [year, month, day] = key
    .split("-")
    .map(Number);

  return Date.UTC(
    year,
    month - 1,
    day
  ) / DAY_MS;
}

function resultBody(document, updated) {
  return {
    count: document.count,
    best: document.best,
    lastDate: document.lastDate,
    totalDays: document.totalDays,
    updated,
  };
}

// Existing authenticated user endpoint.
router.get(
  "/me",
  firebaseAuth,
  (req, res) => {
    res.json({
      user: req.user,
    });
  }
);

// Daily streak check-in.
//
// POST /api/auth/streak/check-in
//
// Uses the verified Firebase user ID.
// Calculates today's date on the server.
// Prevents multiple check-ins on the same day.

router.post(
  "/streak/check-in",
  firebaseAuth,
  async (req, res) => {
    res.set(
      "Cache-Control",
      "no-store"
    );

    const userId = req.user.uid;

    const requestedZone = getTimeZone(
      req.body?.timeZone
    );

    try {
      // Optimistic updates prevent simultaneous
      // tabs from increasing the streak twice.

      for (
        let attempt = 0;
        attempt < 5;
        attempt += 1
      ) {
        const existing =
          await VisitStreak.findOne({
            userId,
          });

        const timeZone =
          existing?.timeZone || requestedZone;

        const today =
          dateKeyInTimeZone(timeZone);

        // Already checked in today.

        if (existing?.lastDate === today) {
          return res.json(
            resultBody(existing, false)
          );
        }

        // First-ever check-in.

        if (!existing) {
          try {
            const created =
              await VisitStreak.create({
                userId,
                count: 1,
                best: 1,
                totalDays: 1,
                lastDate: today,
                timeZone,
              });

            return res.json(
              resultBody(created, true)
            );
          } catch (error) {
            // Another tab created the record first.
            if (error.code === 11000) {
              continue;
            }

            throw error;
          }
        }

        // Check whether yesterday was active.

        const consecutive =
          ordinalDay(today) -
            ordinalDay(existing.lastDate) ===
          1;

        const count = consecutive
          ? existing.count + 1
          : 1;

        const updated =
          await VisitStreak.findOneAndUpdate(
            {
              _id: existing._id,
              lastDate: existing.lastDate,
            },
            {
              $set: {
                count,
                best: Math.max(
                  existing.best,
                  count
                ),
                lastDate: today,
              },

              $inc: {
                totalDays: 1,
              },
            },
            {
              new: true,
              runValidators: true,
            }
          );

        if (updated) {
          return res.json(
            resultBody(updated, true)
          );
        }
      }

      return res.status(409).json({
        message:
          "Streak is updating. Please retry.",
      });
    } catch (error) {
      console.error(
        "DAILY STREAK ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Could not update your daily streak.",
      });
    }
  }
);

module.exports = router;
