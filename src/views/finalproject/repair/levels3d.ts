import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { bigOrbit, frontSpot, hatch, screenOn, screenPainter, workArea, door, type Rig, type ScreenState } from "./machines";
import { box, canvasTexture, hitBox, labelPlane, mesh, texturePlane, toon, wrapText } from "./toon";

/*
 * Levels 3, 4, 6 and 7: the jukebox, the electric scooter, the coffee machine and the Robot.
 * Each has its fault behind a screwed panel on the back, and two wrong doors with a joke behind them.
 */
const round = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, r);
const glow = (color: string) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
type Extra = Pick<Rig, "tick">;

/* ---------- 3. The jukebox: neon arches, a spinning record, the board on the back ---------- */

export function buildJukebox(chipMaterial: THREE.Material): Rig & Extra {
  const g = new THREE.Group();
  const screen = canvasTexture(256, 112), sticker = canvasTexture(256, 160);
  const wood = toon("#a4542f"), dark = toon("#2a2340"), chrome = toon("#d8dce6"), cream = toon("#ffe9c2");
  g.add(mesh(box(0.92, 0.08, 0.62), dark, 0, 0.04, 0, 0.02));
  g.add(mesh(box(0.86, 1.22, 0.56), wood, 0, 0.69, 0, 0.022));
  const arch = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.56, 40), wood, 0, 1.3, 0, 0.022);
  arch.rotation.x = Math.PI / 2;
  g.add(arch);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.39, 40, 0, Math.PI), cream);
  face.position.set(0, 1.3, 0.281);
  g.add(face);
  // Neon tubes round the arch: they glow while the machine has power.
  const tubes = ["#ff4fd8", "#ffd23f", "#3dd6ff"].map((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.37 - i * 0.05, 0.016, 8, 48, Math.PI), glow(c)); t.position.set(0, 1.3, 0.285 + i * 0.002); g.add(t); return t; });
  // The record window and the record.
  const window = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), new THREE.MeshBasicMaterial({ color: "#1a1030" }));
  window.position.set(0, 1.28, 0.286);
  const record = new THREE.Group();
  record.position.set(0, 1.28, 0.296);
  const vinyl = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 40), toon("#111111"), 0, 0, 0, 0.004);
  vinyl.rotation.x = Math.PI / 2;
  const label = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 24), toon("#e5484d"), 0.0, 0, 0);
  label.rotation.x = Math.PI / 2;
  const dot = mesh(box(0.02, 0.02, 0.014), toon("#ffd23f"), 0.025, 0, 0);
  record.add(vinyl, label, dot);
  g.add(window, record);
  screenOn(g, screen, 0.34, 0.15, new THREE.Vector3(0, 0.98, 0.287));
  ["#ff4d5e", "#ffd23f", "#59e08a", "#3d8bff", "#b38cff"].forEach((c, i) => g.add(mesh(box(0.05, 0.035, 0.02), toon(c), -0.14 + i * 0.07, 0.855, 0.29, 0.004)));
  // Chrome pillars at the front corners.
  for (const x of [-0.43, 0.43]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.22, 14), chrome, x, 0.69, 0.25, 0.008));
  // The speaker: a dark plate with chrome rings.
  g.add(mesh(box(0.5, 0.4, 0.012), toon("#3a1e2c"), -0.06, 0.42, 0.286, 0.006));
  for (let i = 0; i < 3; i++) { const ring = mesh(new THREE.TorusGeometry(0.05 + i * 0.045, 0.008, 6, 32), chrome, -0.06, 0.42, 0.294); g.add(ring); }
  // The coin slot and the sticker on the right.
  g.add(mesh(box(0.07, 0.1, 0.01), chrome, 0.32, 0.95, 0.286, 0.004), mesh(box(0.014, 0.06, 0.012), toon("#111111"), 0.32, 0.95, 0.292));
  const stickerPlane = texturePlane(0.15, 0.094, sticker, true);
  stickerPlane.position.set(0.31, 0.84, 0.2875);
  g.add(stickerPlane);

  const coin = hatch({ id: "coinbox", w: 0.16, h: 0.13, color: "#c9ced9", at: new THREE.Vector3(0.31, 0.68, 0.281), normal: new THREE.Vector3(0, 0, 1), hinge: "side" });
  const side = hatch({ id: "side", w: 0.26, h: 0.26, color: "#8a4426", at: new THREE.Vector3(-0.431, 0.66, 0.0), normal: new THREE.Vector3(-1, 0, 0), hinge: "side" });
  g.add(coin.pivot, coin.gap, side.pivot, side.gap);

  const work = workArea(g, chipMaterial, { cx: 0, cy: 0.72, plane: -0.285, f: -1, w: 0.62, h: 0.86, panel: "#5b3a2a", slats: "#3d2618", frame: "#3b2a20" });
  const doors = [work.door(), coin.door, side.door];
  for (const d of doors) g.add(d.prop);
  let state: ScreenState["mode"] = "attract";
  const paint = screenPainter(screen, { bg: "#1a0c24", title: "ROCK-O-LA", sub: "INSERT COIN", color: "#ffd23f", msg: "#ff8ad8" });
  return {
    id: "jukebox", group: g, f: -1, panel: work.panel, panelPose: work.panelPose,
    screwSpots: work.screwSpots, screwZ: work.screwZ, board: work.board, chip: work.chip, doors, screen,
    drawScreen: (st, t) => { state = st.mode; paint(st, t); },
    marquee: (on) => { tubes.forEach((m, i) => (m.material as THREE.MeshBasicMaterial).color.set(on ? ["#ff4fd8", "#ffd23f", "#3dd6ff"][i] : "#3a2a3a")); },
    sticker, slot: new THREE.Vector3(0.32, 0.95, 0.3),
    views: (portrait) => ({ front: frontSpot(portrait), ...work.views(portrait) }),
    seeThrough: false, coils: [], orbit: bigOrbit, plane: work.plane, spots: work.spots, token: "coin",
    // The record spins while a song plays.
    tick: (t) => { record.rotation.z = state === "game" ? -t * 6 : 0; },
  };
}

/* ---------- 4. The electric scooter, up on a repair stand. The battery box hangs under the deck. ---------- */

export function buildScooter(chipMaterial: THREE.Material): Rig & Extra {
  const g = new THREE.Group();
  const screen = canvasTexture(256, 128), sticker = canvasTexture(256, 160);
  const mint = toon("#2fd3a0"), dark = toon("#2a2e36"), black = toon("#1d1d1f"), steel = toon("#9aa3b5"), orange = toon("#ff9a3c");
  // The stand.
  for (const x of [-0.3, 0.3]) { g.add(mesh(box(0.06, 0.36, 0.06), steel, x, 0.18, 0, 0.01), mesh(box(0.08, 0.04, 0.4), dark, x, 0.02, 0, 0.01)); }
  // The battery box and the deck on top of it.
  g.add(mesh(box(0.9, 0.32, 0.2), toon("#3a3f4a"), 0, 0.52, 0, 0.018));
  g.add(mesh(round(1.08, 0.07, 0.26, 0.025), mint, 0, 0.715, 0, 0.018));
  g.add(mesh(box(0.92, 0.006, 0.2), black, -0.04, 0.752, 0));
  // Wheels, fenders and the stem.
  const wheels: THREE.Group[] = [];
  for (const x of [-0.62, 0.64]) {
    const w = new THREE.Group();
    w.position.set(x, 0.6, 0);
    w.add(mesh(new THREE.TorusGeometry(0.11, 0.045, 10, 28), black, 0, 0, 0, 0.008), mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20), orange, 0, 0, 0, 0.006));
    (w.children[1] as THREE.Mesh).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const s = mesh(box(0.13, 0.012, 0.012), steel, 0, 0, 0.03); s.rotation.z = (i / 3) * Math.PI; w.add(s); }
    g.add(w);
    wheels.push(w);
    g.add(mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 20, Math.PI), mint, x, 0.6, 0, 0.006));
  }
  const stem = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.76, 14), steel, 0.56, 1.1, 0, 0.008);
  stem.rotation.z = 0.08;
  const fork = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), steel, 0.62, 0.68, 0, 0.006);
  fork.rotation.z = 0.5;
  const bar = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 12), black, 0.53, 1.47, 0, 0.006);
  bar.rotation.x = Math.PI / 2;
  g.add(stem, fork, bar);
  for (const z of [-0.26, 0.26]) { const grip = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.1, 12), orange, 0.53, 1.47, z, 0.006); grip.rotation.x = Math.PI / 2; g.add(grip); }
  screenOn(g, screen, 0.16, 0.08, new THREE.Vector3(0.53, 1.38, 0.05), -0.25);
  // The stem box and the front lamp: the two wrong doors.
  g.add(mesh(box(0.14, 0.18, 0.08), dark, 0.545, 1.05, 0, 0.01));
  const stemDoor = hatch({ id: "stem", w: 0.1, h: 0.13, color: "#2fd3a0", at: new THREE.Vector3(0.545, 1.05, 0.041), normal: new THREE.Vector3(0, 0, 1), hinge: "side" });
  g.add(mesh(box(0.1, 0.11, 0.14), dark, 0.62, 0.9, 0, 0.01));
  const lamp = hatch({ id: "lamp", w: 0.11, h: 0.08, color: "#fff3a8", at: new THREE.Vector3(0.671, 0.9, 0), normal: new THREE.Vector3(1, 0, 0), hinge: "side" });
  g.add(stemDoor.pivot, stemDoor.gap, lamp.pivot, lamp.gap);
  const stickerPlane = texturePlane(0.16, 0.1, sticker, true);
  stickerPlane.position.set(-0.2, 0.52, 0.1015);
  g.add(stickerPlane);

  const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const work = workArea(g, chipMaterial, {
    cx: 0, cy: 0.52, plane: -0.105, f: -1, w: 0.8, h: 0.26, panel: "#4a505c", slats: "#2f343d", frame: "#2a2e36", chipScale: 0.6,
    spots: {
      sockets: [0.26, 0.12, -0.02].map((x) => P(x, 0.6, -0.123)),
      anchors: [0.26, 0.12, -0.02].map((x) => P(x, 0.415, -0.135)),
      rests: [0.33, 0.13, -0.07].map((x, i) => P(x, 0.455 + (i % 2) * 0.025, -0.195)),
      tape: { a: P(-0.1, 0.62, -0.135), b: P(-0.34, 0.62, -0.135) },
      chip: P(-0.25, 0.48, -0.115),
      box: { x0: -0.4, x1: 0.4, y0: 0.4, y1: 0.65 },
    },
  });
  const doors = [work.door(), stemDoor.door, lamp.door];
  for (const d of doors) g.add(d.prop);
  let state: ScreenState["mode"] = "attract";
  const paint = screenPainter(screen, { bg: "#08141c", title: "ZOOM-E", sub: "READY", color: "#2fd3a0", msg: "#ffd23f" });
  return {
    id: "scooter", group: g, f: -1, panel: work.panel, panelPose: work.panelPose,
    screwSpots: work.screwSpots, screwZ: work.screwZ, board: work.board, chip: work.chip, doors, screen,
    drawScreen: (st, t) => { state = st.mode; paint(st, t); }, marquee: () => undefined,
    sticker, slot: new THREE.Vector3(0.53, 1.47, 0.26),
    views: (portrait) => ({ front: { pos: portrait ? [0.3, 1.3, 4.1] : [0.35, 1.2, 3.25], look: [0.22, 0.85, 0] }, ...work.views(portrait) }),
    seeThrough: false, coils: [], orbit: { r: 2.9, rp: 3.7, y: 1.25, look: 0.8 }, plane: work.plane, spots: work.spots, token: "tap",
    // The wheels spin when it rides.
    tick: (t) => { for (const w of wheels) w.rotation.z = state === "game" ? -t * 9 : 0; },
  };
}

/* ---------- 6. The coffee machine: a cup on the front, the grounds drawer, the water tank ---------- */

export function buildCoffee(chipMaterial: THREE.Material): Rig & Extra {
  const g = new THREE.Group();
  const screen = canvasTexture(256, 128), header = canvasTexture(512, 96), sticker = canvasTexture(256, 160);
  const red = toon("#9b2d30"), dark = toon("#2a1a1a"), cream = toon("#f3e2c7");
  g.add(mesh(box(0.84, 0.06, 0.64), dark, 0, 0.03, 0, 0.02));
  g.add(mesh(box(0.8, 1.66, 0.6), red, 0, 0.89, 0, 0.022));
  g.add(mesh(box(0.84, 0.06, 0.64), dark, 0, 1.75, 0, 0.02));
  const sign = texturePlane(0.74, 0.14, header);
  sign.position.set(0, 1.6, 0.302);
  g.add(sign);
  g.add(mesh(box(0.72, 0.62, 0.01), cream, 0, 1.18, 0.302, 0.006));
  // A big cup with steam on the front.
  const cup = labelPlane(0.36, 0.36, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = "#1d1d1f"; c.lineWidth = 10; c.lineCap = "round";
    c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(w * 0.2, h * 0.42); c.lineTo(w * 0.72, h * 0.42); c.lineTo(w * 0.66, h * 0.86); c.lineTo(w * 0.26, h * 0.86); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(w * 0.76, h * 0.58, h * 0.1, -1.2, 1.2); c.stroke();
    c.fillStyle = "#6e3b1f"; c.fillRect(w * 0.23, h * 0.44, w * 0.46, h * 0.07);
    c.strokeStyle = "#a58f80"; c.lineWidth = 8;
    for (let i = 0; i < 3; i++) { c.beginPath(); const x = w * (0.32 + i * 0.13); c.moveTo(x, h * 0.36); c.bezierCurveTo(x - 20, h * 0.27, x + 20, h * 0.2, x, h * 0.1); c.stroke(); }
  }, 300, true);
  cup.position.set(-0.15, 1.2, 0.309);
  g.add(cup);
  screenOn(g, screen, 0.2, 0.1, new THREE.Vector3(0.22, 1.37, 0.31));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) g.add(mesh(box(0.05, 0.035, 0.016), toon(["#ffd23f", "#eef0f4", "#59e08a"][c]), 0.16 + c * 0.06, 1.2 - r * 0.05, 0.31, 0.004));
  g.add(mesh(box(0.07, 0.1, 0.01), toon("#c9ced9"), 0.25, 1.02, 0.306, 0.004), mesh(box(0.014, 0.06, 0.012), toon("#111111"), 0.25, 1.02, 0.312));
  const stickerPlane = texturePlane(0.15, 0.094, sticker, true);
  stickerPlane.position.set(0.2, 0.92, 0.3075);
  g.add(stickerPlane);
  // The cup bay: a dark recess, the nozzle and a little cup.
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), new THREE.MeshBasicMaterial({ color: "#140c0c" }));
  bay.position.set(-0.1, 0.66, 0.301);
  g.add(bay, mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.06, 10), toon("#c9ced9"), -0.1, 0.78, 0.29, 0.004), mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 16), toon("#ffffff"), -0.1, 0.565, 0.27, 0.006));
  // The grounds drawer slides out of the front.
  const drawer = new THREE.Group();
  drawer.position.set(0, 0.26, 0.3);
  drawer.add(mesh(box(0.5, 0.14, 0.03), toon("#6e2326"), 0, 0, 0, 0.01), mesh(box(0.14, 0.03, 0.03), toon("#1d1d1f"), 0, 0.02, 0.025), hitBox(0.54, 0.18, 0.08));
  const drawerHole = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.12), new THREE.MeshBasicMaterial({ color: "#0d0d12" }));
  drawerHole.position.set(0, 0.26, 0.299);
  g.add(drawer, drawerHole);
  const drawerDoor = door("drawer", drawer, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.26, 0.31), (e) => { drawer.position.z = 0.3 + 0.24 * e; }, new THREE.Vector3(0, 0.26, 0.29), new THREE.Vector3(0, 0.3, 0.5));
  const tank = hatch({ id: "tank", w: 0.3, h: 0.4, color: "#7a2326", at: new THREE.Vector3(0.401, 1.1, 0.0), normal: new THREE.Vector3(1, 0, 0), hinge: "side" });
  g.add(tank.pivot, tank.gap, mesh(box(0.012, 0.3, 0.2), toon("#7fd6f0", { transparent: true, opacity: 0.8 }), 0.395, 1.1, 0));

  const work = workArea(g, chipMaterial, { cx: 0, cy: 1.0, plane: -0.305, f: -1, w: 0.6, h: 0.9, panel: "#6e2326", slats: "#4a1618", frame: "#3a1214", screws: 6 });
  const doors = [work.door(), drawerDoor, tank.door];
  for (const d of doors) g.add(d.prop);
  const marquee = (on: boolean) => {
    const c = header.ctx;
    c.fillStyle = on ? "#3a1e12" : "#1a0e08"; c.fillRect(0, 0, 512, 96);
    c.fillStyle = on ? "#ffd9a0" : "#5a4a3a"; c.font = "900 60px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("COFFEE", 256, 52);
    header.texture.needsUpdate = true;
  };
  return {
    id: "coffee", group: g, f: -1, panel: work.panel, panelPose: work.panelPose,
    screwSpots: work.screwSpots, screwZ: work.screwZ, board: work.board, chip: work.chip, doors, screen,
    drawScreen: screenPainter(screen, { bg: "#1a0e08", title: "BEAN-O-MATIC", sub: "INSERT COIN", color: "#ffd9a0", msg: "#ff8a6a" }), marquee,
    sticker, slot: new THREE.Vector3(0.25, 1.02, 0.32),
    views: (portrait) => ({ front: frontSpot(portrait), ...work.views(portrait) }),
    seeThrough: false, coils: [], orbit: bigOrbit, plane: work.plane, spots: work.spots, token: "coin",
  };
}

/* ---------- 7. The Robot, the boss: its program was wiped. Board on its back. ---------- */

export function buildRobot(chipMaterial: THREE.Material): Rig & Extra {
  const g = new THREE.Group();
  const face = canvasTexture(256, 160), sticker = canvasTexture(256, 160);
  const blue = toon("#3d8bff"), white = toon("#eef0f4"), grey = toon("#9aa3b5"), dark = toon("#2a2e36");
  for (const s of [-1, 1]) {
    g.add(mesh(box(0.22, 0.08, 0.3), dark, s * 0.18, 0.04, 0.03, 0.012));
    g.add(mesh(box(0.16, 0.52, 0.2), grey, s * 0.18, 0.34, 0, 0.014));
  }
  g.add(mesh(box(0.6, 0.08, 0.36), dark, 0, 0.6, 0, 0.012));
  g.add(mesh(round(0.84, 0.8, 0.56, 0.06), blue, 0, 1.03, 0, 0.022));
  g.add(mesh(box(0.5, 0.36, 0.012), white, 0, 1.08, 0.281, 0.006));
  const lights = ["#ff4d5e", "#ffd23f", "#59e08a"].map((c, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), glow(c)); m.position.set(-0.12 + i * 0.12, 1.18, 0.289); g.add(m); return m; });
  g.add(mesh(box(0.34, 0.03, 0.01), toon("#3a3f4a"), 0, 1.02, 0.289));
  const button = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), toon("#e5484d", { emissive: new THREE.Color("#3a0000") }), 0.2, 0.84, 0.29, 0.006);
  button.rotation.x = Math.PI / 2;
  g.add(button);
  const stickerPlane = texturePlane(0.15, 0.094, sticker, true);
  stickerPlane.position.set(0.0, 0.93, 0.288);
  g.add(stickerPlane);
  // Head, neck, antenna and ears.
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.08, 16), grey, 0, 1.47, 0, 0.008));
  const head = new THREE.Group();
  head.position.set(0, 1.7, 0);
  head.add(mesh(round(0.56, 0.42, 0.46, 0.07), white, 0, 0, 0, 0.018));
  screenOn(head, face, 0.42, 0.26, new THREE.Vector3(0, 0, 0.232));
  head.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 8), grey, 0, 0.29, 0));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), glow("#ff4d5e"));
  bulb.position.set(0, 0.39, 0);
  head.add(bulb);
  for (const s of [-1, 1]) { const ear = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), blue, s * 0.3, 0, 0, 0.008); ear.rotation.z = Math.PI / 2; head.add(ear); }
  g.add(head);
  // Arms, hanging by its sides.
  const arms = [-1, 1].map((s) => {
    const arm = new THREE.Group();
    arm.position.set(s * 0.47, 1.32, 0);
    arm.add(mesh(new THREE.SphereGeometry(0.07, 14, 10), grey, 0, 0, 0, 0.008), mesh(new THREE.CapsuleGeometry(0.05, 0.34, 6, 10), blue, s * 0.03, -0.24, 0, 0.01), mesh(new THREE.SphereGeometry(0.065, 14, 10), grey, s * 0.03, -0.48, 0, 0.008));
    g.add(arm);
    return arm;
  });
  const chest = hatch({ id: "chest", w: 0.18, h: 0.12, color: "#2b5fb8", at: new THREE.Vector3(-0.15, 0.84, 0.281), normal: new THREE.Vector3(0, 0, 1), hinge: "top" });
  const leg = hatch({ id: "leg", w: 0.14, h: 0.22, color: "#7d8597", at: new THREE.Vector3(-0.261, 0.36, 0.0), normal: new THREE.Vector3(-1, 0, 0), hinge: "side" });
  g.add(chest.pivot, chest.gap, leg.pivot, leg.gap);

  const work = workArea(g, chipMaterial, { cx: 0, cy: 1.03, plane: -0.285, f: -1, w: 0.66, h: 0.66, panel: "#2b5fb8", slats: "#1d4590", frame: "#16336b", screws: 6, spots: { chip: new THREE.Vector3(0.033, 0.997, -0.295) } });
  const doors = [work.door(), chest.door, leg.door];
  for (const d of doors) g.add(d.prop);

  let state: ScreenState = { mode: "attract", text: "", coins: 0, note: "" };
  const drawScreen = (st: ScreenState, time: number) => {
    state = st;
    const c = face.ctx, w = 256, h = 160;
    c.fillStyle = st.mode === "off" ? "#050507" : "#0b1a2e"; c.fillRect(0, 0, w, h);
    if (st.mode === "off") { face.texture.needsUpdate = true; return; }
    c.textAlign = "center"; c.textBaseline = "middle";
    const eyes = (happy: boolean, color: string) => {
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 10; c.lineCap = "round";
      for (const x of [w * 0.32, w * 0.68]) {
        if (happy) { c.beginPath(); c.arc(x, h * 0.42, 22, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
        else if (Math.floor(time * 1.3) % 6 === 0) { c.beginPath(); c.moveTo(x - 20, h * 0.4); c.lineTo(x + 20, h * 0.4); c.stroke(); }
        else { c.beginPath(); c.arc(x, h * 0.4, 18, 0, Math.PI * 2); c.fill(); }
      }
    };
    if (st.mode === "attract") { eyes(false, "#3dd6ff"); c.fillStyle = "#3dd6ff"; c.font = "700 20px monospace"; c.fillText(Math.floor(time * 2) % 2 ? "NO PROGRAM" : "", w / 2, h * 0.82); }
    if (st.mode === "blank") { eyes(false, "#3a4a6a"); }
    if (st.mode === "message") { c.fillStyle = "#ff8a8a"; c.font = "800 30px system-ui, sans-serif"; wrapText(c, st.text, w / 2, h / 2, w - 20, 34); }
    if (st.mode === "game") { eyes(true, "#59e08a"); c.fillStyle = `hsl(${(time * 120) % 360},90%,65%)`; c.font = "900 28px system-ui, sans-serif"; c.fillText(st.text, w / 2, h * 0.8); }
    face.texture.needsUpdate = true;
  };
  return {
    id: "robot", group: g, f: -1, panel: work.panel, panelPose: work.panelPose,
    screwSpots: work.screwSpots, screwZ: work.screwZ, board: work.board, chip: work.chip, doors, screen: face, drawScreen,
    marquee: (on) => { lights.forEach((m, i) => (m.material as THREE.MeshBasicMaterial).color.set(on ? ["#ff4d5e", "#ffd23f", "#59e08a"][i] : "#2a2a2e")); },
    sticker, slot: new THREE.Vector3(0.2, 0.84, 0.3),
    views: (portrait) => ({ front: frontSpot(portrait), ...work.views(portrait) }),
    seeThrough: false, coils: [], orbit: { ...bigOrbit, y: 1.55, look: 1.1 }, plane: work.plane, spots: work.spots, token: "tap",
    // The antenna blinks; when it works the robot cheers with both arms.
    tick: (t) => {
      (bulb.material as THREE.MeshBasicMaterial).color.set(Math.floor(t * 2) % 2 ? "#ff4d5e" : "#5a1a1a");
      const cheer = state.mode === "game";
      arms.forEach((a, i) => { a.rotation.z = cheer ? (i ? 1 : -1) * (2.4 + Math.sin(t * 10) * 0.25) : (i ? 1 : -1) * 0.05; });
      head.rotation.y = cheer ? Math.sin(t * 6) * 0.2 : Math.sin(t * 0.6) * 0.08;
    },
  };
}
