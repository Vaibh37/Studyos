import { lazy, Suspense } from "react";
import RecoveryBoundary from "./components/RecoveryBoundary";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
  useLocation,
} from "react-router";

import "./index.css";

import App from "./App.jsx";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext.jsx";

const StreakFlame = lazy(() => import("./components/StreakFlame.jsx"));
function WorkspaceStreak() {
  const { pathname } = useLocation();
  const { loading, mode, firebaseUser } = useAuth();
  if (loading || mode === "none" || !/^\/app(?:\/|$)/.test(pathname)) return null;
  return (
    <RecoveryBoundary silent key={mode === "guest" ? "guest" : firebaseUser?.uid}>
      <Suspense fallback={null}><StreakFlame /></Suspense>
    </RecoveryBoundary>
  );
}

// StrictMode remains disabled to avoid duplicate
// development data-loading effects.

createRoot(
  document.getElementById("root")
).render(
  <RecoveryBoundary scope="app">
    <BrowserRouter>
      <AuthProvider>
        <App />
        <WorkspaceStreak />
      </AuthProvider>
    </BrowserRouter>
  </RecoveryBoundary>
);
