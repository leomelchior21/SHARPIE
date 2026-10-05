import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, Check, Crosshair, LockKeyhole, Trophy, X, Zap } from "lucide-react";
import { SyntaxLine } from "../../components/SyntaxLine";
import { PhaseHeader } from "../../components/basicops/PhaseHeader";
import { TokenLegend } from "../../components/basicops/AttemptTiles";
import { CONCEPT_SYMBOLS, TARGET_PUZZLES, WARMUP_TOTAL } from "../../data/basicOperations";
import { rushComplete, targetComplete, translateComplete } from "../../lib/basicOps/progress";
import type { BasicOpsProgress } from "../../lib/basicOps/progress";

type Stage = "intro" | "translate" | "rush" | "target" | "game" | "complete";

type ModuleIntroProps = {
  name: string;
  progress: BasicOpsProgress;
  soundOn: boolean;
  onToggleSound: () => void;
  onBack: () => void;
  onStart: () => void;
  onOpenStage: (stage: Stage) => void;
  onReplayWarmup: () => void;
  onReplayTarget: () => void;
};

type TrackState = "open" | "current" | "locked" | "done";

export function ModuleIntro({ name, progress, soundOn, onToggleSound, onBack, onStart, onOpenStage, onReplayWarmup, onReplayTarget }: ModuleIntroProps) {
  const [showHow, setShowHow] = useState(false);
  const translateDone = translateComplete(progress);
  const rushDone = rushComplete(progress);
  const targetDone = targetComplete(progress);

  const tracks: {
    id: Stage;
    number: string;
    title: string;
    copy: string;
    detail: string;
    state: TrackState;
    icon: ReactNode;
  }[] = [
    {
      id: "translate",
      number: "01",
      title: "TRANSLATE THE FORMULAS",
      copy: "Translate 3 per operator, then clear 5 timed rounds of 4.",
      detail: rushDone ? `BEST ${progress.rush.bestScore}` : `${progress.translate.warmupSolved} / ${WARMUP_TOTAL} translations`,
      state: rushDone ? "done" : "current",
      icon: <Zap size={26} />,
    },
    {
      id: "target",
      number: "02",
      title: "WARM UP",
      copy: "Learn to reach a target in 12 guided challenges.",
      detail: `${progress.target.completed.length} / ${TARGET_PUZZLES.length} guided steps`,
      state: targetDone ? "done" : "open",
      icon: <Crosshair size={26} />,
    },
    {
      id: "game",
      number: "03",
      title: "MATHLER GAME",
      copy: "Race the clock in Time Attack or keep your streak in Survival.",
      detail: `TIME ${progress.target.timeAttackBest} · SURVIVAL ${progress.target.survivalBestStreak}`,
      state: "open",
      icon: <Trophy size={26} />,
    },
  ];

  return (
    <section className="bo-view bo-intro-view screen-enter" aria-labelledby="bo-intro-title">
      <PhaseHeader
        name={name}
        crumb="MODULE 04 | BASIC OPERATIONS"
        title="MATHLER"
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onBack={onBack}
      />

      <div className="bo-intro">
        <div className="bo-intro-hero">
          <span className="bo-kicker">MODULE 04 | BASIC OPERATIONS</span>
          <h1 id="bo-intro-title">CRACK THE FORMULA.</h1>
          <p>Turn math into code. Then use code to crack the result.</p>
        </div>

        <div className="bo-tracks">
          {tracks.map((track) => {
            const interactive = track.state !== "locked";
            return (
              <button
                type="button"
                className={`bo-track is-${track.state} is-${track.id}`}
                key={track.id}
                disabled={!interactive}
                onClick={interactive ? () => {
                  if (track.id === "translate" && rushDone) onReplayWarmup();
                  else if (track.id === "translate") onOpenStage(translateDone ? "rush" : "translate");
                  else if (track.id === "target" && targetDone) onReplayTarget();
                  else onOpenStage(track.id);
                } : undefined}
                aria-disabled={!interactive}
              >
                <span className="bo-track-top">
                  <span>{track.number}</span>
                  {track.state === "done" ? <span className="bo-track-badge is-done"><Check size={13} /> COMPLETE</span> : track.state === "locked" ? <span className="bo-track-badge is-locked"><LockKeyhole size={13} /> LOCKED</span> : <span className="bo-track-badge is-live"><i /> AVAILABLE</span>}
                </span>
                <span className="bo-track-icon">{track.icon}</span>
                <span className="bo-track-visual" aria-hidden="true">
                  {track.id === "translate" ? (
                    <span className="bo-track-translate-art">
                      <span className="bo-track-math-line">8 + 3 × 2</span>
                      <span className="bo-track-translation-arrow">↓</span>
                      <code><SyntaxLine code="double result = 8 + 3 * 2;" /></code>
                    </span>
                  ) : track.id === "target" ? (
                    <span className="bo-track-target-art">
                      <span className="bo-track-target-value">22</span>
                      <span className="bo-track-target-equation">8 × 3 − 2</span>
                    </span>
                  ) : (
                    <span className="bo-track-survival-art"><Trophy size={38} /><strong>60s / ∞</strong><small>TWO WAYS TO PLAY</small></span>
                  )}
                </span>
                <span className="bo-track-copy">
                  <strong>{track.title}</strong>
                  <small>{track.copy}</small>
                </span>
                <span className="bo-track-foot">
                  <span>{track.detail}</span>
                  {interactive && <ArrowUpRight size={16} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bo-intro-foot">
          <div className="bo-concepts" aria-label="Operators in this module">
            {CONCEPT_SYMBOLS.map((symbol) => (
              <span className="bo-concept" key={symbol}>{symbol}</span>
            ))}
          </div>
          <div className="bo-intro-actions">
            {translateDone && <button type="button" className="bo-secondary" onClick={onReplayWarmup}>REPLAY TRANSLATIONS</button>}
            {targetDone && <button type="button" className="bo-secondary" onClick={onReplayTarget}>REPLAY TARGET WARM UP</button>}
            <button type="button" className="bo-primary" onClick={onStart}>
              {translateDone && rushDone && targetDone ? "PLAY MATHLER GAME" : "START MODULE"} <ArrowUpRight size={18} />
            </button>
            <button type="button" className="bo-secondary" onClick={() => setShowHow(true)}>
              HOW IT WORKS
            </button>
          </div>
        </div>
      </div>

      {showHow && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowHow(false)}>
          <div className="modal bo-how-modal" role="dialog" aria-modal="true" aria-labelledby="bo-how-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowHow(false)} aria-label="Close help"><X size={18} /></button>
            <span className="modal-kicker">HOW IT WORKS</span>
            <h2 id="bo-how-title">Math in. C# out.</h2>
            <div className="bo-how-steps">
              <div><b>1</b><div><strong>Build a formula</strong><small>using numbers and operators.</small></div></div>
              <div><b>2</b><div><strong>Test your result</strong><small>and read the feedback.</small></div></div>
              <div><b>3</b><div><strong>Refine your code</strong><small>until you crack the challenge.</small></div></div>
            </div>
            <TokenLegend />
            <p className="bo-how-note">Translate three examples for each operator, then clear five timed rounds of four. A wrong answer restarts the current round. Twelve guided Target challenges prepare you for Mathler Game: solve as many targets as you can in one minute in Time Attack, or stretch three lives as far as you can in Survival.</p>
          </div>
        </div>
      )}
    </section>
  );
}
