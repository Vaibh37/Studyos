// Bound an operation even when its underlying promise does not support abort.
// The signal also cancels native fetch, including a pending response body.
export function withDeadline(operation, { timeoutMs, signal: parent, timeoutError } = {}) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parent.reason || new DOMException("Request cancelled", "AbortError"));
  if (parent?.aborted) abortFromParent();
  else parent?.addEventListener("abort", abortFromParent, { once: true });

  let timer, onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(controller.signal.reason || new DOMException("Request cancelled", "AbortError"));
    if (controller.signal.aborted) onAbort();
    else controller.signal.addEventListener("abort", onAbort, { once: true });
  });
  if (!controller.signal.aborted && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(timeoutError?.() || new Error("Request timed out")), timeoutMs);
  }
  const work = Promise.resolve().then(() => {
    if (controller.signal.aborted) throw controller.signal.reason;
    return operation(controller.signal);
  });
  return Promise.race([work, aborted]).finally(() => {
    clearTimeout(timer);
    controller.signal.removeEventListener("abort", onAbort);
    parent?.removeEventListener("abort", abortFromParent);
  });
}

export const isModuleLoadFailure = error => error?.code === "MODULE_LOAD_TIMEOUT" ||
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|loading chunk .+ failed|failed to load module script/i.test(String(error?.message || ""));

// Dynamic imports can't be aborted, but an unresolved import must not leave
// a permanent skeleton. Don't automatically reload (there may be unsaved work).
export function loadModuleWithDeadline(loader, timeoutMs = 30_000) {
  return withDeadline(loader, {
    timeoutMs,
    timeoutError: () => Object.assign(new Error("Page assets took too long to load"), { code: "MODULE_LOAD_TIMEOUT" }),
  });
}
