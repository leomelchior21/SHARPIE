import { describe, expect, it } from "vitest";
import {
  BREWING, DROP, ENJOY, INSERT, LOW, PLAYING, READY, REFILL, SOLD, SPEED_OK, START, STEER, TOO_FAST,
  afterTicket, allMachines, answerCode, bench, brokenRun, buy, catalog, categories, chipCode, cleared, equip, freshShop, hammerHit, levelOf, levelOpen, lookOf,
  makeJob, nextMachine, parseCondition, parseProgram, parseWriteLine, payout, practiceJob, rightRun, roadmap, runWith, sanitizeShop, testOf, toolInfo, tools, unlockedBy,
  type MachineId, type Shop, type Slips,
} from "./logic";

const clean: Slips = { door: 0, tools: 0, wires: 0, chip: 0, help: 0 };
const rough: Slips = { door: 2, tools: 2, wires: 1, chip: 1, help: 2 };
/** A shop that has cleared the first n levels. */
const upTo = (n: number): Shop => ({ ...freshShop(), made: Object.fromEntries(allMachines.slice(0, n).map((m) => [m, 1])) });

describe("The seven levels", () => {
  it("are the seven machines, in order, with the Robot as the boss", () => {
    expect(roadmap.map((m) => m.name)).toEqual(["Arcade", "Vending machine", "Jukebox", "Electric scooter", "Claw machine", "Coffee machine", "Robot"]);
    expect(roadmap.filter((m) => m.boss).map((m) => m.id)).toEqual(["robot"]);
    expect(allMachines.map(levelOf)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("open one by one: fixing a level opens the next. The teacher has them all", () => {
    const fresh = freshShop();
    expect(allMachines.filter((m) => levelOpen(fresh, m))).toEqual(["arcade"]);
    expect(allMachines.filter((m) => levelOpen(upTo(3), m))).toEqual(["arcade", "vending", "jukebox", "scooter"]);
    expect(allMachines.every((m) => levelOpen(fresh, m, true))).toBe(true);
    expect(unlockedBy(fresh, "arcade")).toBe("vending");
    // A replay of a cleared level opens nothing new; the Robot has nothing after it.
    expect(unlockedBy(upTo(1), "arcade")).toBeNull();
    expect(unlockedBy(upTo(6), "robot")).toBeNull();
  });

  it("brings the first open level not fixed yet, then any machine once all seven are fixed", () => {
    expect(nextMachine(freshShop(), 1)).toBe("arcade");
    expect(nextMachine(upTo(4), 123)).toBe("claw");
    const all = upTo(7);
    const seen = new Set(Array.from({ length: 60 }, (_, i) => nextMachine(all, i * 7919)));
    expect(seen.size).toBeGreaterThan(4);
  });

  it("get a little harder each time: more screws, more turns, more faults", () => {
    const jobs = allMachines.map((m) => makeJob(5, m));
    expect(jobs.map((j) => j.faults)).toEqual([["wires"], ["snack"], ["wires", "fuse"], ["tape", "wires"], ["claw", "tape"], ["wires", "fuse", "tape"], ["wires", "fuse", "tape", "jam"]]);
    expect(jobs.map((j) => j.screws.length)).toEqual([4, 4, 4, 4, 4, 6, 6]);
    expect(jobs.map((j) => j.turns)).toEqual([4, 4, 5, 5, 5, 5, 6]);
    // Level 1 only has cross and flat screws; from level 2 every head shows up.
    expect(new Set(jobs[0].screws)).toEqual(new Set(["cross", "flat"]));
    for (const j of jobs.slice(1)) expect(new Set(j.screws)).toEqual(new Set(["cross", "flat", "star"]));
    expect(jobs.map((j) => j.chip.mode)).toEqual(["pick", "pick", "tokens", "tokens", "typed", "else", "write"]);
    expect(jobs.map((j) => j.cables.filter((c) => !c.at).length)).toEqual([1, 0, 2, 2, 0, 2, 3]);
  });

  it("each has its doors, the right one first, with a joke behind every wrong one", () => {
    for (const m of allMachines) {
      const job = makeJob(9, m);
      expect(job.doors[0].right).toBe(true);
      expect(job.doors.filter((d) => d.right)).toHaveLength(1);
      for (const d of job.doors.slice(1)) expect(d.joke).not.toBeNull();
    }
    expect(makeJob(1, "claw").doors.map((d) => d.id)).toEqual(["back", "control", "base"]);
    expect(makeJob(1, "scooter").doors.map((d) => d.name)).toEqual(["Battery cover", "Stem box", "Front lamp"]);
    expect(makeJob(1, "vending").doors[0].id).toBe("glass");
  });

  it("builds the same machine from the same seed, and varies it from seed to seed", () => {
    expect(makeJob(42, "coffee")).toEqual(makeJob(42, "coffee"));
    const screws = new Set(Array.from({ length: 12 }, (_, i) => makeJob(i * 101, "robot").screws.join()));
    expect(screws.size).toBeGreaterThan(3);
    const job = makeJob(3, "robot");
    expect(new Set(job.cables.map((c) => c.socket)).size).toBe(3);
    expect(job.jam).toBeGreaterThanOrEqual(2);
  });

  it("the tutorial's practice box: two screws, one panel, dust, no faults", () => {
    const job = practiceJob();
    expect(job).toMatchObject({ practice: true, screws: ["cross", "flat"], toolbox: ["hand", "cross", "flat", "blower"], faults: [], cables: [], demo: null, jam: 0 });
    expect(job.doors).toEqual([{ id: "back", name: "Back panel", right: true, joke: null }]);
  });

  it("has eight tools, and the hammer only likes gentle taps", () => {
    expect([...tools]).toEqual(["hand", "cross", "flat", "star", "blower", "pliers", "hammer", "tape"]);
    expect(toolInfo.tape.name).toBe("Electrical tape");
    expect([hammerHit(0.1), hammerHit(0.4), hammerHit(0.9)]).toEqual(["soft", "good", "hard"]);
  });
});

describe("The logic chip, level by level", () => {
  it("is broken on every level, and the right condition passes every bench test", () => {
    for (const m of allMachines) {
      const job = makeJob(11, m);
      expect(bench(job, brokenRun(job)).some((r) => !r.ok)).toBe(true);
      expect(bench(job, rightRun(job)).every((r) => r.ok)).toBe(true);
    }
  });

  it("shows what the customer sees", () => {
    const arcade = makeJob(1, "arcade");
    expect(brokenRun(arcade)(arcade.price)).toBe("");
    expect(rightRun(arcade)(arcade.price)).toBe(START);
    expect(brokenRun(makeJob(1, "vending"))(0)).toBe(ENJOY);
    expect(rightRun(makeJob(1, "vending"))(0)).toBe(SOLD);
    expect(brokenRun(makeJob(1, "jukebox"))(2)).toBe(INSERT);
    expect(rightRun(makeJob(1, "jukebox"))(2)).toBe(PLAYING);
    expect(brokenRun(makeJob(1, "scooter"))(30)).toBe(SPEED_OK);
    expect(rightRun(makeJob(1, "scooter"))(30)).toBe(TOO_FAST);
    expect(rightRun(makeJob(1, "scooter"))(25)).toBe(SPEED_OK);
    expect(brokenRun(makeJob(1, "claw"))(0)).toBe(STEER);
    expect(rightRun(makeJob(1, "claw"))(0)).toBe(DROP);
    // The coffee machine brews with an empty tank, and has no else at all.
    expect(brokenRun(makeJob(1, "coffee"))(0)).toBe(BREWING);
    expect(brokenRun(makeJob(1, "coffee"))(500)).toBe("");
    expect(rightRun(makeJob(1, "coffee"))(150)).toBe(REFILL);
    // The Robot's program was wiped: it says nothing.
    expect(makeJob(1, "robot").demo).toBeNull();
    expect(brokenRun(makeJob(1, "robot"))(50)).toBe("");
    expect([rightRun(makeJob(1, "robot"))(19), rightRun(makeJob(1, "robot"))(20)]).toEqual([LOW, READY]);
  });

  it("levels 1 and 2: predict first, then pick the sign from two, then from four", () => {
    const arcade = makeJob(2, "arcade"), vending = makeJob(2, "vending");
    expect(arcade.chip.predict?.options[arcade.chip.predict.answer]).toBe("Nothing at all");
    expect(arcade.chip.no).toBeNull();
    expect([...arcade.chip.pick].sort()).toEqual(["<", ">="]);
    expect(vending.chip.predict?.options[vending.chip.predict.answer]).toBe(`“${ENJOY}”`);
    expect([...vending.chip.pick].sort()).toEqual(["<", "<=", ">", ">="]);
  });

  it("levels 3 and 4: code pieces with decoys, and fewer pieces after two misses", () => {
    const juke = makeJob(2, "jukebox"), scooter = makeJob(2, "scooter");
    expect(juke.chip.tray).toHaveLength(5);
    expect(juke.chip.trimmed).toEqual(["credits", ">=", "1"]);
    expect(scooter.chip.tray).toEqual(expect.arrayContaining(["speed", ">", "25", "20"]));
    expect(scooter.chip.trimmed).toEqual(["speed", ">", "25"]);
  });

  it("level 6: the else line is missing, and the student writes it", () => {
    const job = makeJob(2, "coffee");
    expect(chipCode(job)).not.toContain("else");
    const right = parseCondition("water >= 200", "water");
    if (!right.ok) throw new Error(right.error);
    const line = parseWriteLine('Console.WriteLine("Refill water");');
    if (!line.ok) throw new Error(line.error);
    expect(bench(job, runWith(job, right.test, line.text)).every((r) => r.ok)).toBe(true);
    // Without the else, 150 ml says nothing: a bench test fails.
    expect(bench(job, runWith(job, right.test, "")).some((r) => !r.ok)).toBe(true);
  });

  it("level 7, the final round: only line 1 is left", () => {
    const job = makeJob(2, "robot");
    expect(chipCode(job)).toEqual(["int battery = ?;"]);
    expect(answerCode(job).join("\n")).toBe('if (battery >= 20)\n{\n    Console.WriteLine("Ready to work!");\n}\nelse\n{\n    Console.WriteLine("Low battery!");\n}');
  });

  it("accepts every condition that behaves right, and explains the usual mistakes", () => {
    const job = makeJob(4, "arcade"), p = job.price;
    for (const c of [`coins >= ${p}`, `coins > ${p - 1}`, `${p} <= coins`, `!(coins < ${p})`]) {
      const parsed = parseCondition(c);
      if (!parsed.ok) throw new Error(parsed.error);
      expect(bench(job, runWith(job, parsed.test)).every((r) => r.ok)).toBe(true);
    }
    const error = (c: string, v = "coins") => { const r = parseCondition(c, v); return r.ok ? "" : r.error; };
    expect(error("coins = 3")).toMatch(/One = stores a value/);
    expect(error("coins => 3")).toMatch(/other way round: >=/);
    expect(error("Coins >= 3")).toMatch(/capitals/);
    expect(error("price >= 3")).toMatch(/doesn't know “price”/);
    expect(error("")).toMatch(/empty/);
    expect(testOf({ op: "!=", n: 2 })(3)).toBe(true);
  });
});

describe("Reading a hand-written line and program", () => {
  it("reads a Console.WriteLine line, and says what's wrong with a broken one", () => {
    expect(parseWriteLine('Console.WriteLine("Hi there");')).toEqual({ ok: true, text: "Hi there" });
    expect(parseWriteLine('  Console . WriteLine ( "Hi" ) ;  ')).toEqual({ ok: true, text: "Hi" });
    const error = (s: string) => { const r = parseWriteLine(s); return r.ok ? "" : r.error; };
    expect(error('console.WriteLine("Hi");')).toMatch(/capital C/);
    expect(error('Console.Writeline("Hi");')).toMatch(/capital W and L/);
    expect(error('Console.Print("Hi");')).toMatch(/not Console.Print/);
    expect(error("Console.WriteLine(Hi);")).toMatch(/inside quotes/);
    expect(error('Console.WriteLine("Hi);')).toMatch(/quote is missing/);
    expect(error('Console.WriteLine("Hi")')).toMatch(/;/);
    expect(error("")).toMatch(/empty/);
  });

  const robot = makeJob(8, "robot");
  const passes = (source: string) => { const r = parseProgram(source, "battery"); if (!r.ok) throw new Error(r.error); return bench(robot, r.run).every((x) => x.ok); };
  const error = (source: string) => { const r = parseProgram(source, "battery"); return r.ok ? "" : r.error; };

  it("runs a whole if / else, with or without braces and on one line or many", () => {
    expect(passes(answerCode(robot).join("\n"))).toBe(true);
    expect(passes('if (battery >= 20) Console.WriteLine("Ready to work!"); else Console.WriteLine("Low battery!");')).toBe(true);
    expect(passes('if (battery < 20) { Console.WriteLine("Low battery!"); } else { Console.WriteLine("Ready to work!"); }')).toBe(true);
    expect(passes('if (battery >= 20)\n{\n  Console.WriteLine("Ready to work!");\n}\nelse if (battery < 20)\n{\n  Console.WriteLine("Low battery!");\n}')).toBe(true);
    // Running, but wrong: no else, or the wrong text.
    expect(passes('if (battery >= 20) { Console.WriteLine("Ready to work!"); }')).toBe(false);
    expect(passes('if (battery > 20) { Console.WriteLine("Ready to work!"); } else { Console.WriteLine("Low battery!"); }')).toBe(false);
    expect(passes('if (battery >= 20) { Console.WriteLine("ready to work"); } else { Console.WriteLine("Low battery!"); }')).toBe(false);
  });

  it("explains the usual mistakes in plain words", () => {
    expect(error("")).toMatch(/empty/);
    expect(error('If (battery >= 20) { Console.WriteLine("A"); }')).toMatch(/lower case/);
    expect(error('int battery = 5;\nif (battery >= 20) { Console.WriteLine("A"); }')).toMatch(/Line 1 is already written/);
    expect(error('if battery >= 20 { Console.WriteLine("A"); }')).toMatch(/brackets/);
    expect(error('if (battery >= 20) { Console.WriteLine("A") }')).toMatch(/;/);
    expect(error('if (battery >= 20) { Console.WriteLine("A");')).toMatch(/\{ is missing its \}/);
    expect(error('if (battery = 20) { Console.WriteLine("A"); }')).toMatch(/One = stores a value/);
    expect(error('if (battery >= 20) { Console.WriteLine("A"); } }')).toMatch(/\} with no \{/);
    expect(error('if (battery >= 20) { console.WriteLine("A"); }')).toMatch(/capital C/);
    expect(error('Console.WriteLine("A");')).toMatch(/starts with if/);
  });
});

describe("The shop economy and the save", () => {
  it("pays the machine's fee and tips for clean work", () => {
    const arcade = makeJob(1, "arcade"), vending = makeJob(1, "vending");
    expect(payout(clean, arcade).tips.map((t) => t.label)).toEqual(["Right door first", "Right tool every time", "Clean wiring", "Chip right first time", "No help needed"]);
    expect(payout(clean, arcade).total).toBe(50);
    expect(payout(clean, vending).tips.map((t) => t.label)).not.toContain("Clean wiring");
    expect(payout(clean, vending).total).toBe(50);
    expect(payout(rough, arcade).total).toBe(20);
    expect(allMachines.map((m) => payout(rough, makeJob(1, m)).base)).toEqual([20, 25, 30, 35, 40, 45, 60]);
  });

  it("counts a paid ticket: coins, one more repair, and the level cleared", () => {
    const shop = afterTicket(afterTicket(freshShop(), 30, "arcade"), 40, "arcade");
    expect(shop).toMatchObject({ coins: 70, fixed: 2, made: { arcade: 2 } });
    expect(cleared(shop, "arcade")).toBe(true);
    expect(cleared(shop, "vending")).toBe(false);
  });

  it("reads old and damaged saves safely, dropping the old difficulty fields", () => {
    const old = sanitizeShop({ coins: -5, tools: ["drill", "laser", "cat"], shift: 3, streak: 4, clean: 1, intro: true });
    expect(old).toEqual({ ...freshShop(), coins: 40, owned: expect.arrayContaining(["cat", "bench-wood"]) });
    expect(old).not.toHaveProperty("shift");
    expect(sanitizeShop({ coins: 10, owned: ["drill", "turbo"] }).coins).toBe(85);
    expect(sanitizeShop({ owned: ["floor-wood"], equipped: { floor: "floor-galaxy", bench: "nope" } }).equipped).toEqual(freshShop().equipped);
    expect(sanitizeShop({ tutorial: true, made: { arcade: 3, vending: "x", robot: 9, crosswalk: 2 } as Record<string, unknown> })).toMatchObject({ tutorial: true, made: { arcade: 3, robot: 9 } });
    expect(sanitizeShop("nope")).toEqual(freshShop());
  });

  it("sells no tools, only upgrades, and puts benches, floors and lights into use", () => {
    expect(categories.map((c) => c.id)).toEqual(["bench", "floor", "light", "decor"]);
    expect(catalog.some((i) => ["drill", "turbo"].includes(i.id))).toBe(false);
    let shop = { ...freshShop(), coins: 50 };
    expect(buy(shop, "floor-galaxy")).toBe(shop);
    shop = buy(shop, "floor-wood");
    expect(shop).toMatchObject({ coins: 25, equipped: { floor: "floor-wood" } });
    shop = buy(shop, "plant");
    expect(lookOf(shop)).toEqual({ bench: "bench-wood", floor: "floor-wood", light: "light-warm", decor: ["plant"] });
    shop = equip(shop, "floor-checker");
    expect(shop.equipped.floor).toBe("floor-checker");
    expect(equip(shop, "floor-galaxy")).toBe(shop);
  });

  it("types every machine id", () => {
    const ids: MachineId[] = ["arcade", "vending", "jukebox", "scooter", "claw", "coffee", "robot"];
    expect(ids).toEqual([...allMachines]);
  });
});
