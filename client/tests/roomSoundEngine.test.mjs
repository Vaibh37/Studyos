import test from "node:test";
import assert from "node:assert/strict";
import { createRoomSoundEngine } from "../src/services/roomSoundEngine.js";
import { normalizeRoomMixer, soloLayers } from "../src/services/roomAmbience.js";

function fakeAudio() {
  const context = { currentTime: 1, sampleRate: 8000, state: "suspended", destination: {}, gains: [], sources: [], closed: 0, resumes: 0,
    async resume() { this.resumes++; this.state = "running"; },
    async close() { this.closed++; this.state = "closed"; },
    createGain() {
      const node = { gain: { value: 0, setTargetAtTime(v,t,c) { this.value = v; assert(c > 0); } }, connect(target) { return target; }, disconnect() {} };
      this.gains.push(node); return node;
    },
    createBiquadFilter() { return { frequency: { value: 0 }, connect(target) { return target; }, disconnect() {} }; },
    createBuffer(ch, length) { return { copyToChannel(data) { assert.equal(data.length, length); } }; },
    createBufferSource() {
      const source = { started: 0, stopped: 0, start() { this.started++; }, stop() { this.stopped++; }, connect(target) { return target; }, disconnect() {} };
      this.sources.push(source); return source;
    },
  };
  return context;
}
test("mixer starts only enabled layers, changes gains without restarting, and disposes every track", async () => {
  const ctx = fakeAudio(), kinds = [];
  const engine = createRoomSoundEngine(ctx, kind => { kinds.push(kind); return new Float32Array(100); });
  let mix = normalizeRoomMixer({ volume: 35, layers: soloLayers("rain") });
  assert.equal(ctx.sources.length, 0);
  await engine.start(mix);
  assert.equal(ctx.resumes, 1);
  assert.deepEqual(kinds, ["rain"]);
  assert.equal(ctx.gains[0].gain.value, .35 * .30);
  assert.equal(ctx.gains[1].gain.value, .7);
  mix = normalizeRoomMixer({ ...mix, layers: { ...mix.layers, ocean: 50 } });
  engine.sync(mix);
  assert.deepEqual(kinds, ["rain", "ocean"]);
  assert.equal(ctx.sources[0].started, 1);
  assert.equal(ctx.gains[1].gain.value, .7);
  assert.equal(ctx.gains[2].gain.value, .35);
  engine.sync({ ...mix, layers: soloLayers("ocean") });
  assert.equal(ctx.gains[1].gain.value, 0);
  engine.sync(mix);
  assert.equal(ctx.sources.length, 2);
  assert(ctx.sources.every(source => source.started === 1 && source.stopped === 0));
  engine.dispose(); engine.dispose();
  assert.equal(ctx.closed, 1);
  assert(ctx.sources.every(source => source.stopped === 1));
  engine.sync({ volume: 100, layers: soloLayers("fan") });
  assert.equal(ctx.sources.length, 2);
});
