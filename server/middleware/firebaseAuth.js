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
        !authHeader ||
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

      if (!token) {
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
          .verifyIdToken(
            token
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

      next();
    } catch (error) {
      console.error(
        "FIREBASE AUTH ERROR:",
        error.message
      );

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