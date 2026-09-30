const express =
  require("express");

const mongoose =
  require("mongoose");

const {
  getApps,
} = require(
  "firebase-admin/app"
);

const firebaseAdminAuth =
  require(
    "../config/firebaseAdmin"
  );

const packageJson =
  require(
    "../package.json"
  );

const router =
  express.Router();

// =========================================================
// CONSTANTS
// =========================================================

const SERVICE_NAME =
  "studyos-api";

const DATABASE_STATES = {
  0:
    "disconnected",

  1:
    "connected",

  2:
    "connecting",

  3:
    "disconnecting",
};

// =========================================================
// HELPERS
// =========================================================

const getDatabaseState =
  () => {
    return (
      DATABASE_STATES[
        mongoose.connection
          .readyState
      ] ||
      "unknown"
    );
  };

const isFirebaseReady =
  () => {
    return (
      getApps().length >
        0 &&
      Boolean(
        firebaseAdminAuth
      )
    );
  };

const getServerTime =
  () => {
    return new Date()
      .toISOString();
  };

const getStartedAt =
  () => {
    return new Date(
      Date.now() -
        process.uptime() *
          1000
    ).toISOString();
  };

// =========================================================
// NEVER CACHE SYSTEM HEALTH RESPONSES
// =========================================================

router.use(
  (
    req,
    res,
    next
  ) => {
    res.set(
      "Cache-Control",
      "no-store"
    );

    next();
  }
);

// =========================================================
// API INDEX
// =========================================================

router.get(
  "/",
  (
    req,
    res
  ) => {
    res.json({
      service:
        SERVICE_NAME,

      status:
        "ok",

      routes: {
        health:
          "/api/health",

        databaseHealth:
          "/api/health/db",

        authHealth:
          "/api/health/auth",

        status:
          "/api/status",

        uptime:
          "/api/uptime",

        version:
          "/api/version",
      },
    });
  }
);

// =========================================================
// HEALTH
//
// Lightweight liveness check.
// Does not hit MongoDB or Firebase over the network.
// =========================================================

router.get(
  "/health",
  (
    req,
    res
  ) => {
    res.json({
      status:
        "ok",

      service:
        SERVICE_NAME,

      serverTime:
        getServerTime(),
    });
  }
);

// =========================================================
// DATABASE HEALTH
// =========================================================

router.get(
  "/health/db",
  async (
    req,
    res
  ) => {
    const state =
      getDatabaseState();

    if (
      mongoose.connection
        .readyState !==
        1 ||
      !mongoose.connection
        .db
    ) {
      return res
        .status(
          503
        )
        .json({
          status:
            "unavailable",

          database:
            state,
        });
    }

    try {
      await mongoose.connection
        .db
        .admin()
        .ping();

      return res.json({
        status:
          "ok",

        database:
          "connected",
      });
    } catch (
      error
    ) {
      console.error(
        "DATABASE HEALTH ERROR:",
        error.message
      );

      return res
        .status(
          503
        )
        .json({
          status:
            "unavailable",

          database:
            "error",
        });
    }
  }
);

// =========================================================
// FIREBASE ADMIN HEALTH
//
// Readiness check only.
// Does not expose credentials or perform a user lookup.
// =========================================================

router.get(
  "/health/auth",
  (
    req,
    res
  ) => {
    const ready =
      isFirebaseReady();

    return res
      .status(
        ready
          ? 200
          : 503
      )
      .json({
        status:
          ready
            ? "ok"
            : "unavailable",

        authentication:
          ready
            ? "ready"
            : "not_ready",
      });
  }
);

// =========================================================
// PUBLIC STATUS
// =========================================================

router.get(
  "/status",
  (
    req,
    res
  ) => {
    const databaseReady =
      mongoose.connection
        .readyState ===
      1;

    const authReady =
      isFirebaseReady();

    const operational =
      databaseReady &&
      authReady;

    res.json({
      status:
        operational
          ? "operational"
          : "degraded",

      services: {
        api:
          "operational",

        database:
          databaseReady
            ? "operational"
            : "degraded",

        authentication:
          authReady
            ? "operational"
            : "degraded",
      },

      serverTime:
        getServerTime(),
    });
  }
);

// =========================================================
// UPTIME
// =========================================================

router.get(
  "/uptime",
  (
    req,
    res
  ) => {
    res.json({
      status:
        "ok",

      service:
        SERVICE_NAME,

      uptimeSeconds:
        Math.floor(
          process.uptime()
        ),

      startedAt:
        getStartedAt(),

      serverTime:
        getServerTime(),
    });
  }
);

// =========================================================
// VERSION
// =========================================================

router.get(
  "/version",
  (
    req,
    res
  ) => {
    res.json({
      service:
        SERVICE_NAME,

      version:
        packageJson.version ||
        "unknown",
    });
  }
);

module.exports =
  router;
