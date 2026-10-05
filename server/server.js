const express =
  require("express");

const http =
  require("http");

const cors =
  require("cors");

const {
  Server,
} =
  require("socket.io");

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

const {
  globalApiLimiter,
} =
  require(
    "./middleware/rateLimiters"
  );

const {
  connectSocialDB,
} =
  require(
    "./config/socialDb"
  );

// =========================================
// SOCKET
// =========================================

const socketAuth =
  require(
    "./socket/socketAuth"
  );

const registerLiveStudySocket =
  require(
    "./socket/liveStudySocket"
  );

const registerGroupTypingSocket =
  require(
    "./socket/groupTypingSocket"
  );

const registerGroupReactionSocket =
  require(
    "./socket/groupReactionSocket"
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

const groupRoutes =
  require(
    "./routes/groupRoutes"
  );

// =========================================
// APP
// =========================================


const groupAttachmentRoutes =
  require("./routes/groupAttachmentRoutes");

const app =
  express();

// =========================================
// TRUST RENDER REVERSE PROXY
// =========================================

app.set(
  "trust proxy",
  1
);

const PORT =
  process.env.PORT ||
  5000;

// =========================================
// HTTP SERVER
// =========================================

const server =
  http.createServer(
    app
  );

// =========================================
// SOCKET.IO
// =========================================

const io =
  new Server(
    server,
    {
      cors:
        corsOptions,
    }
  );

// =========================================
// SOCKET AUTH
// =========================================

io.use(
  socketAuth
);

// =========================================
// MAKE IO AVAILABLE TO EXPRESS
// =========================================

app.set(
  "io",
  io
);

// =========================================
// MIDDLEWARE
// =========================================

app.use(
  cors(
    corsOptions
  )
);

// =========================================
// GLOBAL API RATE LIMIT
// =========================================

app.use(
  "/api",
  globalApiLimiter
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
// SOCIAL / STUDY GROUPS
// =========================================

app.use(
  "/api/groups",
  groupRoutes
);

// =========================================
// LEADERBOARD
// =========================================

app.use(
  "/api/leaderboard",
  leaderboardRoutes
);

// =========================================
// SOCKET CONNECTION
// =========================================

io.on(
  "connection",
  (
    socket
  ) => {
    console.log(
      "Authenticated socket connected:",
      socket.id,
      socket.user.uid
    );

    // =====================================
    // LIVE STUDY / CHAT EVENTS
    // =====================================

    registerLiveStudySocket(
      io,
      socket
    );

    // =====================================
    // GROUP TYPING EVENTS
    // =====================================

    registerGroupTypingSocket(
      io,
      socket
    );

    // =====================================
    // GROUP REACTION EVENTS
    // =====================================

    registerGroupReactionSocket(
      io,
      socket
    );

    // =====================================
    // DISCONNECT
    // =====================================

    socket.on(
      "disconnect",
      (
        reason
      ) => {
        console.log(
          "Socket disconnected:",
          socket.id,
          socket.user.uid,
          reason
        );
      }
    );
  }
);

// =========================================
// GROUP ATTACHMENTS
// =========================================

app.use(
  "/api/groups",
  groupAttachmentRoutes
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
// GROUP ATTACHMENTS
// =========================================



// =========================================
// START SERVER
// =========================================

const startServer =
  async () => {
    try {
      await Promise.all([
        connectDB(),
        connectSocialDB(),
      ]);

      server.listen(
        PORT,
        () => {
          console.log(
            `StudyOS server running on port ${PORT}`
          );

          console.log(
            "Socket.IO ready âœ…"
          );
        }
      );
    } catch (error) {
      console.error(
        "SERVER STARTUP ERROR:",
        error.message
      );

      process.exit(1);
    }
  };

startServer();


