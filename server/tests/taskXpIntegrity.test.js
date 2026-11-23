const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const mongoose = require("mongoose");
const express = require("express");

const Task = require("../models/Task");
const StudySession = require("../models/StudySession");
const LeaderboardProfile = require("../models/LeaderboardProfile");

// Real Express routes, real MongoDB and synthetic Firebase users.
// Guarded to run ONLY against the isolated MongoDB GitHub Actions service.
test("task XP cannot be farmed without verified Focus, completion replay or priority edits", async () => {
  if (process.env.STUDYOS_TEST_MONGO_URI !==
      "mongodb://127.0.0.1:27017/studyos_security_ci") {
    throw new Error("Refusing task XP test outside isolated CI MongoDB");
  }
  const uri = "mongodb://127.0.0.1:27017/studyos_task_xp_integrity_ci";
  const user = "ci-task-user";
  const other = "ci-other-user";
  const fakeAuth = (req, res, next) => {
    const uid = req.headers.authorization?.replace(/^Bearer /, "");
    if (![user, other].includes(uid)) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.user = { uid, name: uid };
    next();
  };
  const fakeAdmin = {
    async getUsers(ids) {
      return { users: ids.map(({ uid }) => ({ uid })), notFound: [] };
    },
  };
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (["taskRoutes.js", "leaderboardRoutes.js"].some((name) =>
      parent?.filename?.endsWith(name))) {
      if (request === "../middleware/firebaseAuth") return fakeAuth;
      if (request === "../config/firebaseAdmin") return fakeAdmin;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  let taskRoutes;
  let leaderboardRoutes;
  try {
    taskRoutes = require("../routes/taskRoutes");
    leaderboardRoutes = require("../routes/leaderboardRoutes");
  } finally {
    Module._load = originalLoad;
  }

  const app = express();
  app.use(express.json());
  app.use("/api/tasks", taskRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  const server = http.createServer(app);
  let dbOpened = false;

  try {
    await mongoose.connect(uri);
    dbOpened = true;
    await LeaderboardProfile.create({
      userId: user,
      displayName: "Task XP CI",
      isPublic: true,
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    async function call(uid, url, method = "GET", data) {
      const response = await fetch(base + url, {
        method,
        headers: {
          Authorization: "Bearer " + uid,
          ...(data ? { "Content-Type": "application/json" } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return { status: response.status, body: await response.json() };
    }
    async function rank() {
      const response = await call(user, "/api/leaderboard");
      assert.equal(response.status, 200, JSON.stringify(response.body));
      return response.body.leaderboard[0];
    }

    assert.equal((await call("anonymous", "/api/tasks", "POST", {
      title: "Fake",
    })).status, 401);

    const tasks = [];
    for (let i = 0; i < 9; i++) {
      const created = await call(user, "/api/tasks", "POST", {
        title: "Task XP test " + i,
        priority: "high",
      });
      assert.equal(created.status, 201);
      tasks.push(String(created.body._id));
      const completed = await call(user, "/api/tasks/" + tasks[i], "PATCH", {
        completed: true,
      });
      assert.equal(completed.status, 200);
      assert.ok(completed.body.firstCompletedAt);
      assert.equal(completed.body.scoredPriority, "high");
    }

    // Task creation/completion by itself does not earn leaderboard XP.
    assert.equal((await rank()).score, 0);
    assert.equal((await rank()).focusMinutes, 0);

    // The user has two hours of server-verified Focus, earned today.
    // The maximum task bonus is 25% of their Focus XP (30 points).
    const now = new Date();
    await StudySession.create({
      userId: user,
      subjectName: "CI Verified Focus",
      plannedMinutes: 120,
      durationSeconds: 120 * 60,
      startedAt: new Date(now.getTime() - 120 * 60 * 1000),
      endedAt: now,
      verified: true,
    });
    const ranked = await rank();
    assert.equal(ranked.focusMinutes, 120);
    assert.equal(ranked.score, 150);
    assert.equal(ranked.completedTasks, 5); // daily task XP reaches 100 after five high tasks

    // Never let one account edit another account's tasks.
    assert.equal((await call(other, "/api/tasks/" + tasks[0], "PATCH", {
      completed: false,
    })).status, 404);

    const before = await Task.findById(tasks[0]).lean();
    // Uncomplete -> change priority -> complete cannot reset first credit.
    const uncomplete = await call(user, "/api/tasks/" + tasks[0], "PATCH", {
      completed: false,
    });
    assert.equal(uncomplete.status, 200);
    assert.equal(uncomplete.body.completedAt, null);
    const recomplete = await call(user, "/api/tasks/" + tasks[0], "PATCH", {
      priority: "low",
      completed: true,
    });
    assert.equal(recomplete.status, 200);
    assert.equal(new Date(recomplete.body.firstCompletedAt).getTime(),
      new Date(before.firstCompletedAt).getTime());
    assert.equal(recomplete.body.scoredPriority, "high");
    assert.equal((await rank()).score, 150);

    // Even editing completion priority afterwards cannot alter earned XP.
    const edited = await call(user, "/api/tasks/" + tasks[0], "PATCH", {
      priority: "medium",
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.scoredPriority, "high");
    assert.equal((await rank()).score, 150);

    // User-supplied score fields are ignored, not persisted.
    const forged = await call(user, "/api/tasks", "POST", {
      title: "No forged ranking timestamp",
      priority: "high",
      completed: true,
      firstCompletedAt: new Date().toISOString(),
      scoredPriority: "high",
    });
    assert.equal(forged.status, 201);
    assert.equal(forged.body.completed, false);
    assert.equal(forged.body.firstCompletedAt, null);
    assert.equal(forged.body.scoredPriority, null);
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    if (dbOpened) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
});