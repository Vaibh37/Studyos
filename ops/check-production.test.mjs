import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { runChecks } from "./check-production.mjs";

function fixture(options = {}) {
  const requests = [];
  let origin;
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, origin: req.headers.origin });
    const send = (status, type, value) => {
      res.statusCode = status;
      res.setHeader("Content-Type", type);
      res.end(value);
    };
    const json = (status, payload) => send(status, "application/json", JSON.stringify(payload));
    if (req.url.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (req.headers.origin === origin) res.setHeader("Access-Control-Allow-Origin", origin);
      else if (req.headers.origin) {
        if (options.allowForeignOrigin) {
          res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
          return json(200, { status: "ok", service: "studyos-api" });
        }
        return json(403, { message: "Origin not allowed" });
      }
      if (req.url === "/api/health") return json(options.down ? 503 : 200, {status: options.down ? "unavailable" : "ok", service:"studyos-api"});
      if (req.url === "/api/health/ready") return json(options.socialDown ? 503 : 200, {status:options.socialDown ? "unavailable" : "ok", checks:{
        studyDatabase:"ready", socialDatabase:options.socialDown?"unavailable":"ready", authConfiguration:"ready"}});
      if (options.leakNotes && req.url === "/api/notes") return json(200, [{privateText:"must not appear in probe result"}]);
      if (options.leakOnDenied && req.url === "/api/notes") return json(403, {message:"Denied", privateText:"must not appear in probe result"});
      return json(403, {message:"App verification required"});
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", options.frameMissing ? "SAMEORIGIN" : "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (req.url === "/app/settings" && !options.noindexMissing) res.setHeader("X-Robots-Tag", "noindex, nofollow");
    const html = '<html><head><title>StudyOS | Workspace</title><script type="module" crossorigin src="/assets/index-Ab10.js"></script><link rel="stylesheet" href="/assets/index-CD2.css"></head><body><div id="root"></div></body></html>';
    if (req.url === "/" || req.url === "/app/settings") return send(200,"text/html",html);
    if (req.url === "/assets/index-Ab10.js") return options.brokenAsset
      ? send(200,"text/html",html) : send(200,"text/javascript","console.log('safe fixture');".repeat(10));
    if (req.url === "/assets/index-CD2.css") return options.brokenCss
      ? send(200,"text/html",html) : send(200,"text/css","body { color: white; }".repeat(10));
    return send(404,"text/plain","not found");
  });
  return {
    requests,
    async start() {
      await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
      origin = "http://127.0.0.1:" + server.address().port;
      return origin;
    },
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

async function scenario(options = {}) {
  const instance = fixture(options);
  const origin = await instance.start();
  try {
    const results = await runChecks({frontend:origin,api:origin});
    return {results, requests:instance.requests};
  } finally {await instance.close()}
}

test("production monitor checks current assets, deep links, readiness, CORS and read-only auth denial", async () => {
  const {results,requests} = await scenario();
  assert.equal(results.length, 12, JSON.stringify(results));
  assert.ok(results.every(r=>r.pass), JSON.stringify(results));
  assert.ok(requests.every(r=>r.method==="GET"));
  assert.equal(requests.filter(r=>r.url==="/assets/index-Ab10.js").length,1);
});

test("monitor detects HTML fallback assets and missing frontend security headers", async () => {
  const broken = await scenario({brokenAsset:true,brokenCss:true,noindexMissing:true});
  assert.ok(broken.results.find(r=>r.name==="Workspace deep link"&&!r.pass));
  assert.ok(broken.results.find(r=>r.name==="Frontend JavaScript asset"&&!r.pass));
  assert.ok(broken.results.find(r=>r.name==="Frontend CSS asset"&&!r.pass));
  assert.ok((await scenario({frameMissing:true})).results.some(r=>r.detail?.includes("x-frame-options")));
});

test("monitor detects unauthorized data access without collecting returned private data", async () => {
  for (const options of [{leakNotes:true}, {leakOnDenied:true}]) {
    const {results} = await scenario(options);
    assert.equal(results.find(r=>r.name==="Anonymous notes denied").pass,false);
    assert.ok(!JSON.stringify(results).includes("must not appear"));
  }
});

test("monitor detects CORS and social database degradation", async () => {
  const {results} = await scenario({socialDown:true,allowForeignOrigin:true});
  assert.equal(results.find(r=>r.name==="Database and auth readiness").pass,false);
  assert.equal(results.find(r=>r.name==="Foreign browser origin denied").pass,false);
});

test("down API does not trigger more production requests or fake green checks", async () => {
  const {results,requests}=await scenario({down:true});
  assert.equal(results.find(r=>r.name==="API liveness").pass,false);
  assert.equal(requests.filter(r=>r.url.startsWith("/api/")).length,1);
});
