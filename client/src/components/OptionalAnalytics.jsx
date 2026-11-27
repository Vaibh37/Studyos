import { useLocation } from "react-router";
import { lazy, Suspense } from "react";
import RecoveryBoundary from "./RecoveryBoundary";
const Analytics = lazy(() => import("@vercel/analytics/react").then(module => ({ default: module.Analytics })));
import useAnalyticsPreference from "../hooks/useAnalyticsPreference";
import {
  allowedAnalyticsPaths,
  browserAnalyticsAllowed,
  filterAnalyticsEvent,
} from "../services/analyticsPrivacy";

const beforeSend = event => filterAnalyticsEvent(event, {
  // Read again for every event: the analytics script may remain on the page
  // after React unmounts it, or another tab may revoke permission.
  allowed: browserAnalyticsAllowed(),
  currentURL: window.location.href,
});

export default function OptionalAnalytics() {
  const enabled = useAnalyticsPreference();
  const { pathname } = useLocation();
  return enabled && allowedAnalyticsPaths.has(pathname)
    ? <RecoveryBoundary silent><Suspense fallback={null}><Analytics beforeSend={beforeSend} /></Suspense></RecoveryBoundary>
    : null;
}
