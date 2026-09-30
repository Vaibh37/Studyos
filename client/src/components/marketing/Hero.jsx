import { useEffect, useRef } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { useAuth } from "../../context/AuthContext";
import GithubMark from "./GithubMark";

function Hero() {
  const { mode } = useAuth();
  const visualRef = useRef(null);
  const ctaTo = mode === "none" ? "/get-started" : "/app";
  const ctaLabel = mode === "none" ? "Get started" : "Open StudyOS";

  useEffect(() => {
    const visual = visualRef.current;

    if (!visual) {
      return undefined;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (reducedMotion.matches) {
      return undefined;
    }

    let frame = 0;

    const updateTilt = (event) => {
      const rect = visual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        visual.style.setProperty("--hero-tilt-x", `${x * 3.5}deg`);
        visual.style.setProperty("--hero-tilt-y", `${y * -2.5}deg`);
      });
    };

    const resetTilt = () => {
      visual.style.setProperty("--hero-tilt-x", "0deg");
      visual.style.setProperty("--hero-tilt-y", "0deg");
    };

    visual.addEventListener("pointermove", updateTilt);
    visual.addEventListener("pointerleave", resetTilt);

    return () => {
      window.cancelAnimationFrame(frame);
      visual.removeEventListener("pointermove", updateTilt);
      visual.removeEventListener("pointerleave", resetTilt);
    };
  }, []);

  return (
    <section id="overview" className="marketing-hero" aria-labelledby="hero-title">
      <div className="marketing-shell marketing-hero-inner">
        <div className="marketing-hero-copy">
          <div className="marketing-eyebrow marketing-hero-enter marketing-hero-enter-1">
            <span className="marketing-eyebrow-dot" />
            Your study system
          </div>

          <h1 id="hero-title" className="marketing-hero-title">
            <span className="marketing-hero-line marketing-hero-enter marketing-hero-enter-2">
              Study without
            </span>
            <span className="marketing-hero-line marketing-hero-enter marketing-hero-enter-3">
              the chaos.
            </span>
          </h1>

          <p className="marketing-hero-subtitle marketing-hero-enter marketing-hero-enter-4">
            Plan your work, focus without distractions, track your progress, and
            see where your study time actually goes.
          </p>

          <div className="marketing-hero-actions marketing-hero-enter marketing-hero-enter-5">
            <Link className="marketing-button marketing-button-primary marketing-button-large" to={ctaTo}>
              {ctaLabel}
              <ArrowRight size={17} />
            </Link>

            <a className="marketing-button marketing-button-secondary marketing-button-large" href="#features">
              Explore StudyOS
            </a>

            <a
              className="marketing-button marketing-button-secondary marketing-button-large marketing-github-button"
              href="https://github.com/Vaibh37/Studyos"
              target="_blank"
              rel="noreferrer"
              aria-label="View StudyOS on GitHub"
            >
              <GithubMark size={17} />
              GitHub
            </a>
          </div>
        </div>

        <div ref={visualRef} className="marketing-hero-visual marketing-hero-enter marketing-hero-enter-6">
          <div className="marketing-hero-orbit marketing-hero-orbit-left" aria-hidden="true">
            <span>Focus</span>
            <strong>90 min</strong>
          </div>

          <div className="marketing-hero-orbit marketing-hero-orbit-right" aria-hidden="true">
            <span>Streak</span>
            <strong>Consistency</strong>
          </div>

          <div className="marketing-product-frame marketing-product-frame-hero">
            <div className="marketing-product-frame-bar" aria-hidden="true">
              <span />
              <span />
              <span />
              <small>StudyOS / Dashboard</small>
            </div>

            <img
              src="/studyos-screenshots/dashboard.png"
              alt="StudyOS Dashboard showing daily study progress, focus activity, tasks, XP and upcoming work"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>

        <a className="marketing-scroll-cue" href="#story" aria-label="Continue to product story">
          <span>See the system</span>
          <ArrowDown size={15} />
        </a>
      </div>
    </section>
  );
}

export default Hero;
