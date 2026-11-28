import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { UsersRound, LockKeyhole as Lock, Play, Pause, CheckCircle2, CloudRain, Cloud, Moon, BookOpen, ArrowUpRight, LogOut } from "./icons";
import StudySelect from "./StudySelect";
import FocusZen from "./FocusZen";
import FocusCompletion from "./FocusCompletion";
import { useStudyRoom } from "../hooks/useStudyRoom";
import { useStudyRoomDirectory } from "../hooks/useStudyRoomDirectory";
import { AMBIENT_SOUNDS, createAmbientSamples, readRoomScenery, writeRoomScenery, readRoomSound, writeRoomSound, readRoomSelection, writeRoomSelection } from "../services/roomAmbience";
import "../styles/study-rooms.css";

const PUBLIC_ROOMS = [
  { id: "public:quiet", name: "Quiet Room", description: "A silent workspace for any subject.", icon: BookOpen, atmosphere: "none" },
  { id: "public:library", name: "Rain Room", description: "A calm place for long focus sessions.", icon: CloudRain, atmosphere: "rain" },
  { id: "public:cloud", name: "Cloud Room", description: "A little space above the noise.", icon: Cloud, atmosphere: "cloud" },
  { id: "public:night", name: "Night Study", description: "For evening readers and night owls.", icon: Moon, atmosphere: "stargaze" },
];
const ENVIRONMENTS = [
  { value: "none", label: "No scenery" }, { value: "rain", label: "Rain" },
  { value: "cloud", label: "Clouds" }, { value: "stargaze", label: "Night sky" },
  { value: "ronin", label: "Misty fields" },
];
const pad = n => String(n).padStart(2, "0");
const duration = seconds => {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${pad(Math.floor(n / 3600))}:${pad(Math.floor(n / 60) % 60)}:${pad(n % 60)}`;
};
const stateNames = { running: "Studying", paused: "On break", idle: "At desk" };

// Original StudyOS desk character, drawn as a compact editorial illustration.
// The same silhouette reads at mobile sizes; state is also conveyed via text.
export function StudyDesk({ status = "idle" }) {
  const active = status === "running";
  const paused = status === "paused";
  return <svg className={`room-desk room-desk--${status}`} viewBox="0 0 100 84" fill="none" aria-hidden="true">
    <path d="M12 74H89" stroke="currentColor" strokeOpacity=".25" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="28" y="44" width="57" height="5" rx="1.6" fill="currentColor" />
    <path d="M32 49V73M81 49V73" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M16 36V62H35M20 62V73M33 62V73" stroke="currentColor" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M67 43V29L76 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M72 14L82 15L84 25L70 25Z" fill="currentColor" opacity=".8" />
    {active && <path className="room-desk-light" d="M70 26L59 43H91L84 26Z" fill="currentColor" opacity=".10" />}
    <path d="M52 43L46 37L57 36L61 42L65 37L69 38L66 43Z" fill="currentColor" opacity=".65" />
    {active ? <>
      <circle cx="28" cy="24" r="9" fill="currentColor" />
      <path d="M20 36Q29 30 37 39L42 47L51 43" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 41L26 57L43 58L48 72" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <path className="room-desk-page" d="M47 39L54 41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </> : paused ? <>
      <rect x="40" y="31" width="12" height="11" rx="2" fill="currentColor" opacity=".85" />
      <path d="M52 34H55Q58 37 55 39H52M43 28L44 24M49 28L50 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </> : <path d="M41 41H53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
  </svg>;
}

function useRoomAudio(uid) {
  const [preference, setPreference] = useState(() => uid ? readRoomSound(localStorage, uid) : { kind: "rain", volume: 35 });
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const sound = useRef(null);
  const { kind, volume } = preference;

  function stop() {
    const current = sound.current;
    sound.current = null;
    if (!current) return;
    try { current.source.stop(); } catch { /* Already stopped. */ }
    void current.context.close().catch(() => {});
  }

  useEffect(() => () => {
    const current = sound.current;
    sound.current = null;
    if (current) {
      try { current.source.stop(); } catch { /* Already stopped. */ }
      void current.context.close().catch(() => {});
    }
  }, []);

  useEffect(() => { if (uid) writeRoomSound(localStorage, uid, preference); }, [uid, preference]);

  async function play(nextKind, nextVolume) {
    stop();
    let context;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("Audio isn't supported in this browser.");
      context = new Audio();
      const samples = createAmbientSamples(nextKind, context.sampleRate);
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = nextKind === "brown" ? 480 : nextKind === "ocean" ? 1300 : nextKind === "fan" ? 850 : 2400;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(context.destination);
      sound.current = { context, source, gain };
      source.start();
      await context.resume();
      if (sound.current?.context !== context) return;
      gain.gain.setTargetAtTime(nextVolume / 100 * .35, context.currentTime, .08);
      setPlaying(true);
      setError("");
    } catch {
      if (sound.current && sound.current.context !== context) return;
      if (sound.current?.context === context) stop();
      else if (context && context.state !== "closed") void context.close().catch(() => {});
      setPlaying(false);
      setError("Ambient sound is unavailable.");
    }
  }

  function mute() {
    stop();
    setPlaying(false);
  }

  function toggle() {
    if (sound.current) mute();
    else void play(kind, volume);
  }

  function changeKind(value) {
    const wasPlaying = Boolean(sound.current);
    setPreference(old => ({ ...old, kind: value }));
    if (wasPlaying) void play(value, volume);
  }

  function changeVolume(next) {
    setPreference(old => ({ ...old, volume: next }));
    const current = sound.current;
    if (current) current.gain.gain.setTargetAtTime(next / 100 * .35, current.context.currentTime, .06);
  }

  return { kind, volume, playing, error, toggle, mute, changeKind, changeVolume };
}

function AmbientSound({ audio }) {
  const { kind, volume, playing, error, toggle, changeKind, changeVolume } = audio;
  return <div className="room-audio">
    <StudySelect value={kind} onChange={changeKind} options={AMBIENT_SOUNDS} ariaLabel="Ambient sound" />
    <button className="room-button" type="button" aria-pressed={playing} onClick={toggle}>{playing ? "Mute sound" : kind === "rain" ? "Play rain sound" : "Play sound"}</button>
    {playing && <input aria-label="Ambient sound volume" type="range" min="0" max="100" value={volume} onChange={e => changeVolume(Number(e.target.value))} />}
    {error && <span role="status">{error}</span>}
  </div>;
}

function StudyRoomDock({ room, presence, status, timer, busy, remainingSeconds, toggle, audio, leave, sessionError }) {
  const playing = audio.playing;
  const activeCount = presence.participants.filter(p => p.status === "running").length;
  return <aside className="room-dock" aria-label="Active study room">
    <Link className="room-dock-room" to="/app/study-rooms" title="Return to study room">
      <StudyDesk status={status} />
      <span className="room-dock-details"><strong>{room.name}</strong>
        <span><span className={`room-live-dot${presence.connected ? " is-online" : ""}`} />{presence.connected ? `${activeCount} studying · ${stateNames[status]}` : "Room disconnected"}</span>
      </span>
      <ArrowUpRight size={15} />
    </Link>
    <div className="room-dock-actions">
      <strong className="room-dock-time" aria-label={status === "idle" ? "Next focus duration" : "Elapsed focus time"}>{duration(timer)}</strong>
      {status !== "idle" && <button type="button" className="room-dock-icon" disabled={busy || (status === "paused" && remainingSeconds <= 0)} aria-label={status === "running" ? "Pause room focus" : "Resume room focus"} title={status === "running" ? "Pause focus" : "Resume focus"} onClick={toggle}>{status === "running" ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}</button>}
      <button type="button" className="room-dock-sound" aria-pressed={playing} onClick={audio.toggle}>{playing ? "Mute sound" : "Play sound"}</button>
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
function DeskParticipant({ participant, now, self }) {
  const seconds = participantSeconds(participant, now);
  return <li className={`room-participant is-${participant.status}${self ? " is-self" : ""}`}>
    <StudyDesk status={participant.status} />
    <strong title={participant.name}>{self ? "You" : participant.name}</strong>
    <span className="room-participant-time">{duration(seconds)}</span>
    <span className="room-participant-status">{stateNames[participant.status]}</span>
    {participant.subject && <span className="room-participant-subject" title={participant.subject}>{participant.subject}</span>}
  </li>;
}

export default function StudyRoomPanel({
  isGuest, uid, groups, loading, hydrated, status, remainingSeconds, elapsedSeconds,
  subjectOptions, selectedSubjectId, setSelectedSubjectId, activeSubjectName,
  plannedMinutes, chooseDuration, customDuration, customUnit, handleCustomDuration, handleCustomUnit,
  savingSession, startingSession, startSession, pauseSession, resumeSession, finishSession,
  error, message, setError, zenAnchorRef, zenOpen, setZenOpen, completion, setCompletion,
  roomView = true, onRoomActive = () => {},
}) {
  const [roomChoice, setRoom] = useState(null);
  const room = roomChoice?.ownerUid === uid ? roomChoice : null;
  const restoredRoomUid = useRef(null);
  const [shareSubject, setShareSubject] = useState(false);
  const [environment, setEnvironment] = useState("none");
  const audio = useRoomAudio(uid);
  const [roomNotice, setRoomNotice] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("activity");
  const subject = status === "idle" ? "" : activeSubjectName;
  const presence = useStudyRoom(hydrated && !isGuest ? room?.id : null, uid, status, shareSubject ? subject : "");
  const connected = presence.connected;

  useEffect(() => {
    if (!room || !roomView) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room, roomView]);

  useEffect(() => { restoredRoomUid.current = null; setRoom(null); setShareSubject(false); setQuery(""); setSort("activity"); }, [uid]);

  function join(next) {
    setRoomNotice("");
    setShareSubject(false);
    setQuery("");
    setSort("activity");
    setEnvironment(readRoomScenery(localStorage, uid, next.id, next.atmosphere || "none", ENVIRONMENTS.map(option => option.value)));
    writeRoomSelection(sessionStorage, uid, next.id);
    setRoom({ ...next, ownerUid: uid });
    onRoomActive(true);
  }

  function leaveRoom() {
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
  useEffect(() => {
    if (!uid || isGuest || !hydrated || loading || restoredRoomUid.current === uid) return;
    restoredRoomUid.current = uid;
    const previousId = readRoomSelection(sessionStorage, uid);
    if (!previousId) { onRoomActive(false); return; }
    const next = [...PUBLIC_ROOMS, ...privateRooms].find(item => item.id === previousId);
    if (next) {
      setEnvironment(readRoomScenery(localStorage, uid, next.id, next.atmosphere || "none", ENVIRONMENTS.map(option => option.value)));
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
    </header>

    {roomNotice && <div className="room-notice" role="status">{roomNotice}<button className="room-button" type="button" onClick={() => setRoomNotice("")}>Dismiss</button></div>}
    {isGuest ? <section className="room-placeholder"><UsersRound size={36} /><h2>Study together with an account</h2><p>Sign in to see live students and join study rooms. Your guest data stays on this device.</p><Link className="room-button room-primary" to="/app/settings">Account settings</Link></section> : !room ? <>
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
      <section aria-label="Your focus timer" className={`room-timer room-environment--${environment}`}>
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
          <div className="room-self-desk"><StudyDesk status={status} /><span>{stateNames[status]}</span></div>
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
          <button type="button" className="room-button" onClick={leaveRoom} disabled={savingSession || startingSession}>Leave</button>
        </header>
        {presence.error && <div className="room-notice room-error" role="status">{presence.error}<button type="button" className="room-button" onClick={presence.retry}>Reconnect</button></div>}
        {(participants.length > 8 || query || sort !== "activity") && <div className="room-participant-toolbar">
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a student" aria-label="Find a student" />
          <StudySelect value={sort} onChange={setSort} options={[{ value: "activity", label: "Studying first" }, { value: "duration", label: "Most focused time" }]} ariaLabel="Sort participants" />
        </div>}
        {participants.length > 0 ? <ul className="room-participant-grid" aria-label="Room participants">
          {visibleParticipants.map(participant => <DeskParticipant key={participant.id} participant={participant} self={participant.id === presence.participantId} now={clockNow} />)}
          {!visibleParticipants.length && <li className="room-no-match">No matching students.</li>}
        </ul> : <div className="room-placeholder room-placeholder--small"><StudyDesk /><p>{connected ? "No one at a desk yet." : "Waiting for a live connection…"}</p></div>}
        <div className="room-preferences">
          <label className="room-share"><input type="checkbox" checked={shareSubject} onChange={e => setShareSubject(e.target.checked)} /> Share my subject</label>
          <StudySelect value={environment} onChange={changeEnvironment} options={ENVIRONMENTS} ariaLabel="Choose room scenery" />
          <AmbientSound audio={audio} />
        </div>
        <footer className="room-live-footer">Your desk stays active across StudyOS pages. Leave to stop sharing your room presence; your personal Focus timer continues.</footer>
      </section>
    </>}
    {zenOpen && room && !completion && <FocusZen anchor={zenAnchorRef.current} time={duration(timer)} status={status} animate={true} error={error} saving={timerDisabled || (status === "paused" && remainingSeconds <= 0)} onToggle={toggle} onClose={() => setZenOpen(false)} />}
    {completion && <FocusCompletion seconds={completion.seconds} onClose={() => setCompletion(null)} />}
  </div>;
}
