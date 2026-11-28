# Study Rooms V6

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
  A single Focus controller stays mounted across StudyOS workspace pages
  while joined, so room presence, room time, sound and the verified Focus run
  continue without reconnecting. A compact dock offers pause/resume, sound,
  return and explicit leave. Audio still never autoplays after reload.
  Leaving or signing out stops presence and audio and clears the tab's selection;
  server revocation also clears the selection. Leaving does not stop the
  personal timer. Closing the tab or losing connectivity removes live presence.
- Shared Zen expands the chosen scenery to fill the screen with a gentle
  pan, a large independent Focus timer, and the room's live desks. Audio
  continues across Zen entry and exit. New desks animate in, departures
  update the roster immediately, and reduced-motion settings are respected.
- Invite copies a room link. Opening it presents an explicit join confirmation;
  signed-out users can sign in and return to the invitation. Private room
  links do not grant membership or reveal private room details to non-members.
- Living Desks use original vector parts: character, lamp, study activity and
  accessory. The desk is saved per account on the device and shared within the
  joined room (including Zen). Plant and bonsai unlocks require 3 and 10 saved,
  verified sessions of at least 20 minutes respectively. Only the owner receives
  the capped progress count; imported or unverified history does not count.
  Removing qualifying history can relock an accessory.
- Optional quiet encouragement sends fixed wave and thumbs-up signals only to
  a consenting recipient in the same room. Cross-room/self targeting and invalid
  payloads are rejected; sender budgets and recipient cooldown limit abuse.
  Opt-in peers see a small saved-session milestone after a verified save of at
  least 60 seconds, without duration or subject. Desk animations respect
  reduced motion. No reactions or milestones are stored.
- Dynamic Environments extend the existing scenery with decorative rain,
  drifting mist/clouds, a twinkling night sky and an original winter landscape.
  Auto resolves dawn (05:00–07:59), daylight (08:00–16:59), evening
  (17:00–19:59) and night (20:00–04:59) using only the device's local clock.
  Personal scenery transitions crossfade; atmospheric motion is paused when
  offscreen or when the page is hidden. Motion initially follows the device’s
  reduced-motion setting. The Motion on/off button in the room and Shared
  Zen explicitly overrides that setting for the signed-in account on this
  device. Visible rain beads, snow and twinkling stars run above the scenery
  shading and below the focus controls.
- The Sound mixer blends up to four local audio loops in one AudioContext,
  with independent levels and master volume. Changing layers fades gain
  rather than resetting sound playback. Old solo preferences are migrated
  on read. Mixer preferences remain account-scoped on the device; there is
  no audio autoplay, recording, external stream, or location permission.
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
save, optional subject sharing, shared Zen, permission-safe invitations,
and mobile navigation.
