const mongoose = require("mongoose");

const bannedIpSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  reason: {
    type: String,
    default: "Manual security ban",
    maxlength: 250,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: String,
    default: null,
  },
  updatedBy: {
    type: String,
    default: null,
  },
}, { timestamps: true });

// MongoDB deletes expired records eventually. Checks still reject only active bans.
bannedIpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.BannedIp ||
  mongoose.model("BannedIp", bannedIpSchema);
