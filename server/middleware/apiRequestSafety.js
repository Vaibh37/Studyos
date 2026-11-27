const { logError } = require("../utils/safeLogger");
// Cross-route safety checks. Express's default JSON limit is 100kb;
// keep that behavior explicit, add predictable 4xx errors and reject
// dangerous object keys before route handlers touch user input.
const MAX_JSON_BYTES = 100 * 1024;
const MAX_URL_CHARS = 8192;
const MAX_QUERY_PARAMS = 48;
const MAX_BODY_DEPTH = 32;
const MAX_BODY_NODES = 5000;
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const forbiddenKey = key => BLOCKED_KEYS.has(key) || key.startsWith("$") || key.includes(".");

function checkJsonShape(value) {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "JSON request body must be an object";
  }

  const stack = [{ value, depth: 0 }];
  let visited = 0;
  while (stack.length) {
    const entry = stack.pop();
    visited += 1;
    if (visited > MAX_BODY_NODES || entry.depth > MAX_BODY_DEPTH) {
      return "JSON request body is too complex";
    }

    if (entry.value === null || typeof entry.value !== "object") continue;
    for (const [key, child] of Object.entries(entry.value)) {
      if (forbiddenKey(key)) {
        return "JSON request body contains a forbidden field name";
      }
      stack.push({ value: child, depth: entry.depth + 1 });
    }
  }
  return null;
}

function validateApiRequest(req, res, next) {
  // Measure before decoding query strings; prevent oversized URLs from
  // being processed by downstream query/search handlers.
  const rawUrl = req.originalUrl || req.url || "";
  if (rawUrl.length > MAX_URL_CHARS) {
    return res.status(414).json({ message: "Request URL is too long" });
  }

  const queryStart = rawUrl.indexOf("?");
  const query = queryStart === -1 ? "" : rawUrl.slice(queryStart + 1);
  if (query && query.split("&").length > MAX_QUERY_PARAMS) {
    return res.status(400).json({ message: "Too many query parameters" });
  }

  // No public StudyOS endpoint accepts database operators or nested query keys.
  // URLSearchParams decodes percent-encoded bracket/operator spellings. Values
  // are untouched (users may legitimately search for "$" or ".").
  const seenQueryKeys = new Set();
  for (const key of new URLSearchParams(query).keys()) {
    if (forbiddenKey(key) || /[\[\]]/.test(key) || seenQueryKeys.has(key)) {
      return res.status(400).json({ message: "Query contains a forbidden or repeated field name" });
    }
    seenQueryKeys.add(key);
  }

  const contentLength = Number(req.headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return res.status(413).json({ message: "Request body is too large" });
  }

  const hasBody = (Number.isFinite(contentLength) && contentLength > 0) ||
    Boolean(req.headers["transfer-encoding"]);
  const canHaveBody = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (hasBody && canHaveBody) {
    const mimeType = (req.headers["content-type"] || "")
      .split(";")[0].trim().toLowerCase();
    if (mimeType !== "application/json") {
      return res.status(415).json({
        message: "API request bodies must use application/json",
      });
    }
  }

  return next();
}

function validateParsedJson(req, res, next) {
  const message = checkJsonShape(req.body);
  if (message) return res.status(400).json({ message });
  return next();
}

function safeApiErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.code === "ORIGIN_DENIED") return res.status(403).json({ message: "Origin not allowed" });
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  if (err.type === "entity.parse.failed" || err.type === "request.aborted" ||
      err.type === "request.size.invalid") {
    return res.status(400).json({ message: "Invalid JSON request body" });
  }
  if (err.type === "encoding.unsupported" || err.type === "charset.unsupported") {
    return res.status(415).json({ message: "Unsupported request encoding" });
  }
  // Do not echo malformed values, authorization tokens, or stack traces.
  logError("API request failed:", err);
  return res.status(500).json({ message: "Internal server error" });
}

module.exports = {
  MAX_JSON_BYTES,
  checkJsonShape,
  validateApiRequest,
  validateParsedJson,
  safeApiErrorHandler,
};
