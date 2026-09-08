// =========================================================
// STUDYOS CORS CONFIG
// =========================================================

const allowedOrigins = [
  // Local Vite development
  "http://localhost:5173",

  // Optional alternate local address
  "http://127.0.0.1:5173",
  "http://localhost:4173",
"http://127.0.0.1:4173",

  // Production frontend
  process.env.FRONTEND_URL,
].filter(Boolean);

// =========================================================
// OPTIONS
// =========================================================

const corsOptions = {
  origin(origin, callback) {
    /*
      Requests without an Origin header
      can come from tools/server-to-server
      requests, so allow them.
    */

    if (!origin) {
      return callback(
        null,
        true
      );
    }

    if (
      allowedOrigins.includes(
        origin
      )
    ) {
      return callback(
        null,
        true
      );
    }

    return callback(
      new Error(
        `CORS blocked origin: ${origin}`
      )
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: false,
};

module.exports =
  corsOptions;