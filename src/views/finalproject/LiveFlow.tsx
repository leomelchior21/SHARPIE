import { useState } from "react";
import { Check, CircleDashed, Play, Sparkles } from "lucide-react";
import { flows, program } from "./content";
import { conditionResult, runProgram } from "./logic";
import { award, type Progress, type Update } from "./progress";
import { useExecution, waitStep } from "./shared";
import { FlowDiagram } from "./FlowDiagram";
import { AppPreview } from "./AppPreview";
import { Coach, LabCode, LabInput, StoryHead, Ticket } from "./LabParts";
import { substitute, traceProgram } from "./labStories";

export function LiveFlow({ progress: p, update, onComplete }: { progress: Progress; update: Update; onComplete: () => void }) {
  const [replay] = useState(() => [0, 1, 2].every((i) => p.flowPaths[i]?.length === 2));
  return <Flow key={p.flowIndex} index={p.flowIndex} progress={p} update={update} replay={replay} onComplete={onComplete} />;
}

type Verdict = { predicted: boolean; result: boolean };

function Flow({ index, progress: p, update, replay, onComplete }: { index: number; progress: Progress; update: Update; replay: boolean; onComplete: () => void }) {
  const s = flows[index];
  const value = p.flowValues[index];
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState(0);
  const [output, setOutput] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [seen, setSeen] = useState<string[]>(() => replay ? [] : p.flowPaths[index] ?? []);
  const { run, busy, error } = useExecution();
  const result = conditionResult(s.condition, s.variable, value);
  const code = program(s, value);
  const done = seen.length === 2;
  const last = index === flows.length - 1;

  const setValue = (next: number) => {
    setPhase(0);
    setOutput("");
    setVerdict(null);
    update((current) => ({ ...current, flowValues: current.flowValues.map((n, i) => i === index ? next : n) }));
  };

  const start = (predicted: boolean) => run(async (signal) => {
    setPredicting(false);
    setVerdict(null);
    setOutput("");
    setPhase(1);
    const printed = await runProgram(s, value, [s.condition, s.yes, s.no], signal);
    for (const step of [2, 3, 4, 5, 6, 7]) {
      await waitStep(signal, step === 4 ? 650 : 480);
      setPhase(step);
      if (step === 5) setOutput(printed);
    }
    setVerdict({ predicted, result });
    setSeen((paths) => [...new Set([...paths, String(result)])]);
    update((current) => award({ ...current, flowPaths: { ...current.flowPaths, [index]: [...new Set([...(current.flowPaths[index] ?? []), String(result)])] } }, `flow:${index}:${result}`, 10));
  });

  const next = () => last ? onComplete() : update((current) => ({ ...current, flowIndex: index + 1 }));

  if (!started) return <section className="lab-intro">
    <div className="lab-intro-copy">
    <StoryHead id={s.id} kicker={`LIVE FLOW · TICKET ${index + 1} / ${flows.length}`} title={s.title} />
    <Ticket id={s.id}>
      <div className="lab-rule">
        <code>if ({s.condition})</code>
        <span className="is-true">TRUE → “{s.yes}”</span>
        <span className="is-false">FALSE → “{s.no}”</span>
      </div>
    </Ticket>
    <ol className="lab-intro-goal">
      <li><b>1</b>Pick a {s.variable}.</li>
      <li><b>2</b>Guess: TRUE or FALSE?</li>
      <li><b>3</b>Watch the code decide.</li>
    </ol>
    <p className="lab-intro-win">Win the ticket: make <b>both paths</b> run.</p>
    <button className="fp-primary lab-cta is-cue" onClick={() => setStarted(true)}>START LIVE FLOW</button>
    </div>
    <AppPreview id={s.id} variable={s.variable} value={value} output={null} label="CLIENT APP" />
  </section>;

  const activeLine = phase === 2 ? 0 : phase === 3 ? 2 : phase === 4 ? (result ? 3 : 7) : phase === 5 ? (result ? 4 : 8) : -1;
  const states = phase >= 4 ? traceProgram(code).lines : undefined;
  const otherPath = seen.length === 1 ? (seen[0] === "true" ? "FALSE" : "TRUE") : null;
  // After a run the next move is a new input; before one, it is the run button.
  const cueInput = !busy && !predicting && !done && verdict !== null;
  const cueRun = !busy && !predicting && !done && verdict === null;
  const finished = done && !busy;
  const guess = verdict && (verdict.predicted === verdict.result
    ? `✓ You predicted ${String(verdict.result).toUpperCase()}. Correct.`
    : `✗ You predicted ${String(verdict.predicted).toUpperCase()}, but ${substitute(s.condition, s.variable, value)} is ${verdict.result}.`);
  const coach = <Coach steps={["SET INPUT", "PREDICT", "WATCH"]} step={finished ? 3 : busy ? 2 : predicting ? 1 : 0} tone={error ? "wrong" : verdict ? (verdict.predicted === verdict.result ? (finished ? "done" : "right") : "wrong") : finished ? "done" : undefined}>
    {error || (busy ? "Watch the token. Which path does the program take?"
      : predicting ? `${s.variable} is ${String(value)}. Will it print “${s.yes}” or “${s.no}”?`
      : finished ? `${guess ? `${guess} ` : ""}Both paths found! Tap ${last ? "TAKE THE QUIZ" : "NEXT TICKET"}.`
      : guess ? `${guess}${otherPath ? ` Now change ${s.variable} to find the ${otherPath} path.` : ""}`
      : otherPath ? `Change ${s.variable} so the ${otherPath} path runs, then tap PREDICT & RUN.` : `Pick a ${s.variable}, then tap PREDICT & RUN.`)}
  </Coach>;

  return <section className="lab-flow">
    <StoryHead id={s.id} kicker={`LIVE FLOW · TICKET ${index + 1} / ${flows.length}`} title={s.title} coach={coach}>
      <div className="lab-paths" aria-label={`${seen.length} of 2 paths explored`}>
        {(["true", "false"] as const).map((path) => <span key={path} className={`lab-path is-${path} ${seen.includes(path) ? "is-done" : ""}`}>
          {seen.includes(path) ? <Check size={14} /> : <CircleDashed size={14} />} {path.toUpperCase()} PATH
        </span>)}
      </div>
    </StoryHead>

    <div className="lab-flow-grid">
      <div className="lab-col lab-col--app">
        <AppPreview id={s.id} variable={s.variable} value={value} output={phase >= 5 ? output : null} />
        <div className="lab-panel lab-controls">
          <div className={cueInput ? "lab-cue-box is-cue" : "lab-cue-box"}><LabInput scenario={s} value={value} disabled={busy} onChange={(next) => setValue(Number(next))} /></div>
          {finished ? <div className="lab-done" role="status">
            <strong><Sparkles size={16} /> Both paths explored</strong>
            <p>{s.note}</p>
            <button className="fp-primary is-cue" onClick={next}>{last ? "TAKE THE QUIZ →" : "NEXT TICKET →"}</button>
          </div> : predicting ? <div className="lab-predict is-cue" role="group" aria-label="Predict the path">
            <small>YOUR GUESS · WHICH PATH WILL RUN?</small>
            <div>
              <button className="is-true" onClick={() => start(true)}><b>TRUE</b><span>“{s.yes}”</span></button>
              <button className="is-false" onClick={() => start(false)}><b>FALSE</b><span>“{s.no}”</span></button>
            </div>
          </div> : <button className={`fp-primary lab-run ${cueRun ? "is-cue" : ""}`} disabled={busy} onClick={() => setPredicting(true)}><Play size={16} fill="currentColor" /> {busy ? "RUNNING…" : "PREDICT & RUN"}</button>}
        </div>
      </div>

      <div className="lab-panel lab-col--chart">
        <div className="lab-panel-label">EXECUTION FLOW</div>
        <FlowDiagram scenario={s} value={value} phase={phase} result={result} />
      </div>

      <div className="lab-col lab-col--code">
        <div className="lab-panel">
          <div className="lab-panel-label">CODE · C#</div>
          <LabCode code={code} states={states} active={activeLine} />
        </div>
      </div>
    </div>
  </section>;
}
