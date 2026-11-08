import { context } from "../switchyard/Fx";

// Workshop sounds, synthesised so there is nothing to download. They follow the Switchyard sound switch.
type Tone = { f: number; to?: number; at?: number; len: number; type?: OscillatorType; gain?: number };
function tones(list: Tone[]) {
  const ctx = context();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (const t of list) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = t.type ?? "square";
      const start = now + (t.at ?? 0);
      o.frequency.setValueAtTime(t.f, start);
      if (t.to) o.frequency.exponentialRampToValueAtTime(t.to, start + t.len);
      g.gain.setValueAtTime(t.gain ?? 0.05, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + t.len);
      o.connect(g).connect(ctx.destination);
      o.start(start); o.stop(start + t.len + 0.02);
    }
  } catch { /* Sound is a bonus. */ }
}
function noise(len: number, freq: number, gain = 0.08, at = 0) {
  const ctx = context();
  if (!ctx) return;
  try {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buffer; filter.type = "bandpass"; filter.frequency.value = freq; g.gain.value = gain;
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(ctx.currentTime + at);
  } catch { /* Sound is a bonus. */ }
}

let lastTick = 0;
export const sfx = {
  tick() { const now = performance.now(); if (now - lastTick < 45) return; lastTick = now; tones([{ f: 2400 + Math.random() * 600, len: 0.025, type: "square", gain: 0.03 }]); },
  pop() { tones([{ f: 500, to: 1400, len: 0.09, type: "triangle", gain: 0.09 }]); noise(0.05, 3000, 0.05); },
  slip() { noise(0.18, 5200, 0.09); tones([{ f: 200, to: 120, len: 0.15, type: "sawtooth", gain: 0.03 }]); },
  whoosh() { noise(0.45, 900, 0.12); },
  wipe() { noise(0.12, 1800, 0.035); },
  snap() { tones([{ f: 900, len: 0.03, type: "square", gain: 0.07 }, { f: 1500, at: 0.04, len: 0.05, type: "triangle", gain: 0.06 }]); },
  zap() { noise(0.25, 4200, 0.14); tones([{ f: 90, to: 60, len: 0.25, type: "sawtooth", gain: 0.07 }]); },
  coin() { tones([{ f: 1975, len: 0.08, type: "square", gain: 0.04 }, { f: 2637, at: 0.07, len: 0.18, type: "square", gain: 0.04 }]); },
  angry() { tones([{ f: 220, to: 150, len: 0.3, type: "sawtooth", gain: 0.05 }, { f: 180, at: 0.25, to: 110, len: 0.35, type: "sawtooth", gain: 0.05 }]); },
  power() { tones([{ f: 80, to: 900, len: 0.9, type: "sawtooth", gain: 0.05 }, { f: 523, at: 0.9, len: 0.12 }, { f: 659, at: 1.0, len: 0.12 }, { f: 784, at: 1.1, len: 0.12 }, { f: 1047, at: 1.2, len: 0.4 }]); },
  cash() { tones([{ f: 1318, len: 0.1, type: "triangle", gain: 0.08 }, { f: 1760, at: 0.09, len: 0.4, type: "triangle", gain: 0.08 }]); noise(0.12, 2500, 0.05, 0.05); },
  flash() { tones(Array.from({ length: 8 }, (_, i) => ({ f: 600 + i * 120, at: i * 0.07, len: 0.06, type: "square" as OscillatorType, gain: 0.035 }))); },
  wrong() { tones([{ f: 160, len: 0.22, type: "square", gain: 0.05 }, { f: 120, at: 0.18, len: 0.3, type: "square", gain: 0.05 }]); },
  thud() { noise(0.14, 320, 0.2); tones([{ f: 130, to: 60, len: 0.14, type: "sine", gain: 0.14 }]); },
  crack() { noise(0.3, 6000, 0.16); tones([{ f: 700, to: 90, len: 0.25, type: "sawtooth", gain: 0.05 }]); },
  creak() { tones([{ f: 300, to: 520, len: 0.35, type: "triangle", gain: 0.04 }]); },
  good() { tones([{ f: 660, len: 0.1, type: "triangle", gain: 0.07 }, { f: 990, at: 0.09, len: 0.18, type: "triangle", gain: 0.07 }]); },
};
