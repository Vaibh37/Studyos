const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
let scriptPromise = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Security check unavailable"));
      script.onerror = () => reject(new Error("Security check unavailable"));
      document.head.appendChild(script);
    }).catch(error => {
      scriptPromise = null;
      throw error;
    });
  }
  return scriptPromise;
}

// Called on user-triggered group creation/join. The widget is invisible
// unless Cloudflare determines an interactive check is needed.
export async function getTurnstileToken(action) {
  if (!SITE_KEY) return null;
  const turnstile = await loadTurnstile();
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;bottom:16px;left:16px;z-index:2147483000;";
    document.body.appendChild(container);
    let widgetId;
    let settled = false;
    const cleanup = (error, token) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (widgetId !== undefined) {
        try { turnstile.remove(widgetId); } catch { /* already removed */ }
      }
      container.remove();
      if (error) reject(error);
      else resolve(token);
    };
    const timeout = setTimeout(
      () => cleanup(new Error("Security check timed out. Please retry.")),
      45000
    );
    try {
      widgetId = turnstile.render(container, {
        sitekey: SITE_KEY,
        action,
        execution: "execute",
        appearance: "interaction-only",
        callback: token => cleanup(null, token),
        "error-callback": () => cleanup(new Error("Security check failed. Please retry.")),
        "expired-callback": () => cleanup(new Error("Security check expired. Please retry.")),
      });
      turnstile.execute(widgetId);
    } catch {
      cleanup(new Error("Security check unavailable. Please retry."));
    }
  });
}
