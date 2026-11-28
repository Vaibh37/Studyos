const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const mongoose = require("mongoose");
const express = require("express");

const StudySession = require("../models/StudySession");
const FocusRun = require("../models/FocusRun");
const LeaderboardProfile = require("../models/LeaderboardProfile");

test("Focus ranking requires per-user server-timed, one-use sessions and rejects forged durations", async () => {
  if (process.env.STUDYOS_TEST_MONGO_URI !== "mongodb://127.0.0.1:27017/studyos_security_ci") {
    throw new Error("Refusing leaderboard test outside isolated CI MongoDB");
  }

  const uri = "mongodb://127.0.0.1:27017/studyos_leaderboard_security_ci";
  const owner = "leaderboard-ci-user-a";
  const other = "leaderboard-ci-user-b";
  const auth = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (![owner, other].includes(token)) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.user = { uid: token, name: token };
    next();
  };
  const fakeAdmin = {
    async getUsers(ids) {
      return { users: ids.map(({ uid }) => ({ uid })), notFound: [] };
    },
  };

  const load = Module._load;
  Module._load = function (request, parent, isMain) {
    if (
      ["studySessionRoutes.js", "leaderboardRoutes.js"].some((name) =>
        parent?.filename?.endsWith(name))
    ) {
      if (request === "../middleware/firebaseAuth") return auth;
      if (request === "../config/firebaseAdmin") return fakeAdmin;
    }
    return load.call(this, request, parent, isMain);
  };

  let studyRoutes;
  let leaderboardRoutes;
  try {
    studyRoutes = require("../routes/studySessionRoutes");
    leaderboardRoutes = require("../routes/leaderboardRoutes");
  } finally {
    Module._load = load;
  }

  const app = express();
  const milestones = [];
  app.set("io", { studyRoomPresence: {
    recordSavedSession: (uid, seconds) => milestones.push({ uid, seconds }),
    refreshProgress: () => {},
  } });
  app.use(express.json());
  app.use("/api/study-sessions", studyRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  const server = http.createServer(app);
  let opened = false;

  try {
    await mongoose.connect(uri);
    opened = true;
    await LeaderboardProfile.create({
      userId: owner,
      displayName: "CI Focus User",
      isPublic: true,
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;

    async function call(uid, route, method = "GET", body) {
      const response = await fetch(base + route, {
        method,
        headers: {
          Authorization: "Bearer " + uid,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, body: await response.json() };
    }

    const now = Date.now();
    const start = new Date(now - 70 * 1000).toISOString();
    const end = new Date(now).toISOString();
    const payload = {
      subjectName: "CI Focus",
      plannedMinutes: 2,
      durationSeconds: 60,
      startedAt: start,
      endedAt: end,
    };
    const path = "/api/study-sessions";
    assert.equal((await call("unauthenticated", path + "/start", "POST")).status, 401);

    // Old or imported sessions remain personal history but cannot earn new
    // leaderboard credit after the legacy cutoff.
    const personal = await call(owner, path, "POST", { ...payload, verified: true });
    assert.equal(personal.status, 201);
    assert.equal(personal.body.verified, false);
    assert.equal(milestones.length, 0);
    assert.equal((await call(owner, "/api/leaderboard")).body.leaderboard[0].focusMinutes, 0);

    const initial = await call(owner, path + "/start", "POST");
    assert.equal(initial.status, 201);
    assert.ok(initial.body.runId);

    const crossUser = await call(other, path, "POST", {
      ...payload, runId: initial.body.runId, userId: other,
    });
    assert.equal(crossUser.status, 409);

    assert.equal((await call(owner, path, "POST", {
      ...payload, durationSeconds: 999999, runId: initial.body.runId,
    })).status, 400);
    assert.equal((await call(owner, path, "POST", {
      ...payload,
      startedAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      endedAt: new Date(Date.now() + 3600 * 1000 + 60000).toISOString(),
      runId: initial.body.runId,
    })).status, 400);

    // A fresh run cannot claim an hour instantly.
    assert.equal((await call(owner, path, "POST", {
      ...payload, runId: initial.body.runId,
    })).status, 400);

    // Advance only the isolated MongoDB run's server start (not real time).
    const agedAt = new Date(Date.now() - 70 * 1000);
    await FocusRun.updateOne({ _id: initial.body.runId }, { $set: { startedAt: agedAt } });

    const success = await call(owner, path, "POST", {
      ...payload, runId: initial.body.runId, userId: other,
    });
    assert.equal(success.status, 201, JSON.stringify(success.body));
    assert.equal(success.body.verified, true);
    assert.equal(success.body.userId, owner); // body cannot impersonate another UID
    assert.equal(success.body.durationSeconds, 60);
    assert.deepEqual(milestones, [{ uid: owner, seconds: 60 }]);

    const rank = await call(owner, "/api/leaderboard");
    assert.equal(rank.status, 200, JSON.stringify(rank.body));
    assert.equal(rank.body.leaderboard.length, 1);
    assert.equal(rank.body.leaderboard[0].focusMinutes, 1);
    assert.equal(rank.body.leaderboard[0].score, 1);

    const replay = await call(owner, path, "POST", {
      ...payload, runId: initial.body.runId,
    });
    assert.equal(replay.status, 409);
    assert.equal(await StudySession.countDocuments({ userId: owner, verified: true }), 1);

    // Another run whose wall clock overlaps the first cannot earn a second credit.
    const second = await call(owner, path + "/start", "POST");
    await FocusRun.updateOne({ _id: second.body.runId },
      { $set: { startedAt: new Date(Date.now() - 70 * 1000) } });
    assert.equal((await call(owner, path, "POST", {
      ...payload, runId: second.body.runId,
    })).status, 409);
    assert.equal((await call(owner, "/api/leaderboard")).body.leaderboard[0].focusMinutes, 1);

    // Reject dates that claim elapsed time which did not exist.
    const impossible = await call(other, path, "POST", {
      ...payload,
      startedAt: new Date(Date.now() - 1000).toISOString(),
      endedAt: new Date().toISOString(),
    });
    assert.equal(impossible.status, 400);
    const { loadDeskProgress } = require("../utils/studyDesk");
    assert.equal(await loadDeskProgress(owner), 0);
    // Only persisted verified sessions >=20 minutes, scoped to the account.
    const row = { subjectName: "Desk test", plannedMinutes: 20, durationSeconds: 1200, startedAt: new Date(Date.now() - 1200000), endedAt: new Date() };
    await StudySession.insertMany([
      { ...row, userId: owner, verified: false },
      { ...row, userId: other, verified: true },
      ...Array.from({ length: 11 }, () => ({ ...row, userId: "desk-fixture", verified: true })),
      { ...row, userId: owner, verified: true },
    ]);
    assert.equal(await loadDeskProgress(owner), 1);
    assert.equal(await loadDeskProgress("desk-fixture"), 10);
    assert.equal(await loadDeskProgress(other), 1);
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    if (opened) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
});
