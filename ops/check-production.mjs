// Read-only synthetic checks. No secrets, test accounts or production writes.
// Used from GitHub Actions and by local fixtures; never print response bodies.
import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const FRONTEND = "https://studyos37.space";
export const API = "https://studyos-iego.onrender.com";
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
class ProbeError extends Error {}
const expect = (condition, message) => { if (!condition) throw new ProbeError(message); };
const contentType = response => (response.headers.get("content-type") || "").toLowerCase();
const headerEquals = (response, name, expected) =>
  expect(response.headers.get(name)?.toLowerCase() === expected, `Missing or unexpected ${name}`);
const noStore = response => expect(/\bno-store\b/i.test(response.headers.get("cache-control") || ""), "Missing no-store cache protection");

async function bodyText(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      expect(size <= MAX_RESPONSE_BYTES, "Response exceeded the monitor's size limit");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString("utf8");
}

async function json(response) {
  expect(contentType(response).includes("application/json"), "Expected an API JSON response");
  try { return JSON.parse(await bodyText(response)); }
  catch { throw new ProbeError("API response was not valid bounded JSON"); }
}

const frontendHeaders = response => {
  headerEquals(response, "x-content-type-options", "nosniff");
  headerEquals(response, "x-frame-options", "deny");
  headerEquals(response, "referrer-policy", "strict-origin-when-cross-origin");
};
const apiHeaders = response => {
  headerEquals(response, "x-content-type-options", "nosniff");
  noStore(response);
};

function findEntryAsset(html) {
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\btype\s*=\s*["']module["']/i.test(tag)) continue;
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src && /^\/assets\/[\w.-]+\.m?js$/.test(src)) return src;
  }
  throw new ProbeError("Vite module entry asset not present in HTML");
}

export async function runChecks({ fetcher = fetch, frontend = FRONTEND, api = API, clock = Date.now } = {}) {
  const results = [];
  // Redirects are not followed; each check is bound to the intended origin.
  const get = (base, path, timeoutMs = 15_000, headers = {}) =>
    fetcher(new URL(path, base), { method: "GET", redirect: "manual", signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "StudyOS-Production-Monitor/1", ...headers } });

  async function check(name, work) {
    const start = clock();
    try {
      await work();
      results.push({ name, pass: true, ms: Math.max(0, clock() - start) });
      return true;
    } catch (error) {
      // TypeError from fetch may contain OS messages or URLs. Never emit them.
      let detail = error?.name === "TimeoutError" || error?.name === "AbortError" ? "Request timed out"
        : error instanceof TypeError ? "Network request failed"
        : error instanceof ProbeError ? error.message
        : "Probe failed";
      results.push({ name, pass: false, ms: Math.max(0, clock() - start), detail });
      return false;
    }
  }

  const frontendWork = async () => {
    const assets = new Set(), styles = new Set();
    for (const [path, name, workspace] of [["/", "Frontend HTML", false], ["/app/settings", "Workspace deep link", true]]) {
      await check(name, async () => {
        const response = await get(frontend, path, 25_000);
        expect(response.status === 200, `Expected HTML status 200, got ${response.status}`);
        frontendHeaders(response);
        expect(contentType(response).includes("text/html"), "Expected HTML content type");
        if (workspace) expect(/\bnoindex\b/i.test(response.headers.get("x-robots-tag") || ""), "Workspace noindex header missing");
        const html = await bodyText(response);
        expect(/<title>[^<]*StudyOS/i.test(html), "StudyOS document title missing");
        expect(/id=["']root["']/.test(html), "StudyOS app root missing");
        assets.add(findEntryAsset(html));
        const css = html.match(/<link\b[^>]*href=["'](\/assets\/[\w.-]+\.css)["'][^>]*>/i)?.[1];
        expect(css, "Built stylesheet missing from HTML");
        styles.add(css);
      });
    }
    if (assets.size) await check("Frontend JavaScript asset", async () => {
      for (const asset of assets) {
        const response = await get(frontend, asset, 25_000);
        expect(response.status === 200, `Expected asset status 200, got ${response.status}`);
        expect(/(?:javascript|ecmascript)/.test(contentType(response)), "Module asset is not JavaScript");
        const source = await bodyText(response);
        expect(source.length > 100 && !/^\s*<(?:!doctype|html)/i.test(source), "Module asset is missing or HTML fallback");
      }
    });
    if (styles.size) await check("Frontend CSS asset", async () => {
      for (const style of styles) {
        const response = await get(frontend, style, 25_000);
        expect(response.status === 200, `Expected stylesheet status 200, got ${response.status}`);
        expect(contentType(response).includes("text/css"), "Stylesheet is not CSS");
        const source = await bodyText(response);
        expect(source.length > 100 && !/^\s*<(?:!doctype|html)/i.test(source), "Stylesheet is missing or HTML fallback");
      }
    });
  };

  const apiWork = async () => {
    // Render's free service may sleep; the first probe is allowed a cold start.
    const live = await check("API liveness", async () => {
      const response = await get(api, "/api/health", 90_000);
      expect(response.status === 200, `Expected health status 200, got ${response.status}`);
      apiHeaders(response);
      const payload = await json(response);
      expect(payload?.status === "ok" && payload?.service === "studyos-api", "API liveness degraded");
    });
    if (!live) return; // Do not multiply requests to a down backend.
    await Promise.all([
    check("Database and auth readiness", async () => {
      const response = await get(api, "/api/health/ready", 20_000);
      apiHeaders(response);
      expect(response.status === 200, `Readiness status ${response.status}`);
      const payload = await json(response);
      expect(payload?.status === "ok" &&
        ["studyDatabase", "socialDatabase", "authConfiguration"].every(key => payload.checks?.[key] === "ready"), "Dependency readiness degraded");
    }),
    check("Allowed frontend origin", async () => {
      const response = await get(api, "/api/health", 15_000, { Origin: frontend });
      expect(response.status === 200, `Expected health status 200, got ${response.status}`);
      expect(response.headers.get("access-control-allow-origin") === frontend, "Trusted frontend CORS origin not allowed");
      await response.body?.cancel();
    }),
    check("Foreign browser origin denied", async () => {
      const response = await get(api, "/api/health", 15_000, { Origin: "https://monitor-negative-test.invalid" });
      expect(!response.headers.get("access-control-allow-origin"), "Foreign origin received CORS access");
      expect(response.status === 403, `Expected CORS status 403, got ${response.status}`);
      await response.body?.cancel();
    }),
    ...["notes", "tasks", "groups", "study-sessions"].map(route =>
      check(`Anonymous ${route} denied`, async () => {
        const response = await get(api, "/api/" + route);
        apiHeaders(response);
        expect([401, 403].includes(response.status), `Anonymous request returned ${response.status}, expected 401 or 403`);
        const payload = await json(response);
        expect(payload && typeof payload.message === "string" && Object.keys(payload).every(key => key === "message"),
          "Unauthorized response has unexpected data fields");
      })),
    ]);
  };
  await Promise.all([frontendWork(), apiWork()]);
  return results;
}

function format(results) {
  return ["| Check | Result | Duration |", "| --- | --- | ---: |",
    ...results.map(r => `| ${r.name} | ${r.pass ? "PASS" : "FAIL: " + r.detail} | ${r.ms} ms |`)].join("\n");
}

async function main() {
  let results = await runChecks();
  if (results.some(r => !r.pass)) {
    console.log("Initial probe failed; confirming after 20 seconds.");
    console.log(format(results));
    await new Promise(resolve => setTimeout(resolve, 20_000));
    results = await runChecks();
  }
  const output = format(results);
  console.log(output);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## StudyOS production checks\n\n${output}\n`);
  if (results.some(r => !r.pass)) {
    console.error("Confirmed production check failure.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
