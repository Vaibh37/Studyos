import MarketingFooter from "./MarketingFooter";
import MarketingNav from "./MarketingNav";

function PublicPageShell({ eyebrow, title, intro, children }) {
  return (
    <div className="marketing-page marketing-document-page">
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

