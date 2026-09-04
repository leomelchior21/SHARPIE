import { ArrowLeft, ArrowRight, Check, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { variableRunLessons } from "../data/variableRunLessons";
import type { VariableRunLesson } from "../data/variableRunLessons";
import { memoryProgress } from "../lib/memoryProgress";

type Result = "correct" | "wrong" | null;

export function VariableRun({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const unlocked = memoryProgress.isVariableRunUnlocked();
  const [lessonIndex, setLessonIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [result, setResult] = useState<Result>(null);
  const [finalPhase, setFinalPhase] = useState<"predict" | "build">("predict");
  const [finished, setFinished] = useState(false);
  const lesson = variableRunLessons[lessonIndex];
  const finalPredictionOnly = lesson.type === "final" && finalPhase === "predict";
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
          </div>
          <footer><span>READ-ONLY EXAMPLE</span><span>VARIABLE BASICS</span></footer>
        </section>

        <section className={`run-quiz-panel ${result ? `result-${result}` : ""}`} aria-live="polite">
          <header className="run-panel-header"><div><span>02</span><strong>CHALLENGE</strong></div><small>{String(lesson.id).padStart(2, "0")} / 10</small></header>
          <div className="run-quiz-content">
            <p className="run-eyebrow">{lesson.eyebrow}</p>
            <h1>{lesson.title}</h1>
            <p className="run-question">{lesson.type === "final" && finalPhase === "build" ? "Now build both variables." : lesson.question}</p>

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
