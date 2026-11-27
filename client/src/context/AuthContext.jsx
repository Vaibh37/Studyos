import { validateSignup } from "../services/signupValidation";
import { noteDrafts, GUEST_DRAFT_SCOPE } from "../services/noteDrafts";
import { RecoveryPanel } from "../components/RecoveryBoundary";
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

import { disconnectSocket, disconnectObsoleteSocket } from "../socket";
import { getAppCheckToken } from "../services/appCheck";
import { setStudyDataScope } from "../services/api";
import { canSpeculate, getStartupPage, loadWorkspacePage } from "../services/routePreload";

import {
  requestGoogleAccessToken,
} from "../services/googleIdentity";


const AuthContext =
  createContext(
    null
  );

const GUEST_KEY = "studyos_guest_mode";
function readGuestMode() {
  try { return localStorage.getItem(GUEST_KEY) === "true"; }
  catch { return false; }
}
function rememberGuestMode(enabled) {
  try {
    if (enabled) localStorage.setItem(GUEST_KEY, "true");
    else localStorage.removeItem(GUEST_KEY);
  } catch { /* Private browsing or disabled storage: retain in-memory state. */ }
}

// =========================================================
// APP PRELOAD
// =========================================================

const preloadStudyApp = () => {
  if (!canSpeculate()) return Promise.resolve();
  const pathname = window.location.pathname;
  const requested = pathname.split("/").filter(Boolean);
  const page = requested[0] === "app" && requested[1] ? requested[1] : getStartupPage();
  // Start shell and the actual destination together, rather than always
  // requesting Dashboard even if the user's startup page is different.
  return Promise.allSettled([
    import("../pages/StudyApp"),
    loadWorkspacePage(page),
  ]);
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
      readGuestMode()
  );

  const [
    loading,
    setLoading,
  ] = useState(true);
  const [authError, setAuthError] = useState(false);

  // =======================================================
  // ACCEPT FIREBASE USER
  // =======================================================

  const acceptFirebaseUser =
    (
      user
    ) => {
      disconnectObsoleteSocket(user);
      // Authenticated workspaces need App Check; warm it alongside the route
      // chunks, not on the public homepage or in a local-only guest session.
      if (window.location.pathname === "/" || window.location.pathname === "/get-started" ||
          /^\/app(?:\/|$)/.test(window.location.pathname)) void getAppCheckToken();
      noteDrafts.activate(user);
      rememberGuestMode(false);

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
      const timer = window.setTimeout(() => setAuthError(true), 25_000);
      const unsubscribe =
        onAuthStateChanged(
          auth,
          (
            user
          ) => {
            window.clearTimeout(timer);
            setAuthError(false);
            setStudyDataScope(user);
            if (
              user
            ) {
              acceptFirebaseUser(
                user
              );

              if (window.location.pathname === "/" || /^\/app(?:\/|$)/.test(window.location.pathname)) preloadStudyApp();
            } else {
              const guest = readGuestMode();
              noteDrafts.activate(guest ? GUEST_DRAFT_SCOPE : null);
              if (guest && (window.location.pathname === "/" || /^\/app(?:\/|$)/.test(window.location.pathname))) preloadStudyApp();
              disconnectSocket();
              setFirebaseUser(
                null
              );
            }

            setLoading(
              false
            );
          },
          () => {
            window.clearTimeout(timer);
            setAuthError(true);
          }
        );

      return () => { window.clearTimeout(timer); unsubscribe(); };
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
      const cleanName = validateSignup({ name, password });
      preloadStudyApp();

      const result =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      if (
        cleanName
      ) {
        await updateProfile(
          result.user,
          {
            displayName:
              cleanName,
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
      disconnectSocket();
      preloadStudyApp();

      if (
        auth.currentUser
      ) {
        await signOut(
          auth
        );
      }

      rememberGuestMode(true);
      noteDrafts.activate(GUEST_DRAFT_SCOPE);

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
      disconnectSocket();
      rememberGuestMode(false);

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

      noteDrafts.activate(null);
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
      {authError ? <RecoveryPanel scope="app" authFailure /> : children}
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
