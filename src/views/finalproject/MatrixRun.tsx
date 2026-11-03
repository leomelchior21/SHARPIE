import { BackroomRun } from './backroom/BackroomRun';
import type { BackroomProgress } from './backroom/types';

// The complete game lives in ./backroom, shared with PixPy. In Sharpie it is a plain web
// game: its progress is kept by FinalProject in backroomStore, on this device only, and is
// never sent to Supabase or the teacher dashboard.
export function MatrixRun({ progress, onProgress, preview = false, onBack, paused = false }: {
  progress: BackroomProgress;
  onProgress: (next: BackroomProgress) => void;
  preview?: boolean;
  onBack: () => void;
  paused?: boolean;
}) {
  return <BackroomRun progress={{ ...progress, unlockAll: preview }} onProgress={onProgress} onBack={onBack} paused={paused} />;
}
