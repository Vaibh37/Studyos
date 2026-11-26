import { preloadWorkspacePath } from "../../services/routePreload";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
  CheckSquare,
  LayoutDashboard,
  MoreHorizontal,
  Timer,
  Trophy,
} from "../icons";
import MobileMoreSheet, { moreItems } from "./MobileMoreSheet";
import "../../styles/mobile/mobile-more.css";

const navItems = [
  { label: "Home", to: "/app/dashboard", icon: LayoutDashboard },
  { label: "Tasks", to: "/app/tasks", icon: CheckSquare },
  { label: "Focus", to: "/app/focus", icon: Timer },
  { label: "Rank", to: "/app/leaderboard", icon: Trophy },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => {
      if (!media.matches) setMoreOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const moreActive = moreItems.some(({ to }) =>
    pathname === to || pathname.startsWith(to + "/")
  );

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <div className="mobile-bottom-nav-inner">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onPointerEnter={() => preloadWorkspacePath(to)}
              onFocus={() => preloadWorkspacePath(to)}
              onPointerDown={() => preloadWorkspacePath(to)}
              className={({ isActive }) =>
                `mobile-bottom-nav-item${isActive ? " is-active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="mobile-bottom-nav-icon">
                    <Icon size={23} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
                  </span>
                  <span className="mobile-bottom-nav-label">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            className={`mobile-bottom-nav-item${moreOpen || moreActive ? " is-active" : ""}`}
            onClick={() => setMoreOpen(true)}
            aria-label="More navigation"
            aria-haspopup="dialog"
            aria-controls={moreOpen ? "mobile-more-sheet" : undefined}
            aria-expanded={moreOpen}
            aria-current={moreActive ? "true" : undefined}
          >
            <span className="mobile-bottom-nav-icon">
              <MoreHorizontal size={24} weight="bold" aria-hidden="true" />
            </span>
            <span className="mobile-bottom-nav-label">More</span>
          </button>
        </div>
      </nav>
      {moreOpen && <MobileMoreSheet onClose={() => setMoreOpen(false)} />}
    </>
  );
}
