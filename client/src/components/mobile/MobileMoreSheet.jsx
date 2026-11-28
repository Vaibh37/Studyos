import { preloadWorkspacePath } from "../../services/routePreload";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import {
  BarChart3,
  BookOpen,
  Cards,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  MessageCircle,
  Settings,
  UsersRound,
  GraduationCap,
  X,
} from "../icons";

export const moreItems = [
  { to: "/app/subjects", label: "Subjects", icon: BookOpen },
  { to: "/app/notes", label: "Notes", icon: FileText },
  { to: "/app/flashcards", label: "Flashcards", icon: Cards },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/progress", label: "Progress", icon: BarChart3 },
  { to: "/app/study-rooms", label: "Study Rooms", icon: GraduationCap },
  { to: "/app/groups", label: "Study Groups", icon: UsersRound },
  { to: "/app/chats", label: "Chats", icon: MessageCircle },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export default function MobileMoreSheet({ onClose }) {
  const dialogRef = useRef(null);
  const drag = useRef(null);
  const closeTimer = useRef(null);
  const [closing, setClosing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(closeTimer.current);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  function dismiss() {
    if (closeTimer.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 180);
  }

  function startDrag(event) {
    if (event.button !== 0 || drag.current || closing) return;
    drag.current = { pointer: event.pointerId, start: event.clientY, distance: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event) {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current.distance = Math.max(0, event.clientY - drag.current.start);
    setOffset(drag.current.distance);
  }

  function finishDrag(event, cancelled = false) {
    if (drag.current?.pointer !== event.pointerId) return;
    const shouldDismiss = !cancelled && drag.current.distance > 85;
    drag.current = null;
    setDragging(false);
    if (shouldDismiss) dismiss();
    else setOffset(0);
  }

  return (
    <dialog
      ref={dialogRef}
      id="mobile-more-sheet"
      className={`mobile-more-sheet${dragging ? " is-dragging" : ""}${closing ? " is-closing" : ""}`}
      aria-labelledby="mobile-more-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
      }}
      style={{ "--mobile-sheet-offset": `${offset}px` }}
    >
      <div className="mobile-more-drag-zone"
        aria-hidden="true"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={(event) => finishDrag(event, true)}
        onLostPointerCapture={(event) => finishDrag(event, true)}
      >
        <span className="mobile-more-handle" />
      </div>
      <header className="mobile-more-header">
        <h2 id="mobile-more-title">More</h2>
        <button type="button" className="mobile-more-close" aria-label="Close more menu" onClick={dismiss} autoFocus>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <nav className="mobile-more-list" aria-label="Additional navigation">
        {moreItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onPointerEnter={() => preloadWorkspacePath(to)} onFocus={() => preloadWorkspacePath(to)} onPointerDown={() => preloadWorkspacePath(to)} className="mobile-more-item" onClick={onClose}>
            {({ isActive }) => (
              <>
                <Icon className="mobile-more-item-icon" size={23} aria-hidden="true" />
                <span>{label}</span>
                {isActive
                  ? <Check className="mobile-more-item-end" size={19} weight="bold" aria-hidden="true" />
                  : <ChevronRight className="mobile-more-item-end" size={18} aria-hidden="true" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </dialog>
  );
}
