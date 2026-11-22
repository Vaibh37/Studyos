// Temporary Render-only diagnostic.
// Never reveals, stores, or logs IP addresses or forwarding-header values.
// Delete the temporary Render service after verifying trusted proxy behavior.
const http = require("node:http");
const { getClientIp, normalizeIp } = require("../utils/clientIp");

function diagnose(req) {
  const cf = normalizeIp(req.headers["cf-connecting-ip"]);
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedCount = typeof forwarded === "string"
    ? forwarded.split(",").filter((x) => x.trim().length > 0).length
    : 0;

  const matchesCloudflareHeader = {};
  for (const hops of [0, 1, 2, 3, 4]) {
    const candidate = getClientIp(req, hops);
    matchesCloudflareHeader["hops" + hops] =
      Boolean(cf && candidate && cf === candidate);
  }

  return {
    message: "StudyOS temporary Render proxy diagnostic",
    cloudflareClientHeaderPresent: Boolean(cf),
    forwardedHeaderCount: forwardedCount,
    matchesCloudflareHeader,
    note: "Compare results for a regular request and one sent with a spoofed X-Forwarded-For header. No IPs are disclosed.",
  };
}

const server = http.createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" || req.url?.split("?")[0] !== "/probe") {
    res.statusCode = 404;
    res.end(JSON.stringify({ message: "Not found" }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify(diagnose(req), null, 2));
});

const port = Number(process.env.PORT || 10000);
server.listen(port, "0.0.0.0", () => {
  console.log("Temporary proxy diagnostics listening on port " + port);
});
