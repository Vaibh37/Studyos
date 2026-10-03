import {
  useEffect,
  useState,
} from "react";

import {
  CheckSquare,
  LayoutDashboard,
  MoreHorizontal,
  Timer,
  Trophy,
} from "lucide-react";

import {
  NavLink,
  useLocation,
} from "react-router";

import MobileMoreSheet from "./MobileMoreSheet";

import "../../styles/mobile/mobile-more.css";


// =========================================================
// MAIN NAVIGATION
// =========================================================

const navItems = [
  {
    label: "Home",
    to: "/app/dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "Tasks",
    to: "/app/tasks",
    icon: CheckSquare,
  },

  {
    label: "Focus",
    to: "/app/focus",
    icon: Timer,
    primary: true,
  },

  {
    label: "Rank",
    to: "/app/leaderboard",
    icon: Trophy,
  },
];


// =========================================================
// MOBILE BOTTOM NAV
// =========================================================

function MobileBottomNav() {
  const location =
    useLocation();


  const [
    moreOpen,
    setMoreOpen,
  ] = useState(
    false
  );


  // =======================================================
  // CLOSE AFTER NAVIGATION
  // =======================================================

  useEffect(
    () => {
      setMoreOpen(
        false
      );
    },
    [
      location.pathname,
    ]
  );


  // =======================================================
  // BODY LOCK
  // =======================================================

  useEffect(
    () => {
      if (
        moreOpen
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
      moreOpen,
    ]
  );


  // =======================================================
  // ESCAPE
  // =======================================================

  useEffect(
    () => {
      if (
        !moreOpen
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
            setMoreOpen(
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
      moreOpen,
    ]
  );


  // =======================================================
  // MORE ROUTE ACTIVE
  // =======================================================

  const moreActive =
    [
      "/app/subjects",
      "/app/notes",
      "/app/calendar",
      "/app/progress",
      "/app/settings",
    ].some(
      (
        path
      ) =>
        location.pathname.startsWith(
          path
        )
    );


  // =======================================================
  // UI
  // =======================================================

  return (
    <>

      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
      >

        <div className="mobile-bottom-nav-inner">

          {navItems.map(
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
                  className={({
                    isActive,
                  }) =>
                    [
                      "mobile-bottom-nav-item",

                      item.primary
                        ? "mobile-bottom-nav-focus"
                        : "",

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

                  <span className="mobile-bottom-nav-icon">

                    <Icon
                      size={
                        item.primary
                          ? 24
                          : 21
                      }
                      strokeWidth={1.9}
                    />

                  </span>


                  <span className="mobile-bottom-nav-label">
                    {item.label}
                  </span>

                </NavLink>
              );
            }
          )}


          {/* MORE */}

          <button
            type="button"
            className={[
              "mobile-bottom-nav-item",

              moreOpen ||
              moreActive
                ? "is-active"
                : "",
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )}
            onClick={() =>
              setMoreOpen(
                (
                  current
                ) =>
                  !current
              )
            }
            aria-label="Open more navigation"
            aria-expanded={
              moreOpen
            }
          >

            <span className="mobile-bottom-nav-icon">

              <MoreHorizontal
                size={21}
                strokeWidth={1.9}
              />

            </span>


            <span className="mobile-bottom-nav-label">
              More
            </span>

          </button>

        </div>

      </nav>


      <MobileMoreSheet
        open={
          moreOpen
        }
        onClose={() =>
          setMoreOpen(
            false
          )
        }
      />

    </>
  );
}


export default MobileBottomNav;