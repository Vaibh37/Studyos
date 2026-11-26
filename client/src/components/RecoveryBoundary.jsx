import { Component, useEffect, useRef } from "react";
import { AlertCircle, RefreshCw } from "./icons";
import { isModuleLoadFailure } from "../services/deadline";
import "./RecoveryBoundary.css";

export function RecoveryPanel({ error, scope = "app", onRetry, authFailure = false }) {
  const title = useRef(null);
  const assetFailure = isModuleLoadFailure(error);
  const route = scope === "route";
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, []);
  return (
    <section className={`recovery-panel${route ? " recovery-panel-route" : ""}`} aria-labelledby={`recovery-${scope}-heading`}>
      <div className="recovery-copy">
        <div className="recovery-icon" aria-hidden="true"><AlertCircle size={24} /></div>
        <h1 ref={title} tabIndex={-1} id={`recovery-${scope}-heading`}>{authFailure
          ? "Couldn’t restore your session"
          : assetFailure ? "This page needs to reload"
          : route ? "This page couldn’t open" : "StudyOS couldn’t start"}</h1>
        <p>{offline
          ? "You’re offline. Reconnect and try again."
          : authFailure ? "Your sign-in could not be verified yet. Reload to try again; we won’t sign you out or clear your data."
          : assetFailure ? "The page assets didn’t finish loading. Reload to get the latest version of StudyOS."
          : "Something unexpected happened. Try again without clearing your saved study data."}</p>
        <div className="recovery-actions">
          {onRetry && !assetFailure && !authFailure
            ? <button type="button" className="recovery-primary" onClick={onRetry}><RefreshCw size={16} aria-hidden="true" /> Try again</button>
            : null}
          <button type="button" className={onRetry && !assetFailure && !authFailure ? "recovery-secondary" : "recovery-primary"}
            onClick={() => window.location.reload()}>
            {onRetry && !assetFailure && !authFailure ? null : <RefreshCw size={16} aria-hidden="true" />}
            Reload StudyOS
          </button>
        </div>
        {route && <p className="recovery-hint">You can also open another page from navigation.</p>}
      </div>
    </section>
  );
}

export default class RecoveryBoundary extends Component {
  state = { error: null, failed: false, attempt: 0 };
  static getDerivedStateFromError(error) { return { error, failed: true }; }
  componentDidCatch(error) {
    // Log a category, not study records, tokens, URLs, or exception payloads.
    console.error("StudyOS recovered a UI failure:", isModuleLoadFailure(error) ? "page-assets" : "render");
  }
  retry = () => {
    this.setState(previous => ({ error: null, failed: false, attempt: previous.attempt + 1 }));
  };
  render() {
    if (this.state.failed) {
      if (this.props.silent) return null;
      if (this.props.fallback) return this.props.fallback(this.state.error, this.retry);
      return <RecoveryPanel error={this.state.error} scope={this.props.scope} onRetry={this.retry} />;
    }
    return <RecoveryAttempt key={this.state.attempt}>{this.props.children}</RecoveryAttempt>;
  }
}

function RecoveryAttempt({ children }) { return children; }
