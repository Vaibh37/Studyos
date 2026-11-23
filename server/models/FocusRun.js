const mongoose = require("mongoose");

const focusRunSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  claimId: { type: String, default: null },
  consumedAt: { type: Date, default: null },
}, { timestamps: true });

// TTL cleanup is eventual; authorization also checks expiresAt explicitly.
focusRunSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
focusRunSchema.index({ userId: 1, consumedAt: 1, revokedAt: 1 });

module.exports = mongoose.models.FocusRun ||
  mongoose.model("FocusRun", focusRunSchema);
