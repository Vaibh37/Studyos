# Study Rooms V2

Study Rooms are silent live study spaces built on the existing authenticated
Socket.IO server and verified Focus timer. There is no webcam, microphone,
or chat. The first join is explicit; a participant's subject is hidden unless they
turn on subject sharing.

- Four public rooms: Quiet Room, Rain Room, Cloud Room, Night Study.
- Each existing Study Group has a private room, accessible to current
  group members only. Group invitations and membership are managed in Study Groups.
- The directory shows live occupancy and active study counts for public rooms
  and the viewer's authorized private rooms. Its updates contain aggregate
  counts only, not participant identities or subjects.
- Original desk illustrations indicate studying, on break, and at desk.
  Larger rooms offer name/opt-in subject search and participant sorting.
- Independent timer controls reuse Focus's server-issued run IDs, persistence,
  pause/resume, session saving and Zen mode.
- Room time measures cumulative focused time during the current room visit,
  not personal study history, daily totals or leaderboard credit.
- One participant per authenticated account; no raw Firebase UID or email is
  sent to other participants. Disconnect removes live presence immediately.
  Rejoining the same room within 90 seconds can restore the prior room timer
  without counting disconnected time. Explicit leave ends the visit.
- Optional scenery uses local StudyOS theme assets and is remembered per room
  on the device. Rain, ocean waves, brown noise and soft fan sounds are
  synthesized locally with Web Audio. Sound and volume preferences are saved
  per account on the device, but audio never starts automatically.
- A tab remembers the last joined room through reloads and navigation. Rejoining
  is authorized by the server; leaving explicitly clears the selection.
  Live presence still ends when navigating away from Study Rooms.
- Private-room access is checked before joining; member removal and group
  deletion revoke active access, including a membership check in flight.

Presence is intentionally process-local for the current single-instance backend,
bounded at 200 seats per room and 2,000 total. A restart clears live presence;
connected clients rejoin automatically. Multiple independent backend instances
would require shared presence storage and a compatible Socket.IO adapter.

Run the socket integration regression tests:
`node --test server/tests/studyRoomSocket.test.js server/tests/realtimeSecurity.test.js`.
The existing Firebase/MongoDB browser workflow also exercises two authenticated
users, live directory counts, room and atmosphere restoration, a verified Focus
save, optional subject sharing, and mobile navigation.
