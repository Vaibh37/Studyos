import { useEffect, useState } from "react";

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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { NavLink } from "react-router";

import "../styles/global-polish.css";
import "../styles/sidebar-clean.css";

const groups = [
  {
    label: "Workspace",
    items: [
      ["Dashboard", "/app/dashboard", LayoutDashboard],
      ["Tasks", "/app/tasks", CheckSquare],
      ["Subjects", "/app/subjects", BookOpen],
      ["Notes", "/app/notes", FileText],
      ["Calendar", "/app/calendar", CalendarDays],
    ],
  },
  {
    label: "Activity",
    items: [
      ["Focus", "/app/focus", Timer],
      ["Progress", "/app/progress", BarChart3],
      ["Leaderboard", "/app/leaderboard", Trophy],
    ],
  },
  {
    label: "Community",
    items: [
      ["Study Groups", "/app/groups", UsersRound],
      ["Chats", "/app/chats", MessageCircle],
    ],
  },
];

const STORAGE_KEY = "studyos_sidebar_collapsed";

function Sidebar({ isOpen = false, onClose }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        String(collapsed)
      );
    } catch {
      // Sidebar works even without browser storage.
    }
  }, [collapsed]);

  const closeNavigation = () => onClose?.();

  function renderLink([label, to, Icon]) {
    return (
      <NavLink
        key={to}
        to={to}
        end
        onClick={closeNavigation}
        aria-label={label}
        title={collapsed ? label : undefined}
        className={({ isActive }) =>
          `nav-item${isActive ? " active" : ""}`
        }
      >
        <Icon
          size={19}
          strokeWidth={1.8}
          aria-hidden="true"
        />

        <span>{label}</span>
      </NavLink>
    );
  }

  return (
    <aside
      className={`sidebar app-shell-v2-sidebar study-sidebar${
        isOpen ? " is-open" : ""
      }${collapsed ? " is-collapsed" : ""}`}
      aria-label="StudyOS navigation"
    >

      {/* BRAND */}

      <div className="sidebar-logo app-shell-v2-sidebar-header">

        <NavLink
          to="/app/dashboard"
          className="app-shell-v2-brand"
          aria-label="Open Dashboard"
          onClick={closeNavigation}
        >

          <span
            className="logo-mark"
            aria-hidden="true"
          >
            S
          </span>

          <span className="app-shell-v2-brand-name">
            StudyOS
          </span>

        </NavLink>

        {/* DESKTOP COLLAPSE */}

        <button
          type="button"
          className="ss-collapse"
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          aria-expanded={!collapsed}
          aria-controls="study-sidebar-nav"
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          onClick={() =>
            setCollapsed(value => !value)
          }
        >

          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}

        </button>

        {/* MOBILE DRAWER CLOSE */}

        <button
          type="button"
          className="app-shell-v2-sidebar-close"
          aria-label="Close navigation"
          onClick={closeNavigation}
        >
          <X size={18} strokeWidth={1.9} />
        </button>

      </div>

      {/* NAVIGATION GROUPS */}

      <div className="app-shell-v2-nav-section">

        <nav
          id="study-sidebar-nav"
          className="sidebar-nav app-shell-v2-nav"
          aria-label="Main navigation"
        >

          {groups.map(group => (

            <div
              key={group.label}
              className="ss-group"
              role="group"
              aria-label={group.label}
            >

              <span
                className="app-shell-v2-nav-label"
                aria-hidden="true"
              >
                {group.label}
              </span>

              {group.items.map(renderLink)}

            </div>

          ))}

        </nav>

      </div>

      {/* SETTINGS */}

      <div className="sidebar-bottom">

        <nav aria-label="Preferences">

          {renderLink([
            "Settings",
            "/app/settings",
            Settings,
          ])}

        </nav>

      </div>

    </aside>
  );
}

export default Sidebar;