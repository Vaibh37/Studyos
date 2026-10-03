import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  Settings,
  X,
} from "lucide-react";

import {
  NavLink,
} from "react-router";


// =========================================================
// ITEMS
// =========================================================

const moreItems = [
  {
    label: "Subjects",
    description: "Manage your courses",
    to: "/app/subjects",
    icon: BookOpen,
  },

  {
    label: "Notes",
    description: "Study notes",
    to: "/app/notes",
    icon: FileText,
  },

  {
    label: "Calendar",
    description: "Deadlines & events",
    to: "/app/calendar",
    icon: CalendarDays,
  },

  {
    label: "Progress",
    description: "Stats & activity",
    to: "/app/progress",
    icon: BarChart3,
  },

  {
    label: "Settings",
    description: "Account & preferences",
    to: "/app/settings",
    icon: Settings,
  },
];


// =========================================================
// MOBILE MORE SHEET
// =========================================================

function MobileMoreSheet({
  open,
  onClose,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="mobile-more-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <section
        className="mobile-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="More StudyOS navigation"
      >

        {/* HANDLE */}

        <div className="mobile-more-handle" />


        {/* HEADER */}

        <div className="mobile-more-header">

          <div>

            <span>
              StudyOS
            </span>

            <h2>
              More
            </h2>

          </div>


          <button
            type="button"
            className="mobile-more-close"
            onClick={
              onClose
            }
            aria-label="Close more menu"
          >
            <X
              size={18}
            />
          </button>

        </div>


        {/* GRID */}

        <div className="mobile-more-grid">

          {moreItems.map(
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
                  onClick={
                    onClose
                  }
                  className={({
                    isActive,
                  }) =>
                    [
                      "mobile-more-item",

                      isActive
                        ? "is-active"
                        : "",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " "
                      )
                  }
                >

                  <span className="mobile-more-item-icon">

                    <Icon
                      size={20}
                      strokeWidth={1.8}
                    />

                  </span>


                  <div>

                    <strong>
                      {item.label}
                    </strong>

                    <span>
                      {item.description}
                    </span>

                  </div>

                </NavLink>
              );
            }
          )}

        </div>


        {/* FOOTER */}

        <div className="mobile-more-footer">

          <span className="mobile-more-logo">
            S
          </span>

          <div>

            <strong>
              StudyOS
            </strong>

            <span>
              Your study workspace
            </span>

          </div>

        </div>

      </section>

    </div>
  );
}


export default MobileMoreSheet;