const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { io: connect } = require("../../client/node_modules/socket.io-client");
const BannedIp = require("../models/BannedIp");
const {
  blockBannedApiIp,
  blockBannedSocketIp,
  disconnectBannedSockets,
} = require("../middleware/ipBans");

// This test is ONLY intended for an isolated CI MongoDB service. Never
// substitute production credentials or production IP addresses.
test("isolated MongoDB + real HTTP + Socket.IO bans identify separate synthetic clients", async () => {
  const uri = "mongodb://127.0.0.1:27017/studyos_security_ci";
  if (process.env.STUDYOS_TEST_MONGO_URI !== uri) {
    throw new Error("Refusing to run outside isolated CI MongoDB");
  }
  process.env.STUDYOS_TRUST_PROXY_HOPS = "3";

  const target = "203.0.113.42";
  const safe = "203.0.113.43";
  const chain = (ip) => [ip, "198.51.100.17", "198.51.100.18"].join(", ");

  await mongoose.connect(uri);
  const app = express();
  app.set("trust proxy", 3);
  app.use("/api", blockBannedApiIp);
  app.get("/api/ping", (req, res) => res.json({ ok: true }));
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { transports: ["websocket"] });
  io.use(blockBannedSocketIp);

  const liveClients = new Set();
  function connectAs(origin, port) {
    return new Promise((resolve) => {
      const client = connect("http://127.0.0.1:" + port, {
        transports: ["websocket"],
        extraHeaders: { "X-Forwarded-For": chain(origin) },
        reconnection: false,
        timeout: 3000,
      });
      liveClients.add(client);
      client.once("connect", () => resolve({ client }));
      client.once("connect_error", (error) => {
        client.disconnect();
        resolve({ error: error.message });
      });
    });
  }

  try {
    await BannedIp.deleteMany({ ip: { $in: [target, safe] } });
    await new Promise(resolve => httpServer.listen(0, "127.0.0.1", resolve));
    const port = httpServer.address().port;
    const ping = async (ip) => fetch("http://127.0.0.1:" + port + "/api/ping", {
      headers: { "X-Forwarded-For": chain(ip) },
    });

    assert.equal((await ping(target)).status, 200);
    const connectedTarget = await connectAs(target, port);
    const connectedSafe = await connectAs(safe, port);
    assert.ok(connectedTarget.client?.connected);
    assert.ok(connectedSafe.client?.connected);

    await BannedIp.create({
      ip: target,
      reason: "CI isolated test",
      expiresAt: new Date(Date.now() + 600000),
    });

    assert.equal((await ping(target)).status, 403);
    assert.equal((await ping(safe)).status, 200);
    assert.equal((await connectAs(target, port)).error, "Access denied");

    const disconnected = new Promise(resolve => connectedTarget.client.once("disconnect", resolve));
    const count = await disconnectBannedSockets(io);
    assert.equal(count, 1);
    await disconnected;
    assert.ok(connectedSafe.client.connected);

    await BannedIp.deleteOne({ ip: target });
    assert.equal((await ping(target)).status, 200);
    const reopened = await connectAs(target, port);
    assert.ok(reopened.client?.connected);
  } finally {
    for (const client of liveClients) client.disconnect();
    await new Promise(resolve => io.close(resolve));
    await BannedIp.deleteMany({ ip: { $in: [target, safe] } });
    await mongoose.disconnect();
  }
});
