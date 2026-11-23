const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const mongoose = require("mongoose");
const express = require("express");

const Note = require("../models/Note");
const Task = require("../models/Task");
const Event = require("../models/Event");
const Subject = require("../models/Subject");
const StudySession = require("../models/StudySession");

test("private notes, tasks, subjects, events and sessions enforce owner scope with literal searches", async () => {
  // CI-only isolated MongoDB; never touch real customer records.
  if (process.env.STUDYOS_TEST_MONGO_URI !==
      "mongodb://127.0.0.1:27017/studyos_security_ci") {
    throw new Error("Refusing user data authorization test outside isolated CI MongoDB");
  }
  const uri = "mongodb://127.0.0.1:27017/studyos_private_data_authorization_ci";
  const alice = "ci-private-alice";
  const bob = "ci-private-bob";
  const fakeFirebase = (req, res, next) => {
    const uid = req.headers.authorization?.replace(/^Bearer /, "");
    if (![alice, bob].includes(uid)) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.user = { uid, name: uid };
    next();
  };

  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (
      request === "../middleware/firebaseAuth" &&
      ["noteRoutes.js", "taskRoutes.js", "subjectRoutes.js",
       "eventRoutes.js", "studySessionRoutes.js"].some(
         (name) => parent?.filename?.endsWith(name))
    ) {
      return fakeFirebase;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  let routers;
  try {
    routers = {
      notes: require("../routes/noteRoutes"),
      tasks: require("../routes/taskRoutes"),
      subjects: require("../routes/subjectRoutes"),
      events: require("../routes/eventRoutes"),
      sessions: require("../routes/studySessionRoutes"),
    };
  } finally {
    Module._load = originalLoad;
  }

  const app = express();
  app.use(express.json());
  app.use("/api/notes", routers.notes);
  app.use("/api/tasks", routers.tasks);
  app.use("/api/subjects", routers.subjects);
  app.use("/api/events", routers.events);
  app.use("/api/study-sessions", routers.sessions);
  const server = http.createServer(app);
  let opened = false;

  try {
    await mongoose.connect(uri);
    opened = true;
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    async function call(uid, path, method = "GET", payload) {
      const response = await fetch(base + path, {
        method,
        headers: {
          Authorization: "Bearer " + uid,
          ...(payload !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      });
      return { status: response.status, body: await response.json() };
    }

    assert.equal((await call("guest", "/api/notes")).status, 401);
    assert.equal((await call("guest", "/api/tasks")).status, 401);
    assert.equal((await call("guest", "/api/events")).status, 401);

    const aliceSubject = await call(alice, "/api/subjects", "POST", {
      name: "Alice private subject", color: "#123456",
      userId: bob,
    });
    const bobSubject = await call(bob, "/api/subjects", "POST", {
      name: "Bob private subject",
    });
    assert.equal(aliceSubject.status, 201);
    assert.equal(bobSubject.status, 201);
    assert.equal(aliceSubject.body.userId, alice);

    const subjectId = aliceSubject.body._id;
    assert.equal((await call(bob, "/api/subjects/" + subjectId, "PUT", {
      name: "stolen",
    })).status, 404);
    assert.equal((await call(bob, "/api/subjects/" + subjectId, "DELETE")).status, 404);

    const aliceNote = await call(alice, "/api/notes", "POST", {
      title: "private .* note",
      content: "Alice confidential content",
      subjectId,
      userId: bob,
    });
    assert.equal(aliceNote.status, 201, JSON.stringify(aliceNote.body));
    assert.equal(aliceNote.body.userId, alice);
    const noteId = aliceNote.body._id;

    const bobNote = await call(bob, "/api/notes", "POST", {
      title: "Bob private note", content: "Only Bob",
      subjectId: bobSubject.body._id,
    });
    assert.equal(bobNote.status, 201);
    assert.equal((await call(bob, "/api/notes/" + noteId)).status, 404);
    assert.equal((await call(bob, "/api/notes/" + noteId, "PUT", {
      content: "stolen",
    })).status, 404);
    assert.equal((await call(bob, "/api/notes/" + noteId, "DELETE")).status, 404);
    assert.equal((await call(alice, "/api/notes/" + noteId)).body.content,
      "Alice confidential content");

    const aliceList = await call(alice, "/api/notes");
    const bobList = await call(bob, "/api/notes");
    assert.equal(aliceList.status, 200);
    assert.equal(aliceList.body.length, 1);
    assert.equal(bobList.body.length, 1);
    assert.equal(bobList.body[0]._id, bobNote.body._id);
    assert.equal((await call(bob,
      "/api/notes?subjectId=" + subjectId)).body.length, 0);

    // Literal metacharacters only match actual text, not arbitrary notes.
    const literalNotes = await call(alice, "/api/notes?q=" + encodeURIComponent(".*"));
    assert.equal(literalNotes.status, 200);
    assert.deepEqual(literalNotes.body.map(n => n._id), [noteId]);
    assert.equal((await call(alice, "/api/notes?q=" + "x".repeat(121))).status, 400);
    assert.equal((await call(alice, "/api/notes?q=a&q=b")).status, 400);

    // A note cannot be linked to another user's subject, including on update.
    assert.equal((await call(alice, "/api/notes/" + noteId, "PUT", {
      subjectId: bobSubject.body._id,
    })).status, 404);
    assert.equal((await call(alice, "/api/notes/" + noteId)).body.subjectId,
      subjectId);
    assert.equal((await call(bob, "/api/notes", "POST", {
      title: "stolen subject", subjectId,
    })).status, 404);

    const createdTask = await call(alice, "/api/tasks", "POST", {
      title: "literal .* task", priority: "medium",
      subjectId, userId: bob,
    });
    const otherTask = await call(alice, "/api/tasks", "POST", {
      title: "plain task", priority: "low",
    });
    assert.equal(createdTask.status, 201);
    assert.equal(otherTask.status, 201);
    assert.equal(createdTask.body.userId, alice);
    const taskId = createdTask.body._id;
    assert.equal((await call(bob, "/api/tasks/" + taskId, "PATCH", {
      title: "hijacked",
    })).status, 404);
    assert.equal((await call(bob, "/api/tasks/" + taskId, "DELETE")).status, 404);
    assert.equal((await call(bob, "/api/tasks", "POST", {
      title: "not owned", subjectId,
    })).status, 404);
    const literalTasks = await call(alice, "/api/tasks?search=" + encodeURIComponent(".*"));
    assert.equal(literalTasks.status, 200);
    assert.deepEqual(literalTasks.body.map(t => t._id), [taskId]);
    assert.equal((await call(alice, "/api/tasks?search=" + "x".repeat(121))).status, 400);
    assert.equal((await call(alice, "/api/tasks?search=x&search=y")).status, 400);
    assert.equal((await call(bob, "/api/tasks")).body.length, 0);

    const aliceEvent = await call(alice, "/api/events", "POST", {
      title: "Alice private event",
      date: "2026-12-01T12:00:00.000Z",
      type: "exam", userId: bob,
    });
    assert.equal(aliceEvent.status, 201);
    assert.equal(aliceEvent.body.userId, alice);
    const eventId = aliceEvent.body._id;
    assert.equal((await call(bob, "/api/events/" + eventId, "PUT", {
      title: "stolen",
    })).status, 404);
    assert.equal((await call(bob, "/api/events/" + eventId, "DELETE")).status, 404);
    assert.equal((await call(bob, "/api/events")).body.length, 0);

    const now = Date.now();
    const session = await call(alice, "/api/study-sessions", "POST", {
      subjectName: "Alice study", plannedMinutes: 3,
      durationSeconds: 60,
      startedAt: new Date(now - 70_000).toISOString(),
      endedAt: new Date(now).toISOString(),
      userId: bob,
    });
    assert.equal(session.status, 201, JSON.stringify(session.body));
    assert.equal(session.body.userId, alice);
    assert.equal((await call(bob,
      "/api/study-sessions/" + session.body._id, "DELETE")).status, 404);
    assert.equal((await call(bob, "/api/study-sessions")).body.length, 0);
    assert.equal((await call(alice, "/api/study-sessions")).body.length, 1);

    // No unauthorized mutation reached another account's records.
    assert.equal((await Note.countDocuments({ userId: alice })), 1);
    assert.equal((await Subject.findById(subjectId)).name, "Alice private subject");
    assert.equal((await Event.findById(eventId)).title, "Alice private event");
    assert.equal((await Task.findById(taskId)).title, "literal .* task");
    assert.equal((await StudySession.countDocuments({ userId: bob })), 0);
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    if (opened) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
});
