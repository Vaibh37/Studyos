import { useSyncExternalStore } from "react";
import { browserAnalyticsAllowed } from "../services/analyticsPrivacy";

function subscribe(listener) {
  window.addEventListener("storage", listener);
  window.addEventListener("studyos-analytics-preference", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("studyos-analytics-preference", listener);
  };
}

export default function useAnalyticsPreference() {
  return useSyncExternalStore(subscribe, browserAnalyticsAllowed, () => false);
}
