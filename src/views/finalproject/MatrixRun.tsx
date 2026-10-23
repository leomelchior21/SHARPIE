import { BackroomRun } from './backroom/BackroomRun';
import type { BackroomProgress } from './backroom/types';
import { award, type Progress, type Update } from './progress';

// The complete PixPy game lives in ./backroom. This adapter only connects its
// player identity, score records, and navigation to the Sharpie module.
export function MatrixRun({ progress, update, name, studentKey, isTeacher, onBack, paused = false }: {
  progress: Progress;
  update: Update;
  name: string;
  studentKey: string;
  isTeacher: boolean;
  onBack: () => void;
  paused?: boolean;
}) {
  const gameProgress: BackroomProgress = {
    username: studentKey,
    name,
    isTeacher,
    backroomRunBest: progress.best,
    backroomRunXp: progress.backroom.bestXp,
    backroomRunGates: progress.backroom.gates,
    backroomRunOperators: progress.backroom.operators,
  };
  const save = (next: BackroomProgress) => update(p => {
    const bestXp = Math.max(p.backroom.bestXp, next.backroomRunXp);
    return award({
      ...p,
      best: Math.max(p.best, next.backroomRunBest),
      backroom: {
        bestXp,
        gates: Math.max(p.backroom.gates, next.backroomRunGates),
        operators: [...new Set([...p.backroom.operators, ...next.backroomRunOperators])],
      },
    }, 'backroom:best-run', bestXp);
  });
  return <BackroomRun progress={gameProgress} onProgress={save} onBack={onBack} paused={paused} />;
}
