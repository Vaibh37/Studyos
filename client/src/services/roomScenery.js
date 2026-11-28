// No location lookup: the automatic atmosphere follows the device's clock,
// with stable time bands that work offline and across time zones.
export const ROOM_SCENERY = [
  { value: "none", label: "No scenery" },
  { value: "auto", label: "Auto · local time" },
  { value: "rain", label: "Rain" },
  { value: "cloud", label: "Clouds" },
  { value: "stargaze", label: "Night sky" },
  { value: "snow", label: "Snowfall" },
  { value: "ronin", label: "Misty fields" },
];
export function resolveRoomScene(selection, date = new Date()) {
  if (selection !== "auto") {
    const scene = ROOM_SCENERY.some(item => item.value === selection) ? selection : "none";
    return { scene, phase: "fixed", label: ROOM_SCENERY.find(item => item.value === scene).label };
  }
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5 && hour < 8) return { scene: "cloud", phase: "dawn", label: "Dawn" };
  if (hour >= 8 && hour < 17) return { scene: "cloud", phase: "day", label: "Daylight" };
  if (hour >= 17 && hour < 20) return { scene: "cloud", phase: "dusk", label: "Evening" };
  return { scene: "stargaze", phase: "night", label: "Night" };
}

// Deterministic particles do not jump every second when the Focus timer
// updates. Only a small bounded set of decorative layers is rendered.
export function weatherParticles(type) {
  const total = type === "rain" ? 54 : type === "snow" ? 44 : type === "stargaze" ? 24 : 0;
  let seed = type === "rain" ? 234 : type === "snow" ? 9871 : 1612;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: total }, (_, i) => {
    const depth = i % 3;
    const duration = type === "rain" ? 2.8 + depth * 1.4 + random() * 2.4 : type === "snow" ? 7 + random() * 10 : 1.8 + random() * 4;
    return { x: Math.round(random() * 100), y: Math.round(random() * 70), duration, delay: -random() * duration,
      size: type === "rain" ? 2 + depth * 1.1 : type === "snow" ? 2.2 + depth * 1.7 : 1.6 + depth * .6,
      opacity: (type === "rain" ? .42 : .38) + depth * .15 + random() * .15, sway: (random() < .5 ? -1 : 1) * (8 + random() * 22) };
  });
}

// Explicit preferences override the device setting, but first visits respect it.
export function roomMotionEnabled(preference, reducedMotion) {
  return preference === "on" || (preference !== "off" && !reducedMotion);
}
const motionKey = uid => "studyos_room_motion:" + uid;
export function readRoomMotion(storage, uid) {
  if (!uid) return "system";
  try {
    const value = storage.getItem(motionKey(uid));
    return value === "on" || value === "off" ? value : "system";
  } catch { return "system"; }
}
export function writeRoomMotion(storage, uid, preference) {
  if (!uid) return;
  try {
    if (preference === "system") storage.removeItem(motionKey(uid));
    else if (preference === "on" || preference === "off") storage.setItem(motionKey(uid), preference);
  } catch { /* Motion remains available for this session. */ }
}
