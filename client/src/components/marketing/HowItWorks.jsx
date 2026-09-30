import Reveal from "./Reveal";

const steps = [
  ["01", "Organize", "Create subjects, tasks, notes and deadlines."],
  ["02", "Focus", "Start a timed study session linked to what you are working on."],
  ["03", "Track", "StudyOS records completed work and Focus activity as you use it."],
  ["04", "Improve", "Review Focus trends, consistency, XP and progress."],
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="marketing-how marketing-section" aria-labelledby="how-title">
      <div className="marketing-shell">
        <Reveal className="marketing-section-heading">
          <span className="marketing-kicker">How it works</span>
          <h2 id="how-title">Less setup. More studying.</h2>
        </Reveal>

        <Reveal className="marketing-how-grid">
          {steps.map(([number, title, copy]) => (
            <article key={number} className="marketing-how-step">
              <div className="marketing-how-number">{number}</div>
              <div className="marketing-how-line" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export default HowItWorks;

