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

const systemRoutes =
  require(
    "./routes/systemRoutes"
  );

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

      api:
        "/api",

      health:
        "/api/health",

      status:
        "/api/status",

      uptime:
        "/api/uptime",
    });
  }
);

// =========================================
// SYSTEM / OBSERVABILITY
// =========================================

app.use(
  "/api",
  systemRoutes
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
// API 404
// =========================================

app.use(
  "/api",
  (
    req,
    res
  ) => {
    res
      .status(
        404
      )
      .json({
        message:
          "StudyOS API route not found",
      });
  }
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
