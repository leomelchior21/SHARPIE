import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { PhaseHeader } from "../../components/basicops/PhaseHeader";
import { CONCEPT_SYMBOLS, TARGET_PUZZLES, WARMUP_TOTAL } from "../../data/basicOperations";
import { totalXp } from "../../lib/basicOps/progress";
import type { BasicOpsProgress } from "../../lib/basicOps/progress";

type ModuleCompleteProps = {
  name: string;
  progress: BasicOpsProgress;
  soundOn: boolean;
  onToggleSound: () => void;
  onBack: () => void;
  onHome: () => void;
  onReplayTarget: () => void;
};

export function ModuleComplete({ name, progress, soundOn, onToggleSound, onBack, onHome, onReplayTarget }: ModuleCompleteProps) {
  const rows = [
    { label: "WARMUP", value: `${progress.translate.warmupSolved} / ${WARMUP_TOTAL}`, copy: "examples translated" },
    { label: "TIMED RUSH", value: `${progress.rush.roundsCleared} / 5`, copy: `best ${progress.rush.bestScore.toLocaleString("en-US")} pts` },
    { label: "TARGET", value: `${progress.target.completed.length} / ${TARGET_PUZZLES.length}`, copy: `guided steps · time best ${progress.target.timeAttackBest} · survival streak ${progress.target.survivalBestStreak}` },
  ];

  return (
    <section className="bo-view bo-complete-view screen-enter" aria-labelledby="bo-complete-title">
      <PhaseHeader
        name={name}
        crumb="MODULE 04 | BASIC OPERATIONS"
        title="MATHLER COMPLETE"
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onHome={onHome}
        onBack={onBack}
      />

      <div className="bo-complete-stage">
        <div className="bo-complete-card is-final">
          <span className="bo-complete-mark"><Check size={30} /></span>
          <span className="bo-kicker">MODULE 04 COMPLETE</span>
          <h1 id="bo-complete-title">BASIC OPERATIONS</h1>

          <div className="bo-summary">
            {rows.map((row) => (
              <div className="bo-summary-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
                <small>{row.copy}</small>
              </div>
            ))}
          </div>

          <div className="bo-complete-concepts">
            <span className="bo-kicker">CONCEPTS MASTERED</span>
            <div className="bo-concepts">
              {CONCEPT_SYMBOLS.map((symbol) => (
                <span className="bo-concept" key={symbol}>{symbol}</span>
              ))}
            </div>
          </div>

          <p className="bo-final-line">YOU CAN NOW TURN MATH INTO CODE.</p>
          <div className="bo-complete-badges">
            <span>{totalXp(progress).toLocaleString("en-US")} XP TOTAL</span>
          </div>

          <div className="bo-complete-actions">
            <button className="bo-primary" onClick={onReplayTarget}>
              PLAY MATHLER GAME <ArrowRight size={17} />
            </button>
            <button className="bo-secondary" onClick={onBack}>BACK TO EXPERIMENTS</button>
            <button className="bo-secondary" onClick={onHome}>
              <RotateCcw size={15} /> MODULE HOME
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
