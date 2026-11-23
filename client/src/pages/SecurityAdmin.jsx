import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import "../styles/security-admin.css";

export default function SecurityAdmin() {
  const { mode } = useAuth();
  const [identity, setIdentity] = useState(null);
  const [bans, setBans] = useState([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24");
  const [permanent, setPermanent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refreshBans = useCallback(async () => {
    const data = await apiRequest("/api/security/bans");
    setBans(data.bans || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (mode !== "authenticated") {
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    apiRequest("/api/security/me")
      .then(async (data) => {
        if (cancelled) return;
        setIdentity(data);
        if (data.authorized) {
          const result = await apiRequest("/api/security/bans");
          if (!cancelled) setBans(result.bans || []);
        }
      })
      .catch((error) => {
        if (!cancelled) setNotice(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [mode]);

  async function addBan(event) {
    event.preventDefault();
    if (busy || !identity?.authorized) return;
    if (permanent && !window.confirm("Permanently ban this IP? Shared networks may contain innocent users.")) return;
    setBusy(true);
    setNotice("");
    try {
      await apiRequest("/api/security/bans", {
        method: "POST",
        body: JSON.stringify({
          ip: ip.trim(),
          reason: reason.trim(),
          permanent,
          ...(permanent ? {} : { durationHours: Number(hours) }),
        }),
      });
      await refreshBans();
      setIp("");
      setReason("");
      setNotice("IP ban saved. Existing matching sockets will be disconnected.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBan(targetIp) {
    if (busy || !identity?.authorized) return;
    if (!window.confirm("Unban " + targetIp + "?")) return;
    setBusy(true);
    setNotice("");
    try {
      await apiRequest("/api/security/bans/" + encodeURIComponent(targetIp), {
        method: "DELETE",
      });
      await refreshBans();
      setNotice("IP unbanned.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="security-admin">
      <header className="security-admin__heading">
        <p className="security-admin__eyebrow">STUDYOS / SECURITY</p>
        <h1>IP ban management</h1>
        <p>Private administrator controls. IP bans affect backend API and live connections, not Vercel-hosted static pages.</p>
      </header>
      {mode !== "authenticated" ? (
        <section className="security-admin__panel">
          Sign in with your StudyOS account to access security administration.
        </section>
      ) : loading ? (
        <section className="security-admin__panel">Checking administrator permissions…</section>
      ) : !identity?.authorized ? (
        <section className="security-admin__panel">
          <h2>Access not configured</h2>
          <p>Only the Firebase UID specified in the backend environment variable <code>STUDYOS_SECURITY_ADMIN_UID</code> can manage bans.</p>
          {identity?.uid && (
            <p>Your signed-in Firebase UID: <code>{identity.uid}</code></p>
          )}
          <p>Add your own UID to that Render variable, redeploy, then reload this page. Never use an email address or expose a Firebase token.</p>
        </section>
      ) : (
        <>
          <section className="security-admin__panel">
            <h2>Add an IP ban</h2>
            <form className="security-admin__form" onSubmit={addBan}>
              <label>IPv4 or IPv6 address
                <input required autoComplete="off" maxLength={80} value={ip} onChange={(event) => setIp(event.target.value)} placeholder="203.0.113.42" />
              </label>
              <label>Reason (administrator only)
                <input required minLength={5} maxLength={250} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Confirmed repeated abuse" />
              </label>
              <label>Duration in hours (1–720)
                <input type="number" required={!permanent} disabled={permanent} min="1" max="720" step="1" value={hours} onChange={(event) => setHours(event.target.value)} />
              </label>
              <label className="security-admin__checkbox">
                <input type="checkbox" checked={permanent} onChange={(event) => setPermanent(event.target.checked)} />
                Permanent ban (use only for confirmed abuse)
              </label>
              <button type="submit" disabled={busy}>{busy ? "Saving…" : "Ban IP"}</button>
            </form>
            <p className="security-admin__hint">For ban changes, Firebase requires a fresh sign-in within 15 minutes. Never ban a shared IP without checking the impact.</p>
          </section>
          <section className="security-admin__panel">
            <div className="security-admin__listHeading">
              <h2>Active bans</h2>
              <button type="button" disabled={busy} onClick={() => {
                setNotice("");
                refreshBans().catch((error) => setNotice(error.message));
              }}>Refresh</button>
            </div>
            {bans.length === 0 ? (
              <p>No active IP bans.</p>
            ) : (
              <ul className="security-admin__list">
                {bans.map((ban) => (
                  <li key={ban.ip}>
                    <div>
                      <strong>{ban.ip}</strong>
                      <p>{ban.reason}</p>
                      <small>{ban.expiresAt ? "Expires " + new Date(ban.expiresAt).toLocaleString() : "Permanent"}</small>
                    </div>
                    <button type="button" disabled={busy} onClick={() => removeBan(ban.ip)}>Unban</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {notice && <p className="security-admin__notice" role="status">{notice}</p>}
    </main>
  );
}
