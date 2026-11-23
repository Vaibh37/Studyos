const mongoose = require("mongoose");
const { socialDB } = require("../../config/socialDb");

const schema = new mongoose.Schema({
  storageKey: { type: String, required: true, unique: true },
  etag: { type: String, required: true },
  lastModified: { type: Date, required: true },
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
}, { timestamps: true });

// Candidates that are no longer observed age out after 60 days.
schema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

module.exports = socialDB.models.R2OrphanCandidate ||
  socialDB.model("R2OrphanCandidate", schema);
