import { memo, useEffect, useRef, useState } from "react";
import { weatherParticles } from "../services/roomScenery";
import "./RoomAtmosphere.css";

const particlesByScene = Object.fromEntries(["rain", "snow", "stargaze"].map(scene => [scene, weatherParticles(scene)]));

function SceneLayer({ scene, phase, className = "" }) {
  return <div className={`atmosphere-layer ${className}`} data-scene={scene} data-phase={phase}>
    <div className="atmosphere-image" />
    <div className="atmosphere-light" />
    {(scene === "cloud" || scene === "ronin") && <div className="atmosphere-weather atmosphere-mist"><i/><i/></div>}
    {particlesByScene[scene] && <div className={`atmosphere-weather atmosphere-${scene}`}>
      {particlesByScene[scene].map((p, i) => <i key={i} style={{ "--x": p.x + "%", "--y": p.y + "%", "--size": p.size + "px", "--duration": p.duration + "s", "--delay": p.delay + "s", "--alpha": p.opacity, "--sway": p.sway + "px" }} />)}
    </div>}
    <div className="atmosphere-shade" />
  </div>;
}

// Independent from the room clock, roster and timer renders. Animations are
// CSS-composited, paused when hidden/offscreen and honor reduced motion.
export default memo(function RoomAtmosphere({ scene, phase, active = true, variant = "header" }) {
  const targetKey = scene + ":" + phase;
  const [transition, setTransition] = useState(() => ({ key: targetKey, current: { scene, phase }, previous: null }));
  const stage = useRef(null);
  const [visible, setVisible] = useState(true);
  const [foreground, setForeground] = useState(() => !document.hidden);
  useEffect(() => {
    const changed = () => setForeground(!document.hidden);
    document.addEventListener("visibilitychange", changed);
    let observer;
    if ("IntersectionObserver" in window && stage.current) {
      observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
      observer.observe(stage.current);
    }
    return () => { document.removeEventListener("visibilitychange", changed); observer?.disconnect(); };
  }, []);
  useEffect(() => {
    setTransition(old => old.key === targetKey ? old : {
      key: targetKey, current: { scene, phase },
      previous: variant === "header" && (scene === "none" || old.current.scene === "none") ? null : old.current,
    });
  }, [scene, phase, targetKey, variant]);
  useEffect(() => {
    if (!transition.previous) return;
    const timer = setTimeout(() => setTransition(old => ({ ...old, previous: null })), 1150);
    return () => clearTimeout(timer);
  }, [transition.key, transition.previous]);

  return <div ref={stage} className={`room-atmosphere room-atmosphere--${variant}`} aria-hidden="true" data-active={active && visible && foreground} data-scene={scene} data-phase={phase}>
    {transition.previous && <SceneLayer key={transition.previous.scene + ":" + transition.previous.phase} {...transition.previous} className="is-leaving" />}
    <SceneLayer key={transition.key} {...transition.current} className={transition.previous ? "is-entering" : ""} />
  </div>;
});
