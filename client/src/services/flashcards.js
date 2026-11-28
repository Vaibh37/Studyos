import { auth } from "../firebase";
import apiRequest from "./api";
import { localDb, createLocalId } from "./localDb";
import { applyDeckAction, makeDeck, MAX_DECKS, normalizeCard, summarizeDeck } from "./flashcardCore.mjs";

const PATH = "/api/flashcards";
const STORE = "flashcardDecks";
function accountGuard(guest) {
  const user = auth.currentUser;
  return () => { if (!guest && (!user || auth.currentUser !== user)) throw new Error("Your sign-in changed. Please try again."); };
}
const send = (path, method, payload) => apiRequest(path, {
  method, ...(payload ? { body: JSON.stringify(payload) } : {}), cache: "no-store",
});
const validDeck = d => d && typeof d._id === "string" && Array.isArray(d.cards) && Number.isInteger(d.revision);
const checkDeck = d => {
  if (!validDeck(d)) throw new Error("Incomplete deck received. Refresh and try again.");
  return d;
};
export async function listDecks(guest) {
  const decks = guest ? (await localDb.getAll(STORE)).map(d => summarizeDeck(d)) : await send(PATH, "GET");
  if (!Array.isArray(decks) || decks.some(d => !d?.stats || typeof d._id !== "string")) {
    throw new Error("Could not load the deck library.");
  }
  return decks;
}
export async function getDeck(guest, id) {
  return checkDeck(guest ? await localDb.getOne(STORE, id) : await send(`${PATH}/${id}`, "GET"));
}
export async function createDeck(guest, { _id = createLocalId(), name, language = "", cards = [] }) {
  const input = { _id, name, language, cards };
  if (!guest) return checkDeck(await send(PATH, "POST", input));
  return localDb.mutateFlashcardDeck(_id, (existing, count) => {
    if (existing) return existing;
    if (count >= MAX_DECKS) throw new Error("You can create up to 50 decks.");
    return makeDeck(input);
  });
}
export async function changeDeck(guest, deck, action) {
  const payload = { ...action, revision: deck.revision };
  if (!guest) return checkDeck(await send(`${PATH}/${deck._id}`, "PATCH", payload));
  return localDb.mutateFlashcardDeck(deck._id, current => {
    if (!current) throw new Error("Deck not found.");
    return applyDeckAction(current, payload);
  });
}
export const deleteDeck = (guest, id) => guest
  ? localDb.remove(STORE, id) : send(`${PATH}/${id}`, "DELETE");
export const clearDecks = guest => guest ? localDb.clear(STORE) : send(PATH, "DELETE");

export async function exportDecks(guest) {
  if (guest) return localDb.getAll(STORE);
  const checkAccount = accountGuard(false);
  checkAccount();
  const decks = await listDecks(false);
  // Fetch in bounded batches rather than sending the entire library in a single request.
  const all = [];
  for (let i = 0; i < decks.length; i += 5) {
    checkAccount();
    all.push(...await Promise.all(decks.slice(i, i + 5).map(d => getDeck(false, d._id))));
  }
  checkAccount();
  return all;
}
export async function restoreDecks(guest, decks, { migration = false } = {}) {
  const checkAccount = accountGuard(guest);
  if (!Array.isArray(decks) || decks.length > MAX_DECKS) throw new Error("Invalid flashcard backup.");
  // Validate the entire payload before writing. Use small chunks under the API limit.
  const prepared = decks.map(raw => {
    const deck = makeDeck({ ...raw, _id: raw._id });
    const cards = raw.cards.map(card => normalizeCard(card, true));
    return { ...deck, cards, sourceCreatedAt: Number.isFinite(Date.parse(raw.createdAt)) ? Date.parse(raw.createdAt) : 0 };
  });
  for (const raw of prepared) {
    checkAccount();
    const id = migration ? `migrated-${raw._id.slice(0, 36)}-${raw.sourceCreatedAt}` : createLocalId();
    let deck = await createDeck(guest, { _id: id, name: raw.name, language: raw.language });
    for (let i = 0; i < raw.cards.length; i += 20) {
      checkAccount();
      deck = await changeDeck(guest, deck, { action: "restore", cards: raw.cards.slice(i, i + 20) });
    }
  }
}
export function parseCardText(text) {
  if (typeof text !== "string" || text.length > 32_000) throw new Error("Paste up to 32,000 characters at a time.");
  const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim() && !line.startsWith("#"));
  if (!rows.length || rows.length > 100) throw new Error("Paste 1–100 tab-separated cards at a time.");
  return rows.map((line, index) => {
    const fields = line.split("\t");
    if (fields.length < 2 || fields.length > 4) throw new Error(`Line ${index + 1}: use front, answer, optional reading and optional example separated by tabs.`);
    return normalizeCard({ id: createLocalId(), front: fields[0], back: fields[1], reading: fields[2], example: fields[3] });
  });
}
