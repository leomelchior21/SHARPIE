import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clock, Flame, LifeBuoy, Lightbulb, Play, RotateCcw, X, Zap } from "lucide-react";
import { ExpressionEditor } from "../../components/basicops/ExpressionEditor";
import type { ExpressionEditorHandle } from "../../components/basicops/ExpressionEditor";
import { KeypadPanel } from "../../components/basicops/KeypadPanel";
import { LevelProgress } from "../../components/basicops/LevelProgress";
import { MathExpression } from "../../components/basicops/MathExpression";
import { PhaseHeader } from "../../components/basicops/PhaseHeader";
import { RUSH_ROUNDS, generateRushChallenges, moduleSeed } from "../../data/basicOperations";
import { evaluateExpression } from "../../lib/basicOps/evaluation";
import { normalizeExpressionInput, resultEquals, validateTokens } from "../../lib/basicOps/expression";
import { recordRushRound, recordRushRun } from "../../lib/basicOps/progress";
import type { BasicOpsProgress } from "../../lib/basicOps/progress";
import { basicOpsSound } from "../../lib/basicOps/sound";
import { useRunWave } from "../../lib/basicOps/useRunWave";
import { useLiveCode } from "../../lib/useLiveCode";

type Stage = "intro" | "translate" | "rush" | "target" | "complete";

type OperatorRushPhaseProps = {
  name: string;
  progress: BasicOpsProgress;
  onProgress: (progress: BasicOpsProgress) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onBack: () => void;
  onHome: () => void;
  onOpenStage: (stage: Stage) => void;
};

type RushPhase = "briefing" | "playing" | "retry" | "round-complete" | "run-complete";

export function OperatorRushPhase({ name, progress, onProgress, soundOn, onToggleSound, onBack, onHome, onOpenStage }: OperatorRushPhaseProps) {
  const [roundIndex, setRoundIndex] = useState(() => progress.rush.completed ? 0 : Math.min(progress.rush.roundsCleared, RUSH_ROUNDS.length - 1));
  const [seed, setSeed] = useState(() => moduleSeed());
  const round = RUSH_ROUNDS[roundIndex];
  const challenges = useMemo(() => generateRushChallenges(round.round, seed), [round.round, seed]);
  const total = challenges.length;

  const [phase, setPhase] = useState<RushPhase>("briefing");
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [score, setScore] = useState(0);
  const [roundStartScore, setRoundStartScore] = useState(0);
  const [roundStartBestCombo, setRoundStartBestCombo] = useState(0);
  const [retryReason, setRetryReason] = useState("");
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(round.seconds);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<"correct" | "wrong" | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [popup, setPopup] = useState<{ points: number; key: number } | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lastMissed, setLastMissed] = useState<string | null>(null);
  const editorRef = useRef<ExpressionEditorHandle>(null);
  const wave = useRunWave();

  const challenge = challenges[Math.min(index, total - 1)];
  useLiveCode("mathler", value, `MODULE 04 · OPERATOR RUSH · ROUND ${round.round}`);

  const openRound = useCallback((nextIndex: number) => {
    setRoundIndex(nextIndex);
    setRoundStartScore(score);
    setRoundStartBestCombo(bestCombo);
    setSeed(moduleSeed());
    setIndex(0);
    setValue("");
    setTimeLeft(RUSH_ROUNDS[nextIndex].seconds);
    setExpired(false);
    setOutcome(null);
    setWrongCount(0);
    setChecking(false);
    setHelpOpen(false);
    setLastMissed(null);
    setPhase("playing");
    editorRef.current?.focus();
  }, [score, bestCombo]);

  const fail = useCallback((reason: string, missed?: string) => {
    setRetryReason(reason);
    setLastMissed(missed ?? null);
    setOutcome("wrong");
    setCombo(0);
    setPhase("retry");
    basicOpsSound.wrong();
    wave.resolve("bad");
  }, [wave]);

  const retry = () => {
    setScore(roundStartScore);
    setBestCombo(roundStartBestCombo);
    setCombo(0);
    setSeed(moduleSeed());
    setIndex(0);
    setValue("");
    setTimeLeft(round.seconds);
    setExpired(false);
    setOutcome(null);
    setWrongCount(0);
    setPopup(null);
    setHelpOpen(false);
    setLastMissed(null);
    setPhase("playing");
  };

  const finishRunRef = useRef<() => void>(() => undefined);

  const nextChallenge = useCallback(() => {
    if (index + 1 >= total) {
      if (round.round >= RUSH_ROUNDS.length) {
        finishRunRef.current();
        setPhase("run-complete");
      } else {
        onProgress(recordRushRound(progress, Math.max(progress.rush.roundsCleared, round.round)));
        setPhase("round-complete");
      }
      return;
    }
    setIndex(index + 1);
    setValue("");
    setTimeLeft(round.seconds);
    setExpired(false);
    setOutcome(null);
    setWrongCount(0);
    setPopup(null);
    setHelpOpen(false);
    editorRef.current?.focus();
  }, [index, total, progress, round.round, round.seconds, onProgress]);

  const nextChallengeRef = useRef(nextChallenge);
  nextChallengeRef.current = nextChallenge;

  useEffect(() => {
    if (phase !== "playing" || outcome !== "correct") return;
    const timer = window.setTimeout(() => nextChallengeRef.current(), 850);
    return () => window.clearTimeout(timer);
  }, [phase, outcome]);

  useEffect(() => {
    if (phase !== "playing" || expired || outcome === "correct") return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, Math.round((current - 0.1) * 10) / 10));
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, expired, outcome, index]);

  useEffect(() => {
    if (phase !== "playing" || expired || timeLeft > 0 || checking || outcome === "correct") return;
    setExpired(true);
    fail("Time ran out.", challenges[Math.min(index, total - 1)]?.referenceExpression);
  }, [timeLeft, phase, expired, checking, outcome, fail, challenges, index, total]);

  const check = useCallback(async () => {
    if (checking || phase !== "playing" || outcome === "correct") return;
    const current = challenges[index];
    if (!current) return;
    const expression = normalizeExpressionInput(value);
    if (!expression) {
      editorRef.current?.focus();
      return;
    }
    setChecking(true);
    try {
      const result = await evaluateExpression(expression);
      if (!result.ok) {
        fail(result.error.message, current.referenceExpression);
        return;
      }
      const violations = validateTokens(result.tokens, {
        numbers: current.requiredNumbers,
        numberUsage: current.numberUsage,
        allowedOperators: current.allowedOperators,
      });
      if (violations.length || !resultEquals(result.value, current.expectedResult)) {
        fail(violations[0]?.message ?? `Output ${result.output}; expected ${current.expectedResult}.`, current.referenceExpression);
        return;
      }

      const seconds = round.seconds;
      const timeBonus = expired ? 0 : Math.round((Math.max(timeLeft, 0) / seconds) * 50);
      const multiplier = Math.min(combo + 1, 5);
      const points = (100 + timeBonus) * multiplier;
      const nextCombo = combo + 1;
      setScore((currentScore) => currentScore + points);
      setCombo(nextCombo);
      setBestCombo((best) => Math.max(best, nextCombo));
      setPopup({ points, key: nextCombo });
      setOutcome("correct");
      if (nextCombo >= 2) basicOpsSound.combo(nextCombo);
      else basicOpsSound.correct();
      wave.resolve("good");
    } finally {
      setChecking(false);
    }
  }, [checking, phase, outcome, expired, challenges, index, value, round.seconds, timeLeft, combo, fail, wave]);

  useEffect(() => {
    const keyboardRun = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        wave.fire();
        void check();
      }
    };
    window.addEventListener("keydown", keyboardRun);
    return () => window.removeEventListener("keydown", keyboardRun);
  }, [check, wave]);

  const finishRun = useCallback(() => {
    const outcomeRecord = recordRushRun(progress, score, Math.max(bestCombo, combo));
    onProgress(outcomeRecord.progress);
    setEarnedXp(outcomeRecord.xp);
    basicOpsSound.win();
  }, [progress, score, bestCombo, combo, onProgress]);
  finishRunRef.current = finishRun;

  const restartRun = () => {
    setSeed(moduleSeed());
    setScore(0);
    setRoundStartScore(0);
    setRoundStartBestCombo(0);
    setCombo(0);
    setBestCombo(0);
    setValue("");
    setIndex(0);
    setRoundIndex(0);
    setOutcome(null);
    setWrongCount(0);
    setPopup(null);
    setEarnedXp(0);
    setPhase("briefing");
  };

  const timeFraction = Math.max(0, Math.min(1, timeLeft / round.seconds));
  const ringLength = 2 * Math.PI * 54;
  const current = challenges[Math.min(index, total - 1)];
  const hintVisible = round.hintAfterMisses !== null && wrongCount >= round.hintAfterMisses;
  const statusTone = outcome === "correct" ? "correct" : outcome === "wrong" ? "wrong" : expired ? "expired" : "idle";
  const hintText = current.hintSequence[Math.min(Math.max(wrongCount - 1, 0), current.hintSequence.length - 1)];

  return (
    <section className="bo-view bo-rush screen-enter" aria-labelledby="bo-rush-title">
      <PhaseHeader
        name={name}
        crumb="MODULE 04 | BASIC OPERATIONS"
        title="OPERATOR RUSH"
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onHome={onHome}
        onBack={onBack}
      />

      {phase === "briefing" && (
        <div className="bo-rush-briefing">
          <span className="bo-kicker">ROUND {String(round.round).padStart(2, "0")} — {round.label}</span>
          <h1 id="bo-rush-title">Now the timer starts.</h1>
          <p>You translated three examples for each of the four operators. Next are five timed rounds with four steps each. A wrong answer or expired timer restarts the current round.</p>
          <div className="bo-rush-stats">
            <div><span>EXPRESSIONS</span><strong>{round.count}</strong></div>
            <div><span>TIME EACH</span><strong>{round.seconds}s</strong></div>
            <div><span>COMBO</span><strong>x1 → x5</strong></div>
            <div><span>BEST SCORE</span><strong>{progress.rush.bestScore}</strong></div>
          </div>
          {round.hintAfterMisses !== null && (
            <span className="bo-rush-hint-note"><Lightbulb size={13} /> Hints appear after {round.hintAfterMisses} misses in this round.</span>
          )}
          <div className="bo-complete-actions">
            <button className="bo-primary" onClick={() => openRound(roundIndex)}>
              START ROUND <Play size={17} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="bo-level-head">
            <div className="bo-level-copy">
              <span className="bo-kicker">OPERATOR RUSH · ROUND {String(round.round).padStart(2, "0")}</span>
              <h1>Round {String(round.round).padStart(2, "0")} — {round.label}</h1>
              <p>Translate before time runs out. A wrong answer or expired timer restarts this round.</p>
            </div>
            <div className="bo-head-side">
              <div className="bo-rush-meters">
                <span className="bo-rush-meter"><Clock size={14} /> {formatClock(round.seconds - timeLeft)}</span>
                <span className="bo-rush-meter"><Zap size={14} /> SCORE <b>{score.toLocaleString("en-US")}</b></span>
                <span className={`bo-rush-meter ${combo >= 2 ? "is-hot" : ""}`}><Flame size={14} /> COMBO <b>x{Math.max(combo, 1)}</b></span>
              </div>
              <div className="bo-rush-controls">
                <button
                  type="button"
                  className={`bo-help-button ${helpOpen ? "is-open" : ""}`}
                  onClick={() => setHelpOpen((open) => !open)}
                  aria-expanded={helpOpen}
                >
                  <LifeBuoy size={14} /> NEED SOME HELP?
                </button>
                <div className="bo-rush-rounds" role="group" aria-label={`Rush rounds: ${progress.rush.roundsCleared} of ${RUSH_ROUNDS.length}`}>
                  {RUSH_ROUNDS.map((item) => {
                    const passed = item.round <= progress.rush.roundsCleared;
                    const isCurrent = item.round === round.round;
                    return passed && !isCurrent ? (
                      <button
                        type="button"
                        key={item.round}
                        className="is-done"
                        onClick={() => openRound(item.round - 1)}
                        aria-label={`Redo round ${item.round}: ${item.label}`}
                        title={`Redo round ${item.round} — ${item.label}`}
                      >
                        {item.round}
                      </button>
                    ) : (
                      <i key={item.round} className={`${passed ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}>{item.round}</i>
                    );
                  })}
                </div>
                <LevelProgress label="ROUND PROGRESS" total={total} completed={index + (outcome === "correct" ? 1 : 0)} />
              </div>
            </div>
          </div>

          <div className="bo-work-body">
            <div className="bo-work-main">
              <section className="bo-panel bo-math-panel bo-rush-expression" aria-label="Expression to translate">
                <header className="panel-header">
                  <div><span className="panel-index">01</span><strong>EXPRESSION</strong></div>
                  {expired ? <span className="bo-expired-badge">TIME BONUS LOST</span> : <span className="language-chip">{Math.ceil(timeLeft)}s</span>}
                </header>
                <div className="bo-rush-stage">
                  <div className="bo-ring-wrap" aria-hidden="true">
                    <svg viewBox="0 0 120 120" className={`bo-ring ${expired ? "is-expired" : timeFraction < 0.3 ? "is-warning" : ""}`}>
                      <circle cx="60" cy="60" r="54" className="bo-ring-track" />
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        className="bo-ring-value"
                        style={{ strokeDasharray: ringLength, strokeDashoffset: ringLength * (1 - timeFraction) }}
                      />
                    </svg>
                    <span className="bo-ring-time">{expired ? "0" : Math.ceil(timeLeft)}</span>
                  </div>
                  <div className="bo-rush-math">
                    {current.writtenPrompt ? (
                      <p className="bo-rush-written-task">{current.writtenPrompt}</p>
                    ) : current.promptContext ? (
                      <div className="bo-context is-compact">
                        {current.promptContext.map((line, lineIndex) => (
                          <span key={`${line}-${lineIndex}`} className={lineIndex === current.promptContext!.length - 1 ? "is-question" : ""}>{line}</span>
                        ))}
                      </div>
                    ) : (
                      <MathExpression latex={current.mathLatex} label={current.mathText} size="md" />
                    )}
                  </div>
                </div>
              </section>

              <section className="bo-panel bo-code-panel" aria-label="C# answer">
                <header className="panel-header">
                  <div><span className="panel-index">02</span><strong>YOUR CODE</strong></div>
                  <span className="language-chip">C#</span>
                </header>
                <div className="bo-code-body">
                  <ExpressionEditor
                    ref={editorRef}
                    value={value}
                    onChange={(next) => { setValue(next); if (outcome === "wrong") setOutcome(null); }}
                    onRun={() => { wave.fire(); void check(); }}
                    disabled={checking || outcome === "correct"}
                    placeholder="type the C# expression"
                    compact
                    focusOnMount
                    keypadOnlyOnIPad
                  />

                  {helpOpen && (
                    <div className="bo-answer-help" role="status">
                      <span><LifeBuoy size={13} aria-hidden="true" /> CORRECT ANSWER</span>
                      <code>double result = {current.referenceExpression};</code>
                    </div>
                  )}

                  <div className={`bo-code-status is-${statusTone}`} role="status" aria-live="polite">
                    <span className="bo-status-icon">
                      {outcome === "correct" ? <Check size={18} /> : outcome === "wrong" ? <X size={18} /> : expired ? <Clock size={17} /> : <Lightbulb size={16} />}
                    </span>
                    <div className="bo-status-copy">
                      <span className="bo-status-label">
                        {outcome === "correct" ? "CORRECT!" : outcome === "wrong" ? "NOT QUITE" : expired ? "TIME BONUS LOST" : "READY"}
                      </span>
                      <strong>
                        {outcome === "correct"
                          ? "Translation accepted."
                          : outcome === "wrong"
                            ? "Try again — the expression stays open."
                            : expired
                              ? "Finish it anyway. Base points still count."
                              : "Translate the expression. RUN when ready."}
                      </strong>
                      {outcome !== "correct" && hintVisible && (
                        <span className="bo-context-hint"><Lightbulb size={13} /> {hintText}</span>
                      )}
                    </div>
                    {outcome === "correct" && popup && (
                      <div className="bo-status-values">
                        <span className="bo-output-label">POINTS</span>
                        <span className="bo-output-value">+{popup.points}</span>
                        <span className="bo-xp-pop">COMBO x{Math.min(combo, 5)}</span>
                      </div>
                    )}
                  </div>

                  <div className="bo-run-row">
                    <span className="bo-run-note">CTRL / ⌘ + ENTER</span>
                    <button className="run-button bo-run" onClick={(event) => { wave.fire(event); void check(); }} disabled={checking || !value.trim() || outcome === "correct"}>
                      <span>{checking ? "CHECKING" : "RUN"}</span>
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </section>
            </div>

        <KeypadPanel
          onRun={(event) => { wave.fire(event); void check(); }}
              disabled={checking || outcome === "correct"}
              onInsert={(symbol) => editorRef.current?.insert(symbol)}
              onBackspace={() => editorRef.current?.backspace()}
              onClear={() => { setValue(""); if (outcome === "wrong") setOutcome(null); }}
              onResult={() => editorRef.current?.pulseResult()}
            />
          </div>
        </>
      )}

      {phase === "retry" && (
        <div className="bo-complete-stage">
          <div className="bo-complete-card bo-retry-card">
            <span className="bo-complete-mark is-warn"><X size={28} /></span>
            <span className="bo-kicker">RUSH PAUSED · PHASE {round.round} / {RUSH_ROUNDS.length}</span>
            <h1>Try the run again.</h1>
            <p>{retryReason} Restart {round.label} with four new expressions.</p>
            {lastMissed && <code className="bo-win-code">double result = {lastMissed};</code>}
            <div className="bo-complete-actions">
              <button className="bo-primary" onClick={retry}><RotateCcw size={17} /> RESTART ROUND</button>
              <button className="bo-secondary" onClick={onHome}>MODULE HOME</button>
            </div>
          </div>
        </div>
      )}

      {phase === "round-complete" && (
        <div className="bo-complete-stage">
          <div className="bo-complete-card">
            <span className="bo-complete-mark"><Zap size={28} /></span>
            <span className="bo-kicker">ROUND {String(round.round).padStart(2, "0")} CLEAR</span>
            <h1>{score.toLocaleString("en-US")} POINTS</h1>
            <p>Best combo so far: x{Math.max(bestCombo, combo)}. The next round is faster.</p>
            <div className="bo-complete-actions">
              <button className="bo-primary" onClick={() => openRound(roundIndex + 1)}>
                NEXT ROUND <ArrowRight size={17} />
              </button>
              <button className="bo-secondary" onClick={restartRun}>RESTART RUN</button>
            </div>
          </div>
        </div>
      )}

      {phase === "run-complete" && (
        <div className="bo-complete-stage">
          <div className="bo-complete-card">
            <span className="bo-complete-mark"><Check size={30} /></span>
            <span className="bo-kicker">OPERATOR RUSH COMPLETE</span>
            <h1>{score.toLocaleString("en-US")} POINTS</h1>
            <p>Best combo x{Math.max(bestCombo, combo)}. The Target warm up is now unlocked.</p>
            <div className="bo-complete-badges">
              {earnedXp > 0 && <span>+{earnedXp} XP</span>}
              <span>BEST {Math.max(progress.rush.bestScore, score).toLocaleString("en-US")}</span>
            </div>
            <div className="bo-complete-actions">
              <button className="bo-primary" onClick={() => onOpenStage("target")}>
                TARGET WARM UP <ArrowRight size={17} />
              </button>
              <button className="bo-secondary" onClick={restartRun}>
                <RotateCcw size={15} /> PLAY AGAIN
              </button>
              <button className="bo-secondary" onClick={onHome}>MODULE HOME</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
