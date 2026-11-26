const { validAuthToken } = require("../utils/authToken");
const firebaseAdminAuth =
  require(
    "../config/firebaseAdmin"
  );

const socketAuth =
  async (
    socket,
    next
  ) => {
    try {
      // =====================================
      // GET FIREBASE TOKEN
      // =====================================

      const token =
        socket.handshake.auth
          ?.token;

      if (!validAuthToken(token)) {
        return next(
          new Error(
            "Authentication required"
          )
        );
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
      // ATTACH USER TO SOCKET
      // =====================================

      socket.data.firebaseSession = {
        authTime: decodedToken.auth_time,
        expiresAt: decodedToken.exp,
      };

      socket.user = {
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

      next();
    } catch (error) {
      console.error(
        "SOCKET AUTH ERROR:",
        error?.code || "verification_failed"
      );

      next(
        new Error(
          "Invalid or expired login"
        )
      );
    }
  };

module.exports =
  socketAuth;