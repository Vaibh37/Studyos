import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { UsersRound, LockKeyhole as Lock, Play, Pause, CheckCircle2, CloudRain, Cloud, Moon, BookOpen } from "./icons";
import StudySelect from "./StudySelect";
import FocusZen from "./FocusZen";
import FocusCompletion from "./FocusCompletion";
import { useStudyRoom } from "../hooks/useStudyRoom";
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

function AmbientSound() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(35);
  const [error, setError] = useState("");
  const sound = useRef(null);

  function stop() {
    const current = sound.current;
    sound.current = null;
    if (!current) return;
    current.source.stop();
    void current.context.close().catch(() => {});
  }

  useEffect(() => () => {
    const current = sound.current;
    sound.current = null;
    if (current) {
      current.source.stop();
      void current.context.close().catch(() => {});
    }
  }, []);

  async function toggle() {
    if (sound.current) {
      stop();
      setPlaying(false);
      return;
    }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("Audio isn't supported in this browser.");
      const context = new Audio();
      const length = context.sampleRate * 4;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      let previous = 0;
      for (let i = 0; i < length; i++) {
        previous = previous * 0.84 + (Math.random() * 2 - 1) * 0.16;
        data[i] = previous;
      }
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      gain.gain.value = volume / 100 * 0.45;
      source.connect(filter).connect(gain).connect(context.destination);
      sound.current = { context, source, gain };
      source.start();
      await context.resume();
      if (sound.current?.context === context) setPlaying(true);
      setError("");
    } catch {
      stop();
      setPlaying(false);
      setError("Ambient sound is unavailable.");
    }
  }

  return <div className="room-audio">
    <button className="room-button" type="button" aria-pressed={playing} onClick={toggle}>{playing ? "Mute rain" : "Play rain sound"}</button>
    {playing && <input aria-label="Ambient sound volume" type="range" min="0" max="100" value={volume} onChange={e => {
      const next = Number(e.target.value);
      setVolume(next);
      if (sound.current) sound.current.gain.gain.value = next / 100 * 0.45;
    }} />}
    {error && <span role="status">{error}</span>}
  </div>;
}

function DeskParticipant({ participant, now, self }) {
  const seconds = (participant.elapsedMs + (participant.startedAt === null ? 0 : Math.max(0, now - participant.startedAt))) / 1000;
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
  savingSession, startSession, pauseSession, resumeSession, finishSession,
  error, message, setError, zenAnchorRef, zenOpen, setZenOpen, completion, setCompletion,
}) {
  const [room, setRoom] = useState(null);
  const [shareSubject, setShareSubject] = useState(false);
  const [environment, setEnvironment] = useState("none");
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const subject = status === "idle" ? "" : activeSubjectName;
  const presence = useStudyRoom(hydrated && !isGuest ? room?.id : null, uid, status, shareSubject ? subject : "");
  const connected = presence.connected;

  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room]);

  useEffect(() => { setRoom(null); setShareSubject(false); }, [uid]);

  function join(next) {
    setShareSubject(false);
    setEnvironment(next.atmosphere || "none");
    setRoom(next);
  }

  const start = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    try { await startSession(); } finally { startingRef.current = false; setStarting(false); }
  };
  const toggle = status === "running" ? pauseSession : status === "paused" ? resumeSession : start;
  const participants = [...presence.participants].sort((a, b) => {
    if (a.id === presence.participantId) return -1;
    if (b.id === presence.participantId) return 1;
    return Number(b.status === "running") - Number(a.status === "running");
  });
  const activeCount = participants.filter(p => p.status === "running").length;
  const timerDisabled = !hydrated || loading || savingSession || starting;
  const timer = status === "idle" ? remainingSeconds : elapsedSeconds;
  const privateRooms = groups.map(group => ({
    id: `group:${String(group._id).toLowerCase()}`, name: group.name || "Study group", atmosphere: "none", icon: Lock,
    description: "Only members of your study group can join.",
  })).filter(group => /^group:[a-f0-9]{24}$/.test(group.id));

  return <div className="study-rooms-page">
    <header className="room-page-header">
      <div>
        <h1>Study Rooms</h1>
        <p>Find a desk. Focus together.</p>
      </div>
    </header>

    {isGuest ? <section className="room-placeholder"><UsersRound size={36} /><h2>Study together with an account</h2><p>Sign in to see live students and join study rooms. Your guest data stays on this device.</p><Link className="room-button room-primary" to="/app/settings">Account settings</Link></section> : !room ? <>
      {error && <div className="room-notice room-error" role="alert">{error}<button type="button" className="room-button" onClick={() => setError("")}>Dismiss</button></div>}
      <div className="room-privacy-note"><UsersRound size={18} /><span>Rooms are silent. Joining shares your display name, focus status and time in the room. Subjects are optional.</span></div>
      <h2 className="room-section-title">Public rooms</h2>
      <div className="room-directory">
        {PUBLIC_ROOMS.map(({ icon: Icon, ...item }) => <button type="button" className="room-directory-item" key={item.id} disabled={!hydrated || loading} onClick={() => join(item)}>
          <div className={`room-directory-art room-environment--${item.atmosphere}`}><Icon size={29} weight="regular" /></div>
          <span className="room-directory-label"><strong>{item.name}</strong><span>{item.description}</span></span>
          <span className="room-directory-join">Join <span aria-hidden="true">→</span></span>
        </button>)}
      </div>
      <div className="room-section-heading"><h2 className="room-section-title">Private rooms</h2><Link to="/app/groups">Manage study groups</Link></div>
      {loading ? <p className="room-note">Loading your study groups…</p> : privateRooms.length ? <div className="room-directory">
        {privateRooms.map(({ icon: Icon, ...item }) => <button type="button" className="room-directory-item" key={item.id} disabled={!hydrated} onClick={() => join(item)}>
          <div className="room-directory-art"><Icon size={27} /></div><span className="room-directory-label"><strong>{item.name}</strong><span>{item.description}</span></span><span className="room-directory-join">Join <span aria-hidden="true">→</span></span>
        </button>)}
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
          <button type="button" className="room-button" onClick={() => setRoom(null)}>Leave</button>
        </header>
        {presence.error && <div className="room-notice room-error" role="status">{presence.error}<button type="button" className="room-button" onClick={() => setRoom(null)}>Return to rooms</button></div>}
        {participants.length > 0 ? <ul className="room-participant-grid" aria-label="Room participants">
          {participants.map(participant => <DeskParticipant key={participant.id} participant={participant} self={participant.id === presence.participantId} now={now + presence.offset} />)}
        </ul> : <div className="room-placeholder room-placeholder--small"><StudyDesk /><p>{connected ? "No one at a desk yet." : "Waiting for a live connection…"}</p></div>}
        <div className="room-preferences">
          <label className="room-share"><input type="checkbox" checked={shareSubject} onChange={e => setShareSubject(e.target.checked)} /> Share my subject</label>
          <StudySelect value={environment} onChange={setEnvironment} options={ENVIRONMENTS} ariaLabel="Choose room scenery" />
          <AmbientSound />
        </div>
        <footer className="room-live-footer">Times are measured while studying in this room. Leaving does not stop your personal Focus timer.</footer>
      </section>
    </>}
    {zenOpen && room && !completion && <FocusZen anchor={zenAnchorRef.current} time={duration(timer)} status={status} animate={true} error={error} saving={timerDisabled || (status === "paused" && remainingSeconds <= 0)} onToggle={toggle} onClose={() => setZenOpen(false)} />}
    {completion && <FocusCompletion seconds={completion.seconds} onClose={() => setCompletion(null)} />}
  </div>;
}
