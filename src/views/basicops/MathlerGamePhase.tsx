import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock3,
  Flame,
  Hash,
  Heart,
  Play,
  RotateCcw,
  Trophy,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { ExpressionEditor } from "../../components/basicops/ExpressionEditor";
import type { ExpressionEditorHandle } from "../../components/basicops/ExpressionEditor";
import { KeypadPanel } from "../../components/basicops/KeypadPanel";
import { PhaseHeader } from "../../components/basicops/PhaseHeader";
import { generateSurvivalPuzzle, moduleSeed } from "../../data/basicOperations";
import { evaluateExpression } from "../../lib/basicOps/evaluation";
import { normalizeExpressionInput, resultEquals, validateTokens } from "../../lib/basicOps/expression";
import { recordSurvivalBest, recordTimeAttackBest } from "../../lib/basicOps/progress";
import type { BasicOpsProgress } from "../../lib/basicOps/progress";
import { fetchSurvivalLeaderboard, fetchTimeAttackLeaderboard, submitSurvivalScore, submitTimeAttackScore } from "../../lib/basicOps/survivalLeaderboard";
import type { SurvivalLeader, TimeAttackLeader } from "../../lib/basicOps/survivalLeaderboard";
import { basicOpsSound } from "../../lib/basicOps/sound";
import { useRunWave } from "../../lib/basicOps/useRunWave";
import { useLiveCode } from "../../lib/useLiveCode";

type Mode = "time" | "survival";
type Phase = "menu" | "playing" | "won" | "ended";
type Tone = "idle" | "good" | "bad";
type Attempt = { expression: string; output: string; correct: boolean; seconds: number };
const TIME_ATTACK_SECONDS = 60;
const SURVIVAL_LIVES = 3;
const TIMER_RING_LENGTH = 339.3;

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function operatorTone(operator: string) {
  return ({ "+": "plus", "-": "minus", "*": "star", "/": "slash", "%": "percent" } as Record<string, string>)[operator] ?? "paren";
}

type Props = {
  name: string;
  progress: BasicOpsProgress;
  onProgress: (progress: BasicOpsProgress) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onBack: () => void;
  onHome: () => void;
  onOpenStage: (stage: "complete") => void;
};

export function MathlerGamePhase({ name, progress, onProgress, soundOn, onToggleSound, onBack, onHome, onOpenStage }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [index, setIndex] = useState(1);
  const [seed, setSeed] = useState(moduleSeed);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<Attempt[]>([]);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("idle");
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(SURVIVAL_LIVES);
  const [lastGain, setLastGain] = useState(0);
  const [remaining, setRemaining] = useState(TIME_ATTACK_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [leaderboardMode, setLeaderboardMode] = useState<Mode | null>(null);
  const [leaders, setLeaders] = useState<SurvivalLeader[] | TimeAttackLeader[] | null>(null);
  const [leaderboardError, setLeaderboardError] = useState("");
  const editorRef = useRef<ExpressionEditorHandle>(null);
  const deadlineRef = useRef(0);
  const startedAtRef = useRef(0);
  const attemptStartRef = useRef(0);
  const checkingRef = useRef(false);
  const runIdRef = useRef(0);
  const phaseRef = useRef<Phase>("menu");
  const wave = useRunWave();
  const puzzle = useMemo(() => generateSurvivalPuzzle(index, seed), [index, seed]);
  useLiveCode("mathler", value, `MODULE 04 · MATHLER GAME · ${mode?.toUpperCase() ?? "MENU"} · CHALLENGE ${index}`);

  const changePhase = (next: Phase) => { phaseRef.current = next; setPhase(next); };
  const running = phase === "playing" || phase === "won";
  const comboMultiplier = Math.min(5, Math.floor(streak / 2) + 1);
  const best = mode === "time" ? progress.target.timeAttackBest : progress.target.survivalBest;
  const pressure = Math.min(5, Math.ceil(index / 2));
  const remainingFraction = Math.max(0, Math.min(1, remaining / TIME_ATTACK_SECONDS));

  const endRun = () => {
    runIdRef.current += 1;
    checkingRef.current = false;
    setChecking(false);
    if (mode === "time") setRemaining(0);
    else setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    changePhase("ended");
  };

  useEffect(() => () => { runIdRef.current += 1; }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (mode === "survival") {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
        return;
      }
      const seconds = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0 && phaseRef.current !== "ended") {
        runIdRef.current += 1;
        checkingRef.current = false;
        setChecking(false);
        changePhase("ended");
        basicOpsSound.win();
      }
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [mode, running]);

  const start = (chosenMode: Mode) => {
    runIdRef.current += 1;
    setMode(chosenMode);
    setIndex(1);
    setSeed(moduleSeed());
    setValue("");
    setHistory([]);
    setChecking(false);
    checkingRef.current = false;
    setMessage("");
    setTone("idle");
    setScore(0);
    setSolved(0);
    setAttempts(0);
    setStreak(0);
    setLives(SURVIVAL_LIVES);
    setLastGain(0);
    setRemaining(TIME_ATTACK_SECONDS);
    setElapsed(0);
    startedAtRef.current = Date.now();
    attemptStartRef.current = startedAtRef.current;
    deadlineRef.current = startedAtRef.current + TIME_ATTACK_SECONDS * 1000;
    changePhase("playing");
  };

  const nextPuzzle = () => {
    if (mode === "time" && Date.now() >= deadlineRef.current) { endRun(); return; }
    const nextIndex = index + 1;
    let nextSeed = moduleSeed();
    for (let attempt = 0; attempt < 10 && generateSurvivalPuzzle(nextIndex, nextSeed).referenceExpression === puzzle.referenceExpression; attempt += 1) nextSeed = moduleSeed();
    setIndex(nextIndex);
    setSeed(nextSeed);
    setValue("");
    setHistory([]);
    setMessage("");
    setTone("idle");
    setLastGain(0);
    attemptStartRef.current = Date.now();
    changePhase("playing");
    window.requestAnimationFrame(() => editorRef.current?.focus());
  };

  const openLeaderboard = async (chosenMode: Mode) => {
    setLeaderboardMode(chosenMode);
    setLeaderboardError("");
    setLeaders(null);
    try {
      setLeaders(chosenMode === "time" ? await fetchTimeAttackLeaderboard() : await fetchSurvivalLeaderboard());
    } catch {
      setLeaderboardError("The class ranking is unavailable right now. Try again later.");
    }
  };

  const runCheck = async () => {
    if (checkingRef.current || phaseRef.current !== "playing" || !mode) return;
    if (mode === "time" && Date.now() >= deadlineRef.current) { endRun(); return; }
    const expression = normalizeExpressionInput(value);
    if (!expression) return;
    const currentRunId = runIdRef.current;
    checkingRef.current = true;
    setChecking(true);
    try {
      const result = await evaluateExpression(expression);
      if (currentRunId !== runIdRef.current || phaseRef.current !== "playing") return;
      if (mode === "time" && Date.now() >= deadlineRef.current) { endRun(); return; }
      const violations = result.ok ? validateTokens(result.tokens, {
        numbers: puzzle.numbers, numberUsage: puzzle.numberUsage, allowedOperators: puzzle.allowedOperators,
      }) : [];
      const correct = result.ok && violations.length === 0 && resultEquals(result.value, puzzle.target);
      const seconds = Math.max(0, (Date.now() - attemptStartRef.current) / 1000);
      attemptStartRef.current = Date.now();
      setAttempts((count) => count + 1);
      setHistory((rows) => [...rows, { expression, output: result.ok ? result.output : "ERROR", correct, seconds }]);
      if (correct) {
        const nextSolved = solved + 1;
        const nextStreak = streak + 1;
        const multiplier = Math.min(5, Math.floor(nextStreak / 2) + 1);
        const points = (100 + Math.min(solved, 20) * 10) * multiplier;
        const nextScore = score + points;
        setSolved(nextSolved);
        setStreak(nextStreak);
        setScore(nextScore);
        setLastGain(points);
        setTone("good");
        setMessage("MATCHED TARGET");
        if (mode === "time") {
          onProgress(recordTimeAttackBest(progress, nextSolved));
          void submitTimeAttackScore(nextSolved).catch(() => setLeaderboardError("Score saved here, but the class ranking could not be updated."));
          nextPuzzle();
          setMessage("Correct! Keep going.");
        } else {
          changePhase("won");
          onProgress(recordSurvivalBest(progress, nextScore, nextSolved));
          void submitSurvivalScore(nextScore, nextSolved).catch(() => setLeaderboardError("Score saved here, but the class ranking could not be updated."));
        }
        basicOpsSound.win();
        wave.resolve("good");
      } else {
        setTone("bad");
        setMessage(result.ok ? violations[0]?.message ?? `Output ${result.output}; target ${puzzle.target}.` : result.error.message);
        basicOpsSound.wrong();
        wave.resolve("bad");
        if (mode === "survival") {
          const nextLives = lives - 1;
          setLives(nextLives);
          setStreak(0);
          setLastGain(0);
          if (nextLives <= 0) {
            endRun();
          } else {
            setMessage(nextLives === 1 ? "One life left. The next mistake ends the run." : `${nextLives} lives left. Adjust the expression and run it again.`);
            window.requestAnimationFrame(() => editorRef.current?.focus());
          }
        } else {
          setStreak(0);
          setLastGain(0);
          window.requestAnimationFrame(() => editorRef.current?.focus());
        }
      }
    } finally {
      if (currentRunId === runIdRef.current) {
        checkingRef.current = false;
        setChecking(false);
      }
    }
  };

  return (
    <section className={`bo-view bo-survival bo-target bo-mathler-game ${phase === "menu" ? "bo-game-menu-view" : ""} screen-enter`} aria-labelledby="bo-game-title">
      <PhaseHeader name={name} crumb="MODULE 04 | BASIC OPERATIONS" title="MATHLER GAME" soundOn={soundOn} onToggleSound={onToggleSound} onHome={onHome} onBack={onBack} />
      {phase === "menu" ? (
        <div className="bo-game-menu">
          <div className="bo-game-intro"><span className="bo-kicker">THE FINAL ACTIVITY</span><h1 id="bo-game-title">Mathler Game</h1><p>Crack generated Target puzzles. Choose how you want to play.</p></div>
          <div className="bo-game-modes">
            <article className="bo-game-mode is-time"><span className="bo-game-mode-icon"><Clock3 size={28} /></span><span className="bo-kicker">MODE 01</span><h2>TIME ATTACK</h2><p>Solve as many random expressions as you can in 60 seconds. Wrong answers cost time, but you can retry.</p><div className="bo-game-mode-stats"><span>01:00 ON THE CLOCK</span><strong>PERSONAL BEST {progress.target.timeAttackBest} CLEARED</strong></div><div className="bo-game-mode-actions"><button className="bo-primary" onClick={() => start("time")}>START TIME ATTACK <ArrowRight size={16} /></button><button className="bo-secondary" onClick={() => void openLeaderboard("time")}>TOP SCORERS <Trophy size={15} /></button></div></article>
            <article className="bo-game-mode is-survival"><span className="bo-game-mode-icon"><Heart size={28} /></span><span className="bo-kicker">MODE 02</span><h2>SURVIVAL</h2><p>Keep solving new puzzles for as long as you can. You have three lives — lose them all and the run ends.</p><div className="bo-game-mode-stats"><span>THREE LIVES · ONE RUN</span><strong>PERSONAL BEST {progress.target.survivalBestStreak} CLEARED</strong></div><div className="bo-game-mode-actions"><button className="bo-primary" onClick={() => start("survival")}>START SURVIVAL <ArrowRight size={16} /></button><button className="bo-secondary" onClick={() => void openLeaderboard("survival")}>TOP SCORERS <Trophy size={15} /></button></div></article>
          </div>
          <button className="bo-secondary bo-game-summary" onClick={() => onOpenStage("complete")}>MODULE SUMMARY</button>
        </div>
      ) : (
        <>
          <div className="bo-level-head bo-game-head">
            <div className="bo-hud-title">
              <span className="bo-kicker bo-hud-module">MODULE 04 | BASIC OPERATIONS</span>
              <h1 id="bo-game-title">{mode === "time" ? "TIME ATTACK" : "SURVIVAL MODE"}</h1>
            </div>

            {mode === "time" ? (
              <div className="bo-hud-center bo-hud-timer">
                <span className="bo-kicker bo-hud-challenge">TIME ATTACK · CHALLENGE {index}</span>
                <div className="bo-hud-timer-main">
                  <div className="bo-ring-wrap">
                    <svg viewBox="0 0 120 120" className={`bo-ring bo-hud-ring ${remaining <= 10 ? "is-urgent" : ""}`} aria-hidden="true">
                      <circle cx="60" cy="60" r="54" className="bo-ring-track" />
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        className="bo-ring-value"
                        style={{ strokeDasharray: TIMER_RING_LENGTH, strokeDashoffset: TIMER_RING_LENGTH * (1 - remainingFraction) }}
                      />
                    </svg>
                    <span className={`bo-ring-time bo-hud-time ${remaining <= 10 ? "is-urgent" : ""}`} role="timer" aria-label="Time remaining">{formatTime(remaining)}</span>
                  </div>
                  <div className="bo-hud-timebar" aria-hidden="true"><i style={{ width: `${remainingFraction * 100}%` }} /></div>
                </div>
              </div>
            ) : (
              <div className="bo-hud-center bo-hud-survival">
                <span className="bo-kicker bo-hud-challenge">SURVIVAL · CHALLENGE {index}</span>
                <div className="bo-hud-pods">
                  <div className="bo-hud-pod bo-hud-lives">
                    <span className="bo-hud-label">LIVES</span>
                    <div className="bo-hud-hearts" aria-label={`${lives} of ${SURVIVAL_LIVES} lives left`}>
                      {Array.from({ length: SURVIVAL_LIVES }, (_, slot) => (
                        <Heart key={slot} size={21} className={slot < lives ? "is-full" : "is-empty"} fill={slot < lives ? "currentColor" : "none"} aria-hidden="true" />
                      ))}
                    </div>
                  </div>
                  <div className="bo-hud-pod bo-hud-wave">
                    <span className="bo-hud-label">WAVE</span>
                    <strong>{String(index).padStart(2, "0")}</strong>
                  </div>
                  <div className="bo-hud-pod bo-hud-pressure">
                    <span className="bo-hud-label">PRESSURE</span>
                    <div className="bo-hud-pressure-bar" aria-label={`Pressure level ${pressure} of 5`}>
                      {[1, 2, 3, 4, 5].map((segment) => <i key={segment} className={segment <= pressure ? "is-on" : ""} />)}
                    </div>
                  </div>
                  <div className="bo-hud-pod bo-hud-elapsed">
                    <span className="bo-hud-label"><Clock3 size={11} aria-hidden="true" /> TIME</span>
                    <strong role="timer" aria-label="Time survived">{formatTime(elapsed)}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="bo-hud-stats">
              <div className="bo-hud-stat">
                <span><Zap size={12} aria-hidden="true" /> SCORE</span>
                <strong>{score.toLocaleString("en-US")}</strong>
              </div>
              <div className="bo-hud-stat is-best">
                <span><Trophy size={12} aria-hidden="true" /> BEST</span>
                <strong>{best}</strong>
              </div>
              <div className={`bo-hud-stat is-combo ${comboMultiplier > 1 ? "is-hot" : ""}`}>
                <span><Flame size={12} aria-hidden="true" /> COMBO</span>
                <strong>x{comboMultiplier}</strong>
              </div>
              <div className="bo-hud-stat is-streak">
                <span><Flame size={12} aria-hidden="true" /> STREAK</span>
                <strong>{streak}</strong>
              </div>
            </div>
          </div>

          <div className="bo-work-body"><div className="bo-work-main bo-survival-main"><div className="bo-survival-board">
            <div className="bo-game-focus">
              <div className="bo-target-result">
                <span className="bo-target-result-label">TARGET RESULT</span>
                <strong className="bo-survival-target">{puzzle.target}</strong>
              </div>

              <div className="bo-target-tokens">
                <div className="bo-chip-group is-numbers">
                  <span className="bo-chip-title"><Hash size={13} aria-hidden="true" /> USE THESE NUMBERS</span>
                  <div className="bo-chip-frame">
                    <div className="bo-chip-row">
                      {puzzle.numbers.map((number, position) => <span className="bo-number-chip" key={`${position}-${number}`}>{number}</span>)}
                    </div>
                  </div>
                </div>
                <div className="bo-chip-group is-operators">
                  <span className="bo-chip-title"><Calculator size={13} aria-hidden="true" /> AVAILABLE OPERATORS</span>
                  <div className="bo-chip-frame is-ops">
                    <div className="bo-chip-row">
                      {puzzle.allowedOperators.map((operator, position) => <span className={`bo-op-chip is-${operatorTone(operator)}`} key={`${position}-${operator}`}>{operator}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bo-code-card">
              <div className="bo-code-card-head">
                <span className="bo-kicker">YOUR CODE</span>
                <span className="bo-code-chip">C#</span>
              </div>
              <ExpressionEditor ref={editorRef} value={value} onChange={setValue} onRun={() => { wave.fire(); void runCheck(); }} disabled={checking || phase !== "playing"} placeholder="type the C# expression" compact keypadOnlyOnIPad focusOnMount />
              <div className="bo-survival-actions">
                <span className={`bo-survival-status is-${tone}`} role="status">
                  {message || "Build the expression and run it."}
                  {tone === "good" && lastGain > 0 && <b className="bo-score-pop" key={`${history.length}-gain`}>+{lastGain}</b>}
                </span>
                <div className="bo-run-cluster">
                  <span className="bo-run-note">Ctrl + Enter</span>
                  <button className="bo-primary bo-run-button" onClick={(event) => { wave.fire(event); void runCheck(); }} disabled={checking || phase !== "playing" || !value.trim()}>
                    <Play size={15} fill="currentColor" aria-hidden="true" /> {checking ? "CHECKING" : "RUN"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bo-attempts-card">
              <div className="bo-attempts-head">
                <span className="bo-kicker">RECENT ATTEMPTS</span>
                {mode === "survival" && lives === 1 ? (
                  <span className="bo-lives-warning"><AlertTriangle size={13} aria-hidden="true" /> <b>1 MISTAKE LEFT</b> <small>NEXT MISTAKE ENDS THE RUN</small></span>
                ) : (
                  <span className="bo-attempts-progress">
                    {solved} / {attempts} SOLVED
                    <span className="bo-attempt-dots" aria-hidden="true">
                      {history.slice(-8).map((row, position) => <i key={position} className={row.correct ? "is-correct" : "is-wrong"} />)}
                    </span>
                  </span>
                )}
              </div>
              <div className="bo-survival-history">
                {history.length === 0 && <span className="bo-attempt-empty">No attempts yet. Build the expression and press RUN.</span>}
                {history.map((row, position) => (
                  <div className={`bo-survival-row ${row.correct ? "is-correct" : "is-wrong"}`} key={position}>
                    <span className="bo-attempt-index">{position + 1}</span>
                    <code>{row.expression}</code>
                    <span className="bo-attempt-arrow">→</span>
                    <strong className="bo-attempt-output">{row.output}</strong>
                    <span className="bo-attempt-verdict">
                      {row.correct ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
                      {row.correct ? "MATCHED TARGET" : "WRONG"}
                    </span>
                    <span className="bo-attempt-time">{row.seconds.toFixed(1)}s</span>
                  </div>
                ))}
              </div>
            </div>
          </div>{(phase === "won" || phase === "ended") && (
            <div className="bo-target-overlay"><div className="bo-win-card">
              <span className="bo-kicker">{phase === "won" ? "CHALLENGE CLEARED" : mode === "time" ? "TIME IS UP" : "RUN COMPLETE"}</span>
              <h2>{solved} {solved === 1 ? "puzzle" : "puzzles"} cleared</h2>
              {phase === "ended" && mode === "survival" && <>
                <p>You survived {formatTime(elapsed)} before losing your last life.</p>
                <p>{message}</p>
                <p>Reference expression: <code>{puzzle.referenceExpression}</code></p>
              </>}
              <div className="bo-complete-actions">
                {phase === "won" ? <button className="bo-primary" onClick={nextPuzzle}>NEXT CHALLENGE <ArrowRight size={16} /></button> : <button className="bo-primary" onClick={() => start(mode!)}><RotateCcw size={16} /> PLAY AGAIN</button>}
                <button className="bo-secondary" onClick={() => { runIdRef.current += 1; changePhase("menu"); }}>CHOOSE MODE</button>
              </div>
            </div></div>
          )}</div>
            <KeypadPanel disabled={checking || phase !== "playing"} onRun={(event) => { wave.fire(event); void runCheck(); }} onInsert={(symbol) => editorRef.current?.insert(symbol)} onBackspace={() => editorRef.current?.backspace()} onClear={() => editorRef.current?.clear()} onResult={() => editorRef.current?.pulseResult()} />
          </div>
        </>
      )}
      {leaderboardMode && <div className="modal-backdrop" role="presentation" onMouseDown={() => setLeaderboardMode(null)}><div className="modal bo-leaderboard" role="dialog" aria-modal="true" aria-labelledby="bo-leaderboard-title" onMouseDown={(event) => event.stopPropagation()}><button className="close-modal" aria-label="Close leaderboard" onClick={() => setLeaderboardMode(null)}><X size={18} /></button><span className="bo-kicker">ALL CLASSES</span><h2 id="bo-leaderboard-title">{leaderboardMode === "time" ? "TIME ATTACK" : "SURVIVAL"} · TOP SCORERS</h2>{leaderboardError && <p role="status">{leaderboardError}</p>}{!leaderboardError && !leaders && <p>Loading scores…</p>}{leaders?.length === 0 && <p>No scores yet. Be the first.</p>}{leaders?.map((leader, position) => <div className="bo-leader-row" key={`${leader.display_name}-${position}`}><b>{String(position + 1).padStart(2, "0")}</b><span>{leader.display_name}</span><small>{leader.class_code}</small><strong>{leaderboardMode === "time" ? (leader as TimeAttackLeader).time_attack_best : (leader as SurvivalLeader).best_streak}</strong></div>)}</div></div>}
    </section>
  );
}
