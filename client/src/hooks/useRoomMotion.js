import { useEffect, useState } from "react";
import { readRoomMotion, roomMotionEnabled, writeRoomMotion } from "../services/roomScenery";

export function useRoomMotion(uid) {
  const [preference, setPreference] = useState(() => ({ uid, value: readRoomMotion(localStorage, uid) }));
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReduced(query.matches);
    changed();
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    setPreference({ uid, value: readRoomMotion(localStorage, uid) });
  }, [uid]);
  const enabled = roomMotionEnabled(preference.uid === uid ? preference.value : "system", reduced);
  function toggle() {
    const value = enabled ? "off" : "on";
    writeRoomMotion(localStorage, uid, value);
    setPreference({ uid, value });
  }
  return { enabled, toggle };
}
