import RecoveryBoundary from "./components/RecoveryBoundary";
import { loadModuleWithDeadline } from "./services/deadline";
import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";

import OptionalAnalytics from "./components/OptionalAnalytics";

import {
  useAuth,
} from "./context/AuthContext";
import { apiRequest } from "./services/api";
import { WorkspaceRouteLoading } from "./components/WorkspaceStates";
import { getStartupPage, loadWorkspacePage } from "./services/routePreload";
import { parseRoomId, roomDestination } from "./services/studyRoomLinks";

// =========================================================
// PUBLIC PAGES
// =========================================================

const lazyPage = loader => lazy(() => loadModuleWithDeadline(loader));

const Landing = lazyPage(
  () =>
    import(
      "./pages/Landing"
    )
);

const GetStarted = lazyPage(
  () =>
    import(
      "./pages/GetStarted"
    )
);

const Privacy = lazyPage(
  () =>
    import(
      "./pages/Privacy"
    )
);

const Terms = lazyPage(
  () =>
    import(
      "./pages/Terms"
    )
);

const NotFound = lazyPage(() => import("./pages/NotFound"));
const Help = lazyPage(() => import("./pages/Help"));
const Changelog = lazyPage(() => import("./pages/Changelog"));
const Status = lazyPage(() => import("./pages/Status"));

const Contact = lazyPage(
  () =>
    import(
      "./pages/Contact"
    )
);

// =========================================================
// APPLICATION SHELL
// =========================================================

const StudyApp = lazyPage(
  () =>
    import(
      "./pages/StudyApp"
    )
);

// =========================================================
// APPLICATION PAGES
// =========================================================

const Dashboard = lazy(() => loadWorkspacePage("dashboard"));

const Tasks = lazy(() => loadWorkspacePage("tasks"));

const Subjects = lazy(() => loadWorkspacePage("subjects"));

const Notes = lazy(() => loadWorkspacePage("notes"));
const Flashcards = lazy(() => loadWorkspacePage("flashcards"));

const Calendar = lazy(() => loadWorkspacePage("calendar"));

const Progress = lazy(() => loadWorkspacePage("progress"));

const Leaderboard = lazy(() => loadWorkspacePage("leaderboard"));

const Groups = lazy(() => loadWorkspacePage("groups"));

const Chats = lazy(() => loadWorkspacePage("chats"));

const Settings = lazy(() => loadWorkspacePage("settings"));

// Unlisted route; permissions are enforced by the backend, not the UI.
const SecurityAdmin = lazyPage(() => import("./pages/SecurityAdmin"));

// =========================================================
// APPLICATION ROUTES
// =========================================================

// =========================================================
// LOADING
// =========================================================

function RouteLoader() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/app")) return <WorkspaceRouteLoading pathname={pathname} shell />;
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

  const location = useLocation();
  const invite = new URLSearchParams(location.search).get("invite");
  const validInvite = /^[A-F0-9]{8}$/i.test(invite || "");

  const room = parseRoomId(new URLSearchParams(location.search).get("room"));
  const destination = validInvite
    ? "/app/groups?invite=" + invite.toUpperCase()
    : roomDestination(room) || "/app";

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
        to={destination}
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
    firebaseUser,
  } = useAuth();

  const location = useLocation();
  const invite = new URLSearchParams(location.search).get("invite");

  const validInvite =
    location.pathname === "/app/groups" &&
    /^[A-F0-9]{8}$/i.test(invite || "");

  const room = location.pathname.toLowerCase().replace(/\/$/, "") === "/app/study-rooms"
    ? parseRoomId(new URLSearchParams(location.search).get("room")) : null;
  const loginDestination = validInvite
    ? "/get-started?invite=" + invite.toUpperCase()
    : roomDestination(room, "/get-started") || "/get-started";

  if (loading) {
    return (
      <RouteLoader />
    );
  }

  if (mode === "none") {
    return (
      <Navigate
        to={loginDestination}
        replace
      />
    );
  }

  return (
    <StudyApp key={mode === "guest" ? "guest" : `account:${firebaseUser?.uid}`} />
  );
}

// =========================================================
// PRIVATE SECURITY ROUTE
// No navigation entry. Only the backend-confirmed owner can
// load the admin screen; everyone else returns to Dashboard.
// The backend independently enforces every admin API request.
// =========================================================

function PrivateSecurityRoute() {
  const { mode, firebaseUser } = useAuth();
  const [access, setAccess] = useState({ uid: null, authorized: false });
  const uid = firebaseUser?.uid;

  useEffect(() => {
    if (mode !== "authenticated" || !uid) return;

    let cancelled = false;

    apiRequest("/api/security/me")
      .then((data) => {
        if (!cancelled) {
          setAccess({ uid, authorized: data?.authorized === true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccess({ uid, authorized: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, uid]);

  if (mode !== "authenticated" || !uid) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (access.uid !== uid) {
    return <RouteLoader />;
  }

  if (!access.authorized) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <SecurityAdmin />;
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
          let anchor = location.hash.slice(1);
          try { anchor = decodeURIComponent(anchor); } catch { /* Invalid percent encoding. */ }
          const target = document.getElementById(anchor);

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
  const { pathname } = useLocation();
  return (
    <>
      <RouteScrollManager />

      <OptionalAnalytics />

      <RecoveryBoundary key={pathname.startsWith("/app") ? "workspace" : pathname} scope="app">
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

            <Route path="flashcards" element={<Flashcards />} />

            <Route
              path="calendar"
              element={
                <Calendar />
              }
            />

            {/* The workspace shell owns the persistent Focus controller. */}
            <Route path="focus" element={<></>} />

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

            <Route path="study-rooms" element={<></>} />

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
              path="security"
              element={<PrivateSecurityRoute />}
            />

            <Route
              path="*"
              element={
                <NotFound workspace />
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

          <Route path="/help" element={<Help />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/status" element={<Status />} />

          {/* ===============================================
              FALLBACK
          ================================================ */}

          <Route
            path="*"
            element={
              <NotFound />
            }
          />

        </Routes>
      </Suspense>
      </RecoveryBoundary>
    </>
  );
}

export default App;
