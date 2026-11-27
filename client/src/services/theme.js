// The preference is shared by the workspace and public pages.
export const THEME_KEY = "studyos_theme";
export const THEME_EVENT = "studyos-theme-updated";

export function normalizeTheme(value) {
  return ["dark", "light", "coffee", "cloud", "rain"].includes(value) ? value : "dark";
}

export function isLightTheme(value) {
  return ["light", "coffee", "cloud"].includes(value);
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
    element.classList.toggle("light-theme", isLightTheme(theme));
    element.classList.toggle("coffee-theme", theme === "coffee");
    element.classList.toggle("cloud-theme", theme === "cloud");
    element.classList.toggle("rain-theme", theme === "rain");
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content", { dark: "#0b0d12", light: "#f7f8fa", coffee: "#faf0df", cloud: "#a8bab9", rain: "#182935" }[theme]
  );
}

export function saveTheme(value) {
  const theme = normalizeTheme(value);
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}
