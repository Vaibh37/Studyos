const { logError } = require("../utils/safeLogger");
const { validAuthToken } = require("../utils/authToken");
const { authenticatedApiLimiter } = require("./rateLimiters");
const firebaseAdminAuth =
  require(
    "../config/firebaseAdmin"
  );

const firebaseAuth =
  async (
    req,
    res,
    next
  ) => {
    try {
      const authHeader =
        req.headers.authorization;

      // =====================================
      // CHECK AUTH HEADER
      // =====================================

      if (
        typeof authHeader !== "string" ||
        !authHeader.startsWith(
          "Bearer "
        )
      ) {
        return res
          .status(401)
          .json({
            message:
              "Authentication required",
          });
      }

      // =====================================
      // GET TOKEN
      // =====================================

      const token =
        authHeader
          .slice(7)
          .trim();

      if (!validAuthToken(token)) {
        return res
          .status(401)
          .json({
            message:
              "Authentication required",
          });
      }

      // =====================================
      // VERIFY FIREBASE TOKEN
      // =====================================

      const decodedToken =
        await firebaseAdminAuth
          // Also reject revoked tokens and disabled/deleted Firebase users.
          .verifyIdToken(
            token,
            true
          );

      // =====================================
      // ATTACH USER TO REQUEST
      // =====================================

      req.user = {
        uid:
          decodedToken.uid,

        email:
          decodedToken.email ||
          null,

        name:
          decodedToken.name ||
          null,

        picture:
          decodedToken.picture ||
          null,

        provider:
          decodedToken.firebase
            ?.sign_in_provider ||
          "unknown",
      };

      return authenticatedApiLimiter(req, res, next);
    } catch (error) {
      logError("FIREBASE AUTH ERROR:", error);

      return res
        .status(401)
        .json({
          message:
            "Invalid or expired login",
        });
    }
  };

module.exports =
  firebaseAuth;