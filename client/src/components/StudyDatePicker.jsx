import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import "./StudyDatePicker.css";

// =========================================================
// HELPERS
// =========================================================

const getDateKey = (
  date
) => {
  if (!date) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};

const parseDateKey = (
  value
) => {
  if (!value) {
    return null;
  }

  const match =
    String(
      value
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return null;
  }

  return new Date(
    Number(
      match[1]
    ),
    Number(
      match[2]
    ) - 1,
    Number(
      match[3]
    )
  );
};

const formatDisplayDate = (
  value
) => {
  const date =
    parseDateKey(
      value
    );

  if (!date) {
    return "";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",
    }
  );
};

// =========================================================
// DATE PICKER
// =========================================================

function StudyDatePicker({
  value = "",
  onChange,
  placeholder = "Choose date",
  disabled = false,
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    positioned,
    setPositioned,
  ] = useState(false);

  const [
    popoverPosition,
    setPopoverPosition,
  ] = useState({
    top: 0,
    left: 0,
    width: 292,
  });

  const triggerRef =
    useRef(null);

  const popoverRef =
    useRef(null);

  const selectedDate =
    parseDateKey(
      value
    );

  const [
    viewDate,
    setViewDate,
  ] = useState(
    selectedDate ||
      new Date()
  );

  // =======================================================
  // SYNC SELECTED DATE
  // =======================================================

  useEffect(
    () => {
      if (
        selectedDate
      ) {
        setViewDate(
          selectedDate
        );
      }
    },
    [
      value,
    ]
  );

  // =======================================================
  // POSITION POPOVER
  // =======================================================

  const updatePopoverPosition =
    () => {
      if (
        !triggerRef.current ||
        !popoverRef.current
      ) {
        return;
      }

      const triggerRect =
        triggerRef.current
          .getBoundingClientRect();

      const viewportPadding =
        12;

      const gap =
        8;

      const popoverWidth =
        Math.min(
          292,
          window.innerWidth -
            viewportPadding *
              2
        );

      const popoverHeight =
        popoverRef.current
          .offsetHeight ||
        330;

      const spaceBelow =
        window.innerHeight -
        triggerRect.bottom;

      const spaceAbove =
        triggerRect.top;

      let top;

      if (
        spaceBelow <
          popoverHeight +
            gap +
            viewportPadding &&
        spaceAbove >
          spaceBelow
      ) {
        top =
          triggerRect.top -
          popoverHeight -
          gap;
      } else {
        top =
          triggerRect.bottom +
          gap;
      }

      top =
        Math.max(
          viewportPadding,
          Math.min(
            top,
            window.innerHeight -
              popoverHeight -
              viewportPadding
          )
        );

      let left =
        triggerRect.left;

      left =
        Math.max(
          viewportPadding,
          Math.min(
            left,
            window.innerWidth -
              popoverWidth -
              viewportPadding
          )
        );

      setPopoverPosition({
        top,
        left,
        width:
          popoverWidth,
      });

      setPositioned(
        true
      );
    };

  // =======================================================
  // POSITION WHEN OPENED
  // =======================================================

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
          () => {
            updatePopoverPosition();
          }
        );

      return () => {
        cancelAnimationFrame(
          frame
        );
      };
    },
    [
      open,
      viewDate,
    ]
  );

  // =======================================================
  // REPOSITION ON SCROLL / RESIZE
  // =======================================================

  useEffect(
    () => {
      if (!open) {
        return undefined;
      }

      const reposition =
        () => {
          updatePopoverPosition();
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
      };
    },
    [
      open,
    ]
  );

  // =======================================================
  // CLOSE OUTSIDE
  // =======================================================

  useEffect(
    () => {
      if (!open) {
        return undefined;
      }

      const handleOutside =
        (
          event
        ) => {
          const clickedTrigger =
            triggerRef.current?.contains(
              event.target
            );

          const clickedPopover =
            popoverRef.current?.contains(
              event.target
            );

          if (
            !clickedTrigger &&
            !clickedPopover
          ) {
            setOpen(
              false
            );
          }
        };

      document.addEventListener(
        "mousedown",
        handleOutside
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handleOutside
        );
      };
    },
    [
      open,
    ]
  );

  // =======================================================
  // ESCAPE
  // =======================================================

  useEffect(
    () => {
      if (!open) {
        return undefined;
      }

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
        "keydown",
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      open,
    ]
  );

  // =======================================================
  // CALENDAR CELLS
  // =======================================================

  const calendarDays =
    useMemo(
      () => {
        const year =
          viewDate.getFullYear();

        const month =
          viewDate.getMonth();

        const firstDay =
          new Date(
            year,
            month,
            1
          );

        const firstWeekday =
          firstDay.getDay();

        const daysInMonth =
          new Date(
            year,
            month + 1,
            0
          ).getDate();

        const previousMonthDays =
          new Date(
            year,
            month,
            0
          ).getDate();

        const days = [];

        for (
          let index =
            firstWeekday -
            1;
          index >= 0;
          index--
        ) {
          days.push({
            date:
              new Date(
                year,
                month - 1,
                previousMonthDays -
                  index
              ),

            currentMonth:
              false,
          });
        }

        for (
          let day = 1;
          day <=
          daysInMonth;
          day++
        ) {
          days.push({
            date:
              new Date(
                year,
                month,
                day
              ),

            currentMonth:
              true,
          });
        }

        let nextDay =
          1;

        while (
          days.length <
          42
        ) {
          days.push({
            date:
              new Date(
                year,
                month + 1,
                nextDay
              ),

            currentMonth:
              false,
          });

          nextDay++;
        }

        return days;
      },
      [
        viewDate,
      ]
    );

  // =======================================================
  // MONTH NAVIGATION
  // =======================================================

  const previousMonth =
    () => {
      setViewDate(
        new Date(
          viewDate.getFullYear(),
          viewDate.getMonth() -
            1,
          1
        )
      );
    };

  const nextMonth =
    () => {
      setViewDate(
        new Date(
          viewDate.getFullYear(),
          viewDate.getMonth() +
            1,
          1
        )
      );
    };

  // =======================================================
  // SELECT DATE
  // =======================================================

  const selectDate =
    (
      date
    ) => {
      onChange?.(
        getDateKey(
          date
        )
      );

      setViewDate(
        date
      );

      setOpen(
        false
      );

      triggerRef.current?.focus();
    };

  // =======================================================
  // TODAY
  // =======================================================

  const chooseToday =
    () => {
      const today =
        new Date();

      onChange?.(
        getDateKey(
          today
        )
      );

      setViewDate(
        today
      );

      setOpen(
        false
      );

      triggerRef.current?.focus();
    };

  // =======================================================
  // CLEAR
  // =======================================================

  const clearDate =
    (
      event
    ) => {
      event.stopPropagation();

      onChange?.("");

      setOpen(
        false
      );

      triggerRef.current?.focus();
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
            className="study-date-popover study-date-popover-portal"
            style={{
              top:
                popoverPosition.top,

              left:
                popoverPosition.left,

              width:
                popoverPosition.width,

              visibility:
                positioned
                  ? "visible"
                  : "hidden",
            }}
          >

            <div className="study-date-header">

              <button
                type="button"
                onClick={
                  previousMonth
                }
                aria-label="Previous month"
              >
                <ChevronLeft
                  size={16}
                />
              </button>

              <strong>
                {viewDate.toLocaleDateString(
                  "en-IN",
                  {
                    month:
                      "long",

                    year:
                      "numeric",
                  }
                )}
              </strong>

              <button
                type="button"
                onClick={
                  nextMonth
                }
                aria-label="Next month"
              >
                <ChevronRight
                  size={16}
                />
              </button>

            </div>

            <div className="study-date-weekdays">

              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>

            </div>

            <div className="study-date-grid">

              {calendarDays.map(
                ({
                  date,
                  currentMonth,
                }) => {
                  const dateKey =
                    getDateKey(
                      date
                    );

                  const selected =
                    dateKey ===
                    value;

                  const today =
                    dateKey ===
                    getDateKey(
                      new Date()
                    );

                  return (
                    <button
                      type="button"
                      key={
                        dateKey
                      }
                      className={[
                        "study-date-day",

                        !currentMonth
                          ? "other-month"
                          : "",

                        selected
                          ? "selected"
                          : "",

                        today
                          ? "today"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " "
                        )}
                      onClick={() =>
                        selectDate(
                          date
                        )
                      }
                    >
                      {date.getDate()}
                    </button>
                  );
                }
              )}

            </div>

            <div className="study-date-footer">

              <button
                type="button"
                onClick={() => {
                  onChange?.("");

                  setOpen(
                    false
                  );

                  triggerRef.current?.focus();
                }}
              >
                Clear
              </button>

              <button
                type="button"
                className="study-date-today"
                onClick={
                  chooseToday
                }
              >
                Today
              </button>

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
      <div className="study-date-picker">

        <button
          ref={
            triggerRef
          }
          type="button"
          className={`study-date-trigger ${
            open
              ? "active"
              : ""
          }`}
          disabled={
            disabled
          }
          onClick={() => {
            if (
              disabled
            ) {
              return;
            }

            setOpen(
              (
                current
              ) =>
                !current
            );
          }}
          aria-haspopup="dialog"
          aria-expanded={
            open
          }
        >

          <CalendarDays
            size={15}
            aria-hidden="true"
          />

          <span
            className={
              value
                ? ""
                : "placeholder"
            }
          >
            {value
              ? formatDisplayDate(
                  value
                )
              : placeholder}
          </span>

          {value && (
            <span
              className="study-date-clear"
              onClick={
                clearDate
              }
              role="button"
              tabIndex={0}
              aria-label="Clear date"
            >
              <X
                size={13}
              />
            </span>
          )}

        </button>

      </div>

      {popover}

    </>
  );
}

export default StudyDatePicker;
