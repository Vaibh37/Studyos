import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { UsersRound, LockKeyhole as Lock, Play, Pause, CheckCircle2, CloudRain, Cloud, Moon, BookOpen, ArrowUpRight, LogOut, Link2, Copy, X, HandWaving, ThumbsUp } from "./icons";
import StudySelect from "./StudySelect";
import { StudyDesk, DeskStudio } from "./StudyDesk";
import { normalizeDesk, readDesk, writeDesk } from "../services/studyDesk";
import FocusZen from "./FocusZen";
import FocusCompletion from "./FocusCompletion";
import { useStudyRoom } from "../hooks/useStudyRoom";
import { useStudyRoomDirectory } from "../hooks/useStudyRoomDirectory";
import { AMBIENT_SOUNDS, readRoomScenery, writeRoomScenery, readRoomSelection, writeRoomSelection } from "../services/roomAmbience";
import { ROOM_SCENERY, resolveRoomScene } from "../services/roomScenery";
import { useRoomMotion } from "../hooks/useRoomMotion";
import { useRoomAudio } from "../hooks/useRoomAudio";
import RoomAtmosphere from "./RoomAtmosphere";
import { allowedInvitedRoom, roomInviteURL } from "../services/studyRoomLinks";
import "../styles/study-rooms.css";

const PUBLIC_ROOMS = [
  { id: "public:quiet", name: "Quiet Room", description: "A silent workspace for any subject.", icon: BookOpen, atmosphere: "none" },
  { id: "public:library", name: "Rain Room", description: "A calm place for long focus sessions.", icon: CloudRain, atmosphere: "rain" },
  { id: "public:cloud", name: "Cloud Room", description: "A little space above the noise.", icon: Cloud, atmosphere: "cloud" },
  { id: "public:night", name: "Night Study", description: "For evening readers and night owls.", icon: Moon, atmosphere: "stargaze" },
];
const pad = n => String(n).padStart(2, "0");
const duration = seconds => {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${pad(Math.floor(n / 3600))}:${pad(Math.floor(n / 60) % 60)}:${pad(n % 60)}`;
};
const stateNames = { running: "Studying", paused: "On break", idle: "At desk" };

function AmbientSound({ audio }) {
  const [mixerOpen, setMixerOpen] = useState(false);
  const { kind, volume, layers, playing, canPlay, error, toggle, changeKind, changeVolume, changeLayer } = audio;
  const layerCount = AMBIENT_SOUNDS.filter(sound => layers[sound.value] > 0).length;
  return <>
    <div className="room-audio">
      <StudySelect value={kind} onChange={changeKind} options={AMBIENT_SOUNDS.concat(kind === "mix" ? [{ value: "mix", label: "Custom mix", disabled: true }] : [])} ariaLabel="Ambient sound" />
      <button className="room-button" type="button" aria-pressed={playing} disabled={!playing && !canPlay} onClick={toggle}>{playing ? "Mute sound" : kind === "rain" ? "Play rain sound" : "Play sound"}</button>
      {playing && !mixerOpen && <input aria-label="Ambient sound volume" type="range" min="0" max="100" value={volume} onChange={e => changeVolume(Number(e.target.value))} />}
      <button className="room-button room-mix-button" type="button" aria-label="Sound mixer" aria-expanded={mixerOpen} onClick={() => setMixerOpen(open => !open)}>Sound mixer{layerCount > 1 && <span className="room-mix-count" aria-hidden="true">{layerCount}</span>}</button>
      {error && <span role="status">{error}</span>}
    </div>
    {mixerOpen && <section className="room-sound-mixer" aria-label="Ambient sound mixer">
      <header><div><h3>Sound mixer</h3><p>Blend your own background atmosphere. Only you can hear it.</p></div><button className="room-button" type="button" aria-label="Close sound mixer" onClick={() => setMixerOpen(false)}><X size={16} /></button></header>
      <div className="room-mixer-layers">
        {AMBIENT_SOUNDS.map(sound => <label key={sound.value} className="room-mixer-layer">
          <span>{sound.label}</span><output>{layers[sound.value]}%</output>
          <input type="range" min="0" max="100" step="1" value={layers[sound.value]} aria-label={sound.label + " layer volume"} onChange={e => changeLayer(sound.value, Number(e.target.value))} />
        </label>)}
      </div>
      <div className="room-mixer-master">
        <label><span>Master volume</span><input aria-label="Master ambient volume" type="range" min="0" max="100" value={volume} onChange={e => changeVolume(Number(e.target.value))}/><output>{volume}%</output></label>
        <span>{!canPlay ? "Raise a layer to enable sound." : playing ? "Playing · adjust any layer live" : "Sound is off until you press Play."}</span>
      </div>
    </section>}
  </>;
}

function StudyRoomDock({ room, presence, status, timer, busy, remainingSeconds, toggle, audio, leave, sessionError }) {
  const playing = audio.playing;
  const activeCount = presence.participants.filter(p => p.status === "running").length;
  return <aside className="room-dock" aria-label="Active study room">
    <Link className="room-dock-room" to="/app/study-rooms" title="Return to study room">
      <StudyDesk status={status} appearance={presence.participants.find(p => p.id === presence.participantId)?.desk} />
      <span className="room-dock-details"><strong>{room.name}</strong>
        <span><span className={`room-live-dot${presence.connected ? " is-online" : ""}`} />{presence.connected ? `${activeCount} studying · ${stateNames[status]}` : "Room disconnected"}</span>
      </span>
      <ArrowUpRight size={15} />
    </Link>
    <div className="room-dock-actions">
      <strong className="room-dock-time" aria-label={status === "idle" ? "Next focus duration" : "Elapsed focus time"}>{duration(timer)}</strong>
      {status !== "idle" && <button type="button" className="room-dock-icon" disabled={busy || (status === "paused" && remainingSeconds <= 0)} aria-label={status === "running" ? "Pause room focus" : "Resume room focus"} title={status === "running" ? "Pause focus" : "Resume focus"} onClick={toggle}>{status === "running" ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}</button>}
      <button type="button" className="room-dock-sound" aria-pressed={playing} disabled={!playing && !audio.canPlay} onClick={audio.toggle}>{playing ? "Mute sound" : "Play sound"}</button>
      <button type="button" className="room-dock-icon" aria-label="Leave study room" title="Leave study room (your Focus timer continues)" onClick={leave} disabled={busy}><LogOut size={19} /></button>
    </div>
    {(presence.error || audio.error || sessionError) && <div className="room-dock-warning" role="status"><span>{presence.error || audio.error || sessionError}</span>{presence.error && <button type="button" onClick={presence.retry}>Reconnect</button>}</div>}
  </aside>;
}

function DirectoryCard({ item, occupancy, disabled, onJoin }) {
  const Icon = item.icon;
  return <button type="button" className="room-directory-item" disabled={disabled} onClick={() => onJoin(item)}>
    <div className={`room-directory-art room-environment--${item.atmosphere}`}><Icon size={29} weight="regular" /></div>
    <span className="room-directory-label"><strong>{item.name}</strong><span>{item.description}</span>
      {occupancy && <span className={`room-directory-occupancy${occupancy.studying > 0 ? " is-active" : ""}`}>
        <span className="room-occupancy-dot" aria-hidden="true" />
        {occupancy.total >= occupancy.capacity ? "Room full" : `${occupancy.studying} studying · ${occupancy.total} in room`}
      </span>}
    </span>
    <span className="room-directory-join">Join <span aria-hidden="true">→</span></span>
  </button>;
}

const participantSeconds = (participant, now) => (participant.elapsedMs + (participant.startedAt === null ? 0 : Math.max(0, now - participant.startedAt))) / 1000;
function DeskParticipant({ participant, now, self, event, onEncourage }) {
  const [sent, setSent] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => setSent(""), 3500);
    return () => clearTimeout(timer);
  }, [sent]);
  const send = async kind => {
    if (sending || sent) return;
    setSending(true);
    try {
      const result = await onEncourage(participant.id, kind);
      setSent(result?.ok ? "Sent" : "Try later");
    } finally { setSending(false); }
  };
  const activeEvent = event?.participantId === participant.id ? event : null;
  const EventIcon = activeEvent?.kind === "wave" ? HandWaving : activeEvent?.kind === "thumb" ? ThumbsUp : CheckCircle2;
  const seconds = participantSeconds(participant, now);
  return <li className={`room-participant is-${participant.status}${self ? " is-self" : ""}`}>
    <div className="room-desk-frame">
      <StudyDesk status={participant.status} appearance={participant.desk} />
      {activeEvent && <span key={activeEvent.id} className="desk-event" role="status" title={activeEvent.kind === "saved" ? "Session saved" : "Encouragement received"}><EventIcon size={18} weight="fill" /><span className="desk-sr-only">{activeEvent.kind === "saved" ? "Session saved" : "Encouragement received"}</span></span>}
    </div>
    <strong title={participant.name}>{self ? "You" : participant.name}</strong>
    <span className="room-participant-time">{duration(seconds)}</span>
    <span className="room-participant-status">{stateNames[participant.status]}</span>
    {participant.subject && <span className="room-participant-subject" title={participant.subject}>{participant.subject}</span>}
    {!self && onEncourage && participant.desk?.encouragement && <div className="desk-encourage">
      {sent ? <span role="status">{sent}</span> : <>
        <button type="button" aria-label={`Wave to ${participant.name}`} title="Send a wave" disabled={sending} onClick={() => send("wave")}><HandWaving size={15} /></button>
        <button type="button" aria-label={`Give ${participant.name} a thumbs-up`} title="Send a thumbs-up" disabled={sending} onClick={() => send("thumb")}><ThumbsUp size={15} /></button>
      </>}
    </div>}
  </li>;
}

// In Zen use the live roster, not a stale snapshot or the directory's search.
function ZenRoomRoster({ presence, now }) {
  const { participants, participantId, connected } = presence;
  const previous = useRef(null);
  const [activity, setActivity] = useState("");
  const ids = participants.map(p => p.id).sort().join(",");
  useEffect(() => {
    if (!connected) { previous.current = null; setActivity(""); return; }
    const next = new Set(ids ? ids.split(",") : []);
    const prior = previous.current;
    previous.current = next;
    if (!prior) return;
    const joined = [...next].filter(id => !prior.has(id)).length;
    const left = [...prior].filter(id => !next.has(id)).length;
    if (joined || left) setActivity([joined ? `${joined} joined` : "", left ? `${left} left` : ""].filter(Boolean).join(" · "));
  }, [ids, connected]);
  useEffect(() => {
    if (!activity) return;
    const timeout = setTimeout(() => setActivity(""), 2300);
    return () => clearTimeout(timeout);
  }, [activity]);
  const ordered = [...participants].sort((a, b) => Number(b.id === participantId) - Number(a.id === participantId));
  return <section className="zen-room-roster" aria-label="Live study desks">
    <header><h2>Study together</h2><span className="zen-room-activity" role="status" key={activity}>{activity}</span></header>
    {connected && ordered.length ? <ul className="zen-room-grid" aria-label="Zen room participants" tabIndex={0}>
      {ordered.map(p => <DeskParticipant key={p.id} participant={p} now={now} self={p.id === participantId} event={presence.deskEvent} />)}
    </ul> : <p className="zen-room-waiting">{connected ? "No one at a desk yet." : "Waiting for a live connection…"}</p>}
  </section>;
}

function RoomInvitePanel({ room, onClose }) {
  const url = roomInviteURL(window.location.origin, room.id);
  const [copied, setCopied] = useState(false);
  const input = useRef(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch { input.current?.focus(); input.current?.select(); }
  };
  return <div className="room-invite-share">
    <div><strong>Invite someone to {room.name}</strong><p>{room.id.startsWith("group:") ? "This link works for existing group members. For new members, use the group invitation in Study Groups." : "Anyone with a StudyOS account can open this link and choose to join."}</p></div>
    <div className="room-invite-copy">
      <input ref={input} aria-label="Room invitation link" value={url || ""} readOnly onFocus={event => event.target.select()} />
      <button type="button" className="room-button" onClick={copy}><Copy size={16} /> {copied ? "Copied" : "Copy link"}</button>
      <button type="button" className="room-button" aria-label="Close invitation" onClick={onClose}><X size={16} /></button>
    </div>
  </div>;
}

export default function StudyRoomPanel({
  isGuest, uid, groups, loading, hydrated, status, remainingSeconds, elapsedSeconds,
  subjectOptions, selectedSubjectId, setSelectedSubjectId, activeSubjectName,
  plannedMinutes, chooseDuration, customDuration, customUnit, handleCustomDuration, handleCustomUnit,
  savingSession, startingSession, startSession, pauseSession, resumeSession, finishSession,
  error, message, setError, zenAnchorRef, zenOpen, setZenOpen, completion, setCompletion,
  roomView = true, onRoomActive = () => {},
}) {
  const { logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteRequested = roomView && searchParams.has("room");
  const inviteId = inviteRequested ? searchParams.get("room") : null;
  const [shareOpen, setShareOpen] = useState(false);
  const [deskOpen, setDeskOpen] = useState(false);
  const [deskChoice, setDeskChoice] = useState(() => ({ uid, value: readDesk(localStorage, uid) }));
  const desk = deskChoice.uid === uid ? deskChoice.value : undefined;
  useEffect(() => { setDeskChoice({ uid, value: readDesk(localStorage, uid) }); setDeskOpen(false); }, [uid]);
  const [roomChoice, setRoom] = useState(null);
  const room = roomChoice?.ownerUid === uid ? roomChoice : null;
  const restoredRoomUid = useRef(null);
  const [shareSubject, setShareSubject] = useState(false);
  const [environment, setEnvironment] = useState("none");
  const audio = useRoomAudio(uid);
  const motion = useRoomMotion(uid);
  const [roomNotice, setRoomNotice] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("activity");
  const subject = status === "idle" ? "" : activeSubjectName;
  const presence = useStudyRoom(hydrated && !isGuest ? room?.id : null, uid, status, shareSubject ? subject : "", desk);
  const connected = presence.connected;
  const ownDesk = presence.participants.find(p => p.id === presence.participantId)?.desk;
  function saveDesk(value) {
    const next = normalizeDesk(value, presence.deskProgress ?? 0);
    writeDesk(localStorage, uid, next);
    setDeskChoice({ uid, value: next });
    setDeskOpen(false);
  }

  useEffect(() => {
    if (!room || !roomView) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room, roomView]);

  useEffect(() => { restoredRoomUid.current = null; setRoom(null); setShareSubject(false); setQuery(""); setSort("activity"); }, [uid]);

  function dismissInvite() {
    if (!inviteRequested) return;
    const next = new URLSearchParams(searchParams);
    next.delete("room");
    setSearchParams(next, { replace: true });
  }

  function join(next) {
    dismissInvite();
    setShareOpen(false);
    setDeskOpen(false);
    setRoomNotice("");
    setShareSubject(false);
    setQuery("");
    setSort("activity");
    setEnvironment(readRoomScenery(localStorage, uid, next.id, next.atmosphere || "none", ROOM_SCENERY.map(option => option.value)));
    writeRoomSelection(sessionStorage, uid, next.id);
    setRoom({ ...next, ownerUid: uid });
    onRoomActive(true);
  }

  function leaveRoom() {
    setShareOpen(false);
    setDeskOpen(false);
    audio.mute();
    writeRoomSelection(sessionStorage, uid, null);
    setRoom(null);
    setShareSubject(false);
    setZenOpen(false);
    onRoomActive(false);
  }

  // A server-initiated ejection (membership ended or another tab joined) is
  // terminal. Do not keep audio playing or silently rejoin on refresh.
  useEffect(() => {
    if (!presence.removed || !room) return;
    setRoomNotice(presence.error);
    leaveRoom();
  }, [presence.removed, room]);

  function changeEnvironment(value) {
    setEnvironment(value);
    if (room) writeRoomScenery(localStorage, uid, room.id, value);
  }

  const toggle = status === "running" ? pauseSession : status === "paused" ? resumeSession : startSession;
  const scene = resolveRoomScene(environment, new Date(now));
  const clockNow = now + presence.offset;
  const participants = [...presence.participants].sort((a, b) => {
    if (a.id === presence.participantId) return -1;
    if (b.id === presence.participantId) return 1;
    if (sort === "duration") return participantSeconds(b, clockNow) - participantSeconds(a, clockNow);
    return Number(b.status === "running") - Number(a.status === "running");
  });
  const activeCount = participants.filter(p => p.status === "running").length;
  const visibleParticipants = participants.filter(p => {
    const search = query.trim().toLowerCase();
    return !search || [p.name, p.subject, p.id === presence.participantId ? "You" : ""].some(value => value?.toLowerCase().includes(search));
  });
  const timerDisabled = !hydrated || loading || savingSession || startingSession;
  const timer = status === "idle" ? remainingSeconds : elapsedSeconds;
  const privateRooms = groups.map(group => ({
    id: `group:${String(group._id).toLowerCase()}`, name: group.name || "Study group", atmosphere: "none", icon: Lock,
    description: "Only members of your study group can join.",
  })).filter(group => /^group:[a-f0-9]{24}$/.test(group.id));
  const privateRoomKey = privateRooms.map(group => group.id).sort().join(",");
  const invitedRoom = allowedInvitedRoom(inviteId, PUBLIC_ROOMS, privateRooms);
  useEffect(() => {
    if (!uid || isGuest || !hydrated || loading || restoredRoomUid.current === uid) return;
    restoredRoomUid.current = uid;
    const previousId = readRoomSelection(sessionStorage, uid);
    if (!previousId) { onRoomActive(false); return; }
    const next = [...PUBLIC_ROOMS, ...privateRooms].find(item => item.id === previousId);
    if (next) {
      setEnvironment(readRoomScenery(localStorage, uid, next.id, next.atmosphere || "none", ROOM_SCENERY.map(option => option.value)));
      setRoom({ ...next, ownerUid: uid });
      onRoomActive(true);
    } else {
      writeRoomSelection(sessionStorage, uid, null);
      onRoomActive(false);
    }
  }, [uid, isGuest, hydrated, loading, privateRoomKey]);
  const directory = useStudyRoomDirectory(uid, roomView && hydrated && !isGuest && !room, privateRooms.map(group => group.id.slice(6)));
  const publicStudying = PUBLIC_ROOMS.reduce((count, item) => count + (directory.rooms[item.id]?.studying || 0), 0);

  if (!roomView) return room ? <StudyRoomDock {...{ room, presence, status, timer, remainingSeconds, toggle, audio, leave: leaveRoom, busy: timerDisabled, sessionError: error }} /> : null;

  return <div className="study-rooms-page">
    <header className="room-page-header">
      <div>
        <h1>Study Rooms</h1>
        <p>Find a desk. Focus together.</p>
      </div>
      {room && presence.deskProgress !== null && <button type="button" className="room-button" aria-expanded={deskOpen} onClick={() => setDeskOpen(open => !open)}>Customize desk</button>}
    </header>

    {deskOpen && room && presence.deskProgress !== null && <DeskStudio appearance={desk} progress={presence.deskProgress} onSave={saveDesk} onClose={() => setDeskOpen(false)} />}
    {inviteRequested && !isGuest && <section className="room-invite-preview" aria-label="Room invitation">
      <div><strong>{loading || !hydrated ? "Checking room invitation…" : invitedRoom ? (room?.id === invitedRoom.id ? `You're already in ${invitedRoom.name}` : `Join ${invitedRoom.name}?`) : "Room unavailable"}</strong>
        <p>{loading || !hydrated ? "Checking your access." : invitedRoom ? (room?.id === invitedRoom.id ? "Your desk is already here." : room ? "Switching rooms keeps your personal Focus timer running." : "You'll share your display name and focus status when you join. Subject sharing is optional.") : "This room is private, invalid or no longer available. Ask the organizer for a Study Group invitation if needed."}</p>
      </div>
      <div className="room-header-actions">
        {hydrated && !loading && invitedRoom && room?.id !== invitedRoom.id && <button type="button" className="room-button room-primary" disabled={savingSession || startingSession} onClick={() => join(invitedRoom)}>{room ? "Switch room" : "Join room"}</button>}
        <button type="button" className="room-button" onClick={dismissInvite}>Dismiss</button>
      </div>
    </section>}
    {roomNotice && <div className="room-notice" role="status">{roomNotice}<button className="room-button" type="button" onClick={() => setRoomNotice("")}>Dismiss</button></div>}
    {isGuest ? <section className="room-placeholder"><UsersRound size={36} /><h2>Study together with an account</h2><p>Sign in to see live students and join study rooms. Your guest data stays on this device.</p>{inviteRequested ? <button type="button" className="room-button room-primary" onClick={() => void logout()}>Sign in to join</button> : <Link className="room-button room-primary" to="/app/settings">Account settings</Link>}</section> : !room ? <>
      {error && <div className="room-notice room-error" role="alert">{error}<button type="button" className="room-button" onClick={() => setError("")}>Dismiss</button></div>}
      <div className="room-privacy-note"><UsersRound size={18} /><span>Rooms are silent. Joining shares your display name, focus status and time in the room, even while you use other StudyOS pages. Subjects are optional. Leave the room to stop sharing.</span></div>
      <div className="room-section-heading room-public-heading">
        <h2 className="room-section-title">Public rooms</h2>
        {directory.connected && <span className="room-directory-summary"><span className="room-occupancy-dot" /> {publicStudying} studying now</span>}
      </div>
      {directory.error && <div className="room-directory-warning" role="status">{directory.error} <button type="button" className="room-button" onClick={directory.refresh}>Retry</button></div>}
      <div className="room-directory">
        {PUBLIC_ROOMS.map(item => <DirectoryCard key={item.id} item={item} occupancy={directory.rooms[item.id]} disabled={!hydrated || loading} onJoin={join} />)}
      </div>
      <div className="room-section-heading"><h2 className="room-section-title">Private rooms</h2><Link to="/app/groups">Manage study groups</Link></div>
      {loading ? <p className="room-note">Loading your study groups…</p> : privateRooms.length ? <div className="room-directory">
        {privateRooms.map(item => <DirectoryCard key={item.id} item={item} occupancy={directory.rooms[item.id]} disabled={!hydrated} onJoin={join} />)}
      </div> : <section className="room-placeholder room-placeholder--small"><Lock size={23} /><p>Create or join a Study Group to get a private room.</p><Link to="/app/groups" className="room-button">Study Groups</Link></section>}
      {status !== "idle" && <p className="room-note">Your Focus timer is still active. <Link to="/app/focus">Open Focus</Link></p>}
    </> : <>
      <section aria-label="Your focus timer" className={`room-timer room-environment--${scene.scene}`} data-scene={scene.scene}>
        <RoomAtmosphere scene={scene.scene} phase={scene.phase} active={!zenOpen} motion={motion.enabled} />
        <div className="room-timer-top">
          <div className="room-timer-content">
            <span>{status === "idle" ? "Next focus session" : status === "paused" ? "Focus time · Paused" : "Current focus time"}</span>
            <div className="room-time-row">
              <strong ref={zenAnchorRef}>{duration(timer)}</strong>
              <button type="button" className="room-timer-toggle" aria-label={status === "running" ? "Pause focus" : status === "paused" ? "Resume focus" : "Start focus"} onClick={toggle} disabled={timerDisabled || (status === "paused" && remainingSeconds <= 0)}>
                {status === "running" ? <Pause size={23} weight="fill" /> : <Play size={23} weight="fill" />}
              </button>
            </div>
            <span className="room-timer-detail">{status === "idle" ? "Choose a subject and duration" : `${activeSubjectName} · ${duration(remainingSeconds)} remaining`}</span>
          </div>
          <div className="room-self-desk"><StudyDesk status={status} appearance={ownDesk} /><span>{stateNames[status]}</span></div>
        </div>
        <div className="room-timer-controls">
          {status === "idle" ? <>
            <StudySelect value={selectedSubjectId} onChange={value => setSelectedSubjectId(String(value))} options={subjectOptions} ariaLabel="Choose Focus subject" disabled={timerDisabled} />
            <StudySelect value={customOpen || customDuration !== "" ? "custom" : String(plannedMinutes)} onChange={value => { if (value === "custom") { setCustomOpen(true); handleCustomDuration({ target: { value: String(customUnit === "hr" ? plannedMinutes / 60 : plannedMinutes) } }); } else { setCustomOpen(false); handleCustomUnit("min"); chooseDuration(Number(value)); } }} options={[25, 50, 90].map(value => ({ value: String(value), label: `${value} min` })).concat(plannedMinutes !== 25 && plannedMinutes !== 50 && plannedMinutes !== 90 && customDuration === "" ? [{ value: String(plannedMinutes), label: `${plannedMinutes} min` }] : [], [{ value: "custom", label: "Custom" }])} ariaLabel="Focus duration" disabled={timerDisabled} />
            {(customOpen || customDuration !== "") && <div className="room-duration-custom"><input type="number" inputMode="decimal" min={customUnit === "hr" ? 1 / 60 : 1} max={customUnit === "hr" ? 12 : 720} step="any" value={customDuration} onChange={handleCustomDuration} aria-label="Custom focus duration" disabled={timerDisabled} /><StudySelect value={customUnit} onChange={handleCustomUnit} options={[{ value: "min", label: "min" }, { value: "hr", label: "hr" }]} ariaLabel="Duration unit" disabled={timerDisabled} /></div>}
          </> : <button className="room-button" type="button" disabled={timerDisabled} onClick={() => finishSession(false)}><CheckCircle2 size={17} /> {savingSession ? "Saving…" : "Finish & save"}</button>}
          <button type="button" className="room-button" disabled={timerDisabled} onClick={() => setZenOpen(true)}><Moon size={17} /> Zen</button>
        </div>
      </section>
      {error && <div className="room-notice room-error" role="alert">{error}<button type="button" className="room-button" onClick={() => setError("")}>Dismiss</button></div>}
      {message && <div className="room-notice" role="status">{message}</div>}
      <section className="room-live" aria-label={room.name}>
        <header className="room-live-header">
          <div><h2>{room.name}</h2><p><span className={`room-live-dot${connected ? " is-online" : ""}`} /> {connected ? <><strong>{activeCount} studying</strong> <span>· {participants.length} in room</span></> : "Connecting to the room"}</p></div>
          <div className="room-header-actions">
            <button type="button" className="room-button" aria-expanded={shareOpen} disabled={!connected} onClick={() => setShareOpen(open => !open)}><Link2 size={16} /> Invite</button>
            <button type="button" className="room-button" onClick={leaveRoom} disabled={savingSession || startingSession}>Leave</button>
          </div>
        </header>
        {shareOpen && connected && <RoomInvitePanel key={room.id} room={room} onClose={() => setShareOpen(false)} />}
        {presence.deskError && <div className="room-notice room-error" role="status">{presence.deskError}<button type="button" className="room-button" onClick={presence.retryDesk}>Retry desk sync</button></div>}
        {presence.error && <div className="room-notice room-error" role="status">{presence.error}<button type="button" className="room-button" onClick={presence.retry}>Reconnect</button></div>}
        {(participants.length > 8 || query || sort !== "activity") && <div className="room-participant-toolbar">
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a student" aria-label="Find a student" />
          <StudySelect value={sort} onChange={setSort} options={[{ value: "activity", label: "Studying first" }, { value: "duration", label: "Most focused time" }]} ariaLabel="Sort participants" />
        </div>}
        {participants.length > 0 ? <ul className="room-participant-grid" aria-label="Room participants">
          {visibleParticipants.map(participant => <DeskParticipant key={participant.id} participant={participant} self={participant.id === presence.participantId} now={clockNow} event={presence.deskEvent} onEncourage={presence.encourage} />)}
          {!visibleParticipants.length && <li className="room-no-match">No matching students.</li>}
        </ul> : <div className="room-placeholder room-placeholder--small"><StudyDesk /><p>{connected ? "No one at a desk yet." : "Waiting for a live connection…"}</p></div>}
        <div className="room-preferences">
          <label className="room-share"><input type="checkbox" checked={shareSubject} onChange={e => setShareSubject(e.target.checked)} /> Share my subject</label>
          <div className="room-scenery-choice">
            <StudySelect value={environment} onChange={changeEnvironment} options={ROOM_SCENERY} ariaLabel="Choose room scenery" />
            <button type="button" className="room-button" aria-pressed={motion.enabled} onClick={motion.toggle} title="Toggle animated scenery">{motion.enabled ? "Motion on" : "Motion off"}</button>
            {environment === "auto" && <span className="room-scene-phase" title="Based on this device’s local time">{scene.label} now</span>}
          </div>
          <AmbientSound key={room.id} audio={audio} />
        </div>
        <footer className="room-live-footer">Your desk stays active across StudyOS pages. Leave to stop sharing your room presence; your personal Focus timer continues.</footer>
      </section>
    </>}
    {zenOpen && room && !completion && <FocusZen anchor={zenAnchorRef.current} time={duration(timer)} status={status} animate={true} error={error} saving={timerDisabled || (status === "paused" && remainingSeconds <= 0)} onToggle={toggle} onClose={() => setZenOpen(false)} sharedRoom={{
      name: room.name, connected, activeCount, total: participants.length, scenery: scene.scene, phase: scene.phase, phaseLabel: environment === "auto" ? scene.label : null,
      detail: status === "idle" ? "Ready to focus" : `${activeSubjectName} · ${duration(remainingSeconds)} remaining`,
      audio, motion, onFinish: () => finishSession(false),
      roster: <ZenRoomRoster presence={presence} now={clockNow} />,
    }} />}
    {completion && <FocusCompletion seconds={completion.seconds} onClose={() => setCompletion(null)} />}
  </div>;
}
