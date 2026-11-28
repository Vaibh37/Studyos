import { loadModuleWithDeadline } from "./deadline.js";
const loaders = {
  dashboard: () => import("../pages/Dashboard"),
  tasks: () => import("../pages/Tasks"),
  subjects: () => import("../pages/Subjects"),
  notes: () => import("../pages/Notes"),
  flashcards: () => import("../pages/Flashcards"),
  calendar: () => import("../pages/Calendar"),
  focus: () => import("../pages/Focus"),
  progress: () => import("../pages/Progress"),
  leaderboard: () => import("../pages/Leaderboard"),
  "study-rooms": () => import("../pages/StudyRooms"),
  groups: () => import("../pages/Groups"),
  chats: () => import("../pages/Chats"),
  settings: () => import("../pages/Settings"),
};
export function getStartupPage() {
  let saved;
  try { saved = localStorage.getItem("studyos_startup_page"); } catch { /* Storage disabled. */ }
  return Object.hasOwn(loaders, saved) ? saved : "dashboard";
}
const flights = new Map();
export function loadWorkspacePage(page) {
  if (!Object.hasOwn(loaders, page)) return Promise.reject(new Error("Unknown workspace route"));
  if (!flights.has(page)) {
    flights.set(page, loadModuleWithDeadline(loaders[page]).catch(error => {
      flights.delete(page);
      throw error;
    }));
  }
  return flights.get(page);
}
export function canSpeculate() {
  if (typeof navigator === "undefined" || navigator.onLine === false) return false;
  const connection = navigator.connection;
  return !connection?.saveData && !["slow-2g", "2g", "3g"].includes(connection?.effectiveType);
}
export function preloadWorkspacePath(path) {
  if (!canSpeculate()) return;
  const page = path.split("/")[2];
  if (Object.hasOwn(loaders, page)) void loadWorkspacePage(page).catch(() => {});
}
// Warm only two high-frequency destinations after the current page settles.
// No speculative API calls; never load the heavy editor or community transport.
export function scheduleWorkspaceWarmup(pathname) {
  if (!canSpeculate()) return () => {};
  const candidates = ["/app/dashboard", "/app/tasks", "/app/focus"].filter(path => path !== pathname).slice(0, 2);
  const run = () => {
    if (document.visibilityState !== "visible" || !canSpeculate()) return;
    for (const path of candidates) preloadWorkspacePath(path);
  };
  // Give the current route's rendering and requests priority.
  let idle = null;
  const timer = setTimeout(() => {
    if ("requestIdleCallback" in window) idle = window.requestIdleCallback(run, { timeout: 1800 });
    else run();
  }, 1000);
  return () => { clearTimeout(timer); if (idle !== null) window.cancelIdleCallback(idle); };
}
