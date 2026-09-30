import { useEffect, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Link, useLocation } from "react-router";

import { useAuth } from "../../context/AuthContext";
import GithubMark from "./GithubMark";

const navItems = [
  ["Overview", "overview"],
  ["Features", "features"],
  ["How it works", "how-it-works"],
  ["Leaderboard", "leaderboard"],
];

function MarketingNav({ solid = false }) {
  const { mode } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(solid);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("studyos_theme") === "light" ? "light" : "dark"
  );


  useEffect(() => {
    const isLight = theme === "light";

    document.body.classList.toggle("light-theme", isLight);
    document.documentElement.classList.toggle("light-theme", isLight);
    localStorage.setItem("studyos_theme", theme);

    window.dispatchEvent(new Event("studyos-theme-updated"));
  }, [theme]);

  useEffect(() => {
    if (solid) {
      setScrolled(true);
      return undefined;
    }

    const sentinel = document.getElementById("marketing-top-sentinel");

    if (!sentinel || !("IntersectionObserver" in window)) {
      setScrolled(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [solid]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    const media = window.matchMedia("(min-width: 821px)");
    const handleMediaChange = () => {
      if (media.matches) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    media.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      media.removeEventListener("change", handleMediaChange);
    };
  }, [menuOpen]);

  const ctaLabel = mode === "none" ? "Get started" : "Open StudyOS";
  const ctaTo = mode === "none" ? "/get-started" : "/app";
  const sectionHref = (section) =>
    location.pathname === "/" ? `#${section}` : `/#${section}`;

  return (
    <header className={`marketing-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="marketing-nav-inner">
        <Link className="marketing-brand" to="/" aria-label="StudyOS home">
          <span className="marketing-brand-mark">S</span>
          <span>StudyOS</span>
        </Link>

        <nav className="marketing-nav-links" aria-label="Primary navigation">
          {navItems.map(([label, section]) => (
            <a key={section} href={sectionHref(section)}>
              {label}
            </a>
          ))}
        </nav>

        <div className="marketing-nav-actions">
          <button
            type="button"
            className="marketing-theme-toggle"
            aria-label={theme === "light" ? "Use dark theme" : "Use light theme"}
            title={theme === "light" ? "Dark theme" : "Light theme"}
            onClick={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <a
            className="marketing-icon-link"
            href="https://github.com/Vaibh37/Studyos"
            target="_blank"
            rel="noreferrer"
            aria-label="StudyOS on GitHub"
          >
            <GithubMark size={18} />
          </a>

          <Link className="marketing-button marketing-button-primary" to={ctaTo}>
            {ctaLabel}
          </Link>

          <button
            type="button"
            className="marketing-mobile-menu-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="marketing-mobile-menu"
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      <div
        id="marketing-mobile-menu"
        className={`marketing-mobile-menu ${menuOpen ? "is-open" : ""}`}
      >
        {navItems.map(([label, section]) => (
          <a key={section} href={sectionHref(section)} onClick={() => setMenuOpen(false)}>
            {label}
          </a>
        ))}

        <a
          href="https://github.com/Vaibh37/Studyos"
          target="_blank"
          rel="noreferrer"
          onClick={() => setMenuOpen(false)}
        >
          GitHub
        </a>

        <Link
          className="marketing-mobile-cta"
          to={ctaTo}
          onClick={() => setMenuOpen(false)}
        >
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}

export default MarketingNav;
