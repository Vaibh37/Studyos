import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "./icons";
import { createPortal } from "react-dom";
import "./StudySelect.css";

const GAP = 7;
const VIEWPORT_PADDING = 10;

function StudySelect({
  value, onChange, options = [], placeholder = "Select", className = "",
  disabled = false, ariaLabel = "Select option",
}) {
  const id = useId();
  const menuId = `${id}-listbox`;
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const typed = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 180, maxHeight: 260 });
  const selectedIndex = options.findIndex(option => String(option.value) === String(value));
  const selectedOption = options[selectedIndex];
  const enabled = options.flatMap((option, index) => option.disabled ? [] : [index]);
  const optionId = index => `${id}-option-${index}`;

  function updatePosition() {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 190), window.innerWidth - VIEWPORT_PADDING * 2);
    const estimatedHeight = Math.min(Math.max(options.length * 44 + 12, 70), 300);
    const below = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const above = rect.top - VIEWPORT_PADDING;
    const openUp = below < Math.min(estimatedHeight, 180) && above > below;
    const maxHeight = Math.max(90, Math.min(300, (openUp ? above : below) - GAP));
    const left = Math.max(VIEWPORT_PADDING, Math.min(rect.left, window.innerWidth - VIEWPORT_PADDING - width));
    const top = openUp
      ? Math.max(VIEWPORT_PADDING, rect.top - Math.min(estimatedHeight, maxHeight) - GAP)
      : Math.min(window.innerHeight - VIEWPORT_PADDING, rect.bottom + GAP);
    setPosition({ top, left, width, maxHeight });
  }

  function openMenu(direction = 1) {
    if (disabled) return;
    setActive(enabled.includes(selectedIndex) ? selectedIndex : (direction < 0 ? enabled.at(-1) : enabled[0]) ?? -1);
    typed.current = { text: "", time: 0 };
    setOpen(true);
  }

  function choose(index) {
    if (!options[index] || options[index].disabled) return;
    onChange?.(options[index].value);
    setOpen(false);
    anchorRef.current?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, options.length]);

  useLayoutEffect(() => {
    if (!open || active < 0) return;
    const item = document.getElementById(optionId(active));
    const menu = menuRef.current;
    if (!item || !menu) return;
    const r = item.getBoundingClientRect(), m = menu.getBoundingClientRect();
    if (r.top < m.top) menu.scrollTop -= m.top - r.top + 4;
    else if (r.bottom > m.bottom) menu.scrollTop += r.bottom - m.bottom + 4;
  }, [open, active, position.top]);

  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!anchorRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (open && !enabled.includes(active)) setActive(enabled.includes(selectedIndex) ? selectedIndex : enabled[0] ?? -1);
  }, [open, active, options, selectedIndex]);

  function onKeyDown(event) {
    if (disabled) return;
    const { key } = event;
    const handled = () => { event.preventDefault(); event.stopPropagation(); };
    if (key === "Tab") { setOpen(false); return; }
    if (key === "Escape" && open) { handled(); setOpen(false); return; }
    if (key === "ArrowDown" || key === "ArrowUp") {
      handled();
      const direction = key === "ArrowDown" ? 1 : -1;
      if (!open) openMenu(direction);
      else if (enabled.length) {
        const index = enabled.indexOf(active);
        setActive(enabled[(index + direction + enabled.length) % enabled.length]);
      }
      return;
    }
    if (key === "Home" || key === "End") {
      handled();
      if (!open) openMenu();
      setActive((key === "Home" ? enabled[0] : enabled.at(-1)) ?? -1);
      return;
    }
    if (key === "Enter" || key === " ") {
      handled();
      if (!open) openMenu();
      else if (active >= 0) choose(active);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      handled();
      if (!open) openMenu();
      const now = Date.now();
      const prefix = (now - typed.current.time < 700 ? typed.current.text : "") + key.toLocaleLowerCase();
      typed.current = { text: prefix, time: now };
      const start = enabled.indexOf(active);
      const ordered = enabled.slice(start + 1).concat(enabled.slice(0, start + 1));
      const match = ordered.find(index => String(options[index].label).toLocaleLowerCase().startsWith(prefix));
      if (match !== undefined) setActive(match);
    }
  }

  return (
    <div className={`study-select ${className}`.trim()}>
      <button ref={anchorRef} type="button" role="combobox"
        className={`study-select-trigger ${open ? "open" : ""}`}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={onKeyDown} onBlur={() => setOpen(false)}
        disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox"
        aria-expanded={open} aria-controls={open ? menuId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-describedby={`${id}-value`}>
        <span className="study-select-trigger-value">
          {selectedOption?.color && <span className="study-select-color-dot" style={{ "--study-select-dot": selectedOption.color }} />}
          <span id={`${id}-value`} className="study-select-trigger-label">{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown size={15} className="study-select-chevron" aria-hidden="true" />
      </button>
      {open && createPortal(
        <div ref={menuRef} id={menuId} data-study-popover className="study-select-menu"
          role="listbox" aria-label={ariaLabel} style={position}>
          {!options.length ? <div className="study-select-empty">No options</div> :
            options.map((option, index) => {
              const selected = index === selectedIndex;
              return (
                <button key={String(option.value)} id={optionId(index)} type="button" tabIndex={-1}
                  className={`study-select-option ${selected ? "active" : ""} ${index === active ? "is-highlighted" : ""}`}
                  role="option" aria-selected={selected} aria-disabled={option.disabled || undefined}
                  disabled={option.disabled} onMouseDown={event => event.preventDefault()}
                  onClick={() => choose(index)}>
                  <span className="study-select-option-main">
                    {option.color && <span className="study-select-color-dot" style={{ "--study-select-dot": option.color }} />}
                    <span className="study-select-option-copy">
                      <strong>{option.label}</strong>
                      {option.description && <small>{option.description}</small>}
                    </span>
                  </span>
                  {selected && <Check size={14} className="study-select-check" aria-hidden="true" />}
                </button>
              );
            })}
        </div>, document.body)}
    </div>
  );
}
export default StudySelect;
