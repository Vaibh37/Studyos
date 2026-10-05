import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Timer,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";

import {
  NavLink,
} from "react-router";

import "../styles/global-polish.css";

// =========================================================
// NAVIGATION
// =========================================================

const menuItems = [
  {
    label:
      "Dashboard",

    to:
      "/app/dashboard",

    icon:
      LayoutDashboard,
  },

  {
    label:
      "Tasks",

    to:
      "/app/tasks",

    icon:
      CheckSquare,
  },

  {
    label:
      "Subjects",

    to:
      "/app/subjects",

    icon:
      BookOpen,
  },

  {
    label:
      "Notes",

    to:
      "/app/notes",

    icon:
      FileText,
  },

  {
    label:
      "Calendar",

    to:
      "/app/calendar",

    icon:
      CalendarDays,
  },

  {
    label:
      "Focus",

    to:
      "/app/focus",

    icon:
      Timer,
  },

  {
    label:
      "Progress",

    to:
      "/app/progress",

    icon:
      BarChart3,
  },

  {
    label:
      "Leaderboard",

    to:
      "/app/leaderboard",

    icon:
      Trophy,
  },

  {
    label:
      "Study Groups",

    to:
      "/app/groups",

    icon:
      UsersRound,
  },

  {
    label:
      "Chats",

    to:
      "/app/chats",

    icon:
      MessageCircle,
  },
];

// =========================================================
// SIDEBAR
// =========================================================

function Sidebar({
  isOpen = false,
  onClose,
}) {
  const closeNavigation =
    () => {
      onClose?.();
    };

  return (
    <aside
      className={`sidebar app-shell-v2-sidebar ${
        isOpen
          ? "is-open"
          : ""
      }`}
      aria-label="StudyOS navigation"
    >

      {/* =================================================
          BRAND
      ================================================= */}

      <div className="sidebar-logo app-shell-v2-sidebar-header">

        <NavLink
          to="/app/dashboard"
          className="app-shell-v2-brand"
          aria-label="Open Dashboard"
          onClick={
            closeNavigation
          }
          style={{
            textDecoration:
              "none",
          }}
        >

          <span className="logo-mark">
            S
          </span>

          <span className="app-shell-v2-brand-name">
            StudyOS
          </span>

        </NavLink>

        <button
          type="button"
          className="app-shell-v2-sidebar-close"
          onClick={
            onClose
          }
          aria-label="Close navigation"
        >

          <X
            size={18}
            strokeWidth={1.9}
          />

        </button>

      </div>

      {/* =================================================
          WORKSPACE
      ================================================= */}

      <div className="app-shell-v2-nav-section">

        <span className="app-shell-v2-nav-label">
          Workspace
        </span>

        <nav className="sidebar-nav app-shell-v2-nav">

          {menuItems.map(
            (
              item
            ) => {
              const Icon =
                item.icon;

              return (
                <NavLink
                  key={
                    item.to
                  }
                  to={
                    item.to
                  }
                  end
                  onClick={
                    closeNavigation
                  }
                  style={{
                    textDecoration:
                      "none",
                  }}
                  className={({
                    isActive,
                  }) =>
                    `nav-item ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                >

                  <Icon
                    size={18}
                    strokeWidth={1.8}
                  />

                  <span>
                    {item.label}
                  </span>

                </NavLink>
              );
            }
          )}

        </nav>

      </div>

      {/* =================================================
          SETTINGS
      ================================================= */}

      <div className="sidebar-bottom">

        <span className="app-shell-v2-nav-label">
          Preferences
        </span>

        <NavLink
          to="/app/settings"
          end
          onClick={
            closeNavigation
          }
          style={{
            textDecoration:
              "none",
          }}
          className={({
            isActive,
          }) =>
            `nav-item ${
              isActive
                ? "active"
                : ""
            }`
          }
        >

          <Settings
            size={18}
            strokeWidth={1.8}
          />

          <span>
            Settings
          </span>

        </NavLink>

      </div>

    </aside>
  );
}

export default Sidebar;
