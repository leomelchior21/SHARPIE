import { useLayoutEffect, useRef } from "react";
import type { Input } from "../content";
import type { Route, Yard } from "./yard";

/*
 * The switch, drawn like the explainer video: a thick track from the left, a condition box on a post,
 * a junction, and two branches that end at the IF card (top) and the ELSE card (bottom).
 * A small train carries the value along the track.
 */
const W = 640;
const H = 300;
const Y = 172;
const J = { x: 330, y: Y };
const IF_IN = { x: 478, y: 74 };
const ELSE_IN = { x: 478, y: 236 };
type Pt = { x: number; y: number };
type Side = "true" | "false";

function bezier(a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y };
}
const branchControls = (end: Pt): [Pt, Pt, Pt, Pt] => [J, { x: J.x + 70, y: J.y }, { x: end.x - 80, y: end.y }, end];
const branchPath = (end: Pt) => { const [a, b, c, d] = branchControls(end); return `M${a.x} ${a.y}C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`; };
// A branch cut short at t: the dead end and the broken track stop part of the way.
function partialBranch(end: Pt, t: number) {
  const points = Array.from({ length: 21 }, (_, i) => bezier(...branchControls(end), (i / 20) * t));
  return `M${points.map((pt) => `${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join("L")}`;
}
function sampleBranch(end: Pt, upTo = 1): Pt[] {
  return Array.from({ length: 31 }, (_, i) => bezier(...branchControls(end), (i / 30) * upTo));
}

export type Leg = "enter" | "decide" | "depart" | "done";
export interface TrainState { key: string; value: Input; leg: Leg; route: Route }

const WAIT = { x: 238, y: Y };
function pathFor(train: TrainState, gapAtSwitch: boolean): Pt[] {
  const stop = gapAtSwitch ? { x: 200, y: Y } : WAIT;
  if (train.leg === "enter") return [{ x: -50, y: Y }, stop];
  if (train.leg === "decide" || train.route.side === null) return [stop, stop];
  const end = train.route.side === "true" ? IF_IN : ELSE_IN;
  // Trains stop just short of the card so its message stays readable.
  const upTo = train.route.stop === "buffer" ? .42 : train.route.stop === "gap" ? .5 : .88;
  return [stop, ...sampleBranch(end, upTo)];
}

function along(points: Pt[], t: number): { at: Pt; angle: number } {
  const lengths = points.slice(1).map((pt, i) => Math.hypot(pt.x - points[i].x, pt.y - points[i].y));
  let left = lengths.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < lengths.length; i += 1) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, left / lengths[i]) : 1;
      const a = points[i];
      const b = points[i + 1];
      return { at: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
    }
    left -= lengths[i];
  }
  return { at: points[points.length - 1], angle: 0 };
}
const ease = (t: number) => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

/** The little train, with the value it carries on a yellow badge that always stays upright. */
function Train({ train, gapAtSwitch, duration }: { train: TrainState; gapAtSwitch: boolean; duration: number }) {
  const body = useRef<SVGGElement>(null);
  const badge = useRef<SVGGElement>(null);
  const points = pathFor(train, gapAtSwitch);
  const key = `${train.key}-${train.leg}`;
  useLayoutEffect(() => {
    const place = (t: number) => {
      const { at, angle } = along(points, t);
      body.current?.setAttribute("transform", `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) rotate(${points.length > 2 ? angle.toFixed(1) : 0})`);
      badge.current?.setAttribute("transform", `translate(${at.x.toFixed(1)} ${(at.y - 34).toFixed(1)})`);
    };
    if (duration <= 0 || typeof requestAnimationFrame !== "function" || train.leg === "decide" || train.leg === "done") { place(1); return; }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => { const t = Math.min(1, (now - start) / duration); place(ease(t)); if (t < 1) frame = requestAnimationFrame(tick); };
    place(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // A new leg key starts a new trip; the points follow from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, duration]);
  const label = String(train.value);
  const decided = train.leg !== "enter";
  const tone = decided && train.route.stop !== "jam" && train.route.side ? `is-${train.route.side}` : decided && train.route.stop === "jam" ? "is-jam" : "";
  const r = Math.max(15, label.length * 5 + 8);
  return <g className={`sy-train ${train.route.stop === "jam" && decided ? "is-shaking" : ""}`} data-train={label}>
    <g ref={body}>
      <rect x={-26} y={-15} width={44} height={22} rx={6} className="sy-train-body" />
      <rect x={-20} y={-10} width={12} height={9} rx={2} className="sy-train-window" />
      <rect x={-4} y={-10} width={12} height={9} rx={2} className="sy-train-window" />
      <path d="M18 -12 L28 -4 L28 7 L18 7 Z" className="sy-train-nose" />
      <circle cx={-15} cy={9} r={4.5} className="sy-train-wheel" /><circle cx={9} cy={9} r={4.5} className="sy-train-wheel" />
    </g>
    <g ref={badge} className={`sy-token ${tone}`}>
      <circle r={r} /><text y={6} textAnchor="middle">{label}</text>
    </g>
  </g>;
}

interface Props {
  yard: Yard;
  train: TrainState | null;
  lever: Side | null;
  readout: string[];
  arrived: Side | null;
  duration: number;
}

function Card({ side, message, state, lit }: { side: Side; message: string | null; state: "ok" | "missing" | "broken" | "dead"; lit: boolean }) {
  const y = side === "true" ? 34 : 196;
  const text = state === "dead" ? "nothing happens" : state === "broken" ? "track broken" : message ?? "…";
  return <g className={`sy-card-node is-${side} is-${state} ${lit ? "is-lit" : ""}`} transform={`translate(478 ${y})`}>
    <rect className="sy-card-shadow" x={5} y={5} width={150} height={80} rx={10} />
    <rect className="sy-card-box" width={150} height={80} rx={10} />
    <path className="sy-card-head" d="M10 0H140A10 10 0 0 1 150 10V26H0V10A10 10 0 0 1 10 0Z" />
    <line className="sy-card-rule" x1={0} y1={26} x2={150} y2={26} />
    <text className="sy-card-title" x={75} y={18.5} textAnchor="middle">{side === "true" ? "IF" : "ELSE"}</text>
    <text className="sy-card-text" x={75} y={59} textAnchor="middle" style={{ fontSize: text.length > 16 ? 12 : 15 }}>{text}</text>
  </g>;
}

export function TrackDiagram({ yard, train, lever, readout, arrived, duration }: Props) {
  const gapAtSwitch = !!yard.fault && yard.fault.slot < 2;
  const brokenTrue = yard.fault?.slot === 2;
  const brokenFalse = !!yard.fault && yard.fault.slot >= 3;
  const deadEnd = !gapAtSwitch && !yard.hasElse && !brokenFalse;
  const result = readout[2] as Side | undefined;
  const jammed = readout[1] === "JAMMED";
  const tone = (side: Side) => lever === side ? `is-${side}` : lever ? "is-off" : "";
  const track = (d: string, extra = "") => <g className={`sy-rail ${extra}`}><path className="sy-rail-edge" d={d} /><path className="sy-rail-bed" d={d} /><path className="sy-rail-lit" d={d} /></g>;
  const ifState = gapAtSwitch ? "missing" : brokenTrue ? "broken" : "ok";
  const elseState = gapAtSwitch ? "missing" : brokenFalse ? "broken" : deadEnd ? "dead" : "ok";
  const box = result ? result : jammed ? "JAMMED" : readout[1] ?? readout[0] ?? yard.condition ?? "no if yet";
  // The box grows with its text so a long test never spills over the edge.
  const boxSize = box.length > 20 ? 15 : 19;
  const boxW = Math.max(150, Math.round(box.length * boxSize * .62 + 34));
  const lead = sampleBranch(lever === "false" ? ELSE_IN : IF_IN, .16);
  return <svg className="sy-track" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Track switch. Test: ${yard.condition ?? "not built"}.`}>
    {/* Main line, then the two branches. */}
    {track(`M-20 ${Y}H${gapAtSwitch ? 262 : J.x}`)}
    {gapAtSwitch && <g className="sy-gap"><path d={`M274 ${Y - 14}l10 28M290 ${Y - 14}l10 28`} /></g>}
    {!gapAtSwitch && <>
      {track(brokenTrue ? partialBranch(IF_IN, .55) : branchPath(IF_IN), `${tone("true")} ${brokenTrue ? "is-broken" : ""}`)}
      {track(brokenFalse ? partialBranch(ELSE_IN, .55) : deadEnd ? partialBranch(ELSE_IN, .42) : branchPath(ELSE_IN), `${tone("false")} ${brokenFalse ? "is-broken" : ""}`)}
      {deadEnd && (() => { const end = bezier(...branchControls(ELSE_IN), .42); return <g className="sy-buffer" transform={`translate(${end.x} ${end.y})`}><rect x={-4} y={-16} width={10} height={32} rx={3} /><path d="M-4 -8h10M-4 2h10" /></g>; })()}
      {/* The switch blade points at the track the test chose. */}
      {lever && <polyline className={`sy-blade is-${lever}`} points={lead.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ")} />}
      <circle className="sy-junction" cx={J.x} cy={J.y} r={7} />
    </>}
    {/* The condition box on its post. */}
    <g className={`sy-test ${result ? `is-${result}` : jammed ? "is-jam" : readout[1] ? "is-reading" : ""} ${yard.condition ? "" : "is-missing"}`} transform="translate(260 120)">
      <line x1={0} y1={0} x2={0} y2={Y - 120 - 9} className="sy-test-post" />
      <rect className="sy-test-shadow" x={-boxW / 2 + 5} y={-46 + 5} width={boxW} height={46} rx={10} />
      <rect className="sy-test-box" x={-boxW / 2} y={-46} width={boxW} height={46} rx={10} />
      <text className="sy-test-text" y={-16} textAnchor="middle" style={{ fontSize: boxSize }}>{box}</text>
    </g>
    <Card side="true" message={yard.yes} state={ifState} lit={arrived === "true"} />
    <Card side="false" message={yard.no} state={elseState} lit={arrived === "false"} />
    {train && <Train train={train} gapAtSwitch={gapAtSwitch} duration={duration} />}
  </svg>;
}
