import RecoveryBoundary from "./components/RecoveryBoundary";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
} from "react-router";

import "./index.css";

import App from "./App.jsx";

import {
  AuthProvider,
} from "./context/AuthContext.jsx";

import StreakFlame from "./components/StreakFlame.jsx";

// StrictMode remains disabled to avoid duplicate
// development data-loading effects.

createRoot(
  document.getElementById("root")
).render(
  <RecoveryBoundary scope="app">
    <BrowserRouter>
      <AuthProvider>
        <App />
        <RecoveryBoundary silent><StreakFlame /></RecoveryBoundary>
      </AuthProvider>
    </BrowserRouter>
  </RecoveryBoundary>
);
