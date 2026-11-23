const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const {
  validateApiRequest,
  validateParsedJson,
  safeApiErrorHandler,
} = require("../middleware/apiRequestSafety");

// Real HTTP tests without Firebase users or production databases.
test("API request limits reject malformed, oversized and dangerous payloads cleanly", async () => {
  const app = express();
  app.use("/api", validateApiRequest);
  app.use(express.json({ limit: "100kb", strict: true }));
  app.use("/api", validateParsedJson);
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.post("/api/echo", (req, res) => res.json({ ok: true, data: req.body }));
  app.post("/api/failure", () => {
    throw new Error("SECRET INTERNAL STACK should never be returned");
  });
  app.use("/api", safeApiErrorHandler);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;

  const call = async (path, { method = "POST", body, contentType = "application/json" } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: body === undefined ? {} : { "Content-Type": contentType },
      body,
    });
    return {
      status: response.status,
      data: await response.json(),
    };
  };

  try {
    assert.equal((await call("/api/health", { method: "GET" })).status, 200);
    assert.equal((await call("/api/echo", {
      body: JSON.stringify({ title: "note", content: "hello" }),
    })).status, 200);
    assert.equal((await call("/api/echo", {
      body: JSON.stringify({ content: "x".repeat(90 * 1024) }),
    })).status, 200);

    const oversized = await call("/api/echo", {
      body: JSON.stringify({ content: "x".repeat(105 * 1024) }),
    });
    assert.equal(oversized.status, 413);
    assert.equal(oversized.data.message, "Request body is too large");

    const invalid = await call("/api/echo", { body: "{invalid" });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.message, "Invalid JSON request body");

    assert.equal((await call("/api/echo", { body: "[]" })).status, 400);
    assert.equal((await call("/api/echo", {
      body: JSON.stringify({ note: { rows: [{ constructor: { bad: true } }] } }),
    })).status, 400);
    assert.equal((await call("/api/echo", {
      body: '{"note":{"__proto__":{"admin":true}}}',
    })).status, 400);
    assert.equal((await call("/api/echo", {
      body: '{"note":{"prototype":{"admin":true}}}',
    })).status, 400);
    let nested = { safe: true };
    for (let n = 0; n < 40; n++) nested = { item: nested };
    assert.equal((await call("/api/echo", {
      body: JSON.stringify(nested),
    })).status, 400);

    assert.equal((await call("/api/echo", {
      body: "plain data", contentType: "text/plain",
    })).status, 415);
    assert.equal((await call("/api/echo", {
      body: "<note>wrong format</note>", contentType: "application/xml",
    })).status, 415);
    const manyParams = "k=1&".repeat(49) + "last=ok";
    assert.equal((await call("/api/health?" + manyParams, {
      method: "GET",
    })).status, 400);
    assert.equal((await call("/api/health?q=" + "x".repeat(8192), {
      method: "GET",
    })).status, 414);

    const internal = await call("/api/failure", { body: "{}" });
    assert.equal(internal.status, 500);
    assert.equal(internal.data.message, "Internal server error");
    assert.ok(!JSON.stringify(internal.data).includes("SECRET INTERNAL STACK"));
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
});
