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

// =========================================================
// ROOT
//
// StrictMode was intentionally removed here.
//
// In development, React StrictMode re-runs effects to catch
// unsafe side effects. StudyOS has many data-loading effects,
// so localhost could issue duplicate requests and feel much
// slower than the production build.
//
// This does not change production app behavior.
// =========================================================

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <BrowserRouter>

    <AuthProvider>

      <App />

    </AuthProvider>

  </BrowserRouter>
);
