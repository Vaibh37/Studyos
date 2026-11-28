// Shared contract: keep the server copy of this dependency-free module identical.
// Each deck is revisioned so two devices cannot silently overwrite reviews.
export const MINUTE = 60_000;
export const DAY = 86_400_000;
export const MAX_CARDS = 500;
export const MAX_DECKS = 50;
export const RATINGS = ["again", "hard", "good", "easy"];
const MAX_INTERVAL = 3650 * DAY;

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
export function validateId(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(value)) fail("Invalid identifier.");
  return value;
}
function field(value, max, label, required = false) {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    fail(`${label} must contain ${required ? "1–" : "at most "}${max} characters.`);
  }
  return value.trim();
}
export function normalizeCard(raw, restore = false) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("Invalid card.");
  const card = {
    id: validateId(raw.id), front: field(raw.front, 240, "Front", true),
    back: field(raw.back, 400, "Answer", true), reading: field(raw.reading, 120, "Reading"),
    example: field(raw.example, 400, "Example"), stage: "new", dueAt: 0,
    interval: 0, reviews: 0, lapses: 0, lastReviewedAt: 0,
  };
  if (restore && ["new", "learning", "review"].includes(raw.stage)) {
    const number = (v, max) => Number.isSafeInteger(v) && v >= 0 && v <= max;
    if (!number(raw.dueAt, 253402300799999) || !number(raw.interval, MAX_INTERVAL) ||
      !number(raw.reviews, 1_000_000) || !number(raw.lapses, raw.reviews) ||
      !number(raw.lastReviewedAt, 253402300799999)) fail("Invalid review history.");
    if (raw.stage !== "new") Object.assign(card, {
      stage: raw.stage, dueAt: raw.dueAt, interval: raw.interval,
      reviews: raw.reviews, lapses: raw.lapses, lastReviewedAt: raw.lastReviewedAt,
    });
  }
  return card;
}
export function summarizeDeck(deck, now = Date.now()) {
  const { cards, ...meta } = deck;
  const stats = { total: cards.length, new: 0, due: 0, learned: 0, studied: 0, nextDue: null };
  for (const card of cards) {
    if (card.stage === "new") stats.new++;
    else {
      stats.studied++;
      if (card.stage === "review") stats.learned++;
      if (card.dueAt <= now) stats.due++;
      else if (stats.nextDue === null || card.dueAt < stats.nextDue) stats.nextDue = card.dueAt;
    }
  }
  return { ...meta, stats };
}
export function makeDeck(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("Invalid deck.");
  const cards = raw.cards ?? [];
  if (!Array.isArray(cards) || cards.length > MAX_CARDS) fail("A deck can contain up to 500 cards.");
  const normalized = cards.map(card => normalizeCard(card));
  if (new Set(normalized.map(c => c.id)).size !== normalized.length) fail("Duplicate card identifier.");
  return { _id: validateId(raw._id), name: field(raw.name, 80, "Deck name", true),
    language: raw.language === "ja" ? "ja" : "", cards: normalized,
    revision: 0, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() };
}
export function reviewCard(card, rating, now = Date.now()) {
  if (!RATINGS.includes(rating)) fail("Choose a valid rating.");
  const isReview = card.stage === "review";
  let interval, stage;
  if (rating === "again") { interval = MINUTE; stage = "learning"; }
  else if (rating === "hard") {
    interval = isReview ? Math.max(DAY, Math.ceil(card.interval * 1.2 / DAY) * DAY) : 6 * MINUTE;
    stage = isReview ? "review" : "learning";
  } else if (rating === "good") {
    interval = isReview ? Math.max(2 * DAY, Math.ceil(card.interval * 2.2 / DAY) * DAY)
      : card.stage === "new" ? 10 * MINUTE : DAY;
    stage = interval >= DAY ? "review" : "learning";
  } else {
    interval = isReview ? Math.max(4 * DAY, Math.ceil(card.interval * 3.2 / DAY) * DAY) : 4 * DAY;
    stage = "review";
  }
  interval = Math.min(MAX_INTERVAL, interval);
  return { ...card, stage, interval, dueAt: now + interval,
    reviews: card.reviews + 1, lapses: card.lapses + (rating === "again" && isReview ? 1 : 0),
    lastReviewedAt: now };
}
export function formatInterval(ms) {
  if (ms < 60 * MINUTE) return `${Math.ceil(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.ceil(ms / (60 * MINUTE))}h`;
  return `${Math.ceil(ms / DAY)}d`;
}
export function reviewQueue(cards, now = Date.now(), newLimit = 20, totalLimit = 100) {
  const due = cards.filter(c => c.stage !== "new" && c.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
  return [...due, ...cards.filter(c => c.stage === "new").slice(0, newLimit)].slice(0, totalLimit).map(c => c.id);
}
export function applyDeckAction(deck, payload, now = Date.now()) {
  if (!payload || payload.revision !== deck.revision) fail("This deck changed on another device. Refresh and try again.", 409);
  const cards = deck.cards.slice();
  let name = deck.name;
  const action = payload.action;
  if (action === "rename") name = field(payload.name, 80, "Deck name", true);
  else if (action === "add" || action === "restore") {
    if (!Array.isArray(payload.cards) || !payload.cards.length || payload.cards.length > 100) fail("Add 1–100 cards at a time.");
    const ids = new Set(cards.map(c => c.id));
    for (const raw of payload.cards) {
      const card = normalizeCard(raw, action === "restore");
      if (ids.has(card.id)) {
        if (action === "restore") continue; // Retry a guest migration without duplicating cards.
        fail("Duplicate card identifier.", 409);
      }
      ids.add(card.id);
      cards.push(card);
      if (cards.length > MAX_CARDS) fail("A deck can contain up to 500 cards.");
    }
  } else if (["edit", "remove", "review"].includes(action)) {
    const id = validateId(payload.cardId);
    const index = cards.findIndex(c => c.id === id);
    if (index === -1) fail("Card not found.", 404);
    if (action === "remove") cards.splice(index, 1);
    else if (action === "edit") {
      const current = cards[index];
      const { front, back, reading, example } = normalizeCard({ ...payload.card, id });
      cards[index] = { ...current, front, back, reading, example };
    } else {
      const card = cards[index];
      if (card.stage !== "new" && card.dueAt > now) fail("This card is not due yet.", 409);
      cards[index] = reviewCard(card, payload.rating, now);
    }
  } else fail("Unknown flashcard action.");
  return { ...deck, name, cards, revision: deck.revision + 1, updatedAt: new Date(now).toISOString() };
}
