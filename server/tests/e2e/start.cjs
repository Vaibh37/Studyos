// Run the REAL production API entry point against disposable local dependencies.
// This file is never imported by server/server.js.
const { randomUUID } = require("node:crypto");
const http = require("node:http");
if (process.env.STUDYOS_E2E !== "isolated-local-only") throw Error("Isolated E2E opt-in required");
// Do not inherit provider credentials, production database URLs or .env files.
const safeEnv = Object.fromEntries(["PATH", "HOME", "SystemRoot", "TMPDIR", "TEMP"].filter(k => process.env[k]).map(k => [k, process.env[k]]));
for (const key of Object.keys(process.env)) delete process.env[key];
Object.assign(process.env, safeEnv, {
  NODE_ENV: "test", PORT: "5500", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIREBASE_PROJECT_ID: "demo-studyos-e2e", GCLOUD_PROJECT: "demo-studyos-e2e",
  FRONTEND_URL: "http://127.0.0.1:5174",
  STUDYOS_R2_ORPHAN_MODE: "off", STUDYOS_APP_CHECK_MODE: "off",
  ENABLE_ACCOUNT_DELETION: "true",
  STUDYOS_TURNSTILE_MODE: "off", STUDYOS_TRUST_PROXY_HOPS: "0",
});
const namespace = "studyos_e2e_" + randomUUID().replaceAll("-", "");
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/" + namespace + "_study";
process.env.MONGO_SOCIAL_URI = "mongodb://127.0.0.1:27017/" + namespace + "_social";
require("dotenv").config = () => ({ parsed: {} });

// Off by construction: no production Firebase credential or R2 endpoint.
const { initializeApp } = require("firebase-admin/app");
initializeApp({ projectId: "demo-studyos-e2e" });
const { S3Client } = require("@aws-sdk/client-s3");
const r2Config = require.resolve("../../config/r2");
require.cache[r2Config] = {
  id: r2Config, filename: r2Config, loaded: true, exports: {
    r2Client: new S3Client({ region: "auto", endpoint: "http://127.0.0.1:5560",
      forcePathStyle: true, credentials: { accessKeyId: "local-e2e", secretAccessKey: "local-only-fixture" },
      requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" }),
    R2_BUCKET_NAME: "studyos-e2e", R2_REGION: "auto",
  },
};

// Production server uses server.listen(port). Restrict that test process to
// localhost without adding any insecure conditional logic to production code.
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (port, ...args) {
  if (String(port) === "5500") return listen.call(this, 5500, "127.0.0.1", ...args);
  return listen.call(this, port, ...args);
};

const mongoose = require("mongoose");
const { socialDB } = require("../../config/socialDb");
const { startStore } = require("./objectStore.cjs");
async function run() {
  const store = await startStore();
  let cleaning = false;
  const cleanup = async () => {
    if (cleaning) return;
    cleaning = true;
    // Only the two randomly named loopback test databases can be dropped.
    for (const connection of [mongoose.connection, socialDB]) {
      if (connection.readyState === 1 && connection.name?.startsWith(namespace + "_")) {
        await connection.dropDatabase(); await connection.close();
      }
    }
    store.closeAllConnections(); store.close();
    process.exit(0);
  };
  process.once("SIGTERM", () => cleanup().catch(() => process.exit(1)));
  process.once("SIGINT", () => cleanup().catch(() => process.exit(1)));
  require("../../server.js");
  // Private parent-process control for a final, isolated IP-ban test.
  // No test endpoint is added to Express, no arbitrary IPs or DB names accepted.
  if (process.send) {
    const BannedIp = require("../../models/BannedIp");
    process.on("message", async message => {
      if (!["ban-loopback", "unban-loopback"].includes(message?.action)) return;
      try {
        if (mongoose.connection.name !== namespace + "_study") throw Error("Unexpected database");
        if (message.action === "ban-loopback") {
          await BannedIp.updateOne({ ip: "127.0.0.1" }, {
            $set: { reason: "Isolated E2E IP ban", expiresAt: null }
          }, { upsert: true });
        } else {
          await BannedIp.deleteOne({ ip: "127.0.0.1" });
        }
        process.send?.({ id: message.id, ok: true });
      } catch {
        process.send?.({ id: message.id, ok: false });
      }
    });
  }
}
run().catch(error => { console.error("Isolated server startup failed:", error.message); process.exit(1); });
