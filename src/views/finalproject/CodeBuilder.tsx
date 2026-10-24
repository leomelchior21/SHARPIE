import { Fragment, useState, type ReactNode } from "react";
import { Check, FlaskConical, Lightbulb, Lock, RotateCcw, X } from "lucide-react";
import { SyntaxLine } from "../../components/SyntaxLine";
import { challenges, type Challenge, type Input, type Line } from "./content";
import { conditionResult, linesToPieces, runProgram, validateLines } from "./logic";
import { award, type Progress, type Update } from "./progress";
import { useExecution } from "./shared";
import { AppPreview } from "./AppPreview";
import { Coach, LabInput, StoryHead, Ticket } from "./LabParts";
import { boundaryCases } from "./labStories";

const groups = [{ label: "A · STRUCTURE", from: 0, to: 2 }, { label: "B · CONTROL", from: 3, to: 5 }, { label: "C · THE DIGITAL WORLD", from: 6, to: 9 }];
const slotLabels = ["Create the variable", "Test a condition", "IF action", "ELSE path", "ELSE action"];

export function CodeBuilder({ progress: p, update, onFinish }: { progress: Progress; update: Update; onFinish: () => void }) {
  return <section className="lab-builder">
    <Builder key={p.builderIndex} progress={p} update={update} onFinish={onFinish} />
  </section>;
}

function Tickets({ progress: p, update, coach }: { progress: Progress; update: Update; coach: ReactNode }) {
  return <div className="lab-builder-top">
    <nav className="lab-tickets" aria-label="Code Builder challenges">
      {groups.map((group) => <div key={group.label} className="lab-ticket-group">
        <small>{group.label}</small>
        <div>{challenges.slice(group.from, group.to + 1).map((c, offset) => {
          const i = group.from + offset;
          return <button key={c.id} aria-label={`Challenge ${i + 1}: ${c.title}`} aria-pressed={p.builderIndex === i} className={p.built.includes(i) ? "is-done" : ""} onClick={() => update((current) => ({ ...current, builderIndex: i }))}>
            {p.built.includes(i) ? <Check size={14} /> : i + 1}
          </button>;
        })}</div>
      </div>)}
    </nav>
    {coach}
    <span className="lab-tickets-count">{p.built.length} / 10 SHIPPED</span>
  </div>;
}

// What a program prints for one input, or null while it is incomplete or out of order.
function printed(s: Challenge, pieces: string[] | null, input: Input): string | null {
  if (!pieces) return null;
  try { return conditionResult(pieces[0], s.variable, input) ? pieces[1] : pieces[2]; } catch { return null; }
}

// The bank keeps the same shuffled order every visit, so a student can come back to a ticket.
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
const shuffled = (lines: Line[], seed: string) => [...lines].sort((a, b) => hash(seed + a) - hash(seed + b));

function Builder({ progress: p, update, onFinish }: { progress: Progress; update: Update; onFinish: () => void }) {
  const i = p.builderIndex;
  const s = challenges[i];
  const level = s.level;
  const built = p.built.includes(i);
  const draft = p.drafts[s.id];
  const lines = level.preset.map((line, n) => level.given.includes(n) ? line : draft?.[n] ?? line);
  const [value, setValue] = useState<Input>(s.initial);
  const [selected, setSelected] = useState<number | null>(null);
  // Debug tickets open their lines only after the broken program has run once.
  const [ran, setRan] = useState(built);
  const [prediction, setPrediction] = useState<{ value: Input; message: string } | null>(null);
  const [hint, setHint] = useState(0);
  const [tested, setTested] = useState<{ valid: boolean; message: string } | null>(null);
  const [output, setOutput] = useState("");
  const { run, busy, error } = useExecution();
  const debug = level.repair.length > 0;
  const predicted = !level.predict || built || prediction !== null;
  const open = [0, 1, 2, 3, 4].filter((n) => !level.given.includes(n));
  const locked = (n: number) => level.given.includes(n) || (debug && !ran);
  const firstEmpty = open.find((n) => !lines[n]);
  const target = selected !== null && !lines[selected] ? selected : firstEmpty;
  const filled = firstEmpty === undefined;
  const used = new Set(open.map((n) => lines[n]).filter(Boolean));
  const pieces = linesToPieces(lines);
  const cases = boundaryCases(s.condition, s.initial, s.step, s.min, s.max);
  const expected = (input: Input) => conditionResult(s.condition, s.variable, input) ? s.yes : s.no;
  const shipped = tested?.valid && !!output;
  const last = i === challenges.length - 1;
  const bank = level.ordered ? level.bank : shuffled(level.bank, s.id);
  const show = (line: Line) => line === "decl" ? `${typeof value === "boolean" ? "bool" : "int"} ${s.variable} = ${String(value)};` : line;

  const change = (next: Line[]) => {
    update((current) => ({ ...current, drafts: { ...current.drafts, [s.id]: next } }));
    setTested(null);
    setOutput("");
  };
  const add = (line: Line) => {
    if (target === undefined) return;
    change(lines.map((item, n) => n === target ? line : item));
    setSelected(null);
  };
  const remove = (n: number) => {
    change(lines.map((item, m) => m === n ? "" : item));
    setSelected(n);
  };
  const test = () => run(async (signal) => {
    const checked = validateLines(s, lines);
    setTested(checked);
    setRan(true);
    if (!checked.valid) return;
    setOutput(await runProgram(s, value, pieces!, signal));
    update((current) => award({ ...current, built: [...new Set([...current.built, i])] }, `builder:${i}`, 30));
  });

  const steps = level.predict ? ["PREDICT", "BUILD", "RUN TESTS"] : debug ? ["RUN IT", "FIX THE BUG", "RUN TESTS"] : ["BUILD", "RUN TESTS", "SHIP"];
  const buildStep = level.predict || debug ? 1 : 0;
  const guess = prediction && (prediction.message === expected(prediction.value)
    ? `✓ You predicted “${prediction.message}”. Correct.`
    : `✗ You predicted “${prediction.message}”, but with ${s.variable} = ${String(prediction.value)} it prints “${expected(prediction.value)}”.`);
  const coach = <Coach steps={steps} step={shipped ? 3 : busy ? buildStep + 1 : !predicted || (debug && !ran) ? 0 : filled && !tested ? buildStep + 1 : buildStep} tone={error || (tested && !tested.valid) ? "wrong" : shipped ? "done" : undefined}>
    {error || (shipped ? `${guess ? `${guess} ` : ""}All tests pass! Tap ${last ? "BACK TO THE LAB" : "NEXT TICKET"}.`
      : busy ? "Running your tests…"
      : !predicted ? `Predict first: with ${s.variable} = ${String(value)}, what will the finished program print?`
      : debug && !ran ? "This code has a bug. Tap RUN TESTS and read what goes wrong."
      : tested && !tested.valid ? `✗ ${tested.message}${filled ? " Tap a wrong line to send it back to the bank." : ""}`
      : !filled ? level.labels ? `Tap the bank lines in order. Line ${target! + 1}: ${slotLabels[target!].toLowerCase()}.` : debug ? `Pick the fix for line ${target! + 1} from the bank.` : `Build line ${target! + 1}: tap its code in the bank.`
      : "Program complete. Check the spec, then tap RUN TESTS.")}
  </Coach>;

  const row = (n: number) => {
    const line = lines[n];
    const className = `lab-pline ${n === 2 || n === 4 ? "is-indent" : ""}`;
    if (level.given.includes(n)) return <div className={`${className} is-given`}><span className="lab-line-number">{n + 1}</span><code><SyntaxLine code={show(line)} /></code></div>;
    return <div className={className}>
      <span className="lab-line-number">{n + 1}</span>
      <button className={`lab-slot ${line ? "is-filled" : ""} ${predicted && !locked(n) && target === n ? "is-selected" : ""}`} data-slot={n} disabled={busy || !predicted || locked(n)} aria-label={line ? `Line ${n + 1}: ${show(line)}. Remove` : `Line ${n + 1}: empty`} onClick={() => line ? remove(n) : setSelected(n)}>
        {line ? <><SyntaxLine code={show(line)} />{!locked(n) && <X size={13} className="lab-slot-x" />}</> : <span>{level.labels ? slotLabels[n] : "?"}</span>}
      </button>
    </div>;
  };

  return <>
  <Tickets progress={p} update={update} coach={coach} />
  <div className="lab-builder-grid">
    <div className="lab-col lab-col--brief">
      <StoryHead id={s.id} kicker={`TICKET ${String(i + 1).padStart(2, "0")} · ${level.skill.toUpperCase()}`} title={s.title} />
      <Ticket id={s.id} />
      <div className="lab-panel lab-spec">
        <div className="lab-panel-label">SPEC · THE TESTS YOUR CODE MUST PASS</div>
        <table>
          <thead><tr><th>{s.variable}</th><th>expected</th><th>your code</th></tr></thead>
          <tbody>{cases.map((input) => {
            const want = expected(input);
            const got = printed(s, pieces, input);
            const status = !tested || got === null ? "pending" : got === want ? "pass" : "fail";
            return <tr key={String(input)} className={`is-${status}`}>
              <td><code>{String(input)}</code></td>
              <td>“{want}”</td>
              <td>{status === "pending" ? <span className="lab-muted">?</span> : <>{status === "pass" ? <Check size={14} /> : <X size={14} />} “{got}”</>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className="lab-hints">
        <button disabled={hint >= s.hints.length} onClick={() => setHint((level) => level + 1)}><Lightbulb size={14} /> {hint >= s.hints.length ? "All hints shown" : `Hint ${hint + 1} of ${s.hints.length}`}</button>
        {hint > 0 && <p role="status">{s.hints[hint - 1]}</p>}
      </div>
    </div>

    <div className="lab-panel lab-col--assembly">
      <div className="lab-window-bar" aria-hidden="true"><i /><i /><i /><span>Program.cs</span><em>{open.filter((n) => lines[n]).length} / {open.length} {open.length === 1 ? "LINE" : "LINES"}</em></div>
      <div className="lab-program">{[0, 1, 2, 3, 4].map((n) => <Fragment key={n}>
        {row(n)}
        {(n === 1 || n === 3) && <div className="lab-brace">{"{"}</div>}
        {(n === 2 || n === 4) && <div className="lab-brace">{"}"}</div>}
      </Fragment>)}</div>
      <div className="lab-tray">
        {!predicted ? <div className="lab-predict is-cue" role="group" aria-label="Predict the output">
          <small>PREDICT FIRST · {s.variable} = {String(value)} · WHAT WILL IT PRINT?</small>
          <div>{[s.yes, s.no].map((message) => <button key={message} onClick={() => setPrediction({ value, message })}><span>“{message}”</span></button>)}</div>
        </div> : <>
          <small>{debug && !ran ? <><Lock size={11} /> CODE BANK · RUN THE CODE FIRST</> : target === undefined ? "CODE BANK · TAP A LINE ABOVE TO SWAP IT" : `CODE BANK · TAP THE CODE FOR LINE ${target + 1}`}</small>
          <div className="lab-pieces">{bank.map((line) => <button key={line} data-line={line} className={used.has(line) ? "is-used" : ""} disabled={busy || used.has(line) || target === undefined || (debug && !ran)} onClick={() => add(line)}>
            <SyntaxLine code={show(line)} />
          </button>)}</div>
          <div className="lab-tray-actions">
            <button disabled={busy || (debug && !ran)} onClick={() => { change([...level.preset]); setSelected(null); }}><RotateCcw size={14} /> Reset</button>
          </div>
        </>}
      </div>
    </div>

    <div className="lab-col lab-col--test">
      <AppPreview id={s.id} variable={s.variable} value={value} output={output || printed(s, pieces, value)} label={output ? "C# OUTPUT" : "YOUR CODE · LIVE"} />
      <div className="lab-panel lab-controls">
        <LabInput scenario={s} value={value} disabled={busy} onChange={(next) => { setValue(next); setOutput(""); }} />
        {shipped ? <div className="lab-done" role="status">
          <strong><Check size={16} /> Shipped. Every test passes.</strong>
          <p>{s.note}</p>
          <button className="fp-primary is-cue" onClick={() => last ? onFinish() : update((current) => ({ ...current, builderIndex: i + 1 }))}>{last ? "BACK TO THE LAB" : "NEXT TICKET →"}</button>
        </div> : <button className={`fp-primary lab-run ${predicted && filled && !tested && !busy ? "is-cue" : ""}`} disabled={busy || !predicted || !filled} onClick={test}><FlaskConical size={16} /> {busy ? "RUNNING…" : "RUN TESTS"}</button>}
      </div>
    </div>
  </div>
  </>;
}
