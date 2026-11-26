import DialogSurface from "./DialogSurface";
import { useState } from "react";
import { Trash2, ShieldAlert } from "./icons";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";

import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { requestGoogleAccessToken } from "../services/googleIdentity";
import apiRequest from "../services/api";

export default function DeleteAccountSettings() {
  const { firebaseUser, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const providers = firebaseUser?.providerData?.map(
    p => p.providerId
  ) || [];

  const provider = providers.includes("password")
    ? "password"
    : providers.includes("google.com")
      ? "google"
      : "unsupported";

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirmation("");
    setPassword("");
    setError("");
  }

  async function handleDelete() {
    if (busy || confirmation !== "DELETE") return;

    setBusy(true);
    setError("");

    try {
      const user = auth.currentUser;

      if (!user || user.uid !== firebaseUser?.uid) {
        throw new Error("Please sign in again.");
      }

      if (provider === "password") {
        if (!password) {
          throw new Error("Enter your password.");
        }

        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, password)
        );

      } else if (provider === "google") {
        const token = await requestGoogleAccessToken();

        await reauthenticateWithCredential(
          user,
          GoogleAuthProvider.credential(null, token)
        );

      } else {
        throw new Error("This sign-in method is not yet supported.");
      }

      await user.getIdToken(true);

      await apiRequest("/api/account", {
        method: "DELETE"
      });

      try {
        await logout();
      } catch (e) {
        console.warn("Sign out after deletion:", e);
      }

      for (const key of [
        "studyos_name", "studyos_theme", "studyos_study_goal",
        "studyos_priority", "studyos_study_reminders",
        "studyos_deadline_reminders", "studyos_focus_duration",
        "studyos_startup_page"
      ]) {
        localStorage.removeItem(key);
      }

      window.location.assign("/get-started");

    } catch (e) {
      setError(
        ["auth/wrong-password", "auth/invalid-credential"].includes(e.code)
          ? "Incorrect password. Please try again."
          : e.message || "Account deletion failed."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!firebaseUser) return null;

  return (
    <>
      <div className="settings-v2-row">
        <div className="settings-v2-row-copy">
          <strong>Delete account</strong>
          <span>
            Permanently close your account and remove its StudyOS data.
          </span>
        </div>

        <button
          type="button"
          className="settings-v2-danger-outline"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={16} />
          Delete account
        </button>
      </div>

      {open && (
        <div className="delete-modal-overlay" onClick={close}>
          <DialogSurface onDismiss={close} initialFocus=".settings-v2-secondary-button"
            className="settings-v2-modal settings-v2-modal-danger"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-heading"
            onClick={e => e.stopPropagation()}
          >
            <div className="settings-v2-modal-icon settings-v2-modal-icon-danger">
              <ShieldAlert size={22} />
            </div>

            <h2 id="delete-account-heading">Delete your account?</h2>

            <p>
              This permanently removes your account, study records,
              leaderboard profile, group membership, messages and uploads.
              Owned groups must be deleted first.
            </p>

            {provider === "password" && (
              <label className="settings-v2-delete-field">
                <span>Confirm your password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  disabled={busy}
                  onChange={e => setPassword(e.target.value)}
                />
              </label>
            )}

            {provider === "google" && (
              <p>Google will ask you to verify your account.</p>
            )}

            {provider === "unsupported" && (
              <p>This sign-in provider is not yet supported.</p>
            )}

            <label className="settings-v2-delete-field">
              <span>Type <strong>DELETE</strong> to confirm</span>
              <input
                type="text"
                placeholder="DELETE"
                autoComplete="off"
                value={confirmation}
                disabled={busy}
                onChange={e => setConfirmation(e.target.value)}
              />
            </label>

            {error && (
              <div className="settings-v2-notice settings-v2-notice-error" role="alert">
                <span>{error}</span>
              </div>
            )}

            <div className="settings-v2-modal-actions">
              <button
                type="button"
                className="settings-v2-secondary-button"
                disabled={busy}
                onClick={close}
              >
                Cancel
              </button>

              <button
                type="button"
                className="settings-v2-danger-solid"
                disabled={
                  busy ||
                  confirmation !== "DELETE" ||
                  provider === "unsupported" ||
                  (provider === "password" && !password)
                }
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                {busy ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </DialogSurface>
        </div>
      )}
    </>
  );
}
