import { useLayoutEffect, useRef } from "react";

const focusSelector = 'button, a[href], input:not([type="hidden"]), select, textarea, [contenteditable="true"], [tabindex]';
const stack = [];
const canFocus = element => element instanceof HTMLElement && element.isConnected &&
  !element.closest("[inert]") && !element.matches(":disabled") &&
  element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
const tabbable = element => canFocus(element) && element.tabIndex >= 0;

// Preserve the existing layout and portal layering, while making a modal
// genuinely modal for both keyboard users and assistive technology.
export function useDialogFocus(ref, active, onDismiss, initialFocus) {
  const latest = useRef({ onDismiss, initialFocus });
  latest.current = { onDismiss, initialFocus };
  useLayoutEffect(() => {
    if (!active || !ref.current) return;
    const surface = ref.current;
    const opener = document.activeElement;
    const entry = { surface };
    const changed = [];
    stack.push(entry);

    // The backdrop remains usable; everything outside this branch is inert.
    for (let branch = surface; branch.parentElement; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.inert && !sibling.hasAttribute("data-dialog-backdrop")) {
          sibling.inert = true;
          changed.push(sibling);
        }
      }
      if (branch.parentElement === document.body) break;
    }

    const top = () => stack.at(-1) === entry;
    const elements = () => [...surface.querySelectorAll(focusSelector)].filter(tabbable);
    const initial = () => {
      const preferred = latest.current.initialFocus && surface.querySelector(latest.current.initialFocus);
      const cancel = [...surface.querySelectorAll("button")].find(button => button.textContent.trim() === "Cancel");
      return (canFocus(preferred) && preferred) || (canFocus(cancel) && cancel) || elements()[0] || surface;
    };
    const popupFor = element => {
      const popup = element?.closest?.("[data-study-popover]");
      if (!popup?.id) return false;
      return [...surface.querySelectorAll("[aria-controls]")].some(trigger =>
        trigger.getAttribute("aria-controls") === popup.id && trigger.getAttribute("aria-expanded") === "true"
      );
    };
    const contains = target => surface.contains(target) || popupFor(target);
    const handleFocus = event => {
      if (top() && !contains(event.target)) initial().focus({ preventScroll: true });
    };
    const handleKey = event => {
      if (!top() || event.defaultPrevented) return;
      const focused = document.activeElement;
      // A native dialog opened inside this surface (e.g. the editor's
      // link dialog) has the browser's own focus boundary and cancel event.
      if (focused?.closest?.("dialog[open]") && surface.contains(focused)) return;
      // A control's open popover owns Escape and its own keyboard navigation.
      const controls = focused?.getAttribute("aria-controls");
      if (popupFor(focused) || (event.key === "Escape" && controls && focused.getAttribute("aria-expanded") === "true" &&
          document.getElementById(controls)?.matches("[data-study-popover]"))) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        latest.current.onDismiss?.();
      } else if (event.key === "Tab") {
        const items = elements();
        const index = items.indexOf(focused);
        if (!items.length || index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
          event.preventDefault();
          (items.length ? items[event.shiftKey ? items.length - 1 : 0] : surface).focus();
        }
      }
    };
    initial().focus({ preventScroll: true });
    document.addEventListener("focusin", handleFocus);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("keydown", handleKey, true);
      stack.splice(stack.indexOf(entry), 1);
      changed.forEach(element => { element.inert = false; });
      if (opener !== document.body && canFocus(opener)) opener.focus({ preventScroll: true });
      else {
        const fallback = stack.at(-1)?.surface || document.getElementById("workspace-main");
        if (canFocus(fallback)) fallback.focus({ preventScroll: true });
      }
    };
  }, [active, ref]);
}

export default function DialogSurface({
  as: Element = "div", active = true, onDismiss, initialFocus, ref: externalRef,
  role = "dialog", children, ...props
}) {
  const ref = useRef(null);
  useDialogFocus(ref, active, onDismiss, initialFocus);
  return (
    <Element {...props} ref={node => {
      ref.current = node;
      if (typeof externalRef === "function") externalRef(node);
      else if (externalRef) externalRef.current = node;
    }} role={active ? role : undefined}
      data-dialog-surface={active ? "" : undefined} aria-modal={active ? "true" : undefined} tabIndex={active ? -1 : undefined}>
      {children}
    </Element>
  );
}
