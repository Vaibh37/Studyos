import {
  useEffect,
  useState,
} from "react";

import {
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Trophy,
  XCircle,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

import apiRequest from "../services/api";

// =========================================================
// LEADERBOARD SETTINGS
// =========================================================

function LeaderboardSettings() {
  const {
    firebaseUser,
    isAuthenticated,
    isGuest,
  } = useAuth();

  // =======================================================
  // IMPORTANT
  //
  // Leaderboard identity is intentionally separate from:
  // localStorage.studyos_name
  //
  // The normal StudyOS dashboard/profile name can therefore
  // be different from the public leaderboard name.
  // =======================================================

  const accountFallbackName =
    firebaseUser?.displayName?.trim() ||
    "StudyOS Student";

  // =======================================================
  // SAVED PROFILE
  // =======================================================

  const [
    profile,
    setProfile,
  ] = useState({
    displayName: "",
    isPublic: false,
  });

  // =======================================================
  // FORM
  // =======================================================

  const [
    displayName,
    setDisplayName,
  ] = useState("");

  const [
    isPublic,
    setIsPublic,
  ] = useState(false);

  // =======================================================
  // STATUS
  // =======================================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  // =======================================================
  // NORMALIZE PROFILE
  // =======================================================

  const normalizeProfile =
    (
      incoming
    ) => {
      return {
        displayName:
          incoming?.displayName?.trim() ||
          accountFallbackName,

        isPublic:
          Boolean(
            incoming?.isPublic
          ),
      };
    };

  // =======================================================
  // LOAD PROFILE
  // =======================================================

  const loadProfile =
    async () => {
      if (
        !isAuthenticated
      ) {
        const guestProfile = {
          displayName:
            accountFallbackName,

          isPublic:
            false,
        };

        setProfile(
          guestProfile
        );

        setDisplayName(
          guestProfile.displayName
        );

        setIsPublic(
          false
        );

        setLoading(
          false
        );

        return;
      }

      try {
        setLoading(
          true
        );

        setError("");

        const response =
          await apiRequest(
            `/api/leaderboard/me?t=${Date.now()}`
          );

        const nextProfile =
          normalizeProfile(
            response?.profile
          );

        setProfile(
          nextProfile
        );

        setDisplayName(
          nextProfile.displayName
        );

        setIsPublic(
          nextProfile.isPublic
        );
      } catch (
        loadError
      ) {
        console.error(
          "Leaderboard settings load failed:",
          loadError
        );

        setError(
          loadError?.message ||
            "Could not load leaderboard settings."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  // =======================================================
  // LOAD WHEN ACCOUNT CHANGES
  // =======================================================

  useEffect(() => {
    loadProfile();
  }, [
    isAuthenticated,
    firebaseUser?.uid,
  ]);

  // =======================================================
  // SAVE
  // =======================================================

  const saveLeaderboardSettings =
    async (
      event
    ) => {
      event.preventDefault();

      const cleanName =
        displayName
          .trim()
          .replace(
            /\s+/g,
            " "
          );

      if (
        cleanName.length <
        2
      ) {
        setError(
          "Leaderboard display name must be at least 2 characters."
        );

        return;
      }

      if (
        cleanName.length >
        32
      ) {
        setError(
          "Leaderboard display name cannot exceed 32 characters."
        );

        return;
      }

      if (
        !isAuthenticated
      ) {
        setError(
          "Sign in before changing global leaderboard settings."
        );

        return;
      }

      try {
        setSaving(
          true
        );

        setError("");
        setMessage("");

        // =================================================
        // SAVE TO MONGODB
        // =================================================

        const response =
          await apiRequest(
            "/api/leaderboard/me",
            {
              method:
                "PATCH",

              body:
                JSON.stringify({
                  displayName:
                    cleanName,

                  isPublic:
                    Boolean(
                      isPublic
                    ),
                }),
            }
          );

        let savedProfile =
          normalizeProfile(
            response?.profile
          );

        // =================================================
        // VERIFY FROM SERVER
        //
        // We deliberately fetch it again rather than merely
        // trusting the local form state.
        // =================================================

        try {
          const verification =
            await apiRequest(
              `/api/leaderboard/me?t=${Date.now()}`
            );

          savedProfile =
            normalizeProfile(
              verification?.profile
            );
        } catch (
          verifyError
        ) {
          console.warn(
            "Leaderboard profile verification failed:",
            verifyError
          );

          // PATCH already succeeded, so keep its response.
        }

        // =================================================
        // UPDATE UI
        // =================================================

        setProfile(
          savedProfile
        );

        setDisplayName(
          savedProfile.displayName
        );

        setIsPublic(
          savedProfile.isPublic
        );

        // =================================================
        // NOTIFY LEADERBOARD PAGE
        // =================================================

        window.dispatchEvent(
          new CustomEvent(
            "studyos-leaderboard-settings-updated",
            {
              detail: {
                profile:
                  savedProfile,
              },
            }
          )
        );

        setMessage(
          savedProfile.isPublic
            ? `Leaderboard profile saved as "${savedProfile.displayName}".`
            : `Leaderboard profile saved as "${savedProfile.displayName}" and kept private.`
        );
      } catch (
        saveError
      ) {
        console.error(
          "Leaderboard settings save failed:",
          saveError
        );

        setError(
          saveError?.message ||
            "Could not save leaderboard settings."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  // =======================================================
  // DIRTY STATE
  // =======================================================

  const hasChanges =
    displayName
      .trim()
      .replace(
        /\s+/g,
        " "
      ) !==
      profile.displayName ||
    Boolean(
      isPublic
    ) !==
      Boolean(
        profile.isPublic
      );

  // =======================================================
  // GUEST
  // =======================================================

  if (
    isGuest ||
    !isAuthenticated
  ) {
    return (
      <section className="settings-v2-section-stack">

        <div className="settings-v2-panel">

          <div className="settings-v2-panel-header">

            <div>

              <h3>
                Global leaderboard
              </h3>

              <p>
                Leaderboard participation
                requires a StudyOS account.
              </p>

            </div>

            <LockKeyhole
              size={21}
            />

          </div>

          <div className="settings-v2-info-panel">

            <Trophy
              size={18}
            />

            <div>

              <strong>
                Guest progress stays local
              </strong>

              <p>
                Personal XP, levels and
                streaks still work in Guest
                mode, but guest users do
                not enter the global
                leaderboard.
              </p>

            </div>

          </div>

          <div className="settings-v2-info-panel">

            <BadgeCheck
              size={18}
            />

            <div>

              <strong>
                Why an account is required
              </strong>

              <p>
                Ranked activity is tied to
                a Firebase UID and calculated
                from server-side StudyOS
                activity.
              </p>

            </div>

          </div>

        </div>

      </section>
    );
  }

  // =======================================================
  // ACCOUNT UI
  // =======================================================

  return (
    <section className="settings-v2-section-stack">

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="settings-v2-notice settings-v2-notice-error">

          <XCircle
            size={18}
          />

          <div>

            <strong>
              Leaderboard settings
            </strong>

            <span>
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            Dismiss
          </button>

        </div>
      )}

      {/* ===================================================
          SUCCESS
      =================================================== */}

      {message && (
        <div className="settings-v2-notice settings-v2-notice-success">

          <CheckCircle2
            size={18}
          />

          <span>
            {message}
          </span>

        </div>
      )}

      {/* ===================================================
          GLOBAL LEADERBOARD
      =================================================== */}

      <div className="settings-v2-panel">

        <div className="settings-v2-panel-header">

          <div>

            <h3>
              Global leaderboard
            </h3>

            <p>
              Choose your public leaderboard
              identity and participation
              preference.
            </p>

          </div>

          <Trophy
            size={21}
          />

        </div>

        {loading ? (

          <div className="settings-v2-info-panel">

            <Trophy
              size={18}
            />

            <div>

              <strong>
                Loading leaderboard settings
              </strong>

              <p>
                Checking your public
                leaderboard profile.
              </p>

            </div>

          </div>

        ) : (

          <form
            className="settings-v2-form"
            onSubmit={
              saveLeaderboardSettings
            }
          >

            {/* =============================================
                PUBLIC DISPLAY NAME
            ============================================== */}

            <label className="settings-v2-field">

              <span>
                Public display name
              </span>

              <small>
                Independent from your normal
                StudyOS profile name.
                Other students see only this
                name in rankings.
              </small>

              <input
                type="text"
                value={
                  displayName
                }
                maxLength={32}
                placeholder="Enter leaderboard name"
                onChange={(
                  event
                ) => {
                  setDisplayName(
                    event.target.value
                  );

                  setMessage("");
                  setError("");
                }}
                disabled={
                  saving
                }
              />

            </label>

            {/* =============================================
                PARTICIPATION
            ============================================== */}

            <div className="settings-v2-row">

              <div className="settings-v2-row-copy">

                <strong>
                  Join global leaderboard
                </strong>

                <span>
                  Allow your public display
                  name and aggregate weekly
                  study statistics to appear
                  in rankings.
                </span>

              </div>

              <div className="settings-v2-row-actions">

                <span
                  className={`settings-v2-status-badge ${
                    isPublic
                      ? "settings-v2-notification-granted"
                      : ""
                  }`}
                >

                  {isPublic ? (
                    <>
                      <Eye
                        size={13}
                      />

                      Public
                    </>
                  ) : (
                    <>
                      <EyeOff
                        size={13}
                      />

                      Private
                    </>
                  )}

                </span>

                <button
                  type="button"
                  className={`toggle-button ${
                    isPublic
                      ? "on"
                      : ""
                  }`}
                  aria-pressed={
                    isPublic
                  }
                  onClick={() => {
                    setIsPublic(
                      (
                        current
                      ) =>
                        !current
                    );

                    setMessage("");
                    setError("");
                  }}
                  disabled={
                    saving
                  }
                >
                  {isPublic
                    ? "On"
                    : "Off"}
                </button>

              </div>

            </div>

            {/* =============================================
                SAVE
            ============================================== */}

            <div className="settings-v2-form-footer">

              <span className="settings-v2-form-hint">

                {isPublic
                  ? `Public as: ${displayName.trim() || "Unnamed"}`
                  : "You can view rankings without appearing publicly."}

              </span>

              <button
                type="submit"
                className="settings-v2-primary-button"
                disabled={
                  saving ||
                  !hasChanges
                }
              >

                {saving
                  ? "Saving..."
                  : "Save leaderboard settings"}

              </button>

            </div>

          </form>

        )}

      </div>

      {/* ===================================================
          PRIVACY
      =================================================== */}

      <div className="settings-v2-panel">

        <div className="settings-v2-panel-header">

          <div>

            <h3>
              Leaderboard privacy
            </h3>

            <p>
              Only aggregate competition
              information is made public.
            </p>

          </div>

          <BadgeCheck
            size={21}
          />

        </div>

        <div className="settings-v2-info-panel">

          <BadgeCheck
            size={18}
          />

          <div>

            <strong>
              Public when enabled
            </strong>

            <p>
              Leaderboard display name,
              weekly XP, verified Focus
              minutes, completed-task count
              and rank.
            </p>

          </div>

        </div>

        <div className="settings-v2-info-panel">

          <LockKeyhole
            size={18}
          />

          <div>

            <strong>
              Always private
            </strong>

            <p>
              Email, Firebase UID, dashboard
              display name, task titles,
              subjects, notes, Calendar
              content and individual Focus
              sessions.
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}

export default LeaderboardSettings;
