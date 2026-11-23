const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");

// Integration checks use a real Express HTTP server, with Firebase and MongoDB
// replaced by controlled in-memory stubs. No production credentials are needed.
test("IP ban administration is owner-only, validates input, and requires recent sign-in", async () => {
  const express = require("express");
  const originalLoad = Module._load;
  const records = new Map();
  const stubModel = {
    find() {
      return {
        sort() { return this; },
        limit() { return this; },
        select() { return this; },
        async lean() { return [...records.values()]; },
      };
    },
    findOneAndUpdate({ ip }, changes) {
      const ban = {
        ...records.get(ip),
        ...changes.$set,
        ip,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(ip, ban);
      return {
        select() { return this; },
        async lean() { return ban; },
      };
    },
    async deleteOne({ ip }) {
      return { deletedCount: records.delete(ip) ? 1 : 0 };
    },
  };

  const mockFirebase = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) return res.status(401).json({ message: "Authentication required" });
    req.user = { uid: token === "other" ? "other-user" : "admin-user" };
    next();
  };
  const mockAdmin = {
    async verifyIdToken(token, revocationCheck) {
      assert.equal(revocationCheck, true);
      return {
        uid: token === "other" ? "other-user" : "admin-user",
        auth_time: Math.floor(Date.now() / 1000) - (token === "old" ? 3600 : 30),
      };
    },
  };

  Module._load = function (request, parent, isMain) {
    if (parent?.filename?.endsWith("securityAdminRoutes.js")) {
      if (request === "../middleware/firebaseAuth") return mockFirebase;
      if (request === "../config/firebaseAdmin") return mockAdmin;
      if (request === "../models/BannedIp") return stubModel;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  let router;
  try {
    router = require("../routes/securityAdminRoutes");
  } finally {
    Module._load = originalLoad;
  }

  const app = express();
  app.use(express.json());
  app.use("/api/security", router);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  async function call(path, { method = "GET", token = "admin", body } = {}) {
    const response = await fetch(url + "/api/security" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  }

  const originalUid = process.env.STUDYOS_SECURITY_ADMIN_UID;
  try {
    delete process.env.STUDYOS_SECURITY_ADMIN_UID;
    let result = await call("/me");
    assert.equal(result.status, 200);
    assert.equal(result.body.authorized, false);
    assert.equal(result.body.uid, "admin-user");
    assert.equal((await call("/bans")).status, 403);

    process.env.STUDYOS_SECURITY_ADMIN_UID = "admin-user";
    result = await call("/me");
    assert.equal(result.body.authorized, true);
    assert.equal((await call("/bans", { token: "other" })).status, 403);

    const good = {
      ip: "203.0.113.42",
      reason: "Verified repeated abuse",
      durationHours: 24,
      permanent: false,
    };

    assert.equal((await call("/bans", { method: "POST", token: "old", body: good })).status, 403);
    assert.equal((await call("/bans", { method: "POST", body: { ...good, ip: "nonsense" } })).status, 400);
    assert.equal((await call("/bans", { method: "POST", body: { ...good, ip: "127.0.0.1" } })).status, 400);

    result = await call("/bans", { method: "POST", body: good });
    assert.equal(result.status, 201);
    assert.equal(result.body.ban.ip, good.ip);
    assert.ok(result.body.ban.expiresAt);
    result = await call("/bans");
    assert.equal(result.body.bans.length, 1);

    result = await call("/bans/203.0.113.42", { method: "DELETE" });
    assert.equal(result.status, 200);
    assert.equal(result.body.removed, true);
    assert.equal((await call("/bans")).body.bans.length, 0);
  } finally {
    if (originalUid == null) delete process.env.STUDYOS_SECURITY_ADMIN_UID;
    else process.env.STUDYOS_SECURITY_ADMIN_UID = originalUid;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
