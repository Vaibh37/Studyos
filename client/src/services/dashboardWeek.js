// Local calendar days, matching the dashboard's existing date grouping.
const keyFor = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

export function getDashboardWeek(sessions, referenceDate = new Date()) {
  const monday = new Date(referenceDate);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    return { key: keyFor(date), label: date.toLocaleDateString("en-IN", { weekday: "long" }), shortLabel: date.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 1), seconds: 0 };
  });
  const lookup = new Map(days.map(day => [day.key, day]));
  for (const session of sessions) {
    const date = new Date(session.startedAt || session.endedAt || session.createdAt);
    if (!Number.isFinite(date.getTime())) continue;
    const day = lookup.get(keyFor(date));
    const seconds = Number(session.durationSeconds);
    if (day && Number.isFinite(seconds) && seconds > 0) day.seconds += seconds;
  }
  const peak = Math.max(...days.map(day => day.seconds));
  return { days, axisHours: Math.max(2, Math.ceil(peak / 7200) * 2) };
}
