import { useLayoutEffect } from "react";

const selector = 'button, a[href], input:not([type="hidden"]), textarea, select, [tabindex]';
const tabbable = element => element.tabIndex >= 0 && !element.matches(":disabled") &&
  !element.closest("[inert]") && element.getClientRects().length > 0 &&
  getComputedStyle(element).visibility === "visible";

// Non-modal, portaled picker: enter it directly, dismiss on Escape, and leave
// in the trigger's logical tab order rather than at the end of document.body.
export default function usePickerFocus({ open, positioned, triggerRef, popoverRef, setOpen, initialSelector }) {
  useLayoutEffect(() => {
    if (!open || !positioned || !popoverRef.current) return;
    const popover = popoverRef.current;
    const initial = initialSelector && popover.querySelector(initialSelector);
    (initial || popover).focus({ preventScroll: true });
  }, [open, positioned, triggerRef, popoverRef]);

  const onKeyDown = event => {
    const popup = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popup || !trigger) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.focus({ preventScroll: true });
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...popup.querySelectorAll(selector)].filter(tabbable);
    const focused = document.activeElement;
    const current = items.indexOf(focused);
    // Explicit handling for a focused heading or an edge of the popup.
    if (focused === popup && items.length) {
      event.preventDefault();
      (event.shiftKey ? items.at(-1) : items[0]).focus();
      return;
    }
    if (items.length && current !== -1 && (event.shiftKey ? current > 0 : current < items.length - 1)) return;
    event.preventDefault();
    const modal = trigger.closest('[aria-modal="true"]');
    const others = [...(modal || document.body).querySelectorAll(selector)].filter(
      element => !popup.contains(element) && tabbable(element)
    );
    const index = others.indexOf(trigger);
    const next = others[index + (event.shiftKey ? -1 : 1)] ||
      (modal && (event.shiftKey ? others.at(-1) : others[0])) || trigger;
    setOpen(false);
    next.focus();
  };
  const onBlur = event => {
    if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== triggerRef.current) {
      setOpen(false);
    }
  };
  return { onKeyDown, onBlur };
}
