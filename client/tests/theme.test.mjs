import assert from "node:assert/strict";
import test from "node:test";
import { ILLUSTRATED_THEMES, normalizeTheme, isLightTheme, readTheme, applyTheme, saveTheme } from "../src/services/theme.js";

test("only supported themes are accepted", () => {
  for (const theme of ["dark", "light", "coffee", "cloud", "rain", "stargaze"]) assert.equal(normalizeTheme(theme), theme);
  for (const { id } of ILLUSTRATED_THEMES) assert.equal(normalizeTheme(id), id);
  for (const theme of [undefined, null, "", "unknown", "COFFEE"]) assert.equal(normalizeTheme(theme), "dark");
});

test("Theme selection persists, and switching between light and dark themes clears old classes", () => {
  const element = () => ({ classList: { values: new Set(), toggle(name, enabled) {
    enabled ? this.values.add(name) : this.values.delete(name);
  } } });
  const root = element();
  const body = element();
  const preferences = new Map();
  let color;
  const events = [];
  globalThis.document = { documentElement: root, body, querySelector: () => ({ setAttribute: (_, value) => { color = value; } }) };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => preferences.get(key), setItem: (key, value) => preferences.set(key, value),
  } });
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  try {
    saveTheme("coffee");
    assert.equal(readTheme(), "coffee");
    assert.equal(color, "#faf0df");
    for (const node of [root, body]) assert.deepEqual([...node.classList.values], ["light-theme", "coffee-theme"]);
    saveTheme("cloud");
    assert.equal(readTheme(), "cloud");
    assert.equal(color, "#a8bab9");
    for (const node of [root, body]) assert.deepEqual([...node.classList.values], ["light-theme", "cloud-theme"]);
    saveTheme("rain");
    assert.equal(readTheme(), "rain");
    assert.equal(color, "#182935");
    assert.equal(isLightTheme("rain"), false);
    assert.equal(isLightTheme("cloud"), true);
    for (const node of [root, body]) assert.deepEqual([...node.classList.values], ["rain-theme"]);
    saveTheme("stargaze");
    assert.equal(readTheme(), "stargaze");
    assert.equal(color, "#0b2038");
    assert.equal(isLightTheme("stargaze"), false);
    for (const node of [root, body]) assert.deepEqual([...node.classList.values], ["stargaze-theme"]);
    // Reloading from the stored preference restores the same class.
    applyTheme(readTheme());
    for (const node of [root, body]) assert.deepEqual([...node.classList.values], ["stargaze-theme"]);
    for (const { id, color: themeColor, light } of ILLUSTRATED_THEMES) {
      saveTheme(id);
      assert.equal(readTheme(), id);
      assert.equal(isLightTheme(id), light);
      assert.equal(color, themeColor);
      const expected = light ? ["light-theme", "illustrated-theme", `${id}-theme`] : ["illustrated-theme", `${id}-theme`];
      for (const node of [root, body]) assert.deepEqual([...node.classList.values].sort(), expected.sort());
      applyTheme(readTheme());
      for (const node of [root, body]) assert.deepEqual([...node.classList.values].sort(), expected.sort());
    }
    saveTheme("light");
    for (const node of [root, body]) assert.deepEqual([...node.classList.values], ["light-theme"]);
    applyTheme("dark");
    for (const node of [root, body]) assert.equal(node.classList.values.size, 0);
    assert.deepEqual(events, Array(5 + ILLUSTRATED_THEMES.length).fill("studyos-theme-updated"));
  } finally {
    delete globalThis.document;
    delete globalThis.localStorage;
    delete globalThis.window;
  }
});
