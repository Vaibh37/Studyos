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
  const total = type === "rain" ? 26 : type === "snow" ? 36 : type === "stargaze" ? 14 : 0;
  let seed = type === "rain" ? 234 : type === "snow" ? 9871 : 1612;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: total }, (_, i) => {
    const depth = i % 3;
    const duration = type === "rain" ? 4.5 + random() * 7 : type === "snow" ? 10 + random() * 15 : 4 + random() * 6;
    return { x: Math.round(random() * 100), y: Math.round(random() * 70), duration, delay: -random() * duration,
      size: type === "rain" ? 1 + depth * .65 : type === "snow" ? 1.6 + depth * 1.6 : 1 + depth * .3,
      opacity: (type === "snow" ? .21 : .14) + depth * .12 + random() * .12, sway: (random() < .5 ? -1 : 1) * (8 + random() * 22) };
  });
}
