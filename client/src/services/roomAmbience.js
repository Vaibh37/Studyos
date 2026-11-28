export const AMBIENT_SOUNDS = [
  { value: "rain", label: "Rain" },
  { value: "ocean", label: "Ocean waves" },
  { value: "brown", label: "Brown noise" },
  { value: "fan", label: "Soft fan" },
];

const preferenceKey = (uid, roomId) => `studyos_room_ambience:${uid}:${roomId}`;
const soundKey = uid => `studyos_room_sound:${uid}`;
export function readRoomScenery(storage, uid, roomId, fallback, allowed) {
  try {
    const value = storage.getItem(preferenceKey(uid, roomId));
    if (allowed.includes(value)) return value;
  } catch { /* Preferences are optional. */ }
  return fallback;
}
export function writeRoomScenery(storage, uid, roomId, scenery) {
  try { storage.setItem(preferenceKey(uid, roomId), scenery); } catch { /* Storage unavailable. */ }
}
export function readRoomSound(storage, uid) {
  try {
    const value = JSON.parse(storage.getItem(soundKey(uid)));
    if (value && AMBIENT_SOUNDS.some(sound => sound.value === value.kind) &&
        Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 100) return value;
  } catch { /* Preferences are optional. */ }
  return { kind: "rain", volume: 35 };
}
export function writeRoomSound(storage, uid, sound) {
  try { storage.setItem(soundKey(uid), JSON.stringify(sound)); } catch { /* Storage unavailable. */ }
}

// Original locally generated ambience: filtered noise and a periodic wave
// envelope. No downloads, microphones, external streams, or network requests.
// The end blends into the beginning so the loop does not click.
export function createAmbientSamples(kind, sampleRate, random = Math.random) {
  if (!AMBIENT_SOUNDS.some(sound => sound.value === kind)) kind = "rain";
  const seconds = kind === "ocean" ? 12 : 8;
  const fadeLength = Math.max(1, Math.round(sampleRate * 0.2));
  const length = Math.round(sampleRate * seconds);
  const data = new Float32Array(length + fadeLength);
  let soft = 0, deep = 0, previous = 0;
  for (let i = 0; i < data.length; i++) {
    const white = random() * 2 - 1;
    soft = .85 * soft + .15 * white;
    deep = .993 * deep + .007 * white;
    const t = i / sampleRate;
    if (kind === "brown") data[i] = deep * 7;
    else if (kind === "fan") data[i] = soft * .7 + deep * 1.3 + Math.sin(2 * Math.PI * 59 * t) * .025;
    else if (kind === "ocean") {
      const swell = .38 + .62 * Math.pow(.5 + .5 * Math.sin(2 * Math.PI * t / 6), 2);
      data[i] = (soft * .75 + deep * 2.2) * swell;
    } else {
      data[i] = soft * .8 + (white - previous) * .09;
    }
    previous = white;
  }
  const result = data.subarray(0, length);
  // Seam at the wrap: fade the end into the generated continuation of the
  // *beginning*, which is continuous when playback loops.
  for (let i = 0; i < fadeLength; i++) {
    const mix = i / fadeLength;
    result[i] = data[length + i] * (1 - mix) + result[i] * mix;
  }
  for (let i = 0; i < result.length; i++) result[i] = Math.max(-1, Math.min(1, result[i]));
  return result;
}

// Keep a room invitation local to this browser tab and signed-in account.
// It is not presence itself: the server must authorize every restored join.
const selectionKey = uid => `studyos_room_selected:${uid}`;
export function readRoomSelection(storage, uid) {
  try {
    const value = storage.getItem(selectionKey(uid));
    if (/^(public:(quiet|library|cloud|night)|group:[a-f0-9]{24})$/.test(value || "")) return value;
  } catch { /* Storage unavailable. */ }
  return null;
}
export function writeRoomSelection(storage, uid, roomId) {
  try {
    if (roomId) storage.setItem(selectionKey(uid), roomId);
    else storage.removeItem(selectionKey(uid));
  } catch { /* Storage unavailable. */ }
}
