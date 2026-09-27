import { AlertTriangle, Check, ChevronRight, Loader2, Play, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { BossDefinition } from "../data/finalBosses";
import type { BossTestCard } from "../lib/bossTestRunner";
import { formatBossInputs, formatBossNumber } from "../lib/bossTestRunner";

export type BossCompileError = {
  title: string;
  message: string;
  details: string;
  line?: number;
};

type BossTestLabPanelProps = {
  boss: BossDefinition;
  phase: "idle" | "running" | "passed" | "failed";
  cards: BossTestCard[];
  compileError: BossCompileError | null;
  nextLabel: string | null;
  runtimeLoading: boolean;
  onRun: () => void;
  onNext: () => void;
};

export function BossTestLabPanel({
  boss,
  phase,
  cards,
  compileError,
  nextLabel,
  runtimeLoading,
  onRun,
  onNext,
}: BossTestLabPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const shownCards = cards.length > 0 ? cards : [null, null, null];
  const passCount = cards.filter((card) => card.status === "pass").length;
  const firstFailIndex = cards.findIndex((card) => card.status === "fail" && !card.outputError);
  const isRunning = phase === "running";
  const isPassed = phase === "passed";
  const isFailed = phase === "failed";

  return (
    <section className={`work-panel boss-tests-panel phase-${phase}`} aria-live="polite" aria-label="Test lab">
      <header className="panel-header">
        <div><span className="panel-index">03</span><strong>TEST LAB</strong></div>
        <div className="panel-actions">
          <span className="boss-test-summary">
            {isPassed || isFailed ? `${passCount} / ${cards.length} PASSED` : isRunning ? "RUNNING" : "3 HIDDEN INPUTS"}
          </span>
        </div>
      </header>

      <div className="boss-tests-content">
        <div className="boss-test-statusline">
          {phase === "idle" && <small>Your solution will be checked with 3 hidden inputs.</small>}
          {isRunning && <small>Checking hidden inputs...</small>}
          {isPassed && <small>All hidden inputs passed.</small>}
          {isFailed && <small>{passCount} of {cards.length} hidden inputs passed.</small>}
          {isRunning && <span className="boss-lab-progress" aria-hidden="true"><i /></span>}
        </div>

        {shownCards.map((card, index) => (
          <article key={index} className={`boss-test-card is-${card?.status ?? "waiting"}`}>
            <header>
              <span className="boss-test-mark" aria-hidden="true">
                {card?.status === "pass" ? <Check size={15} /> : card?.status === "fail" ? <X size={15} /> : card?.status === "running" ? <Loader2 size={15} className="spin" /> : <i />}
              </span>
              <strong>TEST {String(index + 1).padStart(2, "0")}</strong>
              <span className="boss-test-status">
                {card?.status === "pass" ? "PASS" : card?.status === "fail" ? "FAIL" : card?.status === "running" ? "RUNNING" : "WAITING"}
              </span>
            </header>
            {card && card.status !== "waiting" && card.status !== "running" && (
              <div className="boss-test-body">
                {card.outputError ? (
                  <p className="boss-output-error"><AlertTriangle size={13} /> {card.outputError}</p>
                ) : (
                  <dl>
                    <div><dt>INPUT</dt><dd>{formatBossInputs(card.test.inputs)}</dd></div>
                    <div>
                      <dt>{boss.visualizer === "pythagorean" ? "EXPECTED c" : "EXPECTED"}</dt>
                      <dd>{card.test.expected.map((value) => formatBossNumber(value)).join(", ")}</dd>
                    </div>
                    <div>
                      <dt>{boss.visualizer === "pythagorean" ? "RECEIVED c" : "RECEIVED"}</dt>
                      <dd className={card.status === "fail" ? "is-wrong" : "is-right"}>
                        {card.received ? card.received.map((value) => formatBossNumber(value)).join(", ") : "no output"}
                      </dd>
                    </div>
                  </dl>
                )}
                {card.status === "fail" && !card.outputError && index === firstFailIndex && <p className="boss-test-nudge">{boss.failureHint}</p>}
              </div>
            )}
          </article>
        ))}

        {compileError && (
          <div className="boss-compile-error" role="alert">
            <div className="boss-compile-head">
              <AlertTriangle size={15} />
              <strong>COMPILER ERROR</strong>
              {compileError.line !== undefined && <span>LINE {compileError.line}</span>}
            </div>
            <p>{compileError.message}</p>
            <button type="button" onClick={() => setDetailsOpen((open) => !open)}>
              {detailsOpen ? "HIDE DETAILS" : "SHOW DETAILS"}
            </button>
            {detailsOpen && <code>{compileError.details}</code>}
          </div>
        )}

        {(isPassed || isFailed) && (
          <div className={`boss-verdict ${isPassed ? "is-passed" : "is-failed"}`}>
            <span className="boss-verdict-mark" aria-hidden="true">{isPassed ? <Check size={20} /> : <X size={19} />}</span>
            <div>
              <strong>{isPassed ? "BOSS DEFEATED" : `${passCount} / ${cards.length} TESTS PASSED`}</strong>
              <p>
                {isPassed
                  ? `${cards.length} / ${cards.length} TESTS PASSED · Your formula worked with every tested input.`
                  : passCount > 0
                    ? "Your formula worked for some cases, but not for every input."
                    : "Your formula did not match the hidden inputs yet."}
              </p>
            </div>
            {isPassed && <span className="boss-verdict-xp">+{boss.reward} XP</span>}
          </div>
        )}
      </div>

      <footer className="boss-actions">
        <button
          type="button"
          className={`memory-primary boss-run-button ${isPassed ? "progress-ready" : ""}`}
          onClick={isPassed ? onNext : onRun}
          disabled={isRunning || (!isPassed && runtimeLoading)}
        >
          {isRunning ? <>RUNNING... <Loader2 size={15} className="spin" /></> : isPassed ? <>{nextLabel ?? "NEXT BOSS"} <ChevronRight size={16} /></> : <>{isFailed ? "TRY AGAIN" : "RUN TESTS"} {isFailed ? <RotateCcw size={14} /> : <Play size={14} fill="currentColor" />}</>}
        </button>
      </footer>
    </section>
  );
}
