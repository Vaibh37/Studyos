import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

if (process.env.STUDYOS_E2E !== "isolated-local-only") throw Error("Isolated E2E opt-in required");
if (!process.env.PLAYWRIGHT_MODULE) throw Error("Set PLAYWRIGHT_MODULE to the installed Playwright index.mjs");
const { chromium, devices } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
const WEB = "http://127.0.0.1:5174";
const API = "http://127.0.0.1:5500";
const AUTH = "http://127.0.0.1:9099";
const STORE = "http://127.0.0.1:5560";
const ALLOWED = new Set([WEB, API, AUTH, STORE]);
const runId = randomUUID().slice(0, 8);
const secret = randomUUID();
const label = name => name + " " + runId;
const outputs = process.env.E2E_ARTIFACT_DIR;
const children = [];
const contexts = [];
let browser;

function start(script) {
  const child = spawn(process.execPath, [join(root, script)], {
    cwd: root, env: process.env, stdio: "inherit",
  });
  children.push(child);
  return child;
}
async function waitReady(url, validate = () => true) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (children.some(child => child.exitCode !== null)) throw Error("Isolated application process exited");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000), redirect: "error" });
      if (response.ok && await validate(response)) return;
    } catch { /* start-up retry */ }
    await delay(500);
  }
  throw Error("Local test service never became ready: " + url);
}
async function stop(child) {
  if (child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([exited, delay(8000, undefined, { ref: false })]);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}
const exact = (page, role, name) => page.getByRole(role, { name, exact: true });
const button = (page, name) => exact(page, "button", name);
async function visible(locator, timeout = 20_000) {
  await locator.waitFor({ state: "visible", timeout });
}
async function absent(locator) {
  await locator.waitFor({ state: "hidden", timeout: 20_000 });
}
async function responseFor(page, method, path, action, timeout = 25_000) {
  const waiting = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === API && response.request().method() === method && path.test(url.pathname);
  }, { timeout });
  const [response] = await Promise.all([waiting, action()]);
  assert(response.ok(), method + " " + path + " returned " + response.status());
  return response;
}
async function go(page, path, heading) {
  await page.goto(WEB + path, { waitUntil: "domcontentloaded" });
  await visible(page.getByRole("heading", { name: heading, exact: true }));
}
async function newPage(mobile = false) {
  const context = await browser.newContext({
    ...(mobile ? devices["Pixel 7"] : { viewport: { width: 1440, height: 1000 } }),
    reducedMotion: "reduce", acceptDownloads: true, serviceWorkers: "block",
  });
  contexts.push(context);
  // Enforced independently from the test bundle's hardcoded endpoint settings.
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return ALLOWED.has(url.origin) || ["blob:", "data:"].includes(url.protocol)
      ? route.continue() : route.abort("blockedbyclient");
  });
  await context.routeWebSocket("**/*", ws => {
    const url = new URL(ws.url());
    if (url.protocol === "ws:" && url.hostname === "127.0.0.1" && url.port === "5500") ws.connectToServer();
    else ws.close({ code: 1008, reason: "Isolated E2E: external WebSocket blocked" });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return { context, page };
}
const credentials = name => ({ name: label(name), email: name.toLowerCase() + "." + runId + "@example.invalid", secret });
async function emailForm(page, account, register) {
  await page.goto(WEB + "/get-started", { waitUntil: "domcontentloaded" });
  await visible(button(page, "Continue with Email"));
  await button(page, "Continue with Email").click();
  if (register) {
    await button(page, "Create account").click();
    await page.getByPlaceholder("Your name").fill(account.name);
  }
  await page.getByPlaceholder("you@example.com").fill(account.email);
  await page.locator('input[type="password"]').fill(account.secret);
  await button(page, register ? "Create Account" : "Sign In").click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
  await visible(page.getByRole("main"));
}
async function signOut(page) {
  await go(page, "/app/settings", "Settings");
  await button(page, "Sign out").click();
  await visible(button(page, "Continue with Email"));
}
async function saveNote(page, title, body) {
  const editor = page.locator('[contenteditable="true"][aria-label="Note content"]');
  await visible(editor);
  // Wait for the real successful server save instead of only an optimistic label.
  const saved = responseFor(page, "PUT", /^\/api\/notes\/[^/]+$/, async () => {
    await page.getByRole("textbox", { name: "Note title" }).fill(title);
    await editor.fill(body);
    await button(page, "Save note").click();
  });
  await saved;
  await visible(page.getByText("Saved", { exact: true }).first());
}
async function assertNoOverflow(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
    "Page has horizontal viewport overflow");
}
async function screenshotFailures() {
  if (!outputs) return;
  await mkdir(outputs, { recursive: true });
  for (const [i, context] of contexts.entries()) {
    for (const [j, page] of context.pages().entries()) {
      if (!page.isClosed()) await page.screenshot({ path: join(outputs, "failure-" + i + "-" + j + ".png"), timeout: 5000 }).catch(() => {});
    }
  }
}

async function journeys() {
  const alice = credentials("Alice"), bob = credentials("Bob");
  const { page: a } = await newPage();
  await emailForm(a, alice, true);
  await go(a, "/app/settings", "Settings");
  await visible(a.getByText(alice.email, { exact: true }));
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(a.getByText(alice.email, { exact: true }));
  console.log("PASS registration and Firebase session restoration");

  const task = label("E2E task"), changedTask = task + " edited";
  await go(a, "/app/tasks", "Tasks");
  await responseFor(a, "POST", /^\/api\/tasks$/, async () => {
    await a.getByRole("textbox", { name: "Task title" }).fill(task);
    await button(a, "Add task").click();
  });
  await visible(button(a, "Edit " + task));
  await button(a, "Edit " + task).click();
  await responseFor(a, "PATCH", /^\/api\/tasks\/[^/]+$/, async () => {
    await a.getByRole("textbox", { name: "Task", exact: true }).fill(changedTask);
    await button(a, "Save").click();
  });
  await visible(button(a, "Mark " + changedTask + " as complete"));
  await responseFor(a, "PATCH", /^\/api\/tasks\/[^/]+$/, () => button(a, "Mark " + changedTask + " as complete").click());
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(button(a, "Mark " + changedTask + " as incomplete"));
  console.log("PASS task create, edit, completion and persistence");

  const note = label("E2E note"), changedNote = note + " revised", body = label("Private note content");
  await go(a, "/app/notes", "Notes");
  await responseFor(a, "POST", /^\/api\/notes$/, () => button(a, "New note").click());
  await saveNote(a, note, body);
  await a.reload({ waitUntil: "domcontentloaded" });
  await a.getByRole("button", { name: new RegExp(note) }).click();
  await visible(a.locator('[contenteditable="true"][aria-label="Note content"]').getByText(body, { exact: true }));
  await saveNote(a, changedNote, body + " revised");
  console.log("PASS rich note creation, editing and reload");

  await signOut(a);
  await a.goto(WEB + "/app/tasks", { waitUntil: "domcontentloaded" });
  await visible(button(a, "Continue with Email"));
  await emailForm(a, bob, true);
  await go(a, "/app/tasks", "Tasks");
  await visible(a.getByText("No tasks yet", { exact: true }));
  assert.equal(await button(a, "Edit " + changedTask).count(), 0);
  await go(a, "/app/notes", "Notes");
  await visible(a.getByText("Your ideas start here", { exact: true }));
  assert.equal(await a.getByRole("button", { name: new RegExp(changedNote) }).count(), 0);
  await signOut(a);
  await emailForm(a, alice, false);
  await go(a, "/app/tasks", "Tasks");
  await visible(button(a, "Mark " + changedTask + " as incomplete"));
  await button(a, "Delete " + changedTask).click();
  await responseFor(a, "DELETE", /^\/api\/tasks\/[^/]+$/, () => button(a.getByRole("dialog"), "Delete task").click());
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(a.getByText("No tasks yet", { exact: true }));
  await go(a, "/app/notes", "Notes");
  await a.getByRole("button", { name: new RegExp(changedNote) }).click();
  await button(a, "Delete note").click();
  await responseFor(a, "DELETE", /^\/api\/notes\/[^/]+$/, () => button(a.getByRole("dialog"), "Delete note").click());
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(a.getByText("Your ideas start here", { exact: true }));
  console.log("PASS sign-out, sign-in, account isolation and persisted deletions");

  await go(a, "/app/settings", "Settings");
  await button(a.getByLabel("Settings sections"), "Leaderboard").click();
  await a.getByPlaceholder("Enter leaderboard name").fill(alice.name);
  const toggle = a.getByRole("switch", { name: "Join global leaderboard" });
  if (await toggle.getAttribute("aria-checked") !== "true") await toggle.click();
  await responseFor(a, "PATCH", /^\/api\/leaderboard\/me$/, () => button(a, "Save leaderboard settings").click());
  await go(a, "/app/focus", "Focus");
  await a.getByRole("spinbutton", { name: "Custom duration in minutes" }).fill("1");
  await responseFor(a, "POST", /^\/api\/study-sessions\/start$/, () => button(a, "Start focus").click());
  await visible(button(a, "Pause"));
  await a.waitForFunction(() => /^00:[0-5][0-9]$/.test(document.querySelector(".v2f-time")?.textContent || ""), undefined, { timeout: 10000 });
  await button(a, "Pause").click();
  await visible(button(a, "Resume"));
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(button(a, "Resume"));
  // A real server-measured minute, not a forged client clock or seeded score.
  await responseFor(a, "POST", /^\/api\/study-sessions$/, () => button(a, "Resume").click(), 85_000);
  await visible(button(a, "Start focus"));
  await visible(a.getByLabel("Study history").getByText("General Study", { exact: true }));
  await go(a, "/app/leaderboard", "Leaderboard");
  await visible(a.getByLabel("Your weekly statistics").getByText("1 XP", { exact: true }));
  await visible(a.getByRole("row").filter({ hasText: alice.name }));
  console.log("PASS real Focus elapsed time, pause/resume restoration and leaderboard XP");

  // A second simultaneous browser has a separate Firebase session and socket.
  const { page: b } = await newPage();
  await emailForm(b, bob, false);
  const group = label("E2E study group");
  await go(a, "/app/groups", "Study Groups");
  await button(a, "Create group").click();
  const dialog = a.getByRole("dialog");
  await dialog.getByLabel("Group name").fill(group);
  const create = await responseFor(a, "POST", /^\/api\/groups$/, () => button(dialog, "Create group").click());
  const created = (await create.json()).group;
  assert.match(created.inviteCode, /^[A-F0-9]{8}$/);
  await visible(exact(a, "link", "Open chat"));
  await go(b, "/app/groups", "Study Groups");
  await button(b, "Join group").click();
  await b.getByRole("dialog").getByLabel("Your invite code").fill(created.inviteCode);
  await responseFor(b, "POST", /^\/api\/groups\/join$/, () => button(b.getByRole("dialog"), "Join group").click());
  await visible(exact(b, "link", "Open chat"));
  await Promise.all([exact(a, "link", "Open chat").click(), exact(b, "link", "Open chat").click()]);
  const composer = page => page.getByRole("textbox", { name: "Message " + group });
  await Promise.all([visible(composer(a)), visible(composer(b))]);
  // Bob sends first; Alice receiving proves she has joined the socket room.
  const first = label("Bob live message");
  await composer(b).fill(first);
  await button(b, "Send message").click();
  await visible(a.getByText(first, { exact: true }));
  const second = label("Alice live reply");
  await composer(a).fill(second);
  await button(a, "Send message").click();
  await visible(b.getByText(second, { exact: true }));
  await b.reload({ waitUntil: "domcontentloaded" });
  await visible(b.getByText(second, { exact: true }));
  console.log("PASS two-user live Socket.IO chat and persisted history");

  const bytes = Buffer.from(label("StudyOS local file bytes") + "\n");
  const file = "studyos-e2e.txt";
  await a.locator('input[type="file"]').setInputFiles({ name: file, mimeType: "text/plain", buffer: bytes });
  await responseFor(a, "POST", /^\/api\/groups\/[^/]+\/attachments\/finalize$/, () => button(a, "Send message").click());
  await visible(button(b, "Download " + file));
  const downloadPromise = b.waitForEvent("download", { timeout: 25_000 });
  await button(b, "Download " + file).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), file);
  assert.deepEqual(await readFile(await download.path()), bytes);
  console.log("PASS presigned upload, finalize, realtime attachment and downloaded bytes");

  // Responsive app shell on a touch-sized Chromium device, using a third
  // authenticated account and the actual mobile settings navigation.
  const { page: m } = await newPage(true);
  const mobile = credentials("Mobile");
  await emailForm(m, mobile, true);
  const nav = m.getByRole("navigation", { name: "Mobile navigation" });
  await visible(nav);
  await exact(nav, "link", "Tasks").click();
  await visible(exact(m, "heading", "Tasks"));
  await assertNoOverflow(m);
  const mobileTask = label("Mobile task");
  await responseFor(m, "POST", /^\/api\/tasks$/, async () => {
    await m.getByRole("textbox", { name: "Task title" }).fill(mobileTask);
    await button(m, "Add task").click();
  });
  await visible(button(m, "Edit " + mobileTask));
  await button(nav, "More navigation").click();
  await exact(m.getByRole("dialog"), "link", "Settings").click();
  await visible(exact(m, "heading", "Settings"));
  await button(m.getByLabel("Settings sections"), "Account").click();
  await visible(exact(m, "heading", "Account"));
  await visible(m.getByText(mobile.email, { exact: true }));
  await assertNoOverflow(m);
  await button(m, "Back to Settings").click();
  await visible(exact(m, "heading", "Settings"));
  await exact(nav, "link", "Focus").click();
  await visible(exact(m, "heading", "Focus"));
  await assertNoOverflow(m);
  console.log("PASS mobile task flow, native settings navigation and viewport checks");
}

try {
  // Firebase CLI starts its Auth Emulator using the local demo project.
  await waitReady(AUTH + "/emulator/v1/projects/demo-studyos-e2e/config");
  start("server/tests/e2e/start.cjs");
  start("client/e2e/frontend.mjs");
  await Promise.all([
    waitReady(API + "/api/health/ready", async response => (await response.json()).status === "ok"),
    waitReady(WEB + "/app/tasks", async response => (await response.text()).includes('id="root"')),
  ]);
  browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  await journeys();
  console.log("All StudyOS browser journeys passed.");
} catch (error) {
  await screenshotFailures();
  throw error;
} finally {
  await browser?.close();
  await Promise.all(children.map(stop));
}
