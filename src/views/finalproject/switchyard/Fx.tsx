import type { CSSProperties } from "react";

/*
 * Big, short feedback: a stamp that slams in, confetti for a right answer, an orange flash for a
 * wrong one, and a matching sound. Each new id replays the animation.
 */
export type FxKind = "good" | "bad" | "win" | "fail";
export interface FxState { id: number; kind: FxKind; text: string }

const colors = ["#ffd23f", "#22b07d", "#ff7a45", "#2f5bd3", "#7c3aed", "#fffdf6"];

export function Fx({ fx, scope }: { fx: FxState | null; scope: "stage" | "screen" | "inline" }) {
  if (!fx) return null;
  const happy = fx.kind === "good" || fx.kind === "win";
  const pieces = happy ? (fx.kind === "win" ? 34 : 16) : 0;
  return <div key={fx.id} className={`sy-fx is-${fx.kind} is-${scope}`} aria-hidden="true">
    {!happy && <span className="sy-fx-flash" />}
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
export function playFx(kind: FxKind) {
  if (!soundOn() || typeof window === "undefined") return;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  try {
    audio ??= new Context();
    const ctx = audio;
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
