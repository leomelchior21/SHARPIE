import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Blocks, Check, Clock3, Gauge, Keyboard, Lock, RotateCcw, Split, Star, X } from "lucide-react";
import type { Input } from "../content";
import { award, type Progress, type Update } from "../progress";
import { useExecution, waitStep } from "../shared";
import { levels, stages, type Line, type YardLevel } from "./levels";
import { buildYard, dialLine, expected, firstWrong, provesEdge, readDial, readWritten, route, starsFor, swapStations, writtenCode, yardCode, type Route, type Yard } from "./yard";
import { runYard, warmYard } from "./runYard";
import { TrackDiagram, type TrainState } from "./TrackDiagram";
import { WorldArt } from "./WorldArt";
import "./switchyard.css";

const slotNames = ["Create the variable", "Test a condition", "TRUE action", "ELSE path", "ELSE action"];
type Side = "true" | "false";
type Mode = "watch" | "test";
interface Row { value: Input; output: string; ok: boolean; route: Route; want: string }

// The bank keeps the same shuffled order every visit.
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
const shuffled = (lines: Line[], seed: string) => [...lines].sort((a, b) => hash(seed + a) - hash(seed + b));
const edgeOf = (condition: string) => Number(/(-?\d+)\s*$/.exec(condition)?.[1] ?? 0);
// The right "why?" answer moves around from level to level instead of always coming first.
const whyOrder = (index: number, count: number, answer: number) => {
  const order = Array.from({ length: count }, (_, i) => i).filter((i) => i !== answer);
  order.splice((index * 2 + 1) % count, 0, answer);
  return order;
};
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// C# coloured like the explainer video: keywords purple, types blue, numbers and bools teal, strings gold.
const tokens = /("(?:[^"\\]|\\.)*"|\b(?:if|else)\b|\b(?:int|double|bool)\b|\b(?:true|false)\b|\b\d+(?:\.\d+)?\b|Console\.WriteLine)/;
function Cs({ code }: { code: string }) {
  return <>{code.split(tokens).filter(Boolean).map((part, i) => {
    const kind = part.startsWith('"') ? "str" : /^(if|else)$/.test(part) ? "kw" : /^(int|double|bool)$/.test(part) ? "type" : /^(true|false|\d+(\.\d+)?)$/.test(part) ? "num" : part === "Console.WriteLine" ? "fn" : "";
    return <span key={i} className={kind ? `cs-${kind}` : undefined}>{part}</span>;
  })}</>;
}

// allOpen: the teacher, or the teacher preview, has every level open.
export const levelOpen = (p: Progress, index: number, allOpen: boolean) => allOpen || index === 0 || p.yardShipped.includes(index - 1);

/** headerSlot: a spot in the Final Project header where the level line goes, so the game keeps the whole screen. */
export function Switchyard({ progress: p, update, allOpen, onHub, headerSlot = null }: { progress: Progress; update: Update; allOpen: boolean; onHub: () => void; headerSlot?: HTMLElement | null }) {
  useEffect(() => { warmYard(); }, []);
  return <section className="sy">
    <Level key={p.yardLevel} index={p.yardLevel} progress={p} update={update} allOpen={allOpen} onHub={onHub} headerSlot={headerSlot} />
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
    {[true, false].map((value) => <span key={String(value)} className={`is-${side(value) ?? "none"} ${current === value ? "is-current" : ""}`}><b>{String(value)}</b><small>{side(value) === "true" ? "→ IF" : side(value) === "false" ? "→ ELSE" : "no track"}</small></span>)}
  </div>;
  const span = level.max - level.min;
  const count = Math.min(span + 1, 61);
  const valueAt = (i: number) => Math.round(level.min + (i * span) / (count - 1));
  // Positions inside the 12px padding the cells sit in.
  const at = (value: number) => `calc(12px + (100% - 24px) * ${(value - level.min) / span})`;
  const edge = yard.condition ? readDial(`if (${yard.condition})`) : null;
  return <div className="sy-line" aria-label={`Number line from ${level.min} to ${level.max}: green values reach the IF card`}>
    <div className="sy-line-cells">{Array.from({ length: count }, (_, i) => <i key={i} className={`is-${side(valueAt(i)) ?? "none"}`} />)}</div>
    {edge && edge.op !== "=" && <span className={`sy-line-edge ${side(edge.n) === "true" ? "is-in" : "is-out"}`} style={{ left: at(edge.n) } as CSSProperties} title={`${edge.n} reaches the ${side(edge.n) === "true" ? "IF" : "ELSE"} card`}><b>{edge.n}</b></span>}
    {trains.map((value, i) => <span key={`${value}-${i}`} className={`sy-line-train ${current === value ? "is-current" : ""}`} style={{ left: at(value as number) } as CSSProperties}>{String(value)}</span>)}
    <div className="sy-line-ends"><span>{level.min}</span><span>{level.variable}</span><span>{level.max}</span></div>
  </div>;
}

function Level({ index, progress: p, update, allOpen, onHub, headerSlot }: { index: number; progress: Progress; update: Update; allOpen: boolean; onHub: () => void; headerSlot: HTMLElement | null }) {
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
  const [stage, setStage] = useState<"write" | "timetable">("write");
  const [picks, setPicks] = useState<number[]>([10, 20, 30]);
  const trip = useRef(0);
  const { run, busy, error } = useExecution();
  const [slow] = useState(() => !reducedMotion());

  const timetable = writing ? picks : level.timetable;
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
    setVerdict({ tone: "done", text: `${guess}Every train reached the right station.` });
    ship(starsFor(runs + 1));
  };

  const go = (values: Input[], mode: Mode, side: Side | null = prediction) => run(async (signal) => {
    clear();
    if (mode !== "watch") setRuns((value) => value + 1);
    const pace = slow ? 1 : 0.2;
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
        await waitStep(signal, 600 * pace);
        setReadout(where.steps); setLever(where.side);
        await waitStep(signal, 450 * pace);
        setTrain((t) => t && { ...t, leg: "depart" });
        if (where.stop === "station" || where.stop === "buffer") output = await runYard(writing ? writtenCode(level.variable, value, code) : yardCode(level.variable, value, yard), signal);
        await waitStep(signal, 900 * pace);
        setTrain((t) => t && { ...t, leg: "done" });
        if (where.stop === "station") setArrived(where.side);
      }
      const want = expected(level, value);
      rows.push({ value, output, ok: where.stop === "station" && output === want, route: where, want });
      setBoard([...rows]);
      await waitStep(signal, 650 * pace);
    }
    finish(rows, mode, side);
  });

  const start = () => {
    if (!ran) return go(level.timetable, "watch");
    if (writing) {
      if (stage === "write") { setStage("timetable"); clear(); return; }
      return go(timetable, "test");
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
  // The run, step by step: the value lands on line 1, the test lights up, then one block runs and the other is skipped.
  const decided = lever !== null && !!train && train.leg !== "enter";
  const entering = !!train && train.leg === "enter";
  const blockState = (side: Side) => decided ? lever === side ? `is-${side}` : "is-skip" : "";

  const hint = error ? error
    : verdict ? verdict.text
      : shippedBefore ? "Shipped. Replay any level, or move on to the next one."
        : !ran ? (level.incident ? "Incident report on your desk. Run the yard as it is and watch what happens." : "Somebody built this yard before you. Run it as it is and watch where the trains go.")
          : writing ? (stage === "write" ? written!.next : proof ?? "Your three trains prove the edge. Run them.")
            : level.tool === "blocks" ? (target === undefined ? "Program complete. Run the timetable." : `Tap the code for line ${target + 1}${level.labels ? `: ${slotNames[target].toLowerCase()}` : ""}.`)
              : level.tool === "ifs" ? (lines[1] ? "Run the timetable, or pick another test." : "Pick the if line for the switch.")
                : `Set the sensor: the operator${level.dialRange ? " and the number" : ""}${level.swap ? ", or swap the stations" : ""}.`;
  const tone = error ? "wrong" : verdict?.tone;

  const runLabel = !ran ? (level.incident ? "▶ WATCH THE INCIDENT" : "▶ RUN THE YARD AS IT IS")
    : writing ? (stage === "write" ? "PICK YOUR TIMETABLE →" : "▶ RUN MY TIMETABLE")
      : "▶ RUN THE TIMETABLE";
  const canRun = !busy && !asking && !shipped && (writing ? (stage === "write" ? !!written?.complete : !!written?.complete && !proof) : true);

  // Line 2 with its test marked true or false once the switch has decided.
  const showLine = (n: number, line: Line): ReactNode => {
    const test = /^if \((.+)\)$/.exec(line);
    if (n === 1 && test && decided && readout[2]) return <><Cs code="if (" /><mark className={`sy-cond is-${readout[2]}`}><Cs code={test[1]} /></mark><Cs code=")" /><em className={`sy-cond-badge is-${readout[2]}`}>{readout[2]}</em></>;
    return <Cs code={show(line)} />;
  };
  const slot = (n: number) => {
    const line = lines[n];
    const given = level.given.includes(n);
    const tappable = !given && (level.tool === "blocks" || level.tool === "ifs" && n === 1);
    if (!tappable) return <code className={`sy-code-text ${line ? "" : "is-empty"}`} data-slot={n}>{line ? showLine(n, line) : slotNames[n]}</code>;
    return <button className={`sy-slot ${line ? "is-filled" : ""} ${target === n && level.tool === "blocks" ? "is-target" : ""}`} data-slot={n} disabled={locked || shipped}
      aria-label={line ? `Line ${n + 1}: ${show(line)}. Remove` : `Line ${n + 1}: empty`}
      onClick={() => { if (line) { setLines(lines.map((item, m) => m === n ? "" : item)); setSelected(n); } else setSelected(n); }}>
      {line ? <><code className="sy-slot-code">{showLine(n, line)}</code><X size={13} className="sy-slot-x" /></> : <span>{level.labels ? slotNames[n] : "?"}</span>}
    </button>;
  };
  // The program as the video shows it: numbered lines, braces included.
  let lineNo = 0;
  const row = (content: ReactNode, extra = "") => <div className={`sy-row ${extra}`}><span className="sy-ln">{++lineNo}</span>{content}</div>;
  const brace = (text: string) => <code className="sy-code-text is-brace">{text}</code>;
  const hasElse = lines[3] === "else" || editable.includes(3);
  const program = <div className="sy-code">
    {row(slot(0), entering ? "is-now" : "")}
    {row(slot(1), decided ? "is-tested" : "")}
    <div className={`sy-block ${blockState("true")}`}>
      {row(brace("{"))}{row(<div className="sy-indent">{slot(2)}</div>)}{row(brace("}"))}
      {decided && lever !== "true" && <i className="sy-skipped">SKIPPED</i>}
    </div>
    {hasElse && <div className={`sy-block ${blockState("false")}`}>
      {row(slot(3))}
      {lines[3] === "else" ? <>{row(brace("{"))}{row(<div className="sy-indent">{slot(4)}</div>)}{row(brace("}"))}</> : row(<div className="sy-indent">{slot(4)}</div>)}
      {decided && lever !== "false" && <i className="sy-skipped">SKIPPED</i>}
    </div>}
  </div>;

  const lastRow = board.length ? board[board.length - 1] : null;
  // The client's picture shows the newest finished train; mid-trip it waits.
  const printed = train && train.leg !== "done" ? null : lastRow ? lastRow.output : null;
  const outputSide = lastRow?.route.side ?? null;
  const caption = (text: string) => text.split(/(\btrue\b|\bfalse\b|\bTRUE\b|\bFALSE\b)/).map((part, i) => /^(true|TRUE)$/.test(part) ? <b key={i} className="is-true">{part}</b> : /^(false|FALSE)$/.test(part) ? <b key={i} className="is-false">{part}</b> : part);

  const next = () => last ? onHub() : update((current) => ({ ...current, yardLevel: index + 1 }));

  return <>
    {headerSlot ? createPortal(<Rail progress={p} index={index} allOpen={allOpen} update={update} />, headerSlot) : <header className="sy-top"><Rail progress={p} index={index} allOpen={allOpen} update={update} /></header>}

    <div className="sy-main">
      <aside className="sy-left">
        <div className="sy-mission">
          <div className="sy-mission-top"><span className="sy-cs">C#</span><small>Level {index + 1} · {level.place}</small></div>
          <h1 className="sy-label">{level.title}</h1>
          <p>{level.dispatch}</p>
          {level.incident && <p className="sy-incident"><b>INCIDENT</b> {level.incident}</p>}
        </div>

        <div className="sy-editor">
          {writing ? <div className="sy-write">
            <div className="sy-row"><span className="sy-ln">1</span><code className="sy-code-text" data-slot={0}><Cs code={show("decl")} /></code></div>
            <textarea aria-label="Your if / else" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={code} disabled={busy}
              placeholder={"if (…)\n{\n    Console.WriteLine(\"…\");\n}\nelse\n{\n    …\n}"}
              onChange={(event) => { save([event.target.value]); setStage("write"); }} />
          </div> : program}
        </div>
        <p className={`sy-output ${outputSide ? `is-${outputSide}` : ""}`} aria-live="polite"><span>Output</span><b>{lastRow ? lastRow.output || "(nothing)" : ""}</b><i aria-hidden="true" /></p>

        <div className="sy-tools">
          {!ran ? <p className="sy-locked"><Lock size={15} /> {level.incident ? "LOCKED UNTIL YOU WATCH THE INCIDENT" : "LOCKED UNTIL THE YARD HAS RUN ONCE"}</p>
            : level.tool === "blocks" ? <>
              <small><Blocks size={15} /> Code blocks · {target === undefined ? "tap a line to send it back" : `for line ${target + 1}`}</small>
              <div className="sy-bank">{bank.map((line) => <button key={line} data-line={line} className={used.has(line) ? "is-used" : ""} disabled={locked || shipped || used.has(line) || target === undefined}
                onClick={() => { setLines(lines.map((item, m) => m === target ? line : item)); setSelected(null); }}><code><Cs code={show(line)} /></code></button>)}</div>
              <button className="sy-small" disabled={locked || shipped} onClick={() => { setLines([...level.preset]); setSelected(null); }}><RotateCcw size={14} /> Reset</button>
            </>
              : level.tool === "dial" ? <div className="sy-dial">
                <small><Gauge size={15} /> Sensor dial · <code><Cs code={`${level.variable} ${dial.op} ${dial.n}`} /></code></small>
                <div className="sy-ops" role="group" aria-label="Operator">{level.ops!.map((op) => <button key={op} aria-pressed={dial.op === op} disabled={locked || shipped} onClick={() => setLines(lines.map((item, m) => m === 1 ? dialLine(level.variable, op, dial.n) : item))}>{op}</button>)}</div>
                {level.dialRange && <div className="sy-number">
                  <button aria-label="Lower the number" disabled={locked || shipped || dial.n <= level.dialRange[0]} onClick={() => setLines(lines.map((item, m) => m === 1 ? dialLine(level.variable, dial.op, dial.n - 1) : item))}>−</button>
                  <input type="range" aria-label="Sensor number" min={level.dialRange[0]} max={level.dialRange[1]} value={dial.n} disabled={locked || shipped} onChange={(event) => setLines(lines.map((item, m) => m === 1 ? dialLine(level.variable, dial.op, Number(event.target.value)) : item))} />
                  <button aria-label="Raise the number" disabled={locked || shipped || dial.n >= level.dialRange[1]} onClick={() => setLines(lines.map((item, m) => m === 1 ? dialLine(level.variable, dial.op, dial.n + 1) : item))}>+</button>
                </div>}
                {level.swap && <button className="sy-swap" disabled={locked || shipped} onClick={() => setLines(swapStations(lines))}>⇅ SWAP STATIONS</button>}
              </div>
                : level.tool === "ifs" ? <>
                  <small><Split size={15} /> Switch tests · pick one</small>
                  <div className="sy-bank">{bank.map((line) => <button key={line} data-line={line} aria-pressed={lines[1] === line} disabled={locked || shipped} onClick={() => setLines(lines.map((item, m) => m === 1 ? line : item))}><code><Cs code={line} /></code></button>)}</div>
                  {level.swap && <button className="sy-swap" disabled={locked || shipped} onClick={() => setLines(swapStations(lines))}>⇅ SWAP STATIONS</button>}
                </>
                  : stage === "timetable" ? <div className="sy-picks">
                    <small><Clock3 size={15} /> Your timetable · three trains that prove the rule</small>
                    <div>{picks.map((value, i) => <div key={i} className="sy-number">
                      <button aria-label={`Train ${i + 1} lower`} disabled={busy || value <= level.min} onClick={() => { setPicks(picks.map((v, j) => j === i ? v - 1 : v)); clear(); }}>−</button>
                      <output aria-label={`Train ${i + 1}`}>{value}</output>
                      <button aria-label={`Train ${i + 1} higher`} disabled={busy || value >= level.max} onClick={() => { setPicks(picks.map((v, j) => j === i ? v + 1 : v)); clear(); }}>+</button>
                    </div>)}</div>
                  </div> : <p className="sy-locked is-info"><Keyboard size={16} /> Type the switch. The track builds itself as you write.</p>}
        </div>
      </aside>

      <div className="sy-right">
        <div className="sy-stage">
          <TrackDiagram yard={yard} train={train} lever={lever} readout={readout} arrived={arrived} duration={900 * (slow ? 1 : 0.2)} />
          <NumberLine level={level} yard={yard} trains={timetable} current={train?.value ?? null} />
          {/* The caption: what to do now, or what just happened. */}
          <p className={`sy-verdict ${tone ? `is-${tone}` : ""}`} role="status">{caption(hint)}</p>
          {asking && <div className="sy-overlay sy-predict" role="group" aria-label="Predict the track">
            <small>BEFORE IT RUNS</small>
            <p>Train <b>{String(level.spotlight)}</b> is next. Which card will it reach?</p>
            <div><button className="is-true" onClick={() => predict("true")}>▲ TRUE TRACK</button><button className="is-false" onClick={() => predict("false")}>▼ ELSE TRACK</button></div>
          </div>}
          {shipped && <div className="sy-overlay sy-shipped" role="dialog" aria-label="Level shipped">
            <span className="sy-stamp">SHIPPED</span>
            <div className="sy-stars" aria-label={`${p.yardStars[index]} stars`}>{[0, 1, 2].map((n) => <Star key={n} size={28} className={n < p.yardStars[index] ? "is-on" : ""} />)}</div>
            <p className="sy-why-q">{level.why.question}</p>
            <div className="sy-why">{whyOrder(index, level.why.options.length, level.why.answer).map((i) => <button key={level.why.options[i]} disabled={why === level.why.answer}
              className={why === i ? i === level.why.answer ? "is-right" : "is-wrong" : ""} onClick={() => setWhy(i)}>{level.why.options[i]}</button>)}</div>
            {why !== null && <p className="sy-why-explain">{why === level.why.answer ? <><b>Right.</b> {level.why.explain} {level.note}</> : <><b>Not that one.</b> Read the trains on the board, then try again.</>}</p>}
            {why === level.why.answer && <button className="sy-go is-cue" onClick={next}>{last ? "BACK TO THE SWITCHYARD" : "NEXT LEVEL"} <ArrowRight size={16} /></button>}
          </div>}
        </div>

        <div className="sy-bottom">
          <div className={`sy-world ${lastRow && printed !== null ? lastRow.ok ? "is-ok" : "is-wrong" : ""}`}>
            <div className="sy-world-head"><small>{level.place}</small>{lastRow && printed !== null && <em>{lastRow.ok ? <><Check size={13} strokeWidth={3} /> matches the rule</> : <><X size={13} strokeWidth={3} /> the rule wants “{lastRow.want}”</>}</em>}</div>
            <WorldArt level={level} value={trainValue} printed={printed} />
          </div>
          <div className="sy-desk">
            <div className="sy-board" aria-label="Timetable">
              <small><Clock3 size={15} /> Timetable</small>
              <ol>{timetable.map((value, i) => {
                const done = board[i];
                return <li key={`${String(value)}-${i}`} className={done ? done.ok ? "is-ok" : "is-wrong" : train && board.length === i && busy ? "is-running" : ""}>
                  <b>{String(value)}</b>
                  <span>{done ? done.route.stop === "station" ? `“${done.output || "nothing"}”` : done.route.stop === "buffer" ? "DEAD END" : done.route.stop === "jam" ? "JAMMED" : "NO TRACK" : "…"}</span>
                  {done && <i className={`sy-mini-stamp ${done.ok ? "is-ok" : "is-wrong"}`}>{done.ok ? "OK" : "WRONG"}</i>}
                </li>;
              })}</ol>
            </div>
            {shippedBefore && !shipped ? <div className="sy-replay">
              <button className="sy-go" disabled={!canRun} onClick={start}>{runLabel}</button>
              <button className="sy-small" onClick={next}>{last ? "SWITCHYARD" : "NEXT LEVEL"} <ArrowRight size={14} /></button>
            </div> : <button className={`sy-go ${canRun && !board.length ? "is-cue" : ""}`} disabled={!canRun} onClick={start}>{busy ? "RUNNING…" : runLabel}</button>}
          </div>
        </div>
      </div>
    </div>
  </>;
}
