import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Award, Bot, Candy, Check, CircleDot, Coffee, Coins, Cpu, DoorOpen, Eye, Gamepad, Hammer, Hand, Lamp, ListChecks, Lock, Music, PackageOpen, PartyPopper, Play, Pointer, Power, RotateCcw, Scissors, ShoppingCart, SkipForward, Sparkles, Store, Wind, Wrench, X, Zap, Grid3x3, Armchair, Cable } from "lucide-react";
import { loadProgress as loadRemote } from "../../../lib/progressStore";
import { sanitizeBossProgress } from "../../../lib/bossProgress";
import type { Progress } from "../progress";
import { LabCode } from "../LabParts";
import { Cs } from "../switchyard/Cs";
import {
  HAMMER, UNLOCK_EVERY, afterTicket, allMachines, bench, brokenTest, buy, catalog, categories, chipCode, clueText, equip, evidenceFrom, freshShop, hidesProblem, itemById, jokeText, loadShop, lookOf,
  machineInfo, machineOrder, makeJob, nextMachine, overrideFor, owns, parseCondition, payout, practiceJob, printed, profileTier, rightTest, roadmap, saveShop, shiftTier, slotName, tierNames, tiers, toolFor, toolInfo, unlockedBy,
  type BenchRow, type Category, type Evidence, type Job, type MachineId, type ScrewHead, type Shop, type Slips, type Tier, type ToolKind,
} from "./logic";
import { Workshop, headColors, webglAvailable, type Points, type TourSpot, type View, type Work } from "./workshop";
import { sfx } from "./sound";
import { Certificate } from "./Certificate";
import "./repair.css";

/** tour and ready: the tutorial before the first customer (the tour of the shop, and the end of the practice box). */
type Phase = "tour" | "arrive" | "find" | "screws" | "panel" | "dust" | "wires" | "fuse" | "snack" | "claw" | "chip" | "close" | "lock" | "power" | "paid" | "ready";
type Ticket = { seed: number; tier: Tier; machine: MachineId; hide: boolean };
const customers = ["Nina", "Theo", "Kai", "Lia", "Sam", "Bia", "Joe", "Ravi", "Duda", "Gabi"];
const noSlips = (): Slips => ({ door: 0, tools: 0, wires: 0, chip: 0, help: 0 });
const handsOn: Phase[] = ["find", "screws", "panel", "dust", "wires", "fuse", "snack", "claw", "chip", "close", "lock"];
const drivers: ToolKind[] = ["cross", "flat", "star"];
const views: Record<Phase, View> = { tour: "tour", ready: "front", arrive: "front", find: "orbit", screws: "door", panel: "door", dust: "inside", wires: "inside", fuse: "inside", snack: "inside", claw: "inside", chip: "inside", close: "door", lock: "door", power: "front", paid: "front" };
const seedNow = () => Math.floor(Math.random() * 1e9);
/** The tour of the shop, before the practice box. highlight: a button on screen to point at. */
type TourStep = { spot: TourSpot; title: string; text: string; tag?: string; highlight?: "coins" | "menu" };
const tourSteps: TourStep[] = [
  { spot: "machine", title: "Machines stand here", text: "Customers bring their broken machines to this spot. You fix them right here.", tag: "MACHINE SPOT" },
  { spot: "door", title: "Customers come in here", text: "They walk in, show you what's wrong… and pay you when it works again.", tag: "CUSTOMERS" },
  { spot: "bench", title: "Your workbench", text: "It's a bit old. Coins buy a better bench, a new floor, lights and decorations.", tag: "WORKBENCH" },
  { spot: "wide", title: "Your coins", text: "Every repair pays. Tap your coins any time to open the shop.", highlight: "coins" },
  { spot: "wide", title: "Your machines", text: "Tap the list to see the machines you've fixed and the ones still to come.", highlight: "menu" },
  { spot: "box", title: "Warm-up time!", text: "A practice box! Open it, clean it and close it again: every repair starts like this." },
];

function localEvidence(p: Progress, login: string): Evidence {
  let bosses = null;
  try { const raw = localStorage.getItem(`sharpie:final-bosses:v2:${login}`); bosses = raw ? sanitizeBossProgress(JSON.parse(raw)) : null; } catch { /* no boss save on this device */ }
  return evidenceFrom(p, bosses);
}

/** headerSlot: the middle of the Final Project header, where the ticket goes so the screen keeps its room. */
export function RepairShop({ name, studentKey, progress, teacher, preview, headerSlot = null }: { name: string; studentKey: string; progress: Progress; teacher: boolean; preview: boolean; headerSlot?: HTMLElement | null }) {
  const [shop, setShopState] = useState<Shop>(() => preview ? freshShop() : loadShop(studentKey));
  const setShop = useCallback((next: Shop) => { setShopState(next); if (!preview) saveShop(studentKey, next); }, [preview, studentKey]);
  const [evidence, setEvidence] = useState<Evidence>(() => localEvidence(progress, studentKey));
  const auto = profileTier(evidence);
  const [teacherTier, setTeacherTier] = useState<Tier>("guided");
  const [teacherMachine, setTeacherMachine] = useState<MachineId | "auto">("auto");
  // The tier the next ticket gets. A ticket keeps its tier until it is paid.
  const tierNow: Tier = teacher ? teacherTier : overrideFor(studentKey) ?? shiftTier(auto, shop.shift);
  const ticketFor = (tier: Tier, fixed: number, machine: MachineId | "auto" = teacher ? teacherMachine : "auto"): Ticket => {
    const seed = seedNow();
    // The teacher can bring any machine; students get the machines they have unlocked.
    return { seed, tier, machine: machine === "auto" ? nextMachine(fixed, seed) : machine, hide: !teacher && hidesProblem(shop, tier) };
  };
  const [ticket, setTicket] = useState<Ticket>(() => ticketFor(tierNow, shop.fixed));
  const newTicket = (tier: Tier, machine?: MachineId | "auto") => setTicket(ticketFor(tier, shop.fixed, machine));
  const { seed, tier, machine, hide } = ticket;
  // The first visit starts with the tutorial: a tour of the shop and a practice box. The teacher can replay it from the menu.
  const [tutorial, setTutorial] = useState(() => !shop.tutorial && !teacher);
  const [tourAt, setTourAt] = useState(-1);
  const [landed, setLanded] = useState(false);
  const [looked, setLooked] = useState(false);
  const job = useMemo(() => tutorial ? practiceJob() : makeJob(tier, seed, machine, hide), [tutorial, tier, seed, machine, hide]);
  const practice = !!job.practice;
  const who = customers[seed % customers.length];
  const [levelNote, setLevelNote] = useState("");
  const [unlockNote, setUnlockNote] = useState<MachineId | null>(null);

  const [phase, setPhase] = useState<Phase>("arrive");
  const [demoState, setDemoState] = useState<"ready" | "running" | "seen">("ready");
  const [slips, setSlips] = useState<Slips>(noSlips);
  const [screwsOut, setScrewsOut] = useState(0);
  const [screwsLocked, setScrewsLocked] = useState(0);
  const [dust, setDust] = useState(0);
  const [plugged, setPlugged] = useState<Record<string, string | null>>({});
  const [fuseState, setFuseState] = useState<"blown" | "out" | "in">("blown");
  const [snacksLeft, setSnacksLeft] = useState(0);
  const [tool, setTool] = useState<ToolKind>("hand");
  const [toolHelp, setToolHelp] = useState(false);
  const [say, setSay] = useState("");
  const [toast, setToast] = useState<{ text: string; tone: "good" | "bad" } | null>(null);
  const [open, setOpen] = useState<"chip" | "shop" | "menu" | "cert" | null>(null);
  const [paid, setPaid] = useState<ReturnType<typeof payout> | null>(null);
  const [gl] = useState(webglAvailable);
  const [pts, setPts] = useState<Points | null>(null);

  const host = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const scene = useRef<Workshop | null>(null);
  const live = useRef({ phase, job, slips, tool });
  live.current = { phase, job, slips, tool };
  const toolMisses = useRef({ count: 0, at: 0 });
  const doorsTried = useRef(new Set<string>());

  // Remote results reach a student on any device; they only change a ticket that has not started.
  useEffect(() => {
    if (teacher || preview) return;
    let active = true;
    loadRemote(studentKey).then((row) => {
      if (!active || !row) return;
      const fp = (row.codes?.finalProject ?? null) as { quizAnswered?: number; quizRight?: number; levels?: number[] } | null;
      const done = row.completed_bosses ?? [];
      const runs = done.reduce((t, id) => t + Math.max(1, row.attempts?.[id] ?? 1), 0);
      setEvidence((local) => ({
        quizRight: local.quizRight ?? (fp?.quizAnswered === 20 ? fp.quizRight ?? null : null),
        bosses: Math.max(local.bosses, done.length),
        bossRunsPerPass: local.bosses >= done.length ? local.bossRunsPerPass : done.length ? runs / done.length : 0,
        yardLevels: Math.max(local.yardLevels, fp?.levels?.length ?? 0),
      }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [teacher, preview, studentKey]);
  useEffect(() => {
    if (phase === "arrive" && demoState === "ready" && tierNow !== tier) setTicket((t) => ({ ...t, tier: tierNow, hide: !teacher && hidesProblem(shop, tierNow) }));
  }, [tierNow]);

  const flash = (text: string, tone: "good" | "bad" = "good", ms = 2000) => { setToast({ text, tone }); window.setTimeout(() => setToast((t) => t?.text === text ? null : t), ms); };
  const slip = (kind: keyof Slips) => setSlips((s) => ({ ...s, [kind]: s[kind] + 1 }));
  const named = job.tier === "guided" || job.tier === "supported";
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
    try { w = new Workshop(host.current); } catch { return; }
    scene.current = w;
    w.bubble = bubble.current;
    w.tag = tag.current;
    if (import.meta.env.DEV) (window as unknown as { __workshop?: Workshop }).__workshop = w;
    return () => { w.dispose(); scene.current = null; };
  }, [gl]);

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
          : drivers.includes(used) ? `Put the screwdriver down.${named ? ` This needs: ${toolInfo[need].short}.` : ""}`
          : `${toolInfo[used].joke}${named ? ` Try: ${toolInfo[need].short}.` : ""}`;
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
        if (result === "soft") { sfx.tick(); flash("Too soft! A little harder.", "bad"); }
        if (result === "good") { sfx.thud(); if (freed) sfx.pop(); flash(freed ? "It dropped!" : "Good tap! Again…"); }
        if (result === "hard") { sfx.crack(); slip("tools"); flash("CRACK! Too hard: the spiral bent. Gentle taps!", "bad", 2600); }
        setSnacksLeft(left);
      },
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
    setPhase("arrive"); setDemoState("ready"); setSlips(noSlips()); setScrewsOut(0); setScrewsLocked(0); setDust(0); setFuseState("blown"); setSnacksLeft(job.snacks.length);
    setPaid(null); setOpen(null); setTool("hand"); setToolHelp(false); setUnlockNote(null);
    toolMisses.current = { count: 0, at: 0 };
    doorsTried.current = new Set();
    setLooked(false);
    setPlugged(Object.fromEntries(job.cables.map((c) => [c.id, c.at])));
    if (job.practice) {
      // The tutorial: the shop is still shut. The tour starts when the shutter goes up.
      setPhase("tour"); setTourAt(-1); setLanded(!w); setSay("");
      if (!w) return;
      w.setJob(job);
      w.setWork(null);
      w.setScreen("attract");
      w.tour("wide");
      return;
    }
    setSay(job.demo === null ? (job.machine === "vending" ? "It eats money. That's all I know. You're the expert!" : job.machine === "claw" ? "It never gives prizes. That's all I know. You're the expert!" : "It's broken. I'm not explaining. You're the expert!")
      : job.machine === "vending" ? "This vending machine stole my money! Watch…" : job.machine === "claw" ? "My claw machine never grabs anything! Watch…" : "My arcade is broken! Watch this…");
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
  useEffect(() => { if (phase === "dust" && dust >= 0.95) { flash(job.mess === "crumbs" ? "No more crumbs!" : job.mess === "fluff" ? "Fluff-free!" : "Squeaky clean!"); window.setTimeout(() => advance("dust"), 500); } }, [phase, dust]);
  const wired = job.cables.filter((c) => plugged[c.id] === c.socket).length;
  useEffect(() => { if (phase === "wires" && wired === job.cables.length) { scene.current?.showHint(null); flash("Wiring OK!"); window.setTimeout(() => advance("wires"), 600); } }, [phase, wired, job]);
  useEffect(() => { if (phase === "fuse" && fuseState === "in") { flash("New fuse in!"); window.setTimeout(() => advance("fuse"), 500); } }, [phase, fuseState]);
  useEffect(() => { if (phase === "snack" && snacksLeft === 0) { flash(job.snacks.length > 1 ? "Both snacks freed!" : "Snack freed!"); window.setTimeout(() => advance("snack"), 700); } }, [phase, snacksLeft]);
  useEffect(() => {
    if (phase !== "lock" || screwsLocked < job.screws.length) return;
    flash("Locked tight!");
    if (!job.practice) { setPhase("power"); return; }
    // The practice box is done: a little party, then the first customer.
    setPhase("ready");
    sfx.power();
    window.setTimeout(() => { sfx.cash(); scene.current?.setScreen("game"); scene.current?.celebrate(); }, 700);
  }, [phase, screwsLocked, job]);

  // Gesture hints: in the tutorial, on the first ticket ever, and on every Guided machine.
  const hints = gl && (practice || job.tier === "guided" || shop.fixed === 0);
  useEffect(() => {
    if (!hints || !handsOn.includes(phase)) { setPts(null); return; }
    const id = window.setInterval(() => setPts(scene.current?.points() ?? null), 200);
    return () => window.clearInterval(id);
  }, [hints, phase]);

  const vending = job.machine === "vending";
  const claw = job.machine === "claw";
  const watch = () => {
    if (job.demo === null) return;
    const value = job.demo;
    setDemoState("running");
    setSay("");
    const finish = () => {
      const out = printed(job, brokenTest(job), value);
      scene.current?.setScreen(out ? "message" : "blank", out, vending || claw ? 0 : value, vending ? `${slotName(job.empty)} · stock = ${value}` : claw ? `seconds = ${value}` : "");
      scene.current?.setMood("angry");
      sfx.angry();
      const clue = job.tier === "guided"
        ? vending ? " And my other snack is stuck behind the glass!" : claw ? " And one claw finger looks bent!" : " And smoke is coming out of the back!"
        : vending ? " Also, something's stuck in there." : claw ? " And the claw looks weird…" : " And it smells like smoke…";
      setSay(claw ? `The timer hit 0 and it says “${out}”?! The claw never drops!${clue}` : vending ? `Slot ${slotName(job.empty)} is EMPTY! I paid ${job.price} coins and it says “${out}”?! Enjoy WHAT?${clue}`
        : out ? `${value} coins! A game costs ${job.price}! And it says “${out}”?!${clue}` : `I put in ${value} coins… and NOTHING happened!${clue}`);
      setDemoState("seen");
    };
    if (scene.current) scene.current.insertCoins(vending || claw ? job.price : value, finish); else finish();
  };
  const takeJob = () => { setSay(""); scene.current?.setMood("idle"); setPhase("find"); };
  const chipFixed = () => { setOpen(null); sfx.flash(); flash("Chip reprogrammed!"); setPhase("close"); };
  const powerOn = () => {
    const w = scene.current;
    sfx.power();
    const test = vending ? 0 : job.demo ?? job.price;
    const pay = () => {
      const money = payout(slips, job);
      window.setTimeout(() => {
        sfx.cash();
        setPaid(money);
        setPhase("paid");
        const next = teacher ? { ...shop, coins: shop.coins + money.total, fixed: shop.fixed + 1, made: { ...shop.made, [job.machine]: (shop.made[job.machine] ?? 0) + 1 } } : afterTicket(shop, slips, money.total, job.tier, job.machine);
        if (!teacher) setLevelNote(next.shift > shop.shift ? "Word is spreading: trickier machines are on their way."
          : next.shift < shop.shift ? "Next customers bring friendlier machines."
          : next.streak === 2 ? "Customers trust you now: they won't explain the problem anymore." : "");
        setUnlockNote(unlockedBy(shop.fixed, next.fixed));
        setShop(next);
      }, w ? 1600 : 0);
    };
    const happy = (line: string) => { w?.setMood("happy"); w?.celebrate(); setSay(line); pay(); };
    if (!w) { happy(""); return; }
    w.setMarquee(false);
    w.setScreen("off");
    window.setTimeout(() => { w.setMarquee(true); w.setScreen("attract"); }, 900);
    if (vending) {
      // The empty slot now says Sold out, and a full one sells.
      window.setTimeout(() => w.insertCoins(job.price, () => {
        w.setScreen("message", printed(job, rightTest(job), 0), 0, `${slotName(job.empty)} · stock = 0`);
        window.setTimeout(() => { w.setScreen("game", job.chip.yes, 0, "A1 · stock = 3"); happy(`“${job.chip.no}” for the empty slot, and the full one works! Thank you!`); }, 1400);
      }), 1700);
      return;
    }
    if (claw) {
      // At 0 the claw drops, grabs an egg and comes back up.
      window.setTimeout(() => w.insertCoins(job.price, () => { w.setScreen("game", job.chip.yes, 0, "seconds = 0"); w.clawDrop(); happy(`${job.chip.yes} The claw grabbed an egg! Thank you!`); }), 1700);
      return;
    }
    window.setTimeout(() => w.insertCoins(test, () => { w.setScreen("game", job.chip.yes, test); happy(`IT WORKS!! ${test} coins and the game starts!`); }), 1700);
  };
  /** The tutorial is over (or skipped): the shop opens and the first customer comes in. */
  const finishTutorial = () => {
    setShop({ ...shop, tutorial: true });
    setTutorial(false);
    setOpen(null);
    setTicket(ticketFor(tierNow, shop.fixed));
  };
  const replayTutorial = () => { setOpen(null); scene.current?.leave(); setSay(""); setTutorial(true); };
  const nextTour = () => {
    sfx.tick();
    if (tourAt < tourSteps.length - 1) { setTourAt(tourAt + 1); return; }
    setPhase("find");
  };
  const openShutter = () => { sfx.whoosh(); setTourAt(0); };
  const nextCustomer = () => { scene.current?.leave(); setSay(""); setLevelNote(""); window.setTimeout(() => newTicket(tierNow), scene.current ? 900 : 0); };

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
  const mission = missionFor(phase, job, { screwsOut, screwsLocked, dust, wired, fuseState, demoState, who, named, need: needTool, gl, freed, tool });
  const step = phase === "tour" && tourAt >= 0 ? tourSteps[tourAt] : null;
  const showSteps = phase !== "paid" && phase !== "tour" && phase !== "ready";
  const ticketTag = <div className="rp-ticket" aria-live="polite"><Wrench size={16} /><span>{practice ? <><small>BEFORE WE OPEN</small><b>Warm-up · Practice box</b></> : <><small>TICKET #{phase === "paid" ? shop.fixed : shop.fixed + 1}</small><b>{who} · {machineInfo[job.machine].model}</b></>}</span></div>;

  return <div className={`rp rp-phase-${phase}`}>
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
      {teacher && <TeacherBar tier={tier} machine={teacherMachine} onTier={(t) => { setTeacherTier(t); setTutorial(false); newTicket(t); }} onMachine={(m) => { setTeacherMachine(m); setTutorial(false); newTicket(tierNow, m); }} onSkip={skip} canSkip={phase !== "paid" && !open} />}
      <button className={`rp-coins ${step?.highlight === "coins" ? "is-spot" : ""}`} aria-label={`${shop.coins} coins. Open the shop`} onClick={() => setOpen("shop")}><Coins size={18} /> {shop.coins} <ShoppingCart size={16} /></button>
      <button className={`rp-menu ${step?.highlight === "menu" ? "is-spot" : ""}`} aria-label="Your machines" onClick={() => setOpen("menu")}><ListChecks size={22} /></button>
    </div>

    {/* Landscape: the steps run down a thin ruler on the left, clear of the machine. Portrait keeps them in the card. */}
    {showSteps && <ol className="rp-ruler" aria-label="Repair steps">{order.map((s) => { const Icon = stepIcons[s]; const st = stepState(s, phase, order); return <li key={s} className={st}><span>{st === "is-done" ? <Check size={15} strokeWidth={3} /> : <Icon size={15} strokeWidth={2.4} />}</span><small>{stepLabel[s]}</small></li>; })}</ol>}

    {showSteps && <section className="rp-mission" aria-live="polite">
      <ol className="rp-steps" aria-label="Repair steps">{order.map((s) => <li key={s} className={stepState(s, phase, order)}>{stepLabel[s]}</li>)}</ol>
      <h2>{mission.title}</h2>
      <p>{mission.text}</p>
      {mission.meter !== undefined && <div className="rp-meter"><i style={{ width: `${Math.round(mission.meter * 100)}%` }} /></div>}
      {phase === "snack" && gl && <div className="rp-hammer" aria-hidden="true" ref={(el) => { if (scene.current) scene.current.hammerMeter = el; }} style={{ "--soft": HAMMER.soft, "--hard": HAMMER.hard } as CSSProperties}>
        <span>SOFT</span><span>JUST RIGHT</span><span>TOO HARD</span><b />
      </div>}
    </section>}

    {handsOn.includes(phase) && <Toolbox kinds={job.toolbox} tool={tool} glow={glowTool} onPick={(t) => { setTool(t); sfx.tick(); }} />}

    <div className="rp-belt">
      {phase === "find" && !gl && job.doors.map((d) => <button key={d.id} className="rp-tool" onClick={() => tryDoor(d.id, d.right)}><DoorOpen size={17} /> {d.name}</button>)}
      {phase === "arrive" && job.demo !== null && demoState !== "seen" && <button className="rp-go" disabled={demoState === "running"} onClick={watch}><Play size={18} fill="currentColor" /> {demoState === "running" ? "WATCHING…" : "SHOW ME"}</button>}
      {phase === "arrive" && (job.demo === null || demoState === "seen") && <button className="rp-go" onClick={takeJob}><Wrench size={18} /> TAKE THE JOB</button>}
      {phase === "power" && <button className="rp-go is-power" onClick={powerOn}><Zap size={18} /> POWER ON</button>}
      {!gl && !teacher && handsOn.includes(phase) && phase !== "chip" && phase !== "find" && <button className="rp-go" onClick={skip}>DO IT <ArrowRight size={18} /></button>}
      {!gl && phase === "chip" && <button className="rp-go" onClick={() => setOpen("chip")}><Cpu size={18} /> OPEN THE CHIP</button>}
    </div>

    {toast && <div className={`rp-toast is-${toast.tone}`} role="status">{toast.text}</div>}

    {phase === "paid" && paid && <div className="rp-modal"><section className="rp-card rp-paid" aria-label="Paid">
      <span className="rp-stamp">FIXED!</span>
      <h2>{who} pays up</h2>
      <ul>
        <li><span>Repair fee</span><b>+{paid.base}</b></li>
        {paid.tips.map((t) => <li key={t.label}><span>{t.label}</span><b>+{t.coins}</b></li>)}
      </ul>
      <p className="rp-total"><Coins size={22} /> +{paid.total} <small>· you have {shop.coins}</small></p>
      {unlockNote && <p className="rp-unlock"><Sparkles size={18} /> New machine unlocked: <b>{machineInfo[unlockNote].name}</b>! Customers start bringing it now.</p>}
      {levelNote && <p className="rp-level">{levelNote}</p>}
      <div className="rp-actions">
        <button className="rp-tool" onClick={() => setOpen("shop")}><Store size={17} /> Shop</button>
        <button className="rp-go" autoFocus onClick={nextCustomer}>NEXT CUSTOMER <ArrowRight size={18} /></button>
      </div>
    </section></div>}

    {open === "chip" && <div className="rp-modal"><ChipBench job={job} onSlip={() => slip("chip")} onHelp={() => setSlips((s) => ({ ...s, help: s.help + 1 }))} onClose={() => setOpen(null)} onDone={chipFixed} /></div>}
    {open === "shop" && <div className="rp-modal"><Catalog shop={shop} onAction={shopAction} onClose={() => setOpen(null)} /></div>}

    {open === "menu" && <div className="rp-modal"><MachineMenu shop={shop} teacher={teacher} onClose={() => setOpen(null)} onTutorial={replayTutorial} onCertificate={() => setOpen("cert")} /></div>}
    {open === "cert" && <Certificate name={name} login={studentKey} onClose={() => setOpen(null)} />}

    {/* The tutorial: the shutter goes up, a tour of the shop, then the practice box. */}
    {phase === "tour" && <div className={`rp-shutter ${tourAt >= 0 ? "is-up" : ""}`} aria-hidden={tourAt >= 0 ? "true" : undefined}>
      <div className="rp-slats" />
      <span className="rp-sign">{tourAt >= 0 ? "OPEN" : "CLOSED"}</span>
      {tourAt < 0 && <section className="rp-card rp-welcome" aria-label="Welcome to the repair shop">
        <span className="rp-stamp">GOOD MORNING!</span>
        <h2>Your repair shop, {name.split(" ")[0]}</h2>
        <p>Customers bring broken machines. You open them up, fix them… and get paid. Let's get the shop ready!</p>
        <div className="rp-actions">
          {shop.fixed > 0 && <button className="rp-tool" onClick={finishTutorial}>Skip the warm-up</button>}
          <button className="rp-go" autoFocus onClick={openShutter}><Sparkles size={18} /> OPEN UP!</button>
        </div>
      </section>}
    </div>}
    {step && <section className="rp-card rp-coach" aria-live="polite" key={tourAt}>
      <ol className="rp-dots" aria-label={`Step ${tourAt + 1} of ${tourSteps.length}`}>{tourSteps.map((_, i) => <li key={i} className={i < tourAt ? "is-done" : i === tourAt ? "is-now" : ""} />)}</ol>
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
      <p>Your first customer is at the door…</p>
      <div className="rp-actions"><button className="rp-go" autoFocus onClick={finishTutorial}><Store size={18} /> OPEN THE SHOP</button></div>
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
    // The right door in view: tap it. Otherwise: drag to look around.
    // Dragging has its own hint; this one points at the right door once it is in view.
    const right = pts.doors.find((d) => d.right);
    if (right?.facing) hint = at(right, "tap", job.practice ? "TAP THE PANEL" : "TAP THIS DOOR");
  }
  // The practice box shows the twist on every screw; a real machine only on the first one.
  if (phase === "screws" && (job.practice || pts.screws.every((x) => !x.out))) { const s = pts.screws.find((x) => !x.out); if (s) hint = at(s, "twist-ccw", "TWIST ↺"); }
  if (phase === "lock" && (job.practice || pts.screws.every((x) => !x.locked))) { const s = pts.screws.find((x) => !x.locked); if (s) hint = at(s, "twist-cw", "TWIST ↻"); }
  if (phase === "panel" || phase === "close") hint = at(pts.panel, "tap", "TAP");
  if (phase === "chip") hint = at(pts.chip, "tap", "TAP");
  if (phase === "fuse" && pts.fuse) hint = at(fuseState === "blown" ? pts.fuse.blown : pts.fuse.spare, "tap", "TAP");
  if (phase === "snack") { const s = pts.snacks.find((x) => !x.done); if (s) hint = at(s, "hold", "HOLD… LET GO"); }
  if (phase === "claw" && pts.claw) hint = at(pts.claw, "tap", "TAP");
  if (phase === "dust" && dust < 0.12 + (1 - job.dust)) {
    const left = Math.min(pts.boardA.x, pts.boardB.x), top = Math.min(pts.boardA.y, pts.boardB.y);
    hint = at({ x: left, y: top }, "rub", "SWEEP", { width: Math.abs(pts.boardA.x - pts.boardB.x), height: Math.abs(pts.boardA.y - pts.boardB.y) * 0.6 });
  }
  if (phase === "wires") {
    // Until the first cable is in place: a loose one, dragged to the ring of its colour.
    const done = job.cables.filter((c) => pts.plugs.find((p) => p.id === c.id)?.at === c.socket && c.at !== c.socket).length;
    const cable = job.cables.find((c) => pts.plugs.find((p) => p.id === c.id)?.at !== c.socket);
    const plug = cable && pts.plugs.find((p) => p.id === cable.id);
    const socket = cable && pts.sockets.find((s) => s.id === cable.socket);
    if (!done && plug && socket) hint = at(plug, "drag", "DRAG", { "--dx": `${socket.x - plug.x}px`, "--dy": `${socket.y - plug.y}px` } as CSSProperties);
  }
  return <div className="rp-gestures" aria-hidden="true">{hint}</div>;
}

function TeacherBar({ tier, machine, onTier, onMachine, onSkip, canSkip }: { tier: Tier; machine: MachineId | "auto"; onTier: (t: Tier) => void; onMachine: (m: MachineId | "auto") => void; onSkip: () => void; canSkip: boolean }) {
  return <div className="rp-teacher" role="group" aria-label="Teacher: difficulty">
    <small>TEACHER</small>
    {tiers.map((t) => <button key={t} className={t === tier ? "is-on" : ""} aria-pressed={t === tier} onClick={() => onTier(t)}>{tierNames[t]}</button>)}
    <select aria-label="Teacher: machine" value={machine} onChange={(e) => onMachine(e.target.value as MachineId | "auto")}>
      <option value="auto">Next machine</option>
      {allMachines.map((m) => <option key={m} value={m}>{machineInfo[m].name}</option>)}
    </select>
    <button className="rp-skip" disabled={!canSkip} onClick={onSkip} aria-label="Skip this step"><SkipForward size={15} /> SKIP</button>
  </div>;
}

const ScrewIcon = ({ size = 15 }: { size?: number; strokeWidth?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" /></svg>;
const stepIcons: Record<string, (p: { size?: number; strokeWidth?: number }) => ReactNode> = {
  find: DoorOpen, screws: ScrewIcon, panel: PackageOpen, dust: Wind, wires: Cable, fuse: Zap, snack: Hammer, claw: Scissors, chip: Cpu, close: PackageOpen, lock: Lock, power: Power,
};
const stepLabel: Record<string, string> = { find: "Door", screws: "Screws", panel: "Open", dust: "Blow", wires: "Wires", fuse: "Fuse", snack: "Snack", claw: "Claw", chip: "Chip", close: "Close", lock: "Lock", power: "Power" };
/** Every machine: find the door, screws, open, blow, then its own faults, the chip, and close up. */
const stepsFor = (job: Job): string[] => job.practice ? ["find", "screws", "panel", "dust", "close", "lock"] : ["find", "screws", "panel", "dust", ...job.faults, "chip", "close", "lock", "power"];
function stepState(step: string, phase: Phase, order: string[]) {
  const at = phase === "arrive" || phase === "tour" ? -1 : phase === "paid" || phase === "ready" ? order.length : order.indexOf(phase);
  const i = order.indexOf(step);
  return i < at ? "is-done" : i === at ? "is-now" : "";
}

type MissionState = { screwsOut: number; screwsLocked: number; dust: number; wired: number; fuseState: string; demoState: string; who: string; named: boolean; need: ToolKind | null; gl: boolean; freed: number; tool: ToolKind };
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
function missionFor(phase: Phase, job: Job, s: MissionState): { title: string; text: string; meter?: number } {
  if (job.practice) { const m = practiceMission(phase, job, s); if (m) return m; }
  const use = (t: ToolKind | null) => !t || !s.named ? "" : t === "hand" ? " Use your hand." : ` Use the ${toolInfo[t].name.toLowerCase()}.`;
  const mixed = new Set(job.screws).size > 1;
  const vending = job.machine === "vending", claw = job.machine === "claw";
  const thing = vending || claw ? "glass" : "panel";
  switch (phase) {
    case "arrive": return job.demo === null ? { title: "A new customer", text: `${s.who} won't show you the problem. You'll find it.` } : s.demoState === "seen" ? { title: "You saw it", text: "Something's wrong inside. Take the job!" } : { title: "A new customer", text: `${s.who} wants to show you the problem.` };
    case "find": return { title: "Find the right door", text: !s.gl ? `${clueText[job.machine]} Which door do you open?`
      : job.tier === "guided" ? `Drag to look around. ${vending ? "Something is stuck behind one door" : claw ? "The claw twitches behind one door" : "Sparks fly out of one side"}: tap that door.${use("hand")}`
      : "Drag to look around the machine. Find the clue, then tap the door that leads to the fault." };
    case "screws": return { title: `Unscrew the ${thing} · ${s.screwsOut}/${job.screws.length}`, text: `${mixed ? "Look at each screw head and match the screwdriver. " : ""}Twist ↺ counter-clockwise: lefty loosey!${mixed ? "" : use(s.need)}`, meter: s.screwsOut / job.screws.length };
    case "panel": return vending || claw ? { title: "Lift the glass off", text: `Tap the front glass.${use("hand")}` } : { title: "Pull the panel off", text: `Tap the back panel.${use("hand")}` };
    case "dust": return { title: job.mess === "crumbs" ? "Blow the crumbs away" : job.mess === "fluff" ? "Blow the fluff away" : "Blow the dust away", text: `Sweep every corner.${use("blower")}`, meter: Math.min(1, s.dust / 0.95) };
    case "wires": return { title: `Plug in the cables · ${s.wired}/${job.cables.length}`, text: "Drag each loose cable to the ring of its colour." + use("hand"), meter: s.wired / job.cables.length };
    case "fuse": return { title: "Swap the burnt fuse", text: (s.fuseState === "blown" ? "Pull out the burnt fuse." : "Now put the new fuse in.") + use("pliers") };
    case "snack": return { title: `Free the stuck snack${job.snacks.length > 1 ? "s" : ""} · ${s.freed}/${job.snacks.length}`, text: `Hold on the snack to wind up the hammer, then let go. Gentle taps!${use("hammer")}` };
    case "claw": return { title: "Fix the bent claw finger", text: `One finger points the wrong way, so the claw can't grab. Straighten it.${use("pliers")}` };
    case "chip": return { title: "Reprogram the logic chip", text: `Tap the glowing LOGIC chip${vending ? ", bottom left" : claw ? ", on the floor by the eggs" : ""}.${use("hand")}` };
    case "close": return { title: vending || claw ? "Put the glass back" : "Put the panel back", text: `Tap the ${thing} leaning on the side.${use("hand")}` };
    case "lock": return { title: `Lock the screws · ${s.screwsLocked}/${job.screws.length}`, text: `Twist ↻ clockwise: righty tighty!${mixed ? " Match each head again." : use(s.need)}`, meter: s.screwsLocked / job.screws.length };
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

/* ---------- The menu: the machines fixed so far and the ones to come ---------- */

const machineIcons: Record<string, typeof Wrench> = { arcade: Gamepad, vending: Candy, jukebox: Music, crosswalk: Lamp, claw: Hand, coffee: Coffee, robot: Bot };
function MachineMenu({ shop, teacher, onClose, onTutorial, onCertificate }: { shop: Shop; teacher: boolean; onClose: () => void; onTutorial: () => void; onCertificate: () => void }) {
  const built = machineOrder as readonly string[];
  // The first machine not unlocked yet, among the ones already built.
  const nextIndex = roadmap.findIndex((m, i) => built.includes(m.id) && shop.fixed < i * UNLOCK_EVERY);
  return <section className="rp-card rp-machines" aria-label="Your machines">
    <header><h2><ListChecks size={22} /> Your machines</h2><button className="rp-x" aria-label="Close" onClick={onClose}><X size={18} /></button></header>
    <p className="rp-machines-sum"><b>{shop.fixed}</b> {shop.fixed === 1 ? "repair" : "repairs"} so far · a new machine every {UNLOCK_EVERY} repairs</p>
    <ol>{roadmap.map((m, i) => {
      const Icon = machineIcons[m.id] ?? Wrench;
      const isBuilt = built.includes(m.id), open = isBuilt && shop.fixed >= i * UNLOCK_EVERY;
      const made = shop.made[m.id as MachineId] ?? 0;
      const left = i * UNLOCK_EVERY - shop.fixed;
      const state = open ? (made ? "done" : "open") : i === nextIndex ? "next" : "soon";
      return <li key={m.id} className={`is-${state}`}>
        <span className="rp-machine-icon">{state === "soon" ? <Lock size={20} /> : <Icon size={22} />}</span>
        <span className="rp-machine-text">
          <b>{i + 1}. {m.name}{m.boss && <em>BOSS</em>}</b>
          <small>{state === "done" ? `Fixed ${made} ${made === 1 ? "time" : "times"}` : state === "open" ? "In your shop now: customers are bringing it" : state === "next" ? `Unlocks after ${left} more ${left === 1 ? "repair" : "repairs"}` : "Coming soon"}</small>
          {state === "next" && <span className="rp-meter"><i style={{ width: `${Math.round(((UNLOCK_EVERY - left) / UNLOCK_EVERY) * 100)}%` }} /></span>}
        </span>
        {state === "done" && <span className="rp-badge"><Check size={14} /> FIXED</span>}
        {state === "open" && <span className="rp-badge is-new">NEW</span>}
      </li>;
    })}
      <li className="is-soon rp-cert-row">
        <span className="rp-machine-icon"><Award size={22} /></span>
        <span className="rp-machine-text"><b>The Maker Family certificate</b><small>After the Robot: the very last repair</small></span>
      </li>
    </ol>
    <div className="rp-actions">
      {teacher && <button className="rp-tool" onClick={onCertificate}><Award size={16} /> Preview the certificate</button>}
      <button className="rp-tool" onClick={onTutorial}><RotateCcw size={16} /> Play the warm-up again</button>
    </div>
  </section>;
}

/* ---------- The logic chip: the C# side quest ---------- */

const letter = (i: number) => String.fromCharCode(65 + i);
/** What a bench row shows. */
const said = (text: string) => text ? `“${text}”` : "nothing";

function ChipBench({ job, onSlip, onHelp, onClose, onDone }: { job: Job; onSlip: () => void; onHelp: () => void; onClose: () => void; onDone: () => void }) {
  const chip = job.chip, v = chip.variable, n = chip.right.n;
  const [step, setStep] = useState<"predict" | "fix" | "flash">(chip.mode === "predict-pick" ? "predict" : "fix");
  const [mode, setMode] = useState<"pick" | "tokens" | "typed">(chip.mode === "predict-pick" ? "pick" : chip.mode === "tokens" ? "tokens" : "typed");
  const [built, setBuilt] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState<{ text: string; tone: "good" | "bad" | "info" } | null>(null);
  const [rows, setRows] = useState<BenchRow[] | null>(null);
  const [shown, setShown] = useState(0);
  const [progress, setProgress] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const helpGiven = useRef(false);
  // The parent re-renders often; the flash timer must not restart each time.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const hasHelp = job.tier === "guided" || job.tier === "supported";

  const miss = (text: string) => { sfx.wrong(); onSlip(); setMisses((m) => m + 1); setNote({ text, tone: "bad" }); };
  const trimmedTray = mode === "tokens" && misses >= 2;
  const tray = trimmedTray ? chip.trimmed : chip.tray;
  useEffect(() => { if (trimmedTray && !helpGiven.current) { helpGiven.current = true; onHelp(); setNote({ text: "Fewer pieces now: only the ones you need are left.", tone: "info" }); } }, [trimmedTray, onHelp]);

  const condition = mode === "pick" ? (built[0] ? `${v} ${built[0]} ${n}` : "") : mode === "tokens" ? built.join(" ") : typed;
  const runBench = () => {
    const parsed = parseCondition(condition, v);
    if (!parsed.ok) { miss(parsed.error); return; }
    const result = bench(job, parsed.test);
    setRows(result); setShown(0); setNote(null);
    result.forEach((_, i) => window.setTimeout(() => { setShown(i + 1); if (result[i].ok) sfx.tick(); else sfx.wrong(); }, 160 * (i + 1)));
    window.setTimeout(() => {
      const bad = result.find((r) => !r.ok);
      if (!bad) { sfx.good(); setNote({ text: `All ${result.length} tests pass!`, tone: "good" }); setStep("flash"); return; }
      onSlip(); setMisses((m) => m + 1);
      setNote({ text: `With ${v} = ${bad.value} it should show ${said(bad.expected)}, but it shows ${said(bad.got)}.`, tone: "bad" });
    }, 160 * (result.length + 1));
  };

  useEffect(() => {
    if (step !== "flash") return;
    const id = window.setInterval(() => setProgress((p) => { if (p >= 1) { window.clearInterval(id); return 1; } return p + 0.05; }), 40);
    const done = window.setTimeout(() => doneRef.current(), 1500);
    return () => { window.clearInterval(id); window.clearTimeout(done); };
  }, [step]);

  const sticker = <div className="rp-sticker" aria-label={`Sticker on the machine: ${chip.sticker.join(" ")}`}><small>ON THE MACHINE</small><b>{chip.sticker[0]}</b><b>{chip.sticker[1]}</b></div>;
  const code = chipCode(job);
  if (step === "predict") {
    // Guided machines first ask for a prediction, in the same window as the Switchyard quiz.
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
      <span className="rp-typed"><code className="rp-typed-hl" aria-hidden="true"><Cs code={typed || " "} /></code>
        <input value={typed} autoFocus spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Condition" placeholder="type the condition" onChange={(e) => { setTyped(e.target.value); setRows(null); }} onKeyDown={(e) => { if (e.key === "Enter") runBench(); }} /></span>
      <code className="sy-code-text"><Cs code=")" /></code></>;
  const editor = <div className="sy rp-sy"><div className="sy-editor">{code.map((line, i) => {
    const indent = line.startsWith("    ");
    const content = i === 1 ? line2 : <code className={`sy-code-text ${/^[{}]$/.test(line.trim()) ? "is-brace" : ""}`}><Cs code={line.trim()} /></code>;
    return <div key={i} className={`sy-row ${i === 1 ? "is-now" : ""}`}><span className="sy-ln">{i + 1}</span>{indent ? <div className="sy-indent">{content}</div> : content}</div>;
  })}</div>
    {step === "fix" && (mode === "pick" || mode === "tokens") && <div className="sy-tools rp-pieces">
      <small>{mode === "pick" ? chip.pickHint : "Code pieces · tap to place"}</small>
      <div className="sy-bank">{(mode === "pick" ? chip.pick : tray).map((t) => <button key={t} aria-label={t} aria-pressed={mode === "pick" && built[0] === t} disabled={mode === "tokens" && built.length >= 5} onClick={() => { setBuilt(mode === "pick" ? [t] : [...built, t]); setRows(null); sfx.tick(); }}><code><Cs code={t} /></code></button>)}</div>
    </div>}
  </div>;

  return <section className="rp-card rp-chipbench" aria-label="Logic chip">
    <header><h2><Cpu size={22} /> Logic chip</h2><div><button className="rp-x" aria-label="Close" onClick={onClose}><X size={18} /></button></div></header>
    <div className="rp-chip-top">{sticker}{hasHelp && <p className="rp-rule">{chip.rule}</p>}</div>
    {editor}

    {step === "fix" && <div className="rp-q">
      {mode === "typed" && misses >= 2 && <button className="rp-tool" onClick={() => { setMode("tokens"); setBuilt([]); onHelp(); setNote({ text: "Here are the code pieces.", tone: "info" }); }}><Sparkles size={15} /> Use code pieces</button>}
      <button className="rp-go" disabled={!condition.trim()} onClick={runBench}><Play size={17} fill="currentColor" /> TEST ON THE BENCH</button>
    </div>}

    {/* The message comes before the bench rows, so it shows without scrolling on a short screen. */}
    {note && <p className={`rp-note is-${note.tone}`} role="status">{note.text}</p>}
    {step === "flash" && <div className="rp-flash"><span>WRITING THE CHIP…</span><div className="rp-meter"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div></div>}
    {rows && <ol className="rp-bench" aria-label="Test bench">{rows.slice(0, shown).map((r) => <li key={r.value} className={r.ok ? "is-ok" : "is-bad"}><span>{v} = {r.value}</span><span>{said(r.got)}</span>{r.ok ? <Check size={15} /> : <X size={15} />}</li>)}</ol>}
  </section>;
}
