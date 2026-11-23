// Temporary Render proxy diagnostic has completed.
// The endpoint is intentionally disabled until this test service is deleted.
// No request headers or IP addresses are logged, stored, or returned.
const http = require("node:http");
const server = http.createServer((req, res) => {
  res.writeHead(410, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify({ message: "Temporary diagnostic retired" }));
});
server.listen(Number(process.env.PORT || 10000), "0.0.0.0", () => {
  console.log("Temporary diagnostic retired; delete studyos-ip-probe in Render");
});
