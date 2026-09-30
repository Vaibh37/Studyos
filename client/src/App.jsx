import {
  useEffect,
  useState,
} from "react";

import {
  Cloud,
  Menu,
} from "lucide-react";

import "./App.css";

import "./styles/v2.css";
import "./styles/typography-v2.css";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Subjects from "./pages/Subjects";
import Notes from "./pages/Notes";
import Calendar from "./pages/Calendar";
import Focus from "./pages/Focus";
import Progress from "./pages/Progress";
import Leaderboard from "./pages/Leaderboard";
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
  "leaderboard",
  "settings",
];

const PAGE_LABELS = {
  dashboard: "Dashboard",
  tasks: "Tasks",
  subjects: "Subjects",
  notes: "Notes",
  calendar: "Calendar",
  focus: "Focus",
  progress: "Progress",
  leaderboard: "Leaderboard",
  settings: "Settings",
};

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
  // ACTIVE PAGE
  // =======================================================

  const [
    activePage,
    setActivePage,
  ] = useState(
    getStartupPage
  );

  // =======================================================
  // MOBILE NAVIGATION
  // =======================================================

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

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
  // MOBILE DRAWER BEHAVIOR
  // =======================================================

  useEffect(() => {
    const media =
      window.matchMedia(
        "(max-width: 900px)"
      );

    const closeOnDesktop =
      () => {
        if (!media.matches) {
          setSidebarOpen(
            false
          );
        }
      };

    closeOnDesktop();

    media.addEventListener(
      "change",
      closeOnDesktop
    );

    return () => {
      media.removeEventListener(
        "change",
        closeOnDesktop
      );
    };
  }, []);

  // =======================================================
  // LOCK PAGE WHILE MOBILE DRAWER IS OPEN
  // =======================================================

  useEffect(() => {
    const media =
      window.matchMedia(
        "(max-width: 900px)"
      );

    if (
      sidebarOpen &&
      media.matches
    ) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [
    sidebarOpen,
  ]);

  // =======================================================
  // ESC CLOSE
  // =======================================================

  useEffect(() => {
    if (
      !sidebarOpen
    ) {
      return undefined;
    }

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          setSidebarOpen(
            false
          );
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    sidebarOpen,
  ]);

  // =======================================================
  // CHECK GUEST DATA AFTER LOGIN
  // =======================================================

  useEffect(() => {
    let cancelled =
      false;

    const checkGuestData =
      async () => {
        if (
          !isAuthenticated ||
          !firebaseUser?.uid
        ) {
          if (
            !cancelled
          ) {
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

          if (
            cancelled
          ) {
            return;
          }

          const count =
            getSnapshotCount(
              snapshot
            );

          if (
            count === 0
          ) {
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

          if (
            !cancelled
          ) {
            setShowGuestMigration(
              false
            );
          }
        }
      };

    checkGuestData();

    return () => {
      cancelled =
        true;
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

        setSidebarOpen(
          false
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
  // NAVIGATE
  // =======================================================

  const handleNavigate =
    (page) => {
      if (
        !VALID_PAGES.includes(
          page
        )
      ) {
        return;
      }

      setActivePage(
        page
      );

      setSidebarOpen(
        false
      );

      window.scrollTo({
        top: 0,
        behavior:
          "instant",
      });
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

      case "leaderboard":
        return (
          <Leaderboard />
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

  if (
    authLoading
  ) {
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
      <div className="app app-shell-v2">

        {/* =================================================
            MOBILE BACKDROP
        ================================================= */}

        <button
          type="button"
          className={`app-shell-v2-backdrop ${
            sidebarOpen
              ? "is-visible"
              : ""
          }`}
          onClick={() =>
            setSidebarOpen(
              false
            )
          }
          aria-label="Close navigation"
          tabIndex={
            sidebarOpen
              ? 0
              : -1
          }
        />

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <Sidebar
          activePage={
            activePage
          }
          onNavigate={
            handleNavigate
          }
          isOpen={
            sidebarOpen
          }
          onClose={() =>
            setSidebarOpen(
              false
            )
          }
        />

        {/* =================================================
            MAIN SHELL
        ================================================= */}

        <div className="app-shell-v2-content">

          {/* ===============================================
              MOBILE TOP BAR
          ================================================ */}

          <header className="app-shell-v2-mobile-bar">

            <button
              type="button"
              className="app-shell-v2-menu-button"
              onClick={() =>
                setSidebarOpen(
                  true
                )
              }
              aria-label="Open navigation"
              aria-expanded={
                sidebarOpen
              }
            >
              <Menu
                size={20}
              />
            </button>

            <div className="app-shell-v2-mobile-brand">

              <div className="app-shell-v2-mobile-logo">
                S
              </div>

              <strong>
                StudyOS
              </strong>

            </div>

            <span className="app-shell-v2-mobile-page">
              {PAGE_LABELS[
                activePage
              ]}
            </span>

          </header>

          {/* ===============================================
              PAGE
          ================================================ */}

          <main className="main-content app-shell-v2-main">

            {renderPage()}

          </main>

        </div>

      </div>

      {/* ===================================================
          GUEST → ACCOUNT MIGRATION
      =================================================== */}

      {showGuestMigration && (
        <div className="delete-modal-overlay">

          <div
            className="settings-v2-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="settings-v2-modal-icon settings-v2-modal-icon-neutral">

              <Cloud
                size={22}
              />

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

            <p className="app-shell-v2-migration-note">
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