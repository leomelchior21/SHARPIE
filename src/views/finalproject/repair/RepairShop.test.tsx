import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FinalProject } from "../FinalProject";
import { storageKey } from "../progress";
import { findStudent } from "../../../data/roster";
import { jokeText, makeJob, shopKey } from "./logic";

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
async function closeUp() {
  expect(title()).toMatch(/Put the (panel|glass) back/);
  await doIt(10);
  expect(title()).toMatch(/Lock the screws · 0\/4/);
  await doIt(10);
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
      if (i === 3) expect(screen.getByRole("button", { name: "Your machines" })).toHaveClass("is-spot");
      click(i === 4 ? /LET'S DO IT/ : /NEXT/);
    }
    expect(tour).toEqual(["Machines stand here", "Your workbench", "Your coins", "Your machines", "Warm-up time!"]);
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
    // Then the first real customer.
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ARCADE-3000");
    expect(screen.getByRole("button", { name: /SHOW ME/ })).toBeInTheDocument();
  });

  it("a student fixes an arcade from start to finish: the wrong door, the toolbox, the chip, the money", async () => {
    const job = makeJob("guided", SEED, "arcade");
    const coinJoke = job.doors.find((d) => d.id === "coin")!.joke!;
    localStorage.setItem(shopKey(nineB), JSON.stringify({ tutorial: true }));
    mount(nineB);
    click(/Repair Shop.*Open stage/);
    expect(screen.queryByRole("group", { name: /Teacher/ })).toBeNull();
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ARCADE-3000");

    // No results yet: the student starts Guided, where the broken machine prints nothing at all.
    click(/SHOW ME/);
    expect(screen.getByText(/NOTHING happened/)).toBeInTheDocument();
    click(/TAKE THE JOB/);

    // Find the door: without 3D the clue is in words, and each door is a button.
    expect(title()).toBe("Find the right door");
    expect(document.querySelector(".rp-mission p")).toHaveTextContent(/Sparks and smoke come out of the back/);
    expect(document.querySelector(".rp-steps")?.textContent).toBe(`DoorScrewsOpenBlowWires${job.fuse ? "Fuse" : ""}ChipCloseLockPower`);
    click("Coin door");
    expect(toast()).toBe(jokeText[coinJoke]);
    expect(title()).toBe("Find the right door");
    click("Back panel");
    expect(title()).toMatch(/Unscrew the panel · 0\/4/);

    // Eight tools: no hex key, wrench, multimeter or soldering iron.
    expect(toolbox()).toEqual(["Your hand", "Cross screwdriver", "Flat screwdriver", "Star screwdriver", "Dust blower", "Pliers", "Hammer", "Electrical tape"]);
    expect(document.querySelector<HTMLElement>(".rp-toolbox")?.style.getPropertyValue("--half")).toBe("4");
    // No manual any more.
    expect(screen.queryByRole("button", { name: /Manual/ })).toBeNull();

    await openUp([/Unscrew the panel/, /Pull the panel off/, /Blow the dust away/, /Plug in the cables/, ...(job.fuse ? [/Swap the burnt fuse/] : [])]);
    expect(title()).toMatch(/Reprogram the logic chip/);

    // The prediction, in the quiz's window.
    click(/OPEN THE CHIP/);
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    fireEvent.click(chip.getByRole("button", { name: "B False" }));
    expect(chip.getByRole("status")).toHaveTextContent(/Not quite.*never prints the condition/);
    fireEvent.click(chip.getByRole("button", { name: /TRY AGAIN/ }));
    fireEvent.click(chip.getByRole("button", { name: "C Nothing at all" }));
    expect(chip.getByRole("status")).toHaveTextContent(/Correct/);
    fireEvent.click(chip.getByRole("button", { name: /FIX THE CHIP/ }));
    // Then the fix, in the Switchyard's code editor, with the sticker from the machine.
    expect(chip.getByLabelText(/Sticker on the machine/)).toHaveTextContent(`1 GAME${job.price} COINS`);
    expect(document.querySelector(".rp-chipbench .sy-editor .sy-row")).toHaveTextContent("int coins = ?;");
    expect(document.querySelector(".rp-chipbench .sy-editor .sy-row.is-now")).toHaveTextContent("if (coins ?");
    fireEvent.click(chip.getByRole("button", { name: ">=" }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getAllByRole("listitem").map((li) => li.textContent)).toContain(`coins = ${job.price}“GAME START!”`);
    await tick(2000);
    expect(screen.queryByRole("region", { name: "Logic chip" })).toBeNull();

    const paid = await closeUp();
    // A wrong door and a wrong prediction: no tip for either.
    expect(paid.queryByText(/Right door first/)).toBeNull();
    expect(paid.queryByText(/Chip right first time/)).toBeNull();
    expect(paid.getByText(/Right tool every time/)).toBeInTheDocument();
    expect(paid.getByText(/Clean wiring/)).toBeInTheDocument();
    // The lost coin behind the wrong door is the student's to keep.
    const coins = 35 + (coinJoke === "coin" ? 1 : 0);
    expect(document.querySelector(".rp-total")?.textContent).toMatch(/^\s*\+35 /);
    expect(saved(nineB)).toMatchObject({ coins, fixed: 1 });

    // Coins buy shop upgrades: benches, floors, lights and decor. No tools: everyone twists screws by hand.
    click(/Open the shop/);
    const shop = within(screen.getByRole("region", { name: "Shop" }));
    expect(shop.getAllByRole("tab").map((t) => t.textContent?.trim())).toEqual(["Benches", "Floors", "Lights", "Decor"]);
    fireEvent.click(shop.getByRole("tab", { name: /Floors/ }));
    expect(shop.getByRole("button", { name: /Buy Galaxy floor for 70 coins/ })).toBeDisabled();
    fireEvent.click(shop.getByRole("button", { name: /Buy Wood planks for 25 coins/ }));
    expect(saved(nineB)).toMatchObject({ coins: coins - 25, equipped: { floor: "floor-wood" } });
    fireEvent.click(shop.getByRole("button", { name: "Close" }));

    // The menu: what's fixed, what's next, what's coming.
    click("Your machines");
    const menu = within(screen.getByRole("region", { name: "Your machines" }));
    const rows = menu.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatch(/Practice box.*Warm up any time/);
    expect(rows[1]).toMatch(/1\. Arcade.*Fixed 1 time/);
    expect(rows[2]).toMatch(/2\. Vending machine.*Unlocks after 2 more repairs/);
    expect(rows[3]).toMatch(/3\. Jukebox.*Coming soon/);
    expect(rows[7]).toMatch(/7\. RobotBOSS.*Coming soon/);
    expect(rows[8]).toMatch(/Maker Family certificate.*After the Robot/);
    // Only the teacher can open the certificate before the end.
    expect(menu.queryByRole("button", { name: /Preview the certificate/ })).toBeNull();
    // Practice any time: straight to the practice box, no tour, no coins.
    fireEvent.click(menu.getByRole("button", { name: /PRACTICE/ }));
    await tick(1000);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ANY TIMEWarm-up · Practice box");
    expect(document.querySelector(".rp-coach h2")).toHaveTextContent("Warm-up time!");
    expect(document.querySelector(".rp-dots")).toBeNull();
    click(/LET'S DO IT/);
    click("Back panel");
    await openUp([/Unscrew the panel · 0\/2/, /Pull the panel off/, /Blow the dust away/, /Put the panel back/, /Lock the screws · 0\/2/]);
    const ready = within(screen.getByRole("region", { name: "Ready" }));
    fireEvent.click(ready.getByRole("button", { name: /BACK TO WORK/ }));
    await tick(10);
    expect(saved(nineB)).toMatchObject({ fixed: 1, coins: coins - 25 });
    expect(screen.getByRole("button", { name: /SHOW ME|TAKE THE JOB/ })).toBeInTheDocument();

    click("BACK");
    expect(screen.getByRole("button", { name: new RegExp(`Repair Shop\\. 1 machines fixed · ${coins - 25} coins`) })).toBeInTheDocument();
  });

  it("the third ticket unlocks the vending machine, and the next customer brings it", async () => {
    localStorage.setItem(shopKey(nineD), JSON.stringify({ fixed: 2, coins: 0, tutorial: true }));
    localStorage.setItem(storageKey(nineD), JSON.stringify({ version: 1, activity: "repair" }));
    const job = makeJob("guided", SEED, "arcade");
    mount(nineD);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("#3");
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ARCADE-3000");
    click(/SHOW ME/); click(/TAKE THE JOB/); click("Back panel");
    await openUp([/Unscrew/, /Pull the panel/, /dust/, /cables/, ...(job.fuse ? [/fuse/] : [])]);
    click(/OPEN THE CHIP/);
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    fireEvent.click(chip.getByRole("button", { name: "C Nothing at all" }));
    fireEvent.click(chip.getByRole("button", { name: /FIX THE CHIP/ }));
    fireEvent.click(chip.getByRole("button", { name: ">=" }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    // The bench, then the chip writing (its timer starts once the bench has passed).
    await tick(1200);
    await tick(2000);
    const paid = await closeUp();
    // A clean ticket: every tip.
    expect(paid.getByText(/Right door first/)).toBeInTheDocument();
    expect(paid.getByText(/New machine unlocked/)).toHaveTextContent("Vending machine");
    fireEvent.click(paid.getByRole("button", { name: /NEXT CUSTOMER/ }));
    await tick(10);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("SNACK-O-MATIC");
    expect(saved(nineD).fixed).toBe(3);
  });

  it("the vending machine: three doors, crumbs to blow, a stuck snack, and its own chip", async () => {
    localStorage.setItem(shopKey(nineC), JSON.stringify({ fixed: 3, coins: 0, tutorial: true }));
    localStorage.setItem(storageKey(nineC), JSON.stringify({ version: 1, activity: "repair" }));
    const job = makeJob("guided", SEED, "vending");
    mount(nineC);
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("SNACK-O-MATIC");
    click(/SHOW ME/);
    expect(screen.getByText(/is EMPTY! I paid 2 coins and it says “Enjoy!”/)).toBeInTheDocument();
    click(/TAKE THE JOB/);
    expect(document.querySelector(".rp-mission p")).toHaveTextContent(/A snack is stuck behind the front glass/);
    expect(within(document.querySelector(".rp-belt") as HTMLElement).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Front glass", "Side hatch", "Coin box"]);
    click("Front glass");
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowSnackChipCloseLockPower");
    await openUp([/Unscrew the glass · 0\/4/, /Lift the glass off/, /Blow the crumbs away/, new RegExp(`Free the stuck snack${job.snacks.length > 1 ? "s" : ""} · 0/${job.snacks.length}`)]);
    expect(title()).toMatch(/Reprogram the logic chip/);

    click(/OPEN THE CHIP/);
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    // Guided: what does an empty slot print? Then pick the sign.
    fireEvent.click(chip.getByRole("button", { name: "A “Enjoy!”" }));
    expect(chip.getByRole("status")).toHaveTextContent(/0 >= 0 is true/);
    fireEvent.click(chip.getByRole("button", { name: /FIX THE CHIP/ }));
    expect(document.querySelector(".rp-chipbench .sy-editor .sy-row")).toHaveTextContent("int stock = ?;");
    expect(chip.getByText(/stock more than 0/)).toBeInTheDocument();
    fireEvent.click(chip.getByRole("button", { name: "<=" }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getByRole("status")).toHaveTextContent("With stock = 0 it should show “Sold out”, but it shows “Enjoy!”.");
    fireEvent.click(chip.getByRole("button", { name: ">" }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getAllByRole("listitem")[0]).toHaveTextContent("stock = 0“Sold out”");
    await tick(2000);

    const paid = await closeUp();
    // No wiring on this machine, so no wiring tip; one wrong sign on the bench.
    expect(paid.queryByText(/Clean wiring/)).toBeNull();
    expect(paid.queryByText(/Chip right first time/)).toBeNull();
    expect(paid.getByText(/Right door first/)).toBeInTheDocument();
    expect(document.querySelector(".rp-total")?.textContent).toMatch(/^\s*\+40 /);
  });

  it("gives the teacher three levels, any machine, and a skip for each step", async () => {
    localStorage.setItem(storageKey("leleomaker"), JSON.stringify({ version: 1, activity: "repair" }));
    mount("leleomaker", true);
    const bar = within(screen.getByRole("group", { name: "Teacher: difficulty" }));
    expect(bar.getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Guided", "Supported", "Independent", "SKIP"]);
    const pickMachine = bar.getByRole("combobox", { name: "Teacher: machine" });
    expect([...pickMachine.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["Next machine", "Arcade", "Vending machine", "Claw machine"]);

    // Independent on the vending machine, though the teacher has fixed nothing yet.
    fireEvent.click(bar.getByRole("button", { name: "Independent" }));
    fireEvent.change(pickMachine, { target: { value: "vending" } });
    expect(bar.getByRole("button", { name: "Independent" })).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("SNACK-O-MATIC");
    const skip = () => fireEvent.click(bar.getByRole("button", { name: "Skip this step" }));
    skip(); skip();
    for (const step of [/Find the right door/, /Unscrew the glass · 0\/4/, /Lift the glass off/, /Blow the crumbs away/, /Free the stuck snack/, /Reprogram the logic chip/]) {
      expect(title()).toMatch(step);
      skip();
      await tick(800);
    }
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    // Independent: type the condition, with the friendly errors.
    expect(chip.queryByText(/stock more than 0/)).toBeNull();
    fireEvent.change(chip.getByRole("textbox"), { target: { value: "stock = 0" } });
    expect(document.querySelector(".rp-typed-hl .cs-var")).toHaveTextContent("stock");
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    expect(chip.getByRole("status")).toHaveTextContent(/One = stores a value/);
    fireEvent.change(chip.getByRole("textbox"), { target: { value: "stock >= 0" } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getByRole("status")).toHaveTextContent("With stock = 0 it should show “Sold out”, but it shows “Enjoy!”.");
    fireEvent.change(chip.getByRole("textbox"), { target: { value: "stock > 0" } });
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    await tick(2300);
    expect(title()).toMatch(/Put the glass back/);

    // Supported on the arcade: the code pieces, with two decoys.
    fireEvent.click(bar.getByRole("button", { name: "Supported" }));
    fireEvent.change(pickMachine, { target: { value: "arcade" } });
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("ARCADE-3000");
    skip(); skip();
    for (let i = 0; i < 8 && !/Reprogram/.test(title()); i++) { skip(); await tick(800); }
    skip();
    const pieces = within(screen.getByRole("region", { name: "Logic chip" }));
    const price = makeJob("supported", SEED, "arcade").price;
    expect(pieces.getAllByRole("button").filter((b) => b.closest(".sy-bank")).map((b) => b.textContent).sort()).toEqual([String(price), "=", ">", ">=", "coins"].sort());
  });

  it("the claw machine (teacher only for now): fluff, a bent claw finger and its timer chip", async () => {
    localStorage.setItem(storageKey("leleomaker"), JSON.stringify({ version: 1, activity: "repair" }));
    mount("leleomaker", true);
    const bar = within(screen.getByRole("group", { name: "Teacher: difficulty" }));
    fireEvent.change(bar.getByRole("combobox", { name: "Teacher: machine" }), { target: { value: "claw" } });
    expect(document.querySelector(".rp-ticket")).toHaveTextContent("EGG CLAW");
    click(/SHOW ME/);
    expect(screen.getByText(/The timer hit 0 and it says “Keep steering”\?! The claw never drops! And one claw finger looks bent!/)).toBeInTheDocument();
    click(/TAKE THE JOB/);
    expect(document.querySelector(".rp-steps")?.textContent).toBe("DoorScrewsOpenBlowClawChipCloseLockPower");
    expect(within(document.querySelector(".rp-belt") as HTMLElement).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Front glass", "Control panel", "Base hatch"]);
    click("Front glass");
    const skip = () => fireEvent.click(bar.getByRole("button", { name: "Skip this step" }));
    for (const step of [/Unscrew the glass · 0\/4/, /Lift the glass off/, /Blow the fluff away/, /Fix the bent claw finger/]) { expect(title()).toMatch(step); skip(); await tick(800); }
    expect(title()).toMatch(/Reprogram the logic chip/);
    skip();
    const chip = within(screen.getByRole("region", { name: "Logic chip" }));
    fireEvent.click(chip.getByRole("button", { name: "B “Keep steering”" }));
    expect(chip.getByRole("status")).toHaveTextContent(/never goes below it/);
    fireEvent.click(chip.getByRole("button", { name: /FIX THE CHIP/ }));
    expect(document.querySelector(".rp-chipbench .sy-editor .sy-row")).toHaveTextContent("int seconds = ?;");
    fireEvent.click(chip.getByRole("button", { name: "<=" }));
    fireEvent.click(chip.getByRole("button", { name: /TEST ON THE BENCH/ }));
    await tick(1200);
    expect(chip.getAllByRole("listitem")[0]).toHaveTextContent("seconds = 0“DROP!”");
  });

  it("the Maker Family certificate: untie the ribbon, then the certificate with the student's Maker name", async () => {
    localStorage.setItem(storageKey("leleomaker"), JSON.stringify({ version: 1, activity: "repair" }));
    mount("leleomaker", true);
    click("Your machines");
    click(/Preview the certificate/);
    const cert = within(screen.getByRole("dialog", { name: "Your Maker certificate" }));
    expect(cert.getByText(/A golden delivery for Ada/)).toBeInTheDocument();
    fireEvent.click(cert.getByRole("button", { name: "Untie the ribbon" }));
    await tick(1600);
    const paper = cert.getByRole("article", { name: "Certificate: Welcome to the Family, Ada Maker!" });
    expect(paper).toHaveTextContent("Certificate of Maker Mastery");
    expect(paper).toHaveTextContent("Ada Maker!");
    expect(paper).toHaveTextContent(/final level of Maker Mastery/);
    expect(within(paper).getByLabelText("Signature of Leo Maker")).toBeInTheDocument();
    // The photo frame itself and the button under the certificate both add a photo.
    expect(cert.getAllByRole("button", { name: /Add your photo/ })).toHaveLength(2);
    expect(cert.getByRole("button", { name: /Download/ })).toBeInTheDocument();
  });
});
