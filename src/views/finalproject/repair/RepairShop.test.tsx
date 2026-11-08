import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FinalProject } from "../FinalProject";
import { storageKey } from "../progress";
import { findStudent } from "../../../data/roster";
import { answerCode, jokeText, makeJob, shopKey } from "./logic";

// The test browser has no WebGL: the shop runs with its buttons only, as on an old tablet.
vi.mock("./workshop", () => ({ webglAvailable: () => false, Workshop: class {}, headColors: { cross: "#e5484d", flat: "#ffd23f", star: "#3d8bff" } }));
vi.mock("../../../lib/progressStore", () => ({ loadProgress: vi.fn(async () => null), saveProgress: vi.fn(async () => undefined), canSyncProgress: () => false }));

// Real logins from the roster: the Repair Shop is for 9B, 9C and 9D only, for now.
const nineA = "anazancaner", nineB = "anawerneck", nineC = "alinesako", nineD = "carolinaramos";
// Every ticket's seed comes from Math.random: a fixed value makes the machine known in advance.
const SEED = 500000000;
const tick = (ms = 2000) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const click = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));
const title = () => document.querySelector(".rp-mission h2")?.textContent ?? "";
const toast = () => document.querySelector(".rp-toast")?.textContent ?? "";
const saved = (login: string) => JSON.parse(localStorage.getItem(shopKey(login))!);
const cards = () => [...document.querySelectorAll(".fp-stage")].map((c) => `${c.querySelector(".memory-card-number")?.textContent} ${c.querySelector("strong")?.textContent}`);
const mount = (login: string, isTeacher = false) => render(<FinalProject name="Ada Lovelace" studentKey={login} isTeacher={isTeacher} onBack={vi.fn()} />);
const doIt = async (ms = 800) => { click(/DO IT/); await tick(ms); };
const toolbox = () => within(screen.getByRole("radiogroup", { name: "Toolbox" })).getAllByRole("radio").map((b) => b.getAttribute("aria-label"));

/** From the screws to the chip on a device without 3D: one tap per step. */
async function openUp(steps: RegExp[]) {
  for (const step of steps) { expect(title()).toMatch(step); await doIt(); }
}
/** From the fixed chip to the money. */
async function closeUp(screws = 4, next = () => doIt(10)) {
  expect(title()).toMatch(/Put the (panel|glass) back/);
  await next();
  expect(title()).toMatch(new RegExp(`Lock the screws · 0/${screws}`));
  await next();
  click(/POWER ON/);
  await tick(10);
  return within(screen.getByRole("region", { name: "Paid" }));
}

describe("Repair Shop: which classes get it", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("uses real 9A and 9B logins", () => {
    expect(findStudent(nineA)?.classCode).toBe("9A");
    expect(findStudent(nineB)?.classCode).toBe("9B");
    expect(findStudent(nineC)?.classCode).toBe("9C");
    expect(findStudent(nineD)?.classCode).toBe("9D");
  });

  it("a 9A student doesn't see the Repair Shop at all, and an old save inside it falls back to the stage list", () => {
    localStorage.setItem(storageKey(nineA), JSON.stringify({ version: 1, activity: "repair" }));
    mount(nineA);
    expect(document.querySelector(".fp-header-title b")).toHaveTextContent("FINAL PROJECT");
    expect(screen.queryByRole("button", { name: /Repair Shop/ })).toBeNull();
    expect(cards()).toEqual(["01 Backrooms Run", "02 Switchyard"]);
  });

  it("a 9B student sees stage 03 and opens it", () => {
    mount(nineB);
    expect(cards()).toEqual(["01 Backrooms Run", "02 Switchyard", "03 Repair Shop"]);
    click(/Repair Shop.*Open stage/);
    expect(document.querySelector(".fp-header-title b")).toHaveTextContent("REPAIR SHOP");
  });

  it("the teacher sees it, and so does the teacher preview", () => {
    mount("leleomaker", true);
    expect(cards()).toContain("03 Repair Shop");
    click("Teacher preview");
    expect(cards()).toContain("03 Repair Shop");
  });

  it("logins outside the roster don't see it", () => {
    mount("someone-new");
    expect(screen.queryByRole("button", { name: /Repair Shop/ })).toBeNull();
  });
});

describe("Repair Shop", () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); vi.spyOn(Math, "random").mockReturnValue(SEED / 1e9); });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

  it("the first visit starts with the tutorial: the shutter, a tour of the shop, then the practice box", async () => {
    mount(nineB);
    click(/Repair Shop.*Open stage/);
    expect(screen.getByRole("region", { name: "Welcome to the repair shop" })).toHaveTextContent("Your repair shop, Ada");
    // Nobody skips the very first warm-up.
    expect(screen.queryByRole("button", { name: /Skip the warm-up/ })).toBeNull();
    click(/OPEN UP/);
    const tour: string[] = [];
    for (let i = 0; i < 5; i++) {
      tour.push(document.querySelector(".rp-coach h2")?.textContent ?? "");
      if (i === 2) expect(screen.getByRole("button", { name: /coins\. Open the shop/ })).toHaveClass("is-spot");
      if (i === 3) expect(screen.getByRole("button", { name: "Your levels" })).toHaveClass("is-spot");
      click(i === 4 ? /LET'S DO IT/ : /NEXT/);
    }
    expect(tour).toEqual(["Machines stand here", "Your workbench", "Your coins", "Your levels", "Warm-up time!"]);
    // The practice box: the same moves as every machine, with only four tools.
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("Practice box");
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowCloseLock");
    expect(title()).toBe("Find the way in");
    click("Back panel");
    expect(toolbox()).toEqual(["Your hand", "Cross screwdriver", "Flat screwdriver", "Dust blower"]);
    await openUp([/Unscrew the panel · 0\/2/, /Pull the panel off/, /Blow the dust away/, /Put the panel back/, /Lock the screws · 0\/2/]);
    const ready = within(screen.getByRole("region", { name: "Ready" }));
    expect(ready.getByText(/Drag to look around/)).toBeInTheDocument();
    fireEvent.click(ready.getByRole("button", { name: /OPEN THE SHOP/ }));
    await tick(10);
    expect(saved(nineB)).toMatchObject({ tutorial: true, fixed: 0, coins: 0 });
    // Then level 1.
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("LEVEL 1 OF 7");
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ARCADE-3000");
    expect(screen.getByRole("button", { name: /SHOW ME/ })).toBeInTheDocument();
  });

  it("level 1: a student fixes the arcade, gets paid, opens level 2, and can replay or restart any open level", async () => {
    const job = makeJob(SEED, "arcade");
    const coinJoke = job.doors.find((d) => d.id === "coin")!.joke!;
    localStorage.setItem(shopKey(nineB), JSON.stringify({ tutorial: true }));
    mount(nineB);
    click(/Repair Shop.*Open stage/);
    expect(screen.queryByRole("group", { name: /Teacher/ })).toBeNull();
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ARCADE-3000");

    // The customer shows the problem and says the clue plainly.
    click(/SHOW ME/);
    expect(screen.getByText(/NOTHING happened! And smoke is coming out of the back!/)).toBeInTheDocument();
    click(/TAKE THE JOB/);

    // Every step says where to look, what to do and which tool to use.
    expect(title()).toBe("Find the right door");
    expect(document.querySelector(".rp-mission p")).toHaveTextContent(/Sparks and smoke come out of the back/);
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowWiresChipCloseLockPower");
    click("Coin door");
    expect(toast()).toBe(jokeText[coinJoke]);
    click("Back panel");
    expect(title()).toMatch(/Unscrew the panel · 0\/4/);
    expect(document.querySelector(".rp-mission p")).toHaveTextContent(/Use the (cross|flat) screwdriver/);
    expect(toolbox()).toEqual(["Your hand", "Cross screwdriver", "Flat screwdriver", "Star screwdriver", "Dust blower", "Pliers", "Hammer", "Electrical tape"]);

    await openUp([/Unscrew the panel/, /Pull the panel off/, /Blow the dust away/, /Plug in the cables · 2\/3/]);
    expect(title()).toMatch(/Reprogram the logic chip/);

    // Level 1's chip: predict, then pick the sign from two.
    click(/OPEN THE CHIP/);
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    fireEvent.click(chip.getByRole("button", { name: "B False" }));
    expect(chip.getByRole("status")).toHaveTextContent(/Not quite.*never prints the condition/);
    fireEvent.click(chip.getByRole("button", { name: /TRY AGAIN/ }));
    fireEvent.click(chip.getByRole("button", { name: "C Nothing at all" }));
    fireEvent.click(chip.getByRole("button", { name: /FIX THE CHIP/ }));
    expect(chip.getByLabelText(/Sticker on the machine/)).toHaveTextContent(`1 GAME${job.price} COINS`);
    expect(chip.getByText(new RegExp(`With ${job.price} or more, the game starts`))).toBeInTheDocument();
    expect(document.querySelector(".rp-chipbench .sy-editor .sy-row.is-now")).toHaveTextContent("if (coins ?");
    expect(chip.getAllByRole("button").filter((b) => b.closest(".sy-bank")).map((b) => b.textContent).sort()).toEqual(["<", ">="]);
    fireEvent.click(chip.getByRole("button", { name: ">=" }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getAllByRole("listitem").map((li) => li.textContent)).toContain(`coins = ${job.price}“GAME START!”`);
    await tick(2000);
    expect(screen.queryByRole("region", { name: "Logic chip" })).toBeNull();

    const paid = await closeUp();
    expect(paid.getByText("LEVEL 1 CLEARED!")).toBeInTheDocument();
    // A wrong door and a wrong prediction: no tip for either.
    expect(paid.queryByText(/Right door first/)).toBeNull();
    expect(paid.queryByText(/Chip right first time/)).toBeNull();
    expect(paid.getByText(/Clean wiring/)).toBeInTheDocument();
    expect(paid.getByText(/Level 2 unlocked/)).toHaveTextContent("Vending machine");
    const coins = 35 + (coinJoke === "coin" ? 1 : 0);
    expect(document.querySelector(".rp-sum")?.textContent).toBe("+35");
    expect(saved(nineB)).toMatchObject({ coins, fixed: 1, made: { arcade: 1 } });
    // The counter counts up to the new total.
    await tick(2500);
    expect(screen.getByRole("button", { name: /coins\. Open the shop/ })).toHaveTextContent(String(coins));
    fireEvent.click(paid.getByRole("button", { name: /NEXT CUSTOMER/ }));
    await tick(10);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("LEVEL 2 OF 7");
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("SNACK-O-MATIC");

    // Coins buy shop upgrades only: benches, floors, lights and decor.
    click(/Open the shop/);
    const shop = within(screen.getByRole("region", { name: "Shop" }));
    expect(shop.getAllByRole("tab").map((t) => t.textContent?.trim())).toEqual(["Benches", "Floors", "Lights", "Decor"]);
    fireEvent.click(shop.getByRole("tab", { name: /Floors/ }));
    fireEvent.click(shop.getByRole("button", { name: /Buy Wood planks for 25 coins/ }));
    expect(saved(nineB)).toMatchObject({ coins: coins - 25, equipped: { floor: "floor-wood" } });
    fireEvent.click(shop.getByRole("button", { name: "Close" }));

    // The menu: the warm-up first, then the seven levels and the certificate.
    click("Your levels");
    let menu = within(screen.getByRole("region", { name: "Your levels" }));
    const rows = menu.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toMatch(/Practice box.*Warm up any time/);
    expect(rows[1]).toMatch(/Replay the warm-up.*shop tour/);
    expect(rows[2]).toMatch(/Level 1 · Arcade.*Cleared · fixed 1 time/);
    expect(rows[3]).toMatch(/Level 2 · Vending machine.*On your bench now/);
    expect(rows[4]).toMatch(/Level 3 · Jukebox.*Clear level 2 to open it/);
    expect(rows[5]).toMatch(/Level 4 · Electric scooter/);
    expect(rows[8]).toMatch(/Level 7 · RobotBOSS/);
    expect(rows[9]).toMatch(/Maker Family certificate.*Beat the Robot/);
    // Locked levels have no button, and only the teacher can preview the certificate.
    expect(menu.queryByRole("button", { name: "Play level 3" })).toBeNull();
    expect(menu.queryByRole("button", { name: /Preview the certificate/ })).toBeNull();
    // Restart the level on the bench: the customer comes in again.
    fireEvent.click(menu.getByRole("button", { name: "Restart level 2" }));
    await tick(10);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("SNACK-O-MATIC");
    expect(screen.getByRole("button", { name: /SHOW ME/ })).toBeInTheDocument();
    // Play level 1 again.
    click("Your levels");
    menu = within(screen.getByRole("region", { name: "Your levels" }));
    fireEvent.click(menu.getByRole("button", { name: "Play level 1" }));
    await tick(10);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("LEVEL 1 OF 7");

    // Practice any time: straight to the practice box, no tour, no coins.
    click("Your levels");
    menu = within(screen.getByRole("region", { name: "Your levels" }));
    fireEvent.click(menu.getByRole("button", { name: /PRACTICE/ }));
    await tick(1000);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ANY TIMEWarm-up · Practice box");
    expect(document.querySelector(".rp-dots")).toBeNull();
    click(/LET'S DO IT/);
    click("Back panel");
    await openUp([/Unscrew the panel · 0\/2/, /Pull the panel off/, /Blow the dust away/, /Put the panel back/, /Lock the screws · 0\/2/]);
    fireEvent.click(within(screen.getByRole("region", { name: "Ready" })).getByRole("button", { name: /BACK TO WORK/ }));
    await tick(10);
    expect(saved(nineB)).toMatchObject({ fixed: 1, coins: coins - 25 });

    click("BACK");
    expect(screen.getByRole("button", { name: new RegExp(`Repair Shop\\. 1 of 7 levels cleared · ${coins - 25} coins`) })).toBeInTheDocument();
  });

  it("level 2: the vending machine, a stuck snack, and four signs to choose from", async () => {
    localStorage.setItem(shopKey(nineC), JSON.stringify({ tutorial: true, made: { arcade: 1 } }));
    localStorage.setItem(storageKey(nineC), JSON.stringify({ version: 1, activity: "repair" }));
    mount(nineC);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("SNACK-O-MATIC");
    click(/SHOW ME/);
    expect(screen.getByText(/is EMPTY! I paid 2 coins and it says “Enjoy!”.*stuck behind the glass/)).toBeInTheDocument();
    click(/TAKE THE JOB/);
    expect(within(document.querySelector(".rp-belt") as HTMLElement).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Front glass", "Side hatch", "Coin box"]);
    click("Front glass");
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowSnackChipCloseLockPower");
    await openUp([/Unscrew the glass · 0\/4/, /Lift the glass off/, /Blow the crumbs away/, /Free the stuck snack/]);
    click(/OPEN THE CHIP/);
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    fireEvent.click(chip.getByRole("button", { name: "A “Enjoy!”" }));
    expect(chip.getByRole("status")).toHaveTextContent(/0 >= 0 is true/);
    fireEvent.click(chip.getByRole("button", { name: /FIX THE CHIP/ }));
    expect(chip.getAllByRole("button").filter((b) => b.closest(".sy-bank")).map((b) => b.textContent).sort()).toEqual(["<", "<=", ">", ">="]);
    fireEvent.click(chip.getByRole("button", { name: "<=" }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getByRole("status")).toHaveTextContent("With stock = 0 it should show “Sold out”, but it shows “Enjoy!”.");
    fireEvent.click(chip.getByRole("button", { name: ">" }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    await tick(2000);
    const paid = await closeUp();
    expect(paid.queryByText(/Clean wiring/)).toBeNull();
    expect(paid.getByText(/Level 3 unlocked/)).toHaveTextContent("Jukebox");
    expect(document.querySelector(".rp-sum")?.textContent).toBe("+40");
  });

  it("the teacher has every level, a skip for each step, and levels 3 and 4 build the condition from pieces", async () => {
    localStorage.setItem(storageKey("leleomaker"), JSON.stringify({ version: 1, activity: "repair" }));
    mount("leleomaker", true);
    const bar = within(screen.getByRole("group", { name: "Teacher" }));
    expect(bar.getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["SKIP"]);
    const pickMachine = bar.getByRole("combobox", { name: "Teacher: machine" });
    expect([...pickMachine.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["Next level", "1. Arcade", "2. Vending machine", "3. Jukebox", "4. Electric scooter", "5. Claw machine", "6. Coffee machine", "7. Robot"]);
    const skip = () => fireEvent.click(bar.getByRole("button", { name: "Skip this step" }));

    fireEvent.change(pickMachine, { target: { value: "jukebox" } });
    await tick(10);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("LEVEL 3 OF 7");
    click(/SHOW ME/);
    expect(screen.getByText(/2 credits and it says “Insert coin”/)).toBeInTheDocument();
    click(/TAKE THE JOB/);
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowWiresFuseChipCloseLockPower");
    for (const step of [/Find the right door/, /Unscrew the panel · 0\/4/, /Pull the panel off/, /Blow the dust away/, /Plug in the cables · 1\/3/, /Swap the burnt fuse/, /Reprogram the logic chip/]) { expect(title()).toMatch(step); skip(); await tick(800); }
    let chip = within(screen.getByRole("region", { name: "Logic chip" }));
    expect(chip.getAllByRole("button").filter((b) => b.closest(".sy-bank")).map((b) => b.textContent).sort()).toEqual(["1", "==", ">", ">=", "credits"].sort());
    for (const piece of ["credits", ">=", "1"]) fireEvent.click(chip.getByRole("button", { name: piece }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    await tick(2000);
    expect(title()).toMatch(/Put the panel back/);

    // Level 4: the scooter's tape, and fewer pieces after two misses.
    fireEvent.change(pickMachine, { target: { value: "scooter" } });
    await tick(10);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ZOOM-E");
    click(/SHOW ME/);
    expect(screen.getByText(/30 km\/h and it says “Speed OK”/)).toBeInTheDocument();
    click(/TAKE THE JOB/);
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowTapeWiresChipCloseLockPower");
    for (const step of [/Find the right door/, /Unscrew/, /Pull the panel off/, /Blow the mud away/, /Tape the worn cable · 0\/3/, /Plug in the cables/, /Reprogram/]) { expect(title()).toMatch(step); skip(); await tick(800); }
    chip = within(screen.getByRole("region", { name: "Logic chip" }));
    for (let i = 0; i < 2; i++) {
      for (const piece of ["speed", "<", "25"]) fireEvent.click(chip.getByRole("button", { name: piece }));
      fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
      await tick(1200);
      for (const placed of chip.getAllByRole("button", { name: /\. Remove$/ })) fireEvent.click(placed);
    }
    expect(chip.getByRole("status")).toHaveTextContent(/Fewer pieces/);
    expect(chip.getAllByRole("button").filter((b) => b.closest(".sy-bank")).map((b) => b.textContent)).toEqual(["speed", ">", "25"]);
  });

  it("level 5: the claw machine opens at the back, and the condition is typed", async () => {
    localStorage.setItem(storageKey("leleomaker"), JSON.stringify({ version: 1, activity: "repair" }));
    mount("leleomaker", true);
    const bar = within(screen.getByRole("group", { name: "Teacher" }));
    fireEvent.change(bar.getByRole("combobox", { name: "Teacher: machine" }), { target: { value: "claw" } });
    await tick(10);
    click(/SHOW ME/);
    expect(screen.getByText(/The timer hit 0 and it says “Keep steering”\?! The claw never drops! And one claw finger looks bent!/)).toBeInTheDocument();
    click(/TAKE THE JOB/);
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowClawTapeChipCloseLockPower");
    expect(within(document.querySelector(".rp-belt") as HTMLElement).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Back panel", "Control panel", "Base hatch"]);
    click("Back panel");
    const skip = () => fireEvent.click(bar.getByRole("button", { name: "Skip this step" }));
    for (const step of [/Unscrew the panel · 0\/4/, /Pull the panel off/, /Blow the fluff away/, /Fix the bent claw finger/, /Tape the worn cable/, /Reprogram/]) { expect(title()).toMatch(step); skip(); await tick(800); }
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    expect(document.querySelector(".rp-chipbench .sy-editor .sy-row")).toHaveTextContent("int seconds = ?;");
    fireEvent.change(chip.getByRole("textbox", { name: "Condition" }), { target: { value: "seconds = 0" } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    expect(chip.getByRole("status")).toHaveTextContent(/One = stores a value/);
    fireEvent.change(chip.getByRole("textbox", { name: "Condition" }), { target: { value: "seconds < 0" } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getByRole("status")).toHaveTextContent("With seconds = 0 it should show “DROP!”, but it shows “Keep steering”.");
    // Two misses: the code pieces are there if needed.
    expect(chip.getByRole("button", { name: /Use code pieces/ })).toBeInTheDocument();
    fireEvent.change(chip.getByRole("textbox", { name: "Condition" }), { target: { value: "seconds <= 0" } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getAllByRole("listitem")[0]).toHaveTextContent("seconds = 0“DROP!”");
  });

  it("level 6: the coffee machine's else line is missing, and the student writes it", async () => {
    localStorage.setItem(storageKey("leleomaker"), JSON.stringify({ version: 1, activity: "repair" }));
    mount("leleomaker", true);
    const bar = within(screen.getByRole("group", { name: "Teacher" }));
    fireEvent.change(bar.getByRole("combobox", { name: "Teacher: machine" }), { target: { value: "coffee" } });
    await tick(10);
    click(/SHOW ME/);
    expect(screen.getByText(/The tank is EMPTY and it says “Brewing”/)).toBeInTheDocument();
    click(/TAKE THE JOB/);
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowWiresFuseTapeChipCloseLockPower");
    const skip = () => fireEvent.click(bar.getByRole("button", { name: "Skip this step" }));
    for (let i = 0; i < 12 && !/Reprogram/.test(title()); i++) { skip(); await tick(800); }
    expect(title()).toMatch(/Unscrew the panel · 0\/6|Reprogram/);
    skip();
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    fireEvent.change(chip.getByRole("textbox", { name: "Condition" }), { target: { value: "water >= 200" } });
    fireEvent.change(chip.getByRole("textbox", { name: "Else line" }), { target: { value: 'console.WriteLine("Refill water");' } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    expect(chip.getByRole("status")).toHaveTextContent(/The else line: C# cares about capitals: it's Console/);
    fireEvent.change(chip.getByRole("textbox", { name: "Else line" }), { target: { value: 'Console.WriteLine("Refill Water");' } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getByRole("status")).toHaveTextContent(/Almost! Check the text: it must say “Refill water” exactly/);
    fireEvent.change(chip.getByRole("textbox", { name: "Else line" }), { target: { value: 'Console.WriteLine("Refill water");' } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getByRole("status")).toHaveTextContent("All 5 tests pass!");
  });

  it("level 7, the final round: only line 1, the student writes the if / else, and beating the Robot opens the certificate", async () => {
    localStorage.setItem(storageKey("leleomaker"), JSON.stringify({ version: 1, activity: "repair" }));
    mount("leleomaker", true);
    const bar = within(screen.getByRole("group", { name: "Teacher" }));
    fireEvent.change(bar.getByRole("combobox", { name: "Teacher: machine" }), { target: { value: "robot" } });
    await tick(10);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("LEVEL 7 OF 7 · BOSS");
    // The Robot can't show anything: its program is gone.
    expect(screen.queryByRole("button", { name: /SHOW ME/ })).toBeNull();
    expect(screen.getByText(/program got wiped/)).toBeInTheDocument();
    click(/TAKE THE JOB/);
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowWiresFuseTapeGearChipCloseLockPower");
    const skip = () => fireEvent.click(bar.getByRole("button", { name: "Skip this step" }));
    for (let i = 0; i < 14 && !/Reprogram/.test(title()); i++) {
      if (/Free the stuck gear/.test(title())) expect(document.querySelector(".rp-mission p")).toHaveTextContent(/Use the hammer/);
      skip(); await tick(800);
    }
    skip();
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    expect(chip.getByText(/Only line 1 is left/)).toBeInTheDocument();
    expect([...document.querySelectorAll(".rp-chipbench .sy-row")].map((r) => r.textContent)).toEqual(["1int battery = ?;"]);
    const program = chip.getByRole("textbox", { name: "Your program" });
    // The symbol keys type into the program.
    fireEvent.click(chip.getByRole("button", { name: "Type {" }));
    expect(program).toHaveValue("{");
    fireEvent.change(program, { target: { value: 'If (battery >= 20) { Console.WriteLine("Ready to work!"); }' } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    expect(chip.getByRole("status")).toHaveTextContent(/it's if, all lower case/);
    fireEvent.change(program, { target: { value: 'if (battery >= 20) { Console.WriteLine("Ready to work!"); }' } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getByRole("status")).toHaveTextContent("With battery = 0 it should show “Low battery!”, but it shows nothing.");
    // Two misses: the shape of an if / else, if needed. It still has to be written by hand.
    fireEvent.click(chip.getByRole("button", { name: /Show me the shape/ }));
    expect(chip.getByLabelText("The shape of an if / else")).toHaveTextContent("else");
    fireEvent.change(program, { target: { value: answerCode(makeJob(SEED, "robot")).join("\n") } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getByRole("status")).toHaveTextContent("All 5 tests pass!");
    await tick(2000);
    const paid = await closeUp(6, async () => { skip(); await tick(10); });
    expect(paid.getByText("BOSS BEATEN!")).toBeInTheDocument();
    expect(paid.getByText(/Your Maker certificate is ready/)).toBeInTheDocument();
    fireEvent.click(paid.getByRole("button", { name: /OPEN YOUR CERTIFICATE/ }));
    expect(screen.getByRole("dialog", { name: "Your Maker certificate" })).toBeInTheDocument();
  });

  it("a student who beat the Robot opens the certificate from the menu", async () => {
    localStorage.setItem(shopKey(nineD), JSON.stringify({ tutorial: true, made: { arcade: 1, vending: 1, jukebox: 1, scooter: 1, claw: 1, coffee: 1, robot: 1 } }));
    localStorage.setItem(storageKey(nineD), JSON.stringify({ version: 1, activity: "repair" }));
    mount(nineD);
    click("Your levels");
    const menu = within(screen.getByRole("region", { name: "Your levels" }));
    expect(document.querySelector(".rp-machines-sum")).toHaveTextContent("7 of 7 levels cleared");
    expect(menu.getAllByRole("button", { name: /Play level/ })).toHaveLength(6);
    fireEvent.click(menu.getByRole("button", { name: /OPEN/ }));
    expect(screen.getByRole("dialog", { name: "Your Maker certificate" })).toBeInTheDocument();
  });

  it("the Maker Family certificate: the teacher previews it, unties the ribbon, and sees the student's Maker name", async () => {
    localStorage.setItem(storageKey("leleomaker"), JSON.stringify({ version: 1, activity: "repair" }));
    mount("leleomaker", true);
    click("Your levels");
    click(/Preview the certificate/);
    const cert = within(screen.getByRole("dialog", { name: "Your Maker certificate" }));
    expect(cert.getByText(/A golden delivery for Ada/)).toBeInTheDocument();
    fireEvent.click(cert.getByRole("button", { name: "Untie the ribbon" }));
    await tick(1600);
    const paper = cert.getByRole("article", { name: "Certificate: Welcome to the Family, Ada Maker!" });
    expect(paper).toHaveTextContent("Certificate of Maker Mastery");
    expect(paper).toHaveTextContent(/final level of Maker Mastery/);
    expect(within(paper).getByLabelText("Signature of Leo Maker")).toBeInTheDocument();
    expect(cert.getAllByRole("button", { name: /Add your photo/ })).toHaveLength(2);
    expect(cert.getByRole("button", { name: /Download/ })).toBeInTheDocument();
  });
});
