import { useState } from "react";
import { Check, Eraser, FlaskConical, Lightbulb, RotateCcw, X } from "lucide-react";
import { SyntaxLine } from "../../components/SyntaxLine";
import { challenges, type Challenge, type Input } from "./content";
import { conditionResult, runProgram, validatePieces } from "./logic";
import { award, type Progress, type Update } from "./progress";
import { useExecution } from "./shared";
import { AppPreview } from "./AppPreview";
import { LabInput, StoryHead, Ticket } from "./LabParts";
import { boundaryCases } from "./labStories";

const groups = [{ label: "A · STRUCTURE", from: 0, to: 2 }, { label: "B · CONTROL", from: 3, to: 5 }, { label: "C · THE DIGITAL WORLD", from: 6, to: 9 }];

export function CodeBuilder({ progress: p, update, onFinish }: { progress: Progress; update: Update; onFinish: () => void }) {
  return <section className="lab-builder">
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
      <span className="lab-tickets-count">{p.built.length} / 10 SHIPPED</span>
    </nav>
    <Builder key={p.builderIndex} progress={p} update={update} onFinish={onFinish} />
  </section>;
}

// What a set of pieces prints for one input, or null while slots are empty or invalid.
function printed(s: Challenge, pieces: string[], input: Input): string | null {
  if (pieces.some((piece) => !piece)) return null;
  try { return conditionResult(pieces[0], s.variable, input) ? pieces[1] : pieces[2]; } catch { return null; }
}

function Builder({ progress: p, update, onFinish }: { progress: Progress; update: Update; onFinish: () => void }) {
  const i = p.builderIndex;
  const s = challenges[i];
  const pieces = p.drafts[s.id] ?? s.preset;
  const firstEmpty = pieces.findIndex((piece) => !piece);
  const [slot, setSlot] = useState(firstEmpty < 0 ? 1 : firstEmpty);
  const [value, setValue] = useState<Input>(s.initial);
  const [hint, setHint] = useState(0);
  const [tested, setTested] = useState<{ valid: boolean; message: string } | null>(null);
  const [output, setOutput] = useState("");
  const { run, busy, error } = useExecution();
  const cases = boundaryCases(s.condition, s.initial, s.step, s.min, s.max);
  const expected = (input: Input) => conditionResult(s.condition, s.variable, input) ? s.yes : s.no;
  const shipped = tested?.valid && !!output;
  const last = i === challenges.length - 1;

  const change = (next: string[]) => {
    update((current) => ({ ...current, drafts: { ...current.drafts, [s.id]: next } }));
    setTested(null);
    setOutput("");
  };
  const place = (piece: string) => {
    const next = [...pieces];
    next[slot] = piece;
    change(next);
    const empty = next.findIndex((item) => !item);
    if (empty >= 0) setSlot(empty);
  };
  const test = () => run(async (signal) => {
    const checked = validatePieces(s, pieces);
    setTested(checked);
    if (!checked.valid) return;
    setOutput(await runProgram(s, value, pieces, signal));
    update((current) => award({ ...current, built: [...new Set([...current.built, i])] }, `builder:${i}`, 30));
  });

  const outputs = [s.yes, s.no, ...(i === 9 ? ["HIDE"] : [])];
  const slotNames = ["condition", "IF output", "ELSE output"];
  const slotButton = (n: number) => <button className={`lab-slot ${slot === n ? "is-selected" : ""} ${pieces[n] ? "is-filled" : ""}`} disabled={busy} aria-label={`Select ${slotNames[n]} slot`} aria-pressed={slot === n} onClick={() => setSlot(n)}>
    {pieces[n] ? <SyntaxLine code={n === 0 ? pieces[n] : `Console.WriteLine(${JSON.stringify(pieces[n])})`} /> : <span>{["? condition", "? IF output", "? ELSE output"][n]}</span>}
  </button>;
  const live = printed(s, pieces, value);

  return <div className="lab-builder-grid">
    <div className="lab-col lab-col--brief">
      <StoryHead id={s.id} kicker={`TICKET ${String(i + 1).padStart(2, "0")} · ${s.phase.toUpperCase()}`} title={s.title} />
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
      <div className="lab-panel-label">BUILD THE RULE · TAP A SLOT, THEN A PIECE</div>
      <div className="lab-assembly">
        <div><SyntaxLine code={`${typeof value === "boolean" ? "bool" : "int"} ${s.variable} = ${value};`} /></div>
        <div className="lab-gap" />
        <div><span className="lab-kw">if</span> ( {slotButton(0)} )</div>
        <div>{"{"}</div>
        <div className="lab-indent">{slotButton(1)} ;</div>
        <div>{"}"}</div>
        <div className="lab-kw">else</div>
        <div>{"{"}</div>
        <div className="lab-indent">{slotButton(2)} ;</div>
        <div>{"}"}</div>
      </div>
      <div className="lab-tray">
        <small>{slot === 0 ? "CONDITION PIECES" : `OUTPUT PIECES · FOR THE ${slot === 1 ? "IF" : "ELSE"} SLOT`}</small>
        <div className="lab-pieces">{(slot === 0 ? s.conditions : outputs).map((piece) => <button key={piece} disabled={busy} aria-pressed={pieces[slot] === piece} onClick={() => place(piece)}>
          <SyntaxLine code={slot === 0 ? piece : `Console.WriteLine(${JSON.stringify(piece)})`} />
        </button>)}</div>
        <div className="lab-tray-actions">
          <button disabled={busy || !pieces[slot]} onClick={() => change(pieces.map((piece, n) => n === slot ? "" : piece))}><Eraser size={14} /> Clear slot</button>
          <button disabled={busy} onClick={() => { change([...s.preset]); setSlot(s.preset.findIndex((piece) => !piece) < 0 ? 1 : s.preset.findIndex((piece) => !piece)); }}><RotateCcw size={14} /> Reset</button>
        </div>
      </div>
    </div>

    <div className="lab-col lab-col--test">
      <AppPreview id={s.id} variable={s.variable} value={value} output={output || live} label={output ? "C# OUTPUT" : "YOUR CODE · LIVE"} />
      <div className="lab-panel lab-controls">
        <LabInput scenario={s} value={value} disabled={busy} onChange={(next) => { setValue(next); setOutput(""); }} />
        {shipped ? <div className="lab-done" role="status">
          <strong><Check size={16} /> Shipped. Every test passes.</strong>
          <p>{s.note}</p>
          <button className="fp-primary" onClick={() => last ? onFinish() : update((current) => ({ ...current, builderIndex: i + 1 }))}>{last ? "CODE REVIEW →" : "NEXT TICKET →"}</button>
        </div> : <>
          <button className="fp-primary lab-run" disabled={busy} onClick={test}><FlaskConical size={16} /> {busy ? "RUNNING…" : "RUN TESTS"}</button>
          <p className={`lab-verdict ${tested ? (tested.valid ? "is-right" : "is-wrong") : ""}`} role="status">
            {error || tested?.message || "Fill the three slots, then run the tests. C# adds the braces and semicolons."}
          </p>
        </>}
      </div>
    </div>
  </div>;
}
