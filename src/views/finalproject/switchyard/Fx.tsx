import type { CSSProperties } from "react";

/*
 * Big, short feedback: a stamp that slams in, confetti for a right answer, an orange flash for a
 * wrong one, and a matching sound. Each new id replays the animation.
 */
export type FxKind = "good" | "bad" | "win" | "fail";
export interface FxState { id: number; kind: FxKind; text: string }

const colors = ["#ffd23f", "#22b07d", "#ff7a45", "#2f5bd3", "#7c3aed", "#fffdf6"];

// The Blaster line's extra confetti: fish, paws, sparks.
const emojis = ["🐟", "🐾", "⭐", "💥", "😼", "⚡"];
const angry = ["💢", "🙀", "⚡"];

/** mega: the Super Mega Blaster Plus Advanced version, with a burst of rays, lightning and emoji rain. */
export function Fx({ fx, scope, mega = false }: { fx: FxState | null; scope: "stage" | "screen" | "inline"; mega?: boolean }) {
  if (!fx) return null;
  const happy = fx.kind === "good" || fx.kind === "win";
  const pieces = happy ? (fx.kind === "win" ? mega ? 56 : 34 : mega ? 24 : 16) : 0;
  const extra = mega ? happy ? fx.kind === "win" ? 22 : 9 : 8 : 0;
  return <div key={fx.id} className={`sy-fx is-${fx.kind} is-${scope} ${mega ? "is-mega" : ""}`} aria-hidden="true">
    {!happy && <span className="sy-fx-flash" />}
    {mega && (happy ? <span className="sy-fx-rays" /> : <span className="sy-fx-bolt" />)}
    {Array.from({ length: extra }, (_, i) => {
      const angle = (i / extra) * Math.PI * 2 + .4;
      const reach = (fx.kind === "win" ? 300 : 150) + (i % 4) * 34;
      return <u key={`e${i}`} className="sy-fx-emoji" style={{ "--x": `${Math.cos(angle) * reach}px`, "--y": `${Math.sin(angle) * reach - 60}px`, "--r": `${(i * 71) % 360 - 180}deg`, "--d": `${(i % 5) * 45}ms` } as CSSProperties}>{(happy ? emojis : angry)[i % (happy ? emojis : angry).length]}</u>;
    })}
    {Array.from({ length: pieces }, (_, i) => {
      const angle = (i / pieces) * Math.PI * 2 + (i % 3) * .3;
      const reach = (fx.kind === "win" ? 220 : 120) + (i % 5) * 26;
      return <i key={i} style={{ "--x": `${Math.cos(angle) * reach}px`, "--y": `${Math.sin(angle) * reach - 40}px`, "--r": `${(i * 47) % 360}deg`, "--c": colors[i % colors.length], "--d": `${(i % 4) * 30}ms` } as CSSProperties} />;
    })}
    {fx.text && <b className="sy-fx-stamp">{fx.text}</b>}
  </div>;
}

// Sound: two rising notes for right, a low buzz for wrong, a fanfare when every test passes.
const soundKey = "sharpie.switchyard.sound";
export function soundOn(): boolean {
  try { return localStorage.getItem(soundKey) !== "off"; } catch { return true; }
}
export function setSoundOn(on: boolean) {
  try { localStorage.setItem(soundKey, on ? "on" : "off"); } catch { /* Sound still follows the toggle for this visit. */ }
}

let audio: AudioContext | null = null;
export function context(): AudioContext | null {
  if (!soundOn() || typeof window === "undefined") return null;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  try { audio ??= new Context(); return audio; } catch { return null; }
}

/** A synth meow from MEGA CAT BRIAN: up, then a long slide down. at delays it in seconds. */
export function playMeow(at = 0, pitch = 1) {
  const ctx = context();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + at;
    for (const [type, mult, level] of [["triangle", 1, .1], ["sine", 2, .035]] as [OscillatorType, number, number][]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(480 * pitch * mult, start);
      osc.frequency.exponentialRampToValueAtTime(900 * pitch * mult, start + .12);
      osc.frequency.exponentialRampToValueAtTime(380 * pitch * mult, start + .55);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(level, start + .05);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + .65);
    }
  } catch { /* No sound on this device. */ }
}

/** An angry cat hiss: filtered noise. */
export function playHiss() {
  const ctx = context();
  if (!ctx) return;
  try {
    const length = Math.floor(ctx.sampleRate * .45);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    noise.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 3200;
    gain.gain.value = .08;
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
  } catch { /* No sound on this device. */ }
}

/** The overload alarm before the Blaster line: three wailing sweeps. */
export function playSiren() {
  const ctx = context();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime;
    osc.type = "square";
    for (let i = 0; i < 3; i += 1) {
      osc.frequency.setValueAtTime(440, start + i * .5);
      osc.frequency.linearRampToValueAtTime(880, start + i * .5 + .25);
      osc.frequency.linearRampToValueAtTime(440, start + i * .5 + .5);
    }
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.035, start + .05);
    gain.gain.setValueAtTime(.035, start + 1.4);
    gain.gain.exponentialRampToValueAtTime(.0001, start + 1.55);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 1.6);
  } catch { /* No sound on this device. */ }
}

/** The Blaster line's sounds: the normal ones, plus a meow on wins and a hiss on misses. */
export function playMega(kind: FxKind) {
  playFx(kind);
  if (kind === "win") { playMeow(.5); playMeow(.95, 1.3); }
  else if (kind === "good") playMeow(.08, 1.2);
  else playHiss();
}

export function playFx(kind: FxKind) {
  const ctx = context();
  if (!ctx) return;
  try {
    const notes: [number, number, OscillatorType][] = kind === "good" ? [[660, 0, "triangle"], [990, .09, "triangle"]]
      : kind === "win" ? [[523, 0, "triangle"], [659, .11, "triangle"], [784, .22, "triangle"], [1047, .34, "triangle"]]
        : kind === "bad" ? [[160, 0, "sawtooth"], [120, .12, "sawtooth"]]
          : [[220, 0, "sawtooth"], [175, .16, "sawtooth"], [130, .32, "sawtooth"]];
    for (const [freq, at, type] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const start = ctx.currentTime + at;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(type === "sawtooth" ? .05 : .09, start + .02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "win" && at > .3 ? .5 : .22));
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + .6);
    }
  } catch { /* No sound on this device. */ }
}
