import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  FileText,
  CalendarDays,
  Timer,
  BarChart3,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "Tasks",
    icon: CheckSquare,
  },

  {
    label: "Subjects",
    icon: BookOpen,
  },

  {
    label: "Notes",
    icon: FileText,
  },

  {
    label: "Calendar",
    icon: CalendarDays,
  },

  {
    label: "Focus",
    icon: Timer,
  },

  {
    label: "Progress",
    icon: BarChart3,
  },
];

function Sidebar({
  activePage,
  onNavigate,
}) {
  return (
    <aside className="sidebar">

      <div className="sidebar-logo">

        <div className="logo-mark">
          S
        </div>

        <span>
          StudyOS
        </span>

      </div>

      <nav className="sidebar-nav">

        {menuItems.map(
          (item) => {
            const Icon =
              item.icon;

            const page =
              item.label.toLowerCase();

            return (
              <button
                type="button"
                key={
                  item.label
                }
                className={`nav-item ${
                  activePage ===
                  page
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  onNavigate(
                    page
                  )
                }
              >

                <Icon
                  size={20}
                />

                <span>
                  {item.label}
                </span>

              </button>
            );
          }
        )}

      </nav>

      <div className="sidebar-bottom">

        <button
          type="button"
          className={`nav-item ${
            activePage ===
            "settings"
              ? "active"
              : ""
          }`}
          onClick={() =>
            onNavigate(
              "settings"
            )
          }
        >

          <Settings
            size={20}
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