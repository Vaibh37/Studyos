import { useLocation } from "react-router";

import Seo from "../Seo";
import MarketingFooter from "./MarketingFooter";
import MarketingNav from "./MarketingNav";

function PublicPageShell({
  eyebrow,
  title,
  intro,
  children,
}) {
  const location =
    useLocation();

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
        path={location.pathname}
      />

      <MarketingNav solid />

      <main className="marketing-document-main">
        <div className="marketing-shell marketing-document-shell">
          <header className="marketing-document-header">
            <span className="marketing-kicker">{eyebrow}</span>
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
