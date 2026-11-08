import * as THREE from "three";
import type { MachineId } from "./logic";
import { box, canvasTexture, hitArea, hitBox, labelPlane, mesh, texturePlane, toon, wrapText, type CanvasTex } from "./toon";

/*
 * The machines on the bench, each with its doors, its screwed panel, the area under the mess and its logic chip.
 * Each machine is built once; the workshop shows the one on the ticket and adds the parts that change per ticket.
 */
export type ScreenMode = "off" | "attract" | "blank" | "message" | "game";
export type ScreenState = { mode: ScreenMode; text: string; coins: number; note: string };
export type Spot = { pos: [number, number, number]; look: [number, number, number] };
export type CamView = "front" | "door" | "inside";

export type DoorRig = {
  id: string;
  /** The part that swings (a wrong door), or the screwed panel (the right door). */
  pivot: THREE.Object3D;
  /** Which way the door faces, and its middle: for the hints and for "can you see it from here". */
  normal: THREE.Vector3;
  center: THREE.Vector3;
  /** null: the right door. It is screwed shut, so tapping it starts the job instead. */
  swing: ((e: number) => void) | null;
  /** The joke behind a wrong door, and how it slides out as the door opens. */
  prop: THREE.Group;
  propIn: THREE.Vector3;
  propOut: THREE.Vector3;
  open: number;
  goal: number;
  shutAt: number;
};

export type Rig = {
  id: MachineId | "practice";
  group: THREE.Group;
  /** The side the work happens on: -1 the back (arcade), 1 the front (vending). */
  f: 1 | -1;
  panel: THREE.Group;
  panelPose: (e: number) => void;
  /** Where the screw heads sit: x, y on the panel, and their z. */
  screwSpots: [number, number][];
  screwZ: number;
  /** The area under the mess, facing the work side. */
  board: { center: THREE.Vector3; w: number; h: number };
  chip: THREE.Mesh;
  doors: DoorRig[];
  screen: CanvasTex;
  drawScreen: (st: ScreenState, t: number) => void;
  marquee: (on: boolean) => void;
  sticker: CanvasTex;
  /** Where the customer's coins go in. */
  slot: THREE.Vector3;
  views: (portrait: boolean) => Record<CamView, Spot>;
  /** The inside shows through glass, so it is never hidden. */
  seeThrough: boolean;
  /** Vending: the spirals, by shelf and slot. */
  coils: THREE.Mesh[][];
  /** Looking around: how far the camera stands (landscape, portrait), how high, and the height it looks at. */
  orbit: { r: number; rp: number; y: number; look: number };
  /** The board's surface (its z), and where each fault's parts sit on it. */
  plane: number;
  spots: Spots;
  /** How the customer works it: coins into the slot, or a tap on a button. */
  token: "coin" | "tap";
  /** Little animations of its own, every frame (a record spinning, wheels turning). */
  tick?: (t: number) => void;
};
export const bigOrbit = { r: 3.4, rp: 4.3, y: 1.42, look: 1.0 };

/** Where the parts of each fault sit, in the world. The plugs are dragged inside box. */
export type Spots = {
  sockets: THREE.Vector3[]; anchors: THREE.Vector3[]; rests: THREE.Vector3[];
  fuse: { holder: THREE.Vector3; spare: THREE.Vector3 };
  tape: { a: THREE.Vector3; b: THREE.Vector3 };
  jam: THREE.Vector3;
  chip: THREE.Vector3;
  box: { x0: number; x1: number; y0: number; y1: number };
};
/**
 * The standard layout of a board, in fractions of its size, seen from the work side (u: right, v: up).
 * It is the arcade's layout: cables in a row near the top, the fuse on the left, the chip in the middle.
 */
export function boardSpots(cx: number, cy: number, plane: number, f: 1 | -1, w: number, h: number, over: Partial<Spots> = {}): Spots {
  const P = (u: number, v: number, out: number) => new THREE.Vector3(cx + u * w * f, cy + v * h, plane + out * f);
  return {
    sockets: [-0.283, 0, 0.283].map((u) => P(u, 0.25, 0.018)),
    anchors: [-0.2, 0, 0.2].map((u) => P(u, -0.414, 0.03)),
    rests: [-0.35, 0, 0.35].map((u, i) => P(u, -0.25 + (i % 2) * 0.043, 0.09)),
    fuse: { holder: P(-0.333, -0.017, 0.035), spare: P(-0.333, -0.293, 0.05) },
    tape: { a: P(-0.4, 0.42, 0.03), b: P(0.05, 0.42, 0.03) },
    jam: P(0.3, 0.02, 0.03),
    chip: P(0.133, -0.017, 0.01),
    box: { x0: cx - w / 2, x1: cx + w / 2, y0: cy - 0.388 * h, y1: cy + 0.474 * h },
    ...over,
  };
}
/** The work views of a board: the panel with its screws (door), and the whole board (inside). */
export function workViews(cx: number, cy: number, plane: number, f: 1 | -1, w: number, h: number) {
  return (portrait: boolean): Pick<Record<CamView, Spot>, "door" | "inside"> => {
    const d = Math.max(h * 2.25, w * 3.3) * (portrait ? 1.14 : 1);
    return {
      door: { pos: [cx + w * 0.55, cy + 0.08, plane + f * d * 0.98], look: [cx, cy - h * 0.1, plane] },
      inside: { pos: [cx, cy - h * 0.04, plane + f * d], look: [cx, cy - h * 0.08, plane] },
    };
  };
}
/** A green circuit board with traces. */
export function pcbPlane(w: number, h: number) {
  return labelPlane(w, h, (c, cw, ch) => {
    c.fillStyle = "#1f8f5a"; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = "#5fd39a"; c.lineWidth = 5; c.globalAlpha = 0.55;
    for (let i = 0; i < Math.max(8, Math.round(26 * w * h / 0.7)); i++) {
      const x = 20 + ((i * 97) % (cw - 40)), y = 20 + ((i * 151) % Math.max(1, ch - 40));
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 30 + (i % 4) * 16); c.lineTo(x + 40 + (i % 3) * 30, y + 30 + (i % 4) * 16); c.stroke();
      c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;
  }, 300);
}
/**
 * The work area on a machine's face: a frame, the board, the logic chip and the screwed panel over them.
 * plane: the board's z, just outside the body. The panel sits 0.035 further out.
 */
export function workArea(g: THREE.Group, chipMaterial: THREE.Material, o: { cx: number; cy: number; plane: number; f: 1 | -1; w: number; h: number; panel: string; slats: string; frame: string; screws?: 4 | 6; spots?: Partial<Spots>; chipScale?: number }) {
  const { cx, cy, plane, f, w, h } = o;
  const spots = boardSpots(cx, cy, plane, f, w, h, o.spots);
  const frameMat = toon(o.frame);
  const fz = plane - f * 0.01;
  g.add(mesh(box(w + 0.1, 0.04, 0.04), frameMat, cx, cy + h / 2 + 0.03, fz), mesh(box(w + 0.1, 0.04, 0.04), frameMat, cx, cy - h / 2 - 0.03, fz));
  g.add(mesh(box(0.04, h + 0.1, 0.04), frameMat, cx + w / 2 + 0.03, cy, fz), mesh(box(0.04, h + 0.1, 0.04), frameMat, cx - w / 2 - 0.03, cy, fz));
  const pcb = pcbPlane(w, h);
  pcb.position.set(cx, cy, plane - f * 0.004);
  pcb.rotation.y = f < 0 ? Math.PI : 0;
  g.add(pcb);
  const chip = logicChip(chipMaterial, f);
  chip.scale.setScalar(o.chipScale ?? 1);
  chip.position.copy(spots.chip);
  g.add(chip);
  const pw = w + 0.06, ph = h + 0.04, panelZ = plane + f * 0.035;
  const panel = new THREE.Group();
  panel.add(mesh(box(pw, ph, 0.02), toon(o.panel), 0, 0, 0, 0.012), hitArea(Math.min(pw, ph) * 0.45), hitBox(pw, ph, 0.05));
  const slats = Math.max(2, Math.min(6, Math.round(ph / 0.2)));
  for (let i = 0; i < slats; i++) panel.add(mesh(box(pw * 0.55, 0.022, 0.01), toon(o.slats), 0, -ph * 0.3 + i * (ph * 0.6 / Math.max(1, slats - 1)), f * 0.012));
  const home = new THREE.Vector3(cx, cy, panelZ);
  panel.position.copy(home);
  g.add(panel);
  const ix = pw / 2 - 0.06, iy = ph / 2 - 0.05;
  const screwSpots: [number, number][] = [[cx + ix, cy + iy], [cx - ix, cy + iy], [cx + ix, cy - iy], [cx - ix, cy - iy], ...(o.screws === 6 ? [[cx + ix, cy], [cx - ix, cy]] as [number, number][] : [])];
  return {
    chip, panel, plane, spots, screwSpots, screwZ: panelZ + f * 0.019,
    board: { center: new THREE.Vector3(cx, cy, plane + f * 0.12), w, h },
    // Off: up, out and leaning against the machine's left side, on the floor.
    panelPose: (e: number) => {
      panel.position.set(home.x - e * (pw / 2 + 0.45 + Math.abs(cx)), home.y + Math.sin(e * Math.PI) * 0.22 - e * (home.y - ph / 2 - 0.03), home.z + f * e * 0.3);
      panel.rotation.set(0, e * 0.9, e * 0.12);
    },
    door: (id = "back") => door(id, panel, new THREE.Vector3(0, 0, f), new THREE.Vector3(cx, cy, panelZ + f * 0.02), null),
    views: workViews(cx, cy, plane, f, w, h),
  };
}
/** A small hatch that swings open on a hinge, with a handle and a dark hole behind it. normal: the way it faces. */
export function hatch(o: { id: string; w: number; h: number; color: string; at: THREE.Vector3; normal: THREE.Vector3; hinge: "side" | "top"; open?: number }) {
  const { w, h, at, normal } = o;
  const side = Math.abs(normal.x) > 0.5;
  const pivot = new THREE.Group();
  const plate = side ? mesh(box(0.02, h, w), toon(o.color), 0, 0, 0, 0.01) : mesh(box(w, h, 0.02), toon(o.color), 0, 0, 0, 0.01);
  plate.add(side ? mesh(box(0.02, 0.05, 0.03), toon("#1d1d1f"), normal.x * 0.012, 0, w * 0.3) : mesh(box(0.03, 0.05, 0.02), toon("#1d1d1f"), w * 0.3, 0, normal.z * 0.012));
  const hit = side ? hitBox(0.07, h + 0.04, w + 0.04) : hitBox(w + 0.04, h + 0.04, 0.07);
  const holder = new THREE.Group();
  holder.add(plate, hit);
  // The pivot sits on the hinge edge and the plate hangs off it.
  if (o.hinge === "top") { pivot.position.set(at.x, at.y + h / 2, at.z); holder.position.set(0, -h / 2, 0); }
  else if (side) { pivot.position.set(at.x, at.y, at.z - w / 2); holder.position.set(0, 0, w / 2); }
  else { pivot.position.set(at.x - w / 2, at.y, at.z); holder.position.set(w / 2, 0, 0); }
  pivot.add(holder);
  const gap = hole(w * 0.92, h * 0.92);
  gap.position.copy(at).addScaledVector(normal, -0.008);
  gap.rotation.y = Math.atan2(normal.x, normal.z);
  const amount = o.open ?? 1.7;
  const swing = (e: number) => {
    if (o.hinge === "top") { if (side) pivot.rotation.z = normal.x * amount * 0.75 * e; else pivot.rotation.x = -normal.z * amount * 0.75 * e; }
    else pivot.rotation.y = (side ? normal.x : -normal.z) * amount * e;
  };
  const d = door(o.id, pivot, normal.clone(), at.clone().addScaledVector(normal, 0.01), swing, at.clone().addScaledVector(normal, -0.004), at.clone().addScaledVector(normal, 0.06));
  return { pivot, gap, door: d };
}
/** A machine's small screen: a dark bezel with a canvas, facing front. */
export function screenOn(g: THREE.Object3D, tex: CanvasTex, w: number, h: number, at: THREE.Vector3, tilt = 0) {
  const bezel = mesh(box(w + 0.03, h + 0.03, 0.012), toon("#111018"), at.x, at.y, at.z, 0.006);
  bezel.rotation.x = tilt;
  const lcd = texturePlane(w, h, tex);
  lcd.position.set(0, 0, 0.0075);
  bezel.add(lcd);
  g.add(bezel);
  return bezel;
}
/** A screen that shows the machine's name, a message, or a party. */
export function screenPainter(tex: CanvasTex, o: { bg: string; title: string; sub: string; color: string; msg?: string }) {
  return (st: ScreenState, time: number) => {
    const c = tex.ctx, w = tex.canvas.width, h = tex.canvas.height;
    c.fillStyle = st.mode === "off" ? "#050507" : o.bg;
    c.fillRect(0, 0, w, h);
    if (st.mode !== "off") {
      c.textAlign = "center"; c.textBaseline = "middle";
      const blink = Math.floor(time * 2) % 2 === 0;
      if (st.mode === "attract") { c.fillStyle = o.color; c.font = `900 ${h * 0.24}px system-ui, sans-serif`; c.fillText(o.title, w / 2, h * 0.36); if (blink) { c.fillStyle = "#ffffff"; c.font = `700 ${h * 0.14}px monospace`; c.fillText(o.sub, w / 2, h * 0.7); } }
      if (st.mode === "message") { c.fillStyle = o.msg ?? "#ff8a8a"; c.font = `800 ${h * 0.22}px system-ui, sans-serif`; wrapText(c, st.text, w / 2, h * 0.44, w - 24, h * 0.24); }
      if (st.mode === "blank") { c.fillStyle = "#3a3f6a"; c.font = `700 ${h * 0.17}px monospace`; c.fillText(blink ? "_" : "", w / 2, h / 2); }
      if (st.mode === "game") { c.fillStyle = `hsl(${(time * 120) % 360},90%,65%)`; c.font = `900 ${h * 0.26}px system-ui, sans-serif`; wrapText(c, st.text, w / 2, h * 0.45 + Math.sin(time * 6) * 3, w - 20, h * 0.28); }
      if (st.note) { c.fillStyle = "#c8d6ff"; c.font = `700 ${h * 0.12}px monospace`; c.fillText(st.note, w / 2, h * 0.88); }
    }
    tex.texture.needsUpdate = true;
  };
}

export const frontSpot = (portrait: boolean): Spot => ({ pos: portrait ? [0.35, 1.2, 4.6] : [0.5, 1.15, 3.75], look: [0.32, 1.02, 0] });
const markDoor = (o: THREE.Object3D, id: string) => o.traverse((x) => { x.userData.door = id; });
export const hole = (w: number, h: number) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: "#0d0d12" }));
export function door(id: string, pivot: THREE.Object3D, normal: THREE.Vector3, center: THREE.Vector3, swing: DoorRig["swing"], propIn = center.clone(), propOut = center.clone()): DoorRig {
  const prop = new THREE.Group();
  prop.position.copy(propIn);
  prop.rotation.y = Math.atan2(normal.x, normal.z);
  markDoor(pivot, id);
  return { id, pivot, normal, center, swing, prop, propIn, propOut, open: 0, goal: 0, shutAt: 0 };
}

/** The logic chip, facing the work side. */
export function logicChip(material: THREE.Material, f: 1 | -1) {
  const chip = mesh(box(0.15, 0.15, 0.018), material, 0, 0, 0, 0.01);
  const label = labelPlane(0.12, 0.12, (c, w, h) => {
    c.fillStyle = "#25252b"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffd23f"; c.font = `800 ${h * 0.2}px system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("LOGIC", w / 2, h * 0.38); c.font = `600 ${h * 0.13}px monospace`; c.fillStyle = "#c9c9d6"; c.fillText("C# · IF/ELSE", w / 2, h * 0.65);
    c.beginPath(); c.arc(w * 0.14, h * 0.14, h * 0.05, 0, Math.PI * 2); c.fill();
  }, 200);
  label.position.set(0, 0, f * 0.0095);
  label.rotation.y = f < 0 ? Math.PI : 0;
  chip.add(label, hitArea(0.11));
  for (let i = 0; i < 5; i++) for (const side of [-1, 1]) chip.add(mesh(box(0.012, 0.02, 0.006), toon("#e8c35a"), side * 0.085, -0.055 + i * 0.027, -f * 0.004));
  return chip;
}

/* ---------- 1. The arcade cabinet: the fault is behind the back panel ---------- */

export const ARCADE = { BOARD_Z: -0.365, PANEL_Z: -0.4 };

export function buildArcade(chipMaterial: THREE.Material): Rig {
  const { BOARD_Z, PANEL_Z } = ARCADE;
  const cab = new THREE.Group();
  const screen = canvasTexture(512, 384), marqueeTex = canvasTexture(512, 128), sticker = canvasTexture(256, 160);
  const purple = toon("#6c3df4"), dark = toon("#2a2340"), yellow = toon("#ffd23f"), pink = toon("#ff5fa2");
  cab.add(mesh(box(0.86, 0.08, 0.76), dark, 0, 0.04, 0, 0.02));
  cab.add(mesh(box(0.82, 1.62, 0.72), purple, 0, 0.89, 0, 0.022));
  for (const x of [0.412, -0.412]) {
    const s1 = mesh(box(0.01, 1.2, 0.09), yellow, x, 0.95, 0.12);
    s1.rotation.x = 0.35;
    const s2 = mesh(box(0.01, 1.2, 0.05), pink, x, 0.95, -0.04);
    s2.rotation.x = 0.35;
    cab.add(s1, s2);
  }
  cab.add(mesh(box(0.86, 0.26, 0.32), dark, 0, 1.83, 0.2, 0.02));
  const sign = texturePlane(0.8, 0.2, marqueeTex);
  sign.position.set(0, 1.83, 0.362);
  cab.add(sign);
  const bezel = mesh(box(0.7, 0.54, 0.05), toon("#111018"), 0, 1.38, 0.355, 0.015);
  bezel.rotation.x = -0.12;
  const glass = texturePlane(0.6, 0.45, screen);
  glass.position.set(0, 0, 0.027);
  bezel.add(glass);
  cab.add(bezel);
  const deck = mesh(box(0.84, 0.08, 0.34), dark, 0, 1.03, 0.46, 0.018);
  deck.rotation.x = 0.28;
  deck.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), toon("#cccccc"), -0.2, 0.09, 0), mesh(new THREE.SphereGeometry(0.035, 16, 12), toon("#ff3b4f"), -0.2, 0.16, 0, 0.008));
  ["#3dd6ff", "#ffd23f", "#59e08a"].forEach((c, i) => deck.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 16), toon(c), 0.04 + i * 0.09, 0.05, 0.02 - i * 0.015, 0.006)));
  cab.add(deck);

  // The coin door (a wrong door): it swings open on its left hinge.
  const coinPivot = new THREE.Group();
  coinPivot.position.set(-0.16, 0.58, 0.375);
  const coinDoor = mesh(box(0.32, 0.27, 0.02), toon("#ff9a3c"), 0.16, 0, 0, 0.012);
  coinDoor.add(mesh(box(0.012, 0.07, 0.02), toon("#111111"), 0.07, 0.04, 0.008), mesh(box(0.04, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: "#ff4f4f", toneMapped: false }), -0.07, 0.05, 0.008));
  const coinHit = hitBox(0.36, 0.31, 0.06);
  coinHit.position.set(0.16, 0, 0);
  coinPivot.add(coinDoor, coinHit);
  const coinHole = hole(0.3, 0.25);
  coinHole.position.set(0, 0.58, 0.3605);
  // The price sticker, by the coin door and on the back panel.
  const frontSticker = texturePlane(0.17, 0.106, sticker, true);
  frontSticker.position.set(0.29, 0.6, 0.3615);
  cab.add(coinPivot, coinHole, frontSticker);

  // The back: a frame, the circuit board inside, and the panel that hides it.
  const frameMat = toon("#3b3355");
  cab.add(mesh(box(0.7, 0.04, 0.04), frameMat, 0, 1.56, -0.375), mesh(box(0.7, 0.04, 0.04), frameMat, 0, 0.34, -0.375));
  cab.add(mesh(box(0.04, 1.24, 0.04), frameMat, 0.33, 0.95, -0.375), mesh(box(0.04, 1.24, 0.04), frameMat, -0.33, 0.95, -0.375));
  const pcb = labelPlane(0.6, 1.16, (c, w, h) => {
    c.fillStyle = "#1f8f5a"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#5fd39a"; c.lineWidth = 5; c.globalAlpha = 0.55;
    for (let i = 0; i < 26; i++) {
      const x = 20 + ((i * 97) % (w - 40)), y = 20 + ((i * 151) % (h - 40));
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 60 + (i % 4) * 30); c.lineTo(x + 50 + (i % 3) * 40, y + 60 + (i % 4) * 30); c.stroke();
      c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;
  }, 300);
  pcb.position.set(0, 0.95, BOARD_Z + 0.004);
  pcb.rotation.y = Math.PI;
  const chip = logicChip(chipMaterial, -1);
  chip.position.set(-0.08, 0.93, BOARD_Z - 0.01);
  cab.add(pcb, chip, mesh(box(0.52, 0.12, 0.02), toon("#1b1b22"), 0, 1.24, BOARD_Z - 0.005, 0.008), mesh(box(0.4, 0.06, 0.04), toon("#1b1b22"), 0, 0.46, BOARD_Z - 0.01, 0.008));

  const panel = new THREE.Group();
  panel.add(mesh(box(0.66, 1.2, 0.02), toon("#454f73"), 0, 0, 0, 0.012), hitArea(0.3));
  for (let i = 0; i < 6; i++) panel.add(mesh(box(0.36, 0.022, 0.01), toon("#2b3250"), 0, -0.36 + i * 0.05, -0.012));
  const backSticker = texturePlane(0.24, 0.15, sticker, true);
  backSticker.position.set(0, 0.3, -0.0115);
  backSticker.rotation.y = Math.PI;
  panel.add(backSticker);
  const home = new THREE.Vector3(0, 0.95, PANEL_Z);
  panel.position.copy(home);
  cab.add(panel);

  const drawScreen = (st: ScreenState, time: number) => {
    const c = screen.ctx;
    const w = 512, h = 384;
    c.fillStyle = st.mode === "off" ? "#050507" : "#0b0d2a";
    c.fillRect(0, 0, w, h);
    if (st.mode !== "off") for (let i = 0; i < 40; i++) { const x = (i * 97 + time * 30 * (1 + (i % 3))) % w, y = (i * 61) % h; c.fillStyle = i % 4 ? "#5a6cff" : "#ffffff"; c.fillRect(w - x, y, 3, 3); }
    c.textAlign = "center"; c.textBaseline = "middle";
    const blink = Math.floor(time * 2) % 2 === 0;
    if (st.mode === "attract") {
      c.fillStyle = "#ffd23f"; c.font = "900 54px system-ui, sans-serif"; c.fillText("ARCADE-3000", w / 2, 120);
      if (blink) { c.fillStyle = "#ffffff"; c.font = "800 34px monospace"; c.fillText("INSERT COIN", w / 2, 230); }
    }
    if (st.mode === "message") { c.fillStyle = "#ff5f7a"; c.font = "800 40px monospace"; wrapText(c, st.text, w / 2, 170, w - 60, 46); }
    if (st.mode === "blank") { c.fillStyle = "#3a3f6a"; c.font = "700 22px monospace"; c.fillText(blink ? "_" : "", w / 2, h / 2); }
    if (st.mode === "game") {
      c.fillStyle = `hsl(${(time * 120) % 360},100%,65%)`; c.font = "900 64px system-ui, sans-serif"; c.fillText(st.text || "GAME START!", w / 2, 140);
      for (let i = 0; i < 5; i++) {
        const x = 70 + i * 92, y = 250 + Math.sin(time * 4 + i) * 14;
        c.fillStyle = ["#59e08a", "#3dd6ff", "#ff5fa2", "#ffd23f", "#b38cff"][i];
        c.fillRect(x - 18, y - 12, 36, 24); c.fillRect(x - 26, y + 4, 10, 14); c.fillRect(x + 16, y + 4, 10, 14);
        c.fillStyle = "#0b0d2a"; c.fillRect(x - 10, y - 4, 6, 6); c.fillRect(x + 4, y - 4, 6, 6);
      }
    }
    if (st.mode !== "off" && st.coins) { c.fillStyle = "#ffd23f"; c.font = "700 26px monospace"; c.textAlign = "left"; c.fillText(`coins = ${st.coins}`, 18, 30); }
    c.fillStyle = "rgba(0,0,0,.18)";
    for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 2);
    screen.texture.needsUpdate = true;
  };
  const marquee = (on: boolean) => {
    const c = marqueeTex.ctx;
    c.fillStyle = on ? "#ff5fa2" : "#3a1e33"; c.fillRect(0, 0, 512, 128);
    c.fillStyle = on ? "#fff3a8" : "#6a4a5a";
    c.font = "900 76px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    if (on) { c.shadowColor = "#ffffff"; c.shadowBlur = 18; }
    c.fillText("ARCADE", 256, 66);
    c.shadowBlur = 0;
    marqueeTex.texture.needsUpdate = true;
  };

  const doors = [
    door("back", panel, new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.95, -0.42), null),
    door("coin", coinPivot, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.58, 0.38), (e) => { coinPivot.rotation.y = -1.9 * e; }, new THREE.Vector3(0, 0.56, 0.364), new THREE.Vector3(0, 0.56, 0.43)),
  ];
  for (const d of doors) cab.add(d.prop);
  return {
    id: "arcade", group: cab, f: -1, panel,
    panelPose: (e) => {
      // Off: up, out and leaning against the cabinet's side.
      panel.position.set(-e * 0.75, 0.95 + Math.sin(e * Math.PI) * 0.25 - e * 0.32, PANEL_Z - e * 0.3);
      panel.rotation.set(0, e * 0.9, e * 0.12);
    },
    screwSpots: [[0.27, 1.49], [-0.27, 1.49], [0.27, 0.41], [-0.27, 0.41]], screwZ: PANEL_Z - 0.019,
    board: { center: new THREE.Vector3(0, 0.95, BOARD_Z - 0.12), w: 0.6, h: 1.16 },
    chip, doors, screen, drawScreen, marquee, sticker,
    slot: new THREE.Vector3(0.07, 0.62, 0.39),
    views: (portrait) => ({
      front: frontSpot(portrait),
      door: { pos: portrait ? [0.75, 1.05, -3.5] : [0.95, 1.05, -2.95], look: [0, 0.82, -0.4] },
      // The whole board, with a margin, fits between the header and the toolbox.
      inside: { pos: portrait ? [0, 0.9, -3.3] : [0, 0.9, -2.95], look: [0, 0.86, -0.36] },
    }),
    seeThrough: false, coils: [], orbit: bigOrbit,
    plane: BOARD_Z, spots: boardSpots(0, 0.95, BOARD_Z, -1, 0.6, 1.16), token: "coin",
  };
}

/* ---------- 2. The vending machine: the fault is behind the front glass ---------- */

export const VENDING = { shelfY: [0.69, 0.97, 1.25, 1.53], slotX: [-0.34, -0.15, 0.04], floorY: 0.53, glassHome: new THREE.Vector3(-0.155, 1.16, 0.385) };

/** A spiral that pushes the snacks out, lying along z. */
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor() { super(); }
  override getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * 4;
    return target.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.02 + t * 0.29);
  }
}

export function buildVending(chipMaterial: THREE.Material): Rig {
  const g = new THREE.Group();
  const screen = canvasTexture(256, 128), header = canvasTexture(512, 96), sticker = canvasTexture(256, 160);
  const red = toon("#e5484d"), dark = toon("#2a2340"), inside = toon("#3a3f4a"), steel = toon("#c9ced9");
  // The body: a solid back half, and a front half with the window cut out of it.
  g.add(mesh(box(0.96, 0.06, 0.78), dark, 0, 0.03, 0, 0.02));
  g.add(mesh(box(0.92, 1.86, 0.37), red, 0, 0.96, -0.185, 0.02));
  g.add(mesh(box(0.02, 1.86, 0.37), red, -0.45, 0.96, 0.185, 0.01));
  g.add(mesh(box(0.32, 1.86, 0.37), red, 0.3, 0.96, 0.185, 0.02));
  g.add(mesh(box(0.6, 0.1, 0.37), red, -0.15, 1.84, 0.185, 0.01));
  g.add(mesh(box(0.6, 0.47, 0.37), red, -0.15, 0.295, 0.185, 0.01));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 1.3), inside);
  back.position.set(-0.15, 1.16, 0.002);
  g.add(back);
  g.add(mesh(box(0.96, 0.18, 0.42), dark, 0, 1.98, 0.0, 0.02));
  const sign = texturePlane(0.9, 0.16, header);
  sign.position.set(0, 1.98, 0.212);
  g.add(sign);

  // Four shelves of three spirals each, with a slot label on each shelf's lip.
  const coils: THREE.Mesh[][] = [];
  const coilGeometry = new THREE.TubeGeometry(new Helix(), 120, 0.0045, 5, false);
  VENDING.shelfY.forEach((y, shelf) => {
    g.add(mesh(box(0.58, 0.015, 0.33), steel, -0.15, y, 0.17, 0.006));
    const lip = labelPlane(0.56, 0.035, (c, w, h) => {
      c.fillStyle = "#1d1d1f"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#ffd23f"; c.font = `800 ${h * 0.75}px monospace`; c.textAlign = "center"; c.textBaseline = "middle";
      [0, 1, 2].forEach((slot) => c.fillText(`${"DCBA"[shelf]}${slot + 1}`, w * ((VENDING.slotX[slot] + 0.43) / 0.56), h / 2 + 1));
    }, 400);
    lip.position.set(-0.15, y - 0.012, 0.338);
    g.add(lip);
    coils.push(VENDING.slotX.map((x) => {
      const coil = new THREE.Mesh(coilGeometry, toon("#d8dce6"));
      coil.position.set(x, y + 0.055, 0);
      g.add(coil);
      return coil;
    }));
  });

  // The right column: screen, keypad, coin slot, the sticker and the coin box.
  const bezel = mesh(box(0.27, 0.15, 0.012), toon("#111018"), 0.3, 1.6, 0.372, 0.006);
  const lcd = texturePlane(0.24, 0.12, screen);
  lcd.position.set(0, 0, 0.0075);
  bezel.add(lcd);
  g.add(bezel);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) g.add(mesh(box(0.055, 0.04, 0.014), toon(row === 2 && col === 2 ? "#59e08a" : "#eef0f4"), 0.24 + col * 0.06, 1.44 - row * 0.055, 0.376, 0.004));
  g.add(mesh(box(0.07, 0.11, 0.008), steel, 0.38, 1.2, 0.373, 0.004), mesh(box(0.014, 0.065, 0.01), toon("#111111"), 0.38, 1.2, 0.378));
  const stickerPlane = texturePlane(0.21, 0.13, sticker, true);
  stickerPlane.position.set(0.29, 1.02, 0.3715);
  g.add(stickerPlane);
  const coinPivot = new THREE.Group();
  coinPivot.position.set(0.18, 0.72, 0.38);
  const coinDoor = mesh(box(0.22, 0.2, 0.02), toon("#9aa3b5"), 0.11, 0, 0, 0.01);
  coinDoor.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12), toon("#1d1d1f"), 0.06, 0, 0.01));
  (coinDoor.children[coinDoor.children.length - 1] as THREE.Mesh).rotation.x = Math.PI / 2;
  const coinHit = hitBox(0.26, 0.24, 0.06);
  coinHit.position.set(0.11, 0, 0);
  coinPivot.add(coinDoor, coinHit);
  const coinHole = hole(0.2, 0.18);
  coinHole.position.set(0.29, 0.72, 0.3705);
  g.add(coinPivot, coinHole);

  // The pick-up flap at the bottom.
  const tray = hole(0.5, 0.22);
  tray.position.set(-0.15, 0.27, 0.3705);
  const flap = mesh(box(0.48, 0.16, 0.012), dark, -0.15, 0.29, 0.38, 0.006);
  flap.rotation.x = -0.15;
  flap.add(labelPlane(0.16, 0.05, (c, w, h) => { c.fillStyle = "#2a2340"; c.fillRect(0, 0, w, h); c.fillStyle = "#c8b7ff"; c.font = `800 ${h * 0.7}px monospace`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("PUSH", w / 2, h / 2); }, 160));
  (flap.children[flap.children.length - 1] as THREE.Mesh).position.set(0, 0, 0.007);
  g.add(tray, flap);

  // The side hatch (a wrong door) on the right side, hinged at its back edge.
  const sidePivot = new THREE.Group();
  sidePivot.position.set(0.465, 1.0, -0.17);
  const hatch = mesh(box(0.02, 0.26, 0.3), toon("#c73a40"), 0, 0, 0.15, 0.01);
  hatch.add(mesh(box(0.02, 0.06, 0.03), toon("#1d1d1f"), 0.012, 0, 0.1));
  const sideHit = hitBox(0.07, 0.3, 0.34);
  sideHit.position.set(0, 0, 0.15);
  sidePivot.add(hatch, sideHit);
  const sideHole = hole(0.28, 0.24);
  sideHole.position.set(0.4605, 1.0, -0.02);
  sideHole.rotation.y = Math.PI / 2;
  for (let i = 0; i < 5; i++) g.add(mesh(box(0.01, 0.02, 0.24), toon("#9c2f35"), 0.462, 1.45 + i * 0.05, -0.02));
  g.add(sidePivot, sideHole);

  // The logic chip sits on the floor of the window, bottom left.
  const chip = logicChip(chipMaterial, 1);
  chip.scale.setScalar(0.8);
  chip.position.set(-0.37, 0.605, 0.25);
  g.add(chip);

  // The front glass: a steel frame with four screws, lifted off and leaned against the side.
  const panel = new THREE.Group();
  const glassMat = new THREE.MeshBasicMaterial({ color: "#cfefff", transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.16), glassMat);
  const glare = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.32, depthWrite: false });
  const shine = [[-0.1, 0.25, 0.06], [0.02, 0.18, 0.03]].map(([x, y, w]) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.7), glare); s.position.set(x, y, 0.002); s.rotation.z = -0.45; return s; });
  panel.add(pane, ...shine,
    mesh(box(0.62, 0.08, 0.03), steel, 0, 0.6, 0, 0.01), mesh(box(0.62, 0.08, 0.03), steel, 0, -0.6, 0, 0.01),
    mesh(box(0.08, 1.28, 0.03), steel, -0.27, 0, 0, 0.01), mesh(box(0.08, 1.28, 0.03), steel, 0.27, 0, 0, 0.01),
    hitBox(0.62, 1.28, 0.06));
  const home = VENDING.glassHome;
  panel.position.copy(home);
  g.add(panel);

  const drawScreen = (st: ScreenState, time: number) => {
    const c = screen.ctx;
    const w = 256, h = 128;
    c.fillStyle = st.mode === "off" ? "#050507" : "#0c2416";
    c.fillRect(0, 0, w, h);
    if (st.mode !== "off") {
      c.textAlign = "center"; c.textBaseline = "middle";
      const blink = Math.floor(time * 2) % 2 === 0;
      if (st.mode === "attract") {
        c.fillStyle = "#59e08a"; c.font = "800 22px monospace"; c.fillText("SNACK-O-MATIC", w / 2, 40);
        if (blink) { c.font = "700 18px monospace"; c.fillText("CHOOSE A SNACK", w / 2, 84); }
      }
      if (st.mode === "message") { c.fillStyle = /sold/i.test(st.text) ? "#ffb347" : "#59e08a"; c.font = "900 38px system-ui, sans-serif"; c.fillText(st.text, w / 2, 60); }
      if (st.mode === "blank") { c.fillStyle = "#2f6b47"; c.font = "700 22px monospace"; c.fillText(blink ? "_" : "", w / 2, h / 2); }
      if (st.mode === "game") { c.fillStyle = `hsl(${(time * 120) % 360},90%,62%)`; c.font = "900 42px system-ui, sans-serif"; c.fillText(st.text || "Enjoy!", w / 2, 58 + Math.sin(time * 6) * 4); }
      if (st.note) { c.fillStyle = "#9fe6b8"; c.font = "700 16px monospace"; c.fillText(st.note, w / 2, 110); }
      if (st.coins) { c.fillStyle = "#ffd23f"; c.font = "700 15px monospace"; c.textAlign = "right"; c.fillText(`CREDIT ${st.coins}`, w - 10, 14); }
      c.fillStyle = "rgba(0,0,0,.16)";
      for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
    }
    screen.texture.needsUpdate = true;
  };
  const marquee = (on: boolean) => {
    const c = header.ctx;
    c.fillStyle = on ? "#ffd23f" : "#4a3f1a"; c.fillRect(0, 0, 512, 96);
    c.fillStyle = on ? "#e5484d" : "#6a4a3a";
    c.font = "900 64px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("SNACKS", 256, 52);
    header.texture.needsUpdate = true;
  };

  const doors = [
    door("glass", panel, new THREE.Vector3(0, 0, 1), new THREE.Vector3(-0.155, 1.16, 0.4), null),
    door("side", sidePivot, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.47, 1.0, -0.02), (e) => { sidePivot.rotation.y = 1.7 * e; }, new THREE.Vector3(0.462, 0.98, -0.02), new THREE.Vector3(0.53, 0.98, -0.02)),
    door("coinbox", coinPivot, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.29, 0.72, 0.39), (e) => { coinPivot.rotation.y = -1.8 * e; }, new THREE.Vector3(0.29, 0.7, 0.372), new THREE.Vector3(0.29, 0.7, 0.43)),
  ];
  for (const d of doors) g.add(d.prop);
  return {
    id: "vending", group: g, f: 1, panel,
    panelPose: (e) => {
      panel.position.set(home.x - e * 0.78, home.y + Math.sin(e * Math.PI) * 0.22 - e * 0.45, home.z + e * 0.45);
      panel.rotation.set(0, e * 0.9, e * 0.08);
    },
    screwSpots: [[home.x - 0.27, home.y + 0.6], [home.x + 0.27, home.y + 0.6], [home.x - 0.27, home.y - 0.6], [home.x + 0.27, home.y - 0.6]], screwZ: home.z + 0.024,
    board: { center: new THREE.Vector3(-0.15, 1.16, 0.345), w: 0.58, h: 1.26 },
    chip, doors, screen, drawScreen, marquee, sticker,
    slot: new THREE.Vector3(0.38, 1.2, 0.39),
    views: (portrait) => ({
      front: frontSpot(portrait),
      door: { pos: portrait ? [0.1, 1.15, 3.95] : [0.3, 1.15, 3.2], look: [-0.12, 1.1, 0.38] },
      inside: { pos: portrait ? [-0.15, 1.12, 3.75] : [-0.15, 1.12, 3.05], look: [-0.15, 1.1, 0.25] },
    }),
    seeThrough: true, coils, orbit: bigOrbit,
    plane: 0.002, spots: boardSpots(-0.15, 1.16, 0.002, 1, 0.58, 1.26), token: "coin",
  };
}

/* ---------- The tutorial's practice box, on a stool where the machines stand ---------- */

export const PRACTICE = { TOP: 0.62, PANEL_Z: -0.205, BOARD_Z: -0.191 };

export function buildPractice(chipMaterial: THREE.Material): Rig {
  const { TOP, PANEL_Z, BOARD_Z } = PRACTICE;
  const g = new THREE.Group();
  const screen = canvasTexture(256, 128), sticker = canvasTexture(256, 160);
  // A round stool.
  const wood = toon("#b07a43"), legMat = toon("#5e3a1f");
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), wood, 0, TOP - 0.03, 0, 0.02));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; const leg = mesh(box(0.05, TOP - 0.06, 0.05), legMat, Math.cos(a) * 0.28, (TOP - 0.06) / 2, Math.sin(a) * 0.28, 0.012); leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(leg); }
  // The box: a toolbox-orange body with a small screen on the front.
  const body = new THREE.Group();
  body.position.y = TOP;
  g.add(body);
  const orange = toon("#ff9a3c");
  body.add(mesh(box(0.5, 0.34, 0.38), orange, 0, 0.17, 0, 0.018));
  body.add(mesh(box(0.2, 0.04, 0.05), toon("#1d1d1f"), 0, 0.36, 0, 0.008), mesh(box(0.04, 0.05, 0.04), toon("#1d1d1f"), -0.08, 0.35, 0), mesh(box(0.04, 0.05, 0.04), toon("#1d1d1f"), 0.08, 0.35, 0));
  const bezel = mesh(box(0.3, 0.16, 0.012), toon("#111018"), 0, 0.19, 0.192, 0.006);
  const lcd = texturePlane(0.27, 0.135, screen);
  lcd.position.set(0, 0, 0.0075);
  bezel.add(lcd);
  body.add(bezel);
  const frontSticker = texturePlane(0.16, 0.1, sticker, true);
  frontSticker.position.set(0.15, 0.05, 0.1905);
  frontSticker.rotation.z = -0.08;
  body.add(frontSticker);
  // The back: a little circuit board, and the panel that hides it.
  const pcb = labelPlane(0.4, 0.24, (c, w, h) => {
    c.fillStyle = "#1f8f5a"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#5fd39a"; c.lineWidth = 4; c.globalAlpha = 0.6;
    for (let i = 0; i < 12; i++) { const x = 14 + ((i * 83) % (w - 28)), y = 14 + ((i * 47) % (h - 28)); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 40, y); c.lineTo(x + 40, y + 30); c.stroke(); }
  }, 300);
  pcb.position.set(0, 0.17, BOARD_Z - 0.002);
  pcb.rotation.y = Math.PI;
  body.add(pcb);
  const chip = logicChip(chipMaterial, -1);
  chip.scale.setScalar(0.6);
  chip.position.set(0.1, 0.17, BOARD_Z - 0.01);
  body.add(chip);
  const panel = new THREE.Group();
  panel.add(mesh(box(0.44, 0.28, 0.016), toon("#454f73"), 0, 0, 0, 0.01), hitArea(0.2));
  for (let i = 0; i < 3; i++) panel.add(mesh(box(0.22, 0.018, 0.008), toon("#2b3250"), 0, -0.06 + i * 0.04, -0.01));
  const home = new THREE.Vector3(0, TOP + 0.17, PANEL_Z);
  panel.position.copy(home);
  g.add(panel);

  const drawScreen = (st: ScreenState, time: number) => {
    const c = screen.ctx;
    c.fillStyle = st.mode === "off" ? "#050507" : "#0b0d2a"; c.fillRect(0, 0, 256, 128);
    if (st.mode !== "off") {
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "#ffd23f"; c.font = "900 30px system-ui, sans-serif"; c.fillText(st.mode === "game" ? "READY!" : "PRACTICE", 128, 52);
      if (Math.floor(time * 2) % 2 === 0) { c.fillStyle = "#ffffff"; c.font = "700 18px monospace"; c.fillText(st.mode === "game" ? "OPEN THE SHOP" : "WARM UP", 128, 94); }
    }
    screen.texture.needsUpdate = true;
  };

  const doors = [door("back", panel, new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, TOP + 0.17, PANEL_Z - 0.01), null)];
  for (const d of doors) g.add(d.prop);
  return {
    id: "practice", group: g, f: -1, panel,
    panelPose: (e) => {
      // Off: lifted and leaned against the stool's leg.
      panel.position.set(home.x - e * 0.42, home.y + Math.sin(e * Math.PI) * 0.18 - e * 0.36, home.z - e * 0.12);
      panel.rotation.set(0, e * 0.7, e * 0.25);
    },
    screwSpots: [[0.17, TOP + 0.26], [-0.17, TOP + 0.08]], screwZ: PANEL_Z - 0.016,
    board: { center: new THREE.Vector3(0, TOP + 0.17, BOARD_Z - 0.026), w: 0.4, h: 0.24 },
    chip, doors, screen, drawScreen, marquee: () => undefined, sticker,
    slot: new THREE.Vector3(0, TOP + 0.3, 0.2),
    views: (portrait) => ({
      front: { pos: portrait ? [0.15, 1.3, 2.7] : [0.25, 1.2, 2.1], look: [0.05, 0.62, 0] },
      door: { pos: portrait ? [0.25, 1.1, -2.1] : [0.3, 1.05, -1.6], look: [0, 0.86, -0.2] },
      inside: { pos: portrait ? [0, 1.0, -1.95] : [0, 0.98, -1.45], look: [0, 0.86, -0.2] },
    }),
    seeThrough: false, coils: [], orbit: { r: 1.55, rp: 2.1, y: 1.25, look: 0.78 },
    plane: BOARD_Z, spots: boardSpots(0, TOP + 0.17, BOARD_Z, -1, 0.4, 0.24), token: "coin",
  };
}
