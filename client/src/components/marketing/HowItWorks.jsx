import Reveal from "./Reveal";

const steps = [
  ["01", "Create a subject", "Add the course or topic you want to study."],
  ["02", "Add a task", "Choose the next piece of work and give it a deadline if needed."],
  ["03", "Start a session", "Set a focus duration and work on your subject."],
  ["04", "Review your day", "Check completed tasks and recorded focus time."],
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="marketing-how marketing-section" aria-labelledby="how-title">
      <div className="marketing-shell">
        <Reveal className="marketing-section-heading">
          <h2 id="how-title">Start your first study session.</h2>
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

