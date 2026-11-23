const express = require("express");
const firebaseAuth = require("../middleware/firebaseAuth");
const adminAuth = require("../config/firebaseAdmin");

const Task = require("../models/Task");
const Subject = require("../models/Subject");
const Note = require("../models/Note");
const Event = require("../models/Event");
const StudySession = require("../models/StudySession");
const VisitStreak = require("../models/VisitStreak");
const LeaderboardProfile = require("../models/LeaderboardProfile");

const Group = require("../models/social/Group");
const GroupMember = require("../models/social/GroupMember");
const GroupMessage = require("../models/social/GroupMessage");
const GroupStudySession = require("../models/social/GroupStudySession");
const LiveSession = require("../models/social/LiveSession");

const { deleteStoredObject } = require("../services/r2Storage");
const { revokeMemberGroupAccess } = require("../utils/groupRoomAccess");

const router = express.Router();

router.delete("/", firebaseAuth, async (req, res) => {
  res.set("Cache-Control", "no-store");

  if (process.env.ENABLE_ACCOUNT_DELETION !== "true") {
    return res.status(503).json({
      message: "Account deletion is not enabled on this server."
    });
  }

  const uid = req.user.uid;

  try {
    const token = req.headers.authorization.slice(7).trim();
    const decoded = await adminAuth.verifyIdToken(token, true);

    const age = Date.now() / 1000 - decoded.auth_time;

    if (
      decoded.uid !== uid ||
      !Number.isFinite(age) ||
      age < -60 ||
      age > 300
    ) {
      return res.status(401).json({
        message: "Please verify your identity again."
      });
    }

    const ownedGroups = await Group.countDocuments({
      ownerId: uid
    });

    if (ownedGroups > 0) {
      return res.status(409).json({
        message: "Delete your owned study groups before deleting your account."
      });
    }

    const messages = await GroupMessage.find({
      $or: [
        { userId: uid },
        { "attachments.uploadedBy": uid }
      ]
    }).select("userId attachments").lean();

    const storageKeys = new Set();

    for (const message of messages) {
      for (const file of message.attachments || []) {
        if (
          file.storageKey &&
          (message.userId === uid || file.uploadedBy === uid)
        ) {
          storageKeys.add(file.storageKey);
        }
      }
    }

    for (const key of storageKeys) {
      await deleteStoredObject(key);
    }

    const memberships = await GroupMember.find({
      userId: uid
    }).select("groupId").lean();

    await GroupMessage.deleteMany({ userId: uid });

    await GroupMessage.updateMany(
      { "replyTo.userId": uid },
      { $set: { replyTo: null } }
    );

    await GroupMessage.updateMany(
      {
        $or: [
          { "reactions.userId": uid },
          { deletedFor: uid },
          { "attachments.uploadedBy": uid }
        ]
      },
      {
        $pull: {
          reactions: { userId: uid },
          deletedFor: uid,
          attachments: { uploadedBy: uid }
        }
      }
    );

    await GroupMember.deleteMany({ userId: uid });
    await LiveSession.deleteMany({ userId: uid });
    await GroupStudySession.deleteMany({ userId: uid });

    const groupIds = new Set(
      memberships.map(m => String(m.groupId))
    );

    for (const groupId of groupIds) {
      revokeMemberGroupAccess(req.app.get("io"), groupId, uid);
    }

    for (const groupId of groupIds) {
      const count = await GroupMember.countDocuments({ groupId });
      await Group.updateOne(
        { _id: groupId },
        { $set: { memberCount: count } }
      );
    }

    const models = [
      Task, Subject, Note, Event,
      StudySession, VisitStreak, LeaderboardProfile
    ];

    for (const model of models) {
      await model.deleteMany({ userId: uid });
    }

    // Firebase is deleted last so earlier failures can be retried.
    await adminAuth.deleteUser(uid);

    return res.json({ deleted: true });

  } catch (error) {
    console.error("ACCOUNT DELETION FAILED:", error);
    return res.status(500).json({
      message: "Account deletion failed. Please retry or contact support."
    });
  }
});

module.exports = router;
