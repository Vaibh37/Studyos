// A room link only identifies a destination. It never grants membership,
// starts presence, authorizes subjects, or embeds a group's invitation code.
export function parseRoomId(value) {
  return typeof value === "string" && /^(public:(quiet|library|cloud|night)|group:[a-f0-9]{24})$/.test(value) ? value : null;
}

export function roomDestination(roomId, path = "/app/study-rooms") {
  const id = parseRoomId(roomId);
  if (!id) return null;
  if (path !== "/app/study-rooms" && path !== "/get-started") return null;
  return path + "?" + new URLSearchParams({ room: id });
}

export function roomInviteURL(origin, roomId) {
  const destination = roomDestination(roomId);
  return destination ? new URL(destination, origin).href : null;
}

export function allowedInvitedRoom(roomId, publicRooms, privateRooms) {
  const id = parseRoomId(roomId);
  if (!id) return null;
  return (id.startsWith("public:") ? publicRooms : privateRooms).find(room => room.id === id) || null;
}
