import {
  useRef,
  useState,
} from "react";

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  MessageCircle,
  Settings,
  UsersRound,
  X,
} from "lucide-react";

import {
  NavLink,
} from "react-router";

const moreItems = [
  {
    to: "/app/subjects",
    label: "Subjects",
    description: "Manage your courses",
    icon: BookOpen,
  },
  {
    to: "/app/notes",
    label: "Notes",
    description: "Study notes",
    icon: FileText,
  },
  {
    to: "/app/calendar",
    label: "Calendar",
    description: "Deadlines & events",
    icon: CalendarDays,
  },
  {
    to: "/app/progress",
    label: "Progress",
    description: "Stats & activity",
    icon: BarChart3,
  },
  {
    to: "/app/groups",
    label: "Study Groups",
    description: "Study together live",
    icon: UsersRound,
  },
  {
    to: "/app/chats",
    label: "Chats",
    description: "Group conversations",
    icon: MessageCircle,
  },
  {
    to: "/app/settings",
    label: "Settings",
    description: "Account & preferences",
    icon: Settings,
  },
];

export default function MobileMoreSheet({
  open,
  onClose,
}) {
  const [
    dragY,
    setDragY,
  ] = useState(0);

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    closing,
    setClosing,
  ] = useState(false);

  const startY =
    useRef(0);

  const dragYRef =
    useRef(0);

  if (!open) {
    return null;
  }

  const closeSmoothly =
    () => {
      if (closing) {
        return;
      }

      setClosing(true);

      window.setTimeout(
        () => {
          setClosing(false);
          setDragY(0);
          onClose();
        },
        240
      );
    };

  const handlePointerDown =
    (
      event
    ) => {
      if (closing) {
        return;
      }

      setDragging(true);

      startY.current =
        event.clientY;

      dragYRef.current = 0;

      event.currentTarget
        .setPointerCapture?.(
          event.pointerId
        );
    };

  const handlePointerMove =
    (
      event
    ) => {
      if (!dragging) {
        return;
      }

      const distance =
        event.clientY -
        startY.current;

      const nextDrag =
        Math.min(
          Math.max(
            distance,
            0
          ),
          320
        );

      dragYRef.current =
        nextDrag;

      setDragY(
        nextDrag
      );
    };

  const finishDrag =
    () => {
      if (!dragging) {
        return;
      }

      const shouldClose =
        dragYRef.current >
        80;

      setDragging(false);

      if (shouldClose) {
        closeSmoothly();
        return;
      }

      dragYRef.current = 0;
      setDragY(0);
    };

  return (
    <div
      className={`mobile-more-overlay ${
        closing
          ? "is-closing"
          : ""
      }`}
      role="presentation"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closeSmoothly();
        }
      }}
    >
      <section
        id="mobile-more-sheet"
        className={[
          "mobile-more-sheet",
          dragging
            ? "is-dragging"
            : "",
          closing
            ? "is-closing"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
        style={{
          "--mobile-more-drag-y":
            `${dragY}px`,
        }}
      >
        <div
          className="mobile-more-drag-zone"
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={
            finishDrag
          }
          onPointerCancel={
            finishDrag
          }
        >
          <div className="mobile-more-handle" />
        </div>

        <div className="mobile-more-header">
          <div>
            <p className="mobile-more-eyebrow">
              StudyOS
            </p>

            <h2>
              More
            </h2>
          </div>

          <button
            type="button"
            className="mobile-more-close"
            onClick={
              closeSmoothly
            }
            aria-label="Close more menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mobile-more-grid">
          {moreItems.map(
            ({
              to,
              label,
              description,
              icon: Icon,
            }) => (
              <NavLink
                key={to}
                to={to}
                className="mobile-more-item"
                onClick={
                  onClose
                }
              >
                <span className="mobile-more-item-icon">
                  <Icon
                    size={19}
                    strokeWidth={2}
                  />
                </span>

                <span className="mobile-more-item-copy">
                  <strong>
                    {label}
                  </strong>

                  <small>
                    {description}
                  </small>
                </span>
              </NavLink>
            )
          )}
        </div>

        <p className="mobile-more-footer">
          Everything else, without crowding your main navigation.
        </p>
      </section>
    </div>
  );
}
