import { memo, useLayoutEffect, useMemo, useRef } from "react";
import type { Input } from "../content";
import type { Route, Yard } from "./yard";

/*
 * The yard is isometric pixel art. Every face is filled row by row on a 384 x 262 grid, so edges
 * keep their pixel stair-steps when the picture is scaled up. All words (signs, values, the
 * switch readout) are real text drawn over the art, so they stay sharp and legible.
 *
 * Ground coordinates: a runs along the tracks (screen down-right), b runs across them
 * (screen up-right), z is height.
 */
const W = 384;
const H = 262;
const OX = 52;
const OY = 70;
const p = (a: number, b: number, z = 0) => ({ x: OX + a + b, y: OY + (a - b) / 2 - z });
type Pt = { x: number; y: number };

// Track layout.
const SWITCH = 96;
const FORK = 150;
const END = 262;
const LANE = 34;
type Side = "true" | "false";
const lane = (side: Side) => side === "true" ? LANE : -LANE;

export const C = {
  ground: "#c9ccd1", grid: "#d3d6da", gravel: "#9fa2a7",
  sleeper: "#8a5a36", sleeperDark: "#6b4226", rail: "#eef0f2", railDark: "#73777d",
  slab: "#e3e4e6", slabSide: "#b9bbbf", slabFront: "#a8aaae", edge: "#f2c230",
  post: "#55595f", postDark: "#3f4246",
  trueTop: "#38b083", trueSide: "#25875f", trueFront: "#1d6e4d",
  falseTop: "#f08562", falseSide: "#cd5f3d", falseFront: "#ad4a2c",
  wall: "#f3ede2", wallSide: "#d9cdb8", roof: "#5b6fa8", roofSide: "#46578a",
  glass: "#7cc8ef", glassDark: "#4c9fcf", red: "#e23b3b", blue: "#2c5fb8", white: "#fbfbfb", whiteSide: "#dcdfe3", whiteFront: "#c9cdd3",
  tyre: "#2b2d31", leaf: "#58b85a", leafDark: "#3e9445", leafLight: "#7fd27a", trunk: "#7a5232",
  cone: "#ff8a2a", coneDark: "#d9661a", lampOn: "#ffe27a", dark: "#2f3238",
};

/** Collects pixel rows per colour, then draws each colour as one path. */
class Pixels {
  private rows = new Map<string, string[]>();
  rect(color: string, x: number, y: number, w: number, h = 1) {
    if (w <= 0 || h <= 0) return;
    const list = this.rows.get(color) ?? [];
    list.push(`M${x} ${y}h${w}v${h}h${-w}z`);
    this.rows.set(color, list);
  }
  // Scanline fill of a convex polygon, snapped to whole pixels.
  poly(color: string, points: Pt[]) {
    const ys = points.map((pt) => pt.y);
    const top = Math.floor(Math.min(...ys));
    const bottom = Math.ceil(Math.max(...ys));
    for (let y = top; y < bottom; y += 1) {
      const scan = y + .5;
      let left = Infinity;
      let right = -Infinity;
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if ((scan < a.y) === (scan < b.y)) continue;
        const x = a.x + (scan - a.y) / (b.y - a.y) * (b.x - a.x);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
      if (left < right) this.rect(color, Math.round(left), y, Math.round(right) - Math.round(left));
    }
  }
  /** A box: its top and the two faces that look at the viewer (the +a front and the -b side). */
  box(a0: number, a1: number, b0: number, b1: number, z0: number, z1: number, top: string, side: string, front: string) {
    this.poly(side, [p(a0, b0, z0), p(a1, b0, z0), p(a1, b0, z1), p(a0, b0, z1)]);
    this.poly(front, [p(a1, b0, z0), p(a1, b1, z0), p(a1, b1, z1), p(a1, b0, z1)]);
    this.poly(top, [p(a0, b0, z1), p(a1, b0, z1), p(a1, b1, z1), p(a0, b1, z1)]);
  }
  flat(a0: number, a1: number, b0: number, b1: number, z: number, color: string) {
    this.poly(color, [p(a0, b0, z), p(a1, b0, z), p(a1, b1, z), p(a0, b1, z)]);
  }
  paths(prefix: string) {
    return [...this.rows].map(([color, list], i) => <path key={`${prefix}${i}`} fill={color} d={list.join("")} />);
  }
}

// A stretch of track from (a0, b0) to (a1, b1): gravel bed, sleepers, two rails.
function track(px: Pixels, a0: number, b0: number, a1: number, b1: number, rail: string) {
  const steps = Math.max(1, Math.round(Math.hypot(a1 - a0, b1 - b0)));
  const at = (t: number) => ({ a: a0 + (a1 - a0) * t, b: b0 + (b1 - b0) * t });
  for (let s = 0; s <= steps; s += 2) {
    const { a, b } = at(s / steps);
    px.flat(a - 1, a + 2, b - 11, b + 11, 0, C.gravel);
  }
  for (let s = 2; s < steps; s += 7) {
    const { a, b } = at(s / steps);
    px.box(a - 1.5, a + 1.5, b - 9, b + 9, 0, 1.5, C.sleeper, C.sleeperDark, C.sleeperDark);
  }
  for (const side of [-5, 5]) {
    px.poly(C.railDark, [p(a0, b0 + side, 1.5), p(a1, b1 + side, 1.5), p(a1, b1 + side, 3), p(a0, b0 + side, 3)]);
    px.poly(rail, [p(a0, b0 + side, 3), p(a1, b1 + side, 3), p(a1, b1 + side + 1.2, 3.6), p(a0, b0 + side + 1.2, 3.6)]);
  }
}

function cones(px: Pixels, a: number, b: number) {
  for (const [da, db] of [[0, -8], [6, 0], [0, 8]]) {
    px.box(a + da - 2, a + da + 2, b + db - 2, b + db + 2, 0, 1, C.coneDark, C.coneDark, C.coneDark);
    px.box(a + da - 1, a + da + 1, b + db - 1, b + db + 1, 1, 6, C.white, C.cone, C.coneDark);
  }
}

function tree(px: Pixels, a: number, b: number, size = 1) {
  px.box(a - 1.5, a + 1.5, b - 1.5, b + 1.5, 0, 8 * size, C.trunk, C.trunk, "#5f3f25");
  px.box(a - 7 * size, a + 7 * size, b - 7 * size, b + 7 * size, 7 * size, 17 * size, C.leaf, C.leafDark, C.leafDark);
  px.box(a - 4 * size, a + 4 * size, b - 4 * size, b + 4 * size, 17 * size, 22 * size, C.leafLight, C.leaf, C.leafDark);
}

// Scenery the yard earns: one more piece for every level shipped.
const decor: ((px: Pixels) => void)[] = [
  (px) => tree(px, 40, -70),
  (px) => { px.box(118, 136, -100, -92, 0, 3, "#e9a6c2", "#c9809f", "#b46c8b"); for (let i = 0; i < 4; i += 1) px.box(120 + i * 4, 122 + i * 4, -98, -96, 3, 5, i % 2 ? C.edge : "#ff6f91", C.leafDark, C.leafDark); },
  (px) => tree(px, 150, 100, 1.1),
  (px) => { px.box(60, 62, -40, -38, 0, 24, C.post, C.postDark, C.postDark); px.box(58, 64, -42, -36, 24, 27, C.lampOn, C.post, C.post); },
  (px) => tree(px, 290, -20, .9),
  (px) => { px.box(100, 116, -70, -64, 0, 2, C.post, C.postDark, C.postDark); px.box(100, 116, -70, -64, 2, 5, C.trueTop, C.trueSide, C.trueFront); },
  (px) => tree(px, 200, 120),
  (px) => { px.box(20, 40, 40, 58, 0, 14, "#ffd66b", "#e0b44a", "#c99b35"); px.box(18, 42, 38, 60, 14, 17, C.falseTop, C.falseSide, C.falseFront); },
  (px) => tree(px, 250, 104, .8),
  (px) => { px.box(300, 302, 60, 62, 0, 30, C.post, C.postDark, C.postDark); px.box(302, 303, 62, 78, 22, 30, C.blue, C.blue, C.blue); },
];

function stationArt(px: Pixels, side: Side, built: boolean) {
  // The platform runs beside the track, on the far side for TRUE and the near side for ELSE.
  const b0 = side === "true" ? LANE + 14 : -LANE - 32;
  const b1 = b0 + 18;
  const [top, sideC, front] = side === "true" ? [C.trueTop, C.trueSide, C.trueFront] : [C.falseTop, C.falseSide, C.falseFront];
  px.box(FORK + 18, END - 4, b0, b1, 0, 4, C.slab, C.slabSide, C.slabFront);
  px.flat(FORK + 18, END - 4, side === "true" ? b0 : b1 - 2.5, side === "true" ? b0 + 2.5 : b1, 4, C.edge);
  if (!built) {
    for (const a of [FORK + 30, END - 20]) px.box(a, a + 2, b0 + 6, b0 + 8, 4, 26, C.cone, C.coneDark, C.coneDark);
    px.box(FORK + 30, END - 18, b0 + 6, b0 + 8, 22, 24, C.cone, C.coneDark, C.coneDark);
    return;
  }
  for (const a of [FORK + 28, (FORK + END) / 2 + 4, END - 18]) px.box(a, a + 2.5, b0 + 8, b0 + 10.5, 4, 26, C.post, C.postDark, C.postDark);
  for (const a of [FORK + 40, END - 34]) px.box(a, a + 14, b0 + 9, b0 + 12, 4, 7, C.trueSide, C.trueFront, C.trueFront);
  px.box(FORK + 16, END - 2, b0 - 1, b1 + 1, 26, 29, top, sideC, front);
}

function depot(px: Pixels) {
  px.box(-36, -6, 18, 46, 0, 20, C.wall, C.wallSide, "#cbbfa8");
  for (const a of [-30, -20]) px.poly(C.glass, [p(a, 18, 8), p(a + 6, 18, 8), p(a + 6, 18, 15), p(a, 18, 15)]);
  px.poly("#8d6a4a", [p(-6, 24, 0), p(-6, 38, 0), p(-6, 38, 13), p(-6, 24, 13)]);
  px.box(-40, -2, 14, 50, 20, 24, C.roof, C.roofSide, C.roofSide);
}

/** Everything that does not move: ground, tracks, stations, depot, scenery. */
function buildScene(yard: Yard, lever: Side | null, decorCount: number) {
  const px = new Pixels();
  px.rect(C.ground, 0, 0, W, H);
  for (let k = -400; k <= 600; k += 24) {
    px.poly(C.grid, [p(k, -400), p(k + .7, -400), p(k + .7, 400), p(k, 400)]);
    px.poly(C.grid, [p(-400, k), p(600, k), p(600, k + .7), p(-400, k + .7)]);
  }
  depot(px);
  const gapAtSwitch = !!yard.fault && yard.fault.slot < 2;
  const brokenTrue = yard.fault?.slot === 2;
  const brokenFalse = !!yard.fault && yard.fault.slot >= 3;
  const tint = (side: Side) => lever === null ? C.rail : lever === side ? (side === "true" ? "#7ff0b8" : "#ffad94") : "#b9bcc1";
  // Far things first: the TRUE side lies behind the main line, the ELSE side in front.
  decor.slice(0, decorCount).forEach((draw, i) => { if (i % 2 === 0) draw(px); });
  if (!gapAtSwitch) {
    stationArt(px, "true", !brokenTrue);
    track(px, SWITCH, 0, brokenTrue ? SWITCH + 26 : FORK, brokenTrue ? 15 : LANE, tint("true"));
    if (!brokenTrue) track(px, FORK, LANE, END + 30, LANE, tint("true"));
    else cones(px, SWITCH + 34, 18);
  }
  track(px, -120, 0, gapAtSwitch ? SWITCH - 22 : SWITCH, 0, C.rail);
  if (gapAtSwitch) cones(px, SWITCH - 12, 0);
  else {
    // Signal post beside the switch, with a lamp for each track.
    px.box(SWITCH - 6, SWITCH - 3, 14, 17, 0, 28, C.post, C.postDark, C.postDark);
    px.box(SWITCH - 7, SWITCH - 2, 13, 18, 28, 40, C.dark, C.dark, C.dark);
    px.poly(lever === "true" ? "#5df29a" : "#29563e", [p(SWITCH - 2, 14, 36), p(SWITCH - 2, 17, 36), p(SWITCH - 2, 17, 39), p(SWITCH - 2, 14, 39)]);
    px.poly(lever === "false" ? "#ff7a5c" : "#5c2c24", [p(SWITCH - 2, 14, 30), p(SWITCH - 2, 17, 30), p(SWITCH - 2, 17, 33), p(SWITCH - 2, 14, 33)]);
    // Lever box, its handle leaning toward the track it sends trains to.
    px.box(SWITCH - 2, SWITCH + 6, -18, -12, 0, 5, "#ffd35c", "#d9a933", "#c4942a");
    const lean = lever === "true" ? 4 : lever === "false" ? -4 : 0;
    px.box(SWITCH + 1, SWITCH + 3, -16 + lean, -14 + lean, 5, 12, C.dark, C.dark, C.dark);
    px.box(SWITCH, SWITCH + 4, -17 + lean, -13 + lean, 12, 15, C.red, "#b52c2c", "#b52c2c");
    if (yard.hasElse || brokenFalse) {
      track(px, SWITCH, 0, brokenFalse ? SWITCH + 26 : FORK, brokenFalse ? -15 : -LANE, tint("false"));
      if (!brokenFalse) track(px, FORK, -LANE, END + 30, -LANE, tint("false"));
      else cones(px, SWITCH + 34, -18);
    } else {
      // No else: the track stops at a buffer.
      track(px, SWITCH, 0, SWITCH + 22, -13, tint("false"));
      px.box(SWITCH + 22, SWITCH + 27, -20, -6, 0, 8, C.white, C.red, "#b52c2c");
      px.box(SWITCH + 22, SWITCH + 27, -20, -6, 3, 5, C.red, C.white, C.white);
    }
    if (yard.hasElse || brokenFalse) stationArt(px, "false", !brokenFalse);
  }
  decor.slice(0, decorCount).forEach((draw, i) => { if (i % 2 === 1) draw(px); });
  return px.paths("s");
}

// The tram, drawn once with its nose at the origin.
const TRAM = 46;
const tramArt = (() => {
  const px = new Pixels();
  const q = (a: number, b: number, z: number) => ({ x: a + b, y: (a - b) / 2 - z });
  const quad = (color: string, a0: number, a1: number, b: number, z0: number, z1: number) => px.poly(color, [q(a0, b, z0), q(a1, b, z0), q(a1, b, z1), q(a0, b, z1)]);
  const nose = (color: string, b0: number, b1: number, z0: number, z1: number) => px.poly(color, [q(0, b0, z0), q(0, b1, z0), q(0, b1, z1), q(0, b0, z1)]);
  // Shadow, wheels, body sides, front, roof.
  px.poly("rgba(40,44,52,.28)", [q(-TRAM + 2, -9, 0), q(2, -9, 0), q(2, 7, 0), q(-TRAM + 2, 7, 0)]);
  for (const a of [-40, -32, -12, -4]) quad(C.tyre, a, a + 5, -6.5, 1.5, 4.5);
  px.poly(C.whiteSide, [q(-TRAM, -7, 4), q(0, -7, 4), q(0, -7, 19), q(-TRAM, -7, 19)]);
  px.poly(C.whiteFront, [q(0, -7, 4), q(0, 7, 4), q(0, 7, 19), q(0, -7, 19)]);
  px.poly(C.white, [q(-TRAM, -7, 19), q(0, -7, 19), q(0, 7, 19), q(-TRAM, 7, 19)]);
  quad(C.red, -TRAM, 0, -7, 7, 8.5); quad(C.blue, -TRAM, 0, -7, 6, 7);
  nose(C.red, -7, 7, 7, 8.5); nose(C.blue, -7, 7, 6, 7);
  for (let a = -42; a < -4; a += 8) quad(a === -26 ? "#9aa3ad" : C.glass, a, a + 6, -7, 10, 16);
  quad(C.glassDark, -26, -20, -7, 4.5, 16);
  nose(C.glass, -5, 5, 10, 17); nose(C.lampOn, -6, -4, 5, 6.5); nose(C.lampOn, 4, 6, 5, 6.5);
  // Roof gear and pantograph.
  px.box(-30, -14, -4, 4, 19, 21, C.whiteSide, "#b9bec5", "#b9bec5");
  px.poly(C.dark, [q(-24, -1, 21), q(-23, -1, 21), q(-16, -1, 29), q(-17, -1, 29)]);
  px.poly(C.dark, [q(-21, -5, 29), q(-12, -5, 29), q(-12, 5, 29.8), q(-21, 5, 29.8)]);
  return px.paths("tram");
})();

export type Leg = "enter" | "decide" | "depart" | "done";
export interface TrainState { key: string; value: Input; leg: Leg; route: Route }

/** Where the tram's nose travels on each leg of its trip, in ground coordinates. */
function pathFor(train: TrainState, gapAtSwitch: boolean): { a: number; b: number }[] {
  const stop = { a: gapAtSwitch ? SWITCH - 34 : SWITCH - 6, b: 0 };
  if (train.leg === "enter") return [{ a: -90, b: 0 }, stop];
  if (train.leg === "decide" || train.route.side === null) return [stop, stop];
  const far = lane(train.route.side);
  if (train.route.stop === "buffer") return [stop, { a: SWITCH, b: 0 }, { a: SWITCH + 16, b: -9 }];
  if (train.route.stop === "gap") return [stop, { a: SWITCH, b: 0 }, { a: SWITCH + 18, b: far * .45 }];
  return [stop, { a: SWITCH, b: 0 }, { a: FORK, b: far }, { a: END - 10, b: far }];
}

function along(points: Pt[], t: number): Pt {
  const lengths = points.slice(1).map((pt, i) => Math.hypot(pt.x - points[i].x, pt.y - points[i].y));
  let left = lengths.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < lengths.length; i += 1) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, left / lengths[i]) : 1;
      return { x: points[i].x + (points[i + 1].x - points[i].x) * f, y: points[i].y + (points[i + 1].y - points[i].y) * f };
    }
    left -= lengths[i];
  }
  return points[points.length - 1];
}

const ease = (t: number) => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

function Tram({ train, gapAtSwitch, duration }: { train: TrainState; gapAtSwitch: boolean; duration: number }) {
  const ref = useRef<SVGGElement>(null);
  const points = pathFor(train, gapAtSwitch).map(({ a, b }) => p(a, b));
  const key = `${train.key}-${train.leg}`;
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const place = (t: number) => { const at = along(points, t); node.setAttribute("transform", `translate(${Math.round(at.x)} ${Math.round(at.y)})`); };
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
  const tone = !decided ? "is-waiting" : train.route.stop === "jam" ? "is-jam" : train.route.side === "true" ? "is-true" : train.route.side === "false" ? "is-false" : "is-jam";
  const width = Math.max(22, label.length * 8 + 12);
  return <g ref={ref} className={`sy-tram ${train.route.stop === "jam" && decided ? "is-shaking" : ""}`} data-train={label}>
    {tramArt}
    <g className={`sy-tram-tag ${tone}`} transform="translate(-14 -44)" shapeRendering="auto">
      <rect x={-width / 2} y={-9} width={width} height={15} rx={4} />
      <text y={2.5} textAnchor="middle">{label}</text>
    </g>
  </g>;
}

/** A sign hanging over a platform: the message that station prints. */
function Sign({ side, message, built, lit }: { side: Side; message: string | null; built: boolean; lit: boolean }) {
  const at = p((FORK + END) / 2 + 6, side === "true" ? LANE + 23 : -LANE - 23, 44);
  const text = built ? message ?? "…" : "NOT BUILT";
  const width = Math.max(64, text.length * 6.4 + 22);
  const x = Math.min(W - width / 2 - 4, Math.max(width / 2 + 4, at.x));
  return <g className={`sy-sign is-${side} ${lit ? "is-lit" : ""} ${built ? "" : "is-missing"}`} transform={`translate(${Math.round(x)} ${Math.round(at.y)})`}>
    <rect x={-width / 2} y={-12} width={width} height={19} rx={5} />
    <circle cx={-width / 2 + 9} cy={-2.5} r={3.2} />
    <text x={5} y={1.5} textAnchor="middle">{text}</text>
  </g>;
}

interface Props {
  yard: Yard;
  variable: string;
  train: TrainState | null;
  lever: Side | null;
  readout: string[];
  arrived: Side | null;
  decorCount: number;
  duration: number;
}

const Scene = memo(function Scene({ yard, lever, decorCount }: { yard: Yard; lever: Side | null; decorCount: number }) {
  const art = useMemo(() => buildScene(yard, lever, decorCount), [yard, lever, decorCount]);
  return <g>{art}</g>;
});

export function YardScene({ yard, variable, train, lever, readout, arrived, decorCount, duration }: Props) {
  const gapAtSwitch = !!yard.fault && yard.fault.slot < 2;
  const brokenTrue = yard.fault?.slot === 2;
  const brokenFalse = !!yard.fault && yard.fault.slot >= 3;
  const lines = readout.length ? readout : [yard.condition ?? "no switch yet"];
  // The drawing only depends on what the program builds, so equal programs share one picture.
  const stable = useMemo(() => yard, [yard.bay, yard.condition, yard.yes, yard.no, yard.hasElse, yard.fault?.slot]); // eslint-disable-line react-hooks/exhaustive-deps
  const depotSign = p(-21, 30, 34);
  const warning = gapAtSwitch ? p(SWITCH - 12, 0, 22) : p(SWITCH + 26, -14, -12);
  return <div className="sy-scene">
    <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={`Rail yard. Switch: ${yard.condition ?? "not built"}.`}>
      <Scene yard={stable} lever={lever} decorCount={decorCount} />
      <g className="sy-labels" shapeRendering="auto">
        <g className={`sy-sign is-depot ${yard.bay ? "" : "is-missing"}`} transform={`translate(${Math.round(depotSign.x)} ${Math.round(depotSign.y)})`}>
          <rect x={-30} y={-10} width={60} height={15} rx={4} /><text y={1.2} textAnchor="middle">{yard.bay ? variable : "no variable"}</text>
        </g>
        {(gapAtSwitch || !yard.hasElse && !brokenFalse) && <text className="sy-warning" x={warning.x} y={warning.y} textAnchor="middle">{gapAtSwitch ? "NO SWITCH" : "DEAD END"}</text>}
        {!gapAtSwitch && <Sign side="true" message={yard.yes} built={!brokenTrue} lit={arrived === "true"} />}
        {!gapAtSwitch && (yard.hasElse || brokenFalse) && <Sign side="false" message={yard.no} built={!brokenFalse} lit={arrived === "false"} />}
      </g>
      {train && <Tram train={train} gapAtSwitch={gapAtSwitch} duration={duration} />}
    </svg>
    {/* The switch's own readout: the test, the test with the value in it, the result. */}
    <div className={`sy-readout ${lines[2] ? `is-${lines[2]}` : lines[1] === "JAMMED" ? "is-jam" : ""}`} aria-live="polite">
      <small>SWITCH TEST</small>
      <code>{lines[0]}</code>
      {lines[1] && <code className="sy-readout-sub">{lines[1]}</code>}
      {lines[2] && <b>{lines[2] === "true" ? "TRUE · top track" : "FALSE · else track"}</b>}
    </div>
  </div>;
}
