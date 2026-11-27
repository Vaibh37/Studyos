// The preference is shared by the workspace and public pages.
export const THEME_KEY = "studyos_theme";
export const THEME_EVENT = "studyos-theme-updated";

export const ILLUSTRATED_THEMES = [
  { id: "ronin", label: "Ronin", description: "Misty fields and quiet discipline", light: false, color: "#202b27" },
  { id: "identity", label: "Identity", description: "Monochrome ink and paper", light: true, color: "#e4e1da" },
  { id: "ego", label: "Ego", description: "Vintage editorial collage", light: true, color: "#e6dcc8" },
  { id: "solitude", label: "Solitude", description: "Silent blue skies", light: false, color: "#153b4d" },
  { id: "victory", label: "Victory", description: "Urban blue and muted gold", light: false, color: "#263c43" },
  { id: "resolve", label: "Resolve", description: "Dusk and quiet resilience", light: false, color: "#262936" },
  { id: "silence", label: "Silence", description: "Warm amber and deep crimson", light: false, color: "#321a16" },
  { id: "patience", label: "Patience", description: "Soft morning sky and icy blues", light: true, color: "#dbeaf0" },
];

export function normalizeTheme(value) {
  return (["dark", "light", "coffee", "cloud", "rain", "stargaze"].includes(value) || ILLUSTRATED_THEMES.some(({ id }) => id === value)) ? value : "dark";
}

export function isLightTheme(value) {
  return ["light", "coffee", "cloud"].includes(value) || ILLUSTRATED_THEMES.some(({ id, light }) => id === value && light);
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
  const illustrated = ILLUSTRATED_THEMES.find(({ id }) => id === theme);
  for (const element of [document.documentElement, document.body]) {
    element.classList.toggle("light-theme", isLightTheme(theme));
    element.classList.toggle("coffee-theme", theme === "coffee");
    element.classList.toggle("cloud-theme", theme === "cloud");
    element.classList.toggle("rain-theme", theme === "rain");
    element.classList.toggle("stargaze-theme", theme === "stargaze");
    element.classList.toggle("illustrated-theme", Boolean(illustrated));
    for (const { id } of ILLUSTRATED_THEMES) element.classList.toggle(`${id}-theme`, theme === id);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content", illustrated?.color ?? { dark: "#0b0d12", light: "#f7f8fa", coffee: "#faf0df", cloud: "#a8bab9", rain: "#182935", stargaze: "#0b2038" }[theme]
  );
}

export function saveTheme(value) {
  const theme = normalizeTheme(value);
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}
