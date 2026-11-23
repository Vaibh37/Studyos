const mongoose = require("mongoose");
const { socialDB } = require("../../config/socialDb");

// One-time upload authorizations. A storage-key prefix alone is not proof
// that a user was issued the corresponding presigned upload URL.
const schema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
    index: true,
  },
  userId: { type: String, required: true, index: true },
  storageKey: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true, min: 1 },
  expiresAt: { type: Date, required: true },
  claimId: { type: String, default: null },
  consumedAt: { type: Date, default: null },
}, { timestamps: true });

// Do not TTL-delete upload grants: R2 objects may still exist after expiry.
// Startup migration drops the legacy MongoDB expiresAt TTL index.
// The orphan sweeper is responsible for storage reclamation.
schema.index({ groupId: 1, userId: 1 });

module.exports = socialDB.models.GroupAttachmentUpload ||
  socialDB.model("GroupAttachmentUpload", schema);
