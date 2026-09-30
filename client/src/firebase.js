import {
  initializeApp,
} from "firebase/app";

import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  TwitterAuthProvider,
} from "firebase/auth";

// =========================================================
// FIREBASE CONFIG
// =========================================================

const firebaseConfig = {
  apiKey:
    import.meta.env
      .VITE_FIREBASE_API_KEY,

  authDomain:
    import.meta.env
      .VITE_FIREBASE_AUTH_DOMAIN,

  projectId:
    import.meta.env
      .VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    import.meta.env
      .VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env
      .VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env
      .VITE_FIREBASE_APP_ID,
};

// =========================================================
// APP
// =========================================================

const app =
  initializeApp(
    firebaseConfig
  );

// =========================================================
// AUTH
//
// Google popup handling is now done by Google Identity
// Services, so Firebase does not need its popup resolver.
// =========================================================

export const auth =
  initializeAuth(
    app,
    {
      persistence: [
        browserLocalPersistence,
        indexedDBLocalPersistence,
      ],
    }
  );

// =========================================================
// X — RESERVED FOR FUTURE USE
// =========================================================

export const xProvider =
  new TwitterAuthProvider();

export default app;
