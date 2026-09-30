import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import "./StudySelect.css";

const GAP = 7;
const VIEWPORT_PADDING = 10;

function StudySelect({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  className = "",
  disabled = false,
  ariaLabel = "Select option",
}) {
  const anchorRef =
    useRef(null);

  const menuRef =
    useRef(null);

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    position,
    setPosition,
  ] = useState({
    top: 0,
    left: 0,
    width: 180,
    maxHeight: 260,
  });

  const selectedOption =
    options.find(
      (option) =>
        String(
          option.value
        ) ===
        String(
          value
        )
    ) ||
    null;

  // =======================================================
  // POSITION MENU
  // =======================================================

  const updatePosition =
    () => {
      const anchor =
        anchorRef.current;

      if (!anchor) {
        return;
      }

      const rect =
        anchor.getBoundingClientRect();

      const viewportWidth =
        window.innerWidth;

      const viewportHeight =
        window.innerHeight;

      const preferredWidth =
        Math.max(
          rect.width,
          190
        );

      const width =
        Math.min(
          preferredWidth,
          viewportWidth -
            VIEWPORT_PADDING *
              2
        );

      const estimatedHeight =
        Math.min(
          Math.max(
            options.length *
              44 +
              12,
            70
          ),
          300
        );

      const spaceBelow =
        viewportHeight -
        rect.bottom -
        VIEWPORT_PADDING;

      const spaceAbove =
        rect.top -
        VIEWPORT_PADDING;

      const openUp =
        spaceBelow <
          Math.min(
            estimatedHeight,
            180
          ) &&
        spaceAbove >
          spaceBelow;

      const availableSpace =
        openUp
          ? spaceAbove
          : spaceBelow;

      const maxHeight =
        Math.max(
          90,
          Math.min(
            300,
            availableSpace -
              GAP
          )
        );

      let left =
        rect.left;

      if (
        left + width >
        viewportWidth -
          VIEWPORT_PADDING
      ) {
        left =
          viewportWidth -
          VIEWPORT_PADDING -
          width;
      }

      left =
        Math.max(
          VIEWPORT_PADDING,
          left
        );

      const visibleMenuHeight =
        Math.min(
          estimatedHeight,
          maxHeight
        );

      const top =
        openUp
          ? Math.max(
              VIEWPORT_PADDING,
              rect.top -
                visibleMenuHeight -
                GAP
            )
          : Math.min(
              viewportHeight -
                VIEWPORT_PADDING,
              rect.bottom +
                GAP
            );

      setPosition({
        top,
        left,
        width,
        maxHeight,
      });
    };

  // =======================================================
  // POSITION BEFORE PAINT
  // =======================================================

  useLayoutEffect(
    () => {
      if (!open) {
        return;
      }

      updatePosition();
    },
    [
      open,
      options.length,
    ]
  );

  // =======================================================
  // OPEN MENU EVENTS
  // =======================================================

  useEffect(
    () => {
      if (!open) {
        return undefined;
      }

      const handlePointerDown =
        (
          event
        ) => {
          const target =
            event.target;

          if (
            anchorRef.current?.contains(
              target
            ) ||
            menuRef.current?.contains(
              target
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

            anchorRef.current?.focus();

            return;
          }

          if (
            event.key ===
              "ArrowDown" ||
            event.key ===
              "ArrowUp"
          ) {
            const buttons =
              menuRef.current?.querySelectorAll(
                ".study-select-option:not(:disabled)"
              );

            if (
              !buttons ||
              buttons.length ===
                0
            ) {
              return;
            }

            event.preventDefault();

            const currentIndex =
              Array.from(
                buttons
              ).findIndex(
                (
                  button
                ) =>
                  button ===
                  document.activeElement
              );

            let nextIndex;

            if (
              event.key ===
              "ArrowDown"
            ) {
              nextIndex =
                currentIndex <
                0
                  ? 0
                  : (
                      currentIndex +
                      1
                    ) %
                    buttons.length;
            } else {
              nextIndex =
                currentIndex <
                0
                  ? buttons.length -
                    1
                  : (
                      currentIndex -
                      1 +
                      buttons.length
                    ) %
                    buttons.length;
            }

            buttons[
              nextIndex
            ]?.focus();
          }
        };

      const handleViewportChange =
        () => {
          updatePosition();
        };

      document.addEventListener(
        "mousedown",
        handlePointerDown
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      window.addEventListener(
        "resize",
        handleViewportChange
      );

      window.addEventListener(
        "scroll",
        handleViewportChange,
        true
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );

        window.removeEventListener(
          "resize",
          handleViewportChange
        );

        window.removeEventListener(
          "scroll",
          handleViewportChange,
          true
        );
      };
    },
    [
      open,
      options.length,
    ]
  );

  // =======================================================
  // DISABLED STATE
  // =======================================================

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
  // SELECT OPTION
  // =======================================================

  const chooseOption =
    (
      option
    ) => {
      if (
        option.disabled
      ) {
        return;
      }

      onChange?.(
        option.value
      );

      setOpen(
        false
      );

      anchorRef.current?.focus();
    };

  // =======================================================
  // UI
  // =======================================================

  return (
    <div
      className={`study-select ${className}`.trim()}
    >

      <button
        ref={
          anchorRef
        }
        type="button"
        className={`study-select-trigger ${
          open
            ? "open"
            : ""
        }`}
        onClick={() => {
          if (
            !disabled
          ) {
            setOpen(
              (
                current
              ) =>
                !current
            );
          }
        }}
        disabled={
          disabled
        }
        aria-label={
          ariaLabel
        }
        aria-haspopup="listbox"
        aria-expanded={
          open
        }
      >

        <span className="study-select-trigger-value">

          {selectedOption?.color && (
            <span
              className="study-select-color-dot"
              style={{
                "--study-select-dot":
                  selectedOption.color,
              }}
            />
          )}

          <span className="study-select-trigger-label">
            {selectedOption?.label ||
              placeholder}
          </span>

        </span>

        <ChevronDown
          size={15}
          className="study-select-chevron"
          aria-hidden="true"
        />

      </button>

      {open &&
        typeof document !==
          "undefined" &&
        createPortal(
          <div
            ref={
              menuRef
            }
            className="study-select-menu"
            role="listbox"
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

              maxHeight:
                position.maxHeight,
            }}
          >

            {options.length ===
            0 ? (
              <div className="study-select-empty">
                No options
              </div>
            ) : (
              options.map(
                (
                  option
                ) => {
                  const active =
                    String(
                      option.value
                    ) ===
                    String(
                      value
                    );

                  return (
                    <button
                      key={
                        String(
                          option.value
                        )
                      }
                      type="button"
                      className={`study-select-option ${
                        active
                          ? "active"
                          : ""
                      }`}
                      role="option"
                      aria-selected={
                        active
                      }
                      disabled={
                        option.disabled
                      }
                      onClick={() =>
                        chooseOption(
                          option
                        )
                      }
                    >

                      <span className="study-select-option-main">

                        {option.color && (
                          <span
                            className="study-select-color-dot"
                            style={{
                              "--study-select-dot":
                                option.color,
                            }}
                          />
                        )}

                        <span className="study-select-option-copy">

                          <strong>
                            {option.label}
                          </strong>

                          {option.description && (
                            <small>
                              {option.description}
                            </small>
                          )}

                        </span>

                      </span>

                      {active && (
                        <Check
                          size={14}
                          className="study-select-check"
                          aria-hidden="true"
                        />
                      )}

                    </button>
                  );
                }
              )
            )}

          </div>,
          document.body
        )}

    </div>
  );
}

export default StudySelect;
