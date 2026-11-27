import { useEffect } from "react";
import { Link } from "react-router";
import PublicPageShell from "../components/marketing/PublicPageShell";
import "../styles/marketing.css";

export default function NotFound({ workspace = false }) {
  useEffect(() => {
    if (workspace) document.title = "Page not found — StudyOS";
  }, [workspace]);

  if (workspace) return (
    <section className="ws-empty" aria-labelledby="missing-page-title">
      <h1 id="missing-page-title" className="ws-empty-title">Page not found</h1>
      <p className="ws-empty-description">This workspace page does not exist or has been moved. Your study data is not affected.</p>
      <Link className="ws-missing-link" to="/app/dashboard">Back to dashboard</Link>
    </section>
  );

  return (
    <PublicPageShell title="Page not found" intro="This link may be incorrect or the page may have moved." noindex>
      <section>
        <h2>Let’s get you back on track.</h2>
        <p>You can return to StudyOS or contact us if a link is broken.</p>
        <p><Link to="/">Return to StudyOS</Link></p>
        <p><Link to="/contact">Report a broken link</Link></p>
      </section>
    </PublicPageShell>
  );
}
