import { useId, type CSSProperties } from "react";
import type { Input, Scenario } from "./content";
import { substitute } from "./labStories";

// Phases: 1 start, 2 read input, 3 decide, 4 take the branch, 5 print, 6 merge, 7 end.
export function FlowDiagram({ scenario: s, value, phase, result }: { scenario: Scenario; value: Input; phase: number; result: boolean }) {
  const id = useId().replace(/:/g, "");
  const colors = { idle: "#2c4566", blue: "#7cb8ff", true: "#58f0b5", false: "#ff8295" };
  const branch = result ? colors.true : colors.false;
  const wires = [
    { name: "start-input", d: "M280 50 V82", active: phase >= 2, color: colors.blue },
    { name: "input-decision", d: "M280 140 V170", active: phase >= 3, color: colors.blue },
    { name: "true-output", d: "M150 232 H138 Q124 232 124 246 V318", active: phase >= 4 && result, color: colors.true },
    { name: "false-output", d: "M410 232 H422 Q436 232 436 246 V318", active: phase >= 4 && !result, color: colors.false },
    { name: "true-end", d: "M124 378 V394 Q124 406 138 406 H268 Q280 406 280 418 V420", active: phase >= 6 && result, color: colors.true },
    { name: "false-end", d: "M436 378 V394 Q436 406 422 406 H292 Q280 406 280 418 V420", active: phase >= 6 && !result, color: colors.false },
  ];
  // Where the execution token sits at each phase.
  const stops: Record<number, [number, number]> = { 1: [280, 31], 2: [280, 111], 3: [280, 232], 4: [result ? 124 : 436, 290], 5: [result ? 124 : 436, 348], 6: [280, 406], 7: [280, 440] };
  const token = stops[phase];
  const evaluated = phase >= 3;
  const node = (x: number, y: number, width: number, height: number, label: string, active: boolean, caption = "", color = colors.blue, terminal = false) => <g className={`fp-svg-node ${active ? "is-active" : ""}`} style={{ "--node-color": color } as CSSProperties}>
    <rect x={x} y={y} width={width} height={height} rx={terminal ? height / 2 : 12} />
    {caption && <text className="fp-svg-caption" x={x + width / 2} y={y + 19}>{caption}</text>}
    <text x={x + width / 2} y={y + (caption ? height - 14 : height / 2 + 7)}>{label}</text>
  </g>;
  return <div className="fp-flowchart"><svg className="fp-flow-svg" viewBox="0 0 560 466" role="img" aria-label={`Execution flowchart${phase >= 4 ? `: ${result ? "TRUE" : "FALSE"} path` : ""}`}>
    <defs>
      {Object.entries(colors).map(([name, color]) => <marker key={name} id={`${id}-${name}`} markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill={color} /></marker>)}
      <radialGradient id={`${id}-glow`}><stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor={phase >= 4 ? branch : colors.blue} /><stop offset="1" stopColor={phase >= 4 ? branch : colors.blue} stopOpacity="0" /></radialGradient>
    </defs>
    {wires.map((w) => <g key={w.name}>
      <path className="fp-wire-track" d={w.d} stroke={colors.idle} markerEnd={`url(#${id}-idle)`} />
      {w.active && <path data-segment={w.name} className="fp-wire-fill" d={w.d} pathLength="1" stroke={w.color} markerEnd={`url(#${id}-${w.color === colors.blue ? "blue" : w.color === colors.true ? "true" : "false"})`} />}
    </g>)}
    {node(205, 12, 150, 38, "START", phase >= 1, "", colors.blue, true)}
    {node(150, 84, 260, 56, `${s.variable} = ${String(value)}`, phase >= 2, "READ INPUT")}
    <g className={`fp-svg-decision ${evaluated ? "is-active" : ""} ${phase >= 4 ? (result ? "is-true" : "is-false") : ""}`}>
      <polygon points="280,172 410,232 280,292 150,232" />
      <text x="280" y={evaluated ? 226 : 239}>{evaluated ? substitute(s.condition, s.variable, value) : `${s.condition} ?`}</text>
      {evaluated && <text className="fp-svg-verdict" x="280" y="254">{phase >= 4 ? (result ? "→ true" : "→ false") : "…"}</text>}
    </g>
    <text className={`fp-svg-path-label true ${phase >= 4 && result ? "is-active" : ""}`} x="70" y="270">TRUE · IF</text>
    <text className={`fp-svg-path-label false ${phase >= 4 && !result ? "is-active" : ""}`} x="490" y="270">FALSE · ELSE</text>
    {node(14, 320, 220, 58, s.yes, phase >= 5 && result, "PRINT", colors.true)}
    {node(326, 320, 220, 58, s.no, phase >= 5 && !result, "PRINT", colors.false)}
    {node(205, 422, 150, 38, "END", phase >= 7, "", colors.blue, true)}
    {token && <g className="fp-token" style={{ transform: `translate(${token[0]}px, ${token[1]}px)` }} aria-hidden="true"><circle r="18" fill={`url(#${id}-glow)`} /><circle r="6" fill="#fff" /></g>}
  </svg></div>;
}
