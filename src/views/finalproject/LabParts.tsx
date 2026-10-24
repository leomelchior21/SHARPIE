import type { CSSProperties, ReactNode } from "react";
import { SyntaxLine } from "../../components/SyntaxLine";
import type { Input } from "./content";
import { boundaryCases, storyFor, type LineState } from "./labStories";

// Code with line numbers; lines can be marked as run, skipped or currently executing.
export function LabCode({ code, states, active = -1, label = "C#" }: { code: string; states?: LineState[]; active?: number; label?: string }) {
  return <pre className="lab-code" aria-label={`${label} program`}>
    {code.split("\n").map((line, index) => <span key={index} className={`lab-line is-${states?.[index] ?? "plain"} ${active === index ? "is-active" : ""}`}>
      <span className="lab-line-number" aria-hidden="true">{index + 1}</span>
      <code><SyntaxLine code={line} /></code>
    </span>)}
  </pre>;
}

export function StoryHead({ id, kicker, title, children }: { id: string; kicker: string; title: string; children?: ReactNode }) {
  const story = storyFor(id);
  return <header className="lab-head" style={{ "--client": story.hue } as CSSProperties}>
    <span className="lab-avatar" aria-hidden="true">{story.initials}</span>
    <div className="lab-head-copy">
      <small>{kicker}</small>
      <h1>{title}</h1>
      <p><b>{story.client}</b> · {story.role}, {story.org}</p>
    </div>
    {children && <div className="lab-head-side">{children}</div>}
  </header>;
}

export function Ticket({ id, children }: { id: string; children?: ReactNode }) {
  const story = storyFor(id);
  return <blockquote className="lab-ticket" style={{ "--client": story.hue } as CSSProperties}>
    <small>TICKET FROM {story.org.toUpperCase()}</small>
    <p>“{story.ticket}”</p>
    {children}
  </blockquote>;
}

interface InputProps {
  scenario: { variable: string; min: number; max: number; step: number; condition: string; initial: Input };
  value: Input;
  onChange: (value: Input) => void;
  disabled?: boolean;
}

export function LabInput({ scenario: s, value, onChange, disabled = false }: InputProps) {
  const edges = boundaryCases(s.condition, s.initial, s.step, s.min, s.max);
  if (typeof value === "boolean") {
    return <div className="lab-input">
      <label>{s.variable} · INPUT</label>
      <div className="lab-toggle" role="group" aria-label={s.variable}>
        {[true, false].map((option) => <button key={String(option)} disabled={disabled} aria-pressed={option === value} onClick={() => onChange(option)}>{String(option)}</button>)}
      </div>
    </div>;
  }
  const set = (next: number) => onChange(Math.round(Math.max(s.min, Math.min(s.max, next)) / s.step) * s.step);
  return <div className="lab-input">
    <label htmlFor={`lab-${s.variable}`}>{s.variable} · INPUT</label>
    <div className="lab-stepper">
      <button aria-label={`Decrease ${s.variable}`} disabled={disabled || value <= s.min} onClick={() => set(value - s.step)}>−</button>
      <output>{value}</output>
      <button aria-label={`Increase ${s.variable}`} disabled={disabled || value >= s.max} onClick={() => set(value + s.step)}>+</button>
    </div>
    <input id={`lab-${s.variable}`} aria-label={s.variable} type="range" min={s.min} max={s.max} step={s.step} value={value} disabled={disabled} onChange={(event) => set(Number(event.target.value))} />
    {edges.length > 1 && <div className="lab-edges" role="group" aria-label="Try the edge">
      <span>TRY THE EDGE</span>
      {edges.map((edge) => <button key={String(edge)} disabled={disabled} aria-pressed={edge === value} onClick={() => onChange(edge)}>{String(edge)}</button>)}
    </div>}
  </div>;
}
