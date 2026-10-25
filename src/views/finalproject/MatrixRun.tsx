import { BackroomRun } from './backroom/BackroomRun';
import type { BackroomProgress } from './backroom/types';
import { award, levelXp, type Progress, type Update } from './progress';

// The complete PixPy game lives in ./backroom. This adapter only connects its
// player identity, score records, and navigation to the Sharpie module.
export function MatrixRun({ progress, update, name, studentKey, isTeacher, preview = false, onBack, paused = false }: {
  progress: Progress;
  update: Update;
  name: string;
  studentKey: string;
  isTeacher: boolean;
  preview?: boolean;
  onBack: () => void;
  paused?: boolean;
}) {
  const gameProgress: BackroomProgress = {
    username: studentKey,
    name,
    isTeacher,
    unlockAll: preview,
    backroomRunBest: progress.best,
    backroomRunXp: progress.backroom.bestXp,
    backroomRunGates: progress.backroom.gates,
    backroomRunOperators: progress.backroom.operators,
    levelStars: progress.backroom.levels,
    skills: progress.backroom.skills,
    coachSeen: progress.backroom.coach,
  };
  const save = (next: BackroomProgress) => update(p => {
    const bestXp = Math.max(p.backroom.bestXp, next.backroomRunXp);
    const levels = p.backroom.levels.map((stars, i) => Math.max(stars, next.levelStars[i] ?? 0));
    let saved = award({
      ...p,
      best: Math.max(p.best, next.backroomRunBest),
      backroom: {
        bestXp,
        gates: Math.max(p.backroom.gates, next.backroomRunGates),
        operators: [...new Set([...p.backroom.operators, ...next.backroomRunOperators])],
        levels,
        skills: next.skills,
        coach: [...new Set([...p.backroom.coach, ...next.coachSeen])],
      },
    }, 'backroom:best-run', bestXp);
    levels.forEach((stars, i) => { if (stars > 0) saved = award(saved, `backroom:level:${i}`, levelXp); });
    return saved;
  });
  return <BackroomRun progress={gameProgress} onProgress={save} onBack={onBack} paused={paused} />;
}
