import { useState } from "react";
import { ArrowRight, Check, Cloud, HardDrive } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "../../context/AuthContext";
import Reveal from "./Reveal";

function GuestModeSection() {
  const navigate = useNavigate();
  const { mode, continueAsGuest } = useAuth();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const startGuest = async () => {
    if (working) {
      return;
    }

    if (mode !== "none") {
      navigate("/app");
      return;
    }

    try {
      setWorking(true);
      setError("");
      await continueAsGuest();
      navigate("/app");
    } catch (guestError) {
      console.error("Guest mode failed:", guestError);
      setError("Couldn't start Guest Mode. You can still use Get started instead.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="marketing-guest marketing-section" aria-labelledby="guest-title">
      <div className="marketing-shell">
        <Reveal className="marketing-guest-panel">
          <div className="marketing-guest-copy">
            <span className="marketing-kicker">No account required</span>
            <h2 id="guest-title">Start studying before creating an account.</h2>
            <p>
              Guest Mode opens the real StudyOS app immediately and keeps your
              study data in this browser using IndexedDB.
            </p>

            <div className="marketing-guest-actions">
              <button
                type="button"
                className="marketing-button marketing-button-primary marketing-button-large"
                onClick={startGuest}
                disabled={working}
              >
                {working ? "Opening StudyOS…" : mode === "none" ? "Try as guest" : "Open StudyOS"}
                <ArrowRight size={17} />
              </button>

              {mode === "none" && (
                <Link className="marketing-button marketing-button-secondary marketing-button-large" to="/get-started">
                  Create an account
                </Link>
              )}
            </div>

            {error && <p className="marketing-inline-error" role="alert">{error}</p>}
          </div>

          <div className="marketing-mode-compare">
            <article>
              <span className="marketing-mode-icon"><HardDrive size={19} /></span>
              <h3>Guest Mode</h3>
              <ul>
                <li><Check size={15} /> No signup</li>
                <li><Check size={15} /> IndexedDB persistence</li>
                <li><Check size={15} /> Data stays on this device</li>
                <li><Check size={15} /> Immediate access</li>
              </ul>
            </article>

            <article>
              <span className="marketing-mode-icon"><Cloud size={19} /></span>
              <h3>Account Mode</h3>
              <ul>
                <li><Check size={15} /> Firebase authentication</li>
                <li><Check size={15} /> Cloud-backed app data</li>
                <li><Check size={15} /> Long-term account history</li>
                <li><Check size={15} /> Leaderboard access</li>
              </ul>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default GuestModeSection;

