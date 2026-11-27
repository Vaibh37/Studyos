// Runs only inside the isolated browser harness (Firebase Auth Emulator,
// temporary MongoDBs and local object store). No production credentials.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export async function chaosJourneys({
  API, WEB, AUTH, backend, newPage, openEmailForm, fillEmailForm, emailForm, signOut,
  go, visible, button, responseFor, assertNoOverflow, credentials, label,
}) {
  if (process.env.STUDYOS_E2E !== "isolated-local-only" ||
      API !== "http://127.0.0.1:5500" || WEB !== "http://127.0.0.1:5174" ||
      AUTH !== "http://127.0.0.1:9099") throw Error("Refusing non-isolated chaos tests");

  const account = { ...credentials("Chaos"), name: "طالب 🧠", secret: " Space " + randomUUID() + " " };
  const { context: first, page: a } = await newPage(false, { timezoneId: "Pacific/Kiritimati" });
  const { context: second, page: b } = await newPage(false, {
    timezoneId: "Pacific/Honolulu", locale: "ar-SA",
  });
  const authError = page => page.locator(".auth-v1-error[role=alert]");
  const signupRoute = /\/accounts:signUp(?:\?|$)/;
  let signupRequests = 0;
  a.on("request", request => {
    if (new URL(request.url()).origin === AUTH && signupRoute.test(request.url())) signupRequests++;
  });

  await openEmailForm(a, true);
  const nameField = a.getByPlaceholder("Your name");
  const emailField = a.getByPlaceholder("you@example.com");
  const passwordField = a.locator('input[type="password"]');
  const submit = () => button(a, "Create Account").click();

  await fillEmailForm(a, { ...account, email: "" }, true);
  await submit();
  assert.equal(await emailField.evaluate(input => input.validity.valueMissing), true);
  assert.equal(signupRequests, 0, "A blank email reached Firebase");

  await emailField.fill("not-an-email");
  await submit();
  assert.equal(await emailField.evaluate(input => input.validity.typeMismatch), true);
  assert.equal(signupRequests, 0, "An invalid email reached Firebase");

  await emailField.fill(account.email);
  await nameField.fill("   ");
  await submit();
  await visible(authError(a).filter({ hasText: "Enter your name." }));
  await nameField.fill(account.name);
  await passwordField.fill("      ");
  await submit();
  await visible(authError(a).filter({ hasText: "not only whitespace" }));
  await passwordField.fill("abc");
  await submit();
  await visible(authError(a).filter({ hasText: "at least 6 characters" }));
  assert.equal(signupRequests, 0, "Invalid name/password reached Firebase");

  // No bio field exists; exercise the equivalent editable identity field.
  await nameField.fill("word ".repeat(5000));
  assert((await nameField.inputValue()).length <= 50, "Oversized signup name was not limited");
  await button(a, "All sign-in options").click();
  await visible(button(a, "Continue with Email"));
  await a.goto(WEB + "/app/tasks", { waitUntil: "domcontentloaded" });
  await visible(button(a, "Continue with Email"));
  assert.equal(signupRequests, 0, "Abandoned registration created an account");
  console.log("PASS blank/invalid email, blank name, whitespace/short password, huge name and abandoned signup");

  await openEmailForm(a, true);
  await fillEmailForm(a, account, true);
  // Two submit events in the same turn, before React can re-render.
  await a.locator("form.auth-v1-form").evaluate(form => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await a.waitForURL(/\/app\//, { timeout: 30_000 });
  await go(a, "/app/settings", "Settings");
  await visible(a.getByText(account.email, { exact: true }));
  await visible(a.getByText(account.name, { exact: true }).first());
  assert.equal(signupRequests, 1, "Double submit triggered multiple Firebase signup calls");

  await openEmailForm(b, true);
  await fillEmailForm(b, account, true);
  await button(b, "Create Account").click();
  await visible(authError(b).filter({ hasText: "An account already exists with this email." }));
  await button(b, "All sign-in options").click();
  await emailForm(b, account, false);
  await go(b, "/app/settings", "Settings");
  await visible(b.getByText(account.name, { exact: true }).first());
  console.log("PASS same-turn double submit, duplicate email rejection, Unicode name and exact space-containing password");

  // Use the actual Auth Emulator's independently issued ID token for API-level
  // assertions. Tokens are held in memory only and never logged.
  async function emulatorCredential(method, identity) {
    const url = AUTH + "/identitytoolkit.googleapis.com/v1/accounts:" + method + "?key=demo-studyos-e2e";
    const response = await fetch(url, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identity.email, password: identity.secret, returnSecureToken: true }),
    });
    assert(response.ok, "Local Firebase " + method + " failed: " + response.status);
    const result = await response.json();
    assert(typeof result.idToken === "string" && typeof result.localId === "string", "Missing emulator credential");
    return result;
  }
  async function api(token, path, options = {}) {
    return fetch(API + path, {
      ...options, redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: "Bearer " + token, ...(options.headers || {}) },
    });
  }
  const original = await emulatorCredential("signInWithPassword", account);
  const proof = await api(original.idToken, "/api/auth/me");
  assert.equal(proof.status, 200);
  assert.equal((await proof.json()).user.uid, original.localId);

  // Store untrusted Markdown through the real authenticated API, then open it
  // in the browser editor. A local marker reveals any unexpected execution.
  const hostileTitle = label("XSS regression note");
  const hostileBody = ["XSS regression text", "[unsafe](javascript:window.__studyosXss=1)",
    '<img src="/missing-xss-regression-image" onerror="window.__studyosXss=1">',
    '<script>window.__studyosXss=1</script>', '[safe](https://example.test/)'].join("\n\n");
  const storedNote = await api(original.idToken, "/api/notes", {method:"POST",
    headers:{"Content-Type":"application/json"}, body:JSON.stringify({title:hostileTitle,content:hostileBody})});
  assert.equal(storedNote.status,201);
  await a.addInitScript(() => {window.__studyosXss=0});
  await go(a, "/app/notes", "Notes");
  await a.getByRole("button", {name:new RegExp(hostileTitle)}).click();
  const editor = a.locator('[contenteditable="true"][aria-label="Note content"]');
  await visible(editor.getByText("XSS regression text",{exact:true}));
  assert.equal(await editor.locator('script, [onerror], [onclick], [href^="javascript:" i], [href^="data:" i]').count(),0);
  assert.equal(await a.evaluate(()=>window.__studyosXss||0),0);
  assert.equal(await editor.locator('a[href="https://example.test/"]').count(),1);
  console.log("PASS stored Markdown/HTML XSS regression and safe HTTPS link rendering");

  const task = label("مهمة دراسة 🧠");
  await go(a, "/app/tasks", "Tasks");
  await responseFor(a, "POST", /^\/api\/tasks$/, async () => {
    await a.getByRole("textbox", { name: "Task title" }).fill(task);
    await button(a, "Add task").click();
  });
  await visible(button(a, "Edit " + task));

  // Drop one safe GET at the transport layer and delay the retry. Both reads
  // still hit the real API; no mocked response can make this assertion pass.
  let attemptedReads = 0;
  const slowTaskRead = async route => {
    if (route.request().method() !== "GET") return route.fallback();
    attemptedReads++;
    if (attemptedReads === 1) return route.abort("connectionreset");
    await delay(1500);
    await route.fallback();
  };
  await b.route(API + "/api/tasks", slowTaskRead);
  try {
    await go(b, "/app/tasks", "Tasks");
    await visible(button(b, "Edit " + task));
    assert(attemptedReads >= 2, "Real task GET did not recover from the dropped request");
  } finally {
    await b.unroute(API + "/api/tasks", slowTaskRead);
  }
  await responseFor(b, "PATCH", /^\/api\/tasks\/[^/]+$/, () => button(b, "Mark " + task + " as complete").click());
  await a.reload({ waitUntil: "domcontentloaded" });
  await visible(button(a, "Mark " + task + " as incomplete"));
  console.log("PASS simultaneous independent sessions, Arabic/emoji task, dropped read, delayed retry and cross-device persistence");

  // Same account, radically different client zones, simultaneous check-ins.
  // The persisted first zone must determine the day boundary for all devices.
  const checkIn = async timeZone => {
    const response = await api(original.idToken, "/api/auth/streak/check-in", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone }),
    });
    assert.equal(response.status, 200);
    return response.json();
  };
  const originalCheckIn = await checkIn("Pacific/Kiritimati");
  const checks = await Promise.all([
    checkIn("Pacific/Honolulu"), checkIn("Not/A-Timezone"), checkIn("Asia/Kolkata"),
  ]);
  for (const result of checks) {
    assert.equal(result.lastDate, originalCheckIn.lastDate);
    assert.equal(result.totalDays, originalCheckIn.totalDays);
    assert.equal(result.updated, false);
  }
  const oversized = await api(original.idToken, "/api/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "x".repeat(110_000) }),
  });
  assert.equal(oversized.status, 413);
  assert(!(await oversized.text()).includes("x".repeat(1000)), "Oversized payload was echoed");
  console.log("PASS same-account concurrent time-zone changes, invalid zone fallback and hostile oversized payload");

  // Use the actual Chromium permissions model, not a fabricated app response.
  const cdp = await second.newCDPSession(b);
  try {
    const { targetInfo } = await cdp.send("Target.getTargetInfo");
    await cdp.send("Browser.setPermission", {
      permission: { name: "notifications" }, setting: "denied", origin: WEB,
      browserContextId: targetInfo.browserContextId,
    });
    await go(b, "/app/settings", "Settings");
    await button(b.getByLabel("Settings sections"), "Notifications").click();
    await visible(b.getByText("Notifications are blocked by the browser", { exact: true }));
    assert.equal(await button(b, "Send test").isDisabled(), true);
    assert.equal(await b.evaluate(() => Notification.permission), "denied");
    await button(b.getByLabel("Settings sections"), "Appearance").click();
    await b.getByRole("button", { name: /^Light Bright StudyOS interface/ }).click();
    await b.waitForFunction(() => document.body.classList.contains("light-theme"));
    await b.reload({ waitUntil: "domcontentloaded" });
    await b.waitForFunction(() => document.body.classList.contains("light-theme"));
    await button(b.getByLabel("Settings sections"), "Appearance").click();
    await b.getByRole("button", { name: /^Coffee Warm cream and espresso tones/ }).click();
    await b.waitForFunction(() =>
      document.body.classList.contains("coffee-theme") &&
      localStorage.getItem("studyos_theme") === "coffee" &&
      getComputedStyle(document.body).getPropertyValue("--color-solid").trim() === "#795344"
    );
    await b.reload({ waitUntil: "domcontentloaded" });
    await b.waitForFunction(() => document.body.classList.contains("coffee-theme"));
    await button(b.getByLabel("Settings sections"), "Appearance").click();
    assert.equal(await b.getByRole("button", { name: /^Coffee Warm cream and espresso tones/ }).getAttribute("aria-pressed"), "true");
    await b.getByRole("button", { name: /^Dark Low-light StudyOS interface/ }).click();
    await b.waitForFunction(() => !document.body.classList.contains("light-theme"));
    await b.reload({ waitUntil: "domcontentloaded" });
    await b.waitForFunction(() => !document.body.classList.contains("light-theme"));
  } finally {
    await cdp.detach();
  }
  console.log("PASS denied notification permission and persistent dark/light/coffee theme switching");

  // Approximate narrow folded and rotated layouts. Root-font scaling is a
  // stress test, not a claim of WCAG compliance or physical foldable coverage.
  for (const viewport of [{ width: 320, height: 720 }, { width: 844, height: 390 }]) {
    await b.setViewportSize(viewport);
    await go(b, "/app/tasks", "Tasks");
    await visible(button(b, "Edit " + task));
    await assertNoOverflow(b);
    await b.locator("html").evaluate(html => { html.style.fontSize = "200%"; });
    await assertNoOverflow(b);
    await visible(b.getByRole("textbox", { name: "Task title" }));
    await b.locator("html").evaluate(html => { html.style.fontSize = ""; });
  }
  await b.setViewportSize({ width: 1440, height: 1000 });
  console.log("PASS narrow/rotated viewport, large root font and Arabic browser locale");

  // Delete ONLY a synthetic account in the test harness, then sign up again.
  await go(a, "/app/settings", "Settings");
  await button(a, "Delete account").click();
  const deletion = a.getByRole("dialog", { name: "Delete your account?" });
  await deletion.getByPlaceholder("DELETE").fill("DELETE");
  await deletion.getByLabel("Confirm your password").fill(account.secret);
  await responseFor(a, "DELETE", /^\/api\/account$/, () => button(deletion, "Delete account").click());
  await visible(button(a, "Continue with Email"));
  assert.equal((await api(original.idToken, "/api/tasks")).status, 401, "Deleted account token remained usable");

  await emailForm(a, account, true);
  const recreated = await emulatorCredential("signInWithPassword", account);
  assert.notEqual(recreated.localId, original.localId, "Re-registration reused the deleted account ID");
  const freshTasks = await api(recreated.idToken, "/api/tasks");
  assert.equal(freshTasks.status, 200);
  assert.deepEqual(await freshTasks.json(), [], "Re-registered identity inherited deleted account data");
  await go(a, "/app/tasks", "Tasks");
  await visible(a.getByText("No tasks yet", { exact: true }));
  console.log("PASS actual account deletion, stale token rejection, same-email re-registration and data isolation");

  // IP bans apply at the StudyOS API/socket layer, not Firebase's provider.
  // Prove that obtaining an entirely new Firebase identity cannot evade an IP
  // ban on the same network. Only the private isolated child can change it.
  async function control(action) {
    const id = randomUUID();
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => finish(Error("Isolated IP-ban control timed out")), 10_000);
      const onMessage = message => {
        if (message?.id === id) finish(message.ok ? null : Error("Isolated IP-ban control failed"));
      };
      function finish(error) {
        clearTimeout(timeout);
        backend.off("message", onMessage);
        error ? reject(error) : resolve();
      }
      backend.on("message", onMessage);
      backend.send({ id, action }, error => { if (error) finish(error); });
    });
  }
  await Promise.all([first.close(), second.close()]);
  try {
    await control("ban-loopback");
    assert.equal((await api(recreated.idToken, "/api/tasks")).status, 403);
    const newIdentity = await emulatorCredential("signUp", credentials("BannedRetry"));
    assert.notEqual(newIdentity.localId, recreated.localId);
    assert.equal((await api(newIdentity.idToken, "/api/tasks")).status, 403);
    assert.equal((await api(newIdentity.idToken, "/api/auth/me")).status, 403);
  } finally {
    await control("unban-loopback");
  }
  assert.equal((await api(recreated.idToken, "/api/tasks")).status, 200);
  console.log("PASS banned IP remains blocked after fresh Firebase registration; unban restores access");
}
