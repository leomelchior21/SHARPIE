import { Lightbulb, RotateCcw } from "lucide-react";
import type { BossDefinition } from "../data/finalBosses";
import { PythagoreanDiagram } from "./PythagoreanDiagram";

export type BossDiagramState = {
  a: number | null;
  b: number | null;
  c: number | null;
  revealed: boolean;
};

type BossBriefPanelProps = {
  boss: BossDefinition;
  total: number;
  hintsRevealed: number;
  diagram: BossDiagramState;
  isRunning: boolean;
  resetPending: boolean;
  onRequestReset: () => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
};

export function BossBriefPanel({
  boss,
  total,
  hintsRevealed,
  diagram,
  isRunning,
  resetPending,
  onRequestReset,
  onCancelReset,
  onConfirmReset,
}: BossBriefPanelProps) {
  const bossNumber = String(boss.id).padStart(2, "0");

  return (
    <section className="work-panel boss-brief-panel" aria-labelledby="boss-brief-title">
      <header className="panel-header">
        <div><span className="panel-index">01</span><strong>BOSS CHALLENGE</strong></div>
        <div className="panel-actions">
          {resetPending ? (
            <div className="boss-reset-confirm">
              <span>RESET BOSS {bossNumber} CODE?</span>
              <button type="button" onClick={onCancelReset}>CANCEL</button>
              <button type="button" className="is-danger" onClick={onConfirmReset}>RESET</button>
            </div>
          ) : (
            <>
              <span className="boss-counter">{bossNumber} / {String(total).padStart(2, "0")}</span>
              <button type="button" onClick={onRequestReset} disabled={isRunning}>
                <RotateCcw size={12} /> RESET CODE
              </button>
            </>
          )}
        </div>
      </header>

      <div className="boss-brief-content">
        <p className="boss-eyebrow">BOSS {String(boss.id).padStart(2, "0")} // {boss.category}</p>
        <h1 id="boss-brief-title">{boss.title}</h1>
        <div className="boss-description">
          {boss.description.split("\n").map((line) => (
            <p key={line}><RichLine text={line} /></p>
          ))}
        </div>

        {boss.steps && (
          <ol className="boss-steps">
            {boss.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        )}

        {boss.helper && (
          <div className="boss-helper">
            <code>{boss.helper.name}</code>
            <p>{boss.helper.text}</p>
            <small>{boss.helper.example}</small>
          </div>
        )}

        {boss.visualizer === "pythagorean" && (
          <PythagoreanDiagram a={diagram.a} b={diagram.b} c={diagram.c} revealed={diagram.revealed} />
        )}

        {hintsRevealed > 0 && (
          <div className="boss-hints">
            <span>HINTS</span>
            {boss.hints.slice(0, hintsRevealed).map((hint, index) => (
              <p key={hint}><Lightbulb size={12} /> <RichLine text={`${index + 1}. ${hint}`} /></p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RichLine({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, index) => (index % 2 === 1 ? <code key={`${part}-${index}`}>{part}</code> : <span key={`${part}-${index}`}>{part}</span>))}
    </>
  );
}
