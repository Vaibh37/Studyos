import { Link } from "react-router";

import GithubMark from "./GithubMark";

const productLinks = [
  ["Overview", "/#overview"],
  ["Features", "/#features"],
  ["Focus", "/#features"],
  ["Progress", "/#features"],
  ["Leaderboard", "/#leaderboard"],
];

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
            <p>A connected workspace for planning, Focus, progress and optional study competition.</p>
          </div>

          <div className="marketing-footer-column">
            <strong>Product</strong>
            {productLinks.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
          </div>

          <div className="marketing-footer-column">
            <strong>Resources</strong>
            <a href="https://github.com/Vaibh37/Studyos" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://github.com/Vaibh37/Studyos#roadmap" target="_blank" rel="noreferrer">Roadmap</a>
          </div>

          <div className="marketing-footer-column">
            <strong>Support</strong>
            <Link to="/contact">Contact</Link>
            <a href="mailto:devvaibhav37@gmail.com?subject=StudyOS%20Feedback">Feedback</a>
            <a href="mailto:devvaibhav37@gmail.com">devvaibhav37@gmail.com</a>
          </div>

          <div className="marketing-footer-column">
            <strong>Legal</strong>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms & Conditions</Link>
          </div>
        </div>

        <div className="marketing-footer-bottom">
          <span>© 2026 StudyOS</span>
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
