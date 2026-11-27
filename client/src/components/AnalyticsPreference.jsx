import { useState } from "react";
import { setBrowserAnalyticsAllowed } from "../services/analyticsPrivacy";
import useAnalyticsPreference from "../hooks/useAnalyticsPreference";

export default function AnalyticsPreference() {
  const enabled = useAnalyticsPreference();
  const [notice, setNotice] = useState("");
  const privacyControl = typeof navigator !== "undefined" && navigator.globalPrivacyControl === true;

  function choose(allow) {
    if (!setBrowserAnalyticsAllowed(allow)) {
      setNotice("Optional analytics are disabled for this session, but the preference could not be saved. Try again or clear the site’s stored preferences.");
      return;
    }
    setNotice(allow && !privacyControl ? "Optional analytics enabled." : "Optional analytics disabled.");
  }

  return (
    <div className="analytics-preference">
      <p>Optional public-site analytics are <strong>{enabled ? "enabled" : "disabled"}</strong> in this browser.</p>
      {privacyControl && <p>Global Privacy Control is active. Optional analytics stay disabled.</p>}
      <div className="analytics-preference-actions">
        <button type="button" className="marketing-button marketing-button-secondary"
          disabled={enabled || privacyControl} onClick={() => choose(true)}>Enable analytics</button>
        <button type="button" className="marketing-button marketing-button-secondary"
          onClick={() => choose(false)}>{enabled ? "Disable analytics" : "Keep analytics off"}</button>
      </div>
      <p role="status">{notice}</p>
    </div>
  );
}
