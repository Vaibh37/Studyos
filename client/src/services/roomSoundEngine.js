import { AMBIENT_SOUNDS, createAmbientSamples, normalizeRoomMixer } from "./roomAmbience.js";

const FILTERS = { rain: 2400, ocean: 1300, brown: 480, fan: 850 };

// One context + one master bus for all layers. Each source is created only
// when first enabled; muted layers can be faded back in without audio clicks.
// The conservative fixed headroom prevents summing four full-scale sources
// into clipping, without changing another layer's level when one is adjusted.
export function createRoomSoundEngine(context, samples = createAmbientSamples) {
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const tracks = new Map();
  let disposed = false;
  function sync(mixer) {
    if (disposed) return;
    const value = normalizeRoomMixer(mixer);
    const time = context.currentTime;
    master.gain.setTargetAtTime(value.volume / 100 * .30, time, .08);
    for (const { value: kind } of AMBIENT_SOUNDS) {
      const volume = value.layers[kind];
      let track = tracks.get(kind);
      if (volume && !track) {
        const data = samples(kind, context.sampleRate);
        const buffer = context.createBuffer(1, data.length, context.sampleRate);
        buffer.copyToChannel(data, 0);
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        filter.type = "lowpass";
        filter.frequency.value = FILTERS[kind];
        gain.gain.value = 0;
        source.connect(filter).connect(gain).connect(master);
        source.start();
        track = { source, filter, gain };
        tracks.set(kind, track);
      }
      if (track) track.gain.gain.setTargetAtTime(volume / 100 * .7, time, .07);
    }
  }
  async function start(mixer) {
    sync(mixer);
    await context.resume();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const { source, filter, gain } of tracks.values()) {
      try { source.stop(); } catch { /* Already stopped. */ }
      for (const node of [source, filter, gain]) try { node.disconnect(); } catch { /* Already disconnected. */ }
    }
    tracks.clear();
    try { master.disconnect(); } catch { /* Already disconnected. */ }
    if (context.state !== "closed") void context.close().catch(() => {});
  }
  return { start, sync, dispose };
}
