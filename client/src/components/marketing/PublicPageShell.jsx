import { useEffect } from "react";
import { useLocation } from "react-router";

import Seo from "../Seo";
import MarketingFooter from "./MarketingFooter";
import MarketingNav from "./MarketingNav";

function PublicPageShell({
  eyebrow,
  title,
  intro,
  children,
  noindex = false,
}) {
  const location =
    useLocation();

  // Hash targets in lazy public pages are present only after the component mounts.
  useEffect(() => {
    if (!location.hash) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); }
    catch { return; }
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  const pageTitle =
    `${title} — StudyOS`;

  const description =
    intro ||
    "StudyOS is a student productivity workspace for planning, focus and progress tracking.";

  return (
    <div className="marketing-page marketing-document-page">
      <Seo
        title={pageTitle}
        description={description}
        path={noindex ? "/" : location.pathname}
        noindex={noindex}
      />

      <MarketingNav solid />

      <main className="marketing-document-main">
        <div className="marketing-shell marketing-document-shell">
          <header className="marketing-document-header">
            {eyebrow && <span className="marketing-kicker">{eyebrow}</span>}
            <h1>{title}</h1>
            {intro && <p>{intro}</p>}
          </header>

          <div className="marketing-document-content">{children}</div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

export default PublicPageShell;
