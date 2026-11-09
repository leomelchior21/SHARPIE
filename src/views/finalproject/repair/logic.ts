/*
 * The Repair Shop: a hands-on game first, with a small C# job on the machine's logic chip.
 * Seven levels, one machine each, a little harder every time. Everyone plays the same levels with the
 * same help: the clue is said plainly, the tool is named and a finger shows each move.
 * Students only know if / else: every chip is one if with one comparison, with or without an else.
 * The last level, the Robot, gives only the first line: the student writes the if / else by hand.
 */

/* ---------- The levels: one machine each. Fixing a level opens the next. ---------- */

export const allMachines = ["arcade", "vending", "jukebox", "scooter", "claw", "coffee", "robot"] as const;
export type MachineId = (typeof allMachines)[number];
/** The level order is the machine order. */
export const machineOrder: readonly MachineId[] = allMachines;
export const machineInfo: Record<MachineId, { name: string; model: string; fee: number; boss?: boolean }> = {
  arcade: { name: "Arcade", model: "ARCADE-3000", fee: 20 },
  vending: { name: "Vending machine", model: "SNACK-O-MATIC", fee: 25 },
  jukebox: { name: "Jukebox", model: "ROCK-O-LA", fee: 30 },
  scooter: { name: "Electric scooter", model: "ZOOM-E", fee: 35 },
  claw: { name: "Claw machine", model: "EGG CLAW", fee: 40 },
  coffee: { name: "Coffee machine", model: "BEAN-O-MATIC", fee: 45 },
  robot: { name: "Robot", model: "HELPER-7", fee: 60, boss: true },
};
export const roadmap = allMachines.map((id) => ({ id, name: machineInfo[id].name, boss: !!machineInfo[id].boss }));
export const levelOf = (m: MachineId) => allMachines.indexOf(m) + 1;
export const cleared = (shop: Shop, m: MachineId) => (shop.made[m] ?? 0) > 0;
/** A level is open once the one before it is fixed. The teacher has every level open. */
export const levelOpen = (shop: Shop, m: MachineId, teacher = false) => teacher || levelOf(m) === 1 || cleared(shop, allMachines[levelOf(m) - 2]);
/** The next customer: the first open level not fixed yet. With every level fixed, any machine. */
export function nextMachine(shop: Shop, seed: number): MachineId {
  const todo = allMachines.find((m) => levelOpen(shop, m) && !cleared(shop, m));
  if (todo) return todo;
  const next = rng(seed ^ 0x5bd1e995);
  next();
  return allMachines[Math.floor(next() * allMachines.length)];
}
/** The level a paid ticket opened, if any: the first fix of a level opens the next one. */
export function unlockedBy(before: Shop, machine: MachineId): MachineId | null {
  if (cleared(before, machine)) return null;
  return allMachines[levelOf(machine)] ?? null;
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
export const toolFor = { find: "hand", panel: "hand", dust: "blower", wires: "hand", fuse: "pliers", snack: "hammer", jam: "hammer", claw: "pliers", tape: "tape", chip: "hand", close: "hand" } as const satisfies Record<string, ToolKind>;

/** The hammer: hold to wind up, let go to hit. Gentle taps work; too hard breaks something. */
export const HAMMER = { soft: 0.2, hard: 0.62 };
export const hammerHit = (power: number): "soft" | "good" | "hard" => power < HAMMER.soft ? "soft" : power <= HAMMER.hard ? "good" : "hard";
/** Taps of tape around a worn cable. */
export const TAPE_WRAPS = 3;

/* ---------- Doors: only one leads to the fault. The clue is on the machine. ---------- */

export type Joke = "gum" | "mouse" | "coin";
export const jokeText: Record<Joke, string> = {
  gum: "Just a piece of old gum. Gross! Wrong door.",
  mouse: "Shh… a mouse is sleeping in here. Wrong door!",
  coin: "A lost coin! Finders keepers: +1 coin. Wrong door, though.",
};
export type Door = { id: string; name: string; right: boolean; joke: Joke | null };
/** The right door comes first. */
const doorSets: Record<MachineId, { id: string; name: string }[]> = {
  arcade: [{ id: "back", name: "Back panel" }, { id: "coin", name: "Coin door" }],
  vending: [{ id: "glass", name: "Front glass" }, { id: "side", name: "Side hatch" }, { id: "coinbox", name: "Coin box" }],
  jukebox: [{ id: "back", name: "Back panel" }, { id: "coinbox", name: "Coin box" }, { id: "side", name: "Side hatch" }],
  scooter: [{ id: "back", name: "Battery cover" }, { id: "stem", name: "Stem box" }, { id: "lamp", name: "Front lamp" }],
  claw: [{ id: "back", name: "Back panel" }, { id: "control", name: "Control panel" }, { id: "base", name: "Base hatch" }],
  coffee: [{ id: "back", name: "Back panel" }, { id: "drawer", name: "Grounds drawer" }, { id: "tank", name: "Water tank" }],
  robot: [{ id: "back", name: "Back panel" }, { id: "chest", name: "Chest hatch" }, { id: "leg", name: "Leg panel" }],
};
/** The clue in words: said by the customer, and the only clue on a device without 3D. */
export const clueText: Record<MachineId, string> = {
  arcade: "Sparks and smoke come out of the back.",
  vending: "A snack is stuck behind the front glass.",
  jukebox: "Sparks and smoke come out of the back.",
  scooter: "Sparks fly out of the battery cover, on the back of the deck.",
  claw: "One claw finger is bent, and sparks fly out of the back.",
  coffee: "Smoke comes out of the back.",
  robot: "Sparks and smoke come out of its back.",
};

export type Fault = "wires" | "fuse" | "snack" | "claw" | "tape" | "jam";
export type Mess = "dust" | "crumbs" | "fluff" | "mud" | "grounds";
export type Socket = { id: string; symbol: string };
/** socket: the socket of its colour. at: where it starts (null: hanging loose). */
export type Cable = { id: string; color: string; name: string; socket: string; at: string | null };
/** A snack stuck on its spiral. taps: the gentle hammer taps it needs to fall. */
export type Snack = { shelf: number; slot: number; taps: number; color: string };
/** A vending slot's label: shelves A (top) to D, slots 1 to 3. */
export const slotName = (s: { shelf: number; slot: number }) => `${"DCBA"[s.shelf]}${s.slot + 1}`;

/** Each level: its screws, its mess and its faults. Every level adds a little. */
type Level = { heads: ScrewHead[]; screws: number; turns: number; mess: Mess; faults: Fault[]; loose: number };
const levels: Record<MachineId, Level> = {
  arcade: { heads: ["cross", "flat"], screws: 4, turns: 4, mess: "dust", faults: ["wires"], loose: 1 },
  vending: { heads: screwHeads, screws: 4, turns: 4, mess: "crumbs", faults: ["snack"], loose: 0 },
  jukebox: { heads: screwHeads, screws: 4, turns: 5, mess: "dust", faults: ["wires", "fuse"], loose: 2 },
  scooter: { heads: screwHeads, screws: 4, turns: 5, mess: "mud", faults: ["tape", "wires"], loose: 2 },
  claw: { heads: screwHeads, screws: 4, turns: 5, mess: "fluff", faults: ["claw", "tape"], loose: 0 },
  coffee: { heads: screwHeads, screws: 6, turns: 5, mess: "grounds", faults: ["wires", "fuse", "tape"], loose: 2 },
  robot: { heads: screwHeads, screws: 6, turns: 6, mess: "dust", faults: ["wires", "fuse", "tape", "jam"], loose: 3 },
};

/* ---------- The logic chip: one if, one comparison ---------- */

export type Op = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type Cond = { op: Op; n: number };
export type Predict = { value: number; question: string; options: string[]; answer: number; why: string[] };
/**
 * How the chip gets fixed, one step harder each level:
 * pick a sign → build the condition from pieces → type it → type it and write the else → write it all.
 */
export type ChipMode = "pick" | "tokens" | "typed" | "else" | "write";
export type Chip = {
  mode: ChipMode;
  variable: string;
  /** The condition on the broken chip. null: the program was wiped (the Robot). */
  broken: Cond | null;
  right: Cond;
  yes: string;
  /** What the fixed program says when the condition is false. null: no else, so it says nothing. */
  no: string | null;
  /** false: the broken program has no else (the coffee machine: the student writes it). */
  brokenElse: boolean;
  /** The values the test bench tries. */
  values: number[];
  /** The value the customer shows. */
  demo: number;
  /** What the sticker on the machine says. */
  sticker: string[];
  /** The rule in plain words, always shown on the chip. */
  rule: string;
  /** pick: the signs to choose from, and what to aim for. */
  pick: Op[];
  pickHint: string;
  /** tokens: the code pieces (the right ones and decoys), and the pieces left after two misses. */
  tray: string[];
  trimmed: string[];
  /** The first two levels ask what the broken code prints before fixing it. */
  predict: Predict | null;
};
const compare: Record<Op, (a: number, b: number) => boolean> = { ">": (a, b) => a > b, "<": (a, b) => a < b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, "==": (a, b) => a === b, "!=": (a, b) => a !== b };
export const testOf = (c: Cond) => (v: number) => compare[c.op](v, c.n);
export const condText = (chip: Chip, c: Cond) => `${chip.variable} ${c.op} ${c.n}`;

export type Job = {
  machine: MachineId;
  /** The tutorial's practice box: no customer, no chip, no pay. */
  practice?: boolean;
  /** What a go costs: coins in, for the coin machines. */
  price: number;
  /** The value the customer shows. null: the customer can't show the problem (the Robot does nothing). */
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
  fuse: boolean;
  snacks: Snack[];
  /** Vending: the empty slot the customer paid for. */
  empty: { shelf: number; slot: number };
  /** The Robot: hammer taps to free its stuck gear (0: no gear to free). */
  jam: number;
  chip: Chip;
};

export const START = "GAME START!";
export const MORE = "Insert more coins";
export const ENJOY = "Enjoy!";
export const SOLD = "Sold out";
export const PLAYING = "Now playing";
export const INSERT = "Insert coin";
export const TOO_FAST = "Too fast!";
export const SPEED_OK = "Speed OK";
export const DROP = "DROP!";
export const STEER = "Keep steering";
export const BREWING = "Brewing";
export const REFILL = "Refill water";
export const READY = "Ready to work!";
export const LOW = "Low battery!";

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
const base = (rest: Pick<Chip, "variable" | "right" | "yes" | "no" | "values" | "demo" | "sticker" | "rule">): Omit<Chip, "mode" | "broken"> =>
  ({ brokenElse: true, pick: [], pickHint: "", tray: [], trimmed: [], predict: null, ...rest });

/* Level 1: a missing else. The class-wide mistake: "if it's false, nothing prints". */
function arcadeChip(p: number, next: () => number): Chip {
  return {
    ...base({ variable: "coins", right: { op: ">=", n: p }, yes: START, no: null, values: [0, p - 1, p, p + 1, 10], demo: p, sticker: ["1 GAME", `${p} COINS`], rule: `A game costs ${p} coins. With ${p} or more, the game starts.` }),
    mode: "pick", broken: { op: ">", n: p },
    pick: shuffle([">=", "<"] as Op[], next), pickHint: "Pick the sign so the price itself starts the game",
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
/* Level 2: >= lets the 0 through. Four signs to choose from. */
function vendingChip(next: () => number): Chip {
  return {
    ...base({ variable: "stock", right: { op: ">", n: 0 }, yes: ENJOY, no: SOLD, values: [0, 1, 2, 5, 9], demo: 0, sticker: ["EMPTY SLOT?", "SOLD OUT!"], rule: "Only sell when there's a snack: stock more than 0. An empty slot (stock 0) says Sold out." }),
    mode: "pick", broken: { op: ">=", n: 0 },
    pick: shuffle([">", ">=", "<", "<="] as Op[], next), pickHint: "Pick the sign so an empty slot (0) says Sold out",
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
/* Level 3: == only lets one number through. Build the condition from pieces. */
function jukeboxChip(next: () => number): Chip {
  return {
    ...base({ variable: "credits", right: { op: ">=", n: 1 }, yes: PLAYING, no: INSERT, values: [0, 1, 2, 3, 5], demo: 2, sticker: ["1 SONG", "1 CREDIT"], rule: "A song costs 1 credit. With 1 credit or more, the song plays. With 0 it says Insert coin." }),
    mode: "tokens", broken: { op: "==", n: 1 },
    tray: shuffle(["credits", ">=", "1", "==", ">"], next), trimmed: ["credits", ">=", "1"],
  };
}
/* Level 4: the sign points the wrong way, and a decoy number. */
function scooterChip(next: () => number): Chip {
  return {
    ...base({ variable: "speed", right: { op: ">", n: 25 }, yes: TOO_FAST, no: SPEED_OK, values: [0, 20, 25, 26, 30], demo: 30, sticker: ["MAX SPEED", "25 KM/H"], rule: "Over 25 km/h the scooter warns: Too fast! At 25 or less it says Speed OK." }),
    mode: "tokens", broken: { op: "<", n: 25 },
    tray: shuffle(["speed", ">", "25", "<", ">=", "20"], next), trimmed: ["speed", ">", "25"],
  };
}
/* Level 5: type the condition. The timer stops at 0 and never goes below it. */
function clawChip(next: () => number): Chip {
  return {
    ...base({ variable: "seconds", right: { op: "<=", n: 0 }, yes: DROP, no: STEER, values: [0, 1, 2, 5, 9], demo: 0, sticker: ["TIME'S UP?", "CLAW DROPS!"], rule: "The timer counts down to 0 and stops there. At 0 the claw drops; before that, keep steering." }),
    mode: "typed", broken: { op: "<", n: 0 },
    tray: shuffle(["seconds", "<=", "0", "<", "="], next), trimmed: ["seconds", "<=", "0"],
  };
}
/* Level 6: type the condition, and write the missing else line. */
function coffeeChip(next: () => number): Chip {
  return {
    ...base({ variable: "water", right: { op: ">=", n: 200 }, yes: BREWING, no: REFILL, values: [0, 150, 199, 200, 500], demo: 0, sticker: ["NEEDS", "200 ML"], rule: "With 200 ml of water or more it brews. With less it must say Refill water: that line is missing, write it." }),
    mode: "else", broken: { op: "<", n: 200 }, brokenElse: false,
    tray: shuffle(["water", ">=", "200", "<", ">"], next), trimmed: ["water", ">=", "200"],
  };
}
/* Level 7, the final round: the program was wiped. Only line 1 is left. */
function robotChip(): Chip {
  return {
    ...base({ variable: "battery", right: { op: ">=", n: 20 }, yes: READY, no: LOW, values: [0, 19, 20, 21, 100], demo: 0, sticker: ["BATTERY", "20 OR MORE"], rule: `With battery 20 or more, the robot says “${READY}”. Otherwise it says “${LOW}”. Write the whole if / else.` }),
    mode: "write", broken: null,
  };
}

/** Screws for a level: every head on the level shows up, in a shuffled order. */
function screwsFor(level: Level, next: () => number): ScrewHead[] {
  const heads = shuffle(level.heads, next);
  return shuffle(Array.from({ length: level.screws }, (_, i) => heads[i % heads.length]), next);
}

/**
 * One ticket: a machine and a seed. The faults vary from ticket to ticket inside each level,
 * so a replayed level never repeats exactly.
 */
export function makeJob(seed: number, machine: MachineId = "arcade"): Job {
  const next = rng(seed);
  const level = levels[machine];
  const screws = screwsFor(level, next);
  const jokes = shuffle(["gum", "mouse", "coin"] as Joke[], next);
  const doors: Door[] = doorSets[machine].map((d, i) => ({ ...d, right: i === 0, joke: null }));
  doors.filter((d) => !d.right).forEach((d, i) => { d.joke = jokes[i]; });
  const dust = 0.55 + Math.round(next() * 9) * 0.05;
  // Cables: one to three hanging loose, the rest plugged in. Every machine with wires has three.
  const sockets = shuffle(symbols, next).map((symbol, i) => ({ id: `s${i}`, symbol }));
  const cables: Cable[] = level.faults.includes("wires") ? palette.map((c, i) => ({ id: c.id, color: c.color, name: c.name, socket: sockets[i].id, at: sockets[i].id })) : [];
  const loose = shuffle(palette, next).slice(0, level.loose).map((c) => c.id);
  for (const cable of cables) if (loose.includes(cable.id)) cable.at = null;
  const job: Job = {
    machine, price: 2, demo: 0, doors, screws, toolbox: [...tools], turns: level.turns, mess: level.mess, dust, faults: [...level.faults],
    sockets: cables.length ? sockets : [], cables, fuse: level.faults.includes("fuse"), snacks: [], empty: { shelf: 0, slot: 0 },
    jam: level.faults.includes("jam") ? 2 + Math.floor(next() * 2) : 0, chip: null!,
  };
  if (machine === "arcade") { const p = 3 + Math.floor(next() * 3); job.price = p; job.chip = arcadeChip(p, next); }
  if (machine === "vending") {
    job.chip = vendingChip(next);
    // Twelve slots: three on each of four shelves. One snack is stuck, and one slot is empty.
    const spots = shuffle(Array.from({ length: 12 }, (_, i) => ({ shelf: Math.floor(i / 3), slot: i % 3 })), next);
    const first = Math.floor(next() * 6);
    job.snacks = spots.slice(0, 1).map((s) => ({ ...s, taps: 2 + Math.floor(next() * 2), color: snackColors[first] }));
    job.empty = spots[1];
  }
  if (machine === "jukebox") { job.price = 2; job.chip = jukeboxChip(next); }
  if (machine === "scooter") job.chip = scooterChip(next);
  if (machine === "claw") job.chip = clawChip(next);
  if (machine === "coffee") job.chip = coffeeChip(next);
  if (machine === "robot") job.chip = robotChip();
  job.demo = machine === "robot" ? null : job.chip.demo;
  return job;
}

/** The practice box in the tutorial: two screws (cross and flat), a back panel and a dusty board. */
export function practiceJob(): Job {
  const job = makeJob(7, "arcade");
  return {
    ...job, practice: true, demo: null, screws: ["cross", "flat"], toolbox: ["hand", "cross", "flat", "blower"], turns: 3,
    doors: [{ id: "back", name: "Back panel", right: true, joke: null }], mess: "dust", dust: 0.7, faults: [], sockets: [], cables: [], fuse: false, snacks: [], jam: 0,
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

/* ---------- Running a chip: the broken one, the fixed one, and the student's ---------- */

/** A program, run for one value: what it prints ("" means nothing at all). */
export type Run = (value: number) => string;
export const rightRun = (job: Job): Run => { const t = testOf(job.chip.right); return (v) => t(v) ? job.chip.yes : job.chip.no ?? ""; };
export const brokenRun = (job: Job): Run => {
  const { broken, yes, no, brokenElse } = job.chip;
  if (!broken) return () => "";
  const t = testOf(broken);
  return (v) => t(v) ? yes : brokenElse ? no ?? "" : "";
};
/** The chip with the student's condition, and their else line when they wrote one. */
export const runWith = (job: Job, test: (value: number) => boolean, elseText?: string): Run =>
  (v) => test(v) ? job.chip.yes : elseText ?? job.chip.no ?? "";
/** What the machine prints for a value with this condition. */
export function printed(job: Job, test: (value: number) => boolean, value: number): string {
  return runWith(job, test)(value);
}
export const rightTest = (job: Job) => testOf(job.chip.right);
export const benchValues = (job: Job) => job.chip.values;

export type BenchRow = { value: number; expected: string; got: string; ok: boolean };
export function bench(job: Job, run: Run): BenchRow[] {
  const right = rightRun(job);
  return benchValues(job).map((value) => {
    const expected = right(value), got = run(value);
    return { value, expected, got, ok: expected === got };
  });
}

/** The C# on the chip. condition: the one shown on line 2. value: a known value, or ? for any. */
export function chipCode(job: Job, condition = job.chip.broken ? condText(job.chip, job.chip.broken) : "", value?: number): string[] {
  const { variable, yes, no, brokenElse, broken } = job.chip;
  const first = `int ${variable} = ${value ?? "?"};`;
  if (!broken) return [first];
  return [
    first,
    `if (${condition})`,
    "{",
    `    Console.WriteLine("${yes}");`,
    "}",
    ...(no !== null && brokenElse ? ["else", "{", `    Console.WriteLine("${no}");`, "}"] : []),
  ];
}
/** The program the student is aiming for: the answer key, shown to the teacher and used by the tests. */
export function answerCode(job: Job): string[] {
  const { variable, yes, no, right } = job.chip;
  return [`if (${variable} ${right.op} ${right.n})`, "{", `    Console.WriteLine("${yes}");`, "}", ...(no !== null ? ["else", "{", `    Console.WriteLine("${no}");`, "}"] : [])];
}

/** One Console.WriteLine line, typed by the student: the text it prints, or what's wrong with it. */
export type ParsedLine = { ok: true; text: string } | { ok: false; error: string };
export function parseWriteLine(source: string): ParsedLine {
  const s = source.trim();
  if (!s) return { ok: false, error: "The line is empty. Write Console.WriteLine(\"…\"); with the text inside the quotes." };
  const m = /^([A-Za-z_][\w]*)\s*\.\s*([A-Za-z_]\w*)\s*\(([\s\S]*)\)\s*(;?)$/.exec(s);
  if (!m) {
    if (/^[A-Za-z_]\w*\s*\.\s*[A-Za-z_]\w*\s*\([\s\S]*$/.test(s) && !s.includes(")")) return { ok: false, error: "A ( is missing its )." };
    return { ok: false, error: "C# can't read this line. It should look like Console.WriteLine(\"text\");" };
  }
  const [, obj, method, arg, semi] = m;
  if (obj !== "Console") return { ok: false, error: obj.toLowerCase() === "console" ? "C# cares about capitals: it's Console, with a capital C." : `C# doesn't know “${obj}”. It's Console.WriteLine.` };
  if (method !== "WriteLine") return { ok: false, error: method.toLowerCase() === "writeline" ? "C# cares about capitals: it's WriteLine, with a capital W and L." : `It's Console.WriteLine, not Console.${method}.` };
  const a = arg.trim();
  const q = /^"([^"]*)"$/.exec(a);
  if (!q) return { ok: false, error: a.startsWith("\"") || a.endsWith("\"") ? "A quote is missing: the text goes between two \" marks." : "Text goes inside quotes, like \"Hello\"." };
  if (!semi) return { ok: false, error: "The line needs a ; at the end." };
  return { ok: true, text: q[1] };
}

/**
 * Tablet keyboards turn a double space into ". " and quotes into curly ones. In code both get in the way,
 * so a ". " that just replaced a space goes back to two spaces, and curly quotes become straight ones.
 * before: the text until now, after: the text with the new key, caret: where the cursor is in after.
 */
export function tidyTyped(before: string, after: string, caret: number): { text: string; caret: number } {
  let text = after;
  if (after.length === before.length + 1 && caret >= 2 && after.slice(caret - 2, caret) === ". " && before.slice(caret - 2, caret - 1) === " "
    && after.slice(0, caret - 2) === before.slice(0, caret - 2) && after.slice(caret) === before.slice(caret - 1)) {
    text = `${after.slice(0, caret - 2)}  ${after.slice(caret)}`;
  }
  return { text: text.replace(/[“”„″]/g, "\"").replace(/[‘’]/g, "'").replace(/ /g, " "), caret };
}

/**
 * The final round: a whole if / else written by hand, after the line `int variable = ?;`.
 * if (condition) { Console.WriteLine("…"); } else { Console.WriteLine("…"); }, braces optional, else optional.
 */
export type ParsedProgram = { ok: true; run: Run } | { ok: false; error: string };
export function parseProgram(source: string, variable: string): ParsedProgram {
  const src = source.replace(/\r/g, "");
  let at = 0;
  const fail = (error: string): never => { throw new Error(error); };
  const space = () => { while (at < src.length && /\s/.test(src[at])) at++; };
  const word = () => { space(); const m = /^[A-Za-z_]\w*/.exec(src.slice(at)); return m ? m[0] : ""; };
  /** The text from here to the bracket that closes the one we're at, brackets inside included. */
  const inside = (open: string, close: string, missing: string) => {
    space();
    if (src[at] !== open) fail(missing);
    let depth = 0, start = at + 1, quoted = false;
    for (; at < src.length; at++) {
      const c = src[at];
      if (c === "\"") quoted = !quoted;
      if (quoted) continue;
      if (c === open) depth++;
      if (c === close && --depth === 0) { const body = src.slice(start, at); at++; return body; }
    }
    return fail(`A ${open} is missing its ${close}.`);
  };
  /** Statements: Console.WriteLine lines, or another if. Returns what runs for a value. */
  const statement = (): Run => {
    const w = word();
    if (w === "if") return ifStatement();
    if (w === "If" || w === "IF") fail("C# cares about capitals: it's if, all lower case.");
    if (w === "else") fail("This else has no if before it. An else always comes right after the if's block.");
    if (w === "int") fail(`Line 1 is already written for you: start with if.`);
    space();
    const end = src.indexOf(";", at), brace = src.indexOf("}", at);
    const stop = end < 0 ? (brace < 0 ? src.length : brace) : brace >= 0 && brace < end ? brace : end + 1;
    const line = parseWriteLine(src.slice(at, stop));
    if (!line.ok) fail(line.error);
    at = stop;
    const text = (line as { text: string }).text;
    return () => text;
  };
  const block = (): Run => {
    space();
    if (src[at] === "{") {
      const body = inside("{", "}", "");
      const inner = parseProgramBody(body, variable);
      return inner;
    }
    return statement();
  };
  const ifStatement = (): Run => {
    at += 2;
    space();
    if (src[at] !== "(") fail("After if comes the condition in brackets: if (…)");
    const cond = inside("(", ")", "");
    const parsed = parseCondition(cond, variable);
    if (!parsed.ok) fail(parsed.error);
    const test = (parsed as { test: (v: number) => boolean }).test;
    const then = block();
    const save = at;
    if (word() === "else") {
      at += 4;
      const other = block();
      return (v) => test(v) ? then(v) : other(v);
    }
    at = save;
    return (v) => test(v) ? then(v) : "";
  };
  try {
    space();
    if (at >= src.length) return { ok: false, error: "The chip is empty. Start with if (…)" };
    if (word() !== "if") {
      const w = word();
      if (w === "If" || w === "IF") return { ok: false, error: "C# cares about capitals: it's if, all lower case." };
      if (w === "int") return { ok: false, error: "Line 1 is already written for you: start with if." };
      return { ok: false, error: "The program starts with if (…)" };
    }
    const run = ifStatement();
    space();
    if (at < src.length) {
      if (src[at] === "}") return { ok: false, error: "There's a } with no { before it." };
      if (word() === "else") return { ok: false, error: "This else has no if before it. An else always comes right after the if's block." };
      return { ok: false, error: `“${src.slice(at).trim().slice(0, 12)}” is left over at the end.` };
    }
    return { ok: true, run };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
/** The inside of a { } block: one or more statements; the last thing printed wins. */
function parseProgramBody(body: string, variable: string): Run {
  const trimmed = body.trim();
  if (!trimmed) return () => "";
  // Split into statements at the top level: each WriteLine ends with ;, an if runs to its block's end.
  const runs: Run[] = [];
  let rest = trimmed;
  while (rest.trim()) {
    rest = rest.trim();
    if (/^if\b/.test(rest)) {
      const parsed = parseProgram(rest, variable);
      if (!parsed.ok) throw new Error(parsed.error);
      runs.push(parsed.run);
      break;
    }
    const end = rest.indexOf(";");
    const line = parseWriteLine(end < 0 ? rest : rest.slice(0, end + 1));
    if (!line.ok) throw new Error(line.error);
    const text = line.text;
    runs.push(() => text);
    rest = end < 0 ? "" : rest.slice(end + 1);
  }
  return (v) => runs.map((r) => r(v)).filter(Boolean).pop() ?? "";
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


/** made: tickets fixed on each machine (a level is cleared from its first fix). tutorial: the practice box is done. */
export type Shop = { coins: number; fixed: number; owned: string[]; equipped: Equipped; made: Partial<Record<MachineId, number>>; tutorial: boolean };
export const freshShop = (): Shop => ({ coins: 0, fixed: 0, owned: Object.values(defaults), equipped: { ...defaults }, made: {}, tutorial: false });
/** Tools used to be for sale. A save that bought one gets its coins back: everyone uses the same hand tools now. */
const retired: Record<string, number> = { drill: 40, turbo: 35 };
export const shopKey = (login: string) => `sharpie.repair.v1.${encodeURIComponent(login.trim().toLowerCase())}`;
const int = (v: unknown, min: number, max: number, fallback = 0) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;

/** Old saves still load: the difficulty fields they carry (clean, rough, shift, streak) are simply dropped. */
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

/** What the teacher dashboard gets from the Repair Shop: the levels cleared (from 1) and the repairs paid. */
export const repairSummary = (shop: Shop) => ({ repairLevels: allMachines.flatMap((m, i) => cleared(shop, m) ? [i + 1] : []), repairFixed: shop.fixed });

/** A paid ticket: the coins, one more repair, and the machine counted (its level is cleared). */
export function afterTicket(shop: Shop, earned: number, machine: MachineId): Shop {
  return { ...shop, coins: shop.coins + earned, fixed: shop.fixed + 1, made: { ...shop.made, [machine]: (shop.made[machine] ?? 0) + 1 } };
}
