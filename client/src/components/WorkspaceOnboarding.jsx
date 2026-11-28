import { useLayoutEffect, useRef, useState } from "react";
import DialogSurface from "./DialogSurface";
import {
  ArrowLeft, ArrowRight, BarChart3, BookOpen, Check, Cloud, FileText,
  HardDrive, LayoutDashboard, ListChecks, Timer, UsersRound,
} from "./icons";
import "./WorkspaceOnboarding.css";

const steps = [
  {
    title: "Welcome to StudyOS",
    description: "A little planning makes studying easier. Start with what you need to get done today.",
    items: [
      [ListChecks, "Plan your tasks", "Add deadlines and priorities, then check off your work as you go."],
      [BookOpen, "Organize your subjects", "Keep related tasks and notes together so they are easy to find."],
      [FileText, "Capture your notes", "Save ideas, revision material and important details in your workspace."],
    ],
  },
  {
    title: "Find your focus",
    description: "Set aside time for one thing. StudyOS can help you keep track without getting in your way.",
    items: [
      [Timer, "Start a focus session", "Choose a duration, take breaks and record completed sessions."],
      [UsersRound, "Study Rooms", "Join a live room and focus alongside other students.", "Sign in to join live rooms. You can still use the focus timer as a guest."],
    ],
  },
  {
    title: "See how far you've come",
    description: "Review your own activity over time. Small, consistent sessions add up.",
    items: [
      [LayoutDashboard, "Dashboard", "See upcoming work, recent activity and your study overview."],
      [BarChart3, "Progress", "Review recorded focus time and study trends to plan your next session."],
    ],
  },
];

export default function WorkspaceOnboarding({ isGuest, onDismiss, onComplete }) {
  const [index, setIndex] = useState(0);
  const headingRef = useRef(null);
  const step = steps[index];
  const last = index === steps.length - 1;
  const StorageIcon = isGuest ? HardDrive : Cloud;

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
              {steps.map(({ title }, i) => <span key={title} className={i <= index ? "is-filled" : ""} />)}
            </div>
            <span aria-hidden="true">Step {index + 1} of {steps.length}</span>
          </div>
          <h2 id="workspace-tour-title" ref={headingRef} tabIndex={-1}>{step.title}</h2>
          <p id="workspace-tour-description">{step.description}</p>

          <ul className="workspace-tour-items">
            {step.items.map(([Icon, title, description, guestDescription]) => (
              <li key={title}>
                <span className="workspace-tour-item-icon"><Icon size={22} aria-hidden="true" /></span>
                <div>
                  <strong>{title}</strong>
                  <p>{isGuest && guestDescription ? guestDescription : description}</p>
                </div>
              </li>
            ))}
          </ul>

          {last && (
            <div className="workspace-tour-storage">
              <StorageIcon size={19} aria-hidden="true" />
              <p>{isGuest
                ? "Your guest study data stays in this browser. You can sign in later to move it to an account."
                : "Your study data saves to your account. You can manage your preferences and backups in Settings."}</p>
            </div>
          )}
        </div>

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
