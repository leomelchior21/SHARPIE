import { StreamLanguage } from "@codemirror/language";
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import CodeMirror from "@uiw/react-codemirror";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Play, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "../components/Brand";
import { variableRunLessons } from "../data/variableRunLessons";
import type { VariableRunLesson } from "../data/variableRunLessons";
import { memoryProgress } from "../lib/memoryProgress";
import { executeCSharp, prepareCSharp } from "../lib/runner";
import type { RunResult } from "../types";

type Result = "correct" | "wrong" | null;

export function VariableRun({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const unlocked = memoryProgress.isVariableRunUnlocked();
  const [lessonIndex, setLessonIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [result, setResult] = useState<Result>(null);
  const [finalPhase, setFinalPhase] = useState<"predict" | "build" | "sandbox">("predict");
  const [finished, setFinished] = useState(false);
  const lesson = variableRunLessons[lessonIndex];
  const finalPredictionOnly = lesson.type === "final" && finalPhase === "predict";
  const isFinalBuild = lesson.type === "final" && finalPhase === "build";
  const completedCount = lessonIndex + (result === "correct" && !finalPredictionOnly ? 1 : 0);

  const blockValues = useMemo(
    () => selectedBlocks.map((index) => lesson.blocks?.[index] ?? ""),
    [lesson.blocks, selectedBlocks],
  );

  if (!unlocked) {
    return (
      <section className="variable-run locked-run screen-enter">
        <div className="locked-run-card">
          <LockKeyhole size={32} />
          <p>VARIABLE RUN</p>
          <h1>Complete Memory Machine first.</h1>
          <button className="memory-primary compact-button" onClick={onBack}><ArrowLeft size={17} /> BACK TO MODULE</button>
        </div>
      </section>
    );
  }

  const selectAnswer = (index: number) => {
    if (result === "correct") return;
    setSelectedAnswer(index);
    setResult(null);
  };

  const addBlock = (index: number) => {
    if (result === "correct" || selectedBlocks.includes(index)) return;
    setSelectedBlocks((current) => [...current, index]);
    setResult(null);
  };

  const removeBlock = (position: number) => {
    if (result === "correct") return;
    setSelectedBlocks((current) => current.filter((_, index) => index !== position));
    setResult(null);
  };

  const isBlockTask = lesson.type === "blocks" || (lesson.type === "final" && finalPhase === "build");
  const canCheck = isBlockTask ? selectedBlocks.length > 0 : selectedAnswer !== null;

  const check = () => {
    const correct = isBlockTask
      ? JSON.stringify(blockValues) === JSON.stringify(lesson.expectedBlocks)
      : selectedAnswer === lesson.correct;
    setResult(correct ? "correct" : "wrong");
  };

  const continueRun = () => {
    if (lesson.type === "final" && finalPhase === "predict") {
      setFinalPhase("build");
      setSelectedAnswer(null);
      setSelectedBlocks([]);
      setResult(null);
      return;
    }
    if (lesson.type === "final" && finalPhase === "build") {
      setFinalPhase("sandbox");
      setResult(null);
      return;
    }
    if (lessonIndex === variableRunLessons.length - 1) {
      memoryProgress.completeVariableRun();
      setFinished(true);
      return;
    }
    setLessonIndex((index) => index + 1);
    setSelectedAnswer(null);
    setSelectedBlocks([]);
    setResult(null);
  };

  if (finished) return <VariableRunComplete onFinish={onFinish} />;

  if (lesson.type === "final" && finalPhase === "sandbox") {
    return <SandboxFinal onBack={onBack} onFinish={() => { memoryProgress.completeVariableRun(); setFinished(true); }} />;
  }

  return (
    <section className="variable-run screen-enter" aria-labelledby="variable-run-title">
      <header className="variable-run-header">
        <div className="playground-identity">
          <Brand compact asButton onClick={onBack} />
          <span className="header-divider" />
          <div><span>MODULE 02</span><strong id="variable-run-title">VARIABLE RUN</strong></div>
        </div>
        <div className="run-meta"><span>{completedCount * 10} XP</span><button className="icon-text-button" onClick={onBack}><ArrowLeft size={17} /><span>MODULE</span></button></div>
      </header>

      <div className="variable-run-workspace">
        <ProgressRail current={lessonIndex} currentComplete={result === "correct" && !finalPredictionOnly} />

        <section className="run-code-panel" aria-label="C# code example">
          <header className="run-panel-header">
            <div><span>01</span><strong>CODE</strong></div><small>C#</small>
          </header>
          <div className="run-code-surface">
            {isFinalBuild ? (
              result === "correct" ? (
                <div className="run-code-lines code-revealed">
                  {(lesson.finalCode ?? "").split("\n").map((line, index) => (
                    <div className="run-code-line" key={`${index}-${line}`}><span>{index + 1}</span><code><SyntaxLine line={line || " "} /></code></div>
                  ))}
                </div>
              ) : (
                <div className="code-hidden">
                  <span>CODE HIDDEN</span>
                  <p>Build it from memory.</p>
                </div>
              )
            ) : (
              <>
                <div className="run-code-lines">
                  {(lesson.code ?? lesson.finalCode ?? "").split("\n").map((line, index) => (
                    <div className="run-code-line" key={`${index}-${line}`}><span>{index + 1}</span><code><SyntaxLine line={line || " "} /></code></div>
                  ))}
                </div>
                {isBlockTask && selectedBlocks.length > 0 && (
                  <div className="code-preview">
                    <span>YOUR CODE</span>
                    <code>{blockValues.map((token, index) => <span key={`${selectedBlocks[index]}-${index}`}>{token}{token === ";" && index < blockValues.length - 1 ? <br /> : " "}</span>)}</code>
                  </div>
                )}
              </>
            )}
          </div>
          <footer><span>{isFinalBuild ? "BUILD WITHOUT PEEKING" : "READ-ONLY EXAMPLE"}</span><span>VARIABLE BASICS</span></footer>
        </section>

        <section className={`run-quiz-panel ${result ? `result-${result}` : ""}`} aria-live="polite">
          <header className="run-panel-header"><div><span>02</span><strong>CHALLENGE</strong></div><small>{String(lesson.id).padStart(2, "0")} / 10</small></header>
          <div className="run-quiz-content">
            <p className="run-eyebrow">{lesson.eyebrow}</p>
            <h1>{lesson.title}</h1>
            <p className="run-question">{isFinalBuild ? "Build a new string and int without looking." : lesson.question}</p>

            {isBlockTask ? (
              <BlockChallenge lesson={lesson} selected={selectedBlocks} onAdd={addBlock} onRemove={removeBlock} onReset={() => { setSelectedBlocks([]); setResult(null); }} />
            ) : (
              <AnswerChallenge lesson={lesson} selected={selectedAnswer} onSelect={selectAnswer} />
            )}

            {result && (
              <div className={`run-feedback ${result}`}>
                {result === "correct" ? <Check size={20} /> : <Sparkles size={20} />}
                <div><strong>{result === "correct" ? "Correct." : "Not yet."}</strong><p>{result === "correct" ? lesson.feedback : lesson.hint}</p></div>
                {result === "correct" && !finalPredictionOnly && <span>+10 XP</span>}
              </div>
            )}
          </div>
          <div className="run-quiz-footer">
            <span>{result === "wrong" ? "ADJUST YOUR ANSWER AND TRY AGAIN" : result === "correct" ? "MEMORY LOCKED IN" : "SELECT AN ANSWER"}</span>
            <button className="memory-primary run-check-button" disabled={!canCheck} onClick={result === "correct" ? continueRun : check}>
              {result === "correct" ? <>CONTINUE <ArrowRight size={17} /></> : <>CHECK <Check size={17} /></>}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function ProgressRail({ current, currentComplete }: { current: number; currentComplete: boolean }) {
  return (
    <nav className="run-progress-rail" aria-label="Variable Run progress">
      <span className="progress-label">RUN</span>
      <div className="progress-track" aria-hidden="true" />
      {variableRunLessons.map((lesson, index) => {
        const state = index < current || (index === current && currentComplete) ? "complete" : index === current ? "current" : "future";
        return <div key={lesson.id} className={`progress-node ${state}`} aria-label={`Challenge ${lesson.id}, ${state}`}>{state === "complete" ? <Check size={15} /> : lesson.id}</div>;
      })}
    </nav>
  );
}

function AnswerChallenge({ lesson, selected, onSelect }: { lesson: VariableRunLesson; selected: number | null; onSelect: (index: number) => void }) {
  return (
    <div className="run-answer-list">
      {lesson.answers?.map((answer, index) => (
        <button key={answer} className={selected === index ? "selected" : ""} onClick={() => onSelect(index)}>
          <span>{String.fromCharCode(65 + index)}</span>
          {answer.includes("=") ? <code><SyntaxLine line={answer} /></code> : <strong className={answer.includes("\n") ? "multiline-answer" : ""}>{answer}</strong>}
        </button>
      ))}
    </div>
  );
}

function BlockChallenge({ lesson, selected, onAdd, onRemove, onReset }: { lesson: VariableRunLesson; selected: number[]; onAdd: (index: number) => void; onRemove: (position: number) => void; onReset: () => void }) {
  return (
    <div className="block-challenge">
      <div className="block-target" aria-label="Assembled code">
        {selected.length === 0 ? <span>Tap a block to start</span> : selected.map((blockIndex, position) => (
          <button key={`${blockIndex}-${position}`} onClick={() => onRemove(position)}>{lesson.blocks?.[blockIndex]}</button>
        ))}
      </div>
      <div className="block-bank">
        {lesson.blocks?.map((block, index) => <button key={`${block}-${index}`} disabled={selected.includes(index)} onClick={() => onAdd(index)}>{block}</button>)}
      </div>
      <button className="block-reset" onClick={onReset} disabled={selected.length === 0}><RotateCcw size={14} /> RESET BLOCKS</button>
    </div>
  );
}

function SyntaxLine({ line }: { line: string }) {
  const parts = line.split(/(\/\/.*|"(?:\\.|[^"\\])*"|\b(?:string|int|Console|WriteLine)\b|\b\d+\b)/g).filter(Boolean);
  return <>{parts.map((part, index) => {
    const className = part.startsWith("//") ? "syn-comment" : part.startsWith('"') ? "syn-string" : /^(string|int)$/.test(part) ? "syn-type" : /^(Console|WriteLine)$/.test(part) ? "syn-method" : /^\d+$/.test(part) ? "syn-number" : "";
    return <span className={className} key={`${part}-${index}`}>{part}</span>;
  })}</>;
}

const sandboxStarter = `// create a text variable and a number variable, that completes the code below:

Console.WriteLine("Hello, my name is: " + name + " and my age is: " + age);`;

function SandboxFinal({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const [code, setCode] = useState(sandboxStarter);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [hasRun, setHasRun] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const extensions = useMemo(() => [StreamLanguage.define(csharp)], []);

  useEffect(() => {
    let active = true;
    prepareCSharp()
      .then(() => { if (active) setRuntimeStatus("ready"); })
      .catch(() => { if (active) setRuntimeStatus("error"); });
    return () => { active = false; abortRef.current?.abort(); };
  }, []);

  const run = useCallback(async () => {
    if (isRunning || runtimeStatus === "loading" || !code.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setResult(null);
    try {
      if (runtimeStatus !== "ready") {
        setRuntimeStatus("loading");
        await prepareCSharp();
        setRuntimeStatus("ready");
      }
      const next = await executeCSharp(code, controller.signal);
      setResult(next);
      setHasRun(true);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setRuntimeStatus("error");
        setResult({
          success: false,
          output: "",
          durationMs: 0,
          error: {
            title: "C# COULD NOT LOAD",
            message: "The browser could not start its C# engine.",
            compiler: error instanceof Error ? error.message : "Refresh and try again.",
          },
        });
        setHasRun(true);
      }
    } finally {
      setIsRunning(false);
    }
  }, [code, isRunning, runtimeStatus]);

  const complete = Boolean(result?.success && hasRun && /\bstring\s+[A-Za-z_]\w*/.test(code) && /\bint\s+[A-Za-z_]\w*/.test(code));

  return (
    <section className="variable-run sandbox-final screen-enter" aria-labelledby="sandbox-title">
      <header className="variable-run-header">
        <div className="playground-identity">
          <Brand compact asButton onClick={onBack} />
          <span className="header-divider" />
          <div><span>MODULE 02</span><strong id="sandbox-title">VARIABLE RUN · FINAL</strong></div>
        </div>
        <div className="run-meta"><span>{complete ? "+100 XP" : "FREE CODE"}</span><button className="icon-text-button" onClick={onBack}><ArrowLeft size={17} /><span>MODULE</span></button></div>
      </header>

      <div className="sandbox-workspace">
        <section className="work-panel editor-panel" aria-label="C# code editor">
          <header className="panel-header">
            <div><span className="panel-index">01</span><strong>CODE</strong></div>
            <div className="panel-actions"><span className="language-chip">C#</span></div>
          </header>
          <div className="editor-wrap">
            <CodeMirror
              value={code}
              height="100%"
              theme="dark"
              extensions={extensions}
              onChange={(value) => { setCode(value); setResult(null); setHasRun(false); }}
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                autocompletion: true,
                bracketMatching: true,
                closeBrackets: true,
              }}
              aria-label="C# code"
            />
          </div>
          <footer className="editor-footer"><span>{code.split("\n").length} LINES</span><span>CREATE TWO VARIABLES</span></footer>
        </section>

        <section className={`work-panel output-panel ${isRunning || runtimeStatus === "loading" ? "panel-running" : ""} ${result?.success && hasRun ? "panel-success" : ""}`} aria-live="polite">
          <header className="panel-header">
            <div><span className="panel-index">02</span><strong>OUTPUT</strong></div>
            <div className="panel-actions">
              <span className={`runtime-status ${runtimeStatus === "ready" ? "status-live" : ""}`}>
                <i /> {runtimeStatus === "loading" ? "LOADING C#" : isRunning ? "RUNNING" : result?.success && hasRun ? "SIGNAL LIVE" : runtimeStatus === "error" ? "RETRY" : "C# READY"}
              </span>
            </div>
          </header>
          <div className="console-surface">
            {isRunning || runtimeStatus === "loading" ? (
              <div className="running-state"><span className="run-wave"><i /><i /><i /><i /></span><p>{isRunning ? "RUNNING C#..." : "STARTING C#..."}</p></div>
            ) : result?.error ? (
              <div className="error-state">
                <span className="error-label">C#</span>
                <h2>{result.error.title}</h2>
                <p>{result.error.message}</p>
                <div className="compiler-message"><span>COMPILER</span><code>{result.error.compiler}</code></div>
              </div>
            ) : result ? (
              <div className="output-content">
                <span className="output-prompt">SHARPIE OUTPUT /</span>
                <pre>{result.output || " "}</pre>
                {complete && <div className="output-note"><Sparkles size={14} /> Both variables created.</div>}
              </div>
            ) : (
              <div className="empty-output"><span>&gt;_</span><p>YOUR PROGRAM WILL SPEAK HERE.</p></div>
            )}
          </div>
          <button className="run-button" onClick={() => void run()} disabled={isRunning || runtimeStatus === "loading" || !code.trim()}>
            <span>{isRunning ? "RUNNING" : runtimeStatus === "error" ? "RETRY C#" : "RUN"}</span>
            <Play size={19} fill="currentColor" />
          </button>
        </section>
      </div>

      <div className="sandbox-footer">
        <p><Sparkles size={16} /> Create a text variable and a number variable so the WriteLine below works.</p>
        <button className="memory-primary compact-button" disabled={!complete} onClick={onFinish}>
          {complete ? <>FINISH <Check size={17} /></> : <>FINISH <ArrowRight size={17} /></>}
        </button>
      </div>
    </section>
  );
}

function VariableRunComplete({ onFinish }: { onFinish: () => void }) {
  return (
    <section className="variable-run-complete screen-enter">
      <div className="run-complete-card">
        <span className="complete-icon"><Check size={34} /></span>
        <p>MODULE 02 · +100 XP</p>
        <h1>VARIABLE RUN COMPLETE</h1>
        <div className="complete-code">
          <code><SyntaxLine line={'string name = "Luna";'} /></code>
          <code><SyntaxLine line={"int age = 14;"} /></code>
          <br />
          <code><SyntaxLine line={'Console.WriteLine("Hello " + name);'} /></code>
          <code><SyntaxLine line={'Console.WriteLine("Age: " + age);'} /></code>
        </div>
        <strong>You can now create memory in C#.</strong>
        <button className="memory-primary" onClick={onFinish}>BACK TO SHARPIE <ArrowRight size={17} /></button>
      </div>
    </section>
  );
}
