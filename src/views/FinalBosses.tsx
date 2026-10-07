import { setDiagnostics } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { ArrowLeft, Check, Lightbulb, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BossBriefPanel } from "../components/BossBriefPanel";
import type { BossDiagramState } from "../components/BossBriefPanel";
import { BossTestLabPanel } from "../components/BossTestLabPanel";
import type { BossCompileError } from "../components/BossTestLabPanel";
import { BossTrail } from "../components/BossTrail";
import { Brand } from "../components/Brand";
import { finalBosses } from "../data/finalBosses";
import type { BossDefinition } from "../data/finalBosses";
import { bossProgress, bossXp, completeBoss, nextBossId } from "../lib/bossProgress";
import type { BossProgressState } from "../lib/bossProgress";
import { fetchBossProgress, mergeBossProgress } from "../lib/bossSync";
import { supabase } from "../lib/supabase";
import { evaluateBossTest, selectBossTests } from "../lib/bossTestRunner";
import type { BossTestCard } from "../lib/bossTestRunner";
import { csharpEditorBasicSetup, csharpEditorExtensions } from "../lib/csharpSyntax";
import { executeCSharp, prepareCSharp } from "../lib/runner";
import type { RunnerError } from "../types";
import { useLiveCode } from "../lib/useLiveCode";

type AttemptPhase = "idle" | "running" | "passed" | "failed";

type Attempt = {
  phase: AttemptPhase;
  cards: BossTestCard[];
  compileError: BossCompileError | null;
  diagramIndex: number | null;
};

const IDLE_ATTEMPT: Attempt = { phase: "idle", cards: [], compileError: null, diagramIndex: null };

function bossById(id: number): BossDefinition | undefined {
  return finalBosses.find((boss) => boss.id === id);
}

function toCompileError(error: RunnerError): BossCompileError {
  return { title: error.title, message: error.message, details: error.compiler, line: error.line };
}

function updateCard(attempt: Attempt, index: number, patch: Partial<BossTestCard>): Attempt {
  return { ...attempt, cards: attempt.cards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card)) };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function FinalBosses({
  onBack,
  fullAccess = false,
  studentLogin,
  onProgressChange,
}: {
  onBack: () => void;
  fullAccess?: boolean;
  studentLogin?: string;
  onProgressChange?: (state: BossProgressState) => void;
}) {
  const [progress, setProgress] = useState<BossProgressState>(() => bossProgress.load(studentLogin, fullAccess));
  const progressRef = useRef(progress);
  const [bossId, setBossId] = useState(() => progressRef.current.currentBoss);
  const boss = bossById(bossId) ?? finalBosses[0];
  const [code, setCode] = useState(() => progressRef.current.codeByBoss[String(progressRef.current.currentBoss)] ?? bossById(progressRef.current.currentBoss)?.starterCode ?? "");
  const codeRef = useRef(code);
  const [attempt, setAttempt] = useState<Attempt>(IDLE_ATTEMPT);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [resetPending, setResetPending] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [failedId, setFailedId] = useState<number | null>(null);
  const [unlockSweep, setUnlockSweep] = useState(false);
  const [showCompletion, setShowCompletion] = useState(() => progressRef.current.completedBosses.length === finalBosses.length);
  const [runtimeReady, setRuntimeReady] = useState<"loading" | "ready" | "error">("loading");
  const abortRef = useRef<AbortController | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const failTimerRef = useRef<number | null>(null);
  const onProgressChangeRef = useRef(onProgressChange);
  const extensions = useMemo(() => csharpEditorExtensions, []);
  const isRunning = attempt.phase === "running";
  const completed = progress.completedBosses;
  const xp = bossXp(completed);
  const nextId = nextBossId(completed, bossId, fullAccess);

  useLiveCode("final-bosses", code, `Boss ${String(boss.id).padStart(2, "0")} · ${boss.title}`);

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  const commitProgress = useCallback((next: BossProgressState) => {
    progressRef.current = next;
    bossProgress.save(next, studentLogin);
    setProgress(next);
    onProgressChangeRef.current?.(next);
  }, [studentLogin]);

  useEffect(() => {
    if (!studentLogin || !supabase) return;
    let active = true;
    fetchBossProgress(studentLogin)
      .then((remote) => {
        if (!active || !remote) return;
        const merged = mergeBossProgress(progressRef.current, remote);
        commitProgress(merged);
        if (merged.completedBosses.length === finalBosses.length) setShowCompletion(true);
      })
      .catch(() => {
        // Keep working offline with the local draft.
      });
    return () => {
      active = false;
    };
  }, [commitProgress, studentLogin]);

  useEffect(() => {
    let active = true;
    prepareCSharp()
      .then(() => { if (active) setRuntimeReady("ready"); })
      .catch(() => { if (active) setRuntimeReady("error"); });
    return () => {
      active = false;
      abortRef.current?.abort();
      if (failTimerRef.current) window.clearTimeout(failTimerRef.current);
    };
  }, []);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (progressRef.current.codeByBoss[String(bossId)] === code) return;
      commitProgress({ ...progressRef.current, codeByBoss: { ...progressRef.current.codeByBoss, [String(bossId)]: code } });
      setDraftSaved(true);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [bossId, code, commitProgress]);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;
    const error = attempt.compileError;
    if (error?.line !== undefined) {
      const lineNumber = Math.min(Math.max(1, error.line), view.state.doc.lines);
      const line = view.state.doc.line(lineNumber);
      view.dispatch(setDiagnostics(view.state, [{ from: line.from, to: line.to, severity: "error", message: error.message }]));
    } else {
      view.dispatch(setDiagnostics(view.state, []));
    }
  }, [attempt.compileError]);

  const flashFailedNode = useCallback((id: number) => {
    setFailedId(id);
    if (failTimerRef.current) window.clearTimeout(failTimerRef.current);
    failTimerRef.current = window.setTimeout(() => setFailedId(null), 650);
  }, []);

  const selectBoss = useCallback((id: number) => {
    const target = bossById(id);
    const current = progressRef.current;
    if (!target || !current.unlockedBosses.includes(id)) return;
    abortRef.current?.abort();
    abortRef.current = null;
    commitProgress({ ...current, currentBoss: id, codeByBoss: { ...current.codeByBoss, [String(bossId)]: codeRef.current } });
    setBossId(id);
    setCode(progressRef.current.codeByBoss[String(id)] ?? target.starterCode);
    setAttempt(IDLE_ATTEMPT);
    setHintsRevealed(0);
    setResetPending(false);
    setDraftSaved(false);
  }, [bossId, commitProgress]);

  const confirmReset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setCode(boss.starterCode);
    codeRef.current = boss.starterCode;
    setAttempt(IDLE_ATTEMPT);
    setResetPending(false);
    setDraftSaved(false);
    commitProgress({ ...progressRef.current, codeByBoss: { ...progressRef.current.codeByBoss, [String(bossId)]: boss.starterCode } });
  };

  const runTests = useCallback(async () => {
    if (abortRef.current) return;
    const target = bossById(bossId);
    if (!target) return;
    const tests = selectBossTests(target);
    const controller = new AbortController();
    abortRef.current = controller;
    const initialCards: BossTestCard[] = tests.map((test) => ({ status: "waiting", test, received: null }));
    setAttempt({ phase: "running", cards: initialCards, compileError: null, diagramIndex: null });
    commitProgress({
      ...progressRef.current,
      attemptsByBoss: {
        ...progressRef.current.attemptsByBoss,
        [String(bossId)]: (progressRef.current.attemptsByBoss[String(bossId)] ?? 0) + 1,
      },
    });

    try {
      if (runtimeReady !== "ready") {
        setRuntimeReady("loading");
        await prepareCSharp();
        setRuntimeReady("ready");
      }
      let passCount = 0;
      for (let index = 0; index < tests.length; index += 1) {
        if (controller.signal.aborted) return;
        setAttempt((previous) => updateCard(previous, index, { status: "running" }));
        await delay(120);
        const result = await executeCSharp(codeRef.current, controller.signal, tests[index].inputs.map(String));
        if (controller.signal.aborted) return;
        if (result.error) {
          const compileError = toCompileError(result.error);
          setAttempt((previous) => ({
            ...updateCard(previous, index, { status: "fail", received: null, outputError: result.error?.message }),
            phase: "failed",
            compileError,
            diagramIndex: null,
          }));
          flashFailedNode(target.id);
          return;
        }
        const outcome = evaluateBossTest(target, tests[index], result.output);
        if (outcome.status === "pass") passCount += 1;
        setAttempt((previous) => ({ ...updateCard(previous, index, { status: outcome.status, received: outcome.received, outputError: outcome.outputError }), diagramIndex: index }));
        await delay(70);
      }
      if (passCount === tests.length) {
        const before = progressRef.current;
        const next = completeBoss(before, target.id, fullAccess);
        commitProgress(next);
        if (next.unlockedBosses.length > before.unlockedBosses.length) {
          setUnlockSweep(true);
          window.setTimeout(() => setUnlockSweep(false), 950);
        }
        setAttempt((previous) => ({ ...previous, phase: "passed" }));
      } else {
        setAttempt((previous) => ({ ...previous, phase: "failed" }));
        flashFailedNode(target.id);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setRuntimeReady("error");
        setAttempt((previous) => ({
          ...previous,
          phase: "failed",
          compileError: {
            title: "C# COULD NOT LOAD",
            message: "The browser could not start its C# engine.",
            details: error instanceof Error ? error.message : "Try again.",
          },
        }));
        flashFailedNode(target.id);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [bossId, commitProgress, flashFailedNode, fullAccess, runtimeReady]);

  const goNext = () => {
    const next = nextBossId(progressRef.current.completedBosses, bossId, fullAccess);
    if (next === null) {
      setShowCompletion(true);
      return;
    }
    selectBoss(next);
  };

  const diagram: BossDiagramState = useMemo(() => {
    const index = attempt.diagramIndex;
    const card = index === null ? null : attempt.cards[index];
    if (!card) return { a: null, b: null, c: null, revealed: false };
    const [a = null, b = null] = card.test.inputs;
    return {
      a,
      b,
      c: card.status === "pass" ? card.received?.[0] ?? null : null,
      revealed: card.status === "pass",
    };
  }, [attempt.cards, attempt.diagramIndex]);

  const isModified = code !== boss.starterCode;
  const showCompleteView = showCompletion && completed.length === finalBosses.length;
  const isFinalVictory = attempt.phase === "passed" && boss.id === finalBosses.length;
  const bossLayout = boss.visualizer === "pythagorean" ? "visual" : boss.helper || boss.steps ? "dense" : "default";

  return (
    <section className="final-bosses screen-enter" aria-labelledby="final-bosses-title">
      <header className="variable-run-header">
        <div className="playground-identity">
          <Brand compact asButton onClick={onBack} />
          <span className="header-divider" />
          <div>
            <span>MODULE 05</span>
            <strong id="final-bosses-title">FINAL BOSSES</strong>
          </div>
        </div>
        <div className="run-meta">
          <span className="xp-chip boss-xp" key={xp}><Trophy size={14} /> {xp} XP</span>
          <span className="boss-progress-count">{String(completed.length).padStart(2, "0")} / {finalBosses.length}</span>
          <button className="icon-text-button" onClick={onBack}><ArrowLeft size={17} /><span>MODULE</span></button>
        </div>
      </header>

      {showCompleteView ? (
        <div className="boss-workspace boss-complete-workspace" data-sector="5">
          <section className="boss-complete-view" aria-label="Final Bosses complete">
            <span className="boss-complete-mark"><Check size={30} /></span>
            <p>FINAL BOSSES COMPLETE</p>
            <h1>15 / 15 BOSSES DEFEATED</h1>
            <div className="boss-complete-badges">
              <span>ALL HIDDEN TESTS COMPLETED</span>
              <span>VARIABLES + FORMULAS MASTERED</span>
            </div>
            <strong className="boss-complete-xp">+500 XP</strong>
            <p className="boss-complete-copy">
              You used variables, operators, percentages, multi-step formulas and geometry to create solutions that worked with different inputs.
            </p>
            <div className="boss-complete-actions">
              <button className="memory-primary" onClick={() => setShowCompletion(false)}>REVIEW BOSSES</button>
              <button className="boss-secondary-button" onClick={onBack}>RETURN TO MODULE</button>
            </div>
          </section>
          <BossTrail bosses={finalBosses} currentId={bossId} unlocked={progress.unlockedBosses} completed={completed} failedId={null} onSelect={selectBoss} />
        </div>
      ) : (
        <div className={`boss-workspace ${unlockSweep ? "is-unlocking" : ""} ${isFinalVictory ? "is-final-victory" : ""}`} data-sector={boss.sector} data-layout={bossLayout}>
          <BossBriefPanel
            boss={boss}
            total={finalBosses.length}
            hintsRevealed={hintsRevealed}
            diagram={diagram}
            isRunning={isRunning}
            resetPending={resetPending}
            onRequestReset={() => setResetPending(true)}
            onCancelReset={() => setResetPending(false)}
            onConfirmReset={confirmReset}
          />

          <section className="work-panel boss-editor-panel" aria-label="C# code editor">
            <header className="panel-header">
              <div><span className="panel-index">02</span><strong>CODE</strong></div>
              <div className="panel-actions">
                <button
                  type="button"
                  onClick={() => setHintsRevealed((count) => Math.min(count + 1, boss.hints.length))}
                  disabled={isRunning || hintsRevealed >= boss.hints.length}
                >
                  <Lightbulb size={12} /> HINT
                </button>
                <span className="language-chip">C#</span>
              </div>
            </header>
            <div className="editor-wrap">
              <CodeMirror
                value={code}
                height="100%"
                theme="dark"
                extensions={extensions}
                onChange={(value) => {
                  setCode(value);
                  codeRef.current = value;
                  setDraftSaved(false);
                  const view = editorViewRef.current;
                  if (attempt.compileError && view) view.dispatch(setDiagnostics(view.state, []));
                }}
                onCreateEditor={(view) => { editorViewRef.current = view; }}
                basicSetup={csharpEditorBasicSetup}
                editable={!isRunning}
                readOnly={isRunning}
                indentWithTab
                aria-label="C# code for the current boss"
              />
            </div>
            <footer className="editor-footer">
              <span>{draftSaved && isModified ? "DRAFT SAVED" : "EDIT THE FORMULA"}</span>
              <span>BOSS {String(boss.id).padStart(2, "0")} • {boss.category}</span>
            </footer>
          </section>

          <BossTrail bosses={finalBosses} currentId={bossId} unlocked={progress.unlockedBosses} completed={completed} failedId={failedId} onSelect={selectBoss} />

          <BossTestLabPanel
            boss={boss}
            phase={attempt.phase}
            cards={attempt.cards}
            compileError={attempt.compileError}
            nextLabel={nextId === null ? "FINISH" : "NEXT BOSS"}
            runtimeLoading={runtimeReady === "loading"}
            onRun={() => void runTests()}
            onNext={goNext}
          />
        </div>
      )}
    </section>
  );
}
