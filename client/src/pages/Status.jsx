import { useEffect, useState } from "react";
import { Link } from "react-router";
import "../styles/marketing.css";
import PublicPageShell from "../components/marketing/PublicPageShell";
import { checkPublicStatus, formatProcessUptime, MONITOR_RUNS_URL, readMonitorHistory } from "../services/publicStatus";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const serviceRows = [
  ["api", "Application API", "Public API response"],
  ["studyDatabase", "Study data", "Database readiness"],
  ["socialDatabase", "Groups & collaboration", "Database readiness"],
  ["authConfiguration", "Authentication", "Server configuration only"],
];
const statusLabels = { ready: "Ready", unavailable: "Unavailable", unknown: "Not confirmed" };
const historyLabels = { passed: "Passed", failed: "Check failed", inconclusive: "Inconclusive" };
const displayDate = value => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function Status() {
  const [refresh, setRefresh] = useState(0);
  const [live, setLive] = useState({ loading: true, data: null });
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [history, setHistory] = useState({ loading: false, data: null, error: false });

  useEffect(() => {
    const controller = new AbortController();
    checkPublicStatus(apiUrl, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setLive({ loading: false, data });
    });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!historyRefresh) return;
    const controller = new AbortController();
    readMonitorHistory({ signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setHistory({ loading: false, data, error: false });
    }, () => {
      if (!controller.signal.aborted) setHistory({ loading: false, data: null, error: true });
    });
    return () => controller.abort();
  }, [historyRefresh]);

  function refreshLive() {
    setLive({ loading: true, data: null });
    setRefresh(value => value + 1);
  }

  function loadHistory() {
    setHistory({ loading: true, data: null, error: false });
    setHistoryRefresh(value => value + 1);
  }

  return (
    <PublicPageShell title="System Status" intro="Live service readiness and recent independent production monitoring.">
      <section>
        <div className="public-status-heading">
          <h2>Service checks</h2>
          <button type="button" className="marketing-button marketing-button-secondary public-status-button" onClick={refreshLive} disabled={live.loading}>Refresh</button>
        </div>
        <p role="status">
          {live.loading ? "Checking the API. An idle backend may take up to 90 seconds to wake." :
            "Last checked: " + displayDate(live.data.checkedAt)}
        </p>
        <dl className="public-status-list">
          {serviceRows.map(([key, label, detail]) => (
            <div className="public-status-row" key={key}>
              <dt>{label}<small>{detail}</small></dt>
              <dd>{live.loading ? "Checking…" : statusLabels[live.data[key]]}</dd>
            </div>
          ))}
          <div className="public-status-row">
            <dt>API process uptime<small>Since the current backend process started</small></dt>
            <dd>{live.loading ? "Checking…" : formatProcessUptime(live.data.uptimeSeconds)}</dd>
          </div>
        </dl>
        <p className="public-page-note">These are read-only checks from your current browser. Authentication readiness does not verify a real sign-in. Process uptime resets on restart; it is not an availability percentage. File storage and every individual feature are not measured here.</p>
        {live.data?.api === "unknown" && <p>The API could not be confirmed from this browser. Check your connection and try again; an unknown result does not prove a service-wide outage.</p>}
      </section>

      <section>
        <div className="public-status-heading">
          <h2>Recent monitoring checks</h2>
          <button type="button" className="marketing-button marketing-button-secondary public-status-button" onClick={loadHistory} disabled={history.loading}>
            {history.data ? "Refresh history" : "Load history"}
          </button>
        </div>
        <p>Scheduled production checks run through GitHub Actions and probe the website, API, database readiness and selected authorization boundaries. Loading history requests the latest completed scheduled runs directly from GitHub.</p>
        {history.loading && <p role="status">Loading monitoring history…</p>}
        {history.error && <p role="status">History could not be loaded from GitHub. The full monitoring log is linked below.</p>}
        {history.data && (history.data.length ? (
          <ol className="public-monitor-list" aria-label="Completed scheduled production checks">
            {history.data.map(run => (
              <li key={run.id}>
                <a href={run.url} target="_blank" rel="noreferrer"><time dateTime={run.date}>{displayDate(run.date)}</time></a>
                <span>{historyLabels[run.result]}</span>
              </li>
            ))}
          </ol>
        ) : <p role="status">No completed scheduled runs were returned.</p>)}
        <p><a href={MONITOR_RUNS_URL} target="_blank" rel="noreferrer">View full production monitor history</a></p>
        <p className="public-page-note">Scheduled checks are samples, not continuous monitoring; runner delays may leave gaps. A failed check needs investigation and is not automatically a confirmed incident.</p>
      </section>

      <section>
        <h2>Incidents & support</h2>
        <p>StudyOS does not yet maintain a separate public incident archive. Use the production monitor run details for recorded check failures and contact support if you experience an issue.</p>
        <p><Link to="/contact">Contact support</Link> · <Link to="/help">Troubleshooting guide</Link></p>
      </section>
    </PublicPageShell>
  );
}
