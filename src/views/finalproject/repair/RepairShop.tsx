import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Award, Bandage, Bike, Bot, Candy, Check, CircleDot, Coffee, Cog, Coins, Cpu, DoorOpen, Eye, FolderOpen, Gamepad, Hammer, Hand, Lamp, ListChecks, Lock, Music, PackageOpen, PartyPopper, Play, Pointer, Power, RotateCcw, Scissors, ShoppingCart, Sparkles, Store, Wind, Wrench, X, Zap, Grid3x3, Armchair, Cable } from "lucide-react";
import type { Progress } from "../progress";
import { LabCode } from "../LabParts";
import { Cs } from "../switchyard/Cs";
import {
  HAMMER, TAPE_WRAPS, afterTicket, allMachines, bench, brokenRun, buy, catalog, categories, chipCode, cleared, clueText, equip, freshShop, itemById, jokeText, levelOf, levelOpen, loadShop, lookOf,
  machineInfo, makeJob, nextMachine, owns, parseCondition, parseProgram, parseWriteLine, payout, tidyTyped, practiceJob, repairSummary, rightRun, roadmap, runWith, saveShop, slotName, toolFor, toolInfo, unlockedBy,
  type BenchRow, type Category, type Job, type MachineId, type Run, type ScrewHead, type Shop, type Slips, type ToolKind,
} from "./logic";
import { Workshop, headColors, webglAvailable, type Points, type TourSpot, type View, type Work } from "./workshop";
import { sfx } from "./sound";
import { Certificate } from "./Certificate";
import { mergeRepair, restoreRepair } from "./remote";
import "./repair.css";

/** tour and ready: the tutorial before the first customer (the tour of the shop, and the end of the practice box). */
type Phase = "tour" | "arrive" | "find" | "screws" | "panel" | "dust" | "wires" | "fuse" | "snack" | "jam" | "claw" | "tape" | "chip" | "close" | "lock" | "power" | "paid" | "ready";
type Ticket = { seed: number; machine: MachineId };
const customers = ["Nina", "Theo", "Kai", "Lia", "Sam", "Bia", "Joe", "Ravi", "Duda", "Gabi"];
const noSlips = (): Slips => ({ door: 0, tools: 0, wires: 0, chip: 0, help: 0 });
const handsOn: Phase[] = ["find", "screws", "panel", "dust", "wires", "fuse", "snack", "jam", "claw", "tape", "chip", "close", "lock"];
const drivers: ToolKind[] = ["cross", "flat", "star"];
const views: Record<Phase, View> = { tour: "tour", ready: "front", arrive: "front", find: "orbit", screws: "door", panel: "door", dust: "inside", wires: "inside", fuse: "inside", snack: "inside", jam: "inside", claw: "inside", tape: "inside", chip: "inside", close: "door", lock: "door", power: "front", paid: "front" };
const seedNow = () => Math.floor(Math.random() * 1e9);
/** The tour of the shop, before the practice box. highlight: a button on screen to point at. */
type TourStep = { spot: TourSpot; title: string; text: string; tag?: string; highlight?: "coins" | "menu" };
const tourSteps: TourStep[] = [
  { spot: "machine", title: "Machines stand here", text: "Customers bring their broken machines to this spot. You fix them right here.", tag: "MACHINE SPOT" },
  { spot: "bench", title: "Your workbench", text: "Customers come in, show you what's wrong and pay you when it works again. This bench is a bit old. Coins buy a better bench, a new floor, lights and decorations.", tag: "WORKBENCH" },
  { spot: "wide", title: "Your coins", text: "Every repair pays. Tap your coins any time to open the shop.", highlight: "coins" },
  { spot: "wide", title: "Your levels", text: "Seven machines, a little harder each time. Tap the list to see them, play one again or restart it.", highlight: "menu" },
  { spot: "box", title: "Warm-up time!", text: "A practice box! Open it, clean it and close it again: every repair starts like this." },
];

/** What each customer says: hello, what they see when they try it, the clue, and thanks at the end. */
const talk: Record<MachineId, { hello: string; seen: (out: string, job: Job) => string; clue: string; thanks: (job: Job) => string }> = {
  arcade: { hello: "My arcade is broken! Watch this…", seen: (out, j) => out ? `${j.price} coins! A game costs ${j.price}! And it says “${out}”?!` : `I put in ${j.price} coins… and NOTHING happened!`, clue: " And smoke is coming out of the back!", thanks: (j) => `IT WORKS!! ${j.price} coins and the game starts!` },
  vending: { hello: "This vending machine stole my money! Watch…", seen: (out, j) => `Slot ${slotName(j.empty)} is EMPTY! I paid ${j.price} coins and it says “${out}”?! Enjoy WHAT?`, clue: " And my other snack is stuck behind the glass!", thanks: (j) => `“${j.chip.no}” for the empty slot, and the full one works! Thank you!` },
  jukebox: { hello: "My jukebox won't play my song! Listen…", seen: (out) => `I put in 2 credits and it says “${out}”?! I paid for TWO songs!`, clue: " And sparks are coming out of the back!", thanks: () => "2 credits and the song plays! ♪ Thank you!" },
  scooter: { hello: "My scooter never warns me when I'm too fast! Watch…", seen: (out) => `I'm doing 30 km/h and it says “${out}”?! That's WAY too fast!`, clue: " And it sparks under the deck, at the back!", thanks: () => "At 30 it says “Too fast!” now, and at 20 “Speed OK”. Safe riding! Thank you!" },
  claw: { hello: "My claw machine never grabs anything! Watch…", seen: (out) => `The timer hit 0 and it says “${out}”?! The claw never drops!`, clue: " And one claw finger looks bent! Sparks come out of the back, too.", thanks: (j) => `${j.chip.yes} The claw grabbed an egg! Thank you!` },
  coffee: { hello: "My coffee machine has gone crazy! Watch…", seen: (out) => `The tank is EMPTY and it says “${out}”?! And it never tells me to refill!`, clue: " And smoke is coming out of the back!", thanks: () => "Empty tank: “Refill water”. Full tank: “Brewing”! Thank you!" },
  robot: { hello: "My robot's program got wiped! It just stands there. Can you write it again, from scratch?", seen: () => "", clue: " Sparks come out of its back, too.", thanks: (j) => `Battery 20: “${j.chip.yes}” Battery 5: “${j.chip.no}” It's ALIVE! Thank you!` },
};
/** What the screen says under a value: the variable and its value. */
const noteFor = (job: Job, value: number) => job.machine === "vending" ? `${slotName(job.empty)} · stock = ${value}` : job.machine === "arcade" ? "" : `${job.chip.variable} = ${value}${job.machine === "coffee" ? " ml" : job.machine === "scooter" ? " km/h" : ""}`;
/** Power on: what the fixed machine shows, step by step. The last step is the party. */
function powerSteps(job: Job): { value: number; note: string }[] {
  const right = (v: number) => ({ value: v, note: noteFor(job, v) });
  if (job.machine === "vending") return [right(0), { value: 3, note: "A1 · stock = 3" }];
  if (job.machine === "scooter") return [right(20), right(30)];
  if (job.machine === "coffee") return [right(0), right(300)];
  if (job.machine === "robot") return [right(5), right(20)];
  return [right(job.chip.demo)];
}

/** headerSlot: the middle of the Final Project header, where the ticket goes so the screen keeps its room. */
/** onShopChange: the save changed (a level paid, a coin spent), so the teacher dashboard summary can go again. */
export function RepairShop({ name, studentKey, progress: _progress, teacher, preview, headerSlot = null, onShopChange }: { name: string; studentKey: string; progress: Progress; teacher: boolean; preview: boolean; headerSlot?: HTMLElement | null; onShopChange?: () => void }) {
  const [shop, setShopState] = useState<Shop>(() => preview ? freshShop() : loadShop(studentKey));
  const setShop = useCallback((next: Shop) => { setShopState(next); if (!preview) { saveShop(studentKey, next); onShopChange?.(); } }, [preview, studentKey, onShopChange]);
  // Levels cleared on another tablet (from the dashboard copy) join this one's.
  useEffect(() => {
    if (teacher || preview) return;
    let live = true;
    void restoreRepair(studentKey).then((back) => { if (live && back) setShopState((now) => mergeRepair(now, repairSummary(back).repairLevels, back.fixed, back.finalCode)); });
    return () => { live = false; };
  }, [teacher, preview, studentKey]);
  const ticketFor = (machine?: MachineId, from = shop): Ticket => {
    const seed = seedNow();
    return { seed, machine: machine ?? nextMachine(from, seed) };
  };
  // The start screen, like a game's: the logo and a START button, every time the shop opens.
  const [started, setStarted] = useState(false);
  const [ticket, setTicket] = useState<Ticket>(() => ticketFor());
  const { seed, machine } = ticket;
  // The first visit starts with the tutorial: a tour of the shop and a practice box. The menu replays it.
  const [tutorial, setTutorial] = useState(() => !shop.tutorial && !teacher);
  // Practice from the menu: straight to the practice box, no shutter and no tour.
  const [practiceOnly, setPracticeOnly] = useState(false);
  // Bumped on every replay or restart, so a new job starts even from the middle of one.
  const [run, setRun] = useState(0);
  const [tourAt, setTourAt] = useState(-1);
  const [landed, setLanded] = useState(false);
  const [looked, setLooked] = useState(false);
  const job = useMemo(() => tutorial ? practiceJob() : makeJob(seed, machine), [tutorial, run, seed, machine]);
  const practice = !!job.practice;
  const who = customers[seed % customers.length];
  const [unlockNote, setUnlockNote] = useState<MachineId | null>(null);
  const [bossDone, setBossDone] = useState(false);

  const [phase, setPhase] = useState<Phase>("arrive");
  const [demoState, setDemoState] = useState<"ready" | "running" | "seen">("ready");
  const [slips, setSlips] = useState<Slips>(noSlips);
  const [screwsOut, setScrewsOut] = useState(0);
  const [screwsLocked, setScrewsLocked] = useState(0);
  const [dust, setDust] = useState(0);
  const [plugged, setPlugged] = useState<Record<string, string | null>>({});
  const [fuseState, setFuseState] = useState<"blown" | "out" | "in">("blown");
  const [snacksLeft, setSnacksLeft] = useState(0);
  const [gearFree, setGearFree] = useState(false);
  const [wraps, setWraps] = useState(0);
  const [tool, setTool] = useState<ToolKind>("hand");
  const [toolHelp, setToolHelp] = useState(false);
  const [say, setSay] = useState("");
  const [toast, setToast] = useState<{ text: string; tone: "good" | "bad" } | null>(null);
  const [open, setOpen] = useState<"chip" | "shop" | "menu" | "cert" | null>(null);
  const [paid, setPaid] = useState<ReturnType<typeof payout> | null>(null);
  // No WebGL2, or the 3D scene fails to start: the shop runs with big buttons instead.
  const [gl, setGl] = useState(webglAvailable);
  const [pts, setPts] = useState<Points | null>(null);
  // The coins on the counter: they count up while the pay flies in.
  const [shownCoins, setShownCoins] = useState(shop.coins);
  const [rain, setRain] = useState<{ key: number; x: number; y: number; dx: number; dy: number } | null>(null);
  const counting = useRef(false);
  const coinsBefore = useRef(shop.coins);

  const root = useRef<HTMLDivElement>(null);
  const coinBtn = useRef<HTMLButtonElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const scene = useRef<Workshop | null>(null);
  const live = useRef({ phase, job, slips, tool });
  live.current = { phase, job, slips, tool };
  const toolMisses = useRef({ count: 0, at: 0 });
  const doorsTried = useRef(new Set<string>());

  const flash = (text: string, tone: "good" | "bad" = "good", ms = 2000) => { setToast({ text, tone }); window.setTimeout(() => setToast((t) => t?.text === text ? null : t), ms); };
  const slip = (kind: keyof Slips) => setSlips((s) => ({ ...s, [kind]: s[kind] + 1 }));
  const order = stepsFor(job);
  /** The step after this one on this machine. */
  const advance = (from: Phase) => setPhase(order[order.indexOf(from) + 1] as Phase);

  // A door: the right one starts the job; a wrong one shows its joke and only costs the "Right door first" tip.
  const tryDoor = (id: string, right: boolean) => {
    const { job: j, phase: now } = live.current;
    if (now !== "find") return;
    if (right) { sfx.good(); flash("That's the one!"); setPhase("screws"); return; }
    const joke = j.doors.find((d) => d.id === id)?.joke;
    sfx.creak();
    if (doorsTried.current.has(id)) { flash("Still nothing useful in there.", "bad"); return; }
    doorsTried.current.add(id);
    slip("door");
    if (joke) flash(jokeText[joke], joke === "coin" ? "good" : "bad", 2800);
    if (joke === "coin") { sfx.coin(); setShop({ ...shop, coins: shop.coins + 1 }); }
  };

  // The 3D bay.
  useEffect(() => {
    if (!gl || !host.current) return;
    let w: Workshop;
    try { w = new Workshop(host.current); } catch { setGl(false); return; }
    scene.current = w;
    w.bubble = bubble.current;
    w.tag = tag.current;
    if (import.meta.env.DEV) (window as unknown as { __workshop?: Workshop }).__workshop = w;
    return () => { w.dispose(); scene.current = null; };
  }, [gl]);

  // The certificate covers the bay: stop drawing it. On an iPad a running 3D scene can make Safari reload the page
  // when the camera opens, and the student's photo is lost.
  useEffect(() => {
    const w = scene.current;
    if (!w) return;
    w.paused = open === "cert";
  }, [open]);

  // Events from the bay.
  useEffect(() => {
    const w = scene.current;
    if (!w) return;
    w.events = {
      screwTurn: () => sfx.tick(),
      screwOut: () => { sfx.pop(); setScrewsOut((n) => n + 1); },
      screwLocked: () => { sfx.snap(); setScrewsLocked((n) => n + 1); },
      slip: () => { sfx.slip(); slip("tools"); flash(live.current.phase === "lock" ? "That loosens it! Twist ↻ clockwise." : "That tightens it! Twist ↺ the other way.", "bad"); },
      wrongTool: (need, used) => {
        sfx.slip();
        const now = performance.now();
        // Tapping again straight away does not count twice.
        if (now - toolMisses.current.at > 1200) { slip("tools"); toolMisses.current.count++; }
        toolMisses.current.at = now;
        const text = drivers.includes(need) && drivers.includes(used) ? `Doesn't fit! This screw has a ${toolInfo[need].short.toLowerCase()} head.`
          : drivers.includes(used) ? `Put the screwdriver down. This needs: ${toolInfo[need].short}.`
          : `${toolInfo[used].joke} Try: ${toolInfo[need].short}.`;
        flash(text, "bad");
        if (toolMisses.current.count >= 3 && !toolHelp) { setToolHelp(true); setSlips((s) => ({ ...s, help: s.help + 1 })); }
      },
      door: tryDoor,
      panelOff: () => { sfx.whoosh(); window.setTimeout(() => setPhase("dust"), 650); },
      panelOn: () => { sfx.whoosh(); setPhase("lock"); },
      dust: (cleaned) => setDust(cleaned),
      blow: () => { if (Math.random() < 0.35) sfx.wipe(); },
      plug: (cable, socket, ok) => {
        setPlugged(w.plugged());
        if (ok) { sfx.snap(); return; }
        if (socket) {
          sfx.zap(); slip("wires");
          flash("ZAP! Wrong socket. Match the colour rings.", "bad");
          if (live.current.slips.wires + 1 >= 2) { w.showHint(cable); if (live.current.slips.wires + 1 === 2) setSlips((s) => ({ ...s, help: s.help + 1 })); }
        }
      },
      fuseOut: () => { sfx.pop(); setFuseState("out"); },
      fuseIn: () => { sfx.snap(); setFuseState("in"); },
      hammer: (result, freed, left) => {
        const gear = live.current.phase === "jam";
        if (result === "soft") { sfx.tick(); flash("Too soft! A little harder.", "bad"); }
        if (result === "good") { sfx.thud(); if (freed) sfx.pop(); flash(freed ? (gear ? "It turns!" : "It dropped!") : "Good tap! Again…"); }
        if (result === "hard") { sfx.crack(); slip("tools"); flash(gear ? "CRACK! Too hard: a tooth chipped. Gentle taps!" : "CRACK! Too hard: the spiral bent. Gentle taps!", "bad", 2600); }
        if (gear) setGearFree(left === 0); else setSnacksLeft(left);
      },
      tape: (n) => { sfx.snap(); setWraps(n); },
      chip: () => { sfx.good(); setOpen("chip"); },
      coin: () => sfx.coin(),
      look: () => setLooked(true),
      landed: () => { sfx.thud(); sfx.good(); setLanded(true); },
      clawFixed: () => { sfx.snap(); flash("Claw finger straight!"); window.setTimeout(() => advance("claw"), 700); },
    };
  });

  // A new ticket: a new machine on the bench and a customer at the door.
  useEffect(() => {
    const w = scene.current;
    setPhase("arrive"); setDemoState("ready"); setSlips(noSlips()); setScrewsOut(0); setScrewsLocked(0); setDust(0); setFuseState("blown"); setSnacksLeft(job.snacks.length); setGearFree(false); setWraps(0);
    setPaid(null); setOpen(null); setTool("hand"); setToolHelp(false); setUnlockNote(null); setBossDone(false);
    toolMisses.current = { count: 0, at: 0 };
    doorsTried.current = new Set();
    setLooked(false);
    setPlugged(Object.fromEntries(job.cables.map((c) => [c.id, c.at])));
    if (job.practice) {
      // The tutorial: the shop is still shut. The tour starts when the shutter goes up.
      setPhase("tour"); setTourAt(practiceOnly ? tourSteps.length - 1 : -1); setLanded(!w); setSay("");
      // A replay from the menu (the shop is already started): the shutter rolls up by itself.
      if (started && !practiceOnly) window.setTimeout(() => { sfx.whoosh(); setTourAt(0); }, 700);
      if (!w) return;
      w.setJob(job);
      w.setWork(null);
      w.setScreen("attract");
      w.tour("wide");
      return;
    }
    setSay(talk[job.machine].hello);
    if (!w) return;
    w.setJob(job);
    w.setView("front");
    w.setWork(null);
    w.setScreen("attract");
    w.setMarquee(true);
    w.walkIn();
  }, [job]);

  useEffect(() => { scene.current?.setLook(lookOf(shop)); }, [shop.owned, shop.equipped]);
  useEffect(() => { scene.current?.setTool(tool); }, [tool]);
  useEffect(() => { toolMisses.current = { count: 0, at: 0 }; }, [phase]);
  useEffect(() => { if (!counting.current) setShownCoins(shop.coins); }, [shop.coins]);

  // Each phase: where the camera looks and what the hands can do. The clue shows until the door is found.
  useEffect(() => {
    const w = scene.current;
    if (phase !== "tour") w?.setView(views[phase]);
    w?.setWork(handsOn.includes(phase) ? phase as Work : null);
    w?.setClue(phase === "arrive" || phase === "find");
  }, [phase]);
  // The tour: the camera visits each spot; the last one drops the practice box in.
  useEffect(() => { if (phase === "tour" && tourAt >= 0) scene.current?.tour(tourSteps[tourAt].spot); }, [phase, tourAt]);

  // Moving on when the hands-on part is done.
  useEffect(() => { if (phase === "screws" && screwsOut >= job.screws.length) { flash("All screws out!"); setPhase("panel"); } }, [phase, screwsOut, job]);
  useEffect(() => { if (phase === "dust" && dust >= 0.95) { flash({ crumbs: "No more crumbs!", fluff: "Fluff-free!", mud: "Mud gone!", grounds: "No more coffee grounds!", dust: "Squeaky clean!" }[job.mess]); window.setTimeout(() => advance("dust"), 500); } }, [phase, dust]);
  const wired = job.cables.filter((c) => plugged[c.id] === c.socket).length;
  useEffect(() => { if (phase === "wires" && wired === job.cables.length) { scene.current?.showHint(null); flash("Wiring OK!"); window.setTimeout(() => advance("wires"), 600); } }, [phase, wired, job]);
  useEffect(() => { if (phase === "fuse" && fuseState === "in") { flash("New fuse in!"); window.setTimeout(() => advance("fuse"), 500); } }, [phase, fuseState]);
  useEffect(() => { if (phase === "snack" && snacksLeft === 0) { flash("Snack freed!"); window.setTimeout(() => advance("snack"), 700); } }, [phase, snacksLeft]);
  useEffect(() => { if (phase === "jam" && gearFree) { flash("The gear turns again!"); window.setTimeout(() => advance("jam"), 700); } }, [phase, gearFree]);
  useEffect(() => { if (phase === "tape" && wraps >= TAPE_WRAPS) { flash("Cable taped up!"); window.setTimeout(() => advance("tape"), 600); } }, [phase, wraps]);
  useEffect(() => {
    if (phase !== "lock" || screwsLocked < job.screws.length) return;
    flash("Locked tight!");
    if (!job.practice) { setPhase("power"); return; }
    // The practice box is done: a little party, then the first customer.
    setPhase("ready");
    sfx.power();
    window.setTimeout(() => { sfx.cash(); scene.current?.setScreen("game"); scene.current?.celebrate(); }, 700);
  }, [phase, screwsLocked, job]);

  // Gesture hints on every machine: a finger shows each move.
  const hints = gl;
  useEffect(() => {
    if (!hints || !handsOn.includes(phase)) { setPts(null); return; }
    const id = window.setInterval(() => setPts(scene.current?.points() ?? null), 200);
    return () => window.clearInterval(id);
  }, [hints, phase]);

  const watch = () => {
    if (job.demo === null) return;
    const value = job.demo;
    setDemoState("running");
    setSay("");
    const finish = () => {
      const out = brokenRun(job)(value);
      scene.current?.setScreen(out ? "message" : "blank", out, job.machine === "arcade" ? value : 0, noteFor(job, value));
      scene.current?.setMood("angry");
      sfx.angry();
      setSay(talk[job.machine].seen(out, job) + talk[job.machine].clue);
      setDemoState("seen");
    };
    const w = scene.current;
    if (w) w.insertCoins(w.token() === "tap" ? 1 : job.machine === "arcade" ? value : job.price, finish); else finish();
  };
  const takeJob = () => { setSay(""); scene.current?.setMood("idle"); setPhase("find"); };
  // The final round's program, kept once its tests pass; it is saved with the paid ticket.
  const writtenCode = useRef("");
  const chipFixed = (code?: string) => { writtenCode.current = code ?? ""; setOpen(null); sfx.flash(); flash("Chip reprogrammed!"); setPhase("close"); };

  /** The pay flies from the card to the coin counter, and the counter counts up. */
  const payAnimation = (from: number, to: number) => {
    counting.current = true;
    const box = root.current?.getBoundingClientRect(), btn = coinBtn.current?.getBoundingClientRect();
    const total = root.current?.querySelector(".rp-paid .rp-total")?.getBoundingClientRect();
    if (box && btn && btn.width) {
      const x = (total && total.width ? total.left + total.width / 2 : box.left + box.width / 2) - box.left;
      const y = (total && total.width ? total.top + total.height / 2 : box.top + box.height / 2) - box.top;
      setRain({ key: Date.now(), x, y, dx: btn.left + btn.width / 2 - box.left - x, dy: btn.top + btn.height / 2 - box.top - y });
      for (let i = 0; i < 6; i++) window.setTimeout(() => sfx.coin(), 650 + i * 120);
    }
    const start = Date.now(), delay = 600, dur = 1300;
    const id = window.setInterval(() => {
      const k = Math.min(1, Math.max(0, (Date.now() - start - delay) / dur));
      setShownCoins(Math.round(from + (to - from) * k));
      if (k >= 1) { window.clearInterval(id); counting.current = false; window.setTimeout(() => setRain(null), 400); }
    }, 40);
  };
  useEffect(() => { if (phase === "paid" && paid) payAnimation(coinsBefore.current, shop.coins); }, [phase, paid]);

  const powerOn = () => {
    const w = scene.current;
    sfx.power();
    const pay = () => {
      const money = payout(slips, job);
      window.setTimeout(() => {
        sfx.cash();
        coinsBefore.current = shop.coins;
        const next = afterTicket(shop, money.total, job.machine, job.chip.mode === "write" ? writtenCode.current : undefined);
        setUnlockNote(unlockedBy(shop, job.machine));
        setBossDone(job.machine === "robot" && !cleared(shop, "robot"));
        setShop(next);
        setPaid(money);
        setPhase("paid");
      }, w ? 1600 : 0);
    };
    const happy = (line: string) => { w?.setMood("happy"); w?.celebrate(); setSay(line); pay(); };
    if (!w) { happy(""); return; }
    w.setMarquee(false);
    w.setScreen("off");
    window.setTimeout(() => { w.setMarquee(true); w.setScreen("attract"); }, 900);
    const steps = powerSteps(job);
    const right = rightRun(job);
    const show = (i: number) => {
      const s = steps[i], last = i === steps.length - 1;
      const text = right(s.value) || job.chip.yes;
      w.setScreen(last ? "game" : "message", text, job.machine === "arcade" ? s.value : 0, s.note);
      if (!last) { window.setTimeout(() => show(i + 1), 1400); return; }
      if (job.machine === "claw") w.clawDrop();
      happy(talk[job.machine].thanks(job));
    };
    window.setTimeout(() => w.insertCoins(w.token() === "tap" ? 1 : job.machine === "arcade" ? job.chip.demo : job.price, () => show(0)), 1700);
  };
  /** The tutorial is over (or skipped): the shop opens and the first customer comes in. */
  const finishTutorial = () => {
    setShop({ ...shop, tutorial: true });
    setTutorial(false);
    setPracticeOnly(false);
    setOpen(null);
    setTicket(ticketFor());
  };
  /** Back to the practice box any time (only: no tour), or the whole warm-up from the shutter. */
  const replayTutorial = (only: boolean) => { setOpen(null); scene.current?.leave(); setSay(""); setPracticeOnly(only); setRun((n) => n + 1); setTutorial(true); };
  /** A level from the menu: that machine comes in now, from the start. */
  const playLevel = (m: MachineId) => { setOpen(null); scene.current?.leave(); setSay(""); setTutorial(false); setPracticeOnly(false); setRun((n) => n + 1); setTicket(ticketFor(m)); };
  const nextTour = () => {
    sfx.tick();
    if (tourAt < tourSteps.length - 1) { setTourAt(tourAt + 1); return; }
    setPhase("find");
  };
  const openShutter = () => { sfx.whoosh(); setTourAt(0); };
  /** START: the first visit rolls the shutter up; after that the customer walks in. */
  const start = () => {
    sfx.good();
    setStarted(true);
    if (phase === "tour" && tourAt < 0) { openShutter(); return; }
    setRun((n) => n + 1);
  };
  const nextCustomer = () => { scene.current?.leave(); setSay(""); window.setTimeout(() => setTicket(ticketFor()), scene.current ? 900 : 0); };

  // The teacher (and a device without 3D) can finish any step with one tap.
  const skip = () => {
    const w = scene.current;
    if (phase === "tour") { if (tourAt < 0) openShutter(); else if (tourAt < tourSteps.length - 1 || landed || !w) nextTour(); return; }
    if (phase === "ready") { finishTutorial(); return; }
    if (phase === "arrive") { if (demoState === "ready" && job.demo !== null) watch(); else takeJob(); return; }
    if (phase === "chip") { setOpen("chip"); return; }
    if (phase === "power") { powerOn(); return; }
    if (w) { w.complete(phase as Work); return; }
    if (phase === "find") setPhase("screws");
    if (phase === "screws") setScrewsOut(job.screws.length);
    if (phase === "panel") setPhase("dust");
    if (phase === "dust") setDust(1);
    if (phase === "wires") setPlugged(Object.fromEntries(job.cables.map((c) => [c.id, c.socket])));
    if (phase === "fuse") setFuseState("in");
    if (phase === "snack") setSnacksLeft(0);
    if (phase === "jam") setGearFree(true);
    if (phase === "tape") setWraps(TAPE_WRAPS);
    if (phase === "claw") advance("claw");
    if (phase === "close") setPhase("lock");
    if (phase === "lock") setScrewsLocked(job.screws.length);
  };

  const shopAction = (id: string) => {
    const item = itemById(id)!;
    if (owns(shop, id)) { setShop(equip(shop, id)); sfx.good(); return; }
    const next = buy(shop, id);
    if (next === shop) return;
    sfx.cash();
    setShop(next);
    flash(`${item.name} installed!`);
  };

  // The tool this step needs: for screws, the head of the next one still to turn.
  const nextScrew = pts?.screws.findIndex((s) => phase === "lock" ? !s.locked : !s.out) ?? (phase === "lock" ? screwsLocked : screwsOut);
  const needTool: ToolKind | null = phase === "screws" || phase === "lock" ? job.screws[Math.max(0, nextScrew)] ?? null
    : phase in toolFor ? toolFor[phase as keyof typeof toolFor] : null;
  const glowTool = (hints || toolHelp) ? needTool : null;
  const freed = job.snacks.length - snacksLeft;
  const mission = missionFor(phase, job, { screwsOut, screwsLocked, dust, wired, fuseState, demoState, who, need: needTool, gl, freed, tool, wraps });
  const step = phase === "tour" && tourAt >= 0 ? tourSteps[tourAt] : null;
  const showSteps = phase !== "paid" && phase !== "tour" && phase !== "ready";
  const level = levelOf(job.machine);
  const ticketTag = <div className="rp-ticket" aria-live="polite"><Wrench size={16} /><span>{practice ? <><small>{practiceOnly ? "ANY TIME" : "BEFORE WE OPEN"}</small><b>Warm-up · Practice box</b></> : <><small>LEVEL {level} OF {allMachines.length}{machineInfo[job.machine].boss ? " · BOSS" : ""}</small><b>{who} · {machineInfo[job.machine].model}</b></>}</span></div>;

  return <div className={`rp rp-phase-${phase}`} ref={root}>
    <div className="rp-stage" ref={host} aria-hidden={gl ? "true" : undefined}>
      {!gl && <div className="rp-nogl"><Wrench size={42} /><p>This device can't draw the 3D workshop. Use the big buttons to do each step.</p></div>}
    </div>
    <div className="rp-bubble" ref={bubble} aria-live="polite">{say && <p><b>{who}</b>{say}</p>}</div>
    <div className="rp-tag" ref={tag} aria-hidden="true">{step?.tag && <b>{step.tag}</b>}</div>
    {hints && pts && !pts.moving && !open && <GestureHint phase={phase} pts={pts} job={job} dust={dust} fuseState={fuseState} />}
    {/* Looking around: every ticket shows it until the first drag. */}
    {gl && phase === "find" && !looked && !open && <div className="rp-draghint" aria-hidden="true"><div className="rp-gesture is-swipe"><Pointer className="rp-finger" size={34} strokeWidth={2.2} /><b>DRAG TO LOOK AROUND</b></div></div>}

    {headerSlot && createPortal(ticketTag, headerSlot)}
    <div className="rp-top">
      {!headerSlot && ticketTag}
      <span className="rp-spacer" />
      <button ref={coinBtn} className={`rp-coins ${step?.highlight === "coins" ? "is-spot" : ""} ${rain ? "is-bump" : ""}`} aria-label={`${shop.coins} coins. Open the shop`} onClick={() => setOpen("shop")}><Coins size={18} /> {shownCoins} <ShoppingCart size={16} /></button>
      <button className={`rp-menu ${step?.highlight === "menu" ? "is-spot" : ""}`} aria-label="Your levels" onClick={() => setOpen("menu")}><ListChecks size={22} /></button>
    </div>

    {/* Landscape: the steps run down a thin ruler on the left, clear of the machine. Portrait keeps them in the card. */}
    {showSteps && <ol className={`rp-ruler ${order.length > 10 ? "is-long" : ""}`} aria-label="Repair steps">{order.map((s) => { const Icon = stepIcons[s]; const st = stepState(s, phase, order); return <li key={s} className={st}><span>{st === "is-done" ? <Check size={15} strokeWidth={3} /> : <Icon size={15} strokeWidth={2.4} />}</span><small>{stepLabel[s]}</small></li>; })}</ol>}

    {showSteps && <section className="rp-mission" aria-live="polite">
      <ol className="rp-steps" aria-label="Repair steps">{order.map((s) => <li key={s} className={stepState(s, phase, order)}>{stepLabel[s]}</li>)}</ol>
      <h2>{mission.title}</h2>
      <p>{mission.text}</p>
      {mission.meter !== undefined && <div className="rp-meter"><i style={{ width: `${Math.round(mission.meter * 100)}%` }} /></div>}
      {(phase === "snack" || phase === "jam") && gl && <div className="rp-hammer" aria-hidden="true" ref={(el) => { if (scene.current) scene.current.hammerMeter = el; }} style={{ "--soft": HAMMER.soft, "--hard": HAMMER.hard } as CSSProperties}>
        <span>SOFT</span><span>JUST RIGHT</span><span>TOO HARD</span><b />
      </div>}
    </section>}

    {handsOn.includes(phase) && <Toolbox kinds={job.toolbox} tool={tool} glow={glowTool} onPick={(t) => { setTool(t); sfx.tick(); }} />}

    <div className="rp-belt">
      {phase === "find" && !gl && job.doors.map((d) => <button key={d.id} className="rp-tool" onClick={() => tryDoor(d.id, d.right)}><DoorOpen size={17} /> {d.name}</button>)}
      {phase === "arrive" && job.demo !== null && demoState !== "seen" && <button className="rp-go" disabled={demoState === "running"} onClick={watch}><Play size={18} fill="currentColor" /> {demoState === "running" ? "WATCHING…" : "SHOW ME"}</button>}
      {phase === "arrive" && (job.demo === null || demoState === "seen") && <button className="rp-go" onClick={takeJob}><Wrench size={18} /> TAKE THE JOB</button>}
      {phase === "power" && <button className="rp-go is-power" onClick={powerOn}><Zap size={18} /> POWER ON</button>}
      {!gl && handsOn.includes(phase) && phase !== "chip" && phase !== "find" && <button className="rp-go" onClick={skip}>DO IT <ArrowRight size={18} /></button>}
      {!gl && phase === "chip" && <button className="rp-go" onClick={() => setOpen("chip")}><Cpu size={18} /> OPEN THE CHIP</button>}
    </div>

    {toast && <div className={`rp-toast is-${toast.tone}`} role="status">{toast.text}</div>}

    {phase === "paid" && paid && <div className="rp-modal"><section className={`rp-card rp-paid ${bossDone ? "is-boss" : ""}`} aria-label="Paid">
      <span className="rp-stamp">{bossDone ? "BOSS BEATEN!" : `LEVEL ${level} CLEARED!`}</span>
      <h2>{who} pays up</h2>
      <ul>
        <li><span>Repair fee</span><b>+{paid.base}</b></li>
        {paid.tips.map((t) => <li key={t.label}><span>{t.label}</span><b>+{t.coins}</b></li>)}
      </ul>
      <p className="rp-total"><Coins size={22} /> <span className="rp-sum">+{paid.total}</span> <small>· you have {shop.coins}</small></p>
      {unlockNote && <p className="rp-unlock"><Sparkles size={18} /><span>Level {levelOf(unlockNote)} unlocked: <b>{machineInfo[unlockNote].name}</b>! It's your next customer.</span></p>}
      {bossDone && <p className="rp-unlock is-gold"><Award size={18} /><span>You beat the final level! Your Maker certificate is ready.</span></p>}
      <div className="rp-actions">
        <button className="rp-tool" onClick={() => setOpen("shop")}><Store size={17} /> Shop</button>
        {bossDone ? <button className="rp-go" autoFocus onClick={() => setOpen("cert")}><Award size={18} /> OPEN YOUR CERTIFICATE</button>
          : <button className="rp-go" autoFocus onClick={nextCustomer}>NEXT CUSTOMER <ArrowRight size={18} /></button>}
      </div>
    </section></div>}
    {rain && <div className="rp-rain" aria-hidden="true" key={rain.key}>{Array.from({ length: 14 }, (_, i) => {
      const ox = ((i * 37) % 70) - 35, oy = ((i * 53) % 44) - 22;
      return <i key={i} style={{ left: rain.x + ox, top: rain.y + oy, "--dx": `${rain.dx - ox}px`, "--dy": `${rain.dy - oy}px`, animationDelay: `${i * 75}ms` } as CSSProperties} />;
    })}</div>}

    {open === "chip" && <div className="rp-modal"><ChipBench job={job} onSlip={() => slip("chip")} onHelp={() => setSlips((s) => ({ ...s, help: s.help + 1 }))} onClose={() => setOpen(null)} onDone={chipFixed} /></div>}
    {open === "shop" && <div className="rp-modal"><Catalog shop={shop} onAction={shopAction} onClose={() => setOpen(null)} /></div>}

    {open === "menu" && <div className="rp-modal"><LevelMenu shop={shop} teacher={teacher} current={practice ? null : job.machine} onClose={() => setOpen(null)} onPlay={playLevel} onPractice={() => replayTutorial(true)} onTutorial={() => replayTutorial(false)} onCertificate={() => setOpen("cert")} /></div>}
    {open === "cert" && <Certificate name={name} login={studentKey} onClose={() => setOpen(null)} />}

    {/* The tutorial: the shutter goes up, a tour of the shop, then the practice box. */}
    {phase === "tour" && <div className={`rp-shutter ${tourAt >= 0 ? "is-up" : ""}`} aria-hidden={tourAt >= 0 ? "true" : undefined}>
      <div className="rp-slats" />
      <span className="rp-sign">{tourAt >= 0 ? "OPEN" : "CLOSED"}</span>
    </div>}
    {!started && <TitleScreen name={name} shop={shop} first={tutorial && !practiceOnly} onStart={start} />}
    {step && <section className="rp-card rp-coach" aria-live="polite" key={tourAt}>
      {!practiceOnly && <ol className="rp-dots" aria-label={`Step ${tourAt + 1} of ${tourSteps.length}`}>{tourSteps.map((_, i) => <li key={i} className={i < tourAt ? "is-done" : i === tourAt ? "is-now" : ""} />)}</ol>}
      <h2>{step.title}</h2>
      <p>{step.text}</p>
      <div className="rp-actions">
        <button className="rp-go" autoFocus disabled={step.spot === "box" && !landed} onClick={nextTour}>{step.spot === "box" ? <><Wrench size={18} /> LET'S DO IT</> : <>NEXT <ArrowRight size={18} /></>}</button>
      </div>
    </section>}
    {phase === "ready" && <div className="rp-modal is-clear"><section className="rp-card rp-ready" aria-label="Ready">
      <span className="rp-stamp">READY!</span>
      <h2><PartyPopper size={24} /> You know the moves</h2>
      <ul className="rp-moves">
        <li><b>↺</b> Twist to unscrew, <b>↻</b> to lock</li>
        <li><b>☝</b> Tap doors and panels</li>
        <li><b>〰</b> Sweep with the blower</li>
        <li><b>↔</b> Drag to look around</li>
      </ul>
      <p>{practiceOnly ? "Warmed up! A customer is waiting…" : "Your first customer is at the door…"}</p>
      <div className="rp-actions"><button className="rp-go" autoFocus onClick={finishTutorial}><Store size={18} /> {practiceOnly ? "BACK TO WORK" : "OPEN THE SHOP"}</button></div>
    </section></div>}
  </div>;
}

/* ---------- The toolbox ---------- */

function ToolIcon({ kind, size = 30 }: { kind: ToolKind; size?: number }) {
  if (kind === "cross" || kind === "flat" || kind === "star") {
    // The screw head itself fills the icon; a ring in the screwdriver's colour ties it to the handle.
    const c = headColors[kind as ScrewHead];
    return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill={c} stroke="#1d1d1f" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="10" fill="#eef0f4" stroke="#1d1d1f" strokeWidth="2" />
      {kind === "cross" && <path d="M16 9.5v13M9.5 16h13" stroke="#1d1d1f" strokeWidth="3.4" strokeLinecap="round" />}
      {kind === "flat" && <path d="M9 16h14" stroke="#1d1d1f" strokeWidth="3.6" strokeLinecap="round" />}
      {kind === "star" && <path d="M16 9.5v13M10.4 12.75l11.2 6.5M21.6 12.75l-11.2 6.5" stroke="#1d1d1f" strokeWidth="2.8" strokeLinecap="round" />}
    </svg>;
  }
  const Icon = { hand: Hand, blower: Wind, pliers: Scissors, hammer: Hammer, tape: CircleDot }[kind];
  return <Icon size={size} strokeWidth={2.2} />;
}

function Toolbox({ kinds, tool, glow, onPick }: { kinds: ToolKind[]; tool: ToolKind; glow: ToolKind | null; onPick: (t: ToolKind) => void }) {
  return <div className="rp-toolbox" role="radiogroup" aria-label="Toolbox" style={{ "--half": kinds.length <= 4 ? kinds.length : Math.ceil(kinds.length / 2) } as CSSProperties}>
    <small>TOOLBOX</small>
    <div>{kinds.map((k) => <button key={k} role="radio" aria-checked={tool === k} aria-label={toolInfo[k].name} className={`${tool === k ? "is-on" : ""} ${glow === k && tool !== k ? "is-glow" : ""}`} onClick={() => onPick(k)}>
      <ToolIcon kind={k} /><span>{toolInfo[k].short}</span>
    </button>)}</div>
  </div>;
}

/* ---------- Gesture hints: a finger that shows the move ---------- */

function GestureHint({ phase, pts, job, dust, fuseState }: { phase: Phase; pts: Points; job: Job; dust: number; fuseState: string }) {
  let hint: ReactNode = null;
  const finger = <Pointer className="rp-finger" size={34} strokeWidth={2.2} />;
  const at = (p: { x: number; y: number }, kind: string, label: string, extra: CSSProperties = {}) =>
    <div className={`rp-gesture is-${kind}`} style={{ left: p.x, top: p.y, ...extra } as CSSProperties}><i className="rp-gesture-ring" />{finger}<b>{label}</b></div>;
  if (phase === "find") {
    // Dragging has its own hint; this one points at the right door once it is in view.
    const right = pts.doors.find((d) => d.right);
    if (right?.facing) hint = at(right, "tap", job.practice ? "TAP THE PANEL" : "TAP THIS DOOR");
  }
  // The twist shows on every screw.
  if (phase === "screws") { const s = pts.screws.find((x) => !x.out); if (s) hint = at(s, "twist-ccw", "TWIST ↺"); }
  if (phase === "lock") { const s = pts.screws.find((x) => !x.locked); if (s) hint = at(s, "twist-cw", "TWIST ↻"); }
  if (phase === "panel" || phase === "close") hint = at(pts.panel, "tap", "TAP");
  if (phase === "chip") hint = at(pts.chip, "tap", "TAP");
  if (phase === "fuse" && pts.fuse) hint = at(fuseState === "blown" ? pts.fuse.blown : pts.fuse.spare, "tap", "TAP");
  if (phase === "snack" || phase === "jam") { const s = pts.snacks.find((x) => !x.done); if (s) hint = at(s, "hold", "HOLD… LET GO"); }
  if (phase === "claw" && pts.claw) hint = at(pts.claw, "tap", "TAP");
  if (phase === "tape" && pts.tape) hint = at(pts.tape, "tap", "TAP × 3");
  if (phase === "dust" && dust < 0.12 + (1 - job.dust)) {
    const left = Math.min(pts.boardA.x, pts.boardB.x), top = Math.min(pts.boardA.y, pts.boardB.y);
    hint = at({ x: left, y: top }, "rub", "SWEEP", { width: Math.abs(pts.boardA.x - pts.boardB.x), height: Math.abs(pts.boardA.y - pts.boardB.y) * 0.6 });
  }
  if (phase === "wires") {
    // Each loose cable in turn, dragged to the ring of its colour.
    const cable = job.cables.find((c) => pts.plugs.find((p) => p.id === c.id)?.at !== c.socket);
    const plug = cable && pts.plugs.find((p) => p.id === cable.id);
    const socket = cable && pts.sockets.find((s) => s.id === cable.socket);
    if (plug && socket) hint = at(plug, "drag", "DRAG", { "--dx": `${socket.x - plug.x}px`, "--dy": `${socket.y - plug.y}px` } as CSSProperties);
  }
  return <div className="rp-gestures" aria-hidden="true">{hint}</div>;
}

/* ---------- The start screen ---------- */

/** The logo, a line about the game, where the student is up to, and START. */
function TitleScreen({ name, shop, first, onStart }: { name: string; shop: Shop; first: boolean; onStart: () => void }) {
  const done = allMachines.filter((m) => cleared(shop, m)).length;
  return <div className="rp-title" role="region" aria-label="Repair Shop start">
    <div className="rp-title-rays" aria-hidden="true" />
    <div className="rp-logo" aria-label="Repair Shop">
      <span className="rp-logo-gear" aria-hidden="true"><Cog size={74} strokeWidth={2.2} /><Wrench className="rp-logo-wrench" size={46} strokeWidth={2.6} /></span>
      <span className="rp-logo-words"><b>REPAIR</b><b>SHOP</b></span>
      <span className="rp-logo-tag">FIX IT · CODE IT · GET PAID</span>
    </div>
    <p className="rp-title-who">{first ? `Welcome, ${name.split(" ")[0]}! Your shop opens today.` : done === allMachines.length ? `All ${done} levels cleared, ${name.split(" ")[0]}! Play any level again.` : `Level ${Math.min(allMachines.length, done + 1)} of ${allMachines.length} · ${shop.coins} coins`}</p>
    <button className="rp-start" autoFocus onClick={onStart}><Play size={24} fill="currentColor" /> START</button>
  </div>;
}

const ScrewIcon = ({ size = 15 }: { size?: number; strokeWidth?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" /></svg>;
const stepIcons: Record<string, (p: { size?: number; strokeWidth?: number }) => ReactNode> = {
  find: DoorOpen, screws: ScrewIcon, panel: PackageOpen, dust: Wind, wires: Cable, fuse: Zap, snack: Hammer, jam: Cog, claw: Scissors, tape: Bandage, chip: Cpu, close: PackageOpen, lock: Lock, power: Power,
};
const stepLabel: Record<string, string> = { find: "Door", screws: "Screws", panel: "Open", dust: "Blow", wires: "Wires", fuse: "Fuse", snack: "Snack", jam: "Gear", claw: "Claw", tape: "Tape", chip: "Chip", close: "Close", lock: "Lock", power: "Power" };
/** Every machine: find the door, screws, open, blow, then its own faults, the chip, and close up. */
const stepsFor = (job: Job): string[] => job.practice ? ["find", "screws", "panel", "dust", "close", "lock"] : ["find", "screws", "panel", "dust", ...job.faults, "chip", "close", "lock", "power"];
function stepState(step: string, phase: Phase, order: string[]) {
  const at = phase === "arrive" || phase === "tour" ? -1 : phase === "paid" || phase === "ready" ? order.length : order.indexOf(phase);
  const i = order.indexOf(step);
  return i < at ? "is-done" : i === at ? "is-now" : "";
}

type MissionState = { screwsOut: number; screwsLocked: number; dust: number; wired: number; fuseState: string; demoState: string; who: string; need: ToolKind | null; gl: boolean; freed: number; tool: ToolKind; wraps: number };
/** The practice box talks you through every move: first the tool, then the gesture. */
function practiceMission(phase: Phase, job: Job, s: MissionState): { title: string; text: string; meter?: number } | null {
  const pick = (t: ToolKind | null) => !t || s.tool === t ? "" : t === "hand" ? "Pick your hand in the toolbox. " : drivers.includes(t) ? `Pick the ${toolInfo[t].short} screwdriver: it matches the screw head. ` : `Pick the ${toolInfo[t].short.toLowerCase()} in the toolbox. `;
  const n = job.screws.length;
  switch (phase) {
    case "find": return { title: "Find the way in", text: s.gl ? "Drag to spin around the box. The panel with the screws is the way in: tap it." : "Tap the back panel." };
    case "screws": return { title: `Unscrew the panel · ${s.screwsOut}/${n}`, text: `${pick(s.need)}Twist ↺ around the screw: counter-clockwise, lefty loosey!`, meter: s.screwsOut / n };
    case "panel": return { title: "Pull the panel off", text: `${pick("hand")}Tap the panel.` };
    case "dust": return { title: "Blow the dust away", text: `${pick("blower")}Sweep your finger over the board until it's clean.`, meter: Math.min(1, s.dust / 0.95) };
    case "close": return { title: "Put the panel back", text: `${pick("hand")}Tap the panel leaning on the stool.` };
    case "lock": return { title: `Lock the screws · ${s.screwsLocked}/${n}`, text: `${pick(s.need)}Twist ↻ clockwise: righty tighty!`, meter: s.screwsLocked / n };
    default: return null;
  }
}
/** Every step says what to look at, what to do and which tool to use. */
function missionFor(phase: Phase, job: Job, s: MissionState): { title: string; text: string; meter?: number } {
  if (job.practice) { const m = practiceMission(phase, job, s); if (m) return m; }
  const use = (t: ToolKind | null) => !t ? "" : t === "hand" ? " Use your hand." : ` Use the ${toolInfo[t].name.toLowerCase()}.`;
  const vending = job.machine === "vending";
  const thing = vending ? "glass" : "panel";
  const right = job.doors.find((d) => d.right)!.name.toLowerCase();
  const n = job.screws.length;
  const mess = { crumbs: "crumbs", fluff: "fluff", mud: "mud", grounds: "coffee grounds", dust: "dust" }[job.mess];
  switch (phase) {
    case "arrive": return job.demo === null ? { title: "A new customer", text: `${s.who} can't show you the problem: the program is gone. Take the job!` } : s.demoState === "seen" ? { title: "You saw it", text: "Something's wrong inside. Take the job!" } : { title: "A new customer", text: `${s.who} wants to show you the problem.` };
    case "find": return { title: "Find the right door", text: !s.gl ? `${clueText[job.machine]} Which door do you open?` : `Drag to look around. ${clueText[job.machine]} Tap the ${right}.${use("hand")}` };
    case "screws": return { title: `Unscrew the ${thing} · ${s.screwsOut}/${n}`, text: `Look at the screw head and pick the screwdriver that fits it. Twist ↺ counter-clockwise: lefty loosey!${use(s.need)}`, meter: s.screwsOut / n };
    case "panel": return vending ? { title: "Lift the glass off", text: `Tap the front glass.${use("hand")}` } : { title: "Pull the panel off", text: `Tap the ${right}.${use("hand")}` };
    case "dust": return { title: `Blow the ${mess} away`, text: `Sweep every corner of the board.${use("blower")}`, meter: Math.min(1, s.dust / 0.95) };
    case "wires": return { title: `Plug in the cables · ${s.wired}/${job.cables.length}`, text: "Drag each loose cable to the ring of its colour." + use("hand"), meter: s.wired / job.cables.length };
    case "fuse": return { title: "Swap the burnt fuse", text: (s.fuseState === "blown" ? "Tap the black, burnt fuse to pull it out." : "Now tap the new fuse on the ledge to put it in.") + use("pliers") };
    case "snack": return { title: "Free the stuck snack", text: `Hold on the snack to wind up the hammer, then let go. Gentle taps!${use("hammer")}` };
    case "jam": return { title: "Free the stuck gear", text: `The gold gear is jammed. Hold on it to wind up the hammer, then let go. Gentle taps!${use("hammer")}` };
    case "claw": return { title: "Fix the bent claw finger", text: `One finger points the wrong way, so the claw can't grab. Tap it to straighten it.${use("pliers")}` };
    case "tape": return { title: `Tape the worn cable · ${s.wraps}/3`, text: `Copper shows through and it sparks. Tap the worn spot three times to wrap it.${use("tape")}`, meter: s.wraps / 3 };
    case "chip": return { title: "Reprogram the logic chip", text: `Tap the glowing LOGIC chip${vending ? ", bottom left" : job.machine === "claw" ? ", on the floor of the glass case" : " on the board"}.${use("hand")}` };
    case "close": return { title: vending ? "Put the glass back" : "Put the panel back", text: `Tap the ${thing} leaning on the side.${use("hand")}` };
    case "lock": return { title: `Lock the screws · ${s.screwsLocked}/${n}`, text: `Twist ↻ clockwise: righty tighty! Match each head again.${use(s.need)}`, meter: s.screwsLocked / n };
    case "power": return { title: "Moment of truth", text: "Power it on and test it." };
    default: return { title: "", text: "" };
  }
}

/* ---------- The shop catalog ---------- */

const catIcons: Record<Category, typeof Wrench> = { bench: Armchair, floor: Grid3x3, light: Lamp, decor: Sparkles };
function Catalog({ shop, onAction, onClose }: { shop: Shop; onAction: (id: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState<Category>("bench");
  const inUse = (id: string) => Object.values(shop.equipped).includes(id);
  return <section className="rp-card rp-catalog" aria-label="Shop">
    <header><h2><Store size={22} /> Shop upgrades</h2><span className="rp-total"><Coins size={20} /> {shop.coins}</span><button className="rp-x" aria-label="Close" onClick={onClose}><X size={18} /></button></header>
    <nav className="rp-tabs" role="tablist" aria-label="Categories">{categories.map((c) => { const Icon = catIcons[c.id]; return <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)}><Icon size={16} /> {c.name}</button>; })}</nav>
    <div className="rp-items">{catalog.filter((i) => i.cat === cat).map((item) => {
      const have = owns(shop, item.id), used = inUse(item.id), wearable = cat === "bench" || cat === "floor" || cat === "light";
      return <div key={item.id} className={`rp-item ${have ? "is-owned" : ""} ${used ? "is-used" : ""}`}>
        <span className="rp-swatch" style={{ background: item.swatch }} aria-hidden="true" />
        <span className="rp-item-text"><b>{item.name}</b><small>{item.copy}</small></span>
        {used ? <span className="rp-badge"><Check size={14} /> IN USE</span>
          : have ? wearable ? <button className="rp-tool" onClick={() => onAction(item.id)}>USE</button> : <span className="rp-badge"><Check size={14} /> OWNED</span>
          : <button className="rp-tool" disabled={shop.coins < item.price} aria-label={`Buy ${item.name} for ${item.price} coins`} onClick={() => onAction(item.id)}><Coins size={15} /> {item.price}</button>}
      </div>;
    })}</div>
  </section>;
}

/* ---------- The menu: the warm-up, the seven levels and the certificate ---------- */

const machineIcons: Record<MachineId, typeof Wrench> = { arcade: Gamepad, vending: Candy, jukebox: Music, scooter: Bike, claw: Hand, coffee: Coffee, robot: Bot };
function LevelMenu({ shop, teacher, current, onClose, onPlay, onPractice, onTutorial, onCertificate }: { shop: Shop; teacher: boolean; current: MachineId | null; onClose: () => void; onPlay: (m: MachineId) => void; onPractice: () => void; onTutorial: () => void; onCertificate: () => void }) {
  const done = roadmap.filter((m) => cleared(shop, m.id)).length;
  const certOpen = cleared(shop, "robot");
  return <section className="rp-card rp-machines" aria-label="Your levels">
    <header><h2><ListChecks size={22} /> Your levels</h2><button className="rp-x" aria-label="Close" onClick={onClose}><X size={18} /></button></header>
    <p className="rp-machines-sum"><b>{done}</b> of {roadmap.length} levels cleared · fix a machine to open the next one</p>
    <ol>
      {/* The warm-up folder comes first: the shop tour, then the practice box. No customer, no coins. */}
      <li className="is-practice rp-folder">
        <span className="rp-machine-icon"><FolderOpen size={22} /></span>
        <span className="rp-machine-text"><b>Warm-up</b><small>No customer, no coins: any time you like</small>
          <span className="rp-folder-items">
            <button className="rp-tool" aria-label="Replay the shop tour" onClick={onTutorial}><b>1</b> Shop tour <Sparkles size={14} /></button>
            <button className="rp-tool" aria-label="Practice box" onClick={onPractice}><b>2</b> Practice box <PackageOpen size={14} /></button>
          </span>
        </span>
      </li>
      {roadmap.map((m) => {
        const Icon = machineIcons[m.id];
        const made = shop.made[m.id] ?? 0;
        const openNow = levelOpen(shop, m.id, teacher);
        const now = current === m.id;
        const state = !openNow ? "soon" : made ? "done" : "open";
        return <li key={m.id} className={`is-${state} ${now ? "is-current" : ""}`}>
          <span className="rp-machine-icon">{state === "soon" ? <Lock size={20} /> : <Icon size={22} />}</span>
          <span className="rp-machine-text">
            <b>Level {levelOf(m.id)} · {m.name}{m.boss && <em>BOSS</em>}</b>
            <small>{now ? "On your bench now" : state === "done" ? `Cleared · fixed ${made} ${made === 1 ? "time" : "times"}` : state === "open" ? (teacher ? "Open: the teacher has every level" : "Open: your next customer brings it") : `Clear level ${levelOf(m.id) - 1} to open it`}</small>
          </span>
          {state === "done" && !now && <span className="rp-badge"><Check size={14} /></span>}
          {now ? <button className="rp-tool rp-row-go" aria-label={`Restart level ${levelOf(m.id)}`} onClick={() => onPlay(m.id)}><RotateCcw size={14} /> RESTART</button>
            : openNow && <button className="rp-go rp-row-go" aria-label={`Play level ${levelOf(m.id)}`} onClick={() => onPlay(m.id)}><Play size={14} /> PLAY</button>}
        </li>;
      })}
      <li className={`rp-cert-row ${certOpen ? "is-open" : "is-soon"}`}>
        <span className="rp-machine-icon"><Award size={22} /></span>
        <span className="rp-machine-text"><b>The Maker Family certificate</b><small>{certOpen ? "You earned it!" : "Beat the Robot, the final level"}</small></span>
        {certOpen ? <button className="rp-go rp-row-go" onClick={onCertificate}><Award size={14} /> OPEN</button>
          : teacher && <button className="rp-tool rp-row-go" aria-label="Preview the certificate" onClick={onCertificate}><Eye size={14} /> PREVIEW</button>}
      </li>
    </ol>
  </section>;
}

/* ---------- The logic chip: the C# side quest ---------- */

const letter = (i: number) => String.fromCharCode(65 + i);
/** What a bench row shows. */
const said = (text: string) => text ? `“${text}”` : "nothing";
const loose = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Keys for the symbols that are hard to find on a tablet keyboard. */
const codeKeys = ["{", "}", "(", ")", "\"", ";", "<", ">", "=", "⇥"];

/**
 * A typed line of code: a see-through input over a coloured copy of the same text.
 * Both use one font at one weight, and the copy scrolls with the input, so the caret stays on its letter.
 */
function TypedLine({ value, onChange, onEnter, label, placeholder, autoFocus, line }: { value: string; onChange: (text: string) => void; onEnter: () => void; label: string; placeholder: string; autoFocus?: boolean; line?: boolean }) {
  const copy = useRef<HTMLElement>(null);
  const follow = (el: HTMLInputElement) => requestAnimationFrame(() => { if (copy.current) copy.current.scrollLeft = el.scrollLeft; });
  return <span className={`rp-typed ${line ? "is-line" : ""}`}>
    <code ref={copy} className="rp-typed-hl" aria-hidden="true"><Cs code={`${value} `} /></code>
    <input value={value} autoFocus={autoFocus} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label={label} placeholder={placeholder}
      onChange={(e) => {
        const el = e.target, tidy = tidyTyped(value, el.value, el.selectionStart ?? el.value.length);
        onChange(tidy.text);
        if (tidy.text !== el.value) requestAnimationFrame(() => el.setSelectionRange(tidy.caret, tidy.caret));
        follow(el);
      }} onScroll={(e) => follow(e.currentTarget)} onSelect={(e) => follow(e.currentTarget)}
      onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }} />
  </span>;
}


/**
 * One chip, five ways to fix it, a step harder each level:
 * pick the sign (after predicting), build the condition from pieces, type it, type it and write the else line,
 * and in the final round write the whole if / else after line 1.
 */
function ChipBench({ job, onSlip, onHelp, onClose, onDone }: { job: Job; onSlip: () => void; onHelp: () => void; onClose: () => void; onDone: (code?: string) => void }) {
  const chip = job.chip, v = chip.variable, n = chip.right.n;
  const [step, setStep] = useState<"predict" | "fix" | "flash">(chip.predict ? "predict" : "fix");
  const [mode, setMode] = useState<"pick" | "tokens" | "typed">(chip.mode === "pick" ? "pick" : chip.mode === "tokens" ? "tokens" : "typed");
  const [built, setBuilt] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [elseLine, setElseLine] = useState("");
  const [written, setWritten] = useState("");
  const [shape, setShape] = useState(false);
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState<{ text: string; tone: "good" | "bad" | "info" } | null>(null);
  const [rows, setRows] = useState<BenchRow[] | null>(null);
  const [shown, setShown] = useState(0);
  const [progress, setProgress] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const helpGiven = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);
  // The parent re-renders often; the flash timer must not restart each time.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const write = chip.mode === "write";

  const miss = (text: string) => { sfx.wrong(); onSlip(); setMisses((m) => m + 1); setNote({ text, tone: "bad" }); };
  const trimmedTray = mode === "tokens" && misses >= 2;
  const tray = trimmedTray ? chip.trimmed : chip.tray;
  useEffect(() => { if (trimmedTray && !helpGiven.current) { helpGiven.current = true; onHelp(); setNote({ text: "Fewer pieces now: only the ones you need are left.", tone: "info" }); } }, [trimmedTray, onHelp]);

  const condition = mode === "pick" ? (built[0] ? `${v} ${built[0]} ${n}` : "") : mode === "tokens" ? built.join(" ") : typed;
  const ready = write ? !!written.trim() : !!condition.trim() && (chip.mode !== "else" || !!elseLine.trim());
  const runBench = () => {
    let program: Run;
    if (write) {
      const parsed = parseProgram(written, v);
      if (!parsed.ok) { miss(parsed.error); return; }
      program = parsed.run;
    } else {
      const parsed = parseCondition(condition, v);
      if (!parsed.ok) { miss(parsed.error); return; }
      let elseText: string | undefined;
      if (chip.mode === "else") {
        const line = parseWriteLine(elseLine);
        if (!line.ok) { miss(`The else line: ${line.error}`); return; }
        elseText = line.text;
      }
      program = runWith(job, parsed.test, elseText);
    }
    const result = bench(job, program);
    setRows(result); setShown(0); setNote(null);
    result.forEach((_, i) => window.setTimeout(() => { setShown(i + 1); if (result[i].ok) sfx.tick(); else sfx.wrong(); }, 160 * (i + 1)));
    window.setTimeout(() => {
      const bad = result.find((r) => !r.ok);
      if (!bad) { sfx.good(); setNote({ text: `All ${result.length} tests pass!`, tone: "good" }); setStep("flash"); return; }
      onSlip(); setMisses((m) => m + 1);
      // Almost the right words: say so, so it's not taken for a logic mistake.
      const close = bad.got && bad.expected && loose(bad.got) === loose(bad.expected);
      setNote({ text: close ? `Almost! Check the text: it must say ${said(bad.expected)} exactly, with the same capitals and marks.` : `With ${v} = ${bad.value} it should show ${said(bad.expected)}, but it shows ${said(bad.got)}.`, tone: "bad" });
    }, 160 * (result.length + 1));
  };

  useEffect(() => {
    if (step !== "flash") return;
    const id = window.setInterval(() => setProgress((p) => { if (p >= 1) { window.clearInterval(id); return 1; } return p + 0.05; }), 40);
    // The final round hands its program back, so the teacher's report can show it.
    const done = window.setTimeout(() => doneRef.current(write ? written : undefined), 1500);
    return () => { window.clearInterval(id); window.clearTimeout(done); };
  }, [step]);

  /** A symbol key: it goes in where the cursor is. */
  const insert = (key: string) => {
    const el = area.current;
    const text = key === "⇥" ? "    " : key;
    const at = el?.selectionStart ?? written.length, end = el?.selectionEnd ?? at;
    const next = written.slice(0, at) + text + written.slice(end);
    setWritten(next); setRows(null);
    window.setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(at + text.length, at + text.length); } }, 0);
  };

  const sticker = <div className="rp-sticker" aria-label={`Sticker on the machine: ${chip.sticker.join(" ")}`}><small>ON THE MACHINE</small><b>{chip.sticker[0]}</b><b>{chip.sticker[1]}</b></div>;
  if (step === "predict" && chip.predict) {
    // The first levels ask for a prediction first, in the same window as the Switchyard quiz.
    const { predict } = chip;
    const right = picked === predict.answer;
    return <section className="rp-card rp-chipbench is-quiz" aria-label="Logic chip">
      <header><h2><Cpu size={22} /> Logic chip · predict</h2><div><button className="rp-x" aria-label="Close" onClick={onClose}><X size={18} /></button></div></header>
      <div className={`lab-quiz rp-quiz ${picked === null ? "" : right ? "is-right" : "is-wrong"}`}>
        <div className="lab-quiz-grid">
          <div className="lab-panel lab-quiz-code">
            <div className="lab-window-bar" aria-hidden="true"><i /><i /><i /><span>LogicChip.cs</span><em>PREDICT</em></div>
            <LabCode code={chipCode(job, undefined, predict.value).join("\n")} />
          </div>
          <div className="lab-quiz-answers">
            <h1>{predict.question}</h1>
            <div className="lab-answers">{predict.options.map((option, index) => {
              const state = picked === null ? "" : index === picked ? (right ? "is-correct" : "is-incorrect") : right ? "is-faded" : "";
              return <button key={option} style={{ "--i": index } as CSSProperties} disabled={picked !== null} className={`lab-answer is-${letter(index).toLowerCase()} ${state}`} aria-label={`${letter(index)} ${option}`}
                onClick={() => { setPicked(index); if (index === predict.answer) sfx.good(); else { sfx.wrong(); onSlip(); } }}>
                <b>{picked === index ? (right ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />) : letter(index)}</b><span>{option}</span>
              </button>;
            })}</div>
            {picked !== null && <div className={`lab-feedback ${right ? "is-right" : "is-wrong"}`} role="status">
              <strong>{right ? <><Check size={18} strokeWidth={3} /> Correct.</> : <><X size={18} strokeWidth={3} /> Not quite.</>}</strong>
              <p><b>{right ? "Because" : "Look again"}</b> {predict.why[picked]}</p>
              {right ? <button className="fp-primary is-cue" onClick={() => { setStep("fix"); setNote(null); }}>FIX THE CHIP <ArrowRight size={14} /></button>
                : <button className="fp-primary is-cue" onClick={() => setPicked(null)}><Eye size={14} /> TRY AGAIN</button>}
            </div>}
          </div>
        </div>
      </div>
    </section>;
  }

  // The program in the Switchyard's editor: numbered lines, the shared colours, line 2 is the one to fix.
  const line2 = mode === "pick" ? <><code className="sy-code-text"><Cs code={`if (${v} `} /></code>
      <button className={`sy-slot rp-op ${built[0] ? "is-filled" : "is-target"}`} aria-label={built[0] ? `Operator ${built[0]}. Remove` : "Operator: empty"} onClick={() => { setBuilt([]); setRows(null); }}>{built[0] ? <code className="sy-slot-code"><Cs code={built[0]} /></code> : <span>?</span>}</button>
      <code className="sy-code-text"><Cs code={` ${n})`} /></code></>
    : mode === "tokens" ? <><code className="sy-code-text"><Cs code="if (" /></code>
      {built.length ? built.map((t, i) => <button key={i} className="sy-slot is-filled rp-piece" aria-label={`${t}. Remove`} onClick={() => { setBuilt(built.filter((_, j) => j !== i)); setRows(null); }}><code className="sy-slot-code"><Cs code={t} /></code><X size={12} className="sy-slot-x" /></button>)
        : <span className="sy-slot is-target rp-piece-empty">tap the pieces below</span>}
      <code className="sy-code-text"><Cs code=")" /></code></>
    : <><code className="sy-code-text"><Cs code="if (" /></code>
      <TypedLine value={typed} autoFocus label="Condition" placeholder="type the condition" onChange={(t) => { setTyped(t); setRows(null); }} onEnter={() => { if (ready) runBench(); }} />
      <code className="sy-code-text"><Cs code=")" /></code></>;
  const code = chipCode(job);
  const elseRows = chip.mode === "else" ? ["else", "{", "@else", "}"] : [];
  const editor = write
    ? <div className="sy rp-sy"><div className="sy-editor">
        <div className="sy-row"><span className="sy-ln">1</span><code className="sy-code-text"><Cs code={code[0]} /></code></div>
      </div>
        <textarea ref={area} className="rp-write" value={written} rows={9} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Your program" placeholder="Line 2 onwards: write the if / else here…" onChange={(e) => {
            const el = e.target, tidy = tidyTyped(written, el.value, el.selectionStart ?? el.value.length);
            setWritten(tidy.text); setRows(null);
            if (tidy.text !== el.value) requestAnimationFrame(() => el.setSelectionRange(tidy.caret, tidy.caret));
          }}
          onKeyDown={(e) => {
            // Tab indents instead of leaving the box; a new line starts at the same indent as the one above.
            if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); insert("⇥"); }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              const el = e.currentTarget, before = written.slice(0, el.selectionStart);
              const indent = /[^\n]*$/.exec(before)![0].match(/^[ \t]*/)![0];
              if (indent) { e.preventDefault(); insert(`\n${indent}`); }
            }
          }} />
        <div className="rp-keys" aria-label="Code symbols">{codeKeys.map((k) => <button key={k} type="button" aria-label={k === "⇥" ? "Indent" : `Type ${k}`} onClick={() => insert(k)}><code>{k}</code></button>)}</div>
      </div>
    : <div className="sy rp-sy"><div className="sy-editor">{[...code, ...elseRows].map((line, i) => {
      const indent = line.startsWith("    ") || line === "@else";
      const content = i === 1 ? line2
        : line === "@else" ? <TypedLine line value={elseLine} label="Else line" placeholder="write the missing line" onChange={(t) => { setElseLine(t); setRows(null); }} onEnter={() => { if (ready) runBench(); }} />
        : <code className={`sy-code-text ${/^[{}]$/.test(line.trim()) ? "is-brace" : ""}`}><Cs code={line.trim()} /></code>;
      return <div key={i} className={`sy-row ${i === 1 || line === "@else" ? "is-now" : ""}`}><span className="sy-ln">{i + 1}</span>{indent ? <div className="sy-indent">{content}</div> : content}</div>;
    })}</div>
      {step === "fix" && (mode === "pick" || mode === "tokens") && <div className="sy-tools rp-pieces">
        <small>{mode === "pick" ? chip.pickHint : "Code pieces · tap to place"}</small>
        <div className="sy-bank">{(mode === "pick" ? chip.pick : tray).map((t) => <button key={t} aria-label={t} aria-pressed={mode === "pick" && built[0] === t} disabled={mode === "tokens" && built.length >= 5} onClick={() => { setBuilt(mode === "pick" ? [t] : [...built, t]); setRows(null); sfx.tick(); }}><code><Cs code={t} /></code></button>)}</div>
      </div>}
    </div>;

  return <section className={`rp-card rp-chipbench ${write ? "is-write" : ""}`} aria-label="Logic chip">
    <header><h2><Cpu size={22} /> Logic chip{write ? " · final round" : ""}</h2><div><button className="rp-x" aria-label="Close" onClick={onClose}><X size={18} /></button></div></header>
    <div className="rp-chip-top">{sticker}<p className="rp-rule">{chip.rule}</p></div>
    {write && <p className="rp-wiped">The program was wiped. Only line 1 is left: write the rest by hand.</p>}
    {editor}
    {write && shape && <pre className="rp-shape" aria-label="The shape of an if / else">{"if (condition)\n{\n    Console.WriteLine(\"…\");\n}\nelse\n{\n    Console.WriteLine(\"…\");\n}"}</pre>}

    {step === "fix" && <div className="rp-q">
      {(chip.mode === "typed" || chip.mode === "else") && mode === "typed" && misses >= 2 && <button className="rp-tool" onClick={() => { setMode("tokens"); setBuilt([]); onHelp(); setNote({ text: "Here are the code pieces for the condition.", tone: "info" }); }}><Sparkles size={15} /> Use code pieces</button>}
      {write && misses >= 2 && !shape && <button className="rp-tool" onClick={() => { setShape(true); onHelp(); }}><Eye size={15} /> Show me the shape</button>}
      <button className="rp-go" disabled={!ready} onClick={runBench}><Play size={17} fill="currentColor" /> TEST ON THE BENCH</button>
    </div>}

    {/* The message comes before the bench rows, so it shows without scrolling on a short screen. */}
    {note && <p className={`rp-note is-${note.tone}`} role="status">{note.text}</p>}
    {step === "flash" && <div className="rp-flash"><span>WRITING THE CHIP…</span><div className="rp-meter"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div></div>}
    {rows && <ol className="rp-bench" aria-label="Test bench">{rows.slice(0, shown).map((r) => <li key={r.value} className={r.ok ? "is-ok" : "is-bad"}><span>{v} = {r.value}</span><span>{said(r.got)}</span>{r.ok ? <Check size={15} /> : <X size={15} />}</li>)}</ol>}
  </section>;
}
