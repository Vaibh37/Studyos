import { Link } from "react-router";

import { useAuth } from "../../context/AuthContext";
import Reveal from "./Reveal";

function FinalCTA() {
  const { mode } = useAuth();
  const ctaTo = mode === "none" ? "/get-started" : "/app";
  const ctaLabel = mode === "none" ? "Get started" : "Open StudyOS";

  return (
    <section className="marketing-final" aria-labelledby="final-title">
      <div className="marketing-shell">
        <Reveal className="marketing-final-content">
          <h2 id="final-title">Start studying with StudyOS.</h2>
          <p>Free to use, with or without an account.</p>

          <div className="marketing-final-actions">
            <Link className="marketing-button marketing-button-primary marketing-button-large" to={ctaTo}>
              {ctaLabel}
            </Link>
          </div>

        </Reveal>
      </div>
    </section>
  );
}

export default FinalCTA;
