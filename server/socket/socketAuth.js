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

      if (!token) {
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
          .verifyIdToken(
            token
          );

      // =====================================
      // ATTACH USER TO SOCKET
      // =====================================

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
        error.message
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