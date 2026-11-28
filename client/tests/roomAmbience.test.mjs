import assert from "node:assert/strict";
import test from "node:test";
import { AMBIENT_SOUNDS, createAmbientSamples, readRoomSound, writeRoomSound, readRoomScenery, writeRoomScenery, readRoomSelection, writeRoomSelection } from "../src/services/roomAmbience.js";
const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
};
test("room ambience remembers audio and per-room scenery without sharing account preferences", () => {
  const storage = memory();
  assert.deepEqual(readRoomSound(storage, "a"), { kind:"rain", volume:35 });
  writeRoomSound(storage,"a",{kind:"ocean",volume:60});
  assert.deepEqual(readRoomSound(storage,"a"),{kind:"ocean",volume:60});
  assert.deepEqual(readRoomSound(storage,"b"),{kind:"rain",volume:35});
  writeRoomScenery(storage,"a","public:quiet","rain");
  assert.equal(readRoomScenery(storage,"a","public:quiet","none",["none","rain"]),"rain");
  assert.equal(readRoomScenery(storage,"a","public:cloud","cloud",["cloud","rain"]),"cloud");
  assert.equal(readRoomScenery(storage,"b","public:quiet","none",["none","rain"]),"none");
  writeRoomSound(storage,"a",{kind:"unknown",volume:900});
  assert.deepEqual(readRoomSound(storage,"a"),{kind:"rain",volume:35});
});
test("four distinct ambient loops are finite, bounded, seamless and non-silent", () => {
  const sampleRate = 8000;
  const outputs = [];
  for (const {value} of AMBIENT_SOUNDS) {
    let state = 12345678;
    const random = () => { state = (Math.imul(state,1664525)+1013904223) >>> 0; return state / 4294967296; };
    const samples = createAmbientSamples(value,sampleRate,random);
    assert.equal(samples.length,sampleRate*(value==="ocean"?12:8));
    assert(samples.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));
    assert(samples.some(x=>Math.abs(x)>.005));
    assert(Math.abs(samples[0]-samples.at(-1))<.5);
    outputs.push(samples.slice(100,150).join(","));
  }
  assert.equal(new Set(outputs).size,4);
});

test("last room can restore only within the same account and tab; explicit leave clears it", () => {
  const tab = memory(), otherTab = memory();
  writeRoomSelection(tab,"alice","public:quiet");
  assert.equal(readRoomSelection(tab,"alice"),"public:quiet");
  assert.equal(readRoomSelection(tab,"bob"),null);
  assert.equal(readRoomSelection(otherTab,"alice"),null);
  writeRoomSelection(tab,"alice",null);
  assert.equal(readRoomSelection(tab,"alice"),null);
  writeRoomSelection(tab,"alice","unknown-room");
  assert.equal(readRoomSelection(tab,"alice"),null);
});

test("V6 mixer upgrades legacy solo choices, bounds volumes and isolates local preferences", async () => {
  const { readRoomMixer, writeRoomMixer, normalizeRoomMixer, canPlayRoomMixer, soloLayers } = await import("../src/services/roomAmbience.js");
  const storage = memory();
  writeRoomSound(storage, "alice", { kind: "ocean", volume: 42 });
  assert.deepEqual(readRoomMixer(storage, "alice"), { kind: "ocean", volume: 42, layers: soloLayers("ocean") });
  const mixed = normalizeRoomMixer({ layers: { rain: 150, ocean: 40.7, brown: -5, fan: "70", unknown: 5 }, volume: 120 });
  assert.deepEqual(mixed, { kind: "mix", layers: { rain: 100, ocean: 41, brown: 0, fan: 0 }, volume: 100 });
  writeRoomMixer(storage, "alice", mixed);
  assert.deepEqual(readRoomMixer(storage, "alice"), mixed);
  assert.deepEqual(readRoomMixer(storage, "bob"), { kind: "rain", volume: 35, layers: soloLayers("rain") });
  assert(!canPlayRoomMixer(normalizeRoomMixer({ volume: 35, layers: {} })));
  assert(canPlayRoomMixer(mixed));
});
