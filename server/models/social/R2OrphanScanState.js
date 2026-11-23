const mongoose = require("mongoose");
const { socialDB } = require("../../config/socialDb");

// Persistent lexicographic cursor: scan the entire groups/ prefix over time,
// instead of repeatedly checking the first page of the bucket.
const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  lastKey: { type: String, default: "" },
}, { timestamps: true });

module.exports = socialDB.models.R2OrphanScanState ||
  socialDB.model("R2OrphanScanState", schema);
