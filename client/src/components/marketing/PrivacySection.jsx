import { EyeOff, Trophy } from "lucide-react";
import { Link } from "react-router";

import Reveal from "./Reveal";

function PrivacySection() {
  return (
    <section className="marketing-privacy marketing-section" aria-labelledby="privacy-title">
      <div className="marketing-shell">
        <Reveal className="marketing-privacy-grid">
          <div className="marketing-privacy-copy">
            <span className="marketing-kicker">Opt-in competition</span>
            <h2 id="privacy-title">Competition without exposing your work.</h2>
            <p>
              StudyOS keeps the leaderboard separate from the private content
              you use to study. Participation is optional.
            </p>
            <Link className="marketing-text-link" to="/privacy">Read the privacy policy →</Link>
          </div>

          <div className="marketing-privacy-cards">
            <article>
              <span className="marketing-mode-icon"><EyeOff size={19} /></span>
              <h3>Private study content</h3>
              <p>Tasks, notes, subject content, calendar details and email are not published on the leaderboard.</p>
            </article>

            <article>
              <span className="marketing-mode-icon"><Trophy size={19} /></span>
              <h3>Public ranking data</h3>
              <p>The opt-in leaderboard can show a public display name, ranking and aggregate StudyOS activity used for ranking.</p>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default PrivacySection;

