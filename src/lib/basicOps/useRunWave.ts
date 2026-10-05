import { useCallback, useMemo, useRef } from "react";

type RunTone = "run" | "good" | "bad";

function spawnWave(x: number, y: number, tone: RunTone) {
  if (typeof document === "undefined") return;
  const wave = document.createElement("span");
  wave.className = `bo-run-wave is-${tone}`;
  wave.style.left = `${x}px`;
  wave.style.top = `${y}px`;
  document.body.appendChild(wave);
  window.setTimeout(() => wave.remove(), 900);
}

export function useRunWave() {
  const origin = useRef<{ x: number; y: number } | null>(null);

  const fire = useCallback((event?: { clientX?: number; clientY?: number }) => {
    const x = event?.clientX ?? (typeof window === "undefined" ? 0 : window.innerWidth / 2);
    const y = event?.clientY ?? (typeof window === "undefined" ? 0 : window.innerHeight / 2);
    origin.current = { x, y };
    spawnWave(x, y, "run");
  }, []);

  const resolve = useCallback((tone: "good" | "bad") => {
    if (!origin.current) return;
    spawnWave(origin.current.x, origin.current.y, tone);
    origin.current = null;
  }, []);

  return useMemo(() => ({ fire, resolve }), [fire, resolve]);
}
