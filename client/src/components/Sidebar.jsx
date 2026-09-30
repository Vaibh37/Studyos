import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  FileText,
  CalendarDays,
  Timer,
  BarChart3,
  Trophy,
  Settings,
  X,
} from "lucide-react";

import "../styles/global-polish.css";


const menuItems = [
  {
    label:
      "Dashboard",

    page:
      "dashboard",

    icon:
      LayoutDashboard,
  },

  {
    label:
      "Tasks",

    page:
      "tasks",

    icon:
      CheckSquare,
  },

  {
    label:
      "Subjects",

    page:
      "subjects",

    icon:
      BookOpen,
  },

  {
    label:
      "Notes",

    page:
      "notes",

    icon:
      FileText,
  },

  {
    label:
      "Calendar",

    page:
      "calendar",

    icon:
      CalendarDays,
  },

  {
    label:
      "Focus",

    page:
      "focus",

    icon:
      Timer,
  },

  {
    label:
      "Progress",

    page:
      "progress",

    icon:
      BarChart3,
  },

  {
    label:
      "Leaderboard",

    page:
      "leaderboard",

    icon:
      Trophy,
  },
];


function Sidebar({
  activePage,
  onNavigate,
  isOpen = false,
  onClose,
}) {
  const navigate =
    (
      page
    ) => {
      onNavigate(
        page
      );
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

        <button
          type="button"
          className="app-shell-v2-brand"
          onClick={() =>
            navigate(
              "dashboard"
            )
          }
          aria-label="Open Dashboard"
        >

          <span className="logo-mark">
            S
          </span>

          <span className="app-shell-v2-brand-name">
            StudyOS
          </span>

        </button>


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

              const active =
                activePage ===
                item.page;


              return (
                <button
                  type="button"
                  key={
                    item.page
                  }
                  className={`nav-item ${
                    active
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    navigate(
                      item.page
                    )
                  }
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                >

                  <Icon
                    size={18}
                    strokeWidth={1.8}
                  />

                  <span>
                    {item.label}
                  </span>

                </button>
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


        <button
          type="button"
          className={`nav-item ${
            activePage ===
            "settings"
              ? "active"
              : ""
          }`}
          onClick={() =>
            navigate(
              "settings"
            )
          }
          aria-current={
            activePage ===
            "settings"
              ? "page"
              : undefined
          }
        >

          <Settings
            size={18}
            strokeWidth={1.8}
          />

          <span>
            Settings
          </span>

        </button>

      </div>

    </aside>
  );
}


export default Sidebar;