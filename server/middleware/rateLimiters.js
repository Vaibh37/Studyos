const {
  rateLimit,
  ipKeyGenerator,
} =
  require(
    "express-rate-limit"
  );

// =========================================
// USER OR IP KEY
// =========================================
//
// Authenticated routes use Firebase UID.
//
// If a request somehow reaches a limiter
// without req.user, fall back to a safe
// normalized IP key.
// =========================================

const userOrIpKey =
  (req) => {
    const uid =
      req.user?.uid;

    if (uid) {
      return `user:${uid}`;
    }

    return `ip:${
      ipKeyGenerator(
        req.ip
      )
    }`;
  };


// =========================================
// GLOBAL API LIMITER
// =========================================
//
// Applies to /api routes.
//
// 240 requests / minute / IP gives the
// frontend enough room for normal StudyOS
// usage while blocking obvious request spam.
//
// Socket.IO is NOT covered by this limiter.
// We will protect socket events separately.
// =========================================

const globalApiLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    limit:
      240,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many requests. Please try again shortly.",
    },
  });


// =========================================
// R2 UPLOAD URL LIMITER
// =========================================
//
// firebaseAuth MUST run before this.
//
// 12 upload authorizations / minute / user.
// This limits how quickly one account can
// create new R2 objects.
// =========================================

const attachmentUploadLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    limit:
      12,

    keyGenerator:
      userOrIpKey,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many attachment uploads. Please wait a moment.",
    },
  });


// =========================================
// ATTACHMENT FINALIZE LIMITER
// =========================================
//
// Finalize verifies R2 objects and creates
// chat messages.
//
// Kept slightly higher than upload-url so
// normal retries do not break an upload.
// =========================================

const attachmentFinalizeLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    limit:
      20,

    keyGenerator:
      userOrIpKey,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many attachment requests. Please wait a moment.",
    },
  });


module.exports = {
  globalApiLimiter,
  attachmentUploadLimiter,
  attachmentFinalizeLimiter,
};