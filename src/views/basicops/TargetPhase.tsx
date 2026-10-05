import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Calculator, Check, Hash, LayoutGrid, LifeBuoy, Lightbulb, LogOut, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { Brand } from "../../components/Brand";
import { ExpressionEditor } from "../../components/basicops/ExpressionEditor";
import type { ExpressionEditorHandle } from "../../components/basicops/ExpressionEditor";
import { KeypadPanel } from "../../components/basicops/KeypadPanel";
import { MAX_TARGET_ATTEMPTS, generateTargetTutorialPuzzles, moduleSeed } from "../../data/basicOperations";
import { evaluateExpression } from "../../lib/basicOps/evaluation";
import { normalizeExpressionInput, resultEquals, safeTokens, tokenKey, validateTokens } from "../../lib/basicOps/expression";
import type { ExpressionToken } from "../../lib/basicOps/expression";
import {
  recordTargetAttempt,
  recordTargetHint,
  recordTargetSolve,
  resetTargetAttempts,
  setTargetTutorialSeed,
} from "../../lib/basicOps/progress";
import type { BasicOpsProgress } from "../../lib/basicOps/progress";
import { basicOpsSound } from "../../lib/basicOps/sound";
import { useRunWave } from "../../lib/basicOps/useRunWave";
import { useLiveCode } from "../../lib/useLiveCode";

type Stage = "intro" | "translate" | "rush" | "target" | "game" | "complete";

type TargetPhaseProps = {
  name: string;
  progress: BasicOpsProgress;
  replay?: boolean;
  onReplay?: () => void;
  onProgress: (progress: BasicOpsProgress) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onBack: () => void;
  onHome: () => void;
  onOpenStage: (stage: Stage) => void;
};

type AttemptRecord = {
  n: number;
  expression: string;
  tokens: ExpressionToken[];
  output?: string;
  status: "miss" | "win" | "rule" | "invalid";
  message?: string;
  delta?: number;
};

type CheckState = {
  tone: "miss" | "rule" | "invalid";
  title: string;
  message: string;
  detail?: string;
  output?: string;
  expected?: string;
};

type WinState = {
  attempt: number;
  alternative: boolean;
  expression: string;
  output: string;
  xp: number;
};

function operatorTone(operator: string) {
  return ({ "+": "plus", "-": "minus", "*": "star", "/": "slash", "%": "percent" } as Record<string, string>)[operator] ?? "paren";
}

export function TargetPhase({ name, progress, replay = false, onReplay, onProgress, soundOn, onToggleSound, onBack, onHome, onOpenStage }: TargetPhaseProps) {
  const [tutorialSeed] = useState(() => (replay ? moduleSeed() : progress.target.tutorialSeed || moduleSeed()) || 1);
  const puzzles = useMemo(() => generateTargetTutorialPuzzles(tutorialSeed), [tutorialSeed]);
  useEffect(() => {
    if (!replay && !progress.target.tutorialSeed) onProgress(setTargetTutorialSeed(progress, tutorialSeed));
  }, [progress, onProgress, replay, tutorialSeed]);
  const firstOpen = puzzles.find((item) => !progress.target.completed.includes(item.id))?.index ?? 1;
  const [puzzleIndex, setPuzzleIndex] = useState(replay ? 1 : firstOpen);
  const puzzle = puzzles[puzzleIndex - 1] ?? puzzles[0];
  const storedAttempts = replay ? 0 : Math.min(progress.target.attempts[puzzle.id] ?? 0, MAX_TARGET_ATTEMPTS);
  const [attemptsUsed, setAttemptsUsed] = useState(storedAttempts);
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckState | null>(null);
  const [win, setWin] = useState<WinState | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(() => replay ? 0 : Math.min(progress.target.hintsUsed[puzzle.id] ?? 0, puzzle.hints.length));
  const [hintFlash, setHintFlash] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const editorRef = useRef<ExpressionEditorHandle>(null);
  const wave = useRunWave();

  useLiveCode("mathler", value, `MODULE 04 · TARGET · PUZZLE ${puzzle.index}`);

  const puzzleIdRef = useRef(puzzle.id);
  useEffect(() => {
    if (puzzleIdRef.current === puzzle.id) return;
    puzzleIdRef.current = puzzle.id;
    setAttemptsUsed(replay ? 0 : Math.min(progress.target.attempts[puzzle.id] ?? 0, MAX_TARGET_ATTEMPTS));
    setHintsRevealed(replay ? 0 : Math.min(progress.target.hintsUsed[puzzle.id] ?? 0, puzzle.hints.length));
    setHistory([]);
    setValue("");
    setCheck(null);
    setWin(null);
    setHelpOpen(false);
    editorRef.current?.focus();
  }, [puzzle.id, progress.target.attempts, progress.target.hintsUsed, puzzle.hints.length, replay]);

  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => replay ? new Set<string>() : new Set(progress.target.completed));
  const remaining = Math.max(MAX_TARGET_ATTEMPTS - attemptsUsed, 0);
  const exhausted = exhaustedState(attemptsUsed, win);
  const completedCount = solvedIds.size;
  const madeMistake = history.some((record) => record.status !== "win");
  const canHelp = !win && !exhausted && madeMistake;

  const liveTokens = useMemo(() => safeTokens(value), [value]);
  const numberChips = useMemo(() => {
    const used = new Map<number, number>();
    for (const token of liveTokens) {
      if (token.kind === "number") used.set(token.value, (used.get(token.value) ?? 0) + 1);
    }
    const claimed = new Map<number, number>();
    return puzzle.numbers.map((number) => {
      const next = (claimed.get(number) ?? 0) + 1;
      claimed.set(number, next);
      return { number, used: next <= (used.get(number) ?? 0) };
    });
  }, [liveTokens, puzzle.numbers]);

  const operatorChips = useMemo(() => {
    const used = liveTokens.filter((token) => token.kind === "operator").map((token) => token.text);
    const claimed = new Map<string, number>();
    return puzzle.allowedOperators.map((operator) => {
      const next = (claimed.get(operator) ?? 0) + 1;
      claimed.set(operator, next);
      return { operator, used: next <= used.filter((item) => item === operator).length };
    });
  }, [liveTokens, puzzle.allowedOperators]);

  const runCheck = useCallback(async () => {
    if (checking || win || exhausted) return;
    const expression = normalizeExpressionInput(value);
    if (!expression) {
      editorRef.current?.focus();
      return;
    }
    setChecking(true);
    setCheck(null);
    try {
      const result = await evaluateExpression(expression);
      const attemptNumber = attemptsUsed + 1;

      if (!result.ok) {
        setHistory((list) => [...list, { n: attemptNumber, expression, tokens: result.tokens, status: "invalid", message: result.error.message }]);
        setCheck({ tone: "invalid", title: "SYNTAX ERROR", message: result.error.message, detail: result.error.detail });
        basicOpsSound.wrong();
        wave.resolve("bad");
        return;
      }

      const violations = validateTokens(result.tokens, {
        numbers: puzzle.numbers,
        numberUsage: puzzle.numberUsage,
        allowedOperators: puzzle.allowedOperators,
      });
      const delta = puzzle.target - result.value;
      const reachedTarget = resultEquals(result.value, puzzle.target);

      const withAttempt = replay ? progress : recordTargetAttempt(progress, puzzle.id);
      setAttemptsUsed(attemptNumber);

      if (reachedTarget && violations.length === 0) {
        const solved = recordTargetSolve(withAttempt, puzzle.id);
        if (!replay) onProgress(solved.progress);
        setSolvedIds((current) => new Set(current).add(puzzle.id));
        setHistory((list) => [...list, { n: attemptNumber, expression, tokens: result.tokens, output: result.output, status: "win" }]);
        const alternative = tokensDiffer(result.tokens, puzzle.referenceExpression);
        setWin({ attempt: attemptNumber, alternative, expression, output: result.output, xp: solved.xp });
        setCheck({ tone: "miss", title: "OUTPUT", message: `${result.output}`, detail: "Target reached.", output: result.output, expected: String(puzzle.target) });
        basicOpsSound.win();
        wave.resolve("good");
        return;
      }

      if (violations.length) {
        if (!replay) onProgress(withAttempt);
        setHistory((list) => [...list, { n: attemptNumber, expression, tokens: result.tokens, output: result.output, status: "rule", message: violations[0].message }]);
        setCheck({ tone: "rule", title: "RULE ERROR", message: violations[0].message, detail: violations[0].detail, output: result.output, expected: String(puzzle.target) });
        basicOpsSound.wrong();
        wave.resolve("bad");
        return;
      }

      if (!replay) onProgress(withAttempt);
      setHistory((list) => [...list, { n: attemptNumber, expression, tokens: result.tokens, output: result.output, status: "miss", delta }]);
      setCheck({
        tone: "miss",
        title: "OUTPUT",
        message: `${result.output}`,
        detail: `Target ${puzzle.target} · ${delta > 0 ? `${formatDifference(delta)} needed` : `${formatDifference(delta)} over`}`,
        output: result.output,
        expected: String(puzzle.target),
      });
      basicOpsSound.wrong();
      wave.resolve("bad");
    } finally {
      setChecking(false);
    }
  }, [checking, win, exhausted, value, attemptsUsed, progress, puzzle, onProgress, replay, wave]);

  useEffect(() => {
    const keyboardRun = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        wave.fire();
        void runCheck();
      }
    };
    window.addEventListener("keydown", keyboardRun);
    return () => window.removeEventListener("keydown", keyboardRun);
  }, [runCheck, wave]);

  const showHint = () => {
    if (hintsRevealed >= puzzle.hints.length || win) return;
    if (!replay) {
      const outcome = recordTargetHint(progress, puzzle.id);
      onProgress(outcome.progress);
    }
    setHintsRevealed((count) => count + 1);
    setHintFlash((count) => count + 1);
    basicOpsSound.click();
  };

  const nextPuzzle = () => {
    const next = puzzleIndex + 1;
    if (next > puzzles.length) {
      if (completedCount >= puzzles.length) {
        onOpenStage("game");
        return;
      }
      const fallback = puzzles.find((item) => !progress.target.completed.includes(item.id));
      if (fallback && fallback.index !== puzzleIndex) {
        setPuzzleIndex(fallback.index);
        basicOpsSound.click();
      }
      return;
    }
    setPuzzleIndex(next);
    basicOpsSound.click();
  };

  const retryPuzzle = () => {
    if (!replay) onProgress(resetTargetAttempts(progress, puzzle.id));
    setAttemptsUsed(0);
    setHistory([]);
    setValue("");
    setCheck(null);
    setWin(null);
    setHelpOpen(false);
    editorRef.current?.focus();
  };

  const goToPuzzle = (step: number) => {
    if (step === puzzleIndex) return;
    setPuzzleIndex(step);
    basicOpsSound.click();
  };

  const tryAnother = () => {
    setWin(null);
    setValue("");
    setCheck(null);
    editorRef.current?.focus();
  };

  const resetCode = () => {
    editorRef.current?.clear();
    setCheck(null);
    editorRef.current?.focus();
  };

  return (
    <section className={`bo-view bo-target bo-target-guided screen-enter ${check || hintsRevealed ? "has-feedback" : ""}`} aria-labelledby="bo-target-title">
      <header className="bo-target-header">
        <div className="bo-target-brand"><Brand compact asButton onClick={onBack} /></div>
        <nav className="bo-target-nav" aria-label="Target navigation">
          <button type="button" className="bo-target-nav-button" onClick={onHome}><LayoutGrid size={20} /> PANEL</button>
          <span className="bo-target-student"><small>ACTIVE STUDENT</small><strong>{name}</strong></span>
          <button type="button" className="bo-target-nav-button" onClick={onBack}><LogOut size={18} /> EXIT</button>
          <button type="button" className="bo-target-sound" onClick={onToggleSound} aria-label={soundOn ? "Mute sound" : "Enable sound"} aria-pressed={soundOn}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
        </nav>
      </header>

      <div className="bo-level-head">
        <div className="bo-level-copy">
          <span className="bo-kicker">MODULE 04&nbsp; | &nbsp;BASIC OPERATIONS</span>
          <h1 id="bo-target-title">{puzzle.index === puzzles.length ? "TARGET — Final Challenge" : "TARGET — Find the expression"}</h1>
          <p>Build a valid C# expression that reaches the target result.</p>
        </div>
        <div className="bo-head-side">
          <div className="bo-target-step-progress" role="group" aria-label={`Target progress: ${completedCount} of ${puzzles.length}`}>
            <button
              type="button"
              className={`bo-help-button ${helpOpen ? "is-open" : ""} ${canHelp && !helpOpen ? "is-ready" : ""}`}
              onClick={() => setHelpOpen((open) => !open)}
              disabled={!canHelp}
              aria-expanded={helpOpen}
              title={canHelp ? "Show the correct answer for this step" : "Try an answer first — help unlocks after a mistake"}
            >
              <LifeBuoy size={14} aria-hidden="true" /> NEED SOME HELP?
            </button>
            <div className="bo-target-step-info">
              <span>{puzzle.index === puzzles.length ? "FINAL" : "STEP"} {puzzle.index} / {puzzles.length}</span>
              <div className="bo-target-step-dots">
                {puzzles.map((item) => {
                  const passed = solvedIds.has(item.id);
                  const isCurrent = item.index === puzzleIndex;
                  return passed && !isCurrent ? (
                    <button
                      type="button"
                      key={item.id}
                      className="is-done"
                      onClick={() => goToPuzzle(item.index)}
                      aria-label={`Redo step ${item.index}`}
                      title={`Redo step ${item.index}`}
                    />
                  ) : (
                    <i key={item.id} className={`${passed ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bo-work-body">
        <div className="bo-work-main bo-target-main">
          <section className="bo-target-workbench" aria-label="Target task">
            <div className="bo-target-result-area">
              <h2>TARGET RESULT</h2>
              <div className={`bo-target-result-box ${win ? "is-cracked" : ""}`}><strong key={puzzle.id}>{puzzle.target}</strong></div>
              <div className="bo-target-ingredients">
                <div className={`bo-target-ingredient-group ${numberChips.length > 3 ? "is-dense" : ""}`} aria-label="Numbers to use">
                  <h3><Hash size={13} aria-hidden="true" /> USE THESE NUMBERS</h3>
                  <div>{numberChips.map((chip, chipIndex) => <span className={`bo-target-ingredient ${chip.used ? "is-used" : ""}`} key={`${chip.number}-${chipIndex}`}>{chip.number}</span>)}</div>
                </div>
                <div className={`bo-target-ingredient-group ${operatorChips.length > 5 ? "is-dense" : ""}`} aria-label="Available operators">
                  <h3><Calculator size={13} aria-hidden="true" /> AVAILABLE OPERATORS</h3>
                  <div>{operatorChips.map((chip, chipIndex) => <span className={`bo-target-ingredient bo-target-operator is-${operatorTone(chip.operator)} ${chip.used ? "is-used" : ""}`} key={`${chip.operator}-${chipIndex}`}>{chip.operator}</span>)}</div>
                </div>
              </div>
            </div>

            <div className="bo-target-code-area" aria-label="C# answer">
              <div className="bo-target-section-heading">
                <h2>YOUR CODE</h2>
                <div className="bo-target-code-actions">
                  <button type="button" onClick={showHint} disabled={hintsRevealed >= puzzle.hints.length || Boolean(win) || exhausted}><Lightbulb size={14} /> {hintsRevealed >= puzzle.hints.length ? "NO HINTS LEFT" : "HINT"}</button>
                  <button type="button" onClick={resetCode}><RotateCcw size={14} /> RESET</button>
                </div>
              </div>
              <ExpressionEditor
                ref={editorRef}
                value={value}
                onChange={(next) => { setValue(next); if (check) setCheck(null); }}
                onRun={() => { wave.fire(); void runCheck(); }}
                disabled={checking || Boolean(win) || exhausted}
                placeholder="type the C# expression"
                compact
              />
              {helpOpen && !win && (
                <div className="bo-answer-help" role="status">
                  <span><LifeBuoy size={13} aria-hidden="true" /> CORRECT ANSWER</span>
                  <code>double result = {puzzle.referenceExpression};</code>
                </div>
              )}
              <div className="bo-target-code-bottom">
                <div className={`bo-target-feedback ${check?.tone ?? ""}`} role="status" aria-live="polite">
                  {check && <><strong>{check.title}: {check.message}</strong>{check.detail && <span>{check.detail}</span>}</>}
                  {hintsRevealed > 0 && <span className={hintFlash ? "is-fresh" : ""}><Lightbulb size={13} /> {puzzle.hints[hintsRevealed - 1]}</span>}
                </div>
                <button type="button" className="bo-target-run-button" onClick={(event) => { wave.fire(event); void runCheck(); }} disabled={checking || Boolean(win) || exhausted}>
                  <Play size={21} fill="currentColor" /><span>{checking ? "CHECKING" : "RUN"}</span><kbd>Ctrl ↵</kbd>
                </button>
              </div>
            </div>

            <div className="bo-target-attempt-area" aria-label="Attempt history">
              <div className="bo-target-section-heading">
                <h2>ATTEMPTS</h2>
                <div className="bo-target-attempt-actions">
                  <span className="bo-attempts-count">{remaining} LEFT</span>
                {win && remaining > 0 && <button type="button" className="bo-target-text-action" onClick={tryAnother}>TRY ANOTHER</button>}
                {win && puzzleIndex === puzzles.length && onReplay && <button type="button" className="bo-target-text-action" onClick={onReplay}>REPLAY TARGET</button>}
                {win && <button type="button" className="bo-target-next" onClick={nextPuzzle}>{puzzleIndex === puzzles.length ? "PLAY MATHLER GAME" : "NEXT PUZZLE"} <ArrowRight size={14} /></button>}
                </div>
              </div>
              <div className="bo-target-attempt-list">
              {history.map((record) => (
                <div className={`bo-target-attempt-row is-${record.status}`} key={`${record.n}-${record.expression}`}>
                  <span className="bo-target-attempt-index">{record.status === "invalid" ? "—" : record.n}</span>
                  <code className="bo-target-attempt-expression">{record.expression}</code>
                  <span className="bo-target-attempt-arrow" aria-hidden="true">→</span>
                  <span className="bo-target-attempt-output">{record.output ?? "!"}</span>
                  {record.status === "win" && <span className="bo-target-attempt-match"><Check size={16} /> MATCHED TARGET</span>}
                  {record.message && <span className="bo-target-attempt-note"><AlertTriangle size={13} /> {record.message}</span>}
                </div>
              ))}
              {history.length === 0 && <p className="bo-target-attempt-empty">Your attempts will appear here.</p>}
              </div>
            </div>
          </section>

          {exhausted && (
            <div className="bo-target-overlay">
              <div className="bo-win-card is-exhausted">
                <span className="bo-win-mark is-warn"><X size={24} /></span>
                <span className="bo-kicker">NO ATTEMPTS LEFT</span>
                <h2>Reference expression:</h2>
                <code className="bo-win-code">double result = {puzzle.referenceExpression};</code>
                <small className="bo-win-note">Read it, then try this puzzle again — repetition is how the syntax sticks.</small>
                <div className="bo-complete-actions">
                  <button className="bo-primary" onClick={retryPuzzle}>
                    <RotateCcw size={15} /> RETRY PUZZLE
                  </button>
                  <button className="bo-secondary" onClick={nextPuzzle}>
                    {puzzleIndex >= puzzles.length ? "REVIEW UNSOLVED" : "SKIP FOR NOW"} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <KeypadPanel
          onRun={(event) => { wave.fire(event); void runCheck(); }}
          disabled={checking || Boolean(win) || exhausted}
          onInsert={(symbol) => { if (win || exhausted) return; editorRef.current?.insert(symbol); if (check) setCheck(null); }}
          onBackspace={() => { if (win || exhausted) return; editorRef.current?.backspace(); if (check) setCheck(null); }}
          onClear={() => { if (win || exhausted) return; resetCode(); }}
          onResult={() => editorRef.current?.pulseResult()}
        />
      </div>
    </section>
  );
}

function exhaustedState(attemptsUsed: number, win: WinState | null) {
  return !win && attemptsUsed >= MAX_TARGET_ATTEMPTS;
}

function tokensDiffer(tokens: ExpressionToken[], reference: string): boolean {
  const referenceTokens = safeTokens(reference);
  if (tokens.length !== referenceTokens.length) return true;
  return tokens.some((token, index) => tokenKey(token) !== tokenKey(referenceTokens[index]));
}

function formatDifference(delta: number): string {
  const rounded = Math.round(Math.abs(delta) * 1000) / 1000;
  return `${delta > 0 ? "+" : "−"}${rounded}`;
}
