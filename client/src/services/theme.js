// The preference is shared by the workspace and public pages.
export const THEME_KEY = "studyos_theme";
export const THEME_EVENT = "studyos-theme-updated";

export function normalizeTheme(value) {
  return ["dark", "light", "coffee", "cloud"].includes(value) ? value : "dark";
}

export function readTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "dark";
  }
}

export function applyTheme(value) {
  const theme = normalizeTheme(value);
  for (const element of [document.documentElement, document.body]) {
    element.classList.toggle("light-theme", theme !== "dark");
    element.classList.toggle("coffee-theme", theme === "coffee");
    element.classList.toggle("cloud-theme", theme === "cloud");
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content", { dark: "#0b0d12", light: "#f7f8fa", coffee: "#faf0df", cloud: "#a8bab9" }[theme]
  );
}

export function saveTheme(value) {
  const theme = normalizeTheme(value);
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}
