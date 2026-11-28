import { useLayoutEffect, useRef, useState } from "react";
import DialogSurface from "./DialogSurface";
import {
  ArrowLeft, ArrowRight, BarChart3, BookOpen, Check, Cloud, FileText,
  HardDrive, LayoutDashboard, ListChecks, Plus, Timer, UsersRound, Play,
} from "./icons";
import "./WorkspaceOnboarding.css";

const steps = [
  {
    name: "Plan",
    title: "Welcome to StudyOS",
    description: "Give everything you need to study a place of its own.",
    items: [
      [ListChecks, "Plan your tasks", "Set deadlines and work through your list."],
      [BookOpen, "Organize your subjects", "Keep related work together."],
      [FileText, "Capture your notes", "Keep ideas and revision material close."],
    ],
  },
  {
    name: "Focus",
    title: "Find your focus",
    description: "Make time for the work that matters. One session at a time.",
    items: [
      [Timer, "Start a focus session", "Choose a duration, take breaks and record completed sessions."],
      [UsersRound, "Study Rooms", "Join a live room and focus alongside other students.", "Sign in to join live rooms. You can still use the focus timer as a guest."],
    ],
  },
  {
    name: "Review",
    title: "See how far you've come",
    description: "Build a clearer picture of how you study, one week at a time.",
    items: [
      [LayoutDashboard, "Dashboard", "See upcoming work and recent activity."],
      [BarChart3, "Progress", "Review focus time and study trends."],
    ],
  },
];

// These illustrations are deliberately independent of the user's records:
// static, clearly labelled examples, not interactive controls or live stats.
function PlanPreview() {
  return (
    <div className="tour-plan-preview">
      <div className="tour-example-window">
        <div className="tour-example-window-top">
          <span><ListChecks size={15} /> Tasks</span>
          <Plus size={15} />
        </div>
        <div className="tour-example-window-body">
          <div className="tour-plan-heading">
            <strong>Today's tasks</strong>
            <span>1 of 3</span>
          </div>
          <div className="tour-plan-track"><span /></div>
          {[
            ["Review lecture notes", "Physics", true],
            ["Practice problem sets", "Math", false],
            ["Read next chapter", "Biology", false],
          ].map(([title, subject, done]) => (
            <div className={`tour-plan-row${done ? " is-done" : ""}`} key={title}>
              <span className="tour-plan-checkbox">{done && <Check size={12} weight="bold" />}</span>
              <span className="tour-plan-task">{title}</span>
              <span className="tour-plan-subject">{subject}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="tour-plan-note">
        <span className="tour-plan-note-icon"><FileText size={16} /></span>
        <span><strong>Revision notes</strong><small>Keep it all in one place</small></span>
        <span className="tour-plan-note-lines"><i /><i /><i /></span>
      </div>
    </div>
  );
}

function FocusPreview() {
  return (
    <div className="tour-focus-preview">
      <div className="tour-focus-dial">
        <svg viewBox="0 0 216 216" fill="none">
          <circle className="tour-dial-outer" cx="108" cy="108" r="104" />
          <circle className="tour-dial-track" cx="108" cy="108" r="90" strokeWidth="7" />
          <circle className="tour-dial-progress" cx="108" cy="108" r="90" strokeWidth="7" strokeLinecap="round"
            pathLength="100" strokeDasharray="72 100" transform="rotate(-90 108 108)" />
          <circle className="tour-dial-inner" cx="108" cy="108" r="76" />
        </svg>
        <div className="tour-focus-time"><strong>25:00</strong><span>Focus session</span></div>
      </div>
      <div className="tour-focus-action"><Play size={14} weight="fill" /> Start focus</div>
      <div className="tour-focus-presets"><span>25 min</span><span>50 min</span><span>Custom</span></div>
    </div>
  );
}

const exampleDays = [
  ["M", 36], ["T", 60], ["W", 46], ["T", 78],
  ["F", 57], ["S", 94], ["S", 74],
];

function ReviewPreview() {
  return (
    <div className="tour-review-preview tour-example-window">
      <div className="tour-example-window-top">
        <span><BarChart3 size={15} /> Progress</span>
        <span>Last 7 days</span>
      </div>
      <div className="tour-review-body">
        <div className="tour-review-summary"><span>Total focus time</span><strong>12h <small>40m</small></strong></div>
        <div className="tour-review-chart">
          {exampleDays.map(([day, height], i) => (
            <div key={i} className="tour-review-column">
              <div className="tour-review-bar-track">
                <span className={i === 5 ? "is-highlight" : ""} style={{ "--bar-height": height + "%" }} />
              </div>
              <span>{day}</span>
            </div>
          ))}
        </div>
        <div className="tour-review-legend"><span /> Focus sessions</div>
      </div>
    </div>
  );
}

const previews = [PlanPreview, FocusPreview, ReviewPreview];

export default function WorkspaceOnboarding({ isGuest, onDismiss, onComplete }) {
  const [index, setIndex] = useState(0);
  const headingRef = useRef(null);
  const step = steps[index];
  const last = index === steps.length - 1;
  const StorageIcon = isGuest ? HardDrive : Cloud;
  const Preview = previews[index];

  // Announce the new heading and reset focus each time the user changes step.
  useLayoutEffect(() => {
    const heading = headingRef.current;
    heading?.closest(".workspace-tour-content")?.scrollTo({ top: 0 });
    heading?.focus({ preventScroll: true });
  }, [index]);

  return (
    <div className="workspace-tour-overlay">
      <DialogSurface className="workspace-tour" aria-labelledby="workspace-tour-title"
        aria-describedby="workspace-tour-description" onDismiss={onDismiss}
        initialFocus="#workspace-tour-title">
        <header className="workspace-tour-header">
          <div className="workspace-tour-brand">
            <span aria-hidden="true">S</span>
            StudyOS
          </div>
          <button type="button" className="workspace-tour-skip" onClick={onDismiss}>Skip tour</button>
        </header>

        <div className="workspace-tour-content">
          <div className="workspace-tour-progress" role="progressbar" aria-label="Tour progress"
            aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={index + 1}
            aria-valuetext={`Step ${index + 1} of ${steps.length}`}>
            <div className="workspace-tour-progress-bars" aria-hidden="true">
              {steps.map(({ name }, i) => <span key={name} className={i <= index ? "is-filled" : ""} />)}
            </div>
            <span aria-hidden="true">{index + 1} / {steps.length}</span>
          </div>
          <h2 id="workspace-tour-title" ref={headingRef} tabIndex={-1}>{step.title}</h2>
          <p id="workspace-tour-description">{step.description}</p>

          <ul className="workspace-tour-items">
            {step.items.map(([Icon, title, description, guestDescription]) => (
              <li key={title}>
                <Icon size={19} aria-hidden="true" />
                <div>
                  <strong>{title}</strong>
                  <p>{isGuest && guestDescription ? guestDescription : description}</p>
                </div>
              </li>
            ))}
          </ul>

          {last && (
            <div className="workspace-tour-storage">
              <StorageIcon size={17} aria-hidden="true" />
              <p>{isGuest
                ? "Your guest study data stays in this browser. You can sign in later to move it to an account."
                : "Your study data saves to your account. You can manage your preferences and backups in Settings."}</p>
            </div>
          )}
        </div>

        <figure className={`workspace-tour-preview workspace-tour-preview-${step.name.toLowerCase()}`} aria-hidden="true">
          <div className="workspace-tour-preview-art" key={step.name}>
            <Preview />
          </div>
          <figcaption><span>{step.name}</span><span>Example preview</span></figcaption>
        </figure>

        <footer className="workspace-tour-footer">
          {index > 0
            ? <button type="button" className="workspace-tour-secondary" onClick={() => setIndex(i => i - 1)}>
                <ArrowLeft size={16} aria-hidden="true" /> Back
              </button>
            : <span className="workspace-tour-duration">Less than a minute</span>}
          <button type="button" className="workspace-tour-primary" onClick={() => last ? onComplete() : setIndex(i => i + 1)}>
            {last ? <>Done <Check size={17} aria-hidden="true" /></> : <>Continue <ArrowRight size={17} aria-hidden="true" /></>}
          </button>
        </footer>
      </DialogSurface>
    </div>
  );
}
