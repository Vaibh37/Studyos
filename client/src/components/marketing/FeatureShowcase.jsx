import { Link } from "react-router";

import Reveal from "./Reveal";

const features = [
  {
    label: "Tasks",
    href: "/study-planner",
    title: "Study planner",
    copy: "Set priorities and due dates, and keep each task linked to the right subject.",
    image: "/studyos-screenshots/tasks.png",
    alt: "StudyOS Tasks page",
    side: "right",
  },
  {
    label: "Focus",
    href: "/focus-timer",
    title: "Focus timer",
    copy: "Use preset or custom durations, pause and resume sessions, and keep a record of your study time.",
    image: "/studyos-screenshots/focus.png",
    alt: "StudyOS Focus timer page",
    side: "left",
  },
  {
    label: "Progress",
    href: "/progress",
    title: "Progress tracking",
    copy: "Review focus time, streaks, weekly activity and time spent on each subject.",
    image: "/studyos-screenshots/progress.png",
    alt: "StudyOS Progress analytics page",
    side: "right",
  },
  {
    label: "Leaderboard",
    title: "Weekly leaderboard",
    copy: "Opt in to compare your eligible study activity with other students. Your private study content stays off the leaderboard.",
    image: "/studyos-screenshots/leaderboard.png",
    alt: "StudyOS weekly leaderboard page",
    side: "left",
    id: "leaderboard",
  },
];

const supporting = [
  {
    label: "Subjects",
    copy: "Keep tasks, notes and Focus history attached to the right study area.",
    image: "/studyos-screenshots/subjects.png",
  },
  {
    label: "Notes",
    href: "/notes",
    copy: "Write, search, pin and organize notes inside the same workspace.",
    image: "/studyos-screenshots/notes.png",
  },
  {
    label: "Calendar",
    copy: "See deadlines, events and Focus history in one monthly view.",
    image: "/studyos-screenshots/calendar.png",
  },
  {
    label: "Settings",
    copy: "Control goals, Focus defaults, privacy, notifications, backups and account preferences.",
    image: "/studyos-screenshots/settings.png",
  },
];

function FeatureShowcase() {
  return (
    <section id="features" className="marketing-features marketing-section" aria-labelledby="features-title">
      <div className="marketing-shell">
        <Reveal className="marketing-section-heading">
          <h2 id="features-title">Tools for everyday study.</h2>
          <p>
            Explore the planner, timer, analytics and the rest of the workspace.
          </p>
        </Reveal>

        <div className="marketing-feature-list">
          {features.map((feature) => (
            <Reveal
              as="article"
              id={feature.id}
              key={feature.label}
              className={`marketing-feature-row ${feature.side === "left" ? "visual-left" : ""}`}
            >
              <div className="marketing-feature-copy">
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
                {feature.href && <a className="marketing-text-link" href={feature.href}>Explore {feature.label.toLowerCase()}</a>}
              </div>

              <div className="marketing-feature-visual">
                <img
                  src={feature.image}
                  alt={feature.alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="marketing-supporting-grid">
          {supporting.map((item) => (
            <article key={item.label} className="marketing-supporting-feature">
              <div className="marketing-supporting-image">
                <img
                  src={item.image}
                  alt={`StudyOS ${item.label} page`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div>
                <h3>{item.label}</h3>
                <p>{item.copy}</p>
                {item.href && <a className="marketing-text-link" href={item.href}>Explore {item.label.toLowerCase()}</a>}
              </div>
            </article>
          ))}
        </Reveal>

        <Reveal className="marketing-feature-link-row">
          <Link className="marketing-text-link" to="/get-started">
            Try the workspace
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export default FeatureShowcase;

