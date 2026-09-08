const {
  initializeApp,
  cert,
  getApps,
} = require(
  "firebase-admin/app"
);

const {
  getAuth,
} = require(
  "firebase-admin/auth"
);

const fs =
  require("fs");

const path =
  require("path");

// =========================================
// BUILD FIREBASE CREDENTIAL
// =========================================

const getFirebaseCredential =
  () => {
    // =====================================
    // PRODUCTION ENVIRONMENT VARIABLES
    // =====================================

    const projectId =
      process.env
        .FIREBASE_PROJECT_ID;

    const clientEmail =
      process.env
        .FIREBASE_CLIENT_EMAIL;

    const privateKey =
      process.env
        .FIREBASE_PRIVATE_KEY;

    if (
      projectId &&
      clientEmail &&
      privateKey
    ) {
      return cert({
        projectId,

        clientEmail,

        privateKey:
          privateKey.replace(
            /\\n/g,
            "\n"
          ),
      });
    }

    // =====================================
    // LOCAL DEVELOPMENT FALLBACK
    // =====================================

    const serviceAccountPath =
      path.join(
        __dirname,
        "..",
        "firebase-service-account.json"
      );

    if (
      fs.existsSync(
        serviceAccountPath
      )
    ) {
      const serviceAccount =
        require(
          serviceAccountPath
        );

      return cert(
        serviceAccount
      );
    }

    // =====================================
    // NOTHING AVAILABLE
    // =====================================

    throw new Error(
      "Firebase Admin credentials are missing. " +
        "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  };

// =========================================
// INITIALIZE FIREBASE ADMIN ONCE
// =========================================

if (
  getApps().length ===
  0
) {
  initializeApp({
    credential:
      getFirebaseCredential(),
  });
}

// =========================================
// AUTH INSTANCE
// =========================================

const firebaseAdminAuth =
  getAuth();

module.exports =
  firebaseAdminAuth;