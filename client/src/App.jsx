import {
  useEffect,
  useState,
} from "react";

import "./App.css";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Subjects from "./pages/Subjects";
import Notes from "./pages/Notes";
import Calendar from "./pages/Calendar";
import Focus from "./pages/Focus";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import Welcome from "./pages/Welcome";

import {
  useAuth,
} from "./context/AuthContext";

import {
  getGuestDataSnapshot,
  migrateGuestDataToAccount,
} from "./services/guestMigration";

// =========================================================
// PAGES
// =========================================================

const VALID_PAGES = [
  "dashboard",
  "tasks",
  "subjects",
  "notes",
  "calendar",
  "focus",
  "progress",
  "settings",
];

// =========================================================
// STARTUP PAGE
// =========================================================

const getStartupPage = () => {
  const saved =
    localStorage.getItem(
      "studyos_startup_page"
    );

  return VALID_PAGES.includes(
    saved
  )
    ? saved
    : "dashboard";
};

// =========================================================
// COUNT GUEST DATA
// =========================================================

const getSnapshotCount = (
  snapshot
) => {
  return (
    snapshot.tasks.length +
    snapshot.subjects.length +
    snapshot.notes.length +
    snapshot.events.length +
    snapshot.studySessions.length
  );
};

// =========================================================
// GUEST SNAPSHOT SIGNATURE
//
// Used so "Start fresh" doesn't annoy the same account
// every single reload.
//
// If the guest data later changes, the signature changes
// and StudyOS can offer migration again.
// =========================================================

const buildGuestSignature = (
  snapshot
) => {
  const normalize = (
    items
  ) => {
    return items
      .map((item) => {
        return [
          item?._id || "",
          item?.updatedAt || "",
          item?.createdAt || "",
        ].join(":");
      })
      .sort();
  };

  return JSON.stringify({
    tasks:
      normalize(
        snapshot.tasks
      ),

    subjects:
      normalize(
        snapshot.subjects
      ),

    notes:
      normalize(
        snapshot.notes
      ),

    events:
      normalize(
        snapshot.events
      ),

    studySessions:
      normalize(
        snapshot.studySessions
      ),
  });
};

// =========================================================
// APP
// =========================================================

function App() {
  const {
    mode,
    loading:
      authLoading,

    firebaseUser,
    isAuthenticated,
  } = useAuth();

  // =======================================================
  // PAGE
  // =======================================================

  const [
    activePage,
    setActivePage,
  ] = useState(
    getStartupPage
  );

  // =======================================================
  // GUEST MIGRATION
  // =======================================================

  const [
    showGuestMigration,
    setShowGuestMigration,
  ] = useState(false);

  const [
    guestDataCount,
    setGuestDataCount,
  ] = useState(0);

  const [
    guestDataSignature,
    setGuestDataSignature,
  ] = useState("");

  const [
    migratingGuestData,
    setMigratingGuestData,
  ] = useState(false);

  const [
    migrationError,
    setMigrationError,
  ] = useState("");

  // =======================================================
  // THEME
  // =======================================================

  useEffect(() => {
    const applyTheme = () => {
      const theme =
        localStorage.getItem(
          "studyos_theme"
        ) || "dark";

      if (
        theme === "light"
      ) {
        document.body.classList.add(
          "light-theme"
        );
      } else {
        document.body.classList.remove(
          "light-theme"
        );
      }
    };

    applyTheme();

    window.addEventListener(
      "studyos-theme-updated",
      applyTheme
    );

    return () => {
      window.removeEventListener(
        "studyos-theme-updated",
        applyTheme
      );
    };
  }, []);

  // =======================================================
  // CHECK FOR GUEST DATA AFTER ACCOUNT LOGIN
  // =======================================================

  useEffect(() => {
    let cancelled =
      false;

    const checkGuestData =
      async () => {
        // Only signed-in accounts
        // need the migration prompt.

        if (
          !isAuthenticated ||
          !firebaseUser?.uid
        ) {
          if (!cancelled) {
            setShowGuestMigration(
              false
            );

            setGuestDataCount(
              0
            );

            setGuestDataSignature(
              ""
            );

            setMigrationError(
              ""
            );
          }

          return;
        }

        try {
          const snapshot =
            await getGuestDataSnapshot();

          if (cancelled) {
            return;
          }

          const count =
            getSnapshotCount(
              snapshot
            );

          if (count === 0) {
            setShowGuestMigration(
              false
            );

            setGuestDataCount(
              0
            );

            setGuestDataSignature(
              ""
            );

            return;
          }

          const signature =
            buildGuestSignature(
              snapshot
            );

          const skipKey =
            `studyos_guest_migration_skip:${firebaseUser.uid}`;

          const skippedSignature =
            localStorage.getItem(
              skipKey
            );

          setGuestDataCount(
            count
          );

          setGuestDataSignature(
            signature
          );

          setMigrationError(
            ""
          );

          // If this exact guest
          // snapshot was already skipped
          // for this account, don't
          // keep showing the modal.
          setShowGuestMigration(
            skippedSignature !==
              signature
          );
        } catch (
          guestDataError
        ) {
          console.error(
            "Guest migration check failed:",
            guestDataError
          );

          if (!cancelled) {
            setShowGuestMigration(
              false
            );
          }
        }
      };

    checkGuestData();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    firebaseUser?.uid,
  ]);

  // =======================================================
  // MOVE GUEST DATA
  // =======================================================

  const moveGuestData =
    async () => {
      if (
        migratingGuestData
      ) {
        return;
      }

      try {
        setMigratingGuestData(
          true
        );

        setMigrationError(
          ""
        );

        await migrateGuestDataToAccount({
          clearAfterSuccess:
            true,
        });

        if (
          firebaseUser?.uid
        ) {
          localStorage.removeItem(
            `studyos_guest_migration_skip:${firebaseUser.uid}`
          );
        }

        setGuestDataCount(
          0
        );

        setGuestDataSignature(
          ""
        );

        setShowGuestMigration(
          false
        );

        setActivePage(
          "dashboard"
        );
      } catch (
        migrationFailure
      ) {
        console.error(
          "Guest migration failed:",
          migrationFailure
        );

        setMigrationError(
          migrationFailure.message ||
            "StudyOS couldn't move all guest data. Your guest data has not been cleared, so you can retry."
        );
      } finally {
        setMigratingGuestData(
          false
        );
      }
    };

  // =======================================================
  // START FRESH
  //
  // IMPORTANT:
  // This does NOT delete guest data.
  //
  // It simply tells this account:
  // "don't import this exact guest snapshot right now".
  // =======================================================

  const startFresh =
    () => {
      if (
        migratingGuestData
      ) {
        return;
      }

      if (
        firebaseUser?.uid &&
        guestDataSignature
      ) {
        localStorage.setItem(
          `studyos_guest_migration_skip:${firebaseUser.uid}`,
          guestDataSignature
        );
      }

      setMigrationError(
        ""
      );

      setShowGuestMigration(
        false
      );
    };

  // =======================================================
  // RENDER PAGE
  // =======================================================

  const renderPage = () => {
    switch (
      activePage
    ) {
      case "dashboard":
        return (
          <Dashboard />
        );

      case "tasks":
        return (
          <Tasks />
        );

      case "subjects":
        return (
          <Subjects />
        );

      case "notes":
        return (
          <Notes />
        );

      case "calendar":
        return (
          <Calendar />
        );

      case "focus":
        return (
          <Focus />
        );

      case "progress":
        return (
          <Progress />
        );

      case "settings":
        return (
          <Settings />
        );

      default:
        return (
          <Dashboard />
        );
    }
  };

  // =======================================================
  // AUTH LOADING
  // =======================================================

  if (authLoading) {
    return (
      <div className="auth-v1-loading">
        StudyOS
      </div>
    );
  }

  // =======================================================
  // WELCOME
  // =======================================================

  if (
    mode === "none"
  ) {
    return (
      <Welcome />
    );
  }

  // =======================================================
  // MAIN APP
  // =======================================================

  return (
    <>
      <div className="app">

        <Sidebar
          activePage={
            activePage
          }
          onNavigate={
            setActivePage
          }
        />

        <main className="main-content">

          {renderPage()}

        </main>

      </div>

      {/* ===================================================
          GUEST → ACCOUNT MIGRATION
      =================================================== */}

      {showGuestMigration && (
        <div
          className="delete-modal-overlay"
        >

          <div
            className="settings-v2-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="settings-v2-modal-icon settings-v2-modal-icon-neutral">
              ☁️
            </div>

            <h2>
              Move your guest data?
            </h2>

            <p>
              StudyOS found{" "}

              <strong>
                {guestDataCount}
              </strong>{" "}

              {guestDataCount ===
              1
                ? "guest item"
                : "guest items"}{" "}

              saved in this browser.
            </p>

            <p>
              You can move them into
              your signed-in account
              or start with your
              account data as it is.
            </p>

            <p>
              Moving data adds the
              guest records to your
              account. Existing cloud
              data will not be
              deleted.
            </p>

            {migrationError && (
              <div className="settings-v2-notice settings-v2-notice-error">

                <div>
                  <strong>
                    Migration failed
                  </strong>

                  <span>
                    {migrationError}
                  </span>
                </div>

              </div>
            )}

            <div className="settings-v2-modal-actions">

              <button
                type="button"
                className="settings-v2-secondary-button"
                disabled={
                  migratingGuestData
                }
                onClick={
                  startFresh
                }
              >
                Start fresh
              </button>

              <button
                type="button"
                className="settings-v2-primary-button"
                disabled={
                  migratingGuestData
                }
                onClick={
                  moveGuestData
                }
              >
                {migratingGuestData
                  ? "Moving data..."
                  : "Move my data"}
              </button>

            </div>

            <p
              style={{
                marginTop:
                  "12px",

                fontSize:
                  "11px",

                opacity:
                  0.65,

                textAlign:
                  "center",
              }}
            >
              “Start fresh” does not
              delete your guest data.
              It stays in this browser.
            </p>

          </div>

        </div>
      )}
    </>
  );
}

export default App;