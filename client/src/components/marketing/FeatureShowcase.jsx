import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

import Reveal from "./Reveal";

const features = [
  {
    eyebrow: "Tasks",
    title: "Plan what matters.",
    copy: "Prioritize work, link tasks to subjects, and keep deadlines visible without turning planning into another project.",
    image: "/studyos-screenshots/tasks.png",
    alt: "StudyOS Tasks page",
    side: "right",
  },
  {
    eyebrow: "Focus",
    title: "Turn plans into real work.",
    copy: "Start subject-linked sessions with presets or custom durations. Pause, resume and keep the history of what you actually studied.",
    image: "/studyos-screenshots/focus.png",
    alt: "StudyOS Focus timer page",
    side: "left",
  },
  {
    eyebrow: "Progress",
    title: "Understand your consistency.",
    copy: "Review Focus time, streaks, weekly activity and subject distribution instead of guessing whether the week was productive.",
    image: "/studyos-screenshots/progress.png",
    alt: "StudyOS Progress analytics page",
    side: "right",
  },
  {
    eyebrow: "Leaderboard",
    title: "Compete if you want.",
    copy: "The weekly leaderboard is optional. When enabled, StudyOS turns eligible study activity into a visible ranking without publishing your private study content.",
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
          <span className="marketing-kicker">The actual product</span>
          <h2 id="features-title">Built to be used every day.</h2>
          <p>
            No concept mockups here. Every visual below is the current StudyOS
            V2 interface.
          </p>
        </Reveal>

        <div className="marketing-feature-list">
          {features.map((feature, index) => (
            <Reveal
              as="article"
              id={feature.id}
              key={feature.eyebrow}
              className={`marketing-feature-row ${feature.side === "left" ? "visual-left" : ""}`}
            >
              <div className="marketing-feature-copy">
                <span className="marketing-feature-index">0{index + 1}</span>
                <span className="marketing-kicker">{feature.eyebrow}</span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
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
              </div>
            </article>
          ))}
        </Reveal>

        <Reveal className="marketing-feature-link-row">
          <Link className="marketing-text-link" to="/get-started">
            Explore StudyOS yourself
            <ArrowUpRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export default FeatureShowcase;

