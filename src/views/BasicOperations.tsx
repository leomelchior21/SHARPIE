import { useCallback, useEffect, useState } from "react";
import { loadBasicOpsProgress, rushComplete, saveBasicOpsProgress, setSoundEnabled, targetComplete, translateComplete } from "../lib/basicOps/progress";
import type { BasicOpsProgress } from "../lib/basicOps/progress";
import { basicOpsSound } from "../lib/basicOps/sound";
import { queueMathlerProgressSync } from "../lib/basicOps/survivalLeaderboard";
import { ModuleComplete } from "./basicops/ModuleComplete";
import { ModuleIntro } from "./basicops/ModuleIntro";
import { OperatorRushPhase } from "./basicops/OperatorRushPhase";
import { MathlerGamePhase } from "./basicops/MathlerGamePhase";
import { TargetPhase } from "./basicops/TargetPhase";
import { TranslatePhase } from "./basicops/TranslatePhase";
import "./basicops/basicops.css";

type Stage = "intro" | "translate" | "rush" | "target" | "game" | "complete";

type BasicOperationsProps = {
  name: string;
  studentKey?: string;
  onBack: () => void;
};

export function BasicOperations({ name, studentKey, onBack }: BasicOperationsProps) {
  const [progress, setProgress] = useState<BasicOpsProgress>(() => loadBasicOpsProgress(studentKey));
  const [stage, setStage] = useState<Stage>("intro");
  const [replayTarget, setReplayTarget] = useState(false);
  const [targetRunId, setTargetRunId] = useState(0);

  const applyProgress = useCallback(
    (next: BasicOpsProgress) => {
      setProgress(next);
      saveBasicOpsProgress(next, studentKey);
      if (studentKey) queueMathlerProgressSync(studentKey, next);
    },
    [studentKey],
  );

  useEffect(() => {
    basicOpsSound.setEnabled(progress.sound);
  }, [progress.sound]);

  useEffect(() => {
    const unlock = () => basicOpsSound.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const toggleSound = () => {
    const next = setSoundEnabled(progress, !progress.sound);
    basicOpsSound.setEnabled(next.sound);
    applyProgress(next);
    if (next.sound) basicOpsSound.click();
  };

  const start = () => {
    if (!translateComplete(progress)) setStage("translate");
    else if (!rushComplete(progress)) setStage("rush");
    else if (!targetComplete(progress)) setStage("target");
    else setStage("game");
  };

  const openTargetReplay = () => {
    setReplayTarget(true);
    setTargetRunId((id) => id + 1);
    setStage("target");
  };

  const shared = {
    name,
    progress,
    onProgress: applyProgress,
    soundOn: progress.sound,
    onToggleSound: toggleSound,
    onBack,
    onHome: () => setStage("intro"),
    onOpenStage: (next: Stage) => setStage(next),
  };

  if (stage === "translate") {
    return <TranslatePhase {...shared} />;
  }

  if (stage === "rush") {
    return <OperatorRushPhase {...shared} />;
  }

  if (stage === "target") {
    return <TargetPhase key={targetRunId} {...shared} replay={replayTarget} onReplay={openTargetReplay} />;
  }

  if (stage === "game") {
    return <MathlerGamePhase {...shared} onOpenStage={() => setStage("complete")} />;
  }

  if (stage === "complete") {
    return (
      <ModuleComplete
        name={name}
        progress={progress}
        soundOn={progress.sound}
        onToggleSound={toggleSound}
        onBack={onBack}
        onHome={() => setStage("intro")}
        onReplayTarget={() => setStage("game")}
      />
    );
  }

  return (
    <ModuleIntro
      name={name}
      progress={progress}
      soundOn={progress.sound}
      onToggleSound={toggleSound}
      onBack={onBack}
      onStart={start}
      onOpenStage={(next) => setStage(next)}
      onReplayWarmup={() => setStage("translate")}
      onReplayTarget={openTargetReplay}
    />
  );
}
