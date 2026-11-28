import { useEffect, useState } from "react";

const routeNames = {
  dashboard: "Dashboard", tasks: "Tasks", subjects: "Subjects",
  notes: "Notes", calendar: "Calendar", focus: "Focus",
  progress: "Progress", leaderboard: "Leaderboard", groups: "Study Groups",
  chats: "Chats", settings: "Settings", "study-rooms": "Study Rooms",
};

export function SkeletonBlock({ width, height, className = "" }) {
  return <span aria-hidden="true" className={`ws-skeleton-block ${className}`} style={{ width, height }} />;
}

function SkeletonRows({ count = 4, avatar = false, detail = true }) {
  return (
    <div className="ws-skeleton-rows">
      {Array.from({ length: count }, (_, i) => (
        <div className="ws-skeleton-row" key={i}>
          <SkeletonBlock className={avatar ? "ws-skeleton-avatar" : "ws-skeleton-square"} />
          <div className="ws-skeleton-row-copy">
            <SkeletonBlock width={["62%", "45%", "72%"][i % 3]} height={13} />
            {detail && <SkeletonBlock width={["34%", "48%", "26%"][i % 3]} height={9} />}
          </div>
          <SkeletonBlock className="ws-skeleton-end" width={38} height={11} />
        </div>
      ))}
    </div>
  );
}

function SkeletonMetrics({ count = 4 }) {
  return (
    <div className="ws-skeleton-metrics">
      {Array.from({ length: count }, (_, i) => (
        <div className="ws-skeleton-metric" key={i}>
          <SkeletonBlock width="65%" height={10} />
          <SkeletonBlock width="45%" height={27} />
        </div>
      ))}
    </div>
  );
}

function SkeletonCards({ count = 4 }) {
  return (
    <div className="ws-skeleton-cards">
      {Array.from({ length: count }, (_, i) => (
        <div className="ws-skeleton-card" key={i}>
          <SkeletonBlock width="62%" height={14} />
          <SkeletonBlock width="92%" height={10} />
          <SkeletonBlock width="75%" height={10} />
          <SkeletonBlock width="35%" height={10} />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="ws-skeleton-chart">
      <SkeletonBlock width="32%" height={15} />
      <div className="ws-skeleton-bars">
        {[42, 72, 54, 85, 36, 64, 48].map((height, i) => (
          <SkeletonBlock key={i} height={`${height}%`} />
        ))}
      </div>
      <SkeletonBlock width="100%" height={2} />
    </div>
  );
}

function SkeletonCalendar() {
  return (
    <div className="ws-skeleton-calendar">
      <SkeletonBlock width="42%" height={16} />
      <div className="ws-skeleton-calendar-grid">
        {Array.from({ length: 35 }, (_, i) => (
          <SkeletonBlock key={i} height={28} />
        ))}
      </div>
    </div>
  );
}

export function WorkspaceSkeleton({ kind = "rows", count = 4, label = "Loading content", heading = false, avatar = false }) {
  const route = routeNames[kind];
  const title = route || label;
  const statusText = `Loading ${title.toLowerCase()}`.replace(/^Loading loading /, "Loading ");
  return (
    <section className={`ws-skeleton ws-skeleton--${kind}`} role="status" aria-label={statusText}>
      <span className="ws-sr-only">{statusText}</span>
      <div aria-hidden="true" className="ws-skeleton-body">
        {heading && (
          <div className="ws-skeleton-heading">
            <div><SkeletonBlock width={150} height={28} /><SkeletonBlock width={190} height={12} /></div>
            <SkeletonBlock width={100} height={36} />
          </div>
        )}
        {(kind === "dashboard") && <><SkeletonMetrics /><div className="ws-skeleton-columns"><SkeletonChart /><SkeletonChart /></div><SkeletonRows count={4} /></>}
        {kind === "focus" && (
          <>
            <SkeletonMetrics count={3} />
            <div className="ws-skeleton-timer">
              <SkeletonBlock width={105} height={14} />
              <div className="ws-skeleton-timer-ring"><SkeletonBlock width="56%" height={40} /></div>
              <SkeletonBlock width={160} height={38} />
            </div>
            <SkeletonRows count={3} />
          </>
        )}
        {kind === "progress" && <><SkeletonMetrics /><div className="ws-skeleton-columns"><SkeletonChart /><SkeletonChart /></div><SkeletonRows count={3} /></>}
        {kind === "calendar" && <><SkeletonCalendar /><SkeletonRows count={3} /></>}
        {kind === "notes" && <SkeletonCards count={count} />}
        {kind === "groups" && <SkeletonCards count={count} />}
        {kind === "leaderboard" && <><SkeletonMetrics count={3} /><SkeletonRows count={5} avatar /></>}
        {kind === "chats" && <div className="ws-skeleton-columns"><SkeletonRows count={5} avatar /><SkeletonRows count={6} avatar /></div>}
        {kind === "messages" && (
          <div className="ws-skeleton-messages">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className={`ws-skeleton-message ${i % 3 === 2 ? "is-own" : ""}`}>
                <SkeletonBlock className="ws-skeleton-avatar" />
                <div><SkeletonBlock width="58%" height={11} /><SkeletonBlock width={i % 2 ? "90%" : "74%"} height={30} /></div>
              </div>
            ))}
          </div>
        )}
        {["rows", "tasks", "subjects", "settings"].includes(kind) && <SkeletonRows count={count} avatar={avatar} />}
      </div>
    </section>
  );
}

export function WorkspaceRouteLoading({ pathname, shell = false }) {
  const kind = pathname.split("/")[2];
  const resolved = Object.hasOwn(routeNames, kind) ? kind : "dashboard";
  const skeleton = <WorkspaceSkeleton kind={resolved} heading count={resolved === "settings" ? 9 : 4} />;
  if (!shell) return skeleton;
  return (
    <div className="ws-shell-loading">
      <aside aria-hidden="true" className="ws-shell-loading-rail">
        <div className="ws-shell-loading-brand"><SkeletonBlock width={32} height={32} /><SkeletonBlock width={100} height={16} /></div>
        <SkeletonRows count={9} detail={false} />
      </aside>
      <div className="ws-shell-loading-content">{skeleton}</div>
    </div>
  );
}

export function WorkspaceEmpty({ icon, title, description, action, compact = false, className = "" }) {
  return (
    <div className={`ws-empty${compact ? " ws-empty--compact" : ""} ${className}`}>
      {icon && <span className="ws-empty-icon" aria-hidden="true">{icon}</span>}
      <div className="ws-empty-copy">
        <strong className="ws-empty-title">{title}</strong>
        {description && <p className="ws-empty-description">{description}</p>}
      </div>
      {action && <div className="ws-empty-action">{action}</div>}
    </div>
  );
}

// Keep content in the tree during the collapse transition, but disable it
// immediately. Unmount optional form controls after collapse so portals close.
export function WorkspaceDisclosure({ open, id, className = "", children, unmountOnClose = false }) {
  const [mounted, setMounted] = useState(open || !unmountOnClose);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    if (!unmountOnClose) return;
    const timer = window.setTimeout(() => setMounted(false),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 190);
    return () => window.clearTimeout(timer);
  }, [open, unmountOnClose]);
  return (
    <div id={id} className={`ws-disclosure ${className}`} data-open={open} aria-hidden={!open} inert={!open}>
      <div className="ws-disclosure-inner">{(open || mounted) && children}</div>
    </div>
  );
}
