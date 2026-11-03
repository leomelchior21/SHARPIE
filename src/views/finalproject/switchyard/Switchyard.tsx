import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Blocks, Check, Clock3, FileCode2, Gauge, Keyboard, Lock, Radio, RotateCcw, Split, Star, Terminal, X } from "lucide-react";
import { SyntaxLine } from "../../../components/SyntaxLine";
import type { Input } from "../content";
import { award, type Progress, type Update } from "../progress";
import { useExecution, waitStep } from "../shared";
import { levels, rushHour, stages, type Line, type YardLevel } from "./levels";
import { buildYard, dialLine, expected, firstWrong, provesEdge, readDial, readWritten, route, starsFor, swapStations, writtenCode, yardCode, type Route, type Yard } from "./yard";
import { runYard, warmYard } from "./runYard";
import { YardScene, type TrainState } from "./YardScene";
import "./switchyard.css";

const slotNames = ["Create the variable", "Test a condition", "TRUE action", "ELSE path", "ELSE action"];
type Side = "true" | "false";
type Mode = "watch" | "test" | "proof" | "rush";
interface Row { value: Input; output: string; ok: boolean; route: Route; want: string }

// The bank keeps the same shuffled order every visit.
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
const shuffled = (lines: Line[], seed: string) => [...lines].sort((a, b) => hash(seed + a) - hash(seed + b));
const edgeOf = (condition: string) => Number(/(-?\d+)\s*$/.exec(condition)?.[1] ?? 0);
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// allOpen: the teacher, or the teacher preview, has every level open.
export const levelOpen = (p: Progress, index: number, allOpen: boolean) => allOpen || index === 0 || p.yardShipped.includes(index - 1);

export function Switchyard({ progress: p, update, allOpen, onHub }: { progress: Progress; update: Update; allOpen: boolean; onHub: () => void }) {
  useEffect(() => { warmYard(); }, []);
  return <section className="sy">
    <Level key={p.yardLevel} index={p.yardLevel} progress={p} update={update} allOpen={allOpen} onHub={onHub} />
  </section>;
}

// The levels as stops on one route line: finished stops in green, the current one in yellow.
function Rail({ progress: p, index, allOpen, update }: { progress: Progress; index: number; allOpen: boolean; update: Update }) {
  const stage = stages[levels[index].stage];
  return <nav className="sy-route" aria-label="Switchyard levels">
    <div className="sy-route-head"><b>Level {index + 1} <span>/ {levels.length}</span></b><small>{stage.short} · {stage.name}</small></div>
    <ol>{levels.map((level, i) => {
      const open = levelOpen(p, i, allOpen);
      const stars = p.yardStars[i] ?? 0;
      return <li key={level.id} className={`${i > 0 && levels[i - 1].stage !== level.stage ? "is-new-stage" : ""} ${i > 0 && p.yardShipped.includes(i - 1) ? "is-linked" : ""} ${p.yardShipped.includes(i) ? "is-done" : ""} ${i === index ? "is-now" : ""}`}>
        <button aria-label={`Level ${i + 1}: ${level.title}`} title={`${i + 1} · ${level.title}`} aria-current={i === index ? "step" : undefined} disabled={!open}
          onClick={() => update((current) => ({ ...current, yardLevel: i }))}>{open ? i + 1 : <Lock size={10} />}</button>
        <i aria-hidden="true">{[0, 1, 2].map((n) => <em key={n} className={n < stars ? "is-on" : ""} />)}</i>
      </li>;
    })}</ol>
  </nav>;
}

function NumberLine({ level, yard, trains, current }: { level: YardLevel; yard: Yard; trains: Input[]; current: Input | null }) {
  const side = (value: Input) => route(yard, level.variable, value).side;
  if (typeof level.spotlight === "boolean") return <div className="sy-line sy-line--bool" aria-label="Where each value goes">
    {[true, false].map((value) => <span key={String(value)} className={`is-${side(value) ?? "none"} ${current === value ? "is-current" : ""}`}><b>{String(value)}</b><small>{side(value) === "true" ? "TRUE TRACK" : side(value) === "false" ? "ELSE TRACK" : "NO TRACK"}</small></span>)}
  </div>;
  const span = level.max - level.min;
  const count = Math.min(span + 1, 61);
  const valueAt = (i: number) => Math.round(level.min + (i * span) / (count - 1));
  // Positions inside the 12px padding the cells sit in.
  const at = (value: number) => `calc(12px + (100% - 24px) * ${(value - level.min) / span})`;
  const edge = yard.condition ? readDial(`if (${yard.condition})`) : null;
  return <div className="sy-line" aria-label={`Number line from ${level.min} to ${level.max}: green values take the TRUE track`}>
    <div className="sy-line-cells">{Array.from({ length: count }, (_, i) => <i key={i} className={`is-${side(valueAt(i)) ?? "none"}`} />)}</div>
    {edge && edge.op !== "=" && <span className={`sy-line-edge ${side(edge.n) === "true" ? "is-in" : "is-out"}`} style={{ left: at(edge.n) } as CSSProperties} title={`${edge.n} goes to the ${side(edge.n) === "true" ? "TRUE" : "ELSE"} track`}><b>{edge.n}</b></span>}
    {trains.map((value, i) => <span key={`${value}-${i}`} className={`sy-line-train ${current === value ? "is-current" : ""}`} style={{ left: at(value as number) } as CSSProperties}>{String(value)}</span>)}
    <div className="sy-line-ends"><span>{level.min}</span><span>{level.variable}</span><span>{level.max}</span></div>
  </div>;
}

function Level({ index, progress: p, update, allOpen, onHub }: { index: number; progress: Progress; update: Update; allOpen: boolean; onHub: () => void }) {
  const level = levels[index];
  const writing = level.tool === "write";
  const shippedBefore = p.yardShipped.includes(index);
  const draft = p.yardDrafts[level.id];
  const lines = writing ? [] : level.preset.map((line, slot) => level.given.includes(slot) ? line : draft?.[slot] ?? line);
  const code = writing ? draft?.[0] ?? "" : "";
  const written = writing ? readWritten(code) : null;
  const yard: Yard = written ?? buildYard(lines);

  const [ran, setRan] = useState(shippedBefore || !level.runFirst);
  const [runs, setRuns] = useState(0);
  const [prediction, setPrediction] = useState<Side | null>(null);
  const [asking, setAsking] = useState(false);
  const [train, setTrain] = useState<TrainState | null>(null);
  const [lever, setLever] = useState<Side | null>(null);
  const [readout, setReadout] = useState<string[]>([]);
  const [arrived, setArrived] = useState<Side | null>(null);
  const [board, setBoard] = useState<Row[]>([]);
  const [verdict, setVerdict] = useState<{ tone: "right" | "wrong" | "done"; text: string } | null>(null);
  const [shipped, setShipped] = useState(false);
  const [why, setWhy] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [stage, setStage] = useState<"write" | "timetable" | "rush">("write");
  const [picks, setPicks] = useState<number[]>([10, 20, 30]);
  const trip = useRef(0);
  const { run, busy, error } = useExecution();
  const [slow] = useState(() => !reducedMotion());

  const timetable = writing ? (stage === "rush" ? rushHour : picks) : level.timetable;
  const editable = [0, 1, 2, 3, 4].filter((slot) => !level.given.includes(slot));
  const locked = busy || !ran;
  const last = index === levels.length - 1;
  const edge = edgeOf(level.condition);
  const proof = writing ? provesEdge(edge, picks) : null;
  const spot = route(yard, level.variable, level.spotlight);
  const needPredict = !shippedBefore && !level.runFirst && !writing && prediction === null && spot.side !== null && spot.stop !== "jam";

  const clear = () => { setBoard([]); setVerdict(null); setLever(null); setArrived(null); setTrain(null); setReadout([]); };
  const save = (next: string[]) => { update((current) => ({ ...current, yardDrafts: { ...current.yardDrafts, [level.id]: next } })); clear(); };
  const setLines = (next: Line[]) => save(next);

  const ship = (stars: number) => {
    setShipped(true);
    update((current) => award({
      ...current,
      yardShipped: [...new Set([...current.yardShipped, index])].sort((a, b) => a - b),
      yardStars: current.yardStars.map((value, i) => i === index ? Math.max(value, stars) : value),
    }, `yard:${index}`, 30));
  };

  const describe = (row: Row) => row.route.stop === "gap" || row.route.stop === "jam" ? `Train ${String(row.value)}: ${row.route.message}`
    : row.route.stop === "buffer" ? `Train ${String(row.value)} hit the dead end: nothing printed.`
      : `Train ${String(row.value)} printed “${row.output || "nothing"}”. The rule wants “${row.want}”.`;

  const finish = (rows: Row[], mode: Mode, side: Side | null) => {
    const bad = rows.filter((row) => !row.ok);
    if (mode === "watch") {
      setRan(true);
      setVerdict({ tone: "wrong", text: bad.length ? `${level.incident ? "Incident confirmed. " : ""}${describe(bad[0])} Now fix the yard.` : "Every train arrived. Now make it yours." });
      return;
    }
    const guess = side && spot.side ? side === spot.side ? `You called train ${String(level.spotlight)} right. ` : `You said train ${String(level.spotlight)} would take the ${side === "true" ? "TRUE" : "ELSE"} track; it took the other one. ` : "";
    if (bad.length) { setVerdict({ tone: "wrong", text: `${guess}${describe(bad[0])}` }); return; }
    const still = firstWrong(level, yard);
    if (still !== null) { setVerdict({ tone: "wrong", text: `${guess}The timetable passed, but train ${String(still)} would still go to the wrong place. Check the edge.` }); return; }
    if (mode === "proof") { setStage("rush"); setBoard([]); setVerdict({ tone: "right", text: "Your timetable proves the edge. Now rush hour: 12 trains, fast." }); return; }
    setVerdict({ tone: "done", text: `${guess}Every train reached the right station.` });
    ship(starsFor(runs + 1));
  };

  const go = (values: Input[], mode: Mode, side: Side | null = prediction) => run(async (signal) => {
    clear();
    if (mode !== "watch") setRuns((value) => value + 1);
    const pace = (slow ? 1 : 0.2) * (mode === "rush" ? 0.35 : 1);
    const rows: Row[] = [];
    for (const value of values) {
      trip.current += 1;
      const where = route(yard, level.variable, value);
      setArrived(null); setLever(null); setReadout([yard.condition ?? "NO SWITCH"]);
      setTrain({ key: `t${trip.current}`, value, leg: "enter", route: where });
      await waitStep(signal, 900 * pace);
      let output = "";
      if (where.stop === "jam") {
        setTrain((t) => t && { ...t, leg: "decide" });
        setReadout([where.steps[0], "JAMMED"]);
        await waitStep(signal, 800 * pace);
      } else if (where.side !== null) {
        setTrain((t) => t && { ...t, leg: "decide" });
        setReadout(where.steps.slice(0, 2));
        await waitStep(signal, 500 * pace);
        setReadout(where.steps); setLever(where.side);
        await waitStep(signal, 350 * pace);
        setTrain((t) => t && { ...t, leg: "depart" });
        if (where.stop === "station" || where.stop === "buffer") output = await runYard(writing ? writtenCode(level.variable, value, code) : yardCode(level.variable, value, yard), signal);
        await waitStep(signal, 900 * pace);
        setTrain((t) => t && { ...t, leg: "done" });
        if (where.stop === "station") setArrived(where.side);
      }
      const want = expected(level, value);
      rows.push({ value, output, ok: where.stop === "station" && output === want, route: where, want });
      setBoard([...rows]);
      await waitStep(signal, 450 * pace);
    }
    finish(rows, mode, side);
  });

  const start = () => {
    if (!ran) return go(level.timetable, "watch");
    if (writing) {
      if (stage === "write") { setStage("timetable"); clear(); return; }
      return go(timetable, stage === "rush" ? "rush" : "proof");
    }
    if (needPredict) { setAsking(true); return; }
    return go(level.timetable, "test");
  };
  const predict = (side: Side) => { setPrediction(side); setAsking(false); void go(level.timetable, "test", side); };

  // Blocks: tap a code block into the next empty slot; tap a filled slot to send it back.
  const firstEmpty = editable.find((slot) => !lines[slot]);
  const target = selected !== null && !lines[selected] ? selected : firstEmpty;
  const used = new Set(editable.map((slot) => lines[slot]).filter(Boolean));
  const bank = level.bank ? level.ordered ? level.bank : shuffled(level.bank, level.id) : [];
  const dial = readDial(lines[1] ?? "") ?? { op: level.ops?.[0] ?? "==", n: level.dialRange?.[0] ?? edge };
  const trainValue = train?.value ?? (board.length ? board[board.length - 1].value : level.spotlight);
  const show = (line: Line) => line === "decl" ? `${typeof level.spotlight === "boolean" ? "bool" : "int"} ${level.variable} = ${String(trainValue)};` : line;
  const lineState = (slot: number) => lever === null ? "" : slot === 1 ? "is-run" : slot === 2 ? (lever === "true" ? "is-run" : "is-skip") : slot >= 3 ? (lever === "false" ? "is-run" : "is-skip") : "is-run";

  const steps = level.runFirst ? ["WATCH", "FIX", "RUN", "SHIP"] : writing ? ["WRITE", "TIMETABLE", "RUSH HOUR", "SHIP"] : ["BUILD", "PREDICT", "RUN", "SHIP"];
  const step = shipped || shippedBefore && !busy && !board.length ? 4
    : writing ? (stage === "write" ? 0 : stage === "timetable" ? 1 : 2)
      : !ran ? 0 : asking ? 1 : busy ? 2 : level.runFirst ? 1 : 0;
  const hint = error ? error
    : verdict ? verdict.text
      : shippedBefore ? "Shipped. Replay any level, or move on to the next one."
        : !ran ? (level.incident ? "Incident report on your desk. Run the yard as it is and watch what happens." : "Somebody built this yard before you. Run it as it is and watch where the trains go.")
          : writing ? (stage === "write" ? written!.next : stage === "timetable" ? proof ?? "Your three trains prove the edge. Run them." : "Rush hour: 12 trains, one after another.")
            : level.tool === "blocks" ? (target === undefined ? "Program complete. Run the timetable." : `Tap the code for line ${target + 1}${level.labels ? `: ${slotNames[target].toLowerCase()}` : ""}.`)
              : level.tool === "ifs" ? (lines[1] ? "Run the timetable, or pick another test." : "Pick the if line for the switch.")
                : `Set the sensor: the operator${level.dialRange ? " and the number" : ""}${level.swap ? ", or swap the stations" : ""}.`;
  const tone = error ? "wrong" : verdict?.tone;

  const runLabel = !ran ? (level.incident ? "▶ WATCH THE INCIDENT" : "▶ RUN THE YARD AS IT IS")
    : writing ? (stage === "write" ? "PICK YOUR TIMETABLE →" : stage === "timetable" ? "▶ RUN MY TIMETABLE" : "▶ START RUSH HOUR")
      : "▶ RUN THE TIMETABLE";
  const canRun = !busy && !asking && !shipped && (writing ? (stage === "write" ? !!written?.complete : stage === "timetable" ? !!written?.complete && !proof : !!written?.complete) : true);

  const slot = (n: number) => {
    const line = lines[n];
    const given = level.given.includes(n);
    const cls = `sy-pline ${n === 2 || n === 4 ? "is-indent" : ""} ${lineState(n)}`;
    if (given || level.tool !== "blocks" && !(level.tool === "ifs" && n === 1)) return <div className={`${cls} ${given ? "is-given" : "is-set"}`} data-slot={n}>
      <span className="sy-ln">{n + 1}</span><code>{line ? <SyntaxLine code={show(line)} /> : <span className="sy-empty">{slotNames[n]}</span>}</code>
    </div>;
    return <div className={cls}>
      <span className="sy-ln">{n + 1}</span>
      <button className={`sy-slot ${line ? "is-filled" : ""} ${target === n && level.tool === "blocks" ? "is-target" : ""}`} data-slot={n} disabled={locked || shipped}
        aria-label={line ? `Line ${n + 1}: ${show(line)}. Remove` : `Line ${n + 1}: empty`}
        onClick={() => { if (line) { setLines(lines.map((item, m) => m === n ? "" : item)); setSelected(n); } else setSelected(n); }}>
        {line ? <><code className="sy-slot-code"><SyntaxLine code={show(line)} /></code><X size={12} className="sy-slot-x" /></> : <span>{level.labels ? slotNames[n] : "?"}</span>}
      </button>
    </div>;
  };

  const next = () => last ? onHub() : update((current) => ({ ...current, yardLevel: index + 1 }));

  return <>
    <header className="sy-top">
      <Rail progress={p} index={index} allOpen={allOpen} update={update} />
      <div className={`sy-coach ${tone ? `is-${tone}` : ""}`}>
        <ol aria-label="Steps">{steps.map((label, i) => <li key={label} className={i < step ? "is-done" : i === step ? "is-now" : ""}>{i < step ? <Check size={11} strokeWidth={3} /> : <b>{i + 1}</b>}{label}</li>)}</ol>
        <p className="sy-verdict" role="status">{hint}</p>
      </div>
    </header>

    <div className="sy-main">
      <aside className="sy-tower">
        <div className="sy-memo">
          <small><Radio size={14} /> DISPATCH · LEVEL {String(index + 1).padStart(2, "0")} · {level.place.toUpperCase()}</small>
          <h1>{level.title}</h1>
          <p>{level.dispatch}</p>
          {level.incident && <p className="sy-incident"><b>INCIDENT</b> {level.incident}</p>}
        </div>

        <div className="sy-program">
          <div className="sy-program-bar"><span><FileCode2 size={15} /> Program.cs</span><em>{writing ? "WRITE IT" : `${editable.filter((n) => lines[n]).length} / ${editable.length}`}</em></div>
          {writing ? <div className="sy-write">
            <div className="sy-pline is-given"><span className="sy-ln">1</span><code><SyntaxLine code={show("decl")} /></code></div>
            <textarea aria-label="Your if / else" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={code} disabled={busy}
              placeholder={"if (…)\n{\n    Console.WriteLine(\"…\");\n}\nelse\n{\n    …\n}"}
              onChange={(event) => { save([event.target.value]); setStage("write"); }} />
          </div> : <div className="sy-lines">{[0, 1, 2, 3, 4].map((n) => <Fragment key={n}>
            {slot(n)}
            {(n === 1 || n === 3) && (lines[n] || n === 1) && <div className={`sy-brace ${lineState(n + 1)}`}>{"{"}</div>}
            {(n === 2 || n === 4) && (lines[n - 1] || n === 2) && <div className={`sy-brace ${lineState(n)}`}>{"}"}</div>}
          </Fragment>)}</div>}
        </div>

        <div className="sy-tools">
          {!ran ? <p className="sy-locked"><Lock size={13} /> {level.incident ? "LOCKED UNTIL YOU WATCH THE INCIDENT" : "LOCKED UNTIL THE YARD HAS RUN ONCE"}</p>
            : level.tool === "blocks" ? <>
              <small><Blocks size={14} /> CODE BLOCKS · {target === undefined ? "TAP A LINE TO SEND IT BACK" : `FOR LINE ${target + 1}`}</small>
              <div className="sy-bank">{bank.map((line) => <button key={line} data-line={line} className={used.has(line) ? "is-used" : ""} disabled={locked || shipped || used.has(line) || target === undefined}
                onClick={() => { setLines(lines.map((item, m) => m === target ? line : item)); setSelected(null); }}><code><SyntaxLine code={show(line)} /></code></button>)}</div>
              <button className="sy-small" disabled={locked || shipped} onClick={() => { setLines([...level.preset]); setSelected(null); }}><RotateCcw size={13} /> RESET</button>
            </>
              : level.tool === "dial" ? <div className="sy-dial">
                <small><Gauge size={14} /> SENSOR DIAL · <code>{level.variable} <b>{dial.op}</b> {dial.n}</code></small>
                <div className="sy-ops" role="group" aria-label="Operator">{level.ops!.map((op) => <button key={op} aria-pressed={dial.op === op} disabled={locked || shipped} onClick={() => setLines(lines.map((item, m) => m === 1 ? dialLine(level.variable, op, dial.n) : item))}>{op}</button>)}</div>
                {level.dialRange && <div className="sy-number">
                  <button aria-label={`Lower the number`} disabled={locked || shipped || dial.n <= level.dialRange[0]} onClick={() => setLines(lines.map((item, m) => m === 1 ? dialLine(level.variable, dial.op, dial.n - 1) : item))}>−</button>
                  <input type="range" aria-label="Sensor number" min={level.dialRange[0]} max={level.dialRange[1]} value={dial.n} disabled={locked || shipped} onChange={(event) => setLines(lines.map((item, m) => m === 1 ? dialLine(level.variable, dial.op, Number(event.target.value)) : item))} />
                  <button aria-label={`Raise the number`} disabled={locked || shipped || dial.n >= level.dialRange[1]} onClick={() => setLines(lines.map((item, m) => m === 1 ? dialLine(level.variable, dial.op, dial.n + 1) : item))}>+</button>
                </div>}
                {level.swap && <button className="sy-swap" disabled={locked || shipped} onClick={() => setLines(swapStations(lines))}>⇅ SWAP STATIONS</button>}
              </div>
                : level.tool === "ifs" ? <>
                  <small><Split size={14} /> SWITCH TESTS · PICK ONE</small>
                  <div className="sy-bank">{bank.map((line) => <button key={line} data-line={line} aria-pressed={lines[1] === line} disabled={locked || shipped} onClick={() => setLines(lines.map((item, m) => m === 1 ? line : item))}><code><SyntaxLine code={line} /></code></button>)}</div>
                  {level.swap && <button className="sy-swap" disabled={locked || shipped} onClick={() => setLines(swapStations(lines))}>⇅ SWAP STATIONS</button>}
                </>
                  : stage === "timetable" || stage === "rush" ? <div className="sy-picks">
                    <small><Clock3 size={14} /> YOUR TIMETABLE · THREE TRAINS THAT PROVE THE RULE</small>
                    <div>{picks.map((value, i) => <div key={i} className="sy-number">
                      <button aria-label={`Train ${i + 1} lower`} disabled={busy || stage === "rush" || value <= level.min} onClick={() => { setPicks(picks.map((v, j) => j === i ? v - 1 : v)); clear(); }}>−</button>
                      <output aria-label={`Train ${i + 1}`}>{value}</output>
                      <button aria-label={`Train ${i + 1} higher`} disabled={busy || stage === "rush" || value >= level.max} onClick={() => { setPicks(picks.map((v, j) => j === i ? v + 1 : v)); clear(); }}>+</button>
                    </div>)}</div>
                  </div> : <p className="sy-locked is-info"><Keyboard size={15} /> Type the switch in Program.cs. The yard builds itself as you write.</p>}
        </div>
      </aside>

      <div className="sy-yard">
        <div className="sy-scene-wrap">
          <YardScene yard={yard} variable={level.variable} train={train} lever={lever} readout={readout} arrived={arrived} decorCount={p.yardShipped.length} duration={900 * (slow ? 1 : 0.2) * (stage === "rush" ? 0.35 : 1)} />
          {asking && <div className="sy-overlay sy-predict" role="group" aria-label="Predict the track">
            <small>BEFORE IT RUNS</small>
            <p>Train <b>{String(level.spotlight)}</b> is next. Which track will your switch send it down?</p>
            <div><button className="is-true" onClick={() => predict("true")}>▲ TRUE TRACK</button><button className="is-false" onClick={() => predict("false")}>▼ ELSE TRACK</button></div>
          </div>}
          {shipped && <div className="sy-overlay sy-shipped" role="dialog" aria-label="Level shipped">
            <span className="sy-stamp is-ok">SHIPPED</span>
            <div className="sy-stars" aria-label={`${p.yardStars[index]} stars`}>{[0, 1, 2].map((n) => <Star key={n} size={26} className={n < p.yardStars[index] ? "is-on" : ""} />)}</div>
            <p className="sy-why-q">{level.why.question}</p>
            <div className="sy-why">{level.why.options.map((option, i) => <button key={option} disabled={why === level.why.answer}
              className={why === i ? i === level.why.answer ? "is-right" : "is-wrong" : ""} onClick={() => setWhy(i)}>{option}</button>)}</div>
            {why !== null && <p className="sy-why-explain">{why === level.why.answer ? <><b>Right.</b> {level.why.explain} {level.note}</> : <><b>Not that one.</b> Read the trains on the board, then try again.</>}</p>}
            {why === level.why.answer && <button className="sy-go is-cue" onClick={next}>{last ? "BACK TO THE SWITCHYARD" : "NEXT LEVEL"} <ArrowRight size={15} /></button>}
          </div>}
        </div>

        <NumberLine level={level} yard={yard} trains={timetable} current={train?.value ?? null} />

        <div className="sy-desk">
          <div className="sy-board" aria-label="Timetable">
            <small><Clock3 size={14} /> TIMETABLE{stage === "rush" ? " · RUSH HOUR" : ""}</small>
            <ol>{timetable.map((value, i) => {
              const row = board[i];
              return <li key={`${String(value)}-${i}`} className={row ? row.ok ? "is-ok" : "is-wrong" : train && board.length === i && busy ? "is-running" : ""}>
                <b>{String(value)}</b>
                <span>{row ? row.route.stop === "station" ? `“${row.output || "nothing"}”` : row.route.stop === "buffer" ? "DEAD END" : row.route.stop === "jam" ? "JAMMED" : "NO TRACK" : "…"}</span>
                {row && <i className={`sy-mini-stamp ${row.ok ? "is-ok" : "is-wrong"}`}>{row.ok ? "OK" : "WRONG"}</i>}
              </li>;
            })}</ol>
          </div>
          <div className="sy-actions">
            <p className="sy-console" aria-live="polite"><span><Terminal size={14} /> CONSOLE</span> {board.length ? board[board.length - 1].output || "(nothing printed)" : "…"}</p>
            {shippedBefore && !shipped ? <div className="sy-replay">
              <button className="sy-go" disabled={!canRun} onClick={start}>{runLabel}</button>
              <button className="sy-small" onClick={next}>{last ? "SWITCHYARD" : "NEXT LEVEL"} <ArrowRight size={13} /></button>
            </div> : <button className={`sy-go ${canRun && !board.length ? "is-cue" : ""}`} disabled={!canRun} onClick={start}>{busy ? "RUNNING…" : runLabel}</button>}
          </div>
        </div>
      </div>
    </div>
  </>;
}
