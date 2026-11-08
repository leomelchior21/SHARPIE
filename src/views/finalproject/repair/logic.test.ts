import { describe, expect, it } from "vitest";
import { questions } from "../content";
import { freshProgress } from "../progress";
import {
  ENJOY, MORE, SOLD, START, afterTicket, allMachines, bench, brokenTest, buy, catalog, categories, chipCode, condText, equip, evidenceFrom, freshShop, hammerHit, hidesProblem, lookOf, machineOrder, makeJob, nextMachine,
  parseCondition, payout, practiceJob, printed, profileTier, rightTest, roadmap, sanitizeShop, shiftTier, tierOf, tiers, toolFor, tools, unlockedBy, unlockedMachines, type Slips,
} from "./logic";

const quiz = (right: number) => {
  const p = freshProgress();
  questions.forEach((q, i) => { p.answers[q.id] = i < right ? q.answer : (q.answer + 1) % 4; });
  return p;
};
const clean: Slips = { door: 0, tools: 0, wires: 0, chip: 0, help: 0 };
const rough: Slips = { door: 1, tools: 2, wires: 2, chip: 1, help: 2 };

describe("Repair Shop levels", () => {
  it("has three levels, and starts each student from their quiz and Final Bosses results", () => {
    expect(tiers).toEqual(["guided", "supported", "independent"]);
    expect(profileTier(evidenceFrom(quiz(6), null))).toBe("guided");
    expect(profileTier(evidenceFrom(quiz(12), null))).toBe("supported");
    expect(profileTier(evidenceFrom(quiz(16), null))).toBe("independent");
    // Students who would have been Architect start on Independent.
    const bosses = { completedBosses: Array.from({ length: 15 }, (_, i) => i + 1), attemptsByBoss: {} };
    expect(profileTier(evidenceFrom(quiz(19), bosses))).toBe("independent");
    // No quiz yet: the Final Bosses decide.
    expect(profileTier(evidenceFrom(freshProgress(), null))).toBe("guided");
    expect(profileTier(evidenceFrom(freshProgress(), bosses))).toBe("independent");
  });

  it("moves between levels without leaving the scale, and reads the old Architect as Independent", () => {
    expect(shiftTier("guided", -2)).toBe("guided");
    expect(shiftTier("guided", 1)).toBe("supported");
    expect(shiftTier("supported", 3)).toBe("independent");
    expect(tierOf("architect")).toBe("independent");
    expect(tierOf("supported")).toBe("supported");
    expect(tierOf("wizard")).toBeNull();
  });

  it("two clean tickets bring harder machines, two rough ones bring more help", () => {
    let shop = afterTicket(freshShop(), clean, 50, "guided", "arcade");
    expect(shop.shift).toBe(0);
    shop = afterTicket(shop, clean, 50, "guided", "arcade");
    expect(shop).toMatchObject({ shift: 1, coins: 100, fixed: 2 });
    shop = afterTicket(afterTicket(shop, rough, 20, "guided", "arcade"), rough, 20, "guided", "arcade");
    expect(shop.shift).toBe(0);
    // A wrong door alone keeps a ticket from being clean.
    expect(afterTicket(freshShop(), { ...clean, door: 1 }, 45, "guided", "arcade").clean).toBe(0);
  });

  it("Independent: after two clean tickets in a row the customer stops showing the problem", () => {
    let shop = afterTicket(freshShop(), clean, 50, "independent", "arcade");
    expect(hidesProblem(shop, "independent")).toBe(false);
    shop = afterTicket(shop, clean, 50, "independent", "arcade");
    expect(hidesProblem(shop, "independent")).toBe(true);
    expect(makeJob("independent", 5, "arcade", true).demo).toBeNull();
    expect(makeJob("independent", 5, "arcade", false).demo).toBe(makeJob("independent", 5).price);
    // Only on Independent, and one rough ticket starts the count again.
    expect(hidesProblem(shop, "supported")).toBe(false);
    expect(afterTicket(shop, rough, 20, "independent", "arcade").streak).toBe(0);
  });

  it("reads old and damaged saves safely", () => {
    // The first test build saved bought things as "tools"; four tiers allowed a shift of 3.
    const old = sanitizeShop({ coins: -5, tools: ["drill", "laser", "cat"], shift: 3, intro: true });
    // Tools are not for sale any more: the electric screwdriver's 40 coins come back.
    expect(old).toMatchObject({ coins: 40, shift: 2, streak: 0, tutorial: false });
    expect(sanitizeShop({ shift: -99 }).shift).toBe(-2);
    expect(old.owned).toEqual(expect.arrayContaining(["cat", "bench-wood", "floor-checker", "light-warm"]));
    expect(old.owned).not.toContain("drill");
    expect(old.owned).not.toContain("laser");
    expect(sanitizeShop({ coins: 10, owned: ["drill", "turbo"] }).coins).toBe(85);
    expect(sanitizeShop({ owned: ["floor-wood"], equipped: { floor: "floor-galaxy", bench: "nope" } }).equipped).toEqual(freshShop().equipped);
    expect(sanitizeShop({ tutorial: true, made: { arcade: 3, vending: "x", robot: 9 } })).toMatchObject({ tutorial: true, made: { arcade: 3 } });
    expect(sanitizeShop("nope")).toEqual(freshShop());
  });

  it("counts repairs per machine, for the menu", () => {
    const shop = afterTicket(afterTicket(freshShop(), clean, 30, "guided", "arcade"), clean, 30, "guided", "vending");
    expect(shop.made).toEqual({ arcade: 1, vending: 1 });
    expect(roadmap.map((m) => m.name)).toEqual(["Arcade", "Vending machine", "Jukebox", "Crosswalk light", "Claw machine", "Coffee machine", "Robot"]);
  });

  it("sells no tools: everyone uses the same hand tools", () => {
    expect(categories.map((c) => c.id)).toEqual(["bench", "floor", "light", "decor"]);
    expect(catalog.some((i) => ["drill", "turbo"].includes(i.id))).toBe(false);
  });

  it("the tutorial's practice box: two screws, one panel, dust, no faults", () => {
    const job = practiceJob();
    expect(job).toMatchObject({ practice: true, screws: ["cross", "flat"], toolbox: ["hand", "cross", "flat", "blower"], faults: [], cables: [], demo: null });
    expect(job.doors).toEqual([{ id: "back", name: "Back panel", right: true, joke: null }]);
  });
});

describe("The shop economy", () => {
  it("pays the machine's fee and tips for clean work", () => {
    const arcade = makeJob("guided", 1, "arcade"), vending = makeJob("guided", 1, "vending");
    expect(payout(clean, arcade).tips.map((t) => t.label)).toEqual(["Right door first", "Right tool every time", "Clean wiring", "Chip right first time", "No help needed"]);
    expect(payout(clean, arcade).total).toBe(50);
    // The vending machine has no wiring, so no wiring tip, and a bigger fee.
    expect(payout(clean, vending).tips.map((t) => t.label)).not.toContain("Clean wiring");
    expect(payout(clean, vending).total).toBe(50);
    expect(payout({ ...clean, door: 1 }, arcade).total).toBe(45);
    expect(payout(rough, arcade).total).toBe(20);
  });

  it("buys upgrades with coins and puts benches, floors and lights into use", () => {
    let shop = { ...freshShop(), coins: 50 };
    expect(buy(shop, "floor-galaxy")).toBe(shop);
    shop = buy(shop, "floor-wood");
    expect(shop).toMatchObject({ coins: 25, equipped: { floor: "floor-wood" } });
    expect(buy(shop, "floor-wood")).toBe(shop);
    shop = buy(shop, "plant");
    expect(lookOf(shop)).toEqual({ bench: "bench-wood", floor: "floor-wood", light: "light-warm", decor: ["plant"] });
    shop = equip(shop, "floor-checker");
    expect(shop.equipped.floor).toBe("floor-checker");
    expect(equip(shop, "floor-galaxy")).toBe(shop);
  });
});

describe("Repair Shop machines", () => {
  it("has eight tools: hand, three screwdrivers, blower, pliers, hammer and tape", () => {
    expect(tools).toEqual(["hand", "cross", "flat", "star", "blower", "pliers", "hammer", "tape"]);
  });

  it("opens the same way on every level: only the chip changes", () => {
    for (const machine of machineOrder) {
      const jobs = tiers.map((t) => makeJob(t, 42, machine));
      for (const job of jobs) {
        // Four screws with cross, flat and star heads: one head comes twice.
        expect(job.screws).toHaveLength(4);
        expect(new Set(job.screws)).toEqual(new Set(["cross", "flat", "star"]));
        expect(job.turns).toBe(5);
        // The whole toolbox, always: what this machine doesn't need is a decoy.
        expect(job.toolbox).toEqual([...tools]);
        // Exactly one right door; every wrong one hides a joke.
        expect(job.doors.filter((d) => d.right)).toHaveLength(1);
        for (const d of job.doors.filter((x) => !x.right)) expect(["gum", "mouse", "coin"]).toContain(d.joke);
      }
      const { chip: _c, tier: _t, ...hands } = jobs[0];
      for (const job of jobs.slice(1)) { const { chip: _c2, tier: _t2, ...other } = job; expect(other).toEqual(hands); }
      expect(jobs.map((j) => j.chip.mode)).toEqual(["predict-pick", "tokens", "typed"]);
    }
    expect(makeJob("guided", 1, "arcade").doors.map((d) => [d.id, d.right])).toEqual([["back", true], ["coin", false]]);
    expect(makeJob("guided", 1, "vending").doors.map((d) => [d.id, d.right])).toEqual([["glass", true], ["side", false], ["coinbox", false]]);
  });

  it("uses the blower on every machine, each with its own mess, then that machine's tools", () => {
    expect(makeJob("guided", 3, "arcade")).toMatchObject({ mess: "dust" });
    expect(makeJob("guided", 3, "vending")).toMatchObject({ mess: "crumbs", faults: ["snack"] });
    for (let seed = 1; seed < 40; seed++) for (const machine of machineOrder) {
      const job = makeJob("guided", seed, machine);
      expect(job.dust).toBeGreaterThanOrEqual(0.55);
      expect(job.dust).toBeLessThanOrEqual(1);
      for (const fault of job.faults) expect(job.toolbox).toContain(toolFor[fault]);
    }
    expect(toolFor.dust).toBe("blower");
    expect(toolFor.snack).toBe("hammer");
  });

  it("varies the faults from ticket to ticket", () => {
    const arcades = Array.from({ length: 60 }, (_, i) => makeJob("guided", i + 1, "arcade"));
    expect(new Set(arcades.map((j) => j.cables.filter((c) => c.at === null).length))).toEqual(new Set([1, 2]));
    expect(new Set(arcades.map((j) => j.fuse))).toEqual(new Set([true, false]));
    expect(arcades.every((j) => j.faults.includes("fuse") === j.fuse)).toBe(true);
    expect(new Set(arcades.map((j) => j.dust)).size).toBeGreaterThan(3);
    const vendings = Array.from({ length: 60 }, (_, i) => makeJob("guided", i + 1, "vending"));
    expect(new Set(vendings.map((j) => j.snacks.length))).toEqual(new Set([1, 2]));
    expect(new Set(vendings.flatMap((j) => j.snacks.map((s) => s.taps)))).toEqual(new Set([2, 3]));
    for (const j of vendings) expect(j.snacks.some((s) => s.shelf === j.empty.shelf && s.slot === j.empty.slot)).toBe(false);
  });

  it("builds the same machine from the same seed, and every cable has its own socket", () => {
    expect(makeJob("independent", 7, "vending")).toEqual(makeJob("independent", 7, "vending"));
    for (let seed = 1; seed < 60; seed++) for (const t of tiers) {
      const job = makeJob(t, seed);
      expect([3, 4, 5]).toContain(job.price);
      expect(job.chip.sticker).toEqual(["1 GAME", `${job.price} COINS`]);
      expect(new Set(job.cables.map((c) => c.socket)).size).toBe(3);
      const taken = job.cables.map((c) => c.at).filter(Boolean);
      expect(new Set(taken).size).toBe(taken.length);
    }
  });

  it("unlocks a new machine every 3 tickets, then brings any unlocked one", () => {
    expect(unlockedMachines(0)).toEqual(["arcade"]);
    expect(unlockedMachines(2)).toEqual(["arcade"]);
    expect(unlockedMachines(3)).toEqual(["arcade", "vending"]);
    expect(unlockedMachines(99)).toEqual(["arcade", "vending"]);
    for (let seed = 1; seed < 30; seed++) {
      expect(nextMachine(1, seed)).toBe("arcade");
      // The ticket right after the unlock brings the new machine.
      expect(nextMachine(3, seed)).toBe("vending");
    }
    expect(new Set(Array.from({ length: 40 }, (_, seed) => nextMachine(4, seed + 1)))).toEqual(new Set(["arcade", "vending"]));
    expect(unlockedBy(2, 3)).toBe("vending");
    expect(unlockedBy(3, 4)).toBeNull();
  });

  it("the hammer: gentle taps work, too hard breaks something", () => {
    expect(hammerHit(0.1)).toBe("soft");
    expect(hammerHit(0.4)).toBe("good");
    expect(hammerHit(0.9)).toBe("hard");
  });
});

describe("The logic chip", () => {
  it("only ever needs one if with one comparison", () => {
    for (const machine of machineOrder) for (const t of tiers) for (const seed of [1, 2, 3]) {
      const { chip } = makeJob(t, seed, machine);
      expect(condText(chip, chip.right)).toMatch(/^\w+ (>|<|>=|<=|==|!=) \d+$/);
      expect(chipCode(makeJob(t, seed, machine)).join("\n")).not.toMatch(/&&|\|\||else if|switch/);
    }
  });

  describe("on the arcade", () => {
    const job = makeJob("independent", 3);
    const p = job.price;
    const ok = (source: string) => { const r = parseCondition(source); return r.ok && bench(job, r.test).every((row) => row.ok); };
    const error = (source: string) => { const r = parseCondition(source); return r.ok ? "" : r.error; };

    it("accepts every condition that behaves right", () => {
      expect(ok(`coins >= ${p}`)).toBe(true);
      expect(ok(`coins > ${p - 1}`)).toBe(true);
      expect(ok(`${p} <= coins`)).toBe(true);
      expect(ok(`!(coins < ${p})`)).toBe(true);
      // && still works for a student who knows it, though no machine needs it.
      expect(ok(`coins >= ${p} && coins <= 100`)).toBe(true);
      expect(ok(`coins > ${p}`)).toBe(false);
      expect(ok(`coins == ${p}`)).toBe(false);
    });

    it("explains the usual mistakes in plain words", () => {
      expect(error(`coins = ${p}`)).toMatch(/One = stores a value/);
      expect(error(`coins => ${p}`)).toMatch(/>=/);
      expect(error(`Coins >= ${p}`)).toMatch(/capitals/);
      expect(error(`money >= ${p}`)).toMatch(/doesn't know/);
      expect(error("")).toMatch(/empty/);
      expect(error(`coins >=`)).toMatch(/missing/);
      expect(error(`(coins >= ${p}`)).toMatch(/\)/);
    });

    it("checks five coin counts around the price; Guided machines have no else", () => {
      const rows = bench(job, rightTest(job));
      expect(rows.map((r) => r.value)).toEqual([0, p - 1, p, p + 1, 10]);
      expect(rows.find((r) => r.value === p)?.expected).toBe(START);
      expect(bench(job, brokenTest(job)).filter((r) => !r.ok).map((r) => r.value)).toEqual([p]);
      expect(printed(job, brokenTest(job), p)).toBe(MORE);
      const guided = makeJob("guided", 3);
      expect(guided.chip.no).toBeNull();
      expect(printed(guided, brokenTest(guided), guided.price)).toBe("");
      expect(chipCode(guided)[0]).toBe("int coins = ?;");
    });
  });

  describe("on the vending machine", () => {
    const job = makeJob("independent", 9, "vending");
    const ok = (source: string) => { const r = parseCondition(source, "stock"); return r.ok && bench(job, r.test).every((row) => row.ok); };

    it("sells from an empty slot: stock >= 0 should be stock > 0", () => {
      expect(chipCode(job)).toEqual(["int stock = ?;", "if (stock >= 0)", "{", `    Console.WriteLine("${ENJOY}");`, "}", "else", "{", `    Console.WriteLine("${SOLD}");`, "}"]);
      expect(printed(job, brokenTest(job), 0)).toBe(ENJOY);
      expect(printed(job, rightTest(job), 0)).toBe(SOLD);
      expect(bench(job, brokenTest(job)).filter((r) => !r.ok).map((r) => r.value)).toEqual([0]);
      expect(ok("stock > 0")).toBe(true);
      expect(ok("stock >= 1")).toBe(true);
      expect(ok("stock != 0")).toBe(true);
      expect(ok("stock >= 0")).toBe(false);
      expect(ok("stock < 0")).toBe(false);
      const r = parseCondition("Stock > 0", "stock");
      expect(r.ok ? "" : r.error).toMatch(/capitals: it's stock/);
      const r2 = parseCondition("coins > 0", "stock");
      expect(r2.ok ? "" : r2.error).toMatch(/called stock/);
    });

    it("helps differently on each level", () => {
      const [guided, supported] = [makeJob("guided", 9, "vending"), makeJob("supported", 9, "vending")];
      // Guided: predict what an empty slot prints, then pick between two signs.
      expect(guided.chip.predict.options[guided.chip.predict.answer]).toBe(`“${ENJOY}”`);
      expect([...guided.chip.pick].sort()).toEqual(["<=", ">"]);
      // Supported: the three pieces it needs and two decoys.
      expect([...supported.chip.tray].sort()).toEqual(["0", "=", ">", ">=", "stock"]);
      expect(supported.chip.trimmed).toEqual(["stock", ">", "0"]);
      // Guided and Supported get the rule in words; everyone sees the sticker.
      expect(job.chip.rule).toMatch(/stock more than 0/);
      expect(job.chip.sticker).toEqual(["EMPTY SLOT?", "SOLD OUT!"]);
    });
  });
});

describe("The claw machine", () => {
  it("is built but not in the students' unlock order yet: it is number 5 on the roadmap", () => {
    expect(allMachines).toContain("claw");
    expect(machineOrder).not.toContain("claw");
    expect(unlockedMachines(99)).not.toContain("claw");
  });
  it("has three doors, fluff, the bent finger, and a timer chip with one comparison", () => {
    const job = makeJob("guided", 3, "claw");
    expect(job.doors.map((d) => [d.id, d.right])).toEqual([["glass", true], ["control", false], ["base", false]]);
    expect(job).toMatchObject({ mess: "fluff", faults: ["claw"], price: 2, demo: 0 });
    expect(printed(job, brokenTest(job), 0)).toBe("Keep steering");
    expect(printed(job, rightTest(job), 0)).toBe("DROP!");
    const ok = parseCondition("seconds == 0", "seconds");
    expect(ok.ok && bench(job, ok.test).every((r) => r.ok)).toBe(true);
    expect(toolFor.claw).toBe("pliers");
  });
});

