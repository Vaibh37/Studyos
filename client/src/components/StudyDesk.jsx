import { normalizeDesk, DESK_CHOICES } from "../services/studyDesk";
import { useState } from "react";
import StudySelect from "./StudySelect";
import { CheckCircle2, LockKeyhole as Lock, X } from "./icons";

// The original StudyOS silhouette remains the default. Small vector parts
// keep each custom desk readable at mobile scale without image downloads.
export function StudyDesk({ status = "idle", appearance }) {
  const { character, lamp, activity, accessory } = normalizeDesk(appearance);
  const active = status === "running", paused = status === "paused";
  const extended = accessory === "plant" || accessory === "bonsai";
  return <svg className={`room-desk room-desk--${status}`} data-character={character} data-lamp={lamp} data-activity={activity} data-accessory={accessory} viewBox="0 0 100 84" fill="none" aria-hidden="true">
    <path d={extended ? "M12 74H98" : "M12 74H89"} stroke="currentColor" strokeOpacity=".25" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="28" y="44" width={extended ? 69 : 57} height="5" rx="1.6" fill="currentColor" />
    <path d={extended ? "M32 49V73M93 49V73" : "M32 49V73M81 49V73"} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M16 36V62H35M20 62V73M33 62V73" stroke="currentColor" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {lamp === "angle" ? <><path d="M67 43V29L76 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><path d="M72 14L82 15L84 25L70 25Z" fill="currentColor" opacity=".8" /></> : lamp === "round" ? <><path d="M76 43V26" stroke="currentColor" strokeWidth="2.5" /><path d="M65 26A11 11 0 0 1 87 26Z" fill="currentColor" opacity=".8" /></> : <><path d="M76 43V31M70 31H82L85 19H67Z" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" /><rect x="71" y="21" width="10" height="7" rx="2" fill="currentColor" opacity=".65" /></>}
    {active && <path className="room-desk-light" d="M70 26L59 43H91L84 26Z" fill="currentColor" opacity=".10" />}
    {accessory === "books" && <path d="M58 62H75V58H56V54H73" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity=".55" />}
    {accessory === "plant" && <><path d="M86 37H94L92 44H88Z" fill="currentColor" opacity=".75"/><path d="M90 36V28M90 33Q83 33 84 26Q91 26 90 33M90 31Q96 30 96 24Q90 24 90 31" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>}
    {accessory === "bonsai" && <><rect x="84" y="39" width="13" height="5" rx="1.5" fill="currentColor" opacity=".8"/><path d="M91 39Q88 34 92 29M90 33L85 29" stroke="currentColor" strokeWidth="2"/><ellipse cx="86" cy="27" rx="5" ry="3" fill="currentColor" opacity=".7"/><ellipse cx="94" cy="25" rx="6" ry="4" fill="currentColor" opacity=".85"/></>}
    {active ? <>
      {character === "long" && <path d="M20 20Q16 35 22 42L29 38L36 40Q40 32 36 20Z" fill="currentColor" opacity=".7"/>}
      <circle cx="28" cy="24" r="9" fill="currentColor" />
      {character === "short" && <path d="M19 21L21 13L25 17L29 12L33 17L37 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
      <path d="M20 36Q29 30 37 39L41 46" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 41L26 57L43 58L48 72" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      {activity === "typing" ? <>
        <path d="M48 43H64L68 30H54L51 40" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path className="room-desk-typing" d="M40 46L49 42" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M56 34L64 34" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
      </> : <>
        <path d="M52 43L45 37L53 36L59 41L65 37L69 38L66 43Z" fill="currentColor" opacity=".65" />
        <path className={activity === "reading" ? "room-desk-reading" : "room-desk-writing"} d="M40 46L51 42" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        {activity === "reading" ? <path className="room-desk-page-turn" d="M59 42Q53 36 54 31Q61 33 63 39Z" fill="currentColor" opacity=".85" /> : <path className="room-desk-page" d="M47 39L54 41L56 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
      </>}
    </> : paused ? <>
      <rect x="40" y="31" width="12" height="11" rx="2" fill="currentColor" opacity=".85" />
      <path d="M52 34H55Q58 37 55 39H52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path className="room-desk-steam" d="M43 28Q40 24 44 21M49 28Q46 24 50 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </> : <path d="M41 41H53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
  </svg>;
}

const labels = { character: "Character", lamp: "Desk lamp", activity: "Study activity", accessory: "Desk accessory" };
export function DeskStudio({ appearance, progress, onSave, onClose }) {
  const [draft, setDraft] = useState(() => normalizeDesk(appearance, progress));
  const [preview, setPreview] = useState("running");
  const safeDraft = normalizeDesk(draft, progress);
  return <section className="room-desk-studio" aria-label="Customize your desk">
    <header><div><h2>Customize your desk</h2><p>A little workspace of your own.</p></div><button type="button" className="room-button" onClick={onClose} aria-label="Close desk customization"><X size={17} /></button></header>
    <div className="desk-studio-main">
      <div className="desk-studio-preview">
        <StudyDesk status={preview} appearance={safeDraft} />
        <div className="desk-preview-tabs" aria-label="Preview desk state">{[["running", "Study"], ["paused", "Break"], ["idle", "Away"]].map(([value, label]) => <button key={value} type="button" aria-pressed={preview === value} onClick={() => setPreview(value)}>{label}</button>)}</div>
      </div>
      <div className="desk-studio-controls">
        {Object.entries(DESK_CHOICES).map(([key, options]) => <div key={key} className="desk-studio-field"><span>{labels[key]}</span><StudySelect value={safeDraft[key]} ariaLabel={labels[key]} onChange={value => setDraft(old => ({ ...old, [key]: value }))} options={options.map(option => ({ ...option, disabled: Boolean(option.unlock && option.unlock > progress), label: option.unlock && option.unlock > progress ? `${option.label} · Locked` : option.label }))} /></div>)}
        <label className="desk-studio-opt"><input type="checkbox" checked={draft.encouragement} onChange={event => setDraft(old => ({ ...old, encouragement: event.target.checked }))} /> Share session milestones and receive silent encouragement</label>
      </div>
    </div>
    <div className="desk-studio-unlocks">
      {[["Plant", 3], ["Bonsai", 10]].map(([label, threshold]) => <div key={label}><span>{progress >= threshold ? <CheckCircle2 size={16} /> : <Lock size={16} />} {label}</span><progress max={threshold} value={Math.min(progress, threshold)} aria-label={label + " unlock progress"} /><small>{Math.min(progress, threshold)} / {threshold}</small></div>)}
      <p>Unlock accessories with saved, verified Focus sessions of at least 20 minutes. Your progress count is private.</p>
    </div>
    <footer><small>Saved on this device and visible to people in your room.</small><button type="button" className="room-button" onClick={onClose}>Cancel</button><button type="button" className="room-button room-primary" onClick={() => onSave(safeDraft)}>Save desk</button></footer>
  </section>;
}
