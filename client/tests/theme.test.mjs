import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTheme, readTheme, applyTheme, saveTheme } from "../src/services/theme.js";

test("only supported themes are accepted", () => {
  for (const theme of ["dark", "light", "coffee"]) assert.equal(normalizeTheme(theme), theme);
  for (const theme of [undefined, null, "", "unknown", "COFFEE"]) assert.equal(normalizeTheme(theme), "dark");
});

test("Coffee saves and applies to both document roots, and switching clears it", () => {
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
    saveTheme("light");
    for (const node of [root, body]) assert.deepEqual([...node.classList.values], ["light-theme"]);
    applyTheme("dark");
    for (const node of [root, body]) assert.equal(node.classList.values.size, 0);
    assert.deepEqual(events, ["studyos-theme-updated", "studyos-theme-updated"]);
  } finally {
    delete globalThis.document;
    delete globalThis.localStorage;
    delete globalThis.window;
  }
});
