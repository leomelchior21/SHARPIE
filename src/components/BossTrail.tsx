import { Check, LockKeyhole } from "lucide-react";
import type { CSSProperties } from "react";
import { BOSS_SECTORS } from "../data/finalBosses";
import type { BossDefinition } from "../data/finalBosses";

type BossTrailProps = {
  bosses: BossDefinition[];
  currentId: number;
  unlocked: number[];
  completed: number[];
  failedId: number | null;
  onSelect: (id: number) => void;
};

export function BossTrail({ bosses, currentId, unlocked, completed, failedId, onSelect }: BossTrailProps) {
  return (
    <nav className="boss-trail" aria-label="Boss trail">
      <span className="boss-trail-label">BOSS TRAIL</span>
      <div className="boss-trail-track">
        {BOSS_SECTORS.map((sector) => (
          <div className="boss-sector" key={sector.id}>
            <span className="boss-sector-label">{sector.label}</span>
            {sector.bossIds.map((id) => {
              const boss = bosses.find((entry) => entry.id === id);
              if (!boss) return null;
              const isUnlocked = unlocked.includes(id);
              const isComplete = completed.includes(id);
              const isCurrent = id === currentId;
              const state = isComplete ? "complete" : isCurrent ? "current" : isUnlocked ? "available" : "locked";
              return (
                <div className="boss-node-row" key={id} style={{ "--node-order": id } as CSSProperties}>
                  <button
                    type="button"
                    className={`boss-node ${state} ${failedId === id ? "boss-node-failed" : ""} ${id === 15 ? "boss-node-final" : ""}`}
                    onClick={() => isUnlocked && onSelect(id)}
                    disabled={!isUnlocked}
                    aria-label={`Boss ${String(id).padStart(2, "0")}, ${boss.title}, ${state}`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isComplete ? <Check size={14} /> : isUnlocked ? String(id).padStart(2, "0") : <LockKeyhole size={11} />}
                  </button>
                  {id !== sector.bossIds[sector.bossIds.length - 1] && (
                    <span className={`boss-connector ${isComplete ? "is-lit" : ""}`} aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
