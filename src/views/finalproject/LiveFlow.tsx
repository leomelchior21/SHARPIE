import { useState } from "react";
import { Check, CircleDashed, Play, Sparkles } from "lucide-react";
import { flows, program } from "./content";
import { conditionResult, runProgram } from "./logic";
import { award, type Progress, type Update } from "./progress";
import { useExecution, waitStep } from "./shared";
import { FlowDiagram } from "./FlowDiagram";
import { AppPreview } from "./AppPreview";
import { LabCode, LabInput, StoryHead, Ticket } from "./LabParts";
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
    <p className="lab-intro-goal">Run the program, watch it decide, and find an input for <b>each</b> path. Before every run you predict which path it will take.</p>
    <button className="fp-primary lab-cta" onClick={() => setStarted(true)}>START LIVE FLOW</button>
    </div>
    <AppPreview id={s.id} variable={s.variable} value={value} output={null} label="CLIENT APP" />
  </section>;

  const activeLine = phase === 2 ? 0 : phase === 3 ? 2 : phase === 4 ? (result ? 3 : 7) : phase === 5 ? (result ? 4 : 8) : -1;
  const states = phase >= 4 ? traceProgram(code).lines : undefined;
  const steps = [
    { at: 2, code: code.split("\n")[0], note: "stores the input" },
    { at: 3, code: substitute(s.condition, s.variable, value), note: phase >= 4 ? `is ${result}` : "is checked…" },
    { at: 4, code: result ? "if { … }" : "else { … }", note: result ? "the IF block runs, ELSE is skipped" : "the IF block is skipped, ELSE runs" },
    { at: 5, code: `Console.WriteLine("${result ? s.yes : s.no}")`, note: "prints the message" },
  ];
  const otherPath = seen.length === 1 ? (seen[0] === "true" ? "FALSE" : "TRUE") : null;

  return <section className="lab-flow">
    <StoryHead id={s.id} kicker={`LIVE FLOW · TICKET ${index + 1} / ${flows.length}`} title={s.title}>
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
          <LabInput scenario={s} value={value} disabled={busy} onChange={(next) => setValue(Number(next))} />
          {done && !busy ? <div className="lab-done" role="status">
            <strong><Sparkles size={16} /> Both paths explored</strong>
            <p>{s.note}</p>
            <button className="fp-primary" onClick={next}>{last ? "OPEN THE CODE BUILDER →" : "NEXT TICKET →"}</button>
          </div> : predicting ? <div className="lab-predict" role="group" aria-label="Predict the path">
            <small>PREDICT FIRST · WHICH PATH WILL RUN?</small>
            <div>
              <button className="is-true" onClick={() => start(true)}><b>TRUE</b><span>“{s.yes}”</span></button>
              <button className="is-false" onClick={() => start(false)}><b>FALSE</b><span>“{s.no}”</span></button>
            </div>
          </div> : <button className="fp-primary lab-run" disabled={busy} onClick={() => setPredicting(true)}><Play size={16} fill="currentColor" /> {busy ? "RUNNING…" : "PREDICT & RUN"}</button>}
          <p className={`lab-verdict ${verdict ? (verdict.predicted === verdict.result ? "is-right" : "is-wrong") : ""}`} role="status">
            {error || (verdict
              ? verdict.predicted === verdict.result
                ? `✓ You predicted ${String(verdict.result).toUpperCase()}. Correct.${otherPath ? ` Now find a value for the ${otherPath} path.` : ""}`
                : `✗ You predicted ${String(verdict.predicted).toUpperCase()}, but ${substitute(s.condition, s.variable, value)} is ${verdict.result}.${otherPath ? ` Now find a value for the ${otherPath} path.` : ""}`
              : otherPath ? `Change the input so the ${otherPath} path runs.` : "Pick an input, predict the path, run.")}
          </p>
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
        <div className="lab-panel lab-trace">
          <div className="lab-panel-label">STEP BY STEP</div>
          <ol>{steps.map((step) => <li key={step.at} className={phase >= step.at ? "is-shown" : ""}>
            <code>{step.code}</code><span>{step.note}</span>
          </li>)}</ol>
        </div>
      </div>
    </div>
  </section>;
}
