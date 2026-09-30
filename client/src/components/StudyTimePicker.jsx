import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  Clock3,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import "./StudyTimePicker.css";

const VIEWPORT_PADDING = 12;
const GAP = 8;

// =========================================================
// HELPERS
// =========================================================

const clamp =
  (
    value,
    min,
    max
  ) => {
    return Math.min(
      max,
      Math.max(
        min,
        value
      )
    );
  };

const parseTime =
  (
    value
  ) => {
    const match =
      String(
        value || ""
      ).match(
        /^(\d{1,2}):(\d{2})$/
      );

    if (!match) {
      return null;
    }

    const hour =
      Number(
        match[1]
      );

    const minute =
      Number(
        match[2]
      );

    if (
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return {
      hour,
      minute,
    };
  };

const toDraft =
  (
    value
  ) => {
    const parsed =
      parseTime(
        value
      );

    const date =
      new Date();

    const hour24 =
      parsed?.hour ??
      date.getHours();

    const minute =
      parsed?.minute ??
      date.getMinutes();

    const period =
      hour24 >= 12
        ? "PM"
        : "AM";

    const hour12 =
      hour24 % 12 ||
      12;

    return {
      hour:
        String(
          hour12
        ),

      minute:
        String(
          minute
        ).padStart(
          2,
          "0"
        ),

      period,
    };
  };

const to24HourValue =
  ({
    hour,
    minute,
    period,
  }) => {
    const cleanHour =
      clamp(
        Number(
          hour
        ) || 12,
        1,
        12
      );

    const cleanMinute =
      clamp(
        Number(
          minute
        ) || 0,
        0,
        59
      );

    let hour24 =
      cleanHour %
      12;

    if (
      period ===
      "PM"
    ) {
      hour24 +=
        12;
    }

    return `${String(
      hour24
    ).padStart(
      2,
      "0"
    )}:${String(
      cleanMinute
    ).padStart(
      2,
      "0"
    )}`;
  };

const formatDisplayTime =
  (
    value
  ) => {
    const parsed =
      parseTime(
        value
      );

    if (!parsed) {
      return "";
    }

    const date =
      new Date();

    date.setHours(
      parsed.hour,
      parsed.minute,
      0,
      0
    );

    return date.toLocaleTimeString(
      undefined,
      {
        hour:
          "numeric",

        minute:
          "2-digit",
      }
    );
  };

// =========================================================
// STUDY TIME PICKER
// =========================================================

function StudyTimePicker({
  value = "",
  onChange,
  disabled = false,
  placeholder = "No time",
  ariaLabel = "Choose time",
}) {
  const triggerRef =
    useRef(null);

  const popoverRef =
    useRef(null);

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    positioned,
    setPositioned,
  ] = useState(false);

  const [
    position,
    setPosition,
  ] = useState({
    top: 0,
    left: 0,
    width: 286,
  });

  const initialDraft =
    toDraft(
      value
    );

  const [
    hour,
    setHour,
  ] = useState(
    initialDraft.hour
  );

  const [
    minute,
    setMinute,
  ] = useState(
    initialDraft.minute
  );

  const [
    period,
    setPeriod,
  ] = useState(
    initialDraft.period
  );

  // =======================================================
  // SYNC DRAFT WHEN OPENING
  // =======================================================

  const openPicker =
    () => {
      if (
        disabled
      ) {
        return;
      }

      if (
        !open
      ) {
        const next =
          toDraft(
            value
          );

        setHour(
          next.hour
        );

        setMinute(
          next.minute
        );

        setPeriod(
          next.period
        );
      }

      setOpen(
        (
          current
        ) =>
          !current
      );
    };

  // =======================================================
  // POSITION
  // =======================================================

  const updatePosition =
    () => {
      if (
        !triggerRef.current ||
        !popoverRef.current
      ) {
        return;
      }

      const rect =
        triggerRef.current
          .getBoundingClientRect();

      const width =
        Math.min(
          286,
          window.innerWidth -
            VIEWPORT_PADDING *
              2
        );

      const height =
        popoverRef.current
          .offsetHeight ||
        228;

      const spaceBelow =
        window.innerHeight -
        rect.bottom;

      const spaceAbove =
        rect.top;

      let top =
        rect.bottom +
        GAP;

      if (
        spaceBelow <
          height +
            GAP +
            VIEWPORT_PADDING &&
        spaceAbove >
          spaceBelow
      ) {
        top =
          rect.top -
          height -
          GAP;
      }

      top =
        Math.max(
          VIEWPORT_PADDING,
          Math.min(
            top,
            window.innerHeight -
              height -
              VIEWPORT_PADDING
          )
        );

      let left =
        rect.left;

      left =
        Math.max(
          VIEWPORT_PADDING,
          Math.min(
            left,
            window.innerWidth -
              width -
              VIEWPORT_PADDING
          )
        );

      setPosition({
        top,
        left,
        width,
      });

      setPositioned(
        true
      );
    };

  useLayoutEffect(
    () => {
      if (!open) {
        setPositioned(
          false
        );

        return undefined;
      }

      const frame =
        requestAnimationFrame(
          updatePosition
        );

      return () =>
        cancelAnimationFrame(
          frame
        );
    },
    [
      open,
    ]
  );

  useEffect(
    () => {
      if (!open) {
        return undefined;
      }

      const reposition =
        () =>
          updatePosition();

      const handleOutside =
        (
          event
        ) => {
          if (
            triggerRef.current?.contains(
              event.target
            ) ||
            popoverRef.current?.contains(
              event.target
            )
          ) {
            return;
          }

          setOpen(
            false
          );
        };

      const handleKeyDown =
        (
          event
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            setOpen(
              false
            );

            triggerRef.current?.focus();
          }
        };

      window.addEventListener(
        "resize",
        reposition
      );

      window.addEventListener(
        "scroll",
        reposition,
        true
      );

      document.addEventListener(
        "mousedown",
        handleOutside
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "resize",
          reposition
        );

        window.removeEventListener(
          "scroll",
          reposition,
          true
        );

        document.removeEventListener(
          "mousedown",
          handleOutside
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      open,
    ]
  );

  useEffect(
    () => {
      if (
        disabled &&
        open
      ) {
        setOpen(
          false
        );
      }
    },
    [
      disabled,
      open,
    ]
  );

  // =======================================================
  // ACTIONS
  // =======================================================

  const applyTime =
    () => {
      const nextValue =
        to24HourValue({
          hour,
          minute,
          period,
        });

      onChange?.(
        nextValue
      );

      setOpen(
        false
      );

      triggerRef.current?.focus();
    };

  const chooseNow =
    () => {
      const now =
        new Date();

      const nextValue =
        `${String(
          now.getHours()
        ).padStart(
          2,
          "0"
        )}:${String(
          now.getMinutes()
        ).padStart(
          2,
          "0"
        )}`;

      onChange?.(
        nextValue
      );

      setOpen(
        false
      );

      triggerRef.current?.focus();
    };

  const clearTime =
    () => {
      onChange?.("");

      setOpen(
        false
      );

      triggerRef.current?.focus();
    };

  // =======================================================
  // NORMALIZE INPUTS
  // =======================================================

  const normalizeHour =
    () => {
      setHour(
        String(
          clamp(
            Number(
              hour
            ) || 12,
            1,
            12
          )
        )
      );
    };

  const normalizeMinute =
    () => {
      setMinute(
        String(
          clamp(
            Number(
              minute
            ) || 0,
            0,
            59
          )
        ).padStart(
          2,
          "0"
        )
      );
    };

  // =======================================================
  // POPOVER
  // =======================================================

  const popover =
    open &&
    typeof document !==
      "undefined"
      ? createPortal(
          <div
            ref={
              popoverRef
            }
            className="study-time-popover"
            role="dialog"
            aria-label={
              ariaLabel
            }
            style={{
              top:
                position.top,

              left:
                position.left,

              width:
                position.width,

              visibility:
                positioned
                  ? "visible"
                  : "hidden",
            }}
          >

            <div className="study-time-heading">

              <div>

                <span>
                  Due time
                </span>

                <strong>
                  {formatDisplayTime(
                    to24HourValue({
                      hour,
                      minute,
                      period,
                    })
                  )}
                </strong>

              </div>

              <button
                type="button"
                className="study-time-close"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                aria-label="Close time picker"
              >
                <X
                  size={15}
                />
              </button>

            </div>

            <div className="study-time-editor">

              <label className="study-time-number">

                <span>
                  Hour
                </span>

                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="12"
                  value={
                    hour
                  }
                  onChange={(
                    event
                  ) =>
                    setHour(
                      event.target
                        .value
                        .slice(
                          0,
                          2
                        )
                    )
                  }
                  onBlur={
                    normalizeHour
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();

                      applyTime();
                    }
                  }}
                />

              </label>

              <span className="study-time-separator">
                :
              </span>

              <label className="study-time-number">

                <span>
                  Minute
                </span>

                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  value={
                    minute
                  }
                  onChange={(
                    event
                  ) =>
                    setMinute(
                      event.target
                        .value
                        .slice(
                          0,
                          2
                        )
                    )
                  }
                  onBlur={
                    normalizeMinute
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();

                      applyTime();
                    }
                  }}
                />

              </label>

              <div className="study-time-period">

                <button
                  type="button"
                  className={
                    period ===
                    "AM"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPeriod(
                      "AM"
                    )
                  }
                >
                  AM
                </button>

                <button
                  type="button"
                  className={
                    period ===
                    "PM"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPeriod(
                      "PM"
                    )
                  }
                >
                  PM
                </button>

              </div>

            </div>

            <div className="study-time-footer">

              <button
                type="button"
                className="study-time-text-action"
                onClick={
                  clearTime
                }
                disabled={
                  !value
                }
              >
                Clear
              </button>

              <div className="study-time-footer-right">

                <button
                  type="button"
                  className="study-time-text-action"
                  onClick={
                    chooseNow
                  }
                >
                  Now
                </button>

                <button
                  type="button"
                  className="study-time-apply"
                  onClick={
                    applyTime
                  }
                >
                  <Check
                    size={14}
                  />

                  Apply
                </button>

              </div>

            </div>

          </div>,
          document.body
        )
      : null;

  // =======================================================
  // UI
  // =======================================================

  return (
    <>
      <div className="study-time-picker">

        <button
          ref={
            triggerRef
          }
          type="button"
          className={`study-time-trigger ${
            open
              ? "active"
              : ""
          }`}
          onClick={
            openPicker
          }
          disabled={
            disabled
          }
          aria-haspopup="dialog"
          aria-expanded={
            open
          }
          aria-label={
            ariaLabel
          }
        >

          <Clock3
            size={15}
            aria-hidden="true"
          />

          <span
            className={
              value
                ? "study-time-value"
                : "study-time-placeholder"
            }
          >
            {value
              ? formatDisplayTime(
                  value
                )
              : placeholder}
          </span>

          <ChevronDown
            size={14}
            className="study-time-chevron"
            aria-hidden="true"
          />

        </button>

      </div>

      {popover}

    </>
  );
}

export default StudyTimePicker;
