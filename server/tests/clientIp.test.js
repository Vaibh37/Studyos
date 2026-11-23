const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeIp, getClientIp } = require("../utils/clientIp");

test("normalizes IPv4 and IPv4-mapped IPv6 consistently", () => {
  assert.equal(normalizeIp("203.0.113.42"), "203.0.113.42");
  assert.equal(normalizeIp("::ffff:203.0.113.42"), "203.0.113.42");
  assert.equal(normalizeIp("2001:0DB8:0000:0::1"), "2001:db8::1");
  assert.equal(normalizeIp("not an ip"), null);
});

test("ignores forwarded headers when no proxy is trusted", () => {
  assert.equal(getClientIp({
    socket: { remoteAddress: "198.51.100.9" },
    headers: { "x-forwarded-for": "203.0.113.1" },
  }, 0), "198.51.100.9");
});

test("uses only the nearest untrusted hop, not an arbitrary leftmost address", () => {
  assert.equal(getClientIp({
    socket: { remoteAddress: "198.51.100.9" },
    headers: { "x-forwarded-for": "192.0.2.77, 203.0.113.42" },
  }, 1), "203.0.113.42");
});

test("supports two trusted reverse proxies when explicitly configured", () => {
  assert.equal(getClientIp({
    socket: { remoteAddress: "198.51.100.9" },
    headers: { "x-forwarded-for": "192.0.2.77, 203.0.113.42" },
  }, 2), "192.0.2.77");
});

test("Render three-hop chain identifies the visitor with or without a forged prefix", () => {
  const remoteAddress = "192.0.2.9";
  const client = "203.0.113.42";
  const cloudflare = "198.51.100.11";
  const render = "198.51.100.22";
  const request = (xff) => ({
    socket: { remoteAddress },
    headers: { "x-forwarded-for": xff },
  });

  // Probe on Nov 22, 2026: 3 normal XFF entries; 4 with a forged prefix.
  const normal = request([client, cloudflare, render].join(", "));
  const spoofed = request(["192.0.2.123", client, cloudflare, render].join(", "));
  assert.equal(getClientIp(normal, 3), client);
  assert.equal(getClientIp(spoofed, 3), client);
  assert.equal(getClientIp(spoofed, 4), "192.0.2.123");
});

test("real Express trust proxy setting of 3 ignores an extra forged prefix", async () => {
  const express = require("express");
  const app = express();
  app.set("trust proxy", 3);
  app.get("/ip", (req, res) => res.json({ clientIp: getClientIp(req) }));

  const server = await new Promise(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });

  try {
    const base = "http://127.0.0.1:" + server.address().port + "/ip";
    const expected = "203.0.113.42";
    for (const chain of [
      "203.0.113.42, 198.51.100.17, 198.51.100.18",
      "192.0.2.123, 203.0.113.42, 198.51.100.17, 198.51.100.18",
    ]) {
      const response = await fetch(base, { headers: { "X-Forwarded-For": chain } });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.clientIp, expected);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
