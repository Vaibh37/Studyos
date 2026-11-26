// Loopback-only S3 wire fixture. Real application AWS signing, PUT/HEAD/GET,
// CORS and bytes are exercised; only Cloudflare's signature verification is
// substituted (the separate realtimeSecurity tests check the signer).
const http = require("node:http");
const { createHash } = require("node:crypto");
const ORIGIN = "http://127.0.0.1:5174";
const BUCKET = "studyos-e2e";
const MAX = 64 * 1024;
function startStore() {
  const objects = new Map();
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && origin !== ORIGIN) return res.writeHead(403).end();
    if (origin) res.setHeader("Access-Control-Allow-Origin", ORIGIN);
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, PUT, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "content-type, content-length, x-amz-checksum-crc32, x-amz-sdk-checksum-algorithm");
      return res.writeHead(204).end();
    }
    const url = new URL(req.url, "http://127.0.0.1:5560");
    const key = decodeURIComponent(url.pathname);
    if (!key.startsWith("/" + BUCKET + "/groups/")) return res.writeHead(404).end();
    const signed = url.searchParams.has("X-Amz-Signature") && url.searchParams.has("X-Amz-Credential");
    if (req.method === "PUT") {
      const headers = new Set((url.searchParams.get("X-Amz-SignedHeaders") || "").split(";"));
      const length = Number(req.headers["content-length"]);
      if (!signed || !headers.has("content-type") || !headers.has("content-length") ||
          req.headers["content-type"] !== "text/plain" || !Number.isSafeInteger(length) || length < 1 || length > MAX) {
        return res.writeHead(403).end();
      }
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX) { req.destroy(); return; }
        chunks.push(chunk);
      }
      if (size !== length) return res.writeHead(400).end();
      const bytes = Buffer.concat(chunks);
      const etag = '"' + createHash("sha256").update(bytes).digest("hex").slice(0, 32) + '"';
      objects.set(key, { bytes, type: req.headers["content-type"], etag });
      res.setHeader("ETag", etag);
      return res.writeHead(200).end();
    }
    const stored = objects.get(key);
    // HEAD is an SDK request; the fixture accepts an AWS authorization header.
    if (req.method === "HEAD" && !req.headers.authorization?.startsWith("AWS4-HMAC-SHA256 ")) return res.writeHead(403).end();
    if (req.method === "GET" && !signed) return res.writeHead(403).end();
    if (!stored) return res.writeHead(404).end();
    if (req.method !== "GET" && req.method !== "HEAD") return res.writeHead(405).end();
    res.setHeader("Content-Type", stored.type);
    res.setHeader("Content-Length", stored.bytes.length);
    res.setHeader("ETag", stored.etag);
    res.setHeader("Last-Modified", new Date().toUTCString());
    if (req.method === "GET") res.setHeader("Content-Disposition", 'attachment; filename="studyos-e2e.txt"');
    return res.writeHead(200).end(req.method === "GET" ? stored.bytes : undefined);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(5560, "127.0.0.1", () => resolve(server));
  });
}
module.exports = { startStore };
