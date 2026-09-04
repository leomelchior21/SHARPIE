import { ArrowLeft, ArrowUpRight, Check, Database, LockKeyhole, Route } from "lucide-react";
import { useState } from "react";
import { Brand } from "../components/Brand";
import { memoryProgress } from "../lib/memoryProgress";

type MemoryMachineHubProps = {
  name: string;
  onBack: () => void;
  onOpenExperience: () => void;
  onOpenVariableRun: () => void;
};

export function MemoryMachineHub({
  name,
  onBack,
  onOpenExperience,
  onOpenVariableRun,
}: MemoryMachineHubProps) {
  const [unlocked] = useState(memoryProgress.isVariableRunUnlocked);
  const memoryComplete = memoryProgress.isMemoryMachineCompleted();
  const runComplete = memoryProgress.isVariableRunCompleted();

  return (
    <section className="memory-hub screen-enter" aria-labelledby="memory-hub-title">
      <header className="playground-header">
        <div className="playground-identity">
          <Brand compact asButton onClick={onBack} />
          <span className="header-divider" />
          <div>
            <span>MODULE 02</span>
            <strong>MEMORY MACHINE</strong>
          </div>
        </div>
        <div className="playground-tools">
          <span className="student-chip"><i /> {name}</span>
          <button className="icon-text-button back-button" onClick={onBack}>
            <ArrowLeft size={17} /> <span>SHARPIE</span>
          </button>
        </div>
      </header>

      <div className="memory-hub-main">
        <div className="memory-hub-copy">
          <p>THE MEMORY LAB</p>
          <h1 id="memory-hub-title">Teach the machine.<br />Then build its memory.</h1>
        </div>

        <div className="memory-experience-grid">
          <button className="memory-experience-card is-available memory-card-purple" onClick={onOpenExperience}>
            <span className="memory-card-number">01</span>
            <span className="memory-card-icon"><Database size={28} /></span>
            <span className="memory-card-copy">
              <strong>Memory Machine</strong>
              <small>A machine that remembers you.</small>
            </span>
            <span className="memory-card-status">
              {memoryComplete ? <><Check size={14} /> COMPLETE</> : <><i /> AVAILABLE</>}
            </span>
            <span className="memory-card-enter">ENTER <ArrowUpRight size={18} /></span>
          </button>

          <button
            className={`memory-experience-card ${unlocked ? "is-available" : "is-locked"}`}
            onClick={unlocked ? onOpenVariableRun : undefined}
            disabled={!unlocked}
          >
            <span className="memory-card-number">02</span>
            <span className="memory-card-icon"><Route size={28} /></span>
            <span className="memory-card-copy">
              <strong>Variable Run</strong>
              <small>Create your first variables.</small>
            </span>
            <span className="memory-card-status">
              {unlocked ? (
                runComplete ? <><Check size={14} /> COMPLETE</> : <><i /> UNLOCKED</>
              ) : (
                <><LockKeyhole size={14} /> UNLOCK: MEMORY MACHINE</>
              )}
            </span>
            {unlocked && <span className="memory-card-enter">ENTER <ArrowUpRight size={18} /></span>}
          </button>
        </div>
      </div>
    </section>
  );
}
