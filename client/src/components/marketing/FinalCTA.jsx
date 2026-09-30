import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { useAuth } from "../../context/AuthContext";
import Reveal from "./Reveal";

function FinalCTA() {
  const { mode } = useAuth();
  const ctaTo = mode === "none" ? "/get-started" : "/app";
  const ctaLabel = mode === "none" ? "Get started" : "Open StudyOS";

  return (
    <section className="marketing-final" aria-labelledby="final-title">
      <div className="marketing-final-bg" aria-hidden="true">
        <img src="/studyos-screenshots/dashboard.png" alt="" loading="lazy" decoding="async" />
      </div>

      <div className="marketing-shell">
        <Reveal className="marketing-final-content">
          <span className="marketing-kicker">StudyOS</span>
          <h2 id="final-title">Ready to study with less chaos?</h2>
          <p>Build a system you can actually stick with.</p>

          <div className="marketing-final-actions">
            <Link className="marketing-button marketing-button-primary marketing-button-large" to={ctaTo}>
              {ctaLabel}
              <ArrowRight size={17} />
            </Link>

            {mode === "none" && (
              <Link className="marketing-final-secondary" to="/get-started">Guest Mode available</Link>
            )}
          </div>

          <span className="marketing-final-note">Free to use · Guest Mode available</span>
        </Reveal>
      </div>
    </section>
  );
}

export default FinalCTA;
