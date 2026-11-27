import { Link } from "react-router";

import { useAuth } from "../../context/AuthContext";

function Hero() {
  const { mode } = useAuth();
  const ctaTo = mode === "none" ? "/get-started" : "/app";
  const ctaLabel = mode === "none" ? "Get started" : "Open StudyOS";

  return (
    <section id="overview" className="marketing-hero" aria-labelledby="hero-title">
      <div className="marketing-shell marketing-hero-inner">
        <div className="marketing-hero-copy">
          <h1 id="hero-title" className="marketing-hero-title">
            Your study workspace.
          </h1>

          <p className="marketing-hero-subtitle">
            Organize tasks and notes, run focus sessions, and track your study
            time in one place.
          </p>

          <div className="marketing-hero-actions">
            <Link className="marketing-button marketing-button-primary marketing-button-large" to={ctaTo}>
              {ctaLabel}
            </Link>

            <a className="marketing-button marketing-button-secondary marketing-button-large" href="#features">
              Explore features
            </a>
          </div>
        </div>

        <div className="marketing-hero-visual">
          <div className="marketing-product-frame">
            <img
              src="/studyos-screenshots/dashboard.webp"
              alt="StudyOS dashboard showing daily study progress, focus activity, tasks, XP and upcoming work"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
