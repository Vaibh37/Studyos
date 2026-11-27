import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  Timer,
  Trophy,
} from "../icons";

import Reveal from "./Reveal";

const nodes = [
  { label: "Subject", icon: BookOpen, className: "node-subject" },
  { label: "Tasks", icon: CheckSquare, className: "node-tasks" },
  { label: "Notes", icon: FileText, className: "node-notes" },
  { label: "Focus", icon: Timer, className: "node-focus" },
  { label: "Calendar", icon: CalendarDays, className: "node-calendar" },
  { label: "Progress", icon: BarChart3, className: "node-progress" },
  { label: "XP / Leaderboard", icon: Trophy, className: "node-xp" },
];

function ConnectedSystem() {
  return (
    <section className="marketing-connected marketing-section" aria-labelledby="connected-title">
      <div className="marketing-shell marketing-connected-grid">
        <Reveal className="marketing-connected-copy">
          <h2 id="connected-title">Keep your work connected.</h2>
          <p>
            Tasks, notes and focus sessions can belong to the same subject.
            Deadlines appear in your calendar, and your recorded study sessions
            contribute to your progress history.
          </p>

        </Reveal>

        <Reveal className="marketing-system-map" aria-label="Diagram showing connected StudyOS features">
          <svg className="marketing-system-lines" viewBox="0 0 760 520" aria-hidden="true">
            <path d="M380 95 C290 130 205 160 160 225" />
            <path d="M380 95 C335 150 325 190 320 235" />
            <path d="M380 95 C450 145 520 175 590 225" />
            <path d="M160 275 C215 325 280 330 340 365" />
            <path d="M320 285 C335 325 345 340 360 365" />
            <path d="M590 275 C525 325 450 340 400 365" />
            <path d="M380 410 C380 430 380 445 380 462" />
          </svg>

          {nodes.map(({ label, icon: Icon, className }) => (
            <div key={label} className={`marketing-system-node ${className}`}>
              <span>
                <Icon size={18} />
              </span>
              <strong>{label}</strong>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export default ConnectedSystem;

