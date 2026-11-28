export const DEFAULT_DESK = Object.freeze({ character: "classic", lamp: "angle", activity: "writing", accessory: "books", encouragement: false });
export const DESK_CHOICES = {
  character: [{ value: "classic", label: "Classic" }, { value: "short", label: "Short hair" }, { value: "long", label: "Long hair" }],
  lamp: [{ value: "angle", label: "Architect" }, { value: "round", label: "Round" }, { value: "lantern", label: "Lantern" }],
  activity: [{ value: "writing", label: "Writing" }, { value: "reading", label: "Reading" }, { value: "typing", label: "Typing" }],
  accessory: [{ value: "books", label: "Books" }, { value: "none", label: "Minimal" }, { value: "plant", label: "Plant", unlock: 3 }, { value: "bonsai", label: "Bonsai", unlock: 10 }],
};
export function normalizeDesk(value, progress = 10) {
  const result = { ...DEFAULT_DESK };
  for (const [key, choices] of Object.entries(DESK_CHOICES)) {
    if (choices.some(choice => choice.value === value?.[key] && (!choice.unlock || choice.unlock <= progress))) result[key] = value[key];
  }
  result.encouragement = value?.encouragement === true;
  return result;
}
const keyFor = uid => "studyos_desk:" + uid;
export function readDesk(storage, uid) {
  try { return normalizeDesk(JSON.parse(storage.getItem(keyFor(uid)))); } catch { return { ...DEFAULT_DESK }; }
}
export function writeDesk(storage, uid, desk) {
  try { if (uid) storage.setItem(keyFor(uid), JSON.stringify(normalizeDesk(desk))); } catch { /* Optional local preference. */ }
}
