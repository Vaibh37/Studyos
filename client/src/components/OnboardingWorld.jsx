import { useEffect, useLayoutEffect, useRef } from "react";

const TAU = Math.PI * 2;
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const mix = (a, b, t) => a + (b - a) * t;
const rgb = (c, a = 1) => `rgba(${c.map(x => Math.round(x)).join(",")},${clamp(a)})`;
const palette = [[236, 180, 122], [124, 196, 233], [160, 234, 189]];
const smooth = t => t * t * (3 - 2 * t);
const cameras = [
  { yaw: -.28, pitch: .25, distance: 10.2 },
  { yaw: .12, pitch: .08, distance: 8.35 },
  { yaw: .31, pitch: .35, distance: 10.6 },
];

// The film set is rendered independently of React state updates. No picture,
// video, remote asset or WebGL context is required. A single moving camera
// projects the same world through all chapters.
export default function OnboardingWorld({ index, completed, total, elapsed, running, pointer }) {
  const canvas = useRef(null);
  const latest = useRef({ index, completed, total, elapsed, running, pointer });
  const redraw = useRef(null);
  useLayoutEffect(() => { latest.current = { index, completed, total, elapsed, running, pointer }; }, [index, completed, total, elapsed, running, pointer]);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const ctx = node.getContext("2d", { alpha: false });
    if (!ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1, height = 1, dpr = 1, frame = 0, last = 0, time = 0;
    let camera = { ...cameras[latest.current.index], yaw: cameras[latest.current.index].yaw - .23, pitch: .37, distance: cameras[latest.current.index].distance + 3.1 };
    let tone = [...palette[latest.current.index]];
    let phase = latest.current.index;
    let charge = 0;
    let flash = 0;
    let prevDone = latest.current.completed, prevFinish = latest.current.elapsed >= 5000;
    let prevIndex = latest.current.index;
    let burst = [];
    let px = 0, py = 0;
    let disposed = false;
    // Seeded particles hold their positions through camera cuts.
    const points = Array.from({ length: 105 }, (_, i) => {
      const seed = n => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
      return { x: (seed(1) - .5) * 24, y: seed(2) * 8 - 2, z: (seed(3) - .5) * 19, size: seed(4) * 1.7 + .4, twinkle: seed(5) * TAU };
    });

    function resize() {
      width = Math.max(1, node.clientWidth);
      height = Math.max(1, node.clientHeight);
      // This is atmospheric scenery, not the interface: oversampling it
      // only increases compositing cost. The notebook/text remain crisp DOM.
      dpr = Math.min(window.devicePixelRatio || 1, width < 760 ? 1 : .8, 1180 / width, 810 / height);
      node.width = Math.round(width * dpr);
      node.height = Math.round(height * dpr);
      draw(performance.now(), true);
    }
    function gradientLight(x, y, radius, color, opacity) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
      grad.addColorStop(0, rgb(color, opacity));
      grad.addColorStop(.3, rgb(color, opacity * .48));
      grad.addColorStop(1, rgb(color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    function poly(vertices, fill, stroke, lineWidth = 1) {
      if (vertices.some(v => !v)) return;
      ctx.beginPath();
      vertices.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
    }
    function trace(vertices, stroke, lineWidth = 1) {
      ctx.beginPath();
      let started = false;
      for (const v of vertices) {
        if (!v) { started = false; continue; }
        if (started) ctx.lineTo(v.x, v.y);
        else { ctx.moveTo(v.x, v.y); started = true; }
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    function spark() {
      if (motion.matches) return;
      burst = Array.from({ length: 64 }, (_, i) => {
        const a = i * 2.39996, speed = 100 + (i % 11) * 34;
        return { a, speed, age: 0, life: .65 + i % 8 * .09, size: .8 + i % 4 * .6 };
      });
    }
    function draw(stamp, immediate = false) {
      if (disposed) return;
      const s = latest.current;
      const reduced = motion.matches;
      const dt = reduced || immediate ? 0 : clamp((stamp - (last || stamp)) / 1000, 0, .045);
      last = stamp;
      time += dt;
      const target = cameras[s.index];
      const factor = reduced ? 1 : immediate ? 0 : 1 - Math.exp(-dt * 4.1);
      const focus = s.index === 1 ? s.elapsed / 5000 : s.index === 0 ? s.completed / s.total : (s.completed / s.total + s.elapsed / 5000) / 2;
      if (s.index !== prevIndex) { flash = .6; prevIndex = s.index; }
      if (s.completed > prevDone || (s.elapsed >= 5000 && !prevFinish)) { flash = 1; spark(); }
      prevDone = s.completed; prevFinish = s.elapsed >= 5000;
      flash = reduced ? 0 : Math.max(0, flash - dt * 1.8);
      phase = mix(phase, s.index, factor);
      charge = mix(charge, focus, factor);
      const success = s.index === 0 ? (s.completed / s.total) * .38 : s.index === 1 && s.elapsed >= 5000 ? .7 : 0;
      tone = tone.map((v, i) => mix(v, mix(palette[s.index][i], palette[2][i], success), factor));
      px = mix(px, reduced ? 0 : (s.pointer.current?.x || 0), factor);
      py = mix(py, reduced ? 0 : (s.pointer.current?.y || 0), factor);
      camera.yaw = mix(camera.yaw, target.yaw + px * .055, factor);
      camera.pitch = mix(camera.pitch, target.pitch + py * .028, factor);
      camera.distance = mix(camera.distance, target.distance - (s.running ? .7 : 0), factor);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const w = width, h = height, narrow = w < 760;
      const cx = w / 2, cy = h * (narrow ? .52 : .49), f = Math.min(w * .78, h * 1.16) * (narrow ? 1.26 : 1);
      const cos = Math.cos(camera.yaw), sin = Math.sin(camera.yaw);
      const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
      function project(x, y, z) {
        const rx = x * cos - z * sin, rz = x * sin + z * cos;
        const depth = rz * cp - y * sp + camera.distance;
        if (depth < .8) return null;
        const v = y * cp + rz * sp;
        return { x: cx + (rx * f / depth), y: cy - (v * f / depth), depth };
      }
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#05070a");
      bg.addColorStop(.51, "#10161b");
      bg.addColorStop(1, "#030506");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      gradientLight(cx + px * 70, h * .45, Math.max(w * .52, h * .6), tone, .12 + charge * .10 + flash * .11);
      gradientLight(w * .13, h * .22, w * .52, [56, 83, 112], .13);
      gradientLight(w * .86, h * .67, w * .53, [11, 81, 86], .14);
      // Directional light shafts, soft silhouettes, and a reflective ground.
      const light = ctx.createLinearGradient(w * .68, 0, w * .35, h * .83);
      light.addColorStop(0, rgb(tone, .13 + charge * .06));
      light.addColorStop(.38, rgb(tone, .045));
      light.addColorStop(1, rgb(tone, 0));
      poly([{ x: w * .82, y: 0 }, { x: w * .95, y: 0 }, { x: w * .62, y: h }, { x: w * .05, y: h }], light);
      const floorY = -2.5;
      for (let x = -22; x <= 22; x += 1.3) {
        trace([project(x, floorY, -9), project(x, floorY, 32)], rgb(tone, .048), .7);
      }
      for (let z = -8; z < 32; z += 1.3) {
        trace([project(-22, floorY, z), project(22, floorY, z)], rgb(tone, .042), .7);
      }

      const matteColors = Array.from({ length: 101 }, (_, i) => rgb(tone.map((v, j) => mix([11,17,24][j], v, i / 100))));
      const matte = strength => matteColors[Math.round(clamp(strength) * 100)];
      // The architectural folded ribbons are continuous surfaces rather than
      // flat SVG rings. Their cross sections are projected by the same camera.
      const ribbon = (side, depth, widthScale) => {
        const strips = [];
        const N = 76;
        const verts = (t, edge) => {
          const twist = t * Math.PI * 1.35 + side * .11 + phase * .55 + Math.sin(time * .17) * .10;
          const span = (1.22 + .53 * Math.sin(Math.PI * t)) * widthScale;
          const x = side * (4.8 + 2.0 * Math.sin(t * TAU + phase * .63)) + edge * span * Math.cos(twist);
          const y = -2.2 + 5.1 * smooth(t) + .88 * Math.sin(t * TAU + time * .13) + edge * span * Math.sin(twist);
          const z = (t - .5) * 15 + depth + Math.cos(t * TAU) * 1.45;
          return project(x, y, z);
        };
        for (let i = 0; i < N; i++) {
          const a = i / N, b = (i + 1) / N;
          const corners = [verts(a, -1), verts(a, 1), verts(b, 1), verts(b, -1)];
          if (corners.some(v => !v)) continue;
          const avg = corners.reduce((sum, v) => sum + v.depth, 0) / 4;
          const gleam = Math.pow(Math.max(0, Math.sin(a * 7.9 + time * .28 + side + phase * .7)), 4);
          const wave = Math.exp(-Math.pow((a - charge) * 8, 2)) * (s.running || charge > 0 ? .75 : 0);
          strips.push({ corners, avg, gleam, wave, a });
        }
        strips.sort((a,b) => b.avg - a.avg);
        strips.forEach(({ corners, gleam, wave, a }) => {
          const grad = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[1].x, corners[1].y);
          // The continuous opaque shading avoids strip-edge alpha buildup.
          // The surface behaves like dark anodized metal under a moving light.
          grad.addColorStop(0, matte(.25 + gleam * .24 + wave * .22));
          grad.addColorStop(.08, matte(.08 + gleam * .14 + wave * .16));
          grad.addColorStop(.37, matte(.025 + gleam * .04));
          grad.addColorStop(.65, matte(.055 + gleam * .09));
          grad.addColorStop(.91, matte(.18 + gleam * .18 + wave * .17));
          grad.addColorStop(1, matte(.43 + gleam * .27 + wave * .15));
          poly(corners, grad, grad, 1);
          if (a > .08 && a < .96) {
            trace([corners[0], corners[3]], rgb(tone, .18 + gleam * .42 + wave * .36), 1.15);
            trace([corners[1], corners[2]], rgb(tone, .12 + gleam * .23 + wave * .4), .85);
          }
        });
      };
      ribbon(-1, 1.6, .82);
      ribbon(1, .3, 1.18);
      // Fine light paths around the stage. The illuminated portion directly
      // follows the practice interaction, and advances with the real timer.
      for (let i = 0; i < 4; i++) {
        const coords = Array.from({ length: 91 }, (_, j) => {
          const u = j / 90;
          const a = u * TAU + i * .24 + time * .032;
          const r = 5.6 + i * .65;
          return project(Math.cos(a) * r, -.9 - i * .16 + Math.sin(a * 2 + phase) * .34, Math.sin(a) * r + 1.3);
        });
        trace(coords, rgb(tone, .075 + i * .012), 1);
        const from = Math.floor(time * 12 + i * 19) % 90;
        const n = 6 + Math.floor(charge * 30);
        const sweep = Array.from({ length: n }, (_, j) => coords[(from + j) % 90]);
        trace(sweep, rgb(tone, .34 + charge * .45), i === 0 ? 2 : .9);
      }
      for (const p of points) {
        const pos = project(p.x, p.y + .2 * Math.sin(time * .32 + p.twinkle), p.z);
        if (!pos || pos.x < 0 || pos.x > w || pos.y < 0 || pos.y > h) continue;
        const alpha = (.12 + .22 * Math.pow(Math.sin(time * .6 + p.twinkle), 2)) * (1 + charge * .45);
        ctx.fillStyle = rgb(tone, alpha);
        ctx.beginPath(); ctx.arc(pos.x, pos.y, p.size * clamp(10 / pos.depth, .5, 1.5), 0, TAU); ctx.fill();
      }

      // Stage action releases a short, naturally decelerating light burst;
      // ephemeral sparks never cover or intercept a real control.
      if (burst.length) {
        for (const p of burst) {
          p.age += dt;
          if (p.age >= p.life) continue;
          const u = p.age / p.life, r = (1 - Math.exp(-u * 2.7)) * p.speed * (narrow ? .63 : 1);
          const x = cx + Math.cos(p.a) * (r + 100), y = cy + Math.sin(p.a) * (r + 54) + u * u * 45;
          ctx.globalAlpha = Math.sin(Math.PI * u) * .86;
          ctx.fillStyle = rgb(tone); ctx.beginPath(); ctx.arc(x, y, p.size * (1 - u * .6), 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
        burst = burst.filter(p => p.age < p.life);
      }
      // Central negative space keeps the actual notebook and timer legible.
      const vignette = ctx.createRadialGradient(cx, cy, Math.min(w,h) * .16, cx, cy, Math.max(w,h) * .63);
      vignette.addColorStop(0, "rgba(4,6,8,0)");
      vignette.addColorStop(.64, "rgba(4,6,8,.04)");
      vignette.addColorStop(1, "rgba(1,2,3,.87)");
      ctx.fillStyle = vignette; ctx.fillRect(0,0,w,h);
      const bottom = ctx.createLinearGradient(0,h*.68,0,h);
      bottom.addColorStop(0,"transparent"); bottom.addColorStop(1,"#040608eF");
      ctx.fillStyle=bottom; ctx.fillRect(0,0,w,h);
      if (!immediate && !reduced && !document.hidden) frame=requestAnimationFrame(draw);
    }
    function restart() {
      cancelAnimationFrame(frame);
      frame = 0;
      last=0;
      if (document.hidden) return;
      if (motion.matches) draw(performance.now(), true);
      else frame = requestAnimationFrame(draw);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    redraw.current = () => { if (motion.matches && !document.hidden) draw(performance.now(), true); };
    document.addEventListener("visibilitychange", restart);
    motion.addEventListener("change", restart);
    resize();
    restart();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener("visibilitychange", restart);
      motion.removeEventListener("change", restart); redraw.current = null;
    };
  }, []);
  useEffect(() => { redraw.current?.(); }, [index, completed, total, elapsed, running]);

  return <canvas className="journey-world" ref={canvas} aria-hidden="true" />;
}
