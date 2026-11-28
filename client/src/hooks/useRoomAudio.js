import { useEffect, useRef, useState } from "react";
import { AMBIENT_SOUNDS, readRoomMixer, writeRoomMixer, normalizeRoomMixer, soloLayers, canPlayRoomMixer } from "../services/roomAmbience";
import { createRoomSoundEngine } from "../services/roomSoundEngine";

export function useRoomAudio(uid) {
  const [preference, setPreference] = useState(() => readRoomMixer(localStorage, uid));
  const latest = useRef(preference);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const engine = useRef(null);
  const stop = () => {
    const current = engine.current;
    engine.current = null;
    current?.dispose();
  };
  const mute = () => {
    stop();
    setPlaying(false);
  };
  useEffect(() => {
    mute();
    setError("");
    const value = readRoomMixer(localStorage, uid);
    latest.current = value;
    setPreference(value);
    return stop;
  }, [uid]);

  function update(value) {
    const next = normalizeRoomMixer(value);
    latest.current = next;
    setPreference(next);
    writeRoomMixer(localStorage, uid, next);
    if (!engine.current) return;
    try { engine.current.sync(next); setError(""); }
    catch { mute(); setError("Ambient sound is unavailable."); }
  }

  async function play() {
    if (!canPlayRoomMixer(latest.current) || engine.current) return;
    let current, context;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw Error("Audio unsupported");
      context = new Audio();
      current = createRoomSoundEngine(context);
      engine.current = current;
      // Use the user's gesture, not an effect, to start or resume audio.
      await current.start(latest.current);
      if (engine.current !== current) return;
      setPlaying(true);
      setError("");
    } catch {
      if (!current || engine.current === current) {
        mute();
        if (!current && context?.state !== "closed") void context?.close().catch(() => {});
        setError("Ambient sound is unavailable.");
      }
    }
  }

  function toggle() {
    if (engine.current) mute();
    else void play();
  }

  function changeKind(kind) {
    if (!AMBIENT_SOUNDS.some(sound => sound.value === kind)) return;
    update({ ...latest.current, layers: soloLayers(kind) });
  }
  function changeVolume(volume) { update({ ...latest.current, volume }); }
  function changeLayer(kind, volume) {
    if (!AMBIENT_SOUNDS.some(sound => sound.value === kind)) return;
    update({ ...latest.current, layers: { ...latest.current.layers, [kind]: volume } });
  }
  const canPlay = canPlayRoomMixer(preference);
  return { ...preference, canPlay, playing, error, toggle, mute, changeKind, changeVolume, changeLayer };
}
