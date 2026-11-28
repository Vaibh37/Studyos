import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import DialogSurface from "./DialogSurface";
import {
  ArrowLeft, ArrowRight, Check, Cloud, HardDrive,
  ListChecks, Pause, Play, Plus, RotateCcw, Timer,
} from "./icons";
import "./WorkspaceOnboarding.css";

const chapters = [
  { name: "Plan", title: "Welcome to StudyOS", description: "Everything starts with one clear task." },
  { name: "Focus", title: "Find your focus", description: "Give one thing your full attention." },
  { name: "Review", title: "See how far you've come", description: "Every small action is part of your progress." },
];
const PRACTICE_MS = 5000;
const INITIAL_TASKS = [{ id: 1, title: "Review one topic", done: false }];

function formatClock(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return "00:" + String(seconds).padStart(2, "0");
}

// A single continuous stage. The orbit changes its perspective and lighting
// with each chapter rather than introducing unrelated static illustrations.
const SceneArchitecture = memo(function SceneArchitecture({ index, energized, accomplished }) {
  return (
    <div className={`journey-architecture scene-${index}${energized ? " is-energized" : ""}${accomplished ? " is-accomplished" : ""}`} aria-hidden="true">
      <div className="journey-light" />
      <svg className="journey-orbit" viewBox="0 0 900 660" fill="none">
        <g className="journey-orbit-plane">
          {[100, 147, 194, 241, 288, 335].map((radius, i) => (
            <circle key={radius} cx="450" cy="330" r={radius} opacity={1 - i * 0.11} />
          ))}
          {Array.from({ length: 48 }, (_, i) => {
            const angle = i * Math.PI / 24;
            const r1 = i % 4 === 0 ? 298 : 311, r2 = 325;
            return <line key={i}
              x1={450 + r1 * Math.cos(angle)} y1={330 + r1 * Math.sin(angle)}
              x2={450 + r2 * Math.cos(angle)} y2={330 + r2 * Math.sin(angle)} />;
          })}
          <circle className="orbit-sweep" cx="450" cy="330" r="288" pathLength="100" strokeDasharray="14 86" />
          <circle className="orbit-sweep orbit-sweep-inner" cx="450" cy="330" r="194" pathLength="100" strokeDasharray="9 91" />
          <path className="orbit-cross" d="M20 330H880M450 0V660" />
        </g>
      </svg>
      <div className="journey-horizon" />
      <span className="journey-coordinate coordinate-left">S / 0{index + 1}</span>
      <span className="journey-coordinate coordinate-right">StudyOS</span>
    </div>
  );
});

function CompletionPulse({ active }) {
  if (!active) return null;
  return <div className="journey-completion-pulse" aria-hidden="true">
    {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ "--ray": (i * 30) + "deg" }} />)}
  </div>;
}

function PlanScene({ tasks, setTasks, completed }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const id = useRef(Math.max(0, ...tasks.map(task => task.id)) + 1);
  function addTask(event) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || tasks.length >= 4) return;
    const task = { id: id.current++, title, done: false };
    setTasks(current => current.length < 4 ? [...current, task] : current);
    setDraft("");
    inputRef.current?.focus();
  }
  return (
    <div className="journey-plan journey-stage-content">
      <div className="journey-object">
        <div className="journey-plan-depth" aria-hidden="true" />
        <section className="journey-task-board" aria-label="Practice task list">
          <header className="journey-board-header">
            <div><ListChecks size={19} aria-hidden="true" /><strong>Your first plan</strong></div>
            <span>{completed}/{tasks.length}</span>
          </header>
          <div className="journey-task-progress" aria-hidden="true">
            <span style={{ "--fill": (completed / tasks.length * 100) + "%" }} />
          </div>
          <div className="journey-task-list">
            {tasks.map(task => (
              <button key={task.id} type="button" className={`journey-practice-task${task.done ? " is-done" : ""}`}
                aria-pressed={task.done} onClick={() => setTasks(items => items.map(item => item.id === task.id ? { ...item, done: !item.done } : item))}>
                <span className="journey-checkbox">{task.done && <Check size={16} weight="bold" aria-hidden="true" />}</span>
                <span className="journey-task-title">{task.title}</span>
                <span className="journey-task-tag">{task.done ? "Done" : "To do"}</span>
              </button>
            ))}
          </div>
          <form className="journey-add-task" onSubmit={addTask}>
            <input ref={inputRef} type="text" aria-label="Practice task title" maxLength={60}
              placeholder={tasks.length >= 4 ? "Practice list is full" : "Add your own practice task…"}
              value={draft} onChange={event => setDraft(event.target.value)} disabled={tasks.length >= 4} />
            <button type="submit" aria-label="Add practice task" disabled={!draft.trim() || tasks.length >= 4}><Plus size={19} /></button>
          </form>
        </section>
        <div className={`journey-plan-seal${completed > 0 ? " is-achieved" : ""}`} aria-hidden="true">
          <CompletionPulse key={completed} active={completed > 0} />
          <Check size={24} weight="bold" />
        </div>
      </div>
      <div className="journey-feedback" role="status">
        {completed > 0 ? `${completed} ${completed === 1 ? "task" : "tasks"} checked off. That's progress.` : "Try checking off the task above."}
      </div>
    </div>
  );
}

function TimerScene({ elapsed, running, onStart, onPause, onReset }) {
  const complete = elapsed >= PRACTICE_MS;
  const remaining = PRACTICE_MS - elapsed;
  const progress = Math.min(100, elapsed / PRACTICE_MS * 100);
  const status = complete ? "Session complete" : running ? "You're focusing" : elapsed ? "Paused" : "Ready when you are";
  return (
    <div className="journey-focus journey-stage-content">
      <div className={`journey-timer-sculpture${running ? " is-running" : ""}${complete ? " is-complete" : ""}`}>
        <CompletionPulse active={complete} />
        <svg className="journey-timer-ring" viewBox="0 0 320 320" fill="none" aria-hidden="true">
          <circle className="journey-ring-halo" cx="160" cy="160" r="153" />
          <circle className="journey-ring-track" cx="160" cy="160" r="137" strokeWidth="9" />
          <circle className="journey-ring-progress" cx="160" cy="160" r="137" strokeWidth="9" strokeLinecap="round"
            pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress} transform="rotate(-90 160 160)" />
          <circle className="journey-ring-inner" cx="160" cy="160" r="119" />
          {Array.from({ length: 60 }, (_, i) => {
            const angle = i * Math.PI / 30;
            return <line key={i} className={i % 5 === 0 ? "is-major" : ""}
              x1={160 + 109 * Math.cos(angle)} y1={160 + 109 * Math.sin(angle)}
              x2={160 + (i % 5 === 0 ? 115 : 112) * Math.cos(angle)}
              y2={160 + (i % 5 === 0 ? 115 : 112) * Math.sin(angle)} />;
          })}
        </svg>
        <div className="journey-timer-face">
          {complete ? <span className="journey-timer-check"><Check size={43} weight="bold" aria-hidden="true" /></span>
            : <strong role="timer" aria-label="Practice focus time remaining">{formatClock(remaining)}</strong>}
          <span role="status">{status}</span>
          <small>5-second practice</small>
        </div>
      </div>
      <div className="journey-timer-controls">
        {complete ? <button type="button" className="journey-action" onClick={onReset}><RotateCcw size={18} aria-hidden="true" /> Try again</button>
          : running ? <button type="button" className="journey-action" onClick={onPause}><Pause size={18} weight="fill" aria-hidden="true" /> Pause</button>
            : <button type="button" className="journey-action" onClick={onStart}><Play size={17} weight="fill" aria-hidden="true" /> {elapsed ? "Resume" : "Start practice"}</button>}
        {elapsed > 0 && !complete && <button type="button" className="journey-reset" onClick={onReset} aria-label="Reset practice timer"><RotateCcw size={19} /></button>}
      </div>
      <p className="journey-feedback">A real countdown, just a practice session.</p>
    </div>
  );
}

function ReviewScene({ tasks, completed, elapsed }) {
  const [metric, setMetric] = useState("tasks");
  const seconds = Math.floor(elapsed / 1000);
  const taskRatio = completed / tasks.length;
  const focusRatio = elapsed / PRACTICE_MS;
  const value = metric === "tasks" ? completed : seconds;
  const ratio = metric === "tasks" ? taskRatio : focusRatio;
  return (
    <section className="journey-review journey-stage-content" aria-label="Your practice results">
      <div className="journey-result-dial">
        <svg viewBox="0 0 320 320" fill="none" aria-hidden="true">
          <circle className="journey-result-halo" cx="160" cy="160" r="153" />
          <circle className="journey-result-track" cx="160" cy="160" r="137" strokeWidth="3" />
          <circle className="journey-result-arc" cx="160" cy="160" r="137" strokeWidth="9" strokeLinecap="round"
            pathLength="100" strokeDasharray="100" strokeDashoffset={100 - ratio * 100} transform="rotate(-90 160 160)" />
          <circle className="journey-result-inner" cx="160" cy="160" r="115" />
        </svg>
        <div className="journey-result-face" key={metric}>
          <strong>{value}<small>{metric === "tasks" ? `/${tasks.length}` : "s"}</small></strong>
          <span>{metric === "tasks" ? "Tasks completed" : "Practice focus time"}</span>
          <span className="journey-result-caption">Your practice results</span>
        </div>
      </div>
      <div className="journey-metrics" role="group" aria-label="Choose a practice metric">
        <button type="button" className="journey-metric" aria-pressed={metric === "tasks"} onClick={() => setMetric("tasks")}>
          <ListChecks size={18} aria-hidden="true" /><span>Tasks</span><strong>{completed}/{tasks.length}</strong>
          <i aria-hidden="true" style={{ "--fill": taskRatio * 100 + "%" }} />
        </button>
        <button type="button" className="journey-metric" aria-pressed={metric === "focus"} onClick={() => setMetric("focus")}>
          <Timer size={18} aria-hidden="true" /><span>Focus</span><strong>{seconds}s</strong>
          <i aria-hidden="true" style={{ "--fill": focusRatio * 100 + "%" }} />
        </button>
      </div>
      <p className="journey-feedback">{completed || elapsed >= 1000 ? "A little progress is still progress." : "No practice activity yet. That's okay."}</p>
    </section>
  );
}

export default function WorkspaceOnboarding({ isGuest, onDismiss, onComplete }) {
  const [index, setIndex] = useState(0);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [clock, setClock] = useState({ elapsed: 0, startedAt: null });
  const [now, setNow] = useState(0);
  const headingRef = useRef(null);
  const scrollRef = useRef(null);
  const step = chapters[index];
  const last = index === chapters.length - 1;
  const completed = tasks.filter(task => task.done).length;
  const running = clock.startedAt !== null;
  const elapsed = Math.min(PRACTICE_MS, clock.elapsed + (running ? Math.max(0, now - clock.startedAt) : 0));
  const StorageIcon = isGuest ? HardDrive : Cloud;

  useEffect(() => {
    if (clock.startedAt === null) return;
    const tick = () => {
      const time = performance.now();
      setNow(time);
      if (clock.elapsed + time - clock.startedAt >= PRACTICE_MS) {
        setClock(current => current.startedAt === clock.startedAt
          ? { elapsed: PRACTICE_MS, startedAt: null } : current);
      }
    };
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, [clock.startedAt, clock.elapsed]);

  function start() {
    const time = performance.now();
    setNow(time);
    setClock(current => current.startedAt === null && current.elapsed < PRACTICE_MS
      ? { elapsed: current.elapsed, startedAt: time } : current);
  }
  function pause() {
    const time = performance.now();
    setClock(current => current.startedAt === null ? current : {
      elapsed: Math.min(PRACTICE_MS, current.elapsed + Math.max(0, time - current.startedAt)),
      startedAt: null,
    });
  }
  function reset() { setClock({ elapsed: 0, startedAt: null }); }
  function changeChapter(next) {
    if (running) pause();
    setIndex(next);
  }

  // Pointer parallax only moves the decorative set, never the actual controls.
  function moveLight(event) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--stage-x", ((event.clientX - bounds.left) / bounds.width - .5) * 22 + "px");
    event.currentTarget.style.setProperty("--stage-y", ((event.clientY - bounds.top) / bounds.height - .5) * 22 + "px");
  }
  function settleLight(event) {
    event.currentTarget.style.removeProperty("--stage-x");
    event.currentTarget.style.removeProperty("--stage-y");
  }

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  return (
    <div className="workspace-tour-overlay">
      <DialogSurface className={`workspace-tour journey-scene-${index}`} aria-labelledby="workspace-tour-title"
        aria-describedby="workspace-tour-description" onDismiss={onDismiss} initialFocus="#workspace-tour-title">
        <header className="journey-header">
          <div className="journey-brand"><span aria-hidden="true">S</span><strong>StudyOS</strong></div>
          <div className="journey-chapters" role="progressbar" aria-label="Tour progress"
            aria-valuemin={0} aria-valuemax={chapters.length} aria-valuenow={index + 1}
            aria-valuetext={`${step.name}, step ${index + 1} of ${chapters.length}`}>
            {chapters.map((chapter, i) => <span key={chapter.name} className={i === index ? "is-current" : i < index ? "is-past" : ""} aria-hidden="true">
              <i>{i < index ? <Check size={12} weight="bold" /> : String(i + 1).padStart(2, "0")}</i><b>{chapter.name}</b>
            </span>)}
          </div>
          <button type="button" className="journey-skip" onClick={onDismiss}>Skip tour</button>
        </header>
        <div className="journey-main" ref={scrollRef}>
          <div className="journey-copy" key={step.name}>
            <div className="journey-chapter-index" aria-hidden="true">0{index + 1}<span>/</span>03</div>
            <h2 ref={headingRef} id="workspace-tour-title" tabIndex={-1}>{step.title}</h2>
            <p id="workspace-tour-description">{step.description}</p>
            <div className="journey-instruction">
              <div className="journey-instruction-mark"><span /></div>
              <p>{index === 0 ? "Check off the practice task or add one of your own. Tasks, subjects and notes help you organize what comes next."
                : index === 1 ? "Start a five-second focus session. Try pausing and resuming to see how the timer works."
                : "These results come directly from your actions in this tour. In StudyOS, your completed work and focus sessions will build your progress."}</p>
            </div>
            {index === 1 && <p className="journey-side-note">{isGuest ? "Sign in to join live rooms. You can still use the focus timer as a guest." : "Join a live room and focus alongside other students."}</p>}
            {last && <div className="journey-storage"><StorageIcon size={18} aria-hidden="true" /><p>{isGuest
              ? "Your guest study data stays in this browser. You can sign in later to move it to an account."
              : "Your study data saves to your account. You can manage your preferences and backups in Settings."}</p></div>}
          </div>
          <div className="journey-stage" onPointerMove={moveLight} onPointerLeave={settleLight}>
            <SceneArchitecture index={index} energized={running} accomplished={index === 0 ? completed > 0 : elapsed >= PRACTICE_MS} />
            <div className="journey-stage-label"><span /> {last ? "Practice recap" : "Try it yourself"}</div>
            <div className="journey-stage-inner" key={index}>
              {index === 0 ? <PlanScene tasks={tasks} setTasks={setTasks} completed={completed} />
                : index === 1 ? <TimerScene elapsed={elapsed} running={running} onStart={start} onPause={pause} onReset={reset} />
                  : <ReviewScene tasks={tasks} completed={completed} elapsed={elapsed} />}
            </div>
            <div className="journey-stage-footnote">Practice environment · Nothing is saved to your study records</div>
          </div>
        </div>
        <footer className="journey-footer">
          <div className="journey-footer-left">
            {index > 0 ? <button type="button" className="journey-back" onClick={() => changeChapter(index - 1)}><ArrowLeft size={18} aria-hidden="true" /> Back</button>
              : <span className="journey-duration">A quick introduction. At your pace.</span>}
          </div>
          <div className="journey-footer-progress" aria-hidden="true">
            {chapters.map((chapter, i) => <span key={chapter.name} className={i <= index ? "is-filled" : ""} />)}
          </div>
          <button type="button" className="journey-next" onClick={() => last ? onComplete() : changeChapter(index + 1)}>
            {last ? <>Done <Check size={18} aria-hidden="true" /></> : <>Continue <ArrowRight size={18} aria-hidden="true" /></>}
          </button>
        </footer>
      </DialogSurface>
    </div>
  );
}
