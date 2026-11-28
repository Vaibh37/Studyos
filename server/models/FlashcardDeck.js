const mongoose = require("mongoose");
const card = new mongoose.Schema({
  id: { type: String, required: true },
  front: { type: String, required: true, maxlength: 240 },
  back: { type: String, required: true, maxlength: 400 },
  reading: { type: String, maxlength: 120 },
  example: { type: String, maxlength: 400 },
  stage: { type: String, enum: ["new", "learning", "review"], required: true },
  dueAt: { type: Number, required: true },
  interval: { type: Number, required: true },
  reviews: { type: Number, required: true },
  lapses: { type: Number, required: true },
  lastReviewedAt: { type: Number, required: true },
}, { _id: false });
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  deckId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 80 },
  language: { type: String, enum: ["", "ja"], default: "" },
  cards: { type: [card], default: [], validate: a => a.length <= 500 },
  revision: { type: Number, required: true, default: 0 },
}, { timestamps: true });
schema.index({ userId: 1, deckId: 1 }, { unique: true });
module.exports = mongoose.model("FlashcardDeck", schema);
