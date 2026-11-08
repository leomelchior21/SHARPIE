import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { door, hole, logicChip, type Rig, type ScreenState } from "./machines";
import { box, canvasTexture, hitBox, mesh, texturePlane, toon, wrapText } from "./toon";

/*
 * 5. The claw machine: a yellow duck with bunny ears, eggs behind the glass.
 * The fault is behind the front glass: one claw finger is bent, so the claw never grabs.
 */
export const CLAW = { glassHome: new THREE.Vector3(0, 1.2, 0.4), hub: new THREE.Vector3(0.06, 1.3, 0.08) };
const round = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, r);

/** A speaker grille: a dark plate with slats. */
function grille(w: number, h: number) {
  const g = new THREE.Group();
  g.add(mesh(box(w, h, 0.012), toon("#3a1e2c"), 0, 0, 0, 0.006));
  const slats = Math.max(3, Math.round(h / 0.03));
  for (let i = 0; i < slats; i++) g.add(mesh(box(w * 0.82, 0.008, 0.006), toon("#1d1016"), 0, -h / 2 + (i + 0.5) * (h / slats), 0.008));
  return g;
}

export function buildClaw(chipMaterial: THREE.Material): Rig & { claw: { hub: THREE.Group; finger: THREE.Group; bend: (e: number) => void } } {
  const g = new THREE.Group();
  const screen = canvasTexture(256, 128), sticker = canvasTexture(256, 160);
  const yellow = toon("#ffc72c"), deep = toon("#f0a81c"), maroon = toon("#7a2e3a"), orange = toon("#ff8a1f"), pink = toon("#ffb3c7");

  // Base, lower body, glass corners, head.
  g.add(mesh(round(0.9, 0.12, 0.86, 0.03), maroon, 0, 0.06, 0, 0.02));
  g.add(mesh(round(0.84, 0.68, 0.8, 0.05), yellow, 0, 0.46, 0, 0.022));
  for (const [x, z] of [[-0.385, 0.365], [0.385, 0.365], [-0.385, -0.365], [0.385, -0.365]]) g.add(mesh(round(0.07, 0.86, 0.07, 0.02), deep, x, 1.2, z, 0.012));
  g.add(mesh(box(0.78, 0.84, 0.02), toon("#ffe08a"), 0, 1.2, -0.37));
  g.add(mesh(round(0.88, 0.42, 0.84, 0.08), yellow, 0, 1.83, 0, 0.022));
  // The duck's face: eyes with a shine, and an orange beak.
  for (const x of [-0.16, 0.16]) {
    g.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), toon("#1d1d1f"), x, 1.9, 0.415, 0.006));
    g.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }), x + 0.014, 1.915, 0.455));
  }
  const beak = mesh(round(0.26, 0.07, 0.16, 0.03), orange, 0, 1.79, 0.46, 0.01);
  const lower = mesh(round(0.2, 0.05, 0.12, 0.022), toon("#e56f0f"), 0, 1.735, 0.445, 0.008);
  g.add(beak, lower);
  // Bunny ears, a little apart, with pink insides.
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(s * 0.2, 2.02, -0.02);
    ear.rotation.z = -s * 0.12;
    ear.add(mesh(new THREE.CapsuleGeometry(0.075, 0.32, 6, 14), yellow, 0, 0.22, 0, 0.014));
    const inner = mesh(new THREE.CapsuleGeometry(0.04, 0.24, 4, 10), pink, 0, 0.22, 0.05);
    inner.scale.z = 0.4;
    ear.add(inner);
    g.add(ear);
  }

  // Inside the glass: a floor, a heap of eggs and the prize chute.
  g.add(mesh(box(0.76, 0.02, 0.72), toon("#ffe9a8"), 0, 0.8, 0));
  const eggColors = ["#9be7c4", "#7fd6f0", "#b8f0a0", "#8fc9ff", "#c6f6e0", "#6fd0b0"];
  for (let i = 0; i < 16; i++) {
    const egg = mesh(new THREE.SphereGeometry(0.06, 14, 12), toon(eggColors[i % eggColors.length]), -0.28 + ((i * 0.37) % 0.56), 0.86 + (i % 3) * 0.05, -0.26 + ((i * 0.61) % 0.5), 0.006);
    egg.scale.set(1, 1.3, 1);
    egg.rotation.set(i * 0.7, i, i * 0.3);
    for (let k = 0; k < 3; k++) egg.add(mesh(new THREE.SphereGeometry(0.012, 6, 5), toon("#ffffff"), Math.cos(k * 2.1) * 0.05, 0.02 - k * 0.02, Math.sin(k * 2.1) * 0.05));
    g.add(egg);
  }
  const chute = mesh(box(0.18, 0.1, 0.18), toon("#e0b23a"), -0.28, 0.86, 0.24, 0.008);
  g.add(chute, (() => { const h = hole(0.14, 0.14); h.rotation.x = -Math.PI / 2; h.position.set(-0.28, 0.912, 0.24); return h; })());

  // The claw: a rail across the top, a carriage, a cable and three fingers. One finger is bent.
  const rail = toon("#4c5266");
  g.add(mesh(box(0.74, 0.02, 0.02), rail, 0, 1.6, 0.08), mesh(box(0.02, 0.02, 0.66), rail, CLAW.hub.x, 1.6, 0));
  g.add(mesh(box(0.08, 0.04, 0.08), toon("#e5484d"), CLAW.hub.x, 1.58, CLAW.hub.z, 0.008));
  g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.26, 6), toon("#c9ced9"), CLAW.hub.x, 1.45, CLAW.hub.z));
  const hub = new THREE.Group();
  hub.position.copy(CLAW.hub);
  // Bigger than life, so the bent finger is easy to see and to tap.
  hub.scale.setScalar(1.7);
  hub.add(mesh(new THREE.SphereGeometry(0.035, 14, 10), toon("#c9ced9"), 0, 0, 0, 0.006));
  let finger: THREE.Group = null!;
  for (let i = 0; i < 3; i++) {
    const turn = new THREE.Group();
    turn.rotation.y = (i / 3) * Math.PI * 2 + 0.5;
    const f = new THREE.Group();
    f.position.set(0, -0.01, 0.025);
    f.add(mesh(box(0.014, 0.1, 0.014), toon("#d8dce6"), 0, -0.05, 0, 0.004), mesh(box(0.014, 0.05, 0.014), toon("#d8dce6"), 0, -0.1, -0.018, 0.004));
    (f.children[1] as THREE.Mesh).rotation.x = 0.7;
    f.rotation.x = 0.35;
    turn.add(f);
    hub.add(turn);
    if (i === 0) finger = f;
  }
  // A big touch target on the bent finger, for the pliers.
  const fingerHit = hitBox(0.12, 0.16, 0.12);
  fingerHit.position.set(0, -0.06, 0);
  finger.add(fingerHit);
  g.add(hub);
  // e: 1 bent outwards, 0 straight like the others.
  const bend = (e: number) => { finger.rotation.set(0.35 + e * 1.15, 0, e * 0.5); };
  bend(1);

  // Lower front: the control panel (a wrong door), with speakers, a screen, buttons and the sticker.
  const ctrlPivot = new THREE.Group();
  ctrlPivot.position.set(0, 0.14, 0.405);
  const ctrl = new THREE.Group();
  ctrl.position.y = 0.31;
  ctrl.add(mesh(round(0.78, 0.6, 0.03, 0.02), maroon, 0, 0, 0, 0.012));
  for (const x of [-0.29, 0.29]) { const gr = grille(0.13, 0.42); gr.position.set(x, -0.02, 0.018); ctrl.add(gr); }
  const bezel = mesh(box(0.3, 0.16, 0.012), toon("#111018"), 0, 0.15, 0.02, 0.006);
  const lcd = texturePlane(0.27, 0.135, screen);
  lcd.position.set(0, 0, 0.0075);
  bezel.add(lcd);
  ctrl.add(bezel);
  const buttons: THREE.Mesh[] = [];
  ["#ff4d5e", "#ffd23f", "#3d8bff"].forEach((c, i) => { const b = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 16), toon(c, { emissive: new THREE.Color(c).multiplyScalar(0.25) }), -0.08 + i * 0.08, -0.04, 0.03, 0.006); b.rotation.x = Math.PI / 2; ctrl.add(b); buttons.push(b); });
  ctrl.add(mesh(box(0.14, 0.03, 0.01), toon("#1d1d1f"), 0, -0.18, 0.02));
  const stickerPlane = texturePlane(0.16, 0.1, sticker, true);
  stickerPlane.position.set(0, -0.255, 0.0175);
  ctrl.add(stickerPlane);
  const ctrlHit = hitBox(0.8, 0.62, 0.06);
  ctrl.add(ctrlHit);
  ctrlPivot.add(ctrl);
  const ctrlHole = hole(0.74, 0.56);
  ctrlHole.position.set(0, 0.45, 0.4005);
  g.add(ctrlPivot, ctrlHole);

  // The right side: the coin slot, the cotton tail and a speaker.
  const coinBox = mesh(round(0.02, 0.26, 0.16, 0.008), toon("#3a1e2c"), 0.425, 1.08, 0.05, 0.008);
  coinBox.add(mesh(box(0.012, 0.08, 0.014), toon("#ffd23f", { emissive: new THREE.Color("#5a3d00") }), 0.008, 0.05, 0), mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: "#59e08a", toneMapped: false }), 0.012, -0.07, -0.04));
  g.add(coinBox);
  const tail = new THREE.Group();
  for (let i = 0; i < 9; i++) tail.add(mesh(new THREE.SphereGeometry(0.055 + (i % 3) * 0.01, 12, 10), toon("#ffffff"), 0.02 + (i % 2) * 0.03, Math.sin(i * 1.9) * 0.06, Math.cos(i * 1.9) * 0.07, 0.006));
  tail.position.set(0.44, 0.58, -0.12);
  g.add(tail);
  const sideGrille = grille(0.3, 0.12);
  sideGrille.rotation.y = Math.PI / 2;
  sideGrille.position.set(0.424, 0.26, 0.05);
  g.add(sideGrille);

  // Left side: the base hatch (a wrong door), hinged at its back edge.
  const basePivot = new THREE.Group();
  basePivot.position.set(-0.425, 0.46, -0.2);
  const hatch = mesh(round(0.02, 0.4, 0.4, 0.01), deep, 0, 0, 0.2, 0.01);
  hatch.add(mesh(box(0.02, 0.06, 0.03), toon("#1d1d1f"), -0.012, 0, 0.13));
  const baseHit = hitBox(0.08, 0.44, 0.44);
  baseHit.position.set(0, 0, 0.2);
  basePivot.add(hatch, baseHit);
  const baseHole = hole(0.36, 0.36);
  baseHole.position.set(-0.4205, 0.46, 0);
  baseHole.rotation.y = -Math.PI / 2;
  g.add(basePivot, baseHole);

  // The logic chip lies on the floor of the glass case, front right.
  const chip = logicChip(chipMaterial, 1);
  chip.scale.setScalar(0.7);
  chip.rotation.x = -0.5;
  chip.position.set(0.26, 0.86, 0.26);
  g.add(chip);

  // The front glass: four screws, lifted off and leaned against the left side.
  const panel = new THREE.Group();
  const glassMat = new THREE.MeshBasicMaterial({ color: "#cfefff", transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const glare = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.4, depthWrite: false });
  panel.add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.8), glassMat));
  for (const [x, w] of [[-0.14, 0.07], [0.0, 0.035]]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.6), glare); s.position.set(x, 0.05, 0.002); s.rotation.z = -0.5; panel.add(s); }
  panel.add(mesh(box(0.76, 0.05, 0.025), deep, 0, 0.415, 0, 0.008), mesh(box(0.76, 0.05, 0.025), deep, 0, -0.415, 0, 0.008), hitBox(0.76, 0.86, 0.06));
  const home = CLAW.glassHome;
  panel.position.copy(home);
  g.add(panel);
  // Side glass, for the look.
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.8), glassMat); side.rotation.y = Math.PI / 2; side.position.set(s * 0.39, 1.2, 0); g.add(side); }

  const drawScreen = (st: ScreenState, time: number) => {
    const c = screen.ctx, w = 256, h = 128;
    c.fillStyle = st.mode === "off" ? "#050507" : "#1a0c24";
    c.fillRect(0, 0, w, h);
    if (st.mode !== "off") {
      c.textAlign = "center"; c.textBaseline = "middle";
      const blink = Math.floor(time * 2) % 2 === 0;
      if (st.mode === "attract") { c.fillStyle = "#ffd23f"; c.font = "900 30px system-ui, sans-serif"; c.fillText("EGG CLAW", w / 2, 44); if (blink) { c.fillStyle = "#ffffff"; c.font = "700 18px monospace"; c.fillText("INSERT COIN", w / 2, 88); } }
      if (st.mode === "message") { c.fillStyle = "#ff8ad8"; c.font = "800 28px system-ui, sans-serif"; wrapText(c, st.text, w / 2, 56, w - 24, 30); }
      if (st.mode === "blank") { c.fillStyle = "#5a3a6a"; c.font = "700 22px monospace"; c.fillText(blink ? "_" : "", w / 2, h / 2); }
      if (st.mode === "game") { c.fillStyle = `hsl(${(time * 120) % 360},90%,65%)`; c.font = "900 46px system-ui, sans-serif"; c.fillText(st.text || "DROP!", w / 2, 58 + Math.sin(time * 6) * 4); }
      if (st.note) { c.fillStyle = "#c8b7ff"; c.font = "700 15px monospace"; c.fillText(st.note, w / 2, 112); }
      if (st.coins) { c.fillStyle = "#ffd23f"; c.font = "700 15px monospace"; c.textAlign = "right"; c.fillText(`CREDIT ${st.coins}`, w - 10, 14); }
    }
    screen.texture.needsUpdate = true;
  };

  const doors = [
    door("glass", panel, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1.2, 0.41), null),
    door("control", ctrlPivot, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.45, 0.41), (e) => { ctrlPivot.rotation.x = 1.25 * e; }, new THREE.Vector3(0, 0.42, 0.39), new THREE.Vector3(0, 0.42, 0.47)),
    door("base", basePivot, new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-0.43, 0.46, 0), (e) => { basePivot.rotation.y = -1.7 * e; }, new THREE.Vector3(-0.415, 0.44, 0), new THREE.Vector3(-0.48, 0.44, 0)),
  ];
  for (const d of doors) g.add(d.prop);
  return {
    id: "claw", group: g, f: 1, panel,
    panelPose: (e) => {
      panel.position.set(home.x - e * 0.78, home.y + Math.sin(e * Math.PI) * 0.22 - e * 0.5, home.z + e * 0.4);
      panel.rotation.set(0, e * 0.9, e * 0.08);
    },
    screwSpots: [[-0.33, 1.56], [0.33, 1.56], [-0.33, 0.84], [0.33, 0.84]], screwZ: home.z + 0.024,
    board: { center: new THREE.Vector3(0, 1.2, 0.37), w: 0.7, h: 0.8 },
    chip, doors, screen, drawScreen,
    // The buttons glow while the machine has power.
    marquee: (on) => { for (const b of buttons) (b.material as THREE.MeshToonMaterial).emissiveIntensity = on ? 1 : 0; },
    sticker,
    slot: new THREE.Vector3(0.44, 1.11, 0.05),
    views: (portrait) => ({
      front: { pos: portrait ? [0.4, 1.35, 5.0] : [0.55, 1.3, 4.1], look: [0.32, 1.15, 0] },
      door: { pos: portrait ? [0.15, 1.25, 3.7] : [0.3, 1.25, 3.0], look: [0, 1.2, 0.4] },
      inside: { pos: portrait ? [0, 1.22, 3.5] : [0, 1.22, 2.85], look: [0, 1.2, 0.25] },
    }),
    seeThrough: true, coils: [], orbit: { r: 3.6, rp: 4.5, y: 1.55, look: 1.15 },
    claw: { hub, finger, bend },
  };
}
