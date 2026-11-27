const { logError } = require("./utils/safeLogger");
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

const { trustedProxyHops } = require("./utils/clientIp");
const {
  blockBannedApiIp,
  blockBannedSocketIp,
  disconnectBannedSockets,
} = require("./middleware/ipBans");

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

const accountDeletionRoutes = require("./routes/accountDeletionRoutes");

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

const securityAdminRoutes = require("./routes/securityAdminRoutes");

const { getAuthenticatedUserRoom } = require("./utils/groupRoomAccess");
const {
  migrateUploadAuthorizationTtlIndex,
  runGroupOrphanSweep,
} = require("./services/r2OrphanSweep");
const { registerSocketInboundProtection } = require("./utils/socketInboundProtection");
const { createSocketAdmission } = require("./utils/socketAdmission");
const appCheckGuard = require("./middleware/appCheckGuard");
const { createProductionMetrics } = require("./utils/productionMetrics");
const {
  validateApiRequest,
  validateParsedJson,
  safeApiErrorHandler,
} = require("./middleware/apiRequestSafety");
const {
  SOCKET_SESSION_CHECK_MS,
  enforceSocketExpiry,
  disconnectInvalidFirebaseSockets,
} = require("./utils/firebaseSocketSessionGuard");

const app =
  express();
app.disable("x-powered-by");

// =========================================
// TRUST RENDER REVERSE PROXY
// =========================================

app.set(
  "trust proxy",
  trustedProxyHops()
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

// Bound slow HTTP headers/bodies. Attachments upload directly to R2, so
// the application API does not need multi-minute request-body timeouts.
server.headersTimeout = 15_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;

// =========================================
// SOCKET.IO
// =========================================

const io =
  new Server(
    server,
    {
      cors: corsOptions,
      allowRequest: createSocketAdmission(),
      maxHttpBufferSize: 32 * 1024,
      connectTimeout: 30_000,
    }
  );

// =========================================
// SOCKET AUTH
// =========================================

io.use(blockBannedSocketIp);
io.use(appCheckGuard.socket);

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

const productionMetrics = createProductionMetrics({ activeSocketCount: () => io.sockets.sockets.size });
// Mount before CORS/auth so rejected requests and rate limits are counted.
app.use("/api", productionMetrics.middleware);

// Apply even to early rejections (CORS, rate limit, bans, malformed bodies).
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  next();
});
app.use(cors(corsOptions));

// =========================================
// GLOBAL API RATE LIMIT
// =========================================

app.use(
  "/api",
  globalApiLimiter
);

app.use("/api", blockBannedApiIp);

// Reject oversized/unsupported requests before JSON body parsing.
app.use("/api", validateApiRequest);

// Explicitly preserve Express's existing 100kb JSON parser budget.
app.use(express.json({ limit: "100kb", strict: true }));
app.use("/api", validateParsedJson);
// Audit mode or explicit enforcement; disabled by default until rollout.
app.use("/api", appCheckGuard.http);


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

app.use("/api/account", accountDeletionRoutes);

// Disabled unless STUDYOS_SECURITY_ADMIN_UID is configured.
app.use("/api/security", securityAdminRoutes);

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
    if (!enforceSocketExpiry(socket)) return;
    appCheckGuard.recordAuthenticatedSocket(socket);
    productionMetrics.socketOpened();
    socket.once("disconnect", productionMetrics.socketClosed);

    // Fail early before any event handler can query MongoDB or broadcast.
    // Limit by authenticated account across every open tab and device.
    registerSocketInboundProtection(socket);

    // Every authenticated connection has a private revocation room.
    socket.join(getAuthenticatedUserRoom(socket.user.uid));

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


// Sanitize body parsing, CORS and unexpected handler errors. Do not leak
// invalid payloads, token values or backend stack traces to API clients.
app.use("/api", safeApiErrorHandler);

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

      // Remove the legacy TTL index that discarded upload records before
      // their R2 objects could be reconciled.
      try {
        await migrateUploadAuthorizationTtlIndex();
      } catch (migrationError) {
        logError("R2 upload authorization index migration failed:", migrationError);
      }

      // Audit by default. An explicit server-side environment variable is
      // required before the sweep can delete any actual R2 object.
      // Cursor and confirmations are persisted in social MongoDB.
      const orphanMode = process.env.STUDYOS_R2_ORPHAN_MODE || "audit";
      let orphanSweepRunning = false;
      const sweepOrphans = async () => {
        if (orphanMode === "off" || orphanSweepRunning) return;
        orphanSweepRunning = true;
        try {
          await runGroupOrphanSweep({
            mode: orphanMode === "delete" ? "delete" : "audit",
          });
        } catch (error) {
          logError("R2 orphan audit failed:", error);
        } finally {
          orphanSweepRunning = false;
        }
      };
      if (orphanMode !== "off") {
        const firstSweep = setTimeout(sweepOrphans, 30 * 1000);
        firstSweep.unref();
        const orphanInterval = setInterval(sweepOrphans, 2 * 60 * 60 * 1000);
        orphanInterval.unref();
      }

      // Existing sockets can outlive their original Firebase ID token.
      // Recheck revocation/disabled state and disconnect expired sessions.
      let firebaseRecheckRunning = false;
      const firebaseRecheck = setInterval(async () => {
        if (firebaseRecheckRunning) return;
        firebaseRecheckRunning = true;
        try {
          const result = await disconnectInvalidFirebaseSockets(io);
          if (result.disconnected) {
            console.log("Firebase auth recheck disconnected sockets:",
              result.disconnected);
          }
        } catch (error) {
          logError("Firebase socket session recheck failed:", error);
        } finally {
          firebaseRecheckRunning = false;
        }
      }, SOCKET_SESSION_CHECK_MS);
      firebaseRecheck.unref();

      const banRecheck = setInterval(() => {
        disconnectBannedSockets(io).catch((error) => {
          logError("IP ban socket recheck failed:", error);
        });
      }, 30 * 1000);
      banRecheck.unref();

      const metricsInterval = setInterval(() => productionMetrics.flush(), 5 * 60 * 1000);
      metricsInterval.unref();

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
      logError("SERVER STARTUP ERROR:", error);

      process.exit(1);
    }
  };

startServer();



