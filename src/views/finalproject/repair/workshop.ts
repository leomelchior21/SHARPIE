import * as THREE from "three";
import { TAPE_WRAPS, hammerHit, type Job, type Joke, type Look, type MachineId, type ScrewHead, type ToolKind } from "./logic";
import { VENDING, buildArcade, buildPractice, buildVending, type Rig, type ScreenMode, type ScreenState, type Spot } from "./machines";
import { buildCoffee, buildJukebox, buildRobot, buildScooter } from "./levels3d";
import { buildClaw } from "./claw";
import { box, canvasTexture, drawSticker, hitArea, hitMaterial, labelPlane, mesh, softToon, toon } from "./toon";

/*
 * The repair bay, drawn with three.js in a toon style with ink outlines.
 * React owns the game; this class owns the hands-on parts and reports what the student did.
 */
export type View = "front" | "orbit" | "door" | "inside" | "tour";
/** The tutorial's tour of the shop. */
export type TourSpot = "wide" | "machine" | "bench" | "box";
export type Work = "find" | "screws" | "panel" | "dust" | "wires" | "fuse" | "snack" | "jam" | "claw" | "tape" | "chip" | "close" | "lock" | null;
export type { ScreenMode };
export type Mood = "idle" | "angry" | "happy";

export type WorkshopEvents = {
  screwTurn: () => void;
  screwOut: (index: number) => void;
  screwLocked: (index: number) => void;
  /** Turned the wrong way. */
  slip: () => void;
  /** Used a tool that does not fit: need is what the job needed. */
  wrongTool: (need: ToolKind, used: ToolKind) => void;
  /** Tapped a door: the right one starts the job, a wrong one opens on a joke and closes by itself. */
  door: (id: string, right: boolean) => void;
  panelOff: () => void;
  panelOn: () => void;
  dust: (cleaned: number) => void;
  blow: () => void;
  plug: (cable: string, socket: string | null, ok: boolean) => void;
  fuseOut: () => void;
  fuseIn: () => void;
  /** A hammer hit on a stuck snack. left: the snacks still stuck. */
  hammer: (result: "soft" | "good" | "hard", freed: boolean, left: number) => void;
  chip: () => void;
  coin: () => void;
  /** The first drag while looking around. */
  look: () => void;
  /** The practice box landed on its stool. */
  landed: () => void;
  /** The claw's bent finger is straight again. */
  clawFixed: () => void;
  /** One more wrap of tape round the worn cable. */
  tape: (wraps: number) => void;
};

export type ScreenPoint = { x: number; y: number };
export type Points = {
  screws: (ScreenPoint & { out: boolean; locked: boolean; head: ScrewHead })[];
  plugs: (ScreenPoint & { id: string; at: string | null })[];
  sockets: (ScreenPoint & { id: string })[];
  doors: (ScreenPoint & { id: string; facing: boolean; right: boolean })[];
  snacks: (ScreenPoint & { done: boolean })[];
  claw: ScreenPoint | null;
  tape: ScreenPoint | null;
  chip: ScreenPoint; panel: ScreenPoint; board: ScreenPoint; boardA: ScreenPoint; boardB: ScreenPoint; center: ScreenPoint;
  fuse: { blown: ScreenPoint; spare: ScreenPoint; state: string } | null;
  moving: boolean;
};

/** Screwdriver handles share their colour with the toolbox buttons. */
export const headColors: Record<ScrewHead, string> = { cross: "#e5484d", flat: "#ffd23f", star: "#3d8bff" };

type Screw = { group: THREE.Group; spinner: THREE.Group; head: ScrewHead; turned: number; out: boolean; locked: boolean; fall: number; velocity: THREE.Vector3; home: THREE.Vector3 };
type Plug = { id: string; color: string; group: THREE.Group; tube: THREE.Mesh; anchor: THREE.Vector3; rest: THREE.Vector3; at: string | null; target: THREE.Vector3 };
type Spark = { m: THREE.Mesh; v: THREE.Vector3; life: number; smoke?: boolean };
/** A snack stuck on its spiral, or (gear) the Robot's jammed gear: both want gentle hammer taps. */
type StuckSnack = { group: THREE.Group; home: THREE.Vector3; tilt: number; shelf: number; slot: number; taps: number; hits: number; freed: boolean; fall: number; v: THREE.Vector3; wob: number; rest: THREE.Vector3; gear?: boolean };
type Drag =
  | { kind: "screw"; index: number; last: number; back: number; slipped: boolean; lock: boolean }
  | { kind: "plug"; id: string }
  | { kind: "dust" }
  | { kind: "orbit"; x: number; yaw: number; moved: boolean }
  | { kind: "hammer"; index: number; t0: number; power: number };

const shown = (o: THREE.Object3D) => { for (let x: THREE.Object3D | null = o; x; x = x.parent) if (!x.visible) return false; return true; };
const doorOf = (o: THREE.Object3D): string | null => { for (let x: THREE.Object3D | null = o; x; x = x.parent) if (x.userData.door) return x.userData.door as string; return null; };
const snackColor = (shelf: number, slot: number) => ["#ff6b6b", "#4ecdc4", "#ffd23f", "#b38cff", "#59e08a", "#ff9a3c", "#3d8bff"][(shelf * 3 + slot * 5) % 7];

export class Workshop {
  events: Partial<WorkshopEvents> = {};
  bubble: HTMLElement | null = null;
  /** The hammer's strength meter: the scene fills it while you wind up. */
  hammerMeter: HTMLElement | null = null;
  /** A label the tour pins to a spot in the shop. */
  tag: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.05, 50);
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private observer: ResizeObserver;
  private view: View = "front";
  private camFrom = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private camTo = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private camLook = new THREE.Vector3();
  private camT = 1;
  /** Looking around the machine: the angle now and the angle it eases to. */
  private yaw = 0;
  private yawGoal = 0;
  private work: Work = null;
  private job: Job | null = null;
  private tool: ToolKind = "hand";
  private rigs: Record<MachineId | "practice", Rig>;
  private rig: Rig;
  private screws: Screw[] = [];
  private plugs: Plug[] = [];
  private sockets: { id: string; pos: THREE.Vector3 }[] = [];
  private snacks: StuckSnack[] = [];
  private sparks: Spark[] = [];
  private drag: Drag | null = null;
  private panelT = 0;
  private panelGoal = 0;
  private jobParts = new THREE.Group();
  /** Parts behind the panel: hidden while the panel is on, unless the machine has a glass front. */
  private interior = new THREE.Group();
  private chipMaterial = toon("#25252b", { emissive: new THREE.Color("#000000") });
  private dust: { mesh: THREE.Mesh; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture; cells: boolean[]; done: boolean } | null = null;
  private fuse: { blown: THREE.Group; spare: THREE.Group; state: "blown" | "out" | "in"; t: number } | null = null;
  private screenState: ScreenState = { mode: "attract", text: "", coins: 0, note: "" };
  private customer = new THREE.Group();
  private parts: { head: THREE.Group; armR: THREE.Group; armL: THREE.Group; mouth: THREE.Mesh; brows: THREE.Group } = null!;
  // The customer walks in from the right and stands on the machine's right, clear of the mission card.
  private walk = { from: 3.2, to: 0.92, t: 1, leaving: false };
  private mood: Mood = "idle";
  private moodAt = 0;
  private coinQueue: { n: number; t: number; done: () => void; dropped: number } | null = null;
  private flyingCoin: THREE.Mesh;
  private walls: { front: THREE.Group; back: THREE.Group };
  private hint: THREE.Mesh;
  private hintAt: THREE.Vector3 | null = null;
  private driver = new THREE.Group();
  private driverHandle = toon("#e5484d");
  private blower = new THREE.Group();
  private hammer = new THREE.Group();
  private swing: { t: number; from: number; index: number; power: number; hit: boolean } | null = null;
  /** The clue that shows which door hides the fault (the arcade's sparks and smoke). */
  private clue = false;
  private clueT = 0;
  private smoke = new THREE.SphereGeometry(0.06, 10, 8);
  private lights: { hemi: THREE.HemisphereLight; lamp: THREE.PointLight; pink: THREE.PointLight; cyan: THREE.PointLight };
  private room: { floor: THREE.MeshToonMaterial; floors: Record<string, THREE.CanvasTexture>; benchTops: THREE.MeshToonMaterial; benchLegs: THREE.MeshToonMaterial; glow: THREE.Object3D[]; strips: THREE.Object3D[] };
  private decor: Record<string, THREE.Object3D> = {};
  private look: Look = { bench: "bench-wood", floor: "floor-checker", light: "light-warm", decor: [] };
  private closing: { t: number; done: () => void } | null = null;
  private tourSpot: Spot = { pos: [0, 1.6, 4.2], look: [0, 0.9, 0] };
  private tagAt: THREE.Vector3 | null = null;
  private ring: THREE.Mesh;
  /** The practice box falling onto its stool: 0 up in the air, 1 landed. -1: not started. */
  private drop = 1;
  private looked = false;
  /** The front door: hidden when the camera walks round behind it. */
  private claw: ReturnType<typeof buildClaw>;
  /** The claw's bent finger: 1 bent, 0 straight. And the claw dropping for joy at power on. */
  private clawBend = 1;
  private clawGoal = 1;
  private clawDropT = -1;
  /** The worn cable and its wraps of tape. */
  private tapeJob: { group: THREE.Group; copper: THREE.Mesh; wraps: THREE.Mesh[]; done: number; mid: THREE.Vector3 } | null = null;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = "rp-canvas";
    this.scene.background = new THREE.Color("#2b2140");
    this.scene.fog = new THREE.Fog("#2b2140", 6, 13);

    const hemi = new THREE.HemisphereLight("#fff4e0", "#4a3a6a", 1.4);
    const sun = new THREE.DirectionalLight("#ffffff", 1.6);
    sun.position.set(2.5, 4, 3);
    const backLight = new THREE.DirectionalLight("#cfe0ff", 1.1);
    backLight.position.set(-1.5, 3, -4);
    const lamp = new THREE.PointLight("#ffd9a0", 6, 6, 1.6);
    lamp.position.set(0.2, 2.6, -1.4);
    const pink = new THREE.PointLight("#ff4fd8", 0, 7, 1.4);
    pink.position.set(-2.2, 1.6, -0.6);
    const cyan = new THREE.PointLight("#3dd6ff", 0, 7, 1.4);
    cyan.position.set(2.2, 1.6, -0.6);
    this.scene.add(hemi, sun, backLight, lamp, pink, cyan);
    this.lights = { hemi, lamp, pink, cyan };

    this.walls = { front: new THREE.Group(), back: new THREE.Group() };
    this.room = this.buildRoom();
    this.claw = buildClaw(this.chipMaterial);
    this.rigs = {
      arcade: buildArcade(this.chipMaterial), vending: buildVending(this.chipMaterial), jukebox: buildJukebox(this.chipMaterial), scooter: buildScooter(this.chipMaterial),
      claw: this.claw, coffee: buildCoffee(this.chipMaterial), robot: buildRobot(this.chipMaterial), practice: buildPractice(this.chipMaterial),
    };
    for (const rig of Object.values(this.rigs)) { this.scene.add(rig.group); rig.drawScreen(this.screenState, 0); rig.marquee(true); rig.group.visible = false; }
    this.rig = this.rigs.arcade;
    this.rig.group.visible = true;
    this.scene.add(this.jobParts, this.interior);
    this.buildCustomer();
    this.buildDecor();
    this.buildTools();
    this.flyingCoin = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 20), toon("#ffcf3a", { emissive: new THREE.Color("#5a3d00") }));
    this.flyingCoin.visible = false;
    this.scene.add(this.flyingCoin);
    this.hint = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 32), new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    this.hint.visible = false;
    this.scene.add(this.hint);
    // The tour's marker: a gold ring on the floor.
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 48), new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.012;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.place("front", true);

    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.down);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerup", this.up);
    canvas.addEventListener("pointercancel", this.up);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.down);
    canvas.removeEventListener("pointermove", this.move);
    canvas.removeEventListener("pointerup", this.up);
    canvas.removeEventListener("pointercancel", this.up);
    this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    this.renderer.dispose();
    canvas.remove();
  }

  private resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Narrow (portrait) screens step back so the whole machine still fits.
    this.camera.fov = w / h < 1 ? 52 : 40;
    this.camera.updateProjectionMatrix();
    this.place(this.view, true);
  }

  /* ---------- Building the room ---------- */

  private floorTexture(kind: string) {
    const tex = canvasTexture(512, 512);
    const f = tex.ctx;
    if (kind === "floor-wood") {
      for (let y = 0; y < 8; y++) { f.fillStyle = y % 2 ? "#b0784a" : "#9c6638"; f.fillRect(0, y * 64, 512, 64); f.fillStyle = "#6e4523"; f.fillRect(0, y * 64, 512, 3); f.fillRect(((y * 173) % 400) + 40, y * 64, 3, 64); }
    } else if (kind === "floor-rubber") {
      f.fillStyle = "#3a3f4a"; f.fillRect(0, 0, 512, 512);
      f.fillStyle = "#4a505c";
      for (let y = 16; y < 512; y += 32) for (let x = 16; x < 512; x += 32) { f.beginPath(); f.arc(x + (y % 64 ? 16 : 0), y, 7, 0, Math.PI * 2); f.fill(); }
    } else if (kind === "floor-galaxy") {
      const g = f.createLinearGradient(0, 0, 512, 512); g.addColorStop(0, "#1b0f4a"); g.addColorStop(1, "#4b2aa8");
      f.fillStyle = g; f.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 180; i++) { f.fillStyle = i % 5 ? "#ffffff" : "#ffd23f"; const s = 1 + (i % 3); f.fillRect((i * 97) % 512, (i * 173) % 512, s, s); }
    } else {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { f.fillStyle = (x + y) % 2 ? "#e9dcc4" : "#cdb99a"; f.fillRect(x * 64, y * 64, 64, 64); }
    }
    tex.texture.wrapS = tex.texture.wrapT = THREE.RepeatWrapping;
    tex.texture.repeat.set(5, 5);
    tex.texture.needsUpdate = true;
    return tex.texture;
  }

  private buildRoom() {
    const floors: Record<string, THREE.CanvasTexture> = {};
    for (const kind of ["floor-checker", "floor-wood", "floor-rubber", "floor-galaxy"]) floors[kind] = this.floorTexture(kind);
    const floorMat = toon("#ffffff", { map: floors["floor-checker"] });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const benchTops = toon("#8a5a35"), benchLegs = toon("#5e3a1f");
    const glow: THREE.Object3D[] = [], strips: THREE.Object3D[] = [];
    const pegboard = (g: THREE.Group, z: number, flip: boolean) => {
      const tex = canvasTexture(512, 256);
      const c = tex.ctx;
      c.fillStyle = "#c98a4b"; c.fillRect(0, 0, 512, 256);
      c.fillStyle = "#8e5a2b";
      for (let y = 12; y < 256; y += 24) for (let x = 12; x < 512; x += 24) { c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill(); }
      tex.texture.wrapS = tex.texture.wrapT = THREE.RepeatWrapping;
      tex.texture.repeat.set(3, 2);
      tex.texture.needsUpdate = true;
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), toon("#ffffff", { map: tex.texture }));
      wall.position.set(0, 2, z);
      if (flip) wall.rotation.y = Math.PI;
      g.add(wall);
      // Tools on the pegboard and a long workbench under it.
      const dir = flip ? -1 : 1;
      const bench = mesh(box(4.2, 0.08, 0.6), benchTops, 0, 0.86, z + dir * 0.32, 0.03);
      const legs = [-1.9, 1.9].map((x) => mesh(box(0.08, 0.86, 0.5), benchLegs, x, 0.43, z + dir * 0.32, 0.02));
      // The gamer desk's glowing edges.
      const edge = mesh(box(4.22, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: "#ff4fd8", toneMapped: false }), 0, 0.83, z + dir * 0.62);
      const edge2 = mesh(box(4.22, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: "#3dd6ff", toneMapped: false }), 0, 0.89, z + dir * 0.62);
      glow.push(edge, edge2);
      // Neon strips along the top of the wall.
      const strip = mesh(box(8.6, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: "#ff4fd8", toneMapped: false }), 0, 3.3, z + dir * 0.03);
      const strip2 = mesh(box(8.6, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: "#3dd6ff", toneMapped: false }), 0, 3.15, z + dir * 0.03);
      strips.push(strip, strip2);
      const pliers = mesh(box(0.08, 0.5, 0.02), toon("#9aa3b5"), -1.2, 2.0, z + dir * 0.02, 0.02);
      pliers.rotation.z = 0.4;
      const hammerHead = mesh(box(0.28, 0.1, 0.06), toon("#4c5266"), 1.4, 2.25, z + dir * 0.04, 0.02);
      const hammer = mesh(box(0.05, 0.5, 0.04), toon("#d08b3c"), 1.4, 2.0, z + dir * 0.03, 0.02);
      const shelf = mesh(box(1.4, 0.05, 0.25), toon("#8a5a35"), -2.6, 1.7, z + dir * 0.13, 0.02);
      const boxes = ["#ff6b6b", "#4ecdc4", "#ffd23f"].map((c2, i) => mesh(box(0.3, 0.26, 0.2), toon(c2), -3.0 + i * 0.4, 1.86, z + dir * 0.13, 0.02));
      g.add(bench, ...legs, edge, edge2, strip, strip2, pliers, hammerHead, hammer, shelf, ...boxes);
      this.scene.add(g);
    };
    pegboard(this.walls.front, -1.7, false);
    pegboard(this.walls.back, 1.95, true);
    this.walls.back.visible = false;
    for (const o of [...glow, ...strips]) o.visible = false;
    return { floor: floorMat, floors, benchTops, benchLegs, glow, strips };
  }

  private buildDecor() {
    const front = this.walls.front;
    const neon = labelPlane(0.9, 0.36, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.font = `900 ${h * 0.62}px system-ui, sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.shadowColor = "#ff4fd8"; c.shadowBlur = 30;
      c.strokeStyle = "#ff8ae6"; c.lineWidth = 10;
      c.strokeText("OPEN", w / 2, h / 2);
      c.fillStyle = "#fff0fb"; c.fillText("OPEN", w / 2, h / 2);
    }, 512, true);
    neon.position.set(-1.6, 2.3, -1.69);

    const poster = labelPlane(0.62, 0.86, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#6c3df4"); g.addColorStop(1, "#ff5fa2");
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = "#1d1d1f"; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
      c.fillStyle = "#ffd23f"; c.font = `900 ${w * 0.15}px system-ui, sans-serif`; c.textAlign = "center";
      c.fillText("ARCADE", w / 2, h * 0.2); c.fillText("LEGENDS", w / 2, h * 0.32);
      for (let i = 0; i < 3; i++) { const x = w * (0.25 + i * 0.25), y = h * 0.62; c.fillStyle = ["#59e08a", "#3dd6ff", "#ffd23f"][i]; c.fillRect(x - 30, y - 22, 60, 44); c.fillStyle = "#1d1d1f"; c.fillRect(x - 16, y - 8, 10, 10); c.fillRect(x + 6, y - 8, 10, 10); }
      c.fillStyle = "#fff"; c.font = `700 ${w * 0.07}px monospace`; c.fillText("INSERT COIN", w / 2, h * 0.88);
    }, 300);
    poster.position.set(1.2, 2.15, -1.69);

    const plant = new THREE.Group();
    plant.add(mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 14), toon("#d0703c"), 0, 0.15, 0, 0.012));
    for (let i = 0; i < 6; i++) {
      const leaf = mesh(new THREE.SphereGeometry(0.11, 10, 8), toon(i % 2 ? "#4caf50" : "#3c9a40"), Math.cos(i) * 0.09, 0.42 + (i % 3) * 0.09, Math.sin(i) * 0.09, 0.01);
      leaf.scale.set(0.8, 1.3, 0.8);
      plant.add(leaf);
    }
    plant.position.set(-1.75, 0, -1.25);

    const radio = new THREE.Group();
    radio.add(mesh(box(0.34, 0.2, 0.14), toon("#e5484d"), 0, 0.1, 0, 0.012));
    const speaker = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), toon("#1d1d1f"), -0.07, 0.1, 0.075);
    speaker.rotation.x = Math.PI / 2;
    const dial = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), toon("#ffd23f"), 0.1, 0.1, 0.075, 0.004);
    dial.rotation.x = Math.PI / 2;
    const aerial = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.28, 6), toon("#cccccc"), 0.12, 0.33, 0);
    aerial.rotation.z = -0.4;
    radio.add(speaker, dial, aerial);
    radio.position.set(-1.05, 0.9, -1.45);
    radio.userData.speaker = speaker;

    const cat = new THREE.Group();
    const crate = mesh(box(0.42, 0.42, 0.42), toon("#b07a43"), 0, 0.21, 0, 0.02);
    const orange = toon("#ff9a3c");
    const body = mesh(new THREE.CapsuleGeometry(0.1, 0.16, 6, 12), orange, 0, 0.55, 0, 0.012);
    body.rotation.z = Math.PI / 2;
    const head = mesh(new THREE.SphereGeometry(0.1, 16, 12), orange, 0.17, 0.66, 0, 0.012);
    const ears = [0.13, 0.21].map((x, i) => mesh(new THREE.ConeGeometry(0.035, 0.07, 8), orange, x, 0.76, i ? -0.04 : 0.04, 0.008));
    const shades = mesh(box(0.03, 0.035, 0.15), toon("#111111"), 0.26, 0.68, 0, 0.004);
    const tail = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 8), orange, -0.2, 0.66, 0, 0.008);
    tail.rotation.z = -0.6;
    cat.add(crate, body, head, ...ears, shades, tail);
    // Out of the way of the machines' panels, wherever they lean.
    cat.position.set(-1.85, 0, -0.65);
    cat.rotation.y = 0.5;
    cat.userData.tail = tail;
    this.scene.add(cat);

    front.add(neon, poster, plant, radio);
    this.decor = { neon, poster, plant, radio, cat };
    for (const o of Object.values(this.decor)) o.visible = false;
  }

  /** The screwdriver that appears on a screw while you turn it, the blower's nozzle and the hammer. */
  private buildTools() {
    const shaft = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.13, 8), toon("#d8dce6"), 0, 0, -0.065);
    shaft.rotation.x = Math.PI / 2;
    const collar = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), toon("#1d1d1f"), 0, 0, -0.135);
    collar.rotation.x = Math.PI / 2;
    const handle = mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.13, 14), this.driverHandle, 0, 0, -0.21, 0.006);
    handle.rotation.x = Math.PI / 2;
    const grip = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 14), toon("#1d1d1f"), 0, 0, -0.18);
    grip.rotation.x = Math.PI / 2;
    const spin = new THREE.Group();
    spin.add(shaft, collar, handle, grip);
    this.driver.add(spin);
    this.driver.userData.spin = spin;
    this.driver.visible = false;
    this.scene.add(this.driver);

    // A hand blower seen from the side: a thin nozzle aimed at the board, a fat body and a grip.
    const aim = new THREE.Group();
    const nozzle = mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.16, 12), toon("#3dd6ff"), 0, 0, -0.08, 0.005);
    nozzle.rotation.x = Math.PI / 2;
    const bodyB = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), toon("#ff9a3c"), 0, 0, -0.22, 0.007);
    bodyB.rotation.x = Math.PI / 2;
    const handleB = mesh(box(0.03, 0.1, 0.035), toon("#1d1d1f"), 0, -0.07, -0.22, 0.004);
    aim.add(nozzle, bodyB, handleB);
    aim.rotation.set(0.25, -0.75, 0);
    this.blower.add(aim);
    this.blower.visible = false;
    this.scene.add(this.blower);

    // The hammer turns on its grip: back to wind up, forward to hit.
    this.hammer.add(mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.26, 10), toon("#b07a43"), 0, 0.13, 0, 0.005), mesh(box(0.11, 0.05, 0.055), toon("#4c5266"), -0.02, 0.27, 0, 0.007));
    this.hammer.visible = false;
    this.scene.add(this.hammer);
  }

  private buildCustomer() {
    const c = this.customer;
    const shirt = softToon("#3dd6ff"), skin = softToon("#f2c29b", true), hair = softToon("#3a2418"), pants = softToon("#3b3f73");
    const legs = [-0.07, 0.07].map((x) => mesh(new THREE.CapsuleGeometry(0.05, 0.36, 4, 10), pants, x, 0.25, 0, 0.012));
    const body = mesh(new THREE.CapsuleGeometry(0.16, 0.3, 6, 14), shirt, 0, 0.78, 0, 0.015);
    const arm = (x: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.98, 0);
      pivot.add(mesh(new THREE.CapsuleGeometry(0.04, 0.3, 4, 8), shirt, 0, -0.18, 0, 0.008), mesh(new THREE.SphereGeometry(0.045, 12, 10), skin, 0, -0.37, 0, 0.006));
      return pivot;
    };
    const armL = arm(-0.235), armR = arm(0.235);
    const head = new THREE.Group();
    head.position.set(0, 1.27, 0);
    head.add(mesh(new THREE.SphereGeometry(0.17, 24, 18), skin, 0, 0, 0, 0.015));
    // Hair: a cap tipped back, so it sits above the brows in front and covers the back of the head.
    // One-sided with its own outline: the old open bowl showed its dark inside as a band across the face.
    const cap = mesh(new THREE.SphereGeometry(0.178, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hair, 0, 0.004, -0.004, 0.012);
    cap.rotation.x = -0.5;
    head.add(cap);
    const eyes = [-0.06, 0.06].map((x) => mesh(new THREE.SphereGeometry(0.022, 10, 8), toon("#111111"), x, 0.02, 0.155));
    const brows = new THREE.Group();
    [-0.06, 0.06].forEach((x, i) => { const b = mesh(box(0.06, 0.012, 0.01), toon("#2b1a12"), x, 0.075, 0.16); b.rotation.z = i ? -0.1 : 0.1; brows.add(b); });
    const mouth = mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 16, Math.PI), toon("#7a2a2a"), 0, -0.06, 0.158);
    mouth.rotation.z = Math.PI;
    head.add(...eyes, brows, mouth);
    c.add(...legs, body, armL, armR, head);
    c.position.set(this.walk.from, 0, 0.5);
    this.parts = { head, armR, armL, mouth, brows };
    this.scene.add(c);
  }

  /** The joke behind a wrong door, built facing +z. */
  private jokeProp(joke: Joke) {
    const g = new THREE.Group();
    if (joke === "gum") {
      const blob = mesh(new THREE.SphereGeometry(0.035, 14, 10), toon("#ff8ad8"), 0, 0, 0, 0.006);
      blob.scale.set(1.5, 0.8, 0.5);
      g.add(blob, mesh(new THREE.SphereGeometry(0.008, 8, 6), toon("#ffffff"), -0.02, 0.01, 0.015));
    } else if (joke === "mouse") {
      const grey = toon("#9aa0ad");
      const body = mesh(new THREE.SphereGeometry(0.04, 14, 10), grey, 0, 0, 0, 0.006);
      body.scale.set(1.4, 0.8, 0.6);
      const ears = [-0.03, 0.03].map((x) => { const e = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.006, 12), toon("#ffb3c7"), 0.035 + x * 0.4, 0.03, 0.01, 0.003); e.rotation.x = Math.PI / 2; return e; });
      const eyes = [0.045, 0.065].map((x) => mesh(box(0.012, 0.003, 0.004), toon("#1d1d1f"), x, 0.008, 0.024));
      const tail = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 6), grey, -0.07, -0.01, 0);
      tail.rotation.z = 1.2;
      const zz = labelPlane(0.06, 0.04, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.strokeStyle = "#1d1d1f"; c.lineWidth = 6; c.font = `900 ${h * 0.8}px system-ui, sans-serif`; c.textBaseline = "middle"; c.strokeText("Zz", 4, h / 2); c.fillText("Zz", 4, h / 2); }, 96, true);
      zz.position.set(0.05, 0.065, 0.02);
      zz.userData.zz = true;
      g.add(body, ...ears, ...eyes, tail, zz);
    } else {
      const coin = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 20), toon("#ffcf3a", { emissive: new THREE.Color("#5a3d00") }), 0, 0, 0, 0.004);
      coin.rotation.x = Math.PI / 2;
      g.userData.coin = coin;
      g.add(coin);
    }
    // Big enough to read from where you stand.
    g.scale.setScalar(1.7);
    return g;
  }

  /* ---------- What React asks for ---------- */

  setJob(job: Job) {
    this.job = job;
    this.rig.group.visible = false;
    this.rig = job.practice ? this.rigs.practice : this.rigs[job.machine];
    const rig = this.rig;
    rig.group.visible = true;
    this.looked = false;
    // The practice box waits in the air until the tour drops it in; no customer during practice.
    this.drop = job.practice ? -1 : 1;
    this.applyDrop();
    if (job.practice) { this.customer.visible = false; this.walk = { from: 3.6, to: 3.6, t: 1, leaving: true }; }
    this.jobParts.clear();
    this.interior.clear();
    this.interior.visible = rig.seeThrough;
    this.screws = [];
    this.plugs = [];
    this.sockets = [];
    this.snacks = [];
    this.dust = null;
    this.fuse = null;
    this.tapeJob = null;
    this.closing = null;
    this.swing = null;
    this.hammer.visible = false;
    this.panelT = this.panelGoal = 0;
    rig.panelPose(0);
    this.yaw = this.yawGoal = 0;
    drawSticker(rig.sticker, job.chip.sticker);
    this.screenState = { mode: "attract", text: "", coins: 0, note: "" };
    rig.drawScreen(this.screenState, 0);

    // Wrong doors shut, each with its joke behind it.
    for (const d of rig.doors) {
      d.open = d.goal = 0;
      d.swing?.(0);
      d.prop.clear();
      d.prop.visible = false;
      d.prop.userData.gone = false;
      d.prop.position.copy(d.propIn);
      const joke = job.doors.find((x) => x.id === d.id)?.joke;
      if (joke) d.prop.add(this.jokeProp(joke));
    }
    for (const row of rig.coils) for (const coil of row) { coil.rotation.set(0, 0, 0); coil.scale.set(1, 1, 1); }
    this.clawBend = this.clawGoal = 1;
    this.clawDropT = -1;
    this.claw.claw.bend(1);
    this.claw.claw.hub.position.y = 1.3;

    // Screws on the panel, each with its own head, big enough to read.
    const right = job.doors.find((d) => d.right)!.id;
    job.screws.forEach((head, index) => {
      const group = new THREE.Group();
      const spinner = new THREE.Group();
      // Every head is the same steel: only the slot tells them apart.
      const cap = mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.016, 24), toon("#c9ced9"), 0, 0, 0, 0.006);
      cap.rotation.x = Math.PI / 2;
      spinner.add(cap);
      const slotMat = toon("#1d1d22");
      const arms = head === "cross" ? [0, Math.PI / 2] : head === "flat" ? [0] : [0, Math.PI / 3, (2 * Math.PI) / 3];
      for (const a of arms) { const s = mesh(box(head === "flat" ? 0.078 : 0.066, 0.012, 0.004), slotMat, 0, 0, -0.009); s.rotation.z = a; spinner.add(s); }
      const thread = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8), toon("#9aa0ad"), 0, 0, 0.035);
      thread.rotation.x = Math.PI / 2;
      spinner.add(thread);
      group.add(spinner, hitArea(0.085));
      // Screws are built for the arcade's back; a front panel turns them round.
      if (rig.f > 0) group.rotation.y = Math.PI;
      const [x, y] = rig.screwSpots[index % rig.screwSpots.length];
      const home = new THREE.Vector3(x, y, rig.screwZ);
      group.position.copy(home);
      group.traverse((o) => { o.userData.index = index; o.userData.door = right; });
      this.jobParts.add(group);
      this.screws.push({ group, spinner, head, turned: 0, out: false, locked: true, fall: 0, velocity: new THREE.Vector3(), home });
    });

    if (job.cables.length) this.buildWiring(job);
    if (job.fuse) this.buildFuse();
    else if (job.machine === "arcade" && !job.practice) this.goodFuse();
    if (job.faults.includes("tape")) this.buildTape();
    if (job.machine === "vending") this.buildSnacks(job);
    if (job.jam) this.buildGear(job.jam);
    this.buildMess(job);
    this.setChipGlow(false);
  }

  /** Three sockets with colour rings, and three cables: some plugged in, some hanging loose. */
  private buildWiring(job: Job) {
    const { spots, f } = this.rig;
    const face = f < 0 ? Math.PI : 0;
    job.sockets.forEach((socket, i) => {
      const owner = job.cables.find((c) => c.socket === socket.id)!;
      const pos = spots.sockets[i].clone();
      const hole = mesh(box(0.07, 0.07, 0.016), toon("#0d0d12"), pos.x, pos.y, pos.z, 0.006);
      // Colour rings on the sockets match the cables.
      const ring = labelPlane(0.075, 0.075, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.lineWidth = w * 0.13;
        c.strokeStyle = owner.color;
        c.beginPath(); c.arc(w / 2, h / 2, w * 0.38, 0, Math.PI * 2); c.stroke();
      }, 128, true);
      ring.position.set(pos.x, pos.y, pos.z + f * 0.0095);
      ring.rotation.y = face;
      this.interior.add(hole, ring);
      this.sockets.push({ id: socket.id, pos });
    });
    job.cables.forEach((cable, i) => {
      const group = new THREE.Group();
      group.add(mesh(box(0.05, 0.05, 0.05), toon(cable.color), 0, 0, 0, 0.008), mesh(box(0.02, 0.02, 0.03), toon("#d8d8d8"), 0, 0, -f * 0.03), hitArea(0.06));
      group.traverse((o) => { o.userData.id = cable.id; });
      const anchor = spots.anchors[i].clone();
      const rest = spots.rests[i].clone();
      const socket = this.sockets.find((s) => s.id === cable.at);
      const target = socket ? socket.pos.clone().add(new THREE.Vector3(0, 0, f * 0.03)) : rest.clone();
      group.position.copy(target);
      const tube = new THREE.Mesh(new THREE.BufferGeometry(), toon(cable.color));
      this.interior.add(group, tube);
      const plug = { id: cable.id, color: cable.color, group, tube, anchor, rest, at: cable.at, target };
      this.plugs.push(plug);
      this.updateTube(plug);
    });
  }

  private fuseMesh(burnt: boolean) {
    const g = new THREE.Group();
    const glass = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 14), toon(burnt ? "#5b4a3a" : "#bfe8ff", { transparent: true, opacity: 0.9 }), 0, 0, 0, 0.006);
    glass.rotation.z = Math.PI / 2;
    const caps = [-0.055, 0.055].map((x) => { const m = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 14), toon("#d8d8d8"), x, 0, 0, 0.004); m.rotation.z = Math.PI / 2; return m; });
    g.add(glass, ...caps, hitArea(0.07));
    if (burnt) g.add(mesh(new THREE.SphereGeometry(0.012, 8, 6), toon("#111111"), 0, 0, this.rig.f * 0.012));
    return g;
  }
  private fuseHolder() {
    const { holder } = this.rig.spots.fuse, f = this.rig.f;
    return [-0.05, 0.05].map((dx) => mesh(box(0.025, 0.05, 0.03), toon("#c0c0c8"), holder.x + dx, holder.y, holder.z - f * 0.015, 0.005));
  }
  /** A burnt fuse in its holder, and a new one waiting on a ledge below it. */
  private buildFuse() {
    const { holder, spare } = this.rig.spots.fuse;
    const ledge = mesh(box(0.2, 0.02, 0.07), toon("#3b3355"), spare.x, spare.y - 0.03, spare.z - this.rig.f * 0.01, 0.006);
    const blown = this.fuseMesh(true), fresh = this.fuseMesh(false);
    blown.position.copy(holder);
    fresh.position.copy(spare);
    this.interior.add(...this.fuseHolder(), ledge, blown, fresh);
    this.fuse = { blown, spare: fresh, state: "blown", t: 0 };
  }
  /** The arcade's fuse is fine: it just sits in its holder. */
  private goodFuse() {
    const ok = this.fuseMesh(false);
    ok.position.copy(this.rig.spots.fuse.holder);
    this.interior.add(ok, ...this.fuseHolder());
  }

  /** A worn stretch of cable: bare copper that sparks. Three taps of tape wrap it up. */
  private buildTape() {
    const { a, b } = this.rig.spots.tape;
    const group = new THREE.Group();
    const dir = b.clone().sub(a), len = dir.length(), mid = a.clone().lerp(b, 0.5);
    const along = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const cable = mesh(new THREE.CylinderGeometry(0.014, 0.014, len * 1.5, 10), toon("#3a3f4a"), 0, 0, 0, 0.005);
    const copper = mesh(new THREE.CylinderGeometry(0.017, 0.017, len * 0.42, 10), toon("#e8954a", { emissive: new THREE.Color("#5a2a00") }), 0, 0, 0, 0.004);
    // A big touch target: the worn spot is small.
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len * 0.9, 8), new THREE.MeshBasicMaterial({ visible: false }));
    group.add(cable, copper, hit);
    group.position.copy(mid);
    group.quaternion.copy(along);
    const wraps = [-0.28, 0, 0.28].map((k) => { const w = mesh(new THREE.CylinderGeometry(0.022, 0.022, len * 0.16, 12), toon("#1d1d1f"), 0, k * len * 0.42 * 1.1, 0, 0.003); w.visible = false; group.add(w); return w; });
    this.interior.add(group);
    this.tapeJob = { group, copper, wraps, done: 0, mid };
  }
  private wrap() {
    const j = this.tapeJob;
    if (!j || j.done >= TAPE_WRAPS) return;
    j.wraps[j.done].visible = true;
    j.done++;
    if (j.done >= TAPE_WRAPS) j.copper.visible = false;
    this.burst(j.mid, j.done >= TAPE_WRAPS ? "#59e08a" : "#d8d8d8", 8, 0.8);
    this.events.tape?.(j.done);
  }

  /** The Robot's jammed gear: it trembles until a few gentle hammer taps free it. */
  private buildGear(taps: number) {
    const g = new THREE.Group();
    const f = this.rig.f;
    const gold = toon("#e2b54a");
    const wheel = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 20), gold, 0, 0, 0, 0.006);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel, mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 10), toon("#4c5266"), 0, 0, f * 0.01));
    (g.children[1] as THREE.Mesh).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const tooth = mesh(box(0.022, 0.026, 0.024), gold, Math.cos((i / 8) * Math.PI * 2) * 0.058, Math.sin((i / 8) * Math.PI * 2) * 0.058, 0, 0.003); tooth.rotation.z = (i / 8) * Math.PI * 2; g.add(tooth); }
    g.add(hitArea(0.09));
    const index = this.snacks.length;
    g.traverse((o) => { o.userData.snack = index; });
    const home = this.rig.spots.jam.clone();
    g.position.copy(home);
    this.interior.add(g);
    this.snacks.push({ group: g, home, tilt: 0, shelf: 0, slot: 0, taps, hits: 0, freed: false, fall: 0, v: new THREE.Vector3(), wob: 0, rest: home.clone(), gear: true });
  }

  /** The snacks on the spirals: one slot empty, one or two snacks stuck at the front. */
  private buildSnacks(job: Job) {
    const packet = (color: string) => {
      const g = new THREE.Group();
      g.add(mesh(box(0.11, 0.14, 0.025), toon(color), 0, 0, 0, 0.006));
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.035), new THREE.MeshBasicMaterial({ color: "#fffaf0" }));
      stripe.position.set(0, 0.02, 0.0135);
      g.add(stripe);
      return g;
    };
    VENDING.shelfY.forEach((shelfY, shelf) => VENDING.slotX.forEach((x, slot) => {
      if (job.empty.shelf === shelf && job.empty.slot === slot) return;
      const stuck = job.snacks.find((s) => s.shelf === shelf && s.slot === slot);
      const color = stuck?.color ?? snackColor(shelf, slot);
      const y = shelfY + 0.0075 + 0.07;
      for (const z of stuck ? [0.07, 0.15] : [0.07, 0.15, 0.23]) { const p = packet(color); p.position.set(x, y, z); this.interior.add(p); }
      if (!stuck) return;
      // The stuck one hangs off the end of its spiral, tipped forward: the clue, seen through the glass.
      const g = packet(color);
      g.add(hitArea(0.1));
      const index = this.snacks.length;
      g.traverse((o) => { o.userData.snack = index; });
      const home = new THREE.Vector3(x, y + 0.025, 0.285);
      g.position.copy(home);
      g.rotation.x = 0.42;
      this.interior.add(g);
      this.snacks.push({ group: g, home, tilt: 0.42, shelf, slot, taps: stuck.taps, hits: 0, freed: false, fall: 0, v: new THREE.Vector3(), wob: 0, rest: new THREE.Vector3(Math.max(-0.22, Math.min(0.06, x)) + index * 0.05, VENDING.floorY + 0.014, 0.27) });
    }));
  }

  /** Dust, crumbs…: the mess the blower clears. It covers job.dust of the board, from the bottom up. */
  private buildMess(job: Job) {
    const tex = canvasTexture(256, 512);
    const d = tex.ctx;
    if (job.mess === "crumbs") {
      // Crumbs: chunky bits on a light haze, so the snacks still show through.
      d.fillStyle = "rgba(200,160,100,0.28)"; d.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 700; i++) {
        d.fillStyle = ["#c08a4a", "#8a5a2b", "#e6c27a", "#6e4523"][i % 4];
        const x = (i * 73) % 256, y = (i * 131) % 512, s = 3 + (i % 6);
        d.save(); d.translate(x, y); d.rotate(i); d.fillRect(-s / 2, -s / 2, s, s * 0.7); d.restore();
      }
    } else if (job.mess === "fluff") {
      // Fluff and hair: soft white tufts and curly strands, light enough to see the eggs through.
      d.fillStyle = "rgba(255,255,255,0.14)"; d.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 70; i++) {
        const x = (i * 73) % 256, y = (i * 131) % 512;
        d.fillStyle = i % 3 ? "rgba(255,255,255,0.78)" : "rgba(230,220,240,0.8)";
        d.beginPath(); d.arc(x, y, 4 + (i % 4) * 2.5, 0, Math.PI * 2); d.fill();
      }
      d.lineWidth = 2.2; d.lineCap = "round";
      for (let i = 0; i < 140; i++) {
        const x = (i * 97) % 256, y = (i * 59) % 512;
        d.strokeStyle = ["#6e4523", "#2b1a12", "#c9a26b", "#8a8478"][i % 4];
        d.beginPath(); d.moveTo(x, y); d.bezierCurveTo(x + 14, y - 10, x - 8, y + 18, x + 12, y + 26); d.stroke();
      }
    } else if (job.mess === "mud") {
      // Mud splashes: brown blobs and drips.
      d.fillStyle = "rgba(120,85,50,0.45)"; d.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 260; i++) { d.fillStyle = ["#6e4523", "#8a5a2b", "#5a3a1a"][i % 3]; d.beginPath(); d.ellipse((i * 73) % 256, (i * 131) % 512, 6 + (i % 5) * 3, 4 + (i % 3) * 3, i, 0, Math.PI * 2); d.fill(); }
    } else if (job.mess === "grounds") {
      // Coffee grounds: dark speckles everywhere.
      d.fillStyle = "rgba(70,40,25,0.5)"; d.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 1400; i++) { d.fillStyle = ["#2a1a10", "#4a2a18", "#6e3b1f"][i % 3]; d.fillRect((i * 73) % 256, (i * 131) % 512, 2 + (i % 3), 2 + (i % 2)); }
    } else {
      d.fillStyle = `rgba(160,140,115,${0.55 + job.dust * 0.4})`;
      d.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 900; i++) { d.fillStyle = `rgba(${120 + (i % 60)},${105 + (i % 40)},90,${0.25 + (i % 5) * 0.08})`; d.beginPath(); d.arc((i * 73) % 256, (i * 131) % 512, 2 + (i % 7), 0, Math.PI * 2); d.fill(); }
    }
    // The top of the board is already clean on a light job.
    const cells = Array(16 * 32).fill(false);
    const cleanRows = Math.round((1 - job.dust) * 32);
    if (cleanRows) {
      d.save(); d.globalCompositeOperation = "destination-out";
      const fade = d.createLinearGradient(0, cleanRows * 16 - 24, 0, cleanRows * 16 + 8);
      fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
      d.fillStyle = "#000"; d.fillRect(0, 0, 256, Math.max(0, cleanRows * 16 - 24));
      d.fillStyle = fade; d.fillRect(0, cleanRows * 16 - 24, 256, 32);
      d.restore();
      for (let i = 0; i < cleanRows * 16; i++) cells[i] = true;
    }
    tex.texture.needsUpdate = true;
    const b = this.rig.board;
    const dustMesh = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, depthWrite: false }));
    dustMesh.position.copy(b.center);
    dustMesh.rotation.y = this.rig.f < 0 ? Math.PI : 0;
    this.interior.add(dustMesh);
    this.dust = { mesh: dustMesh, ctx: d, texture: tex.texture, cells, done: false };
  }

  setWork(work: Work) {
    this.work = work;
    this.setChipGlow(work === "chip");
    if (work !== "wires") this.showHint(null);
    if (this.dust && (work === "wires" || work === "fuse" || work === "snack" || work === "jam" || work === "claw" || work === "tape" || work === "chip")) this.dust.mesh.visible = false;
  }
  setTool(tool: ToolKind) { this.tool = tool; }
  /** The clue that shows the way to the right door. */
  setClue(on: boolean) { this.clue = on; }
  /** Looking around: a quarter turn left (-1) or right (1). */
  turn(dir: number) { if (this.view === "orbit") this.yawGoal += dir * Math.PI / 2; }

  /** The bench, floor, lights and decorations the student has bought. */
  setLook(look: Look) {
    this.look = look;
    const r = this.room;
    r.floor.map = r.floors[look.floor] ?? r.floors["floor-checker"];
    r.floor.needsUpdate = true;
    const bench = { "bench-steel": ["#b8c0cf", "#5d6577"], "bench-gamer": ["#1b1b22", "#111116"] }[look.bench] ?? ["#8a5a35", "#5e3a1f"];
    r.benchTops.color.set(bench[0]);
    r.benchLegs.color.set(bench[1]);
    for (const o of r.glow) o.visible = look.bench === "bench-gamer";
    for (const o of r.strips) o.visible = look.light === "light-neon";
    const l = this.lights;
    const light = {
      "light-cool": { sky: "#eef4ff", ground: "#3a4a6a", hemi: 1.6, lamp: "#e0ecff", power: 7, bg: "#1e2a40", neon: 0 },
      "light-neon": { sky: "#f6e8ff", ground: "#3a2a6a", hemi: 1.1, lamp: "#ffd9f4", power: 4, bg: "#1a1030", neon: 6 },
      "light-disco": { sky: "#fff4e0", ground: "#4a3a6a", hemi: 1.2, lamp: "#ff4fd8", power: 8, bg: "#160d26", neon: 3 },
    }[look.light] ?? { sky: "#fff4e0", ground: "#4a3a6a", hemi: 1.4, lamp: "#ffd9a0", power: 6, bg: "#2b2140", neon: 0 };
    l.hemi.color.set(light.sky); l.hemi.groundColor.set(light.ground); l.hemi.intensity = light.hemi;
    l.lamp.color.set(light.lamp); l.lamp.intensity = light.power;
    l.pink.intensity = l.cyan.intensity = light.neon;
    (this.scene.background as THREE.Color).set(light.bg);
    (this.scene.fog as THREE.Fog).color.set(light.bg);
    for (const [id, o] of Object.entries(this.decor)) o.visible = look.decor.includes(id);
  }

  setView(view: View) { this.place(view, false); }

  /** The tutorial's tour: the camera visits a spot, a ring or a label marks it. "box" drops the practice box in. */
  tour(spot: TourSpot) {
    const portrait = this.camera.aspect < 1;
    const back = portrait ? 1.35 : 1;
    const spots: Record<TourSpot, { cam: Spot; tag: [number, number, number] | null; ring: boolean }> = {
      wide: { cam: { pos: [0.4, 1.7, 4.4 * back], look: [0, 0.9, 0] }, tag: null, ring: false },
      machine: { cam: { pos: [1.2, 2.3, 3.4 * back], look: [0, -0.35, 0] }, tag: [0, 0.35, 0], ring: true },
      bench: { cam: { pos: [0.9, 1.6, 1.7 * back], look: [-0.3, 0.95, -1.6] }, tag: [0, 1.15, -1.38], ring: false },
      box: { cam: this.rig.views(portrait).front, tag: null, ring: false },
    };
    const s = spots[spot];
    this.tourSpot = s.cam;
    this.tagAt = s.tag ? new THREE.Vector3(...s.tag) : null;
    this.ring.visible = s.ring;
    if (spot === "box" && this.drop < 0) this.drop = 0;
    this.place("tour", false);
  }
  private applyDrop() {
    const e = Math.max(0, this.drop);
    // Falls, then two little bounces.
    const y = this.drop < 0 ? 0 : e < 0.55 ? 2.4 * (1 - (e / 0.55) ** 2) : e < 0.8 ? Math.sin(((e - 0.55) / 0.25) * Math.PI) * 0.12 : Math.sin(((e - 0.8) / 0.2) * Math.PI) * 0.04;
    const hidden = this.drop < 0;
    for (const o of [this.rig.group, this.jobParts, this.interior]) o.position.y = y;
    this.rig.group.visible = !hidden;
    this.jobParts.visible = !hidden;
  }

  private orbitSpot(): Spot {
    const o = this.rig.orbit;
    const r = this.camera.aspect < 1 ? o.rp : o.r;
    return { pos: [Math.sin(this.yaw) * r, o.y, Math.cos(this.yaw) * r], look: [0, o.look, 0] };
  }
  private place(view: View, instant: boolean) {
    this.view = view;
    if (view !== "tour") { this.tagAt = null; this.ring.visible = false; }
    const s = view === "orbit" ? this.orbitSpot() : view === "tour" ? this.tourSpot : this.rig.views(this.camera.aspect < 1)[view];
    // Already there (a new step with the same view): no move, so the hands are never blocked for nothing.
    if (!instant && this.camT >= 1 && this.camera.position.distanceTo(new THREE.Vector3(...s.pos)) < 0.01) return;
    this.camFrom.pos.copy(this.camera.position);
    this.camFrom.look.copy(this.camLook);
    this.camTo.pos.set(...s.pos);
    this.camTo.look.set(...s.look);
    this.camT = instant ? 1 : 0;
    if (instant) { this.camera.position.copy(this.camTo.pos); this.camLook.copy(this.camTo.look); this.camera.lookAt(this.camLook); this.updateWalls(); }
  }
  /** Walls the camera has moved behind are hidden, so they never block the machine. */
  private updateWalls() {
    this.walls.front.visible = this.camera.position.z > -1.4;
    this.walls.back.visible = this.camera.position.z < 1.4;
  }

  setScreen(mode: ScreenMode, text = "", coins = 0, note = "") {
    this.screenState = { mode, text, coins, note };
    this.rig.drawScreen(this.screenState, this.clock.getElapsedTime());
  }
  setMarquee(on: boolean) { this.rig.marquee(on); }

  setMood(mood: Mood) { this.mood = mood; this.moodAt = this.clock.getElapsedTime(); }
  walkIn() { this.walk = { from: 3.2, to: 0.92, t: 0, leaving: false }; this.customer.visible = true; this.setMood("idle"); }
  leave() { this.walk = { from: this.customer.position.x, to: 3.6, t: 0, leaving: true }; }
  insertCoins(n: number, done: () => void) { this.coinQueue = { n, t: 0, done, dropped: 0 }; }
  /** How the machine on the bench is worked: coins, or a tap on a button. */
  token() { return this.rig.token; }
  /** The fixed claw dives into the eggs and comes back up. */
  clawDrop() { if (this.rig.id === "claw") this.clawDropT = 0; }

  /** Moves one step forward without the hands-on part (teacher skip). */
  complete(work: Work) {
    const f = this.rig.f;
    if (work === "find") this.events.door?.(this.job!.doors.find((d) => d.right)!.id, true);
    if (work === "screws") this.screws.forEach((s, i) => { if (!s.out) { s.out = true; s.locked = false; s.turned = this.fullTurns(); s.fall = 0.001; s.velocity.set((Math.random() - 0.5) * 0.6, 0.5, f * 0.6); this.events.screwOut?.(i); } });
    if (work === "panel") this.removePanel();
    if (work === "dust" && this.dust) { this.dust.done = true; this.dust.mesh.visible = false; this.events.dust?.(1); }
    if (work === "wires") for (const plug of this.plugs) { const cable = this.job!.cables.find((c) => c.id === plug.id)!; if (plug.at !== cable.socket) this.seat(plug, cable.socket); }
    if (work === "fuse" && this.fuse) { this.fuse.state = "in"; this.fuse.blown.visible = false; this.events.fuseIn?.(); }
    if (work === "snack" || work === "jam") { this.snacks.forEach((s) => this.free(s)); this.events.hammer?.("good", true, 0); }
    if (work === "tape" && this.tapeJob) { while (this.tapeJob.done < TAPE_WRAPS) this.wrap(); }
    if (work === "claw" && this.clawGoal) { this.clawGoal = 0; this.events.clawFixed?.(); }
    if (work === "close") this.putPanelBack();
    if (work === "lock") this.screws.forEach((s, i) => { if (!s.locked) { s.turned = 0; s.locked = true; this.events.screwLocked?.(i); } });
  }

  showHint(cable: string | null) {
    if (!cable || !this.job) { this.hintAt = null; this.hint.visible = false; return; }
    const target = this.job.cables.find((c) => c.id === cable)!.socket;
    const s = this.sockets.find((x) => x.id === target)!;
    this.hintAt = s.pos.clone().add(new THREE.Vector3(0, 0, this.rig.f * 0.03));
    this.hint.visible = true;
  }

  plugged(): Record<string, string | null> { return Object.fromEntries(this.plugs.map((p) => [p.id, p.at])); }

  /** Screen positions of the hands-on parts: for the gesture hints and the local QA scripts. */
  points(): Points {
    const at = (v: THREE.Vector3) => this.screenPos(v);
    const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
    const b = this.rig.board, f = this.rig.f;
    const corner = (sx: number, sy: number) => at(b.center.clone().add(new THREE.Vector3(sx * (b.w / 2 - 0.02) * -f, sy * (b.h / 2 - 0.05), 0)));
    const cam = this.camera.position;
    return {
      screws: this.screws.map((s) => ({ ...at(world(s.group)), out: s.out, locked: s.locked, head: s.head })),
      plugs: this.plugs.map((p) => ({ id: p.id, ...at(world(p.group)), at: p.at })),
      sockets: this.sockets.map((s) => ({ id: s.id, ...at(s.pos.clone().add(new THREE.Vector3(0, 0, f * 0.05))) })),
      doors: this.rig.doors.map((d) => ({ id: d.id, ...at(d.center), facing: d.normal.dot(cam.clone().sub(d.center).normalize()) > 0.35, right: !d.swing })),
      snacks: this.snacks.map((s) => ({ ...at(world(s.group)), done: s.freed })),
      claw: this.rig.id === "claw" ? at(world(this.claw.claw.finger).add(new THREE.Vector3(0, -0.05, 0))) : null,
      tape: this.tapeJob ? at(this.tapeJob.mid) : null,
      chip: at(world(this.rig.chip)), panel: at(world(this.rig.panel)), board: at(b.center),
      boardA: corner(1, 1), boardB: corner(-1, -1), center: at(new THREE.Vector3(0, 1, 0)),
      fuse: this.fuse ? { blown: at(world(this.fuse.blown)), spare: at(world(this.fuse.spare)), state: this.fuse.state } : null,
      moving: this.camT < 1 || Math.abs(this.panelT - this.panelGoal) > 0.001 || (this.view === "orbit" && Math.abs(this.yaw - this.yawGoal) > 0.05),
    };
  }

  /* ---------- Drawing ---------- */

  private setChipGlow(on: boolean) { this.chipMaterial.emissive.set(on ? "#3a2a00" : "#000000"); }

  private updateTube(plug: Plug) {
    const end = plug.group.position.clone().add(new THREE.Vector3(0, -0.03, 0));
    const mid = plug.anchor.clone().lerp(end, 0.5);
    mid.y = Math.min(plug.anchor.y, end.y) - 0.12;
    mid.z += this.rig.f * 0.05;
    plug.tube.geometry.dispose();
    plug.tube.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([plug.anchor, mid, end]), 24, 0.012, 8, false);
  }

  private burst(at: THREE.Vector3, color: string, count = 14, speed = 1.4) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(box(0.012, 0.012, 0.012), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
      m.position.copy(at);
      this.scene.add(m);
      this.sparks.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed + this.rig.f * 0.4), life: 0.6 + Math.random() * 0.3 });
    }
  }
  private puff(at: THREE.Vector3) {
    const m = new THREE.Mesh(this.smoke, new THREE.MeshBasicMaterial({ color: "#a59fb3", transparent: true, opacity: 0.6, depthWrite: false }));
    m.position.copy(at);
    this.scene.add(m);
    this.sparks.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.32 + Math.random() * 0.1, -0.05), life: 2.6, smoke: true });
  }
  /** A big shower of sparks over the machine: the power-on payoff. */
  celebrate() {
    const small = this.rig.id === "practice";
    for (let i = 0; i < 4; i++) this.burst(new THREE.Vector3((i - 1.5) * (small ? 0.16 : 0.25), small ? 1.1 : 1.95, small ? 0.25 : 0.4), ["#ffd23f", "#ff5fa2", "#3dd6ff", "#59e08a"][i], 24);
  }

  /* ---------- The frame ---------- */

  private fullTurns() { return (this.job?.turns ?? 1) * Math.PI * 2; }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.getElapsedTime();

    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / 1.1);
      const e = this.camT < 0.5 ? 4 * this.camT ** 3 : 1 - (-2 * this.camT + 2) ** 3 / 2;
      // Swing around the side of the machine instead of through it.
      const pos = this.camFrom.pos.clone().lerp(this.camTo.pos, e);
      const crossing = Math.sign(this.camFrom.pos.z) !== Math.sign(this.camTo.pos.z) && Math.abs(this.camFrom.pos.x) < 2 && Math.abs(this.camTo.pos.x) < 2;
      if (crossing) pos.x += Math.sin(e * Math.PI) * 3.2;
      this.camera.position.copy(pos);
      this.camLook.copy(this.camFrom.look).lerp(this.camTo.look, e);
      // The customer waits out of shot while you work.
      if (this.view !== "front" && this.camT > 0.3) this.customer.visible = false;
      if (this.view === "front" && this.camT > 0.5 && !this.walk.leaving && !this.job?.practice) this.customer.visible = true;
    } else if (this.view === "orbit") {
      this.yaw += (this.yawGoal - this.yaw) * Math.min(1, dt * 7);
      const s = this.orbitSpot();
      this.camera.position.set(...s.pos);
      this.camLook.set(...s.look);
    }
    this.updateWalls();
    this.camera.lookAt(this.camLook.x + Math.sin(t * 0.4) * 0.01, this.camLook.y + Math.sin(t * 0.3) * 0.006, this.camLook.z);

    // The machine's screen only redraws while you can see it.
    if ((this.view === "front" || this.view === "orbit") && Math.floor(t * 10) !== Math.floor((t - dt) * 10)) this.rig.drawScreen(this.screenState, t);
    this.animateCustomer(dt, t);
    if (this.drop >= 0 && this.drop < 1) {
      this.drop = Math.min(1, this.drop + dt / 1.1);
      this.applyDrop();
      if (this.drop >= 1) {
        // A puff of dust and a shower of sparkles as it lands.
        for (let i = 0; i < 3; i++) this.burst(new THREE.Vector3((i - 1) * 0.3, 0.62, 0.1), ["#e9dcc4", "#ffd23f", "#ff5fa2"][i], 16, 1.2);
        this.events.landed?.();
      }
    }
    if (this.ring.visible) { this.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.06); (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(t * 4) * 0.3; }
    this.animateScrews(dt);
    this.animatePanel(dt);
    this.animateFuse(dt);
    this.animateDoors(dt, t);
    this.animateSnacks(dt, t);
    this.animateHammer(dt, t);
    this.clueTick(dt);
    this.rig.tick?.(t);
    // The worn cable crackles until it's taped.
    if (this.tapeJob && this.tapeJob.done < TAPE_WRAPS && Math.floor(t / 0.9) !== Math.floor((t - dt) / 0.9) && this.interior.visible) this.burst(this.tapeJob.mid, "#ffd23f", 6, 0.8);
    if (this.rig.id === "claw") {
      const k = this.claw.claw;
      if (this.clawBend !== this.clawGoal) { this.clawBend = Math.max(this.clawGoal, this.clawBend - dt * 2.5); k.bend(this.clawBend); }
      // The clue: a stuck claw twitches now and then.
      k.hub.rotation.z = this.clue && this.clawGoal ? Math.sin(t * 22) * 0.12 * Math.max(0, Math.sin(t * 1.3)) : 0;
      if (this.clawDropT >= 0) {
        this.clawDropT += dt;
        const e = Math.min(1, this.clawDropT / 2.4);
        k.hub.position.y = 1.3 - Math.sin(e * Math.PI) * 0.2;
        if (e >= 1) this.clawDropT = -1;
      }
    }
    for (const plug of this.plugs) {
      if (this.drag?.kind === "plug" && this.drag.id === plug.id) continue;
      if (plug.group.position.distanceTo(plug.target) > 0.0005) { plug.group.position.lerp(plug.target, Math.min(1, dt * 12)); this.updateTube(plug); }
      plug.group.rotation.z = plug.at ? 0 : Math.sin(t * 2 + plug.anchor.x * 9) * 0.12;
    }
    if (this.hintAt) { this.hint.position.copy(this.hintAt); this.hint.rotation.y = this.rig.f < 0 ? Math.PI : 0; this.hint.scale.setScalar(1 + Math.sin(t * 6) * 0.15); }
    if (this.work === "chip") this.chipMaterial.emissive.setRGB(0.25 + Math.sin(t * 5) * 0.2, 0.18 + Math.sin(t * 5) * 0.14, 0);
    if (this.decor.cat?.visible) (this.decor.cat.userData.tail as THREE.Mesh).rotation.x = Math.sin(t * 2.4) * 0.5;
    if (this.decor.neon?.visible) ((this.decor.neon as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.random() > 0.985 ? 0.4 : 1;
    if (this.decor.radio?.visible) { const beat = 1 + Math.abs(Math.sin(t * 7.5)) * 0.08; this.decor.radio.scale.set(1, beat, 1); (this.decor.radio.userData.speaker as THREE.Mesh).scale.setScalar(1 + Math.abs(Math.sin(t * 15)) * 0.15); }
    if (this.look.light === "light-disco") { this.lights.lamp.color.setHSL((t * 0.35) % 1, 0.9, 0.6); this.lights.pink.color.setHSL((t * 0.35 + 0.33) % 1, 0.9, 0.6); this.lights.cyan.color.setHSL((t * 0.35 + 0.66) % 1, 0.9, 0.6); }

    // The screwdriver sits on the screw being turned and spins with it.
    const d = this.drag;
    if (d?.kind === "screw") {
      const s = this.screws[d.index];
      this.driver.visible = true;
      this.driver.position.copy(s.group.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0, this.rig.f * 0.012));
      this.driver.rotation.set(0, this.rig.f > 0 ? Math.PI : 0, 0);
      (this.driver.userData.spin as THREE.Group).rotation.z = s.spinner.rotation.z;
    } else this.driver.visible = false;
    if (d?.kind !== "dust") this.blower.visible = false;

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.smoke) {
        s.m.position.addScaledVector(s.v, dt);
        s.m.scale.setScalar(1 + (2.6 - s.life) * 1.1);
        (s.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, s.life / 2.6) * 0.6;
      } else {
        s.v.y -= 3.2 * dt;
        s.m.position.addScaledVector(s.v, dt);
        s.m.scale.setScalar(Math.max(0.01, s.life * 1.6));
      }
      if (s.life <= 0) { this.scene.remove(s.m); if (!s.smoke) s.m.geometry.dispose(); (s.m.material as THREE.Material).dispose(); this.sparks.splice(i, 1); }
    }
    if (this.closing) {
      this.closing.t += dt;
      if (this.closing.t > 0.9) { if (!this.rig.seeThrough) this.interior.visible = false; const done = this.closing.done; this.closing = null; done(); }
    }
    this.renderer.render(this.scene, this.camera);
    this.placeBubble();
    if (this.tag) {
      const at = this.tagAt && this.camT >= 1 ? this.screenPos(this.tagAt) : null;
      this.tag.style.opacity = at ? "1" : "0";
      if (at) this.tag.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
    }
  }

  private placeBubble() {
    if (!this.bubble) return;
    const head = this.parts.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.32, 0));
    const p = head.project(this.camera);
    const w = this.host.clientWidth, h = this.host.clientHeight;
    const visible = this.view === "front" && p.z < 1 && this.customer.visible;
    this.bubble.style.opacity = visible ? "1" : "0";
    const x = (p.x * 0.5 + 0.5) * w, y = (-p.y * 0.5 + 0.5) * h;
    if (w > h) {
      // Landscape: the bubble floats beside the face, on the side away from the machine, its tail at the mouth.
      const face = this.parts.head.getWorldPosition(new THREE.Vector3());
      const c = face.clone().project(this.camera), edge = face.clone().add(new THREE.Vector3(0.24, 0, 0)).project(this.camera);
      const fy = (-c.y * 0.5 + 0.5) * h, ex = (edge.x * 0.5 + 0.5) * w;
      // A narrow gap still works: the words wrap onto more lines.
      const room = w - 14 - (ex + 14);
      if (room >= 150) {
        this.bubble.dataset.side = "beside";
        // Kept below the coins and the menu, and above the toolbox.
        this.bubble.style.transform = `translate(${Math.round(ex + 14)}px, ${Math.round(Math.max(150, Math.min(h - 170, fy)))}px)`;
        this.bubble.style.setProperty("--room", `${Math.round(room)}px`);
        return;
      }
    }
    // Near the right edge the bubble opens to the left.
    this.bubble.dataset.side = (p.x * 0.5 + 0.5) > 0.6 ? "left" : "right";
    this.bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  private animateCustomer(dt: number, t: number) {
    const c = this.customer;
    const { head, armR, armL, mouth, brows } = this.parts;
    let walking = false;
    if (this.walk.t < 1) {
      this.walk.t = Math.min(1, this.walk.t + dt / 1.5);
      const e = 1 - (1 - this.walk.t) ** 2;
      c.position.x = this.walk.from + (this.walk.to - this.walk.from) * e;
      walking = this.walk.t < 1;
      if (this.walk.t >= 1 && this.walk.leaving) c.visible = false;
    }
    c.rotation.y = walking ? (this.walk.leaving ? Math.PI / 2 : -Math.PI / 2) : -0.6;
    const since = t - this.moodAt;
    let bob = walking ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 2) * 0.008;
    head.rotation.set(0, 0, 0);
    armL.rotation.set(walking ? Math.sin(t * 9) * 0.6 : 0, 0, 0.16);
    armR.rotation.set(walking ? -Math.sin(t * 9) * 0.6 : 0, 0, -0.16);
    brows.position.y = 0;
    brows.children.forEach((b, i) => { b.rotation.z = i ? -0.1 : 0.1; });
    mouth.rotation.z = Math.PI;
    if (this.mood === "angry") {
      head.rotation.z = Math.sin(t * 18) * 0.12 * Math.max(0, 1 - since / 1.6);
      bob += since < 0.6 ? Math.abs(Math.sin(since * 16)) * 0.08 : 0;
      brows.children.forEach((b, i) => { b.rotation.z = i ? 0.45 : -0.45; });
      mouth.rotation.z = 0;
      armL.rotation.z = 0.9 + Math.sin(t * 10) * 0.2;
      armR.rotation.z = -0.9 - Math.sin(t * 10) * 0.2;
    }
    if (this.mood === "happy") {
      bob += Math.abs(Math.sin(since * 7)) * 0.16 * Math.max(0.25, 1 - since / 3);
      armL.rotation.z = 2.6 + Math.sin(t * 12) * 0.25;
      armR.rotation.z = -2.6 - Math.sin(t * 12) * 0.25;
      brows.position.y = 0.012;
    }
    c.position.y = bob;
    if (this.mood === "idle" && !walking) head.rotation.y = Math.sin(t * 0.7) * 0.25;

    const q = this.coinQueue;
    if (q) {
      q.t += dt;
      const each = 0.55;
      const k = q.t / each;
      const i = Math.floor(k), f = k - i;
      armL.rotation.x = -1.3 - Math.sin(Math.min(1, f) * Math.PI) * 0.3;
      armL.rotation.z = 0.35;
      if (i < q.n) {
        const hand = new THREE.Vector3(0, -0.37, 0).applyMatrix4(armL.matrixWorld);
        const p = hand.clone().lerp(this.rig.slot, Math.min(1, f * 1.4));
        p.y += Math.sin(Math.min(1, f * 1.4) * Math.PI) * 0.12;
        this.flyingCoin.position.copy(p);
        this.flyingCoin.rotation.set(Math.PI / 2, t * 10, 0);
        this.flyingCoin.visible = f < 0.72 && this.rig.token === "coin";
        if (f >= 0.72 && q.dropped <= i) { q.dropped = i + 1; this.events.coin?.(); this.screenState.coins = q.dropped; this.rig.drawScreen(this.screenState, t); }
      } else {
        this.flyingCoin.visible = false;
        if (q.t > q.n * each + 0.35) { this.coinQueue = null; q.done(); }
      }
    }
  }

  private animateScrews(dt: number) {
    const full = this.fullTurns(), f = this.rig.f;
    for (const s of this.screws) {
      if (!s.out || s.fall <= 0) {
        s.spinner.rotation.z = -s.turned;
        s.group.position.copy(s.home);
        s.group.position.z += f * Math.min(1, s.turned / full) * 0.05;
        continue;
      }
      s.fall += dt;
      s.velocity.y -= 4 * dt;
      s.group.position.addScaledVector(s.velocity, dt);
      s.group.rotation.x += dt * 9;
      if (s.group.position.y < 0.02) { s.group.position.y = 0.02; s.velocity.multiplyScalar(0.4); s.velocity.y = Math.abs(s.velocity.y) * 0.3; }
      if (s.fall > 1.6) s.group.visible = false;
    }
  }

  private animatePanel(dt: number) {
    const goal = this.panelGoal;
    if (Math.abs(this.panelT - goal) < 0.001) return;
    this.panelT += Math.sign(goal - this.panelT) * Math.min(Math.abs(goal - this.panelT), dt * 1.4);
    this.rig.panelPose(this.panelT);
  }

  private animateFuse(dt: number) {
    const f = this.fuse;
    if (!f) return;
    if (f.state !== "blown" && f.blown.visible) {
      f.t += dt;
      f.blown.position.y -= dt * 1.4 * (1 + f.t * 3);
      f.blown.position.z += this.rig.f * dt * 0.4;
      f.blown.rotation.z += dt * 8;
      if (f.blown.position.y < 0.05) f.blown.visible = false;
    }
    if (f.state === "in") f.spare.position.lerp(this.rig.spots.fuse.holder, Math.min(1, dt * 10));
  }

  /** Wrong doors swing open on their joke, wait, and close by themselves. */
  private animateDoors(dt: number, t: number) {
    for (const d of this.rig.doors) {
      if (!d.swing) continue;
      if (d.goal === 1 && d.open >= 1 && t > d.shutAt) d.goal = 0;
      if (d.open !== d.goal) {
        d.open = Math.max(0, Math.min(1, d.open + Math.sign(d.goal - d.open) * dt * 3));
        d.swing(d.open);
        d.prop.position.lerpVectors(d.propIn, d.propOut, d.open);
        // The lost coin is yours: once the door has shut it is gone.
        if (d.open === 0 && d.prop.children[0]?.userData.coin) d.prop.userData.gone = true;
      }
      // The joke only shows while its door is open, so it never pokes through a shut door.
      d.prop.visible = d.open > 0.05 && !d.prop.userData.gone;
      const coin = d.prop.children[0]?.userData.coin as THREE.Mesh | undefined;
      if (coin) coin.rotation.z = t * 6;
      d.prop.children[0]?.children.forEach((o) => { if (o.userData.zz) o.position.y = 0.065 + Math.sin(t * 3) * 0.008; });
    }
  }

  private free(s: StuckSnack) {
    if (s.freed) return;
    s.freed = true;
    s.v.set(0, 0.35, 0.12);
  }
  private animateSnacks(dt: number, t: number) {
    for (const s of this.snacks) {
      const g = s.group;
      if (!s.freed) {
        // A stuck snack trembles a little: the clue. A hammer tap shakes it hard.
        s.wob = Math.max(0, s.wob - dt * 2.5);
        g.position.copy(s.home);
        if (s.gear) g.rotation.set(0, 0, Math.sin(t * 41) * 0.12 * s.wob + Math.sin(t * 9) * 0.03);
      else g.rotation.set(s.tilt + Math.sin(t * 34) * 0.14 * s.wob, 0, Math.sin(t * 2.2 + s.slot) * 0.06 + Math.sin(t * 41) * 0.1 * s.wob);
        continue;
      }
      // A freed gear turns in place; a freed snack falls.
      if (s.gear) { g.position.copy(s.home); g.rotation.set(0, 0, g.rotation.z - dt * 6); continue; }
      if (s.fall > 2) continue;
      s.fall += dt;
      s.v.y -= 4.5 * dt;
      g.position.addScaledVector(s.v, dt);
      g.position.x += (s.rest.x - g.position.x) * Math.min(1, dt * 3);
      g.position.z += (s.rest.z - g.position.z) * Math.min(1, dt * 3);
      g.rotation.x += (-Math.PI / 2 - g.rotation.x) * Math.min(1, dt * 6);
      if (g.position.y < s.rest.y) { g.position.y = s.rest.y; s.v.set(0, Math.abs(s.v.y) * 0.25, 0); }
    }
  }

  /** The hammer: it leans back while you hold, and swings when you let go. */
  private animateHammer(dt: number, t: number) {
    const d = this.drag, f = this.rig.f;
    const meter = this.hammerMeter;
    if (d?.kind === "hammer") {
      d.power = this.power(d.t0);
      const s = this.snacks[d.index];
      this.hammer.visible = true;
      this.hammer.position.copy(s.group.position).add(new THREE.Vector3(0.16, -0.16, f * 0.08));
      this.hammer.rotation.set(0, 0, -(0.15 + d.power * 1.3));
      if (meter) { meter.style.setProperty("--p", d.power.toFixed(3)); meter.dataset.on = "1"; }
      return;
    }
    if (meter && meter.dataset.on) meter.dataset.on = "";
    const sw = this.swing;
    if (!sw) { this.hammer.visible = false; return; }
    sw.t += dt;
    this.hammer.rotation.z = sw.from + (0.75 - sw.from) * Math.min(1, sw.t / 0.12);
    if (!sw.hit && sw.t >= 0.12) { sw.hit = true; this.strike(sw.index, sw.power); }
    if (sw.t > 0.45) { this.swing = null; this.hammer.visible = false; }
  }
  private strike(index: number, power: number) {
    const s = this.snacks[index];
    if (!s || s.freed) return;
    const result = hammerHit(power);
    const at = s.group.getWorldPosition(new THREE.Vector3());
    if (result === "soft") s.wob = 0.35;
    if (result === "good") {
      s.hits++;
      s.wob = 1;
      this.burst(at, "#e6c27a", 6, 0.8);
      if (s.hits >= s.taps) this.free(s);
    }
    if (result === "hard") {
      // Too hard: the spiral bends (a gear's teeth chip) and bits fly. It stays stuck.
      s.wob = 1;
      this.burst(at, s.gear ? "#ffd23f" : "#bfe8ff", 22, 1.6);
      const coil = this.rig.coils[s.shelf]?.[s.slot];
      if (coil) { coil.rotation.z = 0.3; coil.scale.set(1, 0.8, 1); }
    }
    this.events.hammer?.(result, s.freed, this.snacks.filter((x) => !x.freed).length);
  }

  /** How hard the hammer will hit: it winds up over 1.4 seconds of holding. */
  private power(t0: number) { return Math.min(1, (performance.now() - t0) / 1400); }

  /** The clue: sparks out of the top of the panel that hides the fault, and smoke rising behind it. */
  private clueTick(dt: number) {
    if (!this.clue || this.rig.id === "vending" || this.rig.id === "practice") return;
    const before = this.clueT;
    this.clueT += dt;
    const b = this.rig.board, f = this.rig.f, top = b.center.y + b.h / 2, x = b.center.x;
    if (Math.floor(this.clueT / 0.5) !== Math.floor(before / 0.5)) this.puff(new THREE.Vector3(x + (Math.random() - 0.5) * 0.3, top + 0.2, this.rig.plane + f * 0.15));
    if (Math.floor(this.clueT / 1.1) !== Math.floor(before / 1.1)) this.burst(new THREE.Vector3(x + (Math.random() - 0.5) * b.w * 0.8, top, this.rig.plane + f * 0.08), "#ffd23f", 7, 1.1);
  }

  private removePanel() {
    if (this.panelGoal === 1) return;
    this.panelGoal = 1;
    this.interior.visible = true;
    this.events.panelOff?.();
  }

  /** The panel goes back on; its screws wait, loose, to be locked. */
  private putPanelBack() {
    if (this.panelGoal === 0 || this.closing) return;
    this.panelGoal = 0;
    this.closing = { t: 0, done: () => {
      const full = this.fullTurns();
      this.screws.forEach((s) => { s.group.rotation.set(0, this.rig.f > 0 ? Math.PI : 0, 0); s.group.visible = true; s.out = false; s.fall = 0; s.locked = false; s.turned = full; });
      this.events.panelOn?.();
    } };
  }

  /* ---------- Hands-on input ---------- */

  private pointer(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1, px: e.clientX - rect.left, py: e.clientY - rect.top };
  }
  /** The nearest part under the finger that can be seen (hidden parts don't count). */
  private pick(e: PointerEvent, objects: THREE.Object3D[], accept: (o: THREE.Object3D) => boolean = () => true) {
    const p = this.pointer(e);
    this.raycaster.setFromCamera(new THREE.Vector2(p.x, p.y), this.camera);
    return this.raycaster.intersectObjects(objects, true).find((h) => shown(h.object) && accept(h.object)) ?? null;
  }
  private screenPos(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.host.clientWidth, y: (-p.y * 0.5 + 0.5) * this.host.clientHeight };
  }
  /** The tool in hand must fit the job; otherwise the scene says so and nothing happens. */
  private needs(tool: ToolKind) {
    if (this.tool === tool) return true;
    this.events.wrongTool?.(tool, this.tool);
    return false;
  }

  /** A tap while looking around: the first thing hit must be a door (big touch targets of other parts don't count). */
  private tapDoor(e: PointerEvent) {
    const hit = this.pick(e, [this.rig.group, this.jobParts], (o) => (o as THREE.Mesh).material !== hitMaterial || !!doorOf(o));
    const id = hit && doorOf(hit.object);
    if (!id || !this.needs("hand")) return;
    const d = this.rig.doors.find((x) => x.id === id);
    if (!d) return;
    if (!d.swing) { this.events.door?.(id, true); return; }
    if (d.goal === 1 || d.open > 0) return;
    d.goal = 1;
    d.shutAt = this.clock.getElapsedTime() + 2.3;
    this.events.door?.(id, false);
  }

  private down = (e: PointerEvent) => {
    if (!this.work || !this.job || this.camT < 1) return;
    const canvas = this.renderer.domElement;
    if (this.work === "find") {
      this.drag = { kind: "orbit", x: this.pointer(e).px, yaw: this.yawGoal, moved: false };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (this.work === "screws" || this.work === "lock") {
      const lock = this.work === "lock";
      const hit = this.pick(e, this.screws.filter((s) => lock ? !s.locked : !s.out).map((s) => s.group));
      if (!hit) return;
      const index = hit.object.userData.index as number;
      const screw = this.screws[index];
      if (!this.needs(screw.head)) { this.wobble(screw); return; }
      this.driverHandle.color.set(headColors[screw.head]);
      const c = this.screenPos(screw.group.getWorldPosition(new THREE.Vector3()));
      const p = this.pointer(e);
      this.drag = { kind: "screw", index, last: Math.atan2(-(p.py - c.y), p.px - c.x), back: 0, slipped: false, lock };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (this.work === "panel" || this.work === "close") {
      if (!this.pick(e, [this.rig.panel]) || !this.needs("hand")) return;
      if (this.work === "panel") this.removePanel(); else this.putPanelBack();
      return;
    }
    if (this.work === "dust" && this.dust && !this.dust.done) {
      // With the blower in hand a sweep can start anywhere, even off the edge of the board.
      if (this.tool !== "blower") { if (this.pick(e, [this.dust.mesh])) this.needs("blower"); return; }
      this.drag = { kind: "dust" };
      canvas.setPointerCapture(e.pointerId);
      this.wipe(e);
      return;
    }
    if (this.work === "wires") {
      const hit = this.pick(e, this.plugs.map((p) => p.group));
      if (!hit || !this.needs("hand")) return;
      const plug = this.plugs.find((p) => p.id === hit.object.userData.id)!;
      if (plug.at) { plug.at = null; this.events.plug?.(plug.id, null, false); }
      this.drag = { kind: "plug", id: plug.id };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (this.work === "fuse" && this.fuse) {
      const f = this.fuse;
      if (f.state === "blown" && this.pick(e, [f.blown])) { if (!this.needs("pliers")) return; f.state = "out"; f.t = 0; this.events.fuseOut?.(); return; }
      if (f.state === "out" && this.pick(e, [f.spare])) { if (!this.needs("pliers")) return; f.state = "in"; this.events.fuseIn?.(); this.burst(this.rig.spots.fuse.holder.clone().addScaledVector(new THREE.Vector3(0, 0, this.rig.f), 0.03), "#bfe8ff", 10); }
      return;
    }
    if (this.work === "snack" || this.work === "jam") {
      if (this.swing) return;
      const hit = this.pick(e, this.snacks.filter((s) => !s.freed).map((s) => s.group));
      if (!hit || !this.needs("hammer")) return;
      this.drag = { kind: "hammer", index: hit.object.userData.snack as number, t0: performance.now(), power: 0 };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (this.work === "claw" && this.clawGoal && this.rig.id === "claw") {
      if (!this.pick(e, [this.claw.claw.finger]) || !this.needs("pliers")) return;
      this.clawGoal = 0;
      this.burst(this.claw.claw.finger.getWorldPosition(new THREE.Vector3()), "#d8dce6", 12);
      this.events.clawFixed?.();
      return;
    }
    if (this.work === "tape" && this.tapeJob && this.tapeJob.done < TAPE_WRAPS) {
      if (!this.pick(e, [this.tapeJob.group]) || !this.needs("tape")) return;
      this.wrap();
      return;
    }
    if (this.work === "chip" && this.pick(e, [this.rig.chip]) && this.needs("hand")) this.events.chip?.();
  };

  /**
   * Browsers merge pointer moves into one per frame. On a slow tablet that would drop most of a sweep
   * or a twist, so every merged move is replayed.
   */
  private move = (e: PointerEvent) => {
    const merged = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    for (const one of merged.length ? merged : [e]) this.moveOne(one);
  };

  private moveOne(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    if (d.kind === "orbit") {
      const dx = this.pointer(e).px - d.x;
      if (Math.abs(dx) > 10 && !d.moved) { d.moved = true; if (!this.looked) { this.looked = true; this.events.look?.(); } }
      if (d.moved) this.yawGoal = d.yaw - dx * 0.0105;
      return;
    }
    if (d.kind === "dust") { this.wipe(e); return; }
    if (d.kind === "plug") {
      const p = this.pointer(e);
      this.raycaster.setFromCamera(new THREE.Vector2(p.x, p.y), this.camera);
      const hit = new THREE.Vector3();
      const r = this.rig;
      if (this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1), r.plane + r.f * 0.05), hit)) {
        const plug = this.plugs.find((x) => x.id === d.id)!;
        const b = r.spots.box;
        hit.x = Math.max(b.x0, Math.min(b.x1, hit.x)); hit.y = Math.max(b.y0, Math.min(b.y1, hit.y));
        plug.group.position.copy(hit);
        plug.target.copy(hit);
        this.updateTube(plug);
      }
      return;
    }
    if (d.kind === "screw") {
      const screw = this.screws[d.index];
      const c = this.screenPos(screw.group.getWorldPosition(new THREE.Vector3()));
      const p = this.pointer(e);
      if (Math.hypot(p.px - c.x, p.py - c.y) < 6) return;
      const angle = Math.atan2(-(p.py - c.y), p.px - c.x);
      let delta = angle - d.last;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      d.last = angle;
      // Counter-clockwise on screen loosens, clockwise tightens (lefty loosey, righty tighty).
      const wanted = d.lock ? -delta : delta;
      if (wanted < 0) {
        d.back += -wanted;
        if (d.back > Math.PI && !d.slipped) { d.slipped = true; this.events.slip?.(); this.wobble(screw); }
        return;
      }
      this.turn1(d.index, wanted);
    }
  }

  private up = (e: PointerEvent) => {
    const d = this.drag;
    this.drag = null;
    try { this.renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (d?.kind === "orbit") { if (!d.moved) this.tapDoor(e); return; }
    // The strength comes from the clock, not the frames, so a slow tablet still measures the hold right.
    if (d?.kind === "hammer") { this.swing = { t: 0, from: this.hammer.rotation.z, index: d.index, power: this.power(d.t0), hit: false }; return; }
    if (d?.kind !== "plug") return;
    const plug = this.plugs.find((x) => x.id === d.id)!;
    const near = this.sockets.map((s) => ({ s, dist: Math.hypot(s.pos.x - plug.group.position.x, s.pos.y - plug.group.position.y) })).sort((a, b) => a.dist - b.dist)[0];
    const out = new THREE.Vector3(0, 0, this.rig.f * 0.04);
    const taken = near && this.plugs.some((p) => p !== plug && p.at === near.s.id);
    if (near && near.dist < 0.075 && !taken) {
      const cable = this.job!.cables.find((c) => c.id === plug.id)!;
      if (cable.socket === near.s.id) { this.seat(plug, near.s.id); this.burst(near.s.pos.clone().add(out), plug.color, 10); }
      else {
        // Wrong socket: a zap, and the plug jumps back out.
        this.burst(near.s.pos.clone().add(out), "#fff6a0", 22);
        plug.target.copy(plug.rest);
        this.events.plug?.(plug.id, near.s.id, false);
      }
    } else plug.target.copy(plug.rest);
  };

  private seat(plug: Plug, socket: string) {
    const s = this.sockets.find((x) => x.id === socket)!;
    plug.at = socket;
    plug.target.copy(s.pos).add(new THREE.Vector3(0, 0, this.rig.f * 0.03));
    this.events.plug?.(plug.id, socket, true);
  }

  private turn1(index: number, amount: number) {
    const d = this.drag;
    const screw = this.screws[index];
    const lock = d?.kind === "screw" && d.lock;
    const full = this.fullTurns();
    const before = Math.floor(screw.turned / (Math.PI / 3));
    screw.turned = Math.max(0, Math.min(full, screw.turned + (lock ? -amount : amount)));
    if (Math.floor(screw.turned / (Math.PI / 3)) !== before) this.events.screwTurn?.();
    const at = screw.group.getWorldPosition(new THREE.Vector3());
    if (!lock && screw.turned >= full && !screw.out) {
      screw.out = true;
      screw.locked = false;
      screw.fall = 0.001;
      screw.velocity.set((Math.random() - 0.5) * 0.5, 0.6, this.rig.f * 0.7);
      this.burst(at, "#e8e8f0", 8);
      this.drag = null;
      this.events.screwOut?.(index);
    }
    if (lock && screw.turned <= 0 && !screw.locked) {
      screw.locked = true;
      this.burst(at, "#ffd23f", 12);
      this.drag = null;
      this.events.screwLocked?.(index);
    }
  }

  private wobble(screw: Screw) {
    const g = screw.group;
    const start = performance.now();
    const shake = () => { const k = (performance.now() - start) / 320; if (k >= 1) return; g.position.x = screw.home.x + Math.sin(k * 40) * 0.006 * (1 - k); requestAnimationFrame(shake); };
    shake();
  }

  private wipe(e: PointerEvent) {
    const dust = this.dust;
    if (!dust || dust.done) return;
    const hit = this.pick(e, [dust.mesh]);
    if (!hit?.uv) return;
    // The blower's nozzle follows the finger, a little in front of the board.
    this.blower.visible = true;
    this.blower.position.copy(hit.point).add(new THREE.Vector3(0, -0.02, this.rig.f * 0.07));
    this.blower.rotation.y = this.rig.f > 0 ? Math.PI : 0;
    const x = hit.uv.x * 256, y = (1 - hit.uv.y) * 512;
    // The practice board is small: a bigger nozzle keeps the sweep short.
    const radius = this.rig.id === "practice" ? 64 : 50;
    const c = dust.ctx;
    c.save();
    c.globalCompositeOperation = "destination-out";
    const g = c.createRadialGradient(x, y, 6, x, y, radius);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
    c.restore();
    dust.texture.needsUpdate = true;
    let changed = false;
    for (let cy = 0; cy < 32; cy++) for (let cx = 0; cx < 16; cx++) {
      const i = cy * 16 + cx;
      if (dust.cells[i]) continue;
      if (Math.hypot(cx * 16 + 8 - x, cy * 16 + 8 - y) < radius * 0.78) { dust.cells[i] = true; changed = true; }
    }
    if (Math.random() < 0.4) this.burst(hit.point.clone(), this.job?.mess === "crumbs" ? "#c08a4a" : "#c8b49a", 3, 0.9);
    if (changed) {
      const cleaned = dust.cells.filter(Boolean).length / dust.cells.length;
      this.events.blow?.();
      this.events.dust?.(cleaned);
      if (cleaned >= 0.95) { dust.done = true; this.blower.visible = false; this.fadeDust(); }
    }
  }
  private fadeDust() {
    const m = this.dust!.mesh.material as THREE.MeshBasicMaterial;
    const fade = () => { m.opacity -= 0.06; if (m.opacity <= 0) { this.dust!.mesh.visible = false; return; } requestAnimationFrame(fade); };
    fade();
  }
}

/** WebGL can be missing (old tablets, tests). The shop then runs with buttons only. */
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    // three.js draws with WebGL2 only: an old WebGL1-only tablet gets the button version.
    return !!canvas.getContext("webgl2");
  } catch { return false; }
}

