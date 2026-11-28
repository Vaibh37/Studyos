// Every incoming realtime event must have the same primitive shape as its
// corresponding client API. Never pass a client-supplied MongoDB selector
// (including an object/array masquerading as an ID) into a database query.
const objectId = value => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const optional = validator => value => value === undefined || value === null || validator(value);
const optionalId = optional(value => value === "" || objectId(value));
const { validRoom } = require("../socket/studyRoomSocket");
const roomState = {
  roomId: validRoom,
  status: value => ["idle", "running", "paused"].includes(value),
  subject: value => typeof value === "string" && value.length <= 80,
};
const fields = Object.freeze({
  "study-room:join": roomState,
  "study-room:state": roomState,
  "study-room:leave": { roomId: validRoom },
  "group:join": { groupId: objectId },
  "group:typing:start": { groupId: objectId },
  "group:typing:stop": { groupId: objectId },
  "group:message:send": { groupId: objectId, message: value => text(value, 2000), replyToMessageId: optionalId },
  "group:message:unsend": { groupId: objectId, messageId: objectId },
  "group:message:delete-for-me": { groupId: objectId, messageId: objectId },
  "group:message:read": { groupId: objectId, messageId: objectId },
  "group:message:reaction-toggle": { groupId: objectId, messageId: objectId,
    emoji: value => typeof value === "string" && ["👍", "❤️", "😂", "🔥", "🎉", "👀"].includes(value) },
  "focus:start": { groupId: objectId, subjectId: optionalId, subjectName: optional(value => text(value, 1000)) },
  "focus:stop": { durationSeconds: optional(value => Number.isSafeInteger(value) && value > 0) },
  "focus:heartbeat": {},
});

const plainObject = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

function validateSocketPacket(packet) {
  if (!Array.isArray(packet) || typeof packet[0] !== "string" || !Object.hasOwn(fields, packet[0])) return false;
  const event = packet[0];
  const ack = typeof packet.at(-1) === "function";
  const args = packet.slice(1, ack ? -1 : undefined);
  if (event === "focus:heartbeat") return args.length === 0;
  // Preserve the legacy focus:stop(callback) and focus:stop() forms.
  if (event === "focus:stop" && args.length === 0) return true;
  if (args.length !== 1 || !plainObject(args[0])) return false;
  const payload = args[0], schema = fields[event];
  if (Object.keys(payload).some(key => !Object.hasOwn(schema, key))) return false;
  if (!Object.entries(schema).every(([key, validate]) => validate(payload[key]))) return false;
  // Room names and Mongo ObjectIds must use the same canonical identity.
  for (const key of ["groupId", "messageId", "replyToMessageId", "subjectId"]) {
    if (objectId(payload[key])) payload[key] = payload[key].toLowerCase();
  }
  return true;
}

module.exports = { validateSocketPacket };
