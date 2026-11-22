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
