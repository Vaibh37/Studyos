const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAuthenticatedUserRoom,
  revokeMemberGroupAccess,
  revokeDeletedGroupAccess,
} = require("../utils/groupRoomAccess");

function fakeIo() {
  const operations = [];
  return {
    operations,
    in(room) {
      return {
        socketsLeave(targetRoom) {
          operations.push({ sourceRoom: room, targetRoom });
        },
      };
    },
  };
}

test("each authenticated user gets a distinct private Socket.IO room", () => {
  assert.equal(getAuthenticatedUserRoom("firebase-a"), "user:firebase-a");
  assert.notEqual(getAuthenticatedUserRoom("firebase-a"), getAuthenticatedUserRoom("firebase-b"));
});

test("removing a member revokes only that user's membership in the target live group room", () => {
  const io = fakeIo();
  revokeMemberGroupAccess(io, "group-one", "firebase-a");
  assert.deepEqual(io.operations, [
    { sourceRoom: "user:firebase-a", targetRoom: "group:group-one" },
  ]);
});

test("deleting a group revokes its live room for all connected members", () => {
  const io = fakeIo();
  revokeDeletedGroupAccess(io, "group-one");
  assert.deepEqual(io.operations, [
    { sourceRoom: "group:group-one", targetRoom: "group:group-one" },
  ]);
});

test("revocation handles missing socket server or empty IDs safely", () => {
  const io = fakeIo();
  revokeMemberGroupAccess(null, "group-one", "firebase-a");
  revokeMemberGroupAccess(io, "", "firebase-a");
  revokeMemberGroupAccess(io, "group-one", "");
  revokeDeletedGroupAccess(null, "group-one");
  revokeDeletedGroupAccess(io, "");
  assert.deepEqual(io.operations, []);
});
