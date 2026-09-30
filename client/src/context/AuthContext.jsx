import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import {
  auth,
} from "../firebase";

import {
  loadGoogleIdentity,
  requestGoogleAccessToken,
} from "../services/googleIdentity";


const AuthContext =
  createContext(
    null
  );

const GUEST_KEY =
  "studyos_guest_mode";

// =========================================================
// APP PRELOAD
// =========================================================

let appPreloadPromise =
  null;

const preloadStudyApp =
  () => {
    if (
      appPreloadPromise
    ) {
      return appPreloadPromise;
    }

    appPreloadPromise =
      Promise.allSettled([
        import(
          "../pages/StudyApp"
        ),

        import(
          "../pages/Dashboard"
        ),

        import(
          "../components/Sidebar"
        ),
      ]);

    return appPreloadPromise;
  };

export function AuthProvider({
  children,
}) {
  const [
    firebaseUser,
    setFirebaseUser,
  ] = useState(
    null
  );

  const [
    guestMode,
    setGuestMode,
  ] = useState(
    () =>
      localStorage.getItem(
        GUEST_KEY
      ) ===
      "true"
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  // =======================================================
  // ACCEPT FIREBASE USER
  // =======================================================

  const acceptFirebaseUser =
    (
      user
    ) => {
      localStorage.removeItem(
        GUEST_KEY
      );

      setGuestMode(
        false
      );

      setFirebaseUser(
        user
      );
    };

  // =======================================================
  // SESSION RESTORE
  // =======================================================

  useEffect(
    () => {
      const unsubscribe =
        onAuthStateChanged(
          auth,
          (
            user
          ) => {
            if (
              user
            ) {
              acceptFirebaseUser(
                user
              );

              preloadStudyApp();
            } else {
              setFirebaseUser(
                null
              );
            }

            setLoading(
              false
            );
          }
        );

      return unsubscribe;
    },
    []
  );

  // =======================================================
  // PRELOAD GOOGLE GIS WHILE LOGIN PAGE IS IDLE
  // =======================================================

  useEffect(
    () => {
      const start =
        () => {
          loadGoogleIdentity()
            .catch(
              (
                error
              ) => {
                console.warn(
                  "Google Identity Services preload failed:",
                  error
                );
              }
            );
        };

      if (
        "requestIdleCallback" in
        window
      ) {
        const idleId =
          window.requestIdleCallback(
            start,
            {
              timeout:
                1500,
            }
          );

        return () =>
          window.cancelIdleCallback(
            idleId
          );
      }

      const timer =
        window.setTimeout(
          start,
          250
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    []
  );

  // =======================================================
  // GOOGLE LOGIN — GIS -> FIREBASE CREDENTIAL
  // =======================================================

  const loginWithGoogle =
    async () => {
      preloadStudyApp();

      const accessToken =
        await requestGoogleAccessToken();

      const firebaseCredential =
        GoogleAuthProvider
          .credential(
            null,
            accessToken
          );

      const result =
        await signInWithCredential(
          auth,
          firebaseCredential
        );

      acceptFirebaseUser(
        result.user
      );

      return result.user;
    };

  // =======================================================
  // EMAIL REGISTER
  // =======================================================

  const registerWithEmail =
    async ({
      name,
      email,
      password,
    }) => {
      preloadStudyApp();

      const result =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      if (
        name.trim()
      ) {
        await updateProfile(
          result.user,
          {
            displayName:
              name.trim(),
          }
        );
      }

      acceptFirebaseUser(
        result.user
      );

      return result.user;
    };

  // =======================================================
  // EMAIL LOGIN
  // =======================================================

  const loginWithEmail =
    async ({
      email,
      password,
    }) => {
      preloadStudyApp();

      const result =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      acceptFirebaseUser(
        result.user
      );

      return result.user;
    };

  // =======================================================
  // GUEST
  // =======================================================

  const continueAsGuest =
    async () => {
      preloadStudyApp();

      if (
        auth.currentUser
      ) {
        await signOut(
          auth
        );
      }

      localStorage.setItem(
        GUEST_KEY,
        "true"
      );

      setFirebaseUser(
        null
      );

      setGuestMode(
        true
      );
    };

  // =======================================================
  // LOGOUT
  // =======================================================

  const logout =
    async () => {
      localStorage.removeItem(
        GUEST_KEY
      );

      setGuestMode(
        false
      );

      if (
        auth.currentUser
      ) {
        await signOut(
          auth
        );
      }

      setFirebaseUser(
        null
      );
    };

  // =======================================================
  // TOKEN
  // =======================================================

  const getIdToken =
    async () => {
      if (
        !auth.currentUser
      ) {
        return null;
      }

      return auth.currentUser
        .getIdToken();
    };

  // =======================================================
  // MODE
  // =======================================================

  const mode =
    firebaseUser
      ? "authenticated"
      : guestMode
        ? "guest"
        : "none";

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,

        guestMode,

        loading,

        mode,

        isGuest:
          guestMode,

        isAuthenticated:
          Boolean(
            firebaseUser
          ),

        loginWithGoogle,

        registerWithEmail,

        loginWithEmail,

        continueAsGuest,

        logout,

        getIdToken,

        preloadStudyApp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
