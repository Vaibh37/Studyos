import {
  lazy,
  Suspense,
  useEffect,
} from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";

import {
  useAuth,
} from "./context/AuthContext";

// =========================================================
// PUBLIC PAGES
// =========================================================

const Landing = lazy(
  () =>
    import(
      "./pages/Landing"
    )
);

const GetStarted = lazy(
  () =>
    import(
      "./pages/GetStarted"
    )
);

const Privacy = lazy(
  () =>
    import(
      "./pages/Privacy"
    )
);

const Terms = lazy(
  () =>
    import(
      "./pages/Terms"
    )
);

const Contact = lazy(
  () =>
    import(
      "./pages/Contact"
    )
);

// =========================================================
// APPLICATION SHELL
// =========================================================

const StudyApp = lazy(
  () =>
    import(
      "./pages/StudyApp"
    )
);

// =========================================================
// APPLICATION PAGES
// =========================================================

const Dashboard = lazy(
  () =>
    import(
      "./pages/Dashboard"
    )
);

const Tasks = lazy(
  () =>
    import(
      "./pages/Tasks"
    )
);

const Subjects = lazy(
  () =>
    import(
      "./pages/Subjects"
    )
);

const Notes = lazy(
  () =>
    import(
      "./pages/Notes"
    )
);

const Calendar = lazy(
  () =>
    import(
      "./pages/Calendar"
    )
);

const Focus = lazy(
  () =>
    import(
      "./pages/Focus"
    )
);

const Progress = lazy(
  () =>
    import(
      "./pages/Progress"
    )
);

const Leaderboard = lazy(
  () =>
    import(
      "./pages/Leaderboard"
    )
);

const Groups = lazy(
  () =>
    import(
      "./pages/Groups"
    )
);

const Chats = lazy(
  () =>
    import(
      "./pages/Chats"
    )
);

const Settings = lazy(
  () =>
    import(
      "./pages/Settings"
    )
);

// =========================================================
// APPLICATION ROUTES
// =========================================================

const VALID_APP_PAGES = [
  "dashboard",
  "tasks",
  "subjects",
  "notes",
  "calendar",
  "focus",
  "progress",
  "leaderboard",
  "groups",
  "chats",
  "settings",
];

const getStartupPage =
  () => {
    const saved =
      localStorage.getItem(
        "studyos_startup_page"
      );

    return VALID_APP_PAGES.includes(
      saved
    )
      ? saved
      : "dashboard";
  };

// =========================================================
// LOADING
// =========================================================

function RouteLoader() {
  return (
    <div
      className="route-loading"
      role="status"
      aria-live="polite"
    >
      <span className="route-loading-mark">
        S
      </span>

      <span>
        Loading StudyOS…
      </span>
    </div>
  );
}

// =========================================================
// HOME
//
// New / signed-out visitor:
// / -> marketing site
//
// Returning authenticated user:
// / -> /app -> saved startup page
//
// Returning guest:
// / -> /app -> saved startup page
// =========================================================

function HomeRoute() {
  const {
    loading,
    mode,
  } = useAuth();

  if (loading) {
    return (
      <RouteLoader />
    );
  }

  if (
    mode === "authenticated" ||
    mode === "guest"
  ) {
    return (
      <Navigate
        to="/app"
        replace
      />
    );
  }

  return (
    <Landing />
  );
}

// =========================================================
// GET STARTED
// =========================================================

function GetStartedRoute() {
  const {
    loading,
    mode,
  } = useAuth();

  if (loading) {
    return (
      <RouteLoader />
    );
  }

  if (
    mode === "authenticated" ||
    mode === "guest"
  ) {
    return (
      <Navigate
        to="/app"
        replace
      />
    );
  }

  return (
    <GetStarted />
  );
}

// =========================================================
// PROTECTED APPLICATION SHELL
// =========================================================

function ProtectedStudyApp() {
  const {
    loading,
    mode,
  } = useAuth();

  if (loading) {
    return (
      <RouteLoader />
    );
  }

  if (mode === "none") {
    return (
      <Navigate
        to="/get-started"
        replace
      />
    );
  }

  return (
    <StudyApp />
  );
}

// =========================================================
// /app INDEX
// =========================================================

function AppIndexRedirect() {
  const startupPage =
    getStartupPage();

  return (
    <Navigate
      to={`/app/${startupPage}`}
      replace
    />
  );
}

// =========================================================
// ROUTE SCROLL MANAGER
// =========================================================

function RouteScrollManager() {
  const location =
    useLocation();

  useEffect(() => {
    let frame = 0;
    let attempts = 0;

    const finishNavigation =
      () => {
        if (
          location.hash
        ) {
          const target =
            document.getElementById(
              decodeURIComponent(
                location.hash.slice(
                  1
                )
              )
            );

          if (target) {
            target.scrollIntoView({
              block:
                "start",
            });

            return;
          }

          attempts += 1;

          if (
            attempts < 24
          ) {
            frame =
              window.requestAnimationFrame(
                finishNavigation
              );

            return;
          }
        }

        window.scrollTo({
          top: 0,
          left: 0,
          behavior:
            "auto",
        });
      };

    frame =
      window.requestAnimationFrame(
        finishNavigation
      );

    return () => {
      window.cancelAnimationFrame(
        frame
      );
    };
  }, [
    location.pathname,
    location.hash,
  ]);

  return null;
}

// =========================================================
// ROUTER
// =========================================================

function App() {
  return (
    <>
      <RouteScrollManager />

      <Suspense
        fallback={
          <RouteLoader />
        }
      >
        <Routes>

          {/* ===============================================
              PUBLIC ENTRY
          ================================================ */}

          <Route
            path="/"
            element={
              <HomeRoute />
            }
          />

          <Route
            path="/get-started"
            element={
              <GetStartedRoute />
            }
          />

          {/* ===============================================
              STUDYOS APPLICATION
          ================================================ */}

          <Route
            path="/app"
            element={
              <ProtectedStudyApp />
            }
          >

            <Route
              index
              element={
                <AppIndexRedirect />
              }
            />

            <Route
              path="dashboard"
              element={
                <Dashboard />
              }
            />

            <Route
              path="tasks"
              element={
                <Tasks />
              }
            />

            <Route
              path="subjects"
              element={
                <Subjects />
              }
            />

            <Route
              path="notes"
              element={
                <Notes />
              }
            />

            <Route
              path="calendar"
              element={
                <Calendar />
              }
            />

            <Route
              path="focus"
              element={
                <Focus />
              }
            />

            <Route
              path="progress"
              element={
                <Progress />
              }
            />

            <Route
              path="leaderboard"
              element={
                <Leaderboard />
              }
            />

            <Route
              path="groups"
              element={
                <Groups />
              }
            />

            <Route
              path="chats"
              element={
                <Chats />
              }
            />

            <Route
              path="settings"
              element={
                <Settings />
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/app/dashboard"
                  replace
                />
              }
            />

          </Route>

          {/* ===============================================
              PUBLIC INFORMATION
          ================================================ */}

          <Route
            path="/privacy"
            element={
              <Privacy />
            }
          />

          <Route
            path="/terms"
            element={
              <Terms />
            }
          />

          <Route
            path="/contact"
            element={
              <Contact />
            }
          />

          {/* ===============================================
              FALLBACK
          ================================================ */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </Suspense>
    </>
  );
}

export default App;
