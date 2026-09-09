import CodeMirror from "@uiw/react-codemirror";
import { ArrowLeft, ArrowRight, Bug, Check, Gem, LockKeyhole, Play, RadioTower, Rocket, RotateCcw, Sparkles, Star, Timer, Trophy, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Brand } from "../components/Brand";
import { variableRunLessons } from "../data/variableRunLessons";
import type { VariableRunLesson } from "../data/variableRunLessons";
import { memoryProgress } from "../lib/memoryProgress";
import { csharpEditorExtensions } from "../lib/csharpSyntax";
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
  const [finalBonusXp, setFinalBonusXp] = useState(0);
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

  if (finished) return <VariableRunComplete onFinish={onFinish} bonusXp={finalBonusXp} />;

  if (lesson.type === "final" && finalPhase === "sandbox") {
    return <SandboxFinal onBack={onBack} onFinish={(bonusXp) => { memoryProgress.completeVariableRun(); setFinalBonusXp(bonusXp); setFinished(true); }} />;
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
            <button className={`memory-primary run-check-button ${result === "correct" ? "progress-ready" : ""}`} disabled={!canCheck} onClick={result === "correct" ? continueRun : check}>
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
  const parts = line.split(/(\/\/.*|"(?:\\.|[^"\\])*"|\bConsole\s*\.\s*Write(?:Line)?\b|\b(?:string|int)\b|\b\d+\b|\b[A-Za-z_]\w*\b)/g).filter(Boolean);
  return <>{parts.map((part, index) => {
    const className = part.startsWith("//") ? "syn-comment" : part.startsWith('"') ? "syn-string" : /^(string|int)$/.test(part) ? "syn-type" : /^Console\s*\.\s*Write(?:Line)?$/.test(part) ? "syn-method" : /^\d+$/.test(part) ? "syn-number" : /^\w+$/.test(part) ? "syn-variable" : "";
    return <span className={className} key={`${part}-${index}`}>{part}</span>;
  })}</>;
}

export type SandboxChallenge = {
  mode: "practice" | "timed";
  title: string;
  instruction: string;
  editorHint: string;
  success: string;
  starter: string;
  timeLimit?: number;
  baseXp?: number;
  validate: (code: string, output: string) => boolean;
};

const writesVariable = (code: string, variable: string) => new RegExp(`Console\\s*\\.\\s*Write(?:Line)?\\s*\\([^;]*\\b${variable}\\b[^;]*\\)\\s*;`).test(code);
const outputIs = (output: string, expected: string) => output.trimEnd() === expected;

export const sandboxChallenges: SandboxChallenge[] = [
  {
    mode: "practice",
    title: "Create a string variable",
    instruction: "Create a string named favoriteColor, then run the code.",
    editorHint: "CREATE ONE STRING",
    success: "String variable created.",
    starter: `// Create a string variable named favoriteColor.

Console.WriteLine(favoriteColor);`,
    validate: (code: string) => /\bstring\s+favoriteColor\s*=\s*"(?:\\.|[^"\\])*"\s*;/.test(code),
  },
  {
    mode: "practice",
    title: "Create an int variable",
    instruction: "Create an int named favoriteNumber, then run the code.",
    editorHint: "CREATE ONE INT",
    success: "Int variable created.",
    starter: `// Create an int variable named favoriteNumber.

Console.WriteLine(favoriteNumber);`,
    validate: (code: string) => /\bint\s+favoriteNumber\s*=\s*-?\d+\s*;/.test(code),
  },
  {
    mode: "practice",
    title: "Create two variables",
    instruction: "Create a string named name and an int named age so the message can run.",
    editorHint: "CREATE A STRING + INT",
    success: "String and int variables created.",
    starter: `// Create a string named name and an int named age.

Console.WriteLine("Hello, my name is: " + name + " and my age is: " + age);`,
    validate: (code: string) => /\bstring\s+name\s*=\s*"(?:\\.|[^"\\])*"\s*;/.test(code) && /\bint\s+age\s*=\s*-?\d+\s*;/.test(code),
  },
  {
    mode: "timed",
    title: "Name the hero",
    instruction: "Create string heroName with the value Nova, then print: Hero: Nova",
    editorHint: "VARIABLE + WRITELINE",
    success: "Hero signal transmitted.",
    timeLimit: 45,
    baseXp: 40,
    starter: `// Create string heroName = "Nova"
// Print exactly: Hero: Nova`,
    validate: (code, output) => /\bstring\s+heroName\s*=\s*"Nova"\s*;/.test(code) && writesVariable(code, "heroName") && outputIs(output, "Hero: Nova"),
  },
  {
    mode: "timed",
    title: "Count the coins",
    instruction: "Create int coins with the value 25, then print: Coins: 25",
    editorHint: "VARIABLE + WRITELINE",
    success: "Coin count locked in.",
    timeLimit: 45,
    baseXp: 40,
    starter: `// Create int coins = 25
// Print exactly: Coins: 25`,
    validate: (code, output) => /\bint\s+coins\s*=\s*25\s*;/.test(code) && writesVariable(code, "coins") && outputIs(output, "Coins: 25"),
  },
  {
    mode: "timed",
    title: "Set the destination",
    instruction: "Create string destination with the value Mars, then print: Next stop: Mars",
    editorHint: "VARIABLE + WRITELINE",
    success: "Destination confirmed.",
    timeLimit: 40,
    baseXp: 50,
    starter: `// Create string destination = "Mars"
// Print exactly: Next stop: Mars`,
    validate: (code, output) => /\bstring\s+destination\s*=\s*"Mars"\s*;/.test(code) && writesVariable(code, "destination") && outputIs(output, "Next stop: Mars"),
  },
  {
    mode: "timed",
    title: "Finish the laps",
    instruction: "Create int laps with the value 3. Use Console.Write to print: Laps left: 3",
    editorHint: "VARIABLE + CONSOLE.WRITE",
    success: "Lap counter is live.",
    timeLimit: 40,
    baseXp: 50,
    starter: `// Create int laps = 3
// Use Console.Write to print exactly: Laps left: 3`,
    validate: (code, output) => /\bint\s+laps\s*=\s*3\s*;/.test(code) && /Console\s*\.\s*Write\s*\([^;]*\blaps\b[^;]*\)\s*;/.test(code) && outputIs(output, "Laps left: 3"),
  },
  {
    mode: "timed",
    title: "Combine two memories",
    instruction: "Create string pet as Pixel and int tricks as 4, then print: Pixel knows 4 tricks.",
    editorHint: "2 VARIABLES + WRITELINE",
    success: "Final combo complete.",
    timeLimit: 55,
    baseXp: 75,
    starter: `// Create string pet = "Pixel" and int tricks = 4
// Print exactly: Pixel knows 4 tricks.`,
    validate: (code, output) => /\bstring\s+pet\s*=\s*"Pixel"\s*;/.test(code) && /\bint\s+tricks\s*=\s*4\s*;/.test(code) && writesVariable(code, "pet") && writesVariable(code, "tricks") && outputIs(output, "Pixel knows 4 tricks."),
  },
];

export const sandboxPracticeCount = sandboxChallenges.filter((challenge) => challenge.mode === "practice").length;
export const sandboxTimedCount = sandboxChallenges.filter((challenge) => challenge.mode === "timed").length;

type TouchGame = {
  title: string;
  instruction: string;
  itemLabel: string;
  color: string;
  icon: LucideIcon;
  itemCount: number;
};

const speedTouchGames: TouchGame[] = [
  { title: "Charge the terminal", instruction: "Tap every energy bolt to power the first challenge.", itemLabel: "Energy bolt", color: "#62e6ff", icon: Zap, itemCount: 4 },
  { title: "Collect the data crystals", instruction: "Touch every crystal before the data disappears.", itemLabel: "Data crystal", color: "#bd8cff", icon: Gem, itemCount: 5 },
  { title: "Plot the flight path", instruction: "Activate every star to guide the code rocket.", itemLabel: "Flight star", color: "#ffd36d", icon: Star, itemCount: 5 },
  { title: "Wake the satellites", instruction: "Tap each signal tower and bring the network online.", itemLabel: "Signal tower", color: "#78f0b4", icon: RadioTower, itemCount: 4 },
  { title: "Clear the code bugs", instruction: "Catch every bug before the final coding round.", itemLabel: "Code bug", color: "#ff879f", icon: Bug, itemCount: 5 },
];

export function isSandboxChallengeComplete(challengeIndex: number, code: string, result: RunResult | null, hasRun: boolean) {
  const challenge = sandboxChallenges[challengeIndex];
  return Boolean(challenge && result?.success && hasRun && challenge.validate(code, result.output));
}

function SandboxFinal({ onBack, onFinish }: { onBack: () => void; onFinish: (bonusXp: number) => void }) {
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [speedPhase, setSpeedPhase] = useState<"code" | "intro" | "touch">("code");
  const [touchProgress, setTouchProgress] = useState<number[]>([]);
  const challenge = sandboxChallenges[challengeIndex];
  const [code, setCode] = useState<string>(sandboxChallenges[0].starter);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [hasRun, setHasRun] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [bonusXp, setBonusXp] = useState(0);
  const [lastEarnedXp, setLastEarnedXp] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const awardedChallengesRef = useRef(new Set<number>());
  const awardedTouchGamesRef = useRef(new Set<number>());
  const extensions = useMemo(() => csharpEditorExtensions, []);
  const complete = isSandboxChallengeComplete(challengeIndex, code, result, hasRun);
  const isTimed = challenge.mode === "timed";
  const timedRound = isTimed ? challengeIndex - sandboxPracticeCount + 1 : 0;
  const practiceRound = isTimed ? sandboxPracticeCount : challengeIndex + 1;
  const touchGame = isTimed ? speedTouchGames[timedRound - 1] : null;
  const timeExpired = isTimed && timeLeft === 0 && !complete;

  useEffect(() => {
    let active = true;
    prepareCSharp()
      .then(() => { if (active) setRuntimeStatus("ready"); })
      .catch(() => { if (active) setRuntimeStatus("error"); });
    return () => { active = false; abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!isTimed || speedPhase !== "code" || complete || timeExpired) return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => current === null ? challenge.timeLimit ?? 0 : Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge.timeLimit, complete, isTimed, speedPhase, timeExpired]);

  const run = useCallback(async () => {
    if (isRunning || runtimeStatus === "loading" || !code.trim() || timeExpired) return;
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
      if (challenge.mode === "timed" && next.success && challenge.validate(code, next.output) && !awardedChallengesRef.current.has(challengeIndex)) {
        const earnedXp = (challenge.baseXp ?? 0) + Math.max(timeLeft ?? 0, 0) * 2;
        awardedChallengesRef.current.add(challengeIndex);
        setLastEarnedXp(earnedXp);
        setBonusXp((current) => current + earnedXp);
      }
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
  }, [challenge, challengeIndex, code, isRunning, runtimeStatus, timeExpired, timeLeft]);

  const resetChallenge = () => {
    abortRef.current?.abort();
    setCode(challenge.starter);
    setResult(null);
    setHasRun(false);
    setIsRunning(false);
    setLastEarnedXp(null);
    setTimeLeft(challenge.timeLimit ?? null);
  };

  const continueChallenge = () => {
    if (!complete) return;
    if (challengeIndex === sandboxChallenges.length - 1) {
      onFinish(bonusXp);
      return;
    }
    const nextIndex = challengeIndex + 1;
    const enteringSpeedRun = nextIndex === sandboxPracticeCount;
    abortRef.current?.abort();
    setChallengeIndex(nextIndex);
    setCode(sandboxChallenges[nextIndex].starter);
    setResult(null);
    setHasRun(false);
    setIsRunning(false);
    setLastEarnedXp(null);
    setTimeLeft(null);
    setTouchProgress([]);
    setSpeedPhase(enteringSpeedRun ? "intro" : sandboxChallenges[nextIndex].mode === "timed" ? "touch" : "code");
  };

  const touchItem = (itemIndex: number) => {
    if (!touchGame || touchProgress.includes(itemIndex)) return;
    setTouchProgress((current) => {
      const next = [...current, itemIndex];
      if (next.length === touchGame.itemCount && !awardedTouchGamesRef.current.has(timedRound)) {
        awardedTouchGamesRef.current.add(timedRound);
        setBonusXp((currentXp) => currentXp + 25);
      }
      return next;
    });
  };

  const beginCodeRound = () => {
    setSpeedPhase("code");
    setTimeLeft(challenge.timeLimit ?? 0);
    setCode(challenge.starter);
    setResult(null);
    setHasRun(false);
    setLastEarnedXp(null);
  };

  if (isTimed && speedPhase === "intro") {
    return <SpeedRunIntro onBack={onBack} bonusXp={bonusXp} onStart={() => setSpeedPhase("touch")} />;
  }

  if (isTimed && speedPhase === "touch" && touchGame) {
    return (
      <TouchRound
        game={touchGame}
        round={timedRound}
        totalRounds={sandboxTimedCount}
        touched={touchProgress}
        bonusXp={bonusXp}
        onBack={onBack}
        onTouch={touchItem}
        onContinue={beginCodeRound}
      />
    );
  }

  return (
    <section className={`variable-run sandbox-final screen-enter ${isTimed ? "timed-sandbox" : "practice-sandbox"}`} aria-labelledby="sandbox-title">
      <header className="variable-run-header">
        <div className="playground-identity">
          <Brand compact asButton onClick={onBack} />
          <span className="header-divider" />
          <div><span>MODULE 02</span><strong id="sandbox-title">VARIABLE RUN · {isTimed ? `SPEED RUN ${timedRound} / ${sandboxTimedCount}` : `PRACTICE ${practiceRound} / ${sandboxPracticeCount}`}</strong></div>
        </div>
        <div className="run-meta">
          {isTimed && <span className={`timer-chip ${timeExpired ? "expired" : timeLeft !== null && timeLeft <= 10 ? "urgent" : ""}`}><Timer size={14} /> {timeLeft ?? challenge.timeLimit}s</span>}
          <span className="xp-chip"><Trophy size={14} /> {bonusXp} XP</span>
          <button className="icon-text-button" onClick={onBack}><ArrowLeft size={17} /><span>MODULE</span></button>
        </div>
      </header>

      <div className="sandbox-workspace">
        <section className="work-panel editor-panel" aria-label="C# code editor">
          <header className="panel-header">
            <div><span className="panel-index">01</span><strong>CODE</strong></div>
            <div className="panel-actions">
              <button onClick={resetChallenge} aria-label="Reset exercise"><RotateCcw size={14} /> RESET</button>
              <span className="language-chip">C#</span>
            </div>
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
          <footer className="editor-footer"><span>{code.split("\n").length} LINES</span><span>{challenge.editorHint}</span></footer>
        </section>

        <section className={`work-panel output-panel ${isRunning || runtimeStatus === "loading" ? "panel-running" : ""} ${complete ? "panel-success" : ""}`} aria-live="polite">
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
            ) : timeExpired ? (
              <div className="timer-expired-state">
                <Timer size={30} />
                <h2>TIME'S UP</h2>
                <p>Reset this round and try for the XP again.</p>
              </div>
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
                {complete && <div className="output-note"><Sparkles size={14} /> {challenge.success}</div>}
                {isTimed && result.success && !complete && <div className="output-note output-miss">Match the requested variable, command, and sentence.</div>}
                {lastEarnedXp !== null && <div className="xp-earned"><Trophy size={14} /> +{lastEarnedXp} XP</div>}
              </div>
            ) : (
              <div className="empty-output"><span>&gt;_</span><p>YOUR PROGRAM WILL SPEAK HERE.</p></div>
            )}
          </div>
          <button className="run-button" onClick={() => void run()} disabled={isRunning || runtimeStatus === "loading" || !code.trim() || timeExpired}>
            <span>{isRunning ? "RUNNING" : runtimeStatus === "error" ? "RETRY C#" : "RUN"}</span>
            <Play size={19} fill="currentColor" />
          </button>
        </section>
      </div>

      <div className="sandbox-footer">
        <div className="sandbox-instruction">
          <span>{isTimed ? `SPEED RUN ${timedRound} / ${sandboxTimedCount} · UP TO ${(challenge.baseXp ?? 0) + (challenge.timeLimit ?? 0) * 2} XP` : `PRACTICE ${practiceRound} / ${sandboxPracticeCount}`}</span>
          <p><Sparkles size={16} /> <strong>{challenge.title}.</strong> {challenge.instruction}</p>
        </div>
        <button className={`memory-primary compact-button ${complete || timeExpired ? "progress-ready" : ""}`} disabled={!complete && !timeExpired} onClick={timeExpired ? resetChallenge : continueChallenge}>
          {timeExpired ? <>TRY AGAIN <RotateCcw size={17} /></> : challengeIndex === sandboxChallenges.length - 1 ? <>FINISH <Check size={17} /></> : challengeIndex === sandboxPracticeCount - 1 ? <>START SPEED RUN <Timer size={17} /></> : <>CONTINUE <ArrowRight size={17} /></>}
        </button>
      </div>
    </section>
  );
}

function SpeedRunHeader({ title, bonusXp, onBack }: { title: string; bonusXp: number; onBack: () => void }) {
  return (
    <header className="variable-run-header">
      <div className="playground-identity">
        <Brand compact asButton onClick={onBack} />
        <span className="header-divider" />
        <div><span>MODULE 02</span><strong>{title}</strong></div>
      </div>
      <div className="run-meta">
        <span className="xp-chip"><Trophy size={14} /> {bonusXp} XP</span>
        <button className="icon-text-button" onClick={onBack}><ArrowLeft size={17} /><span>MODULE</span></button>
      </div>
    </header>
  );
}

function SpeedRunIntro({ bonusXp, onBack, onStart }: { bonusXp: number; onBack: () => void; onStart: () => void }) {
  return (
    <section className="variable-run speed-run-intro screen-enter" aria-labelledby="speed-run-title">
      <SpeedRunHeader title="CHALLENGE MODE" bonusXp={bonusXp} onBack={onBack} />
      <main className="speed-run-intro-main">
        <div className="challenge-orbit" aria-hidden="true">
          <span className="orbit-ring ring-one" />
          <span className="orbit-ring ring-two" />
          <span className="challenge-rocket"><Rocket size={34} /></span>
          <i className="orbit-spark spark-one" />
          <i className="orbit-spark spark-two" />
          <i className="orbit-spark spark-three" />
        </div>
        <p className="run-eyebrow">A NEW SIGNAL IS OPEN</p>
        <h1 id="speed-run-title">ENTER THE VARIABLE SPRINT</h1>
        <p className="speed-run-lead">Five quick-touch warmups. Five timed C# missions. Build the variable, write the message, and bank as much XP as you can.</p>
        <div className="speed-run-stats" aria-label="Challenge details">
          <span><b>05</b><small>TOUCH ROUNDS</small></span>
          <span><b>05</b><small>CODE ROUNDS</small></span>
          <span><b><Timer size={20} /></b><small>TIME BONUS</small></span>
        </div>
        <button className="memory-primary progress-ready" onClick={onStart}>ENTER CHALLENGE <Zap size={18} /></button>
      </main>
    </section>
  );
}

function TouchRound({ game, round, totalRounds, touched, bonusXp, onBack, onTouch, onContinue }: { game: TouchGame; round: number; totalRounds: number; touched: number[]; bonusXp: number; onBack: () => void; onTouch: (index: number) => void; onContinue: () => void }) {
  const complete = touched.length === game.itemCount;
  const TouchIcon = game.icon;
  const touchStyle = { "--touch-color": game.color, "--touch-count": game.itemCount } as CSSProperties;

  return (
    <section className="variable-run touch-round screen-enter" style={touchStyle} aria-labelledby="touch-round-title">
      <SpeedRunHeader title={`QUICK TOUCH ${round} / ${totalRounds}`} bonusXp={bonusXp} onBack={onBack} />
      <main className={`touch-round-main ${complete ? "is-complete" : ""}`}>
        <div className="touch-round-heading">
          <p className="run-eyebrow">WARMUP · +25 XP</p>
          <h1 id="touch-round-title">{game.title}</h1>
          <p>{game.instruction}</p>
        </div>
        <div className="touch-arena" aria-label={`${game.title}: ${touched.length} of ${game.itemCount} complete`}>
          {Array.from({ length: game.itemCount }, (_, index) => {
            const isTouched = touched.includes(index);
            return (
              <button
                key={index}
                className={isTouched ? "is-touched" : ""}
                style={{ "--touch-index": index } as CSSProperties}
                onClick={() => onTouch(index)}
                disabled={isTouched}
                aria-label={`${game.itemLabel} ${index + 1}`}
                aria-pressed={isTouched}
              >
                {isTouched ? <Check size={27} /> : <TouchIcon size={30} />}
              </button>
            );
          })}
          <span className="touch-progress"><i style={{ width: `${(touched.length / game.itemCount) * 100}%` }} /></span>
        </div>
        <div className="touch-round-result" aria-live="polite">
          {complete ? <><Sparkles size={18} /><strong>WARMUP COMPLETE</strong><span>+25 XP</span></> : <span>{game.itemCount - touched.length} SIGNAL{game.itemCount - touched.length === 1 ? "" : "S"} LEFT</span>}
        </div>
        <button className={`memory-primary compact-button ${complete ? "progress-ready" : ""}`} disabled={!complete} onClick={onContinue}>
          START CODE MISSION <ArrowRight size={17} />
        </button>
      </main>
    </section>
  );
}

function VariableRunComplete({ onFinish, bonusXp }: { onFinish: () => void; bonusXp: number }) {
  return (
    <section className="variable-run-complete screen-enter">
      <div className="run-complete-card">
        <span className="complete-icon"><Check size={34} /></span>
        <p>MODULE 02 · {100 + bonusXp} XP</p>
        <h1>VARIABLE RUN COMPLETE</h1>
        <div className="complete-code">
          <code><SyntaxLine line={'string name = "Luna";'} /></code>
          <code><SyntaxLine line={"int age = 14;"} /></code>
          <br />
          <code><SyntaxLine line={'Console.WriteLine("Hello " + name);'} /></code>
          <code><SyntaxLine line={'Console.WriteLine("Age: " + age);'} /></code>
        </div>
        <strong>You cleared five timed C# challenges and created memory from scratch.</strong>
        <button className="memory-primary" onClick={onFinish}>BACK TO SHARPIE <ArrowRight size={17} /></button>
      </div>
    </section>
  );
}
