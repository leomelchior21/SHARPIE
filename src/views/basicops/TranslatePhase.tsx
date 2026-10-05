import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Lightbulb, Play, RotateCcw, Trophy, X } from "lucide-react";
import { SyntaxLine } from "../../components/SyntaxLine";
import { ExpressionEditor } from "../../components/basicops/ExpressionEditor";
import type { ExpressionEditorHandle } from "../../components/basicops/ExpressionEditor";
import { KeypadPanel } from "../../components/basicops/KeypadPanel";
import { LevelProgress } from "../../components/basicops/LevelProgress";
import { MathExpression } from "../../components/basicops/MathExpression";
import { PhaseHeader } from "../../components/basicops/PhaseHeader";
import {
  TRANSLATE_LEVELS,
  WARMUP_EXAMPLES_PER_OPERATOR,
  WARMUP_TOTAL,
  generateWarmupChallenges,
  moduleSeed,
} from "../../data/basicOperations";
import type { TranslationChallenge } from "../../data/basicOperations";
import { evaluateExpression, startCSharpEngine } from "../../lib/basicOps/evaluation";
import { normalizeExpressionInput, resultEquals, safeTokens, validateTokens } from "../../lib/basicOps/expression";
import type { ExpressionRules } from "../../lib/basicOps/expression";
import { recordWarmupSolve } from "../../lib/basicOps/progress";
import type { BasicOpsProgress } from "../../lib/basicOps/progress";
import { basicOpsSound } from "../../lib/basicOps/sound";
import { useRunWave } from "../../lib/basicOps/useRunWave";
import { useLiveCode } from "../../lib/useLiveCode";

type Stage = "intro" | "translate" | "rush" | "target" | "complete";

type TranslatePhaseProps = {
  name: string;
  progress: BasicOpsProgress;
  onProgress: (progress: BasicOpsProgress) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onBack: () => void;
  onHome: () => void;
  onOpenStage: (stage: Stage) => void;
};

type TranslateFeedback = {
  tone: "correct" | "wrong";
  title: string;
  message: string;
  detail?: string;
  output?: string;
  expected?: string;
  xp?: number;
  transform?: { latex: string; label: string; note: string; expression: string; writtenPrompt?: string };
};

type PairNotice = { before: string; after: string; resultBefore: number; resultAfter: number };

function rulesForChallenge(challenge: TranslationChallenge): ExpressionRules {
  return {
    numbers: challenge.requiredNumbers,
    numberUsage: challenge.numberUsage,
    allowedOperators: challenge.allowedOperators,
  };
}

export function TranslatePhase({ name, progress, onProgress, soundOn, onToggleSound, onBack, onHome, onOpenStage }: TranslatePhaseProps) {
  const [seed, setSeed] = useState(() => moduleSeed());
  const challenges = useMemo(() => generateWarmupChallenges(seed), [seed]);
  const total = challenges.length;

  const storedSolved = Math.min(progress.translate.warmupSolved, total);
  const [index, setIndex] = useState(() => (storedSolved >= total ? 0 : storedSolved));
  const [replaying, setReplaying] = useState(() => storedSolved >= total);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<TranslateFeedback | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [checking, setChecking] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [pairNotice, setPairNotice] = useState<PairNotice | null>(null);
  const [phase, setPhase] = useState<"playing" | "level-complete">("playing");
  const [levelXp, setLevelXp] = useState(0);
  const [engine, setEngine] = useState<"loading" | "ready" | "local">("loading");
  const editorRef = useRef<ExpressionEditorHandle>(null);
  const wave = useRunWave();

  const challenge = challenges[Math.min(index, total - 1)];
  const meta = TRANSLATE_LEVELS[challenge.level - 1];
  const operatorExample = (index % WARMUP_EXAMPLES_PER_OPERATOR) + 1;
  const solved = Math.max(storedSolved, 0);
  useLiveCode("mathler", value, `MODULE 04 · MATHLER WARMUP · EXAMPLE ${index + 1}`);

  useEffect(() => {
    let active = true;
    startCSharpEngine().then((ok) => {
      if (active) setEngine(ok ? "ready" : "local");
    });
    return () => {
      active = false;
    };
  }, []);

  const resetChallengeState = useCallback((nextIndex: number) => {
    setIndex(nextIndex);
    setValue("");
    setFeedback(null);
    setWrongCount(0);
    setHintsShown(0);
    setUsedHint(false);
    setChecking(false);
  }, []);

  const advance = useCallback(() => {
    setPairNotice(null);
    if (index + 1 >= total) {
      setPhase("level-complete");
      return;
    }
    resetChallengeState(index + 1);
    editorRef.current?.focus();
  }, [index, total, resetChallengeState]);

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    if (phase !== "playing" || feedback?.tone !== "correct") return;
    const timer = window.setTimeout(() => advanceRef.current(), 1400);
    return () => window.clearTimeout(timer);
  }, [phase, feedback]);

  const registerWrong = (message: string, detail: string, extra?: { output?: string; expected?: string }) => {
    setWrongCount((count) => count + 1);
    setFeedback({ tone: "wrong", title: "NOT QUITE", message, detail, ...extra });
    setShakeKey((key) => key + 1);
    basicOpsSound.wrong();
    wave.resolve("bad");
  };

  const check = useCallback(async () => {
    if (checking || phase !== "playing" || feedback?.tone === "correct") return;
    const current = challenges[index];
    if (!current) return;
    const expression = normalizeExpressionInput(value);
    if (!expression) {
      editorRef.current?.focus();
      return;
    }
    setChecking(true);
    setPairNotice(null);
    try {
      const result = await evaluateExpression(expression);
      if (!result.ok) {
        registerWrong(result.error.message, result.error.detail);
        return;
      }
      const violations = validateTokens(result.tokens, rulesForChallenge(current));
      if (violations.length) {
        registerWrong(violations[0].message, violations[0].detail);
        return;
      }
      if (!resultEquals(result.value, current.expectedResult)) {
        registerWrong(
          `Your output: ${result.output} · Expected: ${current.expectedResult}`,
          current.hintSequence[Math.min(wrongCount, current.hintSequence.length - 1)] ?? "Check the operations inside the expression.",
          { output: result.output, expected: String(current.expectedResult) },
        );
        return;
      }

      const outcome = recordWarmupSolve(progress, usedHint, index);
      onProgress(outcome.progress);
      setLevelXp((xp) => xp + outcome.xp);
      setFeedback({
        tone: "correct",
        title: "CORRECT!",
        message: outcome.xp > 0 ? "Your code correctly calculates the expression." : "Replay confirmed — same result.",
        output: result.output,
        xp: outcome.xp,
        transform: {
          latex: current.mathLatex,
          label: current.mathText,
          note: current.transformNote,
          expression: current.referenceExpression,
          writtenPrompt: current.writtenPrompt,
        },
      });
      if (current.pair?.role === "b") {
        const partner = challenges.find((item) => item.pair?.id === current.pair?.id && item.pair?.role === "a");
        if (partner) {
          setPairNotice({
            before: partner.referenceExpression,
            after: current.referenceExpression,
            resultBefore: partner.expectedResult,
            resultAfter: current.expectedResult,
          });
        }
      }
      basicOpsSound.correct();
      wave.resolve("good");
    } finally {
      setChecking(false);
    }
  }, [checking, phase, feedback, challenges, index, value, wrongCount, progress, usedHint, onProgress, wave]);

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

  const changeValue = (next: string) => {
    setValue(next);
    if (pairNotice && feedback?.tone !== "correct") setPairNotice(null);
    if (feedback?.tone === "wrong") setFeedback(null);
  };

  const resetCode = () => {
    editorRef.current?.clear();
    setFeedback(null);
    editorRef.current?.focus();
  };

  const goToExample = (step: number) => {
    setPairNotice(null);
    resetChallengeState(step - 1);
    setPhase("playing");
    basicOpsSound.click();
    window.requestAnimationFrame(() => editorRef.current?.focus());
  };

  const showHint = () => {
    if (hintsShown >= challenge.hintSequence.length) return;
    setHintsShown((count) => count + 1);
    setUsedHint(true);
    basicOpsSound.click();
  };

  const replayLevel = () => {
    setSeed(moduleSeed());
    setLevelXp(0);
    setReplaying(true);
    resetChallengeState(0);
    setPhase("playing");
  };

  const solvedDisplay = replaying ? index + (feedback?.tone === "correct" ? 1 : 0) : solved;
  const hintAvailable = meta.hintMode !== "none" && wrongCount >= meta.attemptsBeforeHint && hintsShown < challenge.hintSequence.length;
  const contextualHint =
    wrongCount > 0 && meta.hintMode !== "none"
      ? challenge.hintSequence[Math.min(Math.max(wrongCount, hintsShown), challenge.hintSequence.length - 1)]
      : null;

  return (
    <section className="bo-view bo-translate screen-enter" aria-labelledby="bo-level-title">
      <PhaseHeader
        name={name}
        crumb="MODULE 04 | BASIC OPERATIONS"
        title="MATHLER · WARMUP"
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onHome={onHome}
        onBack={onBack}
      />

      {phase === "level-complete" ? (
        <div className="bo-complete-stage">
          <div className="bo-complete-card">
            <span className="bo-complete-mark"><Trophy size={30} /></span>
            <span className="bo-kicker">WARMUP COMPLETE</span>
            <h1>MATH → C#</h1>
            <p>Three expressions for each operator translated. The same activity now adds a timer for five Rush phases.</p>
            <div className="bo-complete-badges">
              <span>+{levelXp} XP THIS LEVEL</span>
              <span>{progress.translate.warmupSolved} / {WARMUP_TOTAL} EXAMPLES</span>
            </div>
            <div className="bo-complete-actions">
              <button className="bo-primary" onClick={() => onOpenStage("rush")}>
                CONTINUE TO TIMED RUSH <ArrowRight size={17} />
              </button>
              <button className="bo-secondary" onClick={replayLevel}>REPLAY LEVEL</button>
              <button className="bo-secondary" onClick={onHome}>MODULE HOME</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bo-level-head">
            <div className="bo-level-copy">
              <span className="bo-kicker">TRANSLATE · {meta.name.toUpperCase()} {operatorExample} / {WARMUP_EXAMPLES_PER_OPERATOR} · EXAMPLE {index + 1} / {WARMUP_TOTAL}</span>
              <h1 id="bo-level-title">Warmup — {meta.name}</h1>
              <p>Write the formula in C# to match the expression.</p>
            </div>
            <div className="bo-head-side">
              <span className="bo-engine-chip"><i className={engine === "ready" ? "is-live" : ""} /> {engine === "ready" ? "C# READY" : engine === "local" ? "LOCAL CHECK" : "LOADING C#"}</span>
              <LevelProgress total={total} completed={solvedDisplay} onSelect={goToExample} />
            </div>
          </div>

          <div className="bo-work-body">
            <div className="bo-work-main">
              <section className="bo-panel bo-math-panel" aria-label="Math expression">
                <header className="panel-header">
                  <div><span className="panel-index">01</span><strong>MATH EXPRESSION</strong></div>
                  <span className="language-chip">MATH</span>
                </header>
                <div className="bo-math-stage">
                  {pairNotice && (
                    <div className="bo-pair-banner" role="status">
                      <span><code className="bo-inline-code"><SyntaxLine code={pairNotice.before} /></code> → <b>{pairNotice.resultBefore}</b></span>
                      <em>≠</em>
                      <span><code className="bo-inline-code"><SyntaxLine code={pairNotice.after} /></code> → <b>{pairNotice.resultAfter}</b></span>
                      <small>PARENTHESES CHANGE THE ORDER</small>
                    </div>
                  )}
                  {challenge.writtenPrompt ? (
                    <p className="bo-warmup-written-task">{challenge.writtenPrompt}</p>
                  ) : challenge.promptContext ? (
                    <div className="bo-context">
                      {challenge.promptContext.map((line, lineIndex) => (
                        <span key={`${line}-${lineIndex}`} className={lineIndex === challenge.promptContext!.length - 1 ? "is-question" : ""}>{line}</span>
                      ))}
                    </div>
                  ) : (
                    <MathExpression latex={challenge.mathLatex} label={challenge.mathText} />
                  )}
                </div>
              </section>

              <section className={`bo-panel bo-code-panel ${shakeKey ? `bo-shake-${shakeKey % 2 ? "a" : "b"}` : ""}`} aria-label="C# answer">
                <header className="panel-header">
                  <div><span className="panel-index">02</span><strong>YOUR CODE</strong></div>
                  <div className="panel-actions">
                    <button onClick={resetCode}><RotateCcw size={14} /> RESET CODE</button>
                  </div>
                </header>
                <div className="bo-code-body">
                  <ExpressionEditor
                    ref={editorRef}
                    value={value}
                    onChange={changeValue}
                    onRun={() => void check()}
                    disabled={checking || feedback?.tone === "correct"}
                    placeholder="type the C# expression"
                    compact
                    focusOnMount
                    keypadOnlyOnTouch
                  />

                  <div className={`bo-code-status is-${feedback?.tone ?? "idle"}`} role="status" aria-live="polite">
                    <span className="bo-status-icon">
                      {feedback?.tone === "correct" ? <Check size={18} /> : feedback?.tone === "wrong" ? <X size={18} /> : <Lightbulb size={16} />}
                    </span>
                    <div className="bo-status-copy">
                      <span className="bo-status-label">{feedback?.title ?? "READY"}</span>
                      <strong>{feedback?.tone === "correct" ? "Expression accepted." : feedback?.tone === "wrong" ? feedback.message : "Translate the math, then run it."}</strong>
                      {feedback?.tone === "wrong" && feedback.detail && <small>{feedback.detail}</small>}
                      {feedback?.tone === "correct" && feedback.transform && (
                        <span className="bo-transform">
                          {feedback.transform.writtenPrompt
                            ? <span className="bo-transform-written">{feedback.transform.writtenPrompt}</span>
                            : <MathExpression latex={feedback.transform.latex} label={feedback.transform.label} size="sm" />}
                          <ArrowRight size={14} />
                          <span className="bo-transform-code">
                            {safeTokens(feedback.transform.expression).map((token, tokenIndex) => (
                              <i
                                key={`${token.text}-${tokenIndex}`}
                                className={token.kind === "number" ? "is-number" : ""}
                                style={{ animationDelay: `${180 + tokenIndex * 70}ms` }}
                              >
                                {token.text}
                              </i>
                            ))}
                          </span>
                        </span>
                      )}
                      {feedback?.tone === "wrong" && contextualHint && (
                        <span className="bo-context-hint"><Lightbulb size={13} /> {contextualHint}</span>
                      )}
                      {hintsShown > 0 && (
                        <span className="bo-shown-hints">
                          {challenge.hintSequence.slice(hintsShown - 1, hintsShown).map((hint, hintIndex) => (
                            <span key={hintIndex}><Lightbulb size={12} /> {hint}</span>
                          ))}
                        </span>
                      )}
                    </div>
                    {feedback?.tone === "correct" && (
                      <div className="bo-status-values">
                        <span className="bo-output-label">OUTPUT</span>
                        <span className="bo-output-value">{feedback.output}</span>
                        {typeof feedback.xp === "number" && feedback.xp > 0 && <span className="bo-xp-pop">+{feedback.xp} XP</span>}
                      </div>
                    )}
                    {feedback?.tone === "wrong" && (
                      <div className="bo-status-values">
                        {feedback.output !== undefined && (
                          <>
                            <span className="bo-output-label">YOUR OUTPUT</span>
                            <span className="bo-output-value is-wrong">{feedback.output}</span>
                          </>
                        )}
                        {feedback.expected !== undefined && (
                          <>
                            <span className="bo-output-label">EXPECTED</span>
                            <span className="bo-output-value is-target">{feedback.expected}</span>
                          </>
                        )}
                      </div>
                    )}
                    {hintAvailable && (
                      <button className="bo-hint-button" onClick={showHint}>
                        <Lightbulb size={14} /> SHOW HINT <em>−10 XP</em>
                      </button>
                    )}
                  </div>

                  <div className="bo-run-row">
                    <span className="bo-run-note">CTRL / ⌘ + ENTER</span>
                    <button className="run-button bo-run" onClick={(event) => { wave.fire(event); void check(); }} disabled={checking || !value.trim()}>
                      <span>{checking ? "CHECKING" : "RUN / CHECK"}</span>
                      <Play size={17} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <KeypadPanel
              onRun={(event) => { wave.fire(event); void check(); }}
              disabled={checking || feedback?.tone === "correct"}
              onInsert={(symbol) => editorRef.current?.insert(symbol)}
              onBackspace={() => editorRef.current?.backspace()}
              onClear={resetCode}
              onResult={() => editorRef.current?.pulseResult()}
            />
          </div>
        </>
      )}
    </section>
  );
}
