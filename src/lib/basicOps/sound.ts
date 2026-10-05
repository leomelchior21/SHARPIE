type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
let enabled = true;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const ctor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
  if (!ctor) return null;
  if (!context) context = new ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(frequency: number, duration: number, when: number, type: OscillatorType, gain: number, endFrequency?: number) {
  const audio = audioContext();
  if (!audio) return;
  const start = audio.currentTime + when;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), start + duration);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume);
  volume.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const basicOpsSound = {
  setEnabled: (value: boolean) => {
    enabled = value;
  },
  isEnabled: () => enabled,
  unlock: () => {
    audioContext();
  },
  correct: () => {
    if (!enabled) return;
    tone(660, 0.09, 0, "sine", 0.045, 880);
    tone(990, 0.12, 0.07, "sine", 0.03, 1320);
  },
  wrong: () => {
    if (!enabled) return;
    tone(220, 0.16, 0, "triangle", 0.03, 150);
  },
  win: () => {
    if (!enabled) return;
    tone(523, 0.1, 0, "sine", 0.045);
    tone(659, 0.1, 0.09, "sine", 0.045);
    tone(784, 0.16, 0.18, "sine", 0.045, 1046);
  },
  combo: (level: number) => {
    if (!enabled) return;
    const base = 520 + Math.min(Math.max(level, 1), 5) * 90;
    tone(base, 0.08, 0, "square", 0.018, base * 1.25);
  },
  expire: () => {
    if (!enabled) return;
    tone(420, 0.12, 0, "triangle", 0.026, 260);
    tone(260, 0.14, 0.1, "triangle", 0.02, 180);
  },
  click: () => {
    if (!enabled) return;
    tone(1180, 0.035, 0, "sine", 0.02);
  },
};
