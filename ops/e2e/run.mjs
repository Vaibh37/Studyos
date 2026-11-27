import assert from "node:assert/strict";
import { chaosJourneys } from "./chaos.mjs";
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

function start(script, ipc = false) {
  const child = spawn(process.execPath, [join(root, script)], {
    cwd: root, env: process.env, stdio: ipc ? ["ignore", "inherit", "inherit", "ipc"] : "inherit",
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
async function newPage(mobile = false, options = {}) {
  const context = await browser.newContext({
    ...(mobile ? devices["Pixel 7"] : { viewport: { width: 1440, height: 1000 } }),
    reducedMotion: "reduce", acceptDownloads: true, serviceWorkers: "block",
    ...options,
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
async function openEmailForm(page, register) {
  await page.goto(WEB + "/get-started", { waitUntil: "domcontentloaded" });
  await visible(button(page, "Continue with Email"));
  await button(page, "Continue with Email").click();
  if (register) {
    await button(page, "Create account").click();
  }
}
async function fillEmailForm(page, account, register) {
  if (register) await page.getByPlaceholder("Your name").fill(account.name);
  await page.getByPlaceholder("you@example.com").fill(account.email);
  await page.locator('input[type="password"]').fill(account.secret);
}
async function emailForm(page, account, register) {
  await openEmailForm(page, register);
  await fillEmailForm(page, account, register);
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

async function landingJourney() {
  for (const mobile of [false, true]) {
    const { context, page } = await newPage(mobile);
    await go(page, "/", "Your study workspace.");
    const controls = page.getByRole("group", { name: "Choose a study workflow step" });
    const preview = page.locator("#study-workflow-preview");
    const steps = [
      ["Plan", "StudyOS Tasks page with priorities, subjects and deadlines"],
      ["Focus", "StudyOS Focus page with the study timer and session controls"],
      ["Review", "StudyOS Progress page with focus trends and study analytics"],
      ["Compete", "StudyOS Leaderboard showing weekly student rankings"],
    ];
    assert.equal(await button(controls, "Plan").getAttribute("aria-pressed"), "true");
    for (const [name, alt] of steps) {
      const control = button(controls, name);
      if (mobile) await control.tap();
      else {
        await control.focus();
        await control.press("Enter");
      }
      assert.equal(await control.getAttribute("aria-pressed"), "true");
      assert.equal(await controls.locator('[aria-pressed="true"]').count(), 1);
      const image = preview.getByRole("img", { name: alt, exact: true });
      await visible(image);
      await image.evaluate(img => img.decode());
      assert(await image.evaluate(img => img.naturalWidth > 0), "Workflow screenshot failed to load");
      await assertNoOverflow(page);
    }
    assert.equal(await page.locator(".marketing-home .marketing-kicker, .marketing-home .marketing-eyebrow, .marketing-hero-orbit").count(), 0);
    await button(page, "Use light theme").click();
    assert(await page.locator("html").evaluate(node => node.classList.contains("light-theme")));
    await assertNoOverflow(page);
    await button(page, "Use dark theme").click();
    assert(!(await page.locator("html").evaluate(node => node.classList.contains("light-theme"))));
    assert.equal(await page.getByRole("link", { name: "Privacy Policy", exact: true }).getAttribute("href"), "/privacy");
    assert.equal(await page.getByRole("link", { name: "Terms & Conditions", exact: true }).getAttribute("href"), "/terms");
    await exact(page, "link", "Explore features").click();
    await page.waitForURL(/#features$/);
    await visible(exact(page, "heading", "Tools for everyday study."));
    await context.close();
  }
  console.log("PASS public landing walkthrough, screenshot loading, theme, links and responsive layout");
}

async function privacyJourney() {
  const { context, page } = await newPage(true);
  await go(page, "/privacy", "Privacy Policy");
  const measurement = page.locator("script[data-sdkn]");
  assert.equal(await measurement.count(), 0, "Analytics loaded before consent");
  await visible(page.getByText("Optional public-site analytics are disabled in this browser."));
  await button(page, "Enable analytics").click();
  await visible(page.getByText("Optional public-site analytics are enabled in this browser."));
  await measurement.waitFor({ state: "attached" });
  assert.equal(await page.evaluate(() => localStorage.getItem("studyos_optional_analytics_v1")), "allow");
  await button(page, "Disable analytics").click();
  await visible(page.getByText("Optional public-site analytics are disabled in this browser."));
  await page.reload({ waitUntil: "domcontentloaded" });
  await visible(page.getByText("Optional public-site analytics are disabled in this browser."));
  assert.equal(await measurement.count(), 0, "Analytics loaded after withdrawal");
  await assertNoOverflow(page);
  await go(page, "/nonexistent-privacy-test-page", "Page not found");
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, follow");
  await assertNoOverflow(page);
  await page.getByRole("link", { name: "Return to StudyOS" }).click();
  await page.waitForURL(WEB + "/");
  await context.close();
  console.log("PASS mobile privacy controls, preference persistence and page-not-found recovery");
}

async function journeys() {
  await privacyJourney();
  const alice = credentials("Alice"), bob = credentials("Bob");
  const { page: a } = await newPage();
  await emailForm(a, alice, true);
  await go(a, "/app/settings", "Settings");
  await visible(a.getByText(alice.email, { exact: true }));
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(a.getByText(alice.email, { exact: true }));
  console.log("PASS registration and Firebase session restoration");
  const customGreeting = label("Alice private greeting");
  await button(a.getByLabel("Settings sections"), "General").click();
  await a.getByPlaceholder("Enter your name").fill(customGreeting);
  await button(a, "Save profile").click();
  await visible(a.getByText("Profile saved successfully", { exact: true }));
  const dashboardReads = [];
  const recordDashboardReads = request => {
    const url = new URL(request.url());
    if (url.origin === API && request.method() === "GET" &&
        ["/api/dashboard", "/api/tasks", "/api/events", "/api/study-sessions"].includes(url.pathname)) {
      dashboardReads.push(url.pathname);
    }
  };
  a.on("request", recordDashboardReads);
  try {
    await responseFor(a, "GET", /^\/api\/dashboard$/, () =>
      a.goto(WEB + "/app/dashboard", { waitUntil: "domcontentloaded" }));
    await visible(a.locator(".ds-heading h1").filter({ hasText: customGreeting }));
    await visible(a.locator(".ds-clean[aria-busy=false]"));
    assert.deepEqual(dashboardReads, ["/api/dashboard"]);
  } finally { a.off("request", recordDashboardReads); }
  console.log("PASS cold Dashboard uses one combined private data request");

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
  await a.goto(WEB + "/app/dashboard", { waitUntil: "domcontentloaded" });
  await visible(a.locator(".ds-heading h1").filter({ hasText: bob.name }));
  assert.equal(await a.locator(".ds-heading h1").filter({ hasText: customGreeting }).count(), 0,
    "Previous account's private greeting leaked across sign-in");
  await go(a, "/app/tasks", "Tasks");
  await visible(a.getByText("No tasks yet", { exact: true }));
  assert.equal(await button(a, "Edit " + changedTask).count(), 0);
  await go(a, "/app/notes", "Notes");
  await visible(a.getByText("Your ideas start here", { exact: true }));
  assert.equal(await a.getByRole("button", { name: new RegExp(changedNote) }).count(), 0);
  await signOut(a);
  await emailForm(a, alice, false);
  await a.goto(WEB + "/app/dashboard", { waitUntil: "domcontentloaded" });
  await visible(a.locator(".ds-heading h1").filter({ hasText: customGreeting }));
  await go(a, "/app/tasks", "Tasks");
  await visible(button(a, "Mark " + changedTask + " as incomplete"));
  await button(a, "Delete " + changedTask).click();
  await responseFor(a, "DELETE", /^\/api\/tasks\/[^/]+$/, () => button(a.getByRole("dialog"), "Delete task").click());
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(a.getByText("No tasks yet", { exact: true }));
  await go(a, "/app/notes", "Notes");
  await a.getByRole("button", { name: new RegExp(changedNote) }).click();
  await button(a, "Delete note").click();
  await responseFor(a, "DELETE", /^\/api\/notes\/[^/]+$/, () => button(a.getByRole("alertdialog", { name: "Delete this note?" }), "Delete note").click());
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(a.getByText("Your ideas start here", { exact: true }));
  console.log("PASS sign-out, sign-in, account-scoped greeting, private data isolation and persisted deletions");

  await go(a, "/app/settings", "Settings");
  await button(a.getByLabel("Settings sections"), "Leaderboard").click();
  await a.getByPlaceholder("Enter leaderboard name").fill(alice.name);
  const toggle = a.getByRole("switch", { name: "Join global leaderboard" });
  if (await toggle.getAttribute("aria-checked") !== "true") await toggle.click();
  await responseFor(a, "PATCH", /^\/api\/leaderboard\/me$/, () => button(a, "Save leaderboard settings").click());
  await go(a, "/app/focus", "Focus");
  const durationUnit = a.getByRole("combobox", { name: "Custom duration unit" });
  await durationUnit.selectOption("hr");
  const hoursInput = a.getByRole("spinbutton", { name: "Custom duration in hours" });
  await hoursInput.fill("1.5");
  await visible(a.getByText("1:30:00", { exact: true }));
  await visible(a.getByText("1 hr 30 min session", { exact: true }));
  await durationUnit.selectOption("min");
  assert.equal(await a.getByRole("spinbutton", { name: "Custom duration in minutes" }).inputValue(), "90");
  await durationUnit.selectOption("hr");
  await hoursInput.fill("13");
  await button(a, "Start focus").click();
  await visible(a.getByText("Choose a duration between 1 minute and 12 hours.", { exact: true }));
  await button(a, "Reset timer").click();
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
  await visible(a.locator(".chats-message-viewport").getByText(first, { exact: true }));
  const second = label("Alice live reply");
  await composer(a).fill(second);
  await button(a, "Send message").click();
  await visible(b.locator(".chats-message-viewport").getByText(second, { exact: true }));
  console.log("PASS two-user live Socket.IO chat in both directions");

  const bytes = Buffer.from(label("StudyOS local file bytes") + "\n");
  const file = "studyos-e2e.txt";
  await a.locator('input[type="file"]').setInputFiles({ name: file, mimeType: "text/plain", buffer: bytes });
  // Cut the exact real signed storage PUT after the API has issued its grant.
  // Never fake success or send any traffic outside the loopback fixture.
  let interruptedPuts = 0;
  const storageRoute = STORE + "/**";
  const interruptUpload = async route => {
    if (route.request().method() !== "PUT") return route.fallback();
    interruptedPuts++;
    await route.abort("internetdisconnected");
  };
  await a.route(storageRoute, interruptUpload);
  try {
    await button(a, "Send message").click();
    await visible(a.getByText("Upload failed", { exact: true }));
    assert.equal(interruptedPuts, 1, "Expected one interrupted real storage PUT");
    assert.equal(await button(b, "Download " + file).count(), 0, "Failed upload reached the receiver");
  } finally {
    await a.unroute(storageRoute, interruptUpload);
  }
  // The file stays staged. A manual retry uses a fresh grant and sends it once.
  const finalized = await responseFor(a, "POST", /^\/api\/groups\/[^/]+\/attachments\/finalize$/, () => button(a, "Send message").click());
  const storedAttachment = (await finalized.json()).message.attachments[0];
  assert.equal(storedAttachment.fileName, file);
  assert.equal(storedAttachment.size, bytes.length);
  await visible(button(a, "Download " + file));
  await visible(button(b, "Download " + file));
  const downloadPromise = b.waitForEvent("download", { timeout: 25_000 });
  await button(b, "Download " + file).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), file);
  assert.deepEqual(await readFile(await download.path()), bytes);
  await b.reload({ waitUntil: "domcontentloaded" });
  await visible(b.locator(".chats-message-viewport").getByText(second, { exact: true }));
  await visible(button(b, "Download " + file));
  assert.equal(await button(b, "Download " + file).count(), 1, "Retry created duplicate attachments");
  console.log("PASS interrupted signed upload, retained file, manual retry, one delivery, byte-for-byte download and persisted chat history");

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
  await m.getByRole("combobox", { name: "Custom duration unit" }).selectOption("hr");
  await m.getByRole("spinbutton", { name: "Custom duration in hours" }).fill("2");
  await visible(m.getByText("2:00:00", { exact: true }));
  await visible(m.getByText("2 hr session", { exact: true }));
  await assertNoOverflow(m);
  await button(m, "Reset timer").click();
  console.log("PASS mobile task flow, native settings navigation, custom Focus hours and viewport checks");
}

try {
  // Firebase CLI starts its Auth Emulator using the local demo project.
  await waitReady(AUTH + "/emulator/v1/projects/demo-studyos-e2e/config");
  const backend = start("server/tests/e2e/start.cjs", true);
  start("client/e2e/frontend.mjs");
  await Promise.all([
    waitReady(API + "/api/health/ready", async response => (await response.json()).status === "ok"),
    waitReady(WEB + "/app/tasks", async response => (await response.text()).includes('id="root"')),
  ]);
  browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  await landingJourney();
  await journeys();
  // Release the happy-path clients and their sockets before running the
  // adversarial cases (all clients share a loopback IP rate-limit bucket).
  await Promise.all(contexts.map(context => context.close()));
  await chaosJourneys({
    API, WEB, AUTH, backend, newPage, openEmailForm, fillEmailForm, emailForm, signOut,
    go, visible, button, exact, responseFor, assertNoOverflow, credentials, label
  });
  console.log("All StudyOS browser and chaos journeys passed.");
} catch (error) {
  await screenshotFailures();
  throw error;
} finally {
  await browser?.close();
  await Promise.all(children.map(stop));
}
