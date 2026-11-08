import { questions } from "../content";
import type { Progress } from "../progress";
import { levelCount } from "../switchyard/levels";

/*
 * The Repair Shop: a hands-on game first, with a small C# job on the machine's logic chip.
 * Every student gets the same hands-on work; the tier only changes how the chip is fixed.
 * Students never see the tier's name. The teacher can switch it at any time.
 * Students only know if / else: every chip is one if with one comparison, with or without an else.
 */
export const tiers = ["guided", "supported", "independent"] as const;
export type Tier = (typeof tiers)[number];
export const tierNames: Record<Tier, string> = { guided: "Guided", supported: "Supported", independent: "Independent" };
/** Reads a tier from a save or an override. The old fourth tier, Architect, plays as Independent. */
export function tierOf(value: unknown): Tier | null {
  if (value === "architect") return "independent";
  return tiers.includes(value as Tier) ? value as Tier : null;
}

/** Teacher overrides by login: they win over the automatic profile. ("architect" still works and means Independent.) */
export const tierOverrides: Record<string, string> = {};
export const overrideFor = (login: string) => tierOf(tierOverrides[login.trim().toLowerCase()]);

export type Evidence = { quizRight: number | null; bosses: number; bossRunsPerPass: number; yardLevels: number };

/** What this device knows about the student: the Switchyard quiz and levels, and the Final Bosses. */
export function evidenceFrom(p: Progress, bosses: { completedBosses: number[]; attemptsByBoss: Record<string, number> } | null): Evidence {
  const answered = questions.every((q) => p.answers[q.id] !== undefined);
  const done = bosses?.completedBosses ?? [];
  const runs = done.reduce((total, id) => total + Math.max(1, bosses?.attemptsByBoss[id] ?? 1), 0);
  return {
    quizRight: answered ? questions.filter((q) => p.answers[q.id] === q.answer).length : null,
    bosses: done.length,
    bossRunsPerPass: done.length ? runs / done.length : 0,
    yardLevels: p.yardShipped.filter((i) => i < levelCount).length,
  };
}

/** The starting tier. The game then moves it up or down as the student plays. */
export function profileTier(e: Evidence): Tier {
  if (e.quizRight === null) return e.bosses >= 13 && e.bossRunsPerPass <= 2 ? "independent" : e.bosses >= 7 ? "supported" : "guided";
  if (e.quizRight <= 9) return "guided";
  if (e.quizRight <= 14) return "supported";
  return "independent";
}

/** shift: how far play has moved the student from the starting tier, at most SHIFT either way. */
export const SHIFT = tiers.length - 1;
export function shiftTier(tier: Tier, by: number): Tier {
  return tiers[Math.max(0, Math.min(tiers.length - 1, tiers.indexOf(tier) + by))];
}

/* ---------- The machines, in unlock order. A new one opens every 3 tickets fixed. ---------- */

/** Every machine that is built. The teacher can bring any of them. */
export const allMachines = ["arcade", "vending", "claw"] as const;
export type MachineId = (typeof allMachines)[number];
/**
 * The machines students unlock, in order. The claw machine is number 5 on the roadmap: it joins
 * once the jukebox and the crosswalk light exist. Until then only the teacher can bring it in.
 */
export const machineOrder: readonly MachineId[] = ["arcade", "vending"];
export const machineInfo: Record<MachineId, { name: string; model: string; fee: number }> = {
  arcade: { name: "Arcade", model: "ARCADE-3000", fee: 20 },
  vending: { name: "Vending machine", model: "SNACK-O-MATIC", fee: 25 },
  claw: { name: "Claw machine", model: "EGG CLAW", fee: 30 },
};
/** Every machine the shop will see, in order. Only the built ones (machineOrder) come in for now. */
export const roadmap: { id: string; name: string; boss?: boolean }[] = [
  { id: "arcade", name: "Arcade" }, { id: "vending", name: "Vending machine" }, { id: "jukebox", name: "Jukebox" }, { id: "crosswalk", name: "Crosswalk light" },
  { id: "claw", name: "Claw machine" }, { id: "coffee", name: "Coffee machine" }, { id: "robot", name: "Robot", boss: true },
];
export const UNLOCK_EVERY = 3;
export const unlockedMachines = (fixed: number): MachineId[] => machineOrder.slice(0, Math.min(machineOrder.length, 1 + Math.floor(fixed / UNLOCK_EVERY)));
/** The machine for the next customer: a machine that has just unlocked comes first, then any unlocked one. */
export function nextMachine(fixed: number, seed: number): MachineId {
  const open = unlockedMachines(fixed);
  if (fixed > 0 && fixed % UNLOCK_EVERY === 0 && open.length === 1 + fixed / UNLOCK_EVERY) return open[open.length - 1];
  // The second number from the seed: the first barely changes between nearby seeds.
  const next = rng(seed ^ 0x5bd1e995);
  next();
  return open[Math.floor(next() * open.length)];
}
/** The machine the ticket just paid unlocked, if any. */
export function unlockedBy(fixedBefore: number, fixedAfter: number): MachineId | null {
  const after = unlockedMachines(fixedAfter);
  return after.length > unlockedMachines(fixedBefore).length ? after[after.length - 1] : null;
}

/* ---------- The toolbox: eight tools. What a machine doesn't need is a decoy with a joke. ---------- */

export type ScrewHead = "cross" | "flat" | "star";
export const screwHeads: ScrewHead[] = ["cross", "flat", "star"];
export const tools = ["hand", "cross", "flat", "star", "blower", "pliers", "hammer", "tape"] as const;
export type ToolKind = (typeof tools)[number];
export const toolInfo: Record<ToolKind, { name: string; short: string; joke: string }> = {
  hand: { name: "Your hand", short: "Hand", joke: "Your hand can't do that alone. Grab a tool!" },
  cross: { name: "Cross screwdriver", short: "Cross", joke: "" },
  flat: { name: "Flat screwdriver", short: "Flat", joke: "" },
  star: { name: "Star screwdriver", short: "Star", joke: "" },
  blower: { name: "Dust blower", short: "Blower", joke: "FWOOSH! Nothing to blow away here." },
  pliers: { name: "Pliers", short: "Pliers", joke: "The pliers grab at nothing. Wrong job!" },
  hammer: { name: "Hammer", short: "Hammer", joke: "BONK! Not everything gets fixed with a hammer." },
  tape: { name: "Electrical tape", short: "Tape", joke: "Tape can't fix this. Save it for a worn cable." },
};
/** What each hands-on step needs. Screws need the screwdriver that fits their head. */
export const toolFor = { find: "hand", panel: "hand", dust: "blower", wires: "hand", fuse: "pliers", snack: "hammer", claw: "pliers", chip: "hand", close: "hand" } as const satisfies Record<string, ToolKind>;

/** The hammer: hold to wind up, let go to hit. Gentle taps work; too hard breaks something. */
export const HAMMER = { soft: 0.2, hard: 0.62 };
export const hammerHit = (power: number): "soft" | "good" | "hard" => power < HAMMER.soft ? "soft" : power <= HAMMER.hard ? "good" : "hard";

/* ---------- Doors: only one leads to the fault. The clue is on the machine. ---------- */

export type Joke = "gum" | "mouse" | "coin";
export const jokeText: Record<Joke, string> = {
  gum: "Just a piece of old gum. Gross! Wrong door.",
  mouse: "Shh… a mouse is sleeping in here. Wrong door!",
  coin: "A lost coin! Finders keepers: +1 coin. Wrong door, though.",
};
export type Door = { id: string; name: string; right: boolean; joke: Joke | null };
const doorSets: Record<MachineId, { id: string; name: string }[]> = {
  arcade: [{ id: "back", name: "Back panel" }, { id: "coin", name: "Coin door" }],
  vending: [{ id: "glass", name: "Front glass" }, { id: "side", name: "Side hatch" }, { id: "coinbox", name: "Coin box" }],
  claw: [{ id: "glass", name: "Front glass" }, { id: "control", name: "Control panel" }, { id: "base", name: "Base hatch" }],
};
const rightDoor: Record<MachineId, string> = { arcade: "back", vending: "glass", claw: "glass" };
/** The clue in words, for a device without 3D. */
export const clueText: Record<MachineId, string> = {
  arcade: "Sparks and smoke come out of the back.",
  vending: "A snack is stuck behind the front glass.",
  claw: "The claw twitches behind the front glass: one finger is bent.",
};

export type Fault = "wires" | "fuse" | "snack" | "claw";
export type Mess = "dust" | "crumbs" | "fluff";
export type Socket = { id: string; symbol: string };
/** socket: the socket of its colour. at: where it starts (null: hanging loose). */
export type Cable = { id: string; color: string; name: string; socket: string; at: string | null };
/** A snack stuck on its spiral. taps: the gentle hammer taps it needs to fall. */
export type Snack = { shelf: number; slot: number; taps: number; color: string };
/** A vending slot's label: shelves A (top) to D, slots 1 to 3. */
export const slotName = (s: { shelf: number; slot: number }) => `${"DCBA"[s.shelf]}${s.slot + 1}`;

/* ---------- The logic chip: one if, one comparison ---------- */

export type Op = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type Cond = { op: Op; n: number };
export type Predict = { value: number; question: string; options: string[]; answer: number; why: string[] };
export type Chip = {
  mode: "predict-pick" | "tokens" | "typed";
  variable: string;
  broken: Cond;
  right: Cond;
  yes: string;
  /** null: no else, so a false condition prints nothing at all. */
  no: string | null;
  /** The values the test bench tries. */
  values: number[];
  /** What the sticker on the machine says. */
  sticker: string[];
  /** The rule in plain words: shown on Guided and Supported. */
  rule: string;
  /** Guided: the two signs to pick from, and what to aim for. */
  pick: Op[];
  pickHint: string;
  /** Supported: the code pieces (the right ones and two decoys), and the pieces left after two misses. */
  tray: string[];
  trimmed: string[];
  predict: Predict;
};
const compare: Record<Op, (a: number, b: number) => boolean> = { ">": (a, b) => a > b, "<": (a, b) => a < b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, "==": (a, b) => a === b, "!=": (a, b) => a !== b };
export const testOf = (c: Cond) => (v: number) => compare[c.op](v, c.n);
export const condText = (chip: Chip, c: Cond) => `${chip.variable} ${c.op} ${c.n}`;

export type Job = {
  machine: MachineId;
  /** The tutorial's practice box: no customer, no chip, no pay. */
  practice?: boolean;
  tier: Tier;
  /** The price on the sticker (arcade), or what a snack costs (vending). */
  price: number;
  /** What the customer shows: the value they try. null: the customer won't show the problem. */
  demo: number | null;
  doors: Door[];
  screws: ScrewHead[];
  /** All eight tools, always: what this machine doesn't need is a decoy. */
  toolbox: ToolKind[];
  /** Full turns to get one screw out. */
  turns: number;
  mess: Mess;
  /** How much of the board is under the mess (0.55–1). The blower must clear 95% of it all. */
  dust: number;
  /** The jobs after the blower, in order. */
  faults: Fault[];
  sockets: Socket[];
  cables: Cable[];
  /** The arcade's fuse is burnt (true) or fine. */
  fuse: boolean;
  snacks: Snack[];
  /** Vending: the empty slot the customer paid for. */
  empty: { shelf: number; slot: number };
  chip: Chip;
};

export const START = "GAME START!";
export const MORE = "Insert more coins";
export const ENJOY = "Enjoy!";
export const SOLD = "Sold out";
export const DROP = "DROP!";
export const STEER = "Keep steering";

const palette = [
  { id: "red", color: "#ff4d5e", name: "red" },
  { id: "blue", color: "#3d8bff", name: "blue" },
  { id: "yellow", color: "#ffd23f", name: "yellow" },
];
const symbols = ["▲", "●", "■"];
const snackColors = ["#ff6b6b", "#4ecdc4", "#ffd23f", "#b38cff", "#59e08a", "#ff9a3c"];

/** A seeded random, so a ticket can be rebuilt the same way. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
const shuffle = <T,>(items: readonly T[], next: () => number) => { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
const chipMode = (tier: Tier): Chip["mode"] => tier === "guided" ? "predict-pick" : tier === "supported" ? "tokens" : "typed";

function arcadeChip(tier: Tier, p: number, next: () => number): Chip {
  // Guided arcades have no else: the class-wide mistake is "if it's false, nothing prints".
  const hasElse = tier !== "guided";
  return {
    mode: chipMode(tier), variable: "coins",
    broken: { op: ">", n: p }, right: { op: ">=", n: p },
    yes: START, no: hasElse ? MORE : null,
    values: [0, p - 1, p, p + 1, 10],
    sticker: ["1 GAME", `${p} COINS`],
    rule: `A game costs ${p} coins. With ${p} or more, the game starts.`,
    pick: shuffle([">=", "<"] as Op[], next), pickHint: "Pick the sign so the price itself starts the game",
    tray: shuffle(["coins", ">=", String(p), ">", "="], next), trimmed: ["coins", ">=", String(p)],
    predict: {
      value: p,
      question: `${p} coins go in. What does the screen show?`,
      options: [`“${START}”`, "False", "Nothing at all", `“${MORE}”`],
      answer: 2,
      why: [
        `${p} > ${p} is false: ${p} is not greater than itself. So the block with ${START} is skipped.`,
        "C# never prints the condition by itself. A false if just skips its block.",
        `${p} > ${p} is false, so C# skips the block. There is no else, so nothing prints at all. But ${p} coins should start the game: fix the sign!`,
        `“${MORE}” is not in this program. With no else, a false if prints nothing.`,
      ],
    },
  };
}

function vendingChip(tier: Tier, next: () => number): Chip {
  return {
    mode: chipMode(tier), variable: "stock",
    broken: { op: ">=", n: 0 }, right: { op: ">", n: 0 },
    yes: ENJOY, no: SOLD,
    values: [0, 1, 2, 5, 9],
    sticker: ["EMPTY SLOT?", "SOLD OUT!"],
    rule: "Only sell when there's a snack: stock more than 0. An empty slot (stock 0) says Sold out.",
    pick: shuffle([">", "<="] as Op[], next), pickHint: "Pick the sign so an empty slot (0) says Sold out",
    tray: shuffle(["stock", ">", "0", ">=", "="], next), trimmed: ["stock", ">", "0"],
    predict: {
      value: 0,
      question: "The slot is empty: stock is 0. What does the screen show?",
      options: [`“${ENJOY}”`, `“${SOLD}”`, "Nothing at all", "True"],
      answer: 0,
      why: [
        `0 >= 0 is true: >= lets an equal number through. So it says ${ENJOY} for an EMPTY slot. That's the bug!`,
        ">= means bigger OR EQUAL. 0 is equal to 0, so the condition is true and the if block runs.",
        "There is an else here: one of the two blocks always prints something.",
        "C# never prints the condition by itself. It runs one of the two blocks.",
      ],
    },
  };
}

function clawChip(tier: Tier, next: () => number): Chip {
  return {
    mode: chipMode(tier), variable: "seconds",
    broken: { op: "<", n: 0 }, right: { op: "<=", n: 0 },
    yes: DROP, no: STEER,
    values: [0, 1, 2, 5, 9],
    sticker: ["TIME'S UP?", "CLAW DROPS!"],
    rule: "The timer counts down to 0 and stops there. At 0 the claw drops; before that, keep steering.",
    pick: shuffle(["<=", ">"] as Op[], next), pickHint: "Pick the sign so the claw drops when the timer is 0",
    tray: shuffle(["seconds", "<=", "0", "<", "="], next), trimmed: ["seconds", "<=", "0"],
    predict: {
      value: 0,
      question: "The timer reaches 0. What does the screen show?",
      options: [`“${DROP}”`, `“${STEER}”`, "Nothing at all", "False"],
      answer: 1,
      why: [
        `0 < 0 is false: 0 is not less than itself. So the ${DROP} block is skipped.`,
        `0 < 0 is false, so the else runs: ${STEER}. The timer stops at 0 and never goes below it, so the claw never drops. That's the bug!`,
        "There is an else here: one of the two blocks always prints something.",
        "C# never prints the condition by itself. It runs one of the two blocks.",
      ],
    },
  };
}

/**
 * One ticket. Every tier opens the machine the same way; only the chip changes.
 * The faults vary from ticket to ticket, so the same moves never repeat exactly.
 * hide: the customer won't show the problem (Independent, after two clean tickets in a row).
 */
export function makeJob(tier: Tier, seed: number, machine: MachineId = "arcade", hide = false): Job {
  const next = rng(seed);
  // Four screws: cross, flat and star, and one of them again.
  const screws = shuffle([...screwHeads, screwHeads[Math.floor(next() * 3)]], next);
  const jokes = shuffle(["gum", "mouse", "coin"] as Joke[], next);
  const doors: Door[] = doorSets[machine].map((d) => ({ ...d, right: d.id === rightDoor[machine], joke: null }));
  doors.filter((d) => !d.right).forEach((d, i) => { d.joke = jokes[i]; });
  const dust = 0.55 + Math.round(next() * 9) * 0.05;
  const base = { machine, tier, doors, screws, toolbox: [...tools], turns: 5, dust, sockets: [] as Socket[], cables: [] as Cable[], fuse: false, snacks: [] as Snack[], empty: { shelf: 0, slot: 0 } };
  if (machine === "vending") {
    const chip = vendingChip(tier, next);
    // Twelve slots: three on each of four shelves. One or two snacks are stuck, and one slot is empty.
    const spots = shuffle(Array.from({ length: 12 }, (_, i) => ({ shelf: Math.floor(i / 3), slot: i % 3 })), next);
    const stuck = 1 + Math.floor(next() * 2);
    const first = Math.floor(next() * 6);
    const snacks = spots.slice(0, stuck).map((s, i) => ({ ...s, taps: 2 + Math.floor(next() * 2), color: snackColors[(first + i * 2) % 6] }));
    return { ...base, price: 2, demo: hide ? null : chip.predict.value, mess: "crumbs", faults: ["snack"], snacks, empty: spots[stuck], chip };
  }
  if (machine === "claw") {
    // The claw machine: fluff and hair to blow away, then the bent claw finger for the pliers.
    const chip = clawChip(tier, next);
    return { ...base, price: 2, demo: hide ? null : chip.predict.value, mess: "fluff", faults: ["claw"], chip };
  }
  const price = 3 + Math.floor(next() * 3);
  const sockets = shuffle(symbols, next).map((symbol, i) => ({ id: `s${i}`, symbol }));
  const cables: Cable[] = palette.map((c, i) => ({ id: c.id, color: c.color, name: c.name, socket: sockets[i].id, at: sockets[i].id }));
  // One or two cables have come loose, and the fuse is burnt on most tickets.
  const loose = shuffle(palette, next).slice(0, 1 + Math.floor(next() * 2)).map((c) => c.id);
  for (const cable of cables) if (loose.includes(cable.id)) cable.at = null;
  const fuse = next() < 0.7;
  return { ...base, price, demo: hide ? null : price, mess: "dust", faults: fuse ? ["wires", "fuse"] : ["wires"], sockets, cables, fuse, chip: arcadeChip(tier, price, next) };
}

/** The practice box in the tutorial: two screws (cross and flat), a back panel and a dusty board. */
export function practiceJob(): Job {
  const job = makeJob("guided", 7, "arcade");
  return {
    ...job, practice: true, demo: null, screws: ["cross", "flat"], toolbox: ["hand", "cross", "flat", "blower"], turns: 3,
    doors: [{ id: "back", name: "Back panel", right: true, joke: null }], mess: "dust", dust: 0.7, faults: [], sockets: [], cables: [], fuse: false, snacks: [],
    chip: { ...job.chip, sticker: ["PRACTICE", "BOX"] },
  };
}

export const wiringDone = (job: Job, plugged: Record<string, string | null>) => job.cables.every((c) => plugged[c.id] === c.socket);

/* ---------- The logic chip: a tiny C# condition checker ---------- */

type Token = { kind: "num" | "id" | "op" | "paren" | "not"; text: string };
export type Parsed = { ok: true; test: (coins: number) => boolean } | { ok: false; error: string };

function tokenize(source: string): Token[] | string {
  const out: Token[] = [];
  const re = /\s*(\d+|[A-Za-z_]\w*|>=|<=|==|!=|&&|\|\||=>|=<|[<>()!=])/y;
  let at = 0;
  const text = source.trim();
  while (at < text.length) {
    re.lastIndex = at;
    const m = re.exec(text);
    if (!m) return `C# can't read “${text.slice(at).trim().slice(0, 8)}”.`;
    at = re.lastIndex;
    const t = m[1];
    if (/^\d/.test(t)) out.push({ kind: "num", text: t });
    else if (/^[A-Za-z_]/.test(t)) out.push({ kind: "id", text: t });
    else if (t === "(" || t === ")") out.push({ kind: "paren", text: t });
    else if (t === "!") out.push({ kind: "not", text: t });
    else out.push({ kind: "op", text: t });
  }
  return out;
}

/** Reads a condition, like `coins >= 3`. It also accepts && and || for students who know them; no machine needs them. */
export function parseCondition(source: string, variable = "coins"): Parsed {
  if (!source.trim()) return { ok: false, error: `The chip is empty. Write a comparison, like ${variable} >= 3.` };
  const tokens = tokenize(source);
  if (typeof tokens === "string") return { ok: false, error: tokens };
  let i = 0;
  const peek = () => tokens[i];
  const fail = (error: string): never => { throw new Error(error); };
  const value = (): (c: number) => number => {
    const t = tokens[i++];
    if (!t) return fail("Something is missing at the end.");
    if (t.kind === "num") { const n = Number(t.text); return () => n; }
    if (t.kind === "id") {
      if (t.text === variable) return (c) => c;
      if (t.text.toLowerCase() === variable) return fail(`C# cares about capitals: it's ${variable}, all lower case.`);
      return fail(`C# doesn't know “${t.text}”. The variable is called ${variable}.`);
    }
    return fail(`“${t.text}” can't go there.`);
  };
  const comparison = (): (c: number) => boolean => {
    const t = peek();
    if (t?.kind === "not") { i++; const inner = primary(); return (c) => !inner(c); }
    if (t?.kind === "paren" && t.text === "(") return primary();
    const left = value();
    const op = tokens[i++];
    if (!op) return fail(`A comparison needs an operator after it, like ${variable} >= 3.`);
    if (op.text === "=") return fail("One = stores a value. To compare, use == (or >=, <=, >, <).");
    if (op.text === "=>" || op.text === "=<") return fail(`C# writes it the other way round: ${op.text === "=>" ? ">=" : "<="}.`);
    if (op.kind !== "op" || ["&&", "||"].includes(op.text)) return fail(`A comparison needs >, <, >=, <=, == or != in the middle.`);
    const right = value();
    const f: Record<string, (a: number, b: number) => boolean> = { ">": (a, b) => a > b, "<": (a, b) => a < b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, "==": (a, b) => a === b, "!=": (a, b) => a !== b };
    return (c) => f[op.text](left(c), right(c));
  };
  const primary = (): (c: number) => boolean => {
    if (peek()?.kind === "paren" && peek().text === "(") {
      i++;
      const inner = or();
      if (peek()?.text !== ")") return fail("A ( is missing its ).");
      i++;
      return inner;
    }
    return comparison();
  };
  const and = (): (c: number) => boolean => { let left = primary(); while (peek()?.text === "&&") { i++; const a = left, b = primary(); left = (c) => a(c) && b(c); } return left; };
  const or = (): (c: number) => boolean => { let left = and(); while (peek()?.text === "||") { i++; const a = left, b = and(); left = (c) => a(c) || b(c); } return left; };
  try {
    const test = or();
    if (i < tokens.length) return { ok: false, error: `“${tokens[i].text}” is left over at the end.` };
    if (!source.includes(variable)) return { ok: false, error: `The rule is about ${variable}: the condition must use it.` };
    return { ok: true, test };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** What the machine prints for a value. "" means nothing at all. */
export function printed(job: Job, test: (value: number) => boolean, value: number): string {
  return test(value) ? job.chip.yes : job.chip.no ?? "";
}
export const brokenTest = (job: Job) => testOf(job.chip.broken);
export const rightTest = (job: Job) => testOf(job.chip.right);
export const benchValues = (job: Job) => job.chip.values;

export type BenchRow = { value: number; expected: string; got: string; ok: boolean };
export function bench(job: Job, test: (value: number) => boolean): BenchRow[] {
  return benchValues(job).map((value) => {
    const expected = printed(job, rightTest(job), value), got = printed(job, test, value);
    return { value, expected, got, ok: expected === got };
  });
}

/** The C# on the chip, with the condition the student is working on. value: a known value, or ? for any. */
export function chipCode(job: Job, condition = condText(job.chip, job.chip.broken), value?: number): string[] {
  const { variable, yes, no } = job.chip;
  return [
    `int ${variable} = ${value ?? "?"};`,
    `if (${condition})`,
    "{",
    `    Console.WriteLine("${yes}");`,
    "}",
    ...(no !== null ? ["else", "{", `    Console.WriteLine("${no}");`, "}"] : []),
  ];
}

/* ---------- The shop: coins, a catalog of upgrades and the save on this device ---------- */

export type Category = "bench" | "floor" | "light" | "decor";
export const categories: { id: Category; name: string }[] = [
  { id: "bench", name: "Benches" }, { id: "floor", name: "Floors" }, { id: "light", name: "Lights" }, { id: "decor", name: "Decor" },
];
export type Item = { id: string; cat: Category; name: string; price: number; copy: string; swatch: string };
export const catalog: Item[] = [
  { id: "bench-wood", cat: "bench", name: "Old wooden bench", price: 0, copy: "It wobbles. It's yours.", swatch: "#8a5a35" },
  { id: "bench-steel", cat: "bench", name: "Steel workbench", price: 30, copy: "Shiny, solid, professional.", swatch: "#9aa3b5" },
  { id: "bench-gamer", cat: "bench", name: "Neon gamer desk", price: 80, copy: "Black with glowing edges.", swatch: "#ff4fd8" },
  { id: "floor-checker", cat: "floor", name: "Checker tiles", price: 0, copy: "Classic diner style.", swatch: "#e9dcc4" },
  { id: "floor-wood", cat: "floor", name: "Wood planks", price: 25, copy: "Warm and cosy.", swatch: "#b0784a" },
  { id: "floor-rubber", cat: "floor", name: "Rubber mat", price: 30, copy: "A real workshop floor.", swatch: "#3a3f4a" },
  { id: "floor-galaxy", cat: "floor", name: "Galaxy floor", price: 70, copy: "Repair machines in space.", swatch: "#4b2aa8" },
  { id: "light-warm", cat: "light", name: "Work lamp", price: 0, copy: "A warm yellow glow.", swatch: "#ffd9a0" },
  { id: "light-cool", cat: "light", name: "Cool white", price: 20, copy: "Bright, clean, focused.", swatch: "#d8e8ff" },
  { id: "light-neon", cat: "light", name: "Neon strips", price: 45, copy: "Pink and cyan everywhere.", swatch: "#3dd6ff" },
  { id: "light-disco", cat: "light", name: "Disco lights", price: 60, copy: "Every colour. All the time.", swatch: "#b38cff" },
  { id: "neon", cat: "decor", name: "Neon OPEN sign", price: 25, copy: "Your shop glows. Customers notice.", swatch: "#ff8ae6" },
  { id: "plant", cat: "decor", name: "Potted plant", price: 15, copy: "The one thing here that never breaks.", swatch: "#4caf50" },
  { id: "poster", cat: "decor", name: "Arcade poster", price: 20, copy: "Legends only.", swatch: "#ffd23f" },
  { id: "radio", cat: "decor", name: "Shop radio", price: 30, copy: "Bounces to the beat.", swatch: "#e5484d" },
  { id: "cat", cat: "decor", name: "Shop cat", price: 60, copy: "Sits on a crate. Judges your work.", swatch: "#ff9a3c" },
];
export const itemById = (id: string) => catalog.find((i) => i.id === id);
/** One bench, one floor and one light are in use at a time; decorations all show once bought. */
export type Equipped = { bench: string; floor: string; light: string };
const defaults: Equipped = { bench: "bench-wood", floor: "floor-checker", light: "light-warm" };
export type Look = Equipped & { decor: string[] };

/** made: tickets fixed on each machine. tutorial: the practice box is done. */
export type Shop = { coins: number; fixed: number; owned: string[]; equipped: Equipped; clean: number; rough: number; shift: number; streak: number; made: Partial<Record<MachineId, number>>; tutorial: boolean };
export const freshShop = (): Shop => ({ coins: 0, fixed: 0, owned: Object.values(defaults), equipped: { ...defaults }, clean: 0, rough: 0, shift: 0, streak: 0, made: {}, tutorial: false });
/** Tools used to be for sale. A save that bought one gets its coins back: everyone uses the same hand tools now. */
const retired: Record<string, number> = { drill: 40, turbo: 35 };
export const shopKey = (login: string) => `sharpie.repair.v1.${encodeURIComponent(login.trim().toLowerCase())}`;
const int = (v: unknown, min: number, max: number, fallback = 0) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;

export function sanitizeShop(raw: unknown): Shop {
  const s = freshShop();
  if (!raw || typeof raw !== "object") return s;
  const r = raw as Partial<Shop> & { tools?: unknown };
  s.coins = int(r.coins, 0, 99999); s.fixed = int(r.fixed, 0, 9999);
  // The first test build saved bought things as "tools".
  const bought = [...(Array.isArray(r.owned) ? r.owned : []), ...(Array.isArray(r.tools) ? r.tools : [])];
  s.owned = catalog.filter((i) => i.price === 0 || bought.includes(i.id)).map((i) => i.id);
  s.coins = Math.min(99999, s.coins + [...new Set(bought)].reduce((t, id) => t + (typeof id === "string" ? retired[id] ?? 0 : 0), 0));
  for (const cat of ["bench", "floor", "light"] as const) {
    const want = r.equipped?.[cat];
    if (typeof want === "string" && s.owned.includes(want) && itemById(want)?.cat === cat) s.equipped[cat] = want;
  }
  // Saves from when there were four tiers can hold a shift of 3: it is clamped to the three tiers now.
  s.clean = int(r.clean, 0, 2); s.rough = int(r.rough, 0, 2); s.shift = int(r.shift, -SHIFT, SHIFT); s.streak = int(r.streak, 0, 999);
  for (const m of allMachines) { const n = int(r.made?.[m], 0, 9999); if (n) s.made[m] = n; }
  s.tutorial = r.tutorial === true;
  return s;
}
export const lookOf = (shop: Shop): Look => ({ ...shop.equipped, decor: shop.owned.filter((id) => itemById(id)?.cat === "decor") });
export const owns = (shop: Shop, id: string) => shop.owned.includes(id);
/** Buying puts a bench, floor or light into use straight away. */
export function buy(shop: Shop, id: string): Shop {
  const item = itemById(id);
  if (!item || owns(shop, id) || shop.coins < item.price) return shop;
  const next = { ...shop, coins: shop.coins - item.price, owned: [...shop.owned, id] };
  return item.cat === "bench" || item.cat === "floor" || item.cat === "light" ? { ...next, equipped: { ...next.equipped, [item.cat]: id } } : next;
}
export function equip(shop: Shop, id: string): Shop {
  const item = itemById(id);
  if (!item || !owns(shop, id) || !(item.cat === "bench" || item.cat === "floor" || item.cat === "light")) return shop;
  return { ...shop, equipped: { ...shop.equipped, [item.cat]: id } };
}
export function loadShop(login: string): Shop {
  try { const raw = localStorage.getItem(shopKey(login)); return sanitizeShop(raw ? JSON.parse(raw) : null); } catch { return freshShop(); }
}
export function saveShop(login: string, shop: Shop) {
  try { localStorage.setItem(shopKey(login), JSON.stringify(shop)); } catch { /* The shop still works for this visit. */ }
}

/** tools: a wrong tool, a wrong screwdriver, turning the wrong way or a hammer hit that was too hard. door: a wrong door. */
export type Slips = { door: number; tools: number; wires: number; chip: number; help: number };
/** Coins for one ticket: the machine's fee, and tips for clean work. */
export function payout(slips: Slips, job: Job) {
  const tips = [
    { label: "Right door first", coins: slips.door === 0 ? 5 : 0 },
    { label: "Right tool every time", coins: slips.tools === 0 ? 5 : 0 },
    { label: "Clean wiring", coins: job.faults.includes("wires") && slips.wires === 0 ? 5 : 0 },
    { label: "Chip right first time", coins: slips.chip === 0 ? 10 : 0 },
    { label: "No help needed", coins: slips.help === 0 ? 5 : 0 },
  ].filter((t) => t.coins);
  const base = machineInfo[job.machine].fee;
  const tip = tips.reduce((t, x) => t + x.coins, 0);
  return { base, tips, tip, total: base + tip };
}

/**
 * Two clean tickets in a row bring harder machines; two rough ones bring more help.
 * This works on top of the starting tier and never shows the student a label.
 * streak counts clean Independent tickets in a row: from two on, customers stop showing the problem.
 */
export function afterTicket(shop: Shop, slips: Slips, earned: number, tier: Tier, machine: MachineId): Shop {
  const misses = slips.door + slips.wires + slips.chip + slips.tools;
  const clean = misses === 0 && slips.help === 0;
  const rough = misses >= 4 || slips.help >= 2;
  let next: Shop = { ...shop, coins: shop.coins + earned, fixed: shop.fixed + 1, made: { ...shop.made, [machine]: (shop.made[machine] ?? 0) + 1 }, clean: clean ? shop.clean + 1 : 0, rough: rough ? shop.rough + 1 : 0, streak: tier === "independent" && clean ? shop.streak + 1 : 0 };
  if (next.clean >= 2) next = { ...next, shift: Math.min(SHIFT, next.shift + 1), clean: 0 };
  if (next.rough >= 2) next = { ...next, shift: Math.max(-SHIFT, next.shift - 1), rough: 0 };
  return next;
}
/** Independent, after two clean tickets in a row: the customer won't show the problem. */
export const hidesProblem = (shop: Shop, tier: Tier) => tier === "independent" && shop.streak >= 2;
