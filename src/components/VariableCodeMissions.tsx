import CodeMirror from "@uiw/react-codemirror";
import { ArrowLeft, ArrowRight, Bug, Check, Gem, Play, RadioTower, Rocket, RotateCcw, Sparkles, Star, Timer, Trophy, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  isVariableCodeChallengeComplete,
  isVariableBuildChallengeComplete,
  variableRunPracticeChallenges,
  variableSprintBuildChallenges,
  variableSprintChallenges,
} from "../data/variableCodeChallenges";
import type { VariableBuildChallenge } from "../data/variableCodeChallenges";
import { csharpEditorBasicSetup, csharpEditorExtensions } from "../lib/csharpSyntax";
import { executeCSharp, prepareCSharp } from "../lib/runner";
import type { RunResult } from "../types";
import { Brand } from "./Brand";

type MissionMode = "practice" | "sprint";

type Props = {
  mode: MissionMode;
  onBack: () => void;
  onFinish: (earnedXp: number) => void;
};

type TouchGame = {
  title: string;
  instruction: string;
  itemLabel: string;
  color: string;
  icon: LucideIcon;
  itemCount: number;
};

export const sprintTouchGames: TouchGame[] = [
  { title: "Charge the terminal", instruction: "Tap every energy bolt to power the first challenge.", itemLabel: "Energy bolt", color: "#62e6ff", icon: Zap, itemCount: 4 },
  { title: "Collect the data crystals", instruction: "Touch every crystal before the data disappears.", itemLabel: "Data crystal", color: "#bd8cff", icon: Gem, itemCount: 5 },
  { title: "Plot the flight path", instruction: "Activate every star to guide the code rocket.", itemLabel: "Flight star", color: "#ffd36d", icon: Star, itemCount: 5 },
  { title: "Wake the satellites", instruction: "Tap each signal tower and bring the network online.", itemLabel: "Signal tower", color: "#78f0b4", icon: RadioTower, itemCount: 4 },
  { title: "Clear the code bugs", instruction: "Catch every bug before the final coding round.", itemLabel: "Code bug", color: "#ff879f", icon: Bug, itemCount: 5 },
  { title: "Boost the decimal engine", instruction: "Charge every bolt before working with double values.", itemLabel: "Decimal energy bolt", color: "#63e6be", icon: Zap, itemCount: 5 },
  { title: "Collect the badge shards", instruction: "Gather every shard to unlock the text terminal.", itemLabel: "Badge shard", color: "#c99cff", icon: Gem, itemCount: 4 },
  { title: "Light the scoreboard", instruction: "Activate each star before posting the next score.", itemLabel: "Score star", color: "#ffe066", icon: Star, itemCount: 5 },
  { title: "Link the distance beacons", instruction: "Wake every beacon to prepare the measurement channel.", itemLabel: "Distance beacon", color: "#74c0fc", icon: RadioTower, itemCount: 4 },
  { title: "Clear the final bugs", instruction: "Catch every bug before the final two-variable mission.", itemLabel: "Final code bug", color: "#ff8787", icon: Bug, itemCount: 6 },
];

function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VariableCodeMissions({ mode, onBack, onFinish }: Props) {
  const isSprint = mode === "sprint";
  const challenges = isSprint ? variableSprintChallenges : variableRunPracticeChallenges;
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [sprintPhase, setSprintPhase] = useState<"intro" | "touch" | "build" | "code">(isSprint ? "intro" : "code");
  const [touchProgress, setTouchProgress] = useState<number[]>([]);
  const [buildSelection, setBuildSelection] = useState<number[]>([]);
  const [buildResult, setBuildResult] = useState<"correct" | "wrong" | null>(null);
  const challenge = challenges[challengeIndex];
  const [code, setCode] = useState(challenge.starter);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [hasRun, setHasRun] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [lastEarnedXp, setLastEarnedXp] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const awardedChallengesRef = useRef(new Set<number>());
  const awardedTouchGamesRef = useRef(new Set<number>());
  const awardedBuildsRef = useRef(new Set<number>());
  const extensions = useMemo(() => csharpEditorExtensions, []);
  const complete = isVariableCodeChallengeComplete(challenge, code, result, hasRun);
  const round = challengeIndex + 1;
  const touchGame = isSprint ? sprintTouchGames[challengeIndex] : null;
  const buildChallenge = isSprint ? variableSprintBuildChallenges[challengeIndex] : null;

  useEffect(() => {
    let active = true;
    prepareCSharp()
      .then(() => { if (active) setRuntimeStatus("ready"); })
      .catch(() => { if (active) setRuntimeStatus("error"); });
    return () => { active = false; abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!isSprint || sprintPhase !== "code" || complete) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => (current ?? 0) + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [complete, isSprint, sprintPhase]);

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
      if (isSprint && next.success && challenge.validate(code, next.output) && !awardedChallengesRef.current.has(challengeIndex)) {
        const nextXp = challenge.baseXp ?? 0;
        awardedChallengesRef.current.add(challengeIndex);
        setLastEarnedXp(nextXp);
        setEarnedXp((current) => current + nextXp);
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
  }, [challenge, challengeIndex, code, isRunning, isSprint, runtimeStatus]);

  const resetChallenge = () => {
    abortRef.current?.abort();
    setCode(challenge.starter);
    setResult(null);
    setHasRun(false);
    setIsRunning(false);
    setLastEarnedXp(null);
    setElapsedSeconds(isSprint ? 0 : null);
  };

  const continueChallenge = () => {
    if (!complete) return;
    if (challengeIndex === challenges.length - 1) {
      onFinish(earnedXp);
      return;
    }

    const nextIndex = challengeIndex + 1;
    abortRef.current?.abort();
    setChallengeIndex(nextIndex);
    setCode(challenges[nextIndex].starter);
    setResult(null);
    setHasRun(false);
    setIsRunning(false);
    setLastEarnedXp(null);
    setElapsedSeconds(null);
    setTouchProgress([]);
    setBuildSelection([]);
    setBuildResult(null);
    setSprintPhase(isSprint ? "touch" : "code");
  };

  const touchItem = (itemIndex: number) => {
    if (!touchGame || touchProgress.includes(itemIndex)) return;
    setTouchProgress((current) => {
      if (current.includes(itemIndex)) return current;
      const next = [...current, itemIndex];
      if (next.length === touchGame.itemCount && !awardedTouchGamesRef.current.has(challengeIndex)) {
        awardedTouchGamesRef.current.add(challengeIndex);
        setEarnedXp((currentXp) => currentXp + 25);
      }
      return next;
    });
  };

  const beginBuildRound = () => {
    setBuildSelection([]);
    setBuildResult(null);
    setSprintPhase("build");
  };

  const addBuildBlock = (blockIndex: number) => {
    if (buildResult === "correct" || buildSelection.includes(blockIndex)) return;
    setBuildSelection((current) => current.includes(blockIndex) ? current : [...current, blockIndex]);
    setBuildResult(null);
  };

  const removeBuildBlock = (position: number) => {
    if (buildResult === "correct") return;
    setBuildSelection((current) => current.filter((_, index) => index !== position));
    setBuildResult(null);
  };

  const resetBuild = () => {
    if (buildResult === "correct") return;
    setBuildSelection([]);
    setBuildResult(null);
  };

  const checkBuild = () => {
    if (!buildChallenge || buildSelection.length === 0 || buildResult === "correct") return;
    const correct = isVariableBuildChallengeComplete(buildChallenge, buildSelection);
    setBuildResult(correct ? "correct" : "wrong");
    if (correct && !awardedBuildsRef.current.has(challengeIndex)) {
      awardedBuildsRef.current.add(challengeIndex);
      setEarnedXp((current) => current + 25);
    }
  };

  const beginCodeRound = () => {
    if (buildResult !== "correct") return;
    setSprintPhase("code");
    setElapsedSeconds(0);
    setCode(challenge.starter);
    setResult(null);
    setHasRun(false);
    setLastEarnedXp(null);
  };

  if (isSprint && sprintPhase === "intro") {
    return <SprintIntro onBack={onBack} earnedXp={earnedXp} onStart={() => setSprintPhase("touch")} />;
  }

  if (isSprint && sprintPhase === "touch" && touchGame) {
    return (
      <TouchRound
        game={touchGame}
        round={round}
        totalRounds={challenges.length}
        touched={touchProgress}
        earnedXp={earnedXp}
        onBack={onBack}
        onTouch={touchItem}
        onContinue={beginBuildRound}
      />
    );
  }

  if (isSprint && sprintPhase === "build" && buildChallenge) {
    return (
      <BuildRound
        challenge={buildChallenge}
        round={round}
        totalRounds={challenges.length}
        selected={buildSelection}
        result={buildResult}
        earnedXp={earnedXp}
        onBack={onBack}
        onAdd={addBuildBlock}
        onRemove={removeBuildBlock}
        onReset={resetBuild}
        onCheck={checkBuild}
        onContinue={beginCodeRound}
      />
    );
  }

  return (
    <section className={`variable-run sandbox-final screen-enter ${isSprint ? "timed-sandbox" : "practice-sandbox"}`} aria-labelledby="sandbox-title">
      <MissionHeader
        title={`${isSprint ? "VARIABLE SPRINT · SPEED RUN" : "VARIABLE RUN · PRACTICE"} ${round} / ${challenges.length}`}
        earnedXp={earnedXp}
        elapsedSeconds={isSprint ? elapsedSeconds ?? 0 : null}
        onBack={onBack}
      />

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
              basicSetup={csharpEditorBasicSetup}
              editable
              indentWithTab
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
                {isSprint && result.success && !complete && <div className="output-note output-miss">Match the requested variable, command, and sentence.</div>}
                {lastEarnedXp !== null && <div className="xp-earned"><Trophy size={14} /> +{lastEarnedXp} XP</div>}
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
        <div className="sandbox-instruction">
          <span>{isSprint ? `SPEED RUN ${round} / ${challenges.length} · +${challenge.baseXp ?? 0} XP` : `PRACTICE ${round} / ${challenges.length}`}</span>
          <p><Sparkles size={16} /> <strong>{challenge.title}.</strong> {challenge.instruction}</p>
        </div>
        <button className={`memory-primary compact-button ${complete ? "progress-ready" : ""}`} disabled={!complete} onClick={continueChallenge}>
          {challengeIndex === challenges.length - 1 ? <>FINISH <Check size={17} /></> : <>CONTINUE <ArrowRight size={17} /></>}
        </button>
      </div>
    </section>
  );
}

function MissionHeader({ title, earnedXp, elapsedSeconds, onBack }: { title: string; earnedXp: number; elapsedSeconds?: number | null; onBack: () => void }) {
  return (
    <header className="variable-run-header">
      <div className="playground-identity">
        <Brand compact asButton onClick={onBack} />
        <span className="header-divider" />
        <div><span>MODULE 02</span><strong id="sandbox-title">{title}</strong></div>
      </div>
      <div className="run-meta">
        {elapsedSeconds !== null && elapsedSeconds !== undefined && <span className="timer-chip" aria-label={`Elapsed time ${formatElapsedTime(elapsedSeconds)}`}><Timer size={14} /> {formatElapsedTime(elapsedSeconds)}</span>}
        <span className="xp-chip"><Trophy size={14} /> {earnedXp} XP</span>
        <button className="icon-text-button" onClick={onBack}><ArrowLeft size={17} /><span>MODULE</span></button>
      </div>
    </header>
  );
}

function SprintIntro({ earnedXp, onBack, onStart }: { earnedXp: number; onBack: () => void; onStart: () => void }) {
  return (
    <section className="variable-run speed-run-intro screen-enter" aria-labelledby="speed-run-title">
      <MissionHeader title="VARIABLE SPRINT" earnedXp={earnedXp} onBack={onBack} />
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
        <p className="speed-run-lead">Ten power warmups. Ten code builds. Ten written C# missions. Choose every type carefully, assemble valid code, and bank XP.</p>
        <div className="speed-run-stats" aria-label="Challenge details">
          <span><b>{sprintTouchGames.length}</b><small>POWER ROUNDS</small></span>
          <span><b>{variableSprintBuildChallenges.length}</b><small>CODE BUILDS</small></span>
          <span><b>{variableSprintChallenges.length}</b><small>WRITING MISSIONS</small></span>
        </div>
        <button className="memory-primary progress-ready" onClick={onStart}>ENTER CHALLENGE <Zap size={18} /></button>
      </main>
    </section>
  );
}

function TouchRound({ game, round, totalRounds, touched, earnedXp, onBack, onTouch, onContinue }: { game: TouchGame; round: number; totalRounds: number; touched: number[]; earnedXp: number; onBack: () => void; onTouch: (index: number) => void; onContinue: () => void }) {
  const complete = touched.length === game.itemCount;
  const TouchIcon = game.icon;
  const touchStyle = { "--touch-color": game.color, "--touch-count": game.itemCount } as CSSProperties;

  return (
    <section className="variable-run touch-round screen-enter" style={touchStyle} aria-labelledby="touch-round-title">
      <MissionHeader title={`VARIABLE SPRINT · QUICK TOUCH ${round} / ${totalRounds}`} earnedXp={earnedXp} onBack={onBack} />
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
          BUILD THE CODE <ArrowRight size={17} />
        </button>
      </main>
    </section>
  );
}

function BuildRound({ challenge, round, totalRounds, selected, result, earnedXp, onBack, onAdd, onRemove, onReset, onCheck, onContinue }: { challenge: VariableBuildChallenge; round: number; totalRounds: number; selected: number[]; result: "correct" | "wrong" | null; earnedXp: number; onBack: () => void; onAdd: (index: number) => void; onRemove: (position: number) => void; onReset: () => void; onCheck: () => void; onContinue: () => void }) {
  const selectedValues = selected.map((index) => challenge.blocks[index]);
  const correct = result === "correct";

  return (
    <section className="variable-run sprint-build screen-enter" aria-labelledby="sprint-build-title">
      <MissionHeader title={`VARIABLE SPRINT · BUILD ${round} / ${totalRounds}`} earnedXp={earnedXp} onBack={onBack} />
      <main className="sprint-build-workspace">
        <section className="run-code-panel" aria-label="Built C# code preview">
          <header className="run-panel-header"><div><span>01</span><strong>CODE</strong></div><small>C#</small></header>
          <div className="run-code-surface">
            {correct ? (
              <div className="sprint-built-code"><code>{selectedValues.join(" ")}</code><span><Check size={17} /> CODE REPAIRED</span></div>
            ) : (
              <div className="code-hidden"><span>CODE HIDDEN</span><p>Build it from the available blocks.</p></div>
            )}
          </div>
          <footer><span>ONE USE PER BLOCK</span><span>{challenge.editorHint}</span></footer>
        </section>

        <section className={`run-quiz-panel ${result ? `result-${result}` : ""}`} aria-live="polite">
          <header className="run-panel-header"><div><span>02</span><strong>BUILD CHALLENGE</strong></div><small>{round} / {totalRounds}</small></header>
          <div className="run-quiz-content">
            <p className="run-eyebrow">BUILD THE CODE · +25 XP</p>
            <h1 id="sprint-build-title">{challenge.title}</h1>
            <p className="run-question">{challenge.instruction}</p>
            <div className="block-challenge sprint-block-challenge">
              <div className="block-target" aria-label="Assembled code">
                {selected.length === 0 ? <span>Tap a block to start</span> : selected.map((blockIndex, position) => (
                  <button key={`${blockIndex}-${position}`} onClick={() => onRemove(position)} disabled={correct}>{challenge.blocks[blockIndex]}</button>
                ))}
              </div>
              <div className="block-bank">
                {challenge.blocks.map((block, index) => (
                  <button key={`${block}-${index}`} disabled={correct || selected.includes(index)} onClick={() => onAdd(index)}>{block}</button>
                ))}
              </div>
              <button className="block-reset" onClick={onReset} disabled={correct || selected.length === 0}><RotateCcw size={14} /> RESET BLOCKS</button>
            </div>
            {result && (
              <div className={`run-feedback ${result}`}>
                {correct ? <Check size={20} /> : <Sparkles size={20} />}
                <div><strong>{correct ? "Code ready." : "There is still a bug."}</strong><p>{correct ? "Every block is in executable order." : "Check the type, punctuation, and order. Remove or reset blocks, then try again."}</p></div>
                {correct && <span>+25 XP</span>}
              </div>
            )}
          </div>
          <div className="run-quiz-footer">
            <span>{correct ? "BUILD LOCKED IN" : result === "wrong" ? "FIND THE BUG AND TRY AGAIN" : "ASSEMBLE THE REQUESTED CODE"}</span>
            <button className={`memory-primary run-check-button ${correct ? "progress-ready" : ""}`} disabled={selected.length === 0} onClick={correct ? onContinue : onCheck}>
              {correct ? <>WRITE THE PROGRAM <ArrowRight size={17} /></> : <>CHECK BUILD <Check size={17} /></>}
            </button>
          </div>
        </section>
      </main>
    </section>
  );
}
