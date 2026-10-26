import { finalBosses } from "../../data/finalBosses";
import { percent } from "./progress";
import type { ModuleKey } from "./progress";

export function stateOf(share: number) {
  return share >= 1 ? "is-done" : share > 0 ? "is-progress" : "";
}

export function ProgressRing({ share, size = 38, label }: { share: number; size?: number; label?: string }) {
  const large = size > 50;
  const stroke = large ? 5 : 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.min(Math.max(share, 0), 1);
  return (
    <span className={`tdb-ring ${stateOf(value)} ${large ? "is-large" : ""}`} style={{ width: size, height: size }} role="img" aria-label={label ?? `${percent(value)} complete`}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="tdb-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="tdb-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value)}
        />
      </svg>
      <b>{Math.round(value * 100)}</b>
    </span>
  );
}

/** A bar split into the module's steps, each filled by its own share. */
export function StepBar({ parts, module, titles }: { parts: number[]; module: ModuleKey; titles: string[] }) {
  return (
    <span className={`tdb-steps tdb-${module}`}>
      {parts.map((part, index) => (
        <i key={titles[index]} className={stateOf(part)} title={`${titles[index]}: ${percent(part)}`}>
          <b style={{ width: `${Math.min(part, 1) * 100}%` }} />
        </i>
      ))}
    </span>
  );
}

export function ModuleBar({ share, module }: { share: number; module: ModuleKey }) {
  return (
    <span className={`tdb-bar tdb-${module}`}>
      <b style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%` }} />
    </span>
  );
}

/** Fifteen dots, one per boss: passed, tried, or untouched. */
export function BossStrip({ passed, attempts }: { passed: number[]; attempts: Record<string, number> }) {
  return (
    <span className="tdb-boss-strip">
      {finalBosses.map((boss) => {
        const done = passed.includes(boss.id);
        const tries = attempts[String(boss.id)] ?? 0;
        return (
          <i
            key={boss.id}
            className={done ? "is-done" : tries > 0 ? "is-progress" : ""}
            title={`Boss ${boss.id} · ${boss.title} · ${done ? "passed" : tries > 0 ? `${tries} attempt(s)` : "not tried"}`}
          />
        );
      })}
    </span>
  );
}
