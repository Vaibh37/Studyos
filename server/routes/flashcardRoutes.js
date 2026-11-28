const express = require("express");
const firebaseAuth = require("../middleware/firebaseAuth");
const FlashcardDeck = require("../models/FlashcardDeck");
const { logError } = require("../utils/safeLogger");
const { makeDeck, summarizeDeck, applyDeckAction, validateId, MAX_DECKS } = require("../utils/flashcardCore.mjs");

const router = express.Router();
router.use(firebaseAuth);
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const present = doc => ({
  _id: doc.deckId, name: doc.name, language: doc.language || "", cards: doc.cards,
  revision: doc.revision, createdAt: doc.createdAt, updatedAt: doc.updatedAt,
});
const owned = req => ({ userId: req.user.uid, deckId: validateId(req.params.id) });
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (err) {
    if ([400, 404, 409].includes(err.status)) return res.status(err.status).json({ message: err.message });
    logError("FLASHCARDS API ERROR:", err);
    return res.status(500).json({ message: "Could not complete flashcard request." });
  }
};

router.get("/", wrap(async (req, res) => {
  // Return only metadata and scheduling fields, not all card text on the overview.
  const docs = await FlashcardDeck.find({ userId: req.user.uid })
    .select("deckId name language revision createdAt updatedAt cards.stage cards.dueAt")
    .sort({ createdAt: 1 }).lean();
  res.json(docs.map(doc => summarizeDeck(present(doc))));
}));

router.post("/", wrap(async (req, res) => {
  const deck = makeDeck(req.body);
  const query = { userId: req.user.uid, deckId: deck._id };
  // Idempotent creation keeps retries and starter packs from duplicating decks.
  const existing = await FlashcardDeck.findOne(query).lean();
  if (existing) return res.json(present(existing));
  if (await FlashcardDeck.countDocuments({ userId: req.user.uid }) >= MAX_DECKS) {
    return res.status(409).json({ message: "You can create up to 50 decks." });
  }
  const { _id, createdAt, updatedAt, ...values } = deck;
  try {
    const doc = await FlashcardDeck.create({ ...query, ...values });
    res.status(201).json(present(doc.toObject()));
  } catch (err) {
    if (err.code !== 11000) throw err;
    const recovered = await FlashcardDeck.findOne(query).lean();
    if (!recovered) throw err;
    res.json(present(recovered));
  }
}));

router.get("/:id", wrap(async (req, res) => {
  const doc = await FlashcardDeck.findOne(owned(req)).lean();
  if (!doc) return res.status(404).json({ message: "Deck not found." });
  res.json(present(doc));
}));

router.patch("/:id", wrap(async (req, res) => {
  const query = owned(req);
  const doc = await FlashcardDeck.findOne(query).lean();
  if (!doc) return res.status(404).json({ message: "Deck not found." });
  const next = applyDeckAction(present(doc), req.body);
  const updated = await FlashcardDeck.findOneAndUpdate(
    { ...query, revision: doc.revision },
    { $set: { name: next.name, cards: next.cards, revision: next.revision } },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) return res.status(409).json({ message: "This deck changed on another device. Refresh and try again." });
  res.json(present(updated));
}));

router.delete("/:id", wrap(async (req, res) => {
  const removed = await FlashcardDeck.deleteOne(owned(req));
  if (!removed.deletedCount) return res.status(404).json({ message: "Deck not found." });
  res.json({ deleted: true });
}));
router.delete("/", wrap(async (req, res) => {
  await FlashcardDeck.deleteMany({ userId: req.user.uid });
  res.json({ deleted: true });
}));
module.exports = router;
