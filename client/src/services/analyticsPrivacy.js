// Optional audience measurement is off until explicitly enabled in this browser.
// A failed storage read, an unknown preference or Global Privacy Control all
// fail closed. Never collect workspace or sign-in page visits.
export const ANALYTICS_PREFERENCE_KEY = "studyos_optional_analytics_v1";
export const allowedAnalyticsPaths = new Set(["/", "/privacy", "/terms", "/contact"]);

export function analyticsAllowed(storage, globalPrivacyControl = false) {
  if (globalPrivacyControl) return false;
  try { return storage?.getItem(ANALYTICS_PREFERENCE_KEY) === "allow"; }
  catch { return false; }
}

export function filterAnalyticsEvent(event, { allowed, currentURL }) {
  if (!allowed || event?.type !== "pageview") return null;
  try {
    const current = new URL(currentURL);
    const eventURL = new URL(event.url, current);
    if (current.origin !== eventURL.origin ||
        !allowedAnalyticsPaths.has(current.pathname) ||
        !allowedAnalyticsPaths.has(eventURL.pathname)) return null;
    // Discard URL parameters entirely: they may contain invitation codes or
    // other sensitive values, even on a seemingly public page.
    return { ...event, url: current.origin + eventURL.pathname };
  } catch { return null; }
}

let sessionDenied = false;

export function browserAnalyticsAllowed() {
  if (sessionDenied) return false;
  try { return analyticsAllowed(window.localStorage, navigator.globalPrivacyControl === true); }
  catch { return false; }
}

export function setBrowserAnalyticsAllowed(allow) {
  if (!allow) sessionDenied = true;
  try {
    window.localStorage.setItem(ANALYTICS_PREFERENCE_KEY, allow ? "allow" : "deny");
    sessionDenied = false;
    window.dispatchEvent(new Event("studyos-analytics-preference"));
    return true;
  } catch {
    sessionDenied = true;
    window.dispatchEvent(new Event("studyos-analytics-preference"));
    return false;
  }
}
