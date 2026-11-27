import { applyTheme, readTheme, THEME_EVENT } from "../services/theme";
import RecoveryBoundary from "../components/RecoveryBoundary";
import DialogSurface from "../components/DialogSurface";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Cloud,
  Menu,
} from "../components/icons";

import {
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";

import "../styles/v2.css";
import "../styles/typography-v2.css";
import "../styles/mobile/mobile-shell.css";

import Sidebar from "../components/Sidebar";
import { WorkspaceRouteLoading } from "../components/WorkspaceStates";
import { scheduleWorkspaceWarmup } from "../services/routePreload";
import NetworkNotice from "../components/NetworkNotice";
import MobileBottomNav from "../components/mobile/MobileBottomNav";

import {
  useAuth,
} from "../context/AuthContext";

import {
  getGuestDataSnapshot,
  migrateGuestDataToAccount,
} from "../services/guestMigration";

// =========================================================
// APPLICATION PAGE LABELS
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
  dashboard:
    "Dashboard",

  tasks:
    "Tasks",

  subjects:
    "Subjects",

  notes:
    "Notes",

  calendar:
    "Calendar",

  focus:
    "Focus",

  progress:
    "Progress",

  leaderboard:
    "Leaderboard",

  settings:
    "Settings",
};

// =========================================================
// COUNT GUEST DATA
// =========================================================

const getSnapshotCount =
  (
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

const buildGuestSignature =
  (
    snapshot
  ) => {
    const normalize =
      (
        items
      ) => {
        return items
          .map(
            (
              item
            ) => {
              return [
                item?._id ||
                  "",

                item?.updatedAt ||
                  "",

                item?.createdAt ||
                  "",
              ].join(
                ":"
              );
            }
          )
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
// STUDY APP SHELL
// =========================================================

function StudyApp() {
  const {
    firebaseUser,
    isAuthenticated,
    isGuest,
  } = useAuth();

  const location =
    useLocation();

  useEffect(() => scheduleWorkspaceWarmup(location.pathname), [location.pathname]);
  const mainRef = useRef(null);
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    const frame = requestAnimationFrame(() => {
      const main = mainRef.current;
      if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  const navigate =
    useNavigate();

  // =======================================================
  // CURRENT ROUTE
  // =======================================================

  const routeParts =
    location.pathname
      .split(
        "/"
      )
      .filter(
        Boolean
      );

  const routePage =
    routeParts[1];

  const activePage =
    VALID_PAGES.includes(
      routePage
    )
      ? routePage
      : "dashboard";

  // =======================================================
  // MOBILE NAVIGATION
  // =======================================================

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(
    false
  );

  // =======================================================
  // GUEST MIGRATION
  // =======================================================

  const [
    showGuestMigration,
    setShowGuestMigration,
  ] = useState(
    false
  );

  const [
    guestDataCount,
    setGuestDataCount,
  ] = useState(
    0
  );

  const [
    guestDataSignature,
    setGuestDataSignature,
  ] = useState(
    ""
  );

  const [
    migratingGuestData,
    setMigratingGuestData,
  ] = useState(
    false
  );

  const [
    migrationError,
    setMigrationError,
  ] = useState(
    ""
  );

  // Display the persisted, account-scoped timer even on other app pages.
  useEffect(() => {
    const key = isGuest
      ? "studyos_active_focus_timer:guest"
      : firebaseUser?.uid
        ? "studyos_active_focus_timer:account:" + firebaseUser.uid
        : null;
    if (!key) return;
    const originalTitle = document.title;
    let ownedTitle = null;
    const restore = () => {
      if (ownedTitle !== null && document.title === ownedTitle) document.title = originalTitle;
      ownedTitle = null;
    };
    const tick = () => {
      try {
        const timer = JSON.parse(localStorage.getItem(key) || "null");
        if (!timer || !["running", "paused"].includes(timer.status)) {
          restore();
          return;
        }
        const seconds = timer.status === "running"
          ? Math.ceil((Number(timer.targetEndAt) - Date.now()) / 1000)
          : Number(timer.remainingSeconds);
        if (!Number.isFinite(seconds)) { restore(); return; }
        const safe = Math.max(0, Math.floor(seconds));
        const hours = Math.floor(safe / 3600);
        const minutes = String(Math.floor(safe % 3600 / 60)).padStart(2, "0");
        const secs = String(safe % 60).padStart(2, "0");
        const time = (hours ? hours + ":" : "") + minutes + ":" + secs;
        ownedTitle = safe === 0 ? "Focus complete — StudyOS"
          : time + (timer.status === "paused" ? " · Paused" : "") + " — StudyOS";
        if (document.title !== ownedTitle) document.title = ownedTitle;
      } catch {
        restore();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    window.addEventListener("storage", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", tick);
      document.removeEventListener("visibilitychange", tick);
      restore();
    };
  }, [isGuest, firebaseUser?.uid]);

  // =======================================================
  // THEME
  // =======================================================

  useEffect(() => {
    const syncTheme = () => applyTheme(readTheme());
    syncTheme();
    window.addEventListener(THEME_EVENT, syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener(THEME_EVENT, syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  // =======================================================
  // CLOSE DRAWER AFTER ROUTE CHANGE
  // =======================================================

  useEffect(
    () => {
      setSidebarOpen(
        false
      );
    },
    [
      location.pathname,
    ]
  );

  // =======================================================
  // MOBILE DRAWER BEHAVIOR
  // =======================================================

  useEffect(
    () => {
      const media =
        window.matchMedia(
          "(max-width: 900px)"
        );

      const closeOnDesktop =
        () => {
          if (
            !media.matches
          ) {
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
    },
    []
  );

  // =======================================================
  // LOCK PAGE WHILE DRAWER OPEN
  // =======================================================

  useEffect(
    () => {
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
    },
    [
      sidebarOpen,
    ]
  );

  // =======================================================
  // ESC CLOSE
  // =======================================================

  useEffect(
    () => {
      if (
        !sidebarOpen
      ) {
        return undefined;
      }

      const handleKeyDown =
        (
          event
        ) => {
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
    },
    [
      sidebarOpen,
    ]
  );

  // =======================================================
  // CHECK GUEST DATA AFTER LOGIN
  // =======================================================

  useEffect(
    () => {
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
              count ===
              0
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
    },
    [
      isAuthenticated,
      firebaseUser?.uid,
    ]
  );

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

        setSidebarOpen(
          false
        );

        navigate(
          "/app/dashboard",
          {
            replace:
              true,
          }
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
  // UI
  // =======================================================

  return (
    <>
      <div className="app app-shell-v2">
        <a className="workspace-skip-link" href="#workspace-main"
          onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>
          Skip to main content
        </a>

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

        <Sidebar
          isOpen={
            sidebarOpen
          }
          onClose={() =>
            setSidebarOpen(
              false
            )
          }
        />

        <div className="app-shell-v2-content">

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

          <main id="workspace-main" ref={mainRef} className="main-content app-shell-v2-main" tabIndex={-1} aria-label={PAGE_LABELS[activePage]}>

            {!isGuest && <NetworkNotice />}
            <RecoveryBoundary key={location.pathname} scope="route">
              <Suspense fallback={<WorkspaceRouteLoading pathname={location.pathname} />}>
                <Outlet />
              </Suspense>
            </RecoveryBoundary>

          </main>

        </div>

        <MobileBottomNav
          onMore={() =>
            setSidebarOpen(
              true
            )
          }
        />

      </div>

      {showGuestMigration && (
        <div className="delete-modal-overlay">

          <DialogSurface onDismiss={undefined} initialFocus=".settings-v2-secondary-button" aria-labelledby="guest-migration-heading"
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

            <h2 id="guest-migration-heading">
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

          </DialogSurface>

        </div>
      )}
    </>
  );
}

export default StudyApp;