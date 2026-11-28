import test from "node:test";
import assert from "node:assert/strict";
import { resolveRoomScene, weatherParticles } from "../src/services/roomScenery.js";

test("automatic atmosphere follows local clock boundaries, and fixed scenery never changes", () => {
  const at = (h, m = 0) => new Date(2026, 10, 28, h, m);
  for (const [hour, minute, expected] of [[0,0,"night"], [4,59,"night"], [5,0,"dawn"], [7,59,"dawn"], [8,0,"day"], [16,59,"day"], [17,0,"dusk"], [19,59,"dusk"], [20,0,"night"], [23,59,"night"]]) {
    const result = resolveRoomScene("auto", at(hour, minute));
    assert.equal(result.phase, expected);
    assert.equal(result.scene, expected === "night" ? "stargaze" : "cloud");
    assert.deepEqual(resolveRoomScene("snow", at(hour, minute)), { scene: "snow", phase: "fixed", label: "Snowfall" });
  }
  assert.equal(resolveRoomScene("invalid").scene, "none");
});
test("particles are deterministic, bounded and unique by environment", () => {
  for (const scene of ["rain", "snow", "stargaze"]) {
    const particles = weatherParticles(scene);
    assert(particles.length > 0 && particles.length <= 36);
    assert.deepEqual(particles, weatherParticles(scene));
    assert(particles.every(p => p.x >= 0 && p.x <= 100 && p.delay <= 0 && p.delay >= -p.duration && p.opacity > 0 && p.opacity < 1));
  }
  assert.deepEqual(weatherParticles("none"), []);
});
