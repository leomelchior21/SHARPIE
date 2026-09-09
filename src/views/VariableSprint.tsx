import { ArrowLeft, ArrowRight, Check, LockKeyhole, Trophy } from "lucide-react";
import { useState } from "react";
import { VariableCodeMissions } from "../components/VariableCodeMissions";
import { memoryProgress } from "../lib/memoryProgress";

export function VariableSprint({ onBack }: { onBack: () => void }) {
  const unlocked = memoryProgress.isVariableSprintUnlocked();
  const [finished, setFinished] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);

  if (!unlocked) {
    return (
      <section className="variable-run locked-run screen-enter">
        <div className="locked-run-card">
          <LockKeyhole size={32} />
          <p>VARIABLE SPRINT</p>
          <h1>Complete Variable Run first.</h1>
          <button className="memory-primary compact-button" onClick={onBack}><ArrowLeft size={17} /> BACK TO MODULE</button>
        </div>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="variable-run-complete screen-enter">
        <div className="run-complete-card">
          <span className="complete-icon"><Check size={34} /></span>
          <p>VARIABLE SPRINT · {earnedXp} XP</p>
          <h1>SPRINT COMPLETE</h1>
          <div className="complete-code sprint-complete-score">
            <Trophy size={34} />
            <strong>{earnedXp} XP EARNED</strong>
          </div>
          <strong>You cleared all ten power rounds, ten code builds, and ten written C# missions.</strong>
          <button className="memory-primary" onClick={onBack}>BACK TO MODULE <ArrowRight size={17} /></button>
        </div>
      </section>
    );
  }

  return (
    <VariableCodeMissions
      mode="sprint"
      onBack={onBack}
      onFinish={(nextXp) => {
        memoryProgress.completeVariableSprint();
        setEarnedXp(nextXp);
        setFinished(true);
      }}
    />
  );
}
