import { Link } from "react-router";

import GithubMark from "./GithubMark";

const copyrightYear = new Date().getFullYear();

const columns = [
  {
    title: "Product",
    links: [
      ["Overview", "/#overview"],
      ["Study Planner", "/study-planner"],
      ["Focus Timer", "/focus-timer"],
      ["Study Rooms", "/help#study-rooms"],
      ["Study Groups", "/study-groups"],
      ["Notes", "/notes"],
      ["Progress Tracking", "/progress"],
      ["Leaderboard", "/#leaderboard"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Documentation", "https://github.com/Vaibh37/Studyos#local-development"],
      ["Changelog", "/changelog"],
      ["Roadmap", "https://github.com/Vaibh37/Studyos#roadmap"],
      ["GitHub", "https://github.com/Vaibh37/Studyos"],
      ["Getting Started", "/start"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Help Center", "/help"],
      ["Contact", "/contact"],
      ["Email Support", "mailto:devvaibhav37@gmail.com?subject=StudyOS%20Support"],
      ["Report a Bug", "https://github.com/Vaibh37/Studyos/issues/new"],
      ["Request a Feature", "mailto:devvaibhav37@gmail.com?subject=StudyOS%20Feature%20Request"],
      ["Report Abuse", "mailto:devvaibhav37@gmail.com?subject=StudyOS%20Abuse%20Report"],
      ["System Status", "/status"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy Policy", "/privacy"],
      ["Terms & Conditions", "/terms"],
      ["Cookie & Analytics Preferences", "/privacy#analytics-preferences"],
      ["Open-source License", "https://github.com/Vaibh37/Studyos/blob/main/LICENSE"],
    ],
  },
];

const clientRoutes = new Set(["/help", "/changelog", "/contact", "/status", "/privacy", "/terms"]);

function FooterLink({ label, href }) {
  if (clientRoutes.has(href.split("#")[0])) return <Link to={href}>{label}</Link>;
  const external = href.startsWith("https://");
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{label}</a>;
}

function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-shell">
        <div className="marketing-footer-grid">
          <div className="marketing-footer-brand">
            <Link className="marketing-brand" to="/">
              <span className="marketing-brand-mark">S</span>
              <span>StudyOS</span>
            </Link>
            <p>A connected workspace to plan, focus, track progress and study together.</p>
          </div>

          {columns.map(({ title, links }) => (
            <nav className="marketing-footer-column" aria-label={title} key={title}>
              <h2>{title}</h2>
              {links.map(([label, href]) => <FooterLink key={label} label={label} href={href} />)}
            </nav>
          ))}
        </div>

        <div className="marketing-footer-bottom">
          <span>© {copyrightYear} StudyOS</span>
          <span>Built by Vaibh37</span>
          <a href="https://github.com/Vaibh37/Studyos" target="_blank" rel="noreferrer" aria-label="StudyOS GitHub repository">
            <GithubMark size={17} />
          </a>
        </div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
