// Shared-room cosmetics are fixed identifiers, not arbitrary client markup,
// and unlocks use only verified, saved Focus history.
const DESK_DEFAULT = Object.freeze({ character: "classic", lamp: "angle", activity: "writing", accessory: "books", encouragement: false });
const deskOptions = Object.freeze({
  character: ["classic", "short", "long"],
  lamp: ["angle", "round", "lantern"],
  activity: ["writing", "reading", "typing"],
  accessory: ["books", "plant", "bonsai", "none"],
});
const thresholds = { plant: 3, bonsai: 10 };
const validDesk = data => Boolean(data && Object.keys(deskOptions).every(key => deskOptions[key].includes(data[key])) && typeof data.encouragement === "boolean");
const deskProgress = n => Math.max(0, Math.min(10, Math.floor(Number(n) || 0)));
function allowedDesk(data, progress) {
  const desk = validDesk(data) ? { ...data } : { ...DESK_DEFAULT };
  if (thresholds[desk.accessory] > deskProgress(progress)) desk.accessory = "books";
  return Object.fromEntries(Object.keys(DESK_DEFAULT).map(key => [key, desk[key]]));
}
async function loadDeskProgress(uid) {
  // At most ten qualifying records are needed. No total or study subject is
  // published to peers, and no new durable profile or user data is stored.
  const count = await require("../models/StudySession").countDocuments({
    userId: uid, verified: true, durationSeconds: { $gte: 20 * 60 },
  }).limit(10);
  return deskProgress(count);
}
module.exports = { DESK_DEFAULT, deskOptions, validDesk, allowedDesk, deskProgress, loadDeskProgress };
