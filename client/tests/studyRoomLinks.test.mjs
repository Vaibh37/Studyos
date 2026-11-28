import assert from "node:assert/strict";
import test from "node:test";
import { parseRoomId, roomDestination, roomInviteURL, allowedInvitedRoom } from "../src/services/studyRoomLinks.js";

const group = "group:507f1f77bcf86cd799439011";
test("room URLs round trip to known room IDs and only fixed StudyOS destinations", () => {
  for (const id of ["public:quiet", "public:library", "public:cloud", "public:night", group]) {
    const url = new URL(roomInviteURL("https://studyos37.space", id));
    assert.equal(url.origin, "https://studyos37.space");
    assert.equal(url.pathname, "/app/study-rooms");
    assert.equal(parseRoomId(url.searchParams.get("room")), id);
    assert.equal(new URL(roomDestination(id, "/get-started"), url.origin).searchParams.get("room"), id);
  }
  assert.equal(roomDestination(group, "https://evil.invalid"), null);
  for (const bad of [null, {}, [], "public:unknown", "group:abc", "group:"+"a".repeat(25), "https://evil.invalid", "public:quiet&room=group:507f1f77bcf86cd799439011", "public:quiet\n"]) {
    assert.equal(parseRoomId(bad), null);
    assert.equal(roomDestination(bad), null);
  }
});
test("a private-room link resolves only within the recipient's authorized group list", () => {
  const target = { id: group, name: "Private group" };
  const quiet = { id: "public:quiet", name: "Quiet Room" };
  assert.equal(allowedInvitedRoom(group, [quiet], []), null);
  assert.equal(allowedInvitedRoom(group, [quiet], [target]), target);
  assert.equal(allowedInvitedRoom("public:quiet", [quiet], []), quiet);
  assert.equal(allowedInvitedRoom("group:abc", [quiet], [target]), null);
});
