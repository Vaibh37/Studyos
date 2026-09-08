import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

import {
  auth,
  googleProvider,
} from "../firebase";

const AuthContext =
  createContext(null);

const GUEST_KEY =
  "studyos_guest_mode";

const API_URL =
  "http://localhost:5000";

export function AuthProvider({
  children,
}) {
  const [
    firebaseUser,
    setFirebaseUser,
  ] = useState(null);

  const [
    guestMode,
    setGuestMode,
  ] = useState(
    () =>
      localStorage.getItem(
        GUEST_KEY
      ) === "true"
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    backendUser,
    setBackendUser,
  ] = useState(null);

  const [
    backendAuthStatus,
    setBackendAuthStatus,
  ] = useState("idle");

  // =========================================
  // VERIFY USER WITH OUR EXPRESS BACKEND
  // =========================================

  const verifyBackendUser =
    async (
      user = auth.currentUser
    ) => {
      if (!user) {
        setBackendUser(
          null
        );

        setBackendAuthStatus(
          "idle"
        );

        return null;
      }

      try {
        setBackendAuthStatus(
          "checking"
        );

        const token =
          await user.getIdToken();

        const response =
          await fetch(
            `${API_URL}/api/auth/me`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        let data = null;

        try {
          data =
            await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Backend authentication failed"
          );
        }

        setBackendUser(
          data.user
        );

        setBackendAuthStatus(
          "verified"
        );

        console.log(
          "✅ BACKEND AUTH VERIFIED:",
          data.user
        );

        return data.user;
      } catch (error) {
        console.error(
          "❌ BACKEND AUTH FAILED:",
          error
        );

        setBackendUser(
          null
        );

        setBackendAuthStatus(
          "error"
        );

        return null;
      }
    };

  // =========================================
  // FIREBASE AUTH STATE
  // =========================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          setFirebaseUser(
            user
          );

          if (user) {
            localStorage.removeItem(
              GUEST_KEY
            );

            setGuestMode(
              false
            );

            verifyBackendUser(
              user
            );
          } else {
            setBackendUser(
              null
            );

            setBackendAuthStatus(
              "idle"
            );
          }

          setLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, []);

  // =========================================
  // GOOGLE LOGIN
  // =========================================

  const loginWithGoogle =
    async () => {
      const result =
        await signInWithPopup(
          auth,
          googleProvider
        );

      localStorage.removeItem(
        GUEST_KEY
      );

      setGuestMode(
        false
      );

      return result.user;
    };

  // =========================================
  // EMAIL REGISTER
  // =========================================

  const registerWithEmail =
    async ({
      name,
      email,
      password,
    }) => {
      const result =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      if (name.trim()) {
        await updateProfile(
          result.user,
          {
            displayName:
              name.trim(),
          }
        );
      }

      localStorage.removeItem(
        GUEST_KEY
      );

      setGuestMode(
        false
      );

      return result.user;
    };

  // =========================================
  // EMAIL LOGIN
  // =========================================

  const loginWithEmail =
    async ({
      email,
      password,
    }) => {
      const result =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      localStorage.removeItem(
        GUEST_KEY
      );

      setGuestMode(
        false
      );

      return result.user;
    };

  // =========================================
  // GUEST
  // =========================================

  const continueAsGuest =
    async () => {
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

      setBackendUser(
        null
      );

      setBackendAuthStatus(
        "idle"
      );

      setGuestMode(
        true
      );
    };

  // =========================================
  // LOGOUT
  // =========================================

  const logout =
    async () => {
      localStorage.removeItem(
        GUEST_KEY
      );

      setGuestMode(
        false
      );

      setBackendUser(
        null
      );

      setBackendAuthStatus(
        "idle"
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

  // =========================================
  // GET FIREBASE TOKEN
  // =========================================

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

  // =========================================
  // MODE
  // =========================================

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

        backendUser,

        backendAuthStatus,

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

        verifyBackendUser,
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