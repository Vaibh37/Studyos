import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { makeDeck, reviewCard, applyDeckAction, reviewQueue, summarizeDeck, DAY, MINUTE, normalizeCard } from "../src/services/flashcardCore.mjs";
import { JAPANESE_PACKS } from "../src/services/japaneseDecks.js";

const now = 1_800_000_000_000;
const original = makeDeck({ _id: "study", name: "Japanese", language: "ja", cards: [
  { id: "a", front: "あ", back: "a" }, { id: "b", front: "い", back: "i" },
] }, now);
test("new, learning, long-term reviews and lapses use the expected intervals", () => {
  const c = original.cards[0];
  assert.equal(reviewCard(c, "again", now).dueAt, now + MINUTE);
  assert.equal(reviewCard(c, "hard", now).dueAt, now + 6 * MINUTE);
  const learning = reviewCard(c, "good", now);
  assert.equal(learning.stage, "learning");
  assert.equal(learning.interval, 10 * MINUTE);
  const learned = reviewCard(learning, "good", learning.dueAt);
  assert.equal(learned.stage, "review");
  assert.equal(learned.interval, DAY);
  const easy = reviewCard(learned, "easy", learned.dueAt);
  assert.equal(easy.interval, 4 * DAY);
  const lapse = reviewCard(easy, "again", easy.dueAt);
  assert.equal(lapse.lapses, 1);
  assert.equal(lapse.stage, "learning");
  assert.equal(lapse.reviews, 4);
});
test("prioritizes due cards ahead of new cards, hides future cards, and validates revision", () => {
  const rev1 = applyDeckAction(original, { action: "review", revision: 0, cardId: "a", rating: "again" }, now);
  assert.deepEqual(reviewQueue(rev1.cards, now), ["b"]);
  assert.deepEqual(reviewQueue(rev1.cards, now + MINUTE), ["a", "b"]);
  assert.equal(summarizeDeck(rev1, now).stats.nextDue, now + MINUTE);
  assert.equal(summarizeDeck(rev1, now + MINUTE).stats.due, 1);
  assert.throws(() => applyDeckAction(rev1, { action: "review", revision: 1, cardId: "a", rating: "easy" }, now), { status: 409 });
  assert.throws(() => applyDeckAction(rev1, { action: "rename", revision: 0, name: "stale" }, now), { status: 409 });
  assert.equal(original.revision, 0);
});
test("editing preserves progress, restoring is idempotent, and input is bounded", () => {
  const rev1 = applyDeckAction(original, { action: "review", revision: 0, cardId: "a", rating: "easy" }, now);
  const updated = applyDeckAction(rev1, { action: "edit", revision: 1, cardId: "a", card: { front: "あ", back: "a (vowel)" } }, now);
  assert.equal(updated.cards[0].dueAt, rev1.cards[0].dueAt);
  const target = makeDeck({ _id: "copy", name: "Copy" }, now);
  const restored = applyDeckAction(target, { action: "restore", revision: 0, cards: updated.cards }, now);
  assert.deepEqual(restored.cards, updated.cards);
  const retry = applyDeckAction(restored, { action: "restore", revision: 1, cards: updated.cards }, now);
  assert.equal(retry.cards.length, 2);
  assert.throws(() => normalizeCard({ id: "x", front: " ", back: "answer" }), { status: 400 });
  assert.throws(() => normalizeCard({ id: "x", front: "x".repeat(241), back: "answer" }), { status: 400 });
  assert.throws(() => applyDeckAction(original, { action: "add", revision: 0, cards: original.cards }, now), { status: 409 });
});
test("all starter decks have valid unique cards, and server and client schedulers match exactly", async () => {
  assert.equal(JAPANESE_PACKS[0].cards.length, 46);
  assert.equal(JAPANESE_PACKS[1].cards.length, 46);
  assert.equal(JAPANESE_PACKS.reduce((sum, pack) => sum + pack.cards.length, 0), 230);
  for (const pack of JAPANESE_PACKS) {
    const deck = makeDeck({ _id: pack.id, name: pack.name, language: "ja", cards: pack.cards }, now);
    assert.equal(deck.cards.length, pack.cards.length);
    assert.ok(Buffer.byteLength(JSON.stringify(pack.cards)) < 90_000);
  }
  const client = await readFile(new URL("../src/services/flashcardCore.mjs", import.meta.url), "utf8");
  const server = await readFile(new URL("../../server/utils/flashcardCore.mjs", import.meta.url), "utf8");
  assert.equal(client, server);
});
