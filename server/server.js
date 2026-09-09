const express =
  require("express");

const cors =
  require("cors");

// =========================================
// LOAD ENV FIRST
// =========================================

require(
  "dotenv"
).config();

// =========================================
// CONFIG
// =========================================

const corsOptions =
  require(
    "./config/corsOptions"
  );

const connectDB =
  require(
    "./config/db"
  );

// =========================================
// ROUTES
// =========================================

const taskRoutes =
  require(
    "./routes/taskRoutes"
  );

const subjectRoutes =
  require(
    "./routes/subjectRoutes"
  );

const noteRoutes =
  require(
    "./routes/noteRoutes"
  );

const eventRoutes =
  require(
    "./routes/eventRoutes"
  );

const studySessionRoutes =
  require(
    "./routes/studySessionRoutes"
  );

const authRoutes =
  require(
    "./routes/authRoutes"
  );

const leaderboardRoutes =
  require(
    "./routes/leaderboardRoutes"
  );

// =========================================
// APP
// =========================================

const app =
  express();

const PORT =
  process.env.PORT ||
  5000;

// =========================================
// DATABASE
// =========================================

connectDB();

// =========================================
// MIDDLEWARE
// =========================================

app.use(
  cors(
    corsOptions
  )
);

app.use(
  express.json()
);

// =========================================
// ROOT
// =========================================

app.get(
  "/",
  (
    req,
    res
  ) => {
    res.json({
      message:
        "StudyOS API is running",
    });
  }
);

// =========================================
// HEALTH
// =========================================

app.get(
  "/api/health",
  (
    req,
    res
  ) => {
    res.json({
      status:
        "ok",

      message:
        "StudyOS backend is healthy",
    });
  }
);

// =========================================
// AUTH
// =========================================

app.use(
  "/api/auth",
  authRoutes
);

// =========================================
// STUDYOS ROUTES
// =========================================

app.use(
  "/api/tasks",
  taskRoutes
);

app.use(
  "/api/subjects",
  subjectRoutes
);

app.use(
  "/api/notes",
  noteRoutes
);

app.use(
  "/api/events",
  eventRoutes
);

app.use(
  "/api/study-sessions",
  studySessionRoutes
);

// =========================================
// LEADERBOARD
// =========================================

app.use(
  "/api/leaderboard",
  leaderboardRoutes
);

// =========================================
// START SERVER
// =========================================

app.listen(
  PORT,
  () => {
    console.log(
      `StudyOS server running on port ${PORT}`
    );
  }
);