import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Blocks, Check, Clock3, Code2, Lock, Split, Star, TrainFront, X } from "lucide-react";
import type { Input } from "../content";
import { ifLine, levelCount, levels, mysteryEnd, printLine, stages } from "./levels";
import { buildYard, route } from "./yard";
import { TrackDiagram, type TrainState } from "./TrackDiagram";
import { WorldArt } from "./WorldArt";
import { Cs } from "./Cs";
import { Fx, playFx } from "./Fx";

/*
 * The how-to-play tour: six short scenes in the explainer video's style. The middle scenes run the
 * real track with level 1's program, so the train, the test box and the cards are the ones the game uses.
 */
type Side = "true" | "false";
const cinema = levels[0];
const yard = buildYard(["decl", ifLine(cinema.condition), printLine(cinema.yes), "else", printLine(cinema.no)]);
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Beat { train: TrainState | null; readout: string[]; lever: Side | null; arrived: Side | null; line: number }
const still: Beat = { train: null, readout: [], lever: null, arrived: null, line: -1 };

// One train on a loop. full: it reads the test and rolls to its card; otherwise it only pulls up to the switch.
function useDemo(value: Input, full: boolean, slow: boolean) {
  const [beat, setBeat] = useState<Beat>(still);
  useEffect(() => {
    const where = route(yard, cinema.variable, value);
    const side = where.side as Side;
    const pace = slow ? 1 : .25;
    const timers: number[] = [];
    let lap = 0;
    const at = (ms: number, run: () => void) => timers.push(window.setTimeout(run, ms * pace));
    const play = () => {
      lap += 1;
      const base = { key: `tour-${String(value)}-${lap}`, value, route: where };
      setBeat({ train: { ...base, leg: "enter" }, readout: [], lever: null, arrived: null, line: 0 });
      at(1000, () => setBeat({ train: { ...base, leg: "decide" }, readout: full ? [where.steps[0]] : [], lever: null, arrived: null, line: full ? 1 : 0 }));
      if (!full) { at(3400, play); return; }
      at(1800, () => setBeat((b) => ({ ...b, readout: where.steps.slice(0, 2) })));
      at(2600, () => setBeat((b) => ({ ...b, readout: where.steps, lever: side })));
      at(3200, () => setBeat((b) => ({ ...b, train: { ...base, leg: "depart" }, line: side === "true" ? 2 : 4 })));
      at(4200, () => setBeat((b) => ({ ...b, train: { ...base, leg: "done" }, arrived: side })));
      at(6800, play);
    };
    play();
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [value, full, slow]);
  return beat;
}

function Demo({ value, full, slow, note }: { value: Input; full: boolean; slow: boolean; note: ReactNode }) {
  const beat = useDemo(value, full, slow);
  const side = beat.lever;
  const rows = [`int ${cinema.variable} = ${String(value)};`, ifLine(cinema.condition), `    ${printLine(cinema.yes)}`, "else", `    ${printLine(cinema.no)}`];
  const state = (n: number) => n === beat.line ? "is-now"
    : side && (side === "true" ? n >= 3 : n === 2) ? "is-skip"
      : n < beat.line || (n === 3 && beat.line === 4) ? "is-run" : "";
  const printed = beat.arrived ? beat.arrived === "true" ? cinema.yes : cinema.no : null;
  return <div className="sy-tour-demo">
    <div className="sy-tour-code">
      <div className="sy-tour-code-bar"><span className="sy-cs">C#</span><small>Cinema.cs</small></div>
      <ol>{rows.map((row, n) => <li key={n} className={state(n)}><span className="sy-ln">{n + 1}</span><code><Cs code={row} /></code></li>)}</ol>
      <p className={`sy-output ${beat.arrived ? `is-${beat.arrived}` : ""}`}><span>Output</span><b>{printed ?? ""}</b><i aria-hidden="true" /></p>
    </div>
    <div className="sy-tour-track">
      <TrackDiagram yard={yard} train={beat.train} lever={beat.lever} readout={beat.readout} arrived={beat.arrived} duration={slow ? 900 : 200} />
      <div className="sy-tour-world"><WorldArt level={cinema} value={value} printed={printed} /></div>
      <p className="sy-tour-note">{note}</p>
    </div>
  </div>;
}

// A little train that keeps crossing the welcome screen.
function Crossing() {
  return <svg className="sy-tour-crossing" viewBox="0 0 600 70" aria-hidden="true">
    <path className="sy-tour-rail" d="M0 52H600" />
    {Array.from({ length: 21 }, (_, i) => <rect key={i} x={i * 30 + 4} y={47} width={14} height={10} rx={2} className="sy-tour-sleeper" />)}
    <g className="sy-tour-run">
      <g transform="translate(0 40)">
        <rect x={-26} y={-15} width={44} height={22} rx={6} className="sy-train-body" />
        <rect x={-20} y={-10} width={12} height={9} rx={2} className="sy-train-window" />
        <rect x={-4} y={-10} width={12} height={9} rx={2} className="sy-train-window" />
        <path d="M18 -12 L28 -4 L28 7 L18 7 Z" className="sy-train-nose" />
        <circle cx={-15} cy={9} r={4.5} className="sy-train-wheel" /><circle cx={9} cy={9} r={4.5} className="sy-train-wheel" />
        <g className="sy-token" transform="translate(0 -30)"><circle r={15} /><text y={6} textAnchor="middle">9</text></g>
      </g>
    </g>
  </svg>;
}

const scenes: { tag: string; title: string; lead: ReactNode }[] = [
  { tag: "WELCOME", title: "SWITCHYARD", lead: <>Your code is a railway. You run the yard: every value rides a train, and your <b className="cs-kw">if</b> decides where it goes.</> },
  { tag: "STEP 1 · THE TRAIN", title: "Every train carries a value", lead: <>Line 1 makes the value. Here it is <code><Cs code="int age = 9;" /></code>, so the train carries <b>9</b> up to the switch.</> },
  { tag: "STEP 2 · THE SWITCH", title: "true takes the IF track", lead: <>The switch puts the value into the test: <code><Cs code="9 <= 12" /></code> is <b className="is-true">true</b>. The train rolls up to the IF card and that line runs.</> },
  { tag: "STEP 3 · THE OTHER WAY", title: "false takes the ELSE track", lead: <>Now age is 30: <code><Cs code="30 <= 12" /></code> is <b className="is-false">false</b>. The train goes down the else track, and the IF line is skipped.</> },
  { tag: "HOW TO PLAY", title: "Build, predict, test", lead: <>Every level follows the same three moves.</> },
  { tag: "YOUR ROUTE", title: "Ten levels, one line", lead: <>Each level opens when you ship the one before it. Fewer runs earn more stars.</> },
];

function Moves() {
  return <ol className="sy-tour-moves">
    <li style={{ "--i": 0 } as CSSProperties}>
      <span className="sy-tour-move-n">1</span>
      <h3><Blocks size={18} /> BUILD</h3>
      <div className="sy-tour-mini sy-tour-mini--build" aria-hidden="true">
        {["int age = 9;", "if (age <= 12)", "else"].map((line, i) => <code key={line} style={{ "--k": i } as CSSProperties}><Cs code={line} /></code>)}
      </div>
      <p>Tap code blocks into the lines. The track draws itself as you build.</p>
    </li>
    <li style={{ "--i": 1 } as CSSProperties}>
      <span className="sy-tour-move-n">2</span>
      <h3><Split size={18} /> PREDICT</h3>
      <div className="sy-tour-mini sy-tour-mini--predict" aria-hidden="true"><b className="is-true">▲ TRUE</b><b className="is-false">▼ ELSE</b></div>
      <p>Before the run, call which track the next train will take.</p>
    </li>
    <li style={{ "--i": 2 } as CSSProperties}>
      <span className="sy-tour-move-n">3</span>
      <h3><Clock3 size={18} /> TEST</h3>
      <div className="sy-tour-mini sy-tour-mini--test" aria-hidden="true">{["11", "12", "13"].map((n, i) => <span key={n} style={{ "--k": i } as CSSProperties}><b>{n}</b><i>OK</i></span>)}</div>
      <p>Three test trains run. All right and the level ships, with up to <Star size={13} className="is-on" /><Star size={13} className="is-on" /><Star size={13} className="is-on" />.</p>
    </li>
  </ol>;
}

function Route() {
  return <div className="sy-tour-route">
    {/* The Mystery line is only a rumour here: three sealed stops after level 10. */}
    {/* The Blaster line is not even a rumour: it stays out of the tour. */}
    <ol>{levels.slice(0, mysteryEnd).map((level, i) => {
      const secret = i >= levelCount;
      return <li key={level.id} className={`${i === 0 ? "is-now" : ""} ${secret ? "is-mystery" : ""}`} style={{ "--i": i } as CSSProperties}>
        <b>{i === 0 ? 1 : secret ? "?" : <Lock size={12} />}</b>
        <small>{secret ? "???" : level.title}</small>
      </li>;
    })}</ol>
    <div className="sy-tour-stages">{stages.slice(0, 5).map((stage, s) => <span key={stage.name} style={{ "--n": levels.filter((level) => level.stage === s).length } as CSSProperties}>{stage.short} · {stage.name}</span>)}</div>
    <p className="sy-tour-note"><TrainFront size={16} /> Level 1 is open. Ship it to unlock level 2. And after level 10… something is sealed.</p>
  </div>;
}

export function SwitchyardIntro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [slow] = useState(() => !reducedMotion());
  const next = useRef<HTMLButtonElement>(null);
  const last = step === scenes.length - 1;
  const finish = () => { playFx("win"); onDone(); };
  const go = (to: number) => setStep(Math.max(0, Math.min(scenes.length - 1, to)));
  useEffect(() => { next.current?.focus(); }, [step]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setStep((s) => Math.min(scenes.length - 1, s + 1));
      else if (event.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
      else if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onDone]);
  const scene = scenes[step];
  return <div className="sy-tour" role="dialog" aria-modal="true" aria-label="How the Switchyard works">
    <div className="sy-tour-card">
      <header className="sy-tour-top">
        <span className="sy-cs">C#</span>
        <small><Code2 size={14} /> HOW TO PLAY · {step + 1} / {scenes.length}</small>
        <button className="sy-tour-skip" onClick={onDone}>SKIP <X size={14} /></button>
      </header>

      {step === 0 && <Fx fx={{ id: 1, kind: "win", text: "" }} scope="inline" />}
      <div className={`sy-tour-scene is-scene-${step}`} key={step}>
        <div className="sy-tour-head">
          <small className="sy-tour-tag">{scene.tag}</small>
          <h2 className={`sy-label ${step === 0 ? "sy-label--big" : ""}`}>{scene.title}</h2>
          <p className="sy-tour-lead">{scene.lead}</p>
        </div>
        {step === 0 && <div className="sy-tour-hero">
          <Crossing />
          <ul className="sy-tour-chips">
            <li style={{ "--i": 0 } as CSSProperties}><Code2 size={18} /> Code lays the track</li>
            <li style={{ "--i": 1 } as CSSProperties}><TrainFront size={18} /> Values ride the trains</li>
            <li style={{ "--i": 2 } as CSSProperties}><Check size={18} strokeWidth={3} /> Tests prove the rule</li>
          </ul>
        </div>}
        {step === 1 && <Demo value={9} full={false} slow={slow} note={<>The box on the post is the test: <code><Cs code="age <= 12" /></code></>} />}
        {step === 2 && <Demo value={9} full slow={slow} note={<>Watch the box: the test, the test with 9 in it, then <b className="is-true">true</b>.</>} />}
        {step === 3 && <Demo value={30} full slow={slow} note={<>One train, one track. An if / else always runs exactly one of its two lines.</>} />}
        {step === 4 && <Moves />}
        {step === 5 && <Route />}
      </div>

      <footer className="sy-tour-nav">
        <button className="sy-small" disabled={step === 0} onClick={() => go(step - 1)}><ArrowLeft size={14} /> BACK</button>
        <ol className="sy-tour-dots">{scenes.map((item, i) => <li key={item.tag}><button aria-label={`Scene ${i + 1}: ${item.title}`} aria-current={i === step ? "step" : undefined} onClick={() => go(i)} /></li>)}</ol>
        <button ref={next} className="sy-go is-cue" onClick={() => last ? finish() : go(step + 1)}>{last ? "START LEVEL 1" : "NEXT"} <ArrowRight size={16} /></button>
      </footer>
    </div>
  </div>;
}
