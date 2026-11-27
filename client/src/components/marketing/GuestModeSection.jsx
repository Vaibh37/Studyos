import { useState } from "react";
import { Cloud, HardDrive } from "../icons";
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
            <h2 id="guest-title">Study without an account.</h2>
            <p>
              Try the workspace immediately. In Guest Mode, your study data
              stays in this browser.
            </p>

            <div className="marketing-guest-actions">
              <button
                type="button"
                className="marketing-button marketing-button-primary marketing-button-large"
                onClick={startGuest}
                disabled={working}
              >
                {working ? "Opening StudyOS…" : mode === "none" ? "Try as guest" : "Open StudyOS"}
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
                <li>No signup</li>
                <li>Saved in this browser</li>
                <li>No cloud account</li>
                <li>Immediate access</li>
              </ul>
            </article>

            <article>
              <span className="marketing-mode-icon"><Cloud size={19} /></span>
              <h3>Account Mode</h3>
              <ul>
                <li>Account sign-in</li>
                <li>Cloud-backed study data</li>
                <li>Long-term account history</li>
                <li>Leaderboard access</li>
              </ul>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default GuestModeSection;

