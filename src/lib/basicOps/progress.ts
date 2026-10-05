import { TARGET_PUZZLES, WARMUP_TOTAL, translateChallengeCount } from "../../data/basicOperations";

export const BASIC_OPS_STORAGE_KEY = "sharpie:basic-operations:v2";

export const XP_TRANSLATE_SOLVE = 50;
export const XP_TRANSLATE_HINT = 10;
export const XP_LEVEL_BONUS = 100;
export const XP_TARGET_SOLVE = 150;
export const XP_TARGET_HINT = 25;
export const XP_RUSH_COMPLETE = 300;
export const MAX_RUSH_SCORE = 1_000_000;
export const MAX_SURVIVAL_SCORE = 2_000_000_000;

export type BasicOpsProgress = {
  translate: {
    warmupVersion: number;
    warmupSolved: number;
    currentLevel: number;
    cleared: number[];
    solvedByLevel: Record<string, number>;
    xp: number;
  };
  rush: {
    completed: boolean;
    roundsCleared: number;
    bestScore: number;
    bestCombo: number;
    xp: number;
  };
  target: {
    completed: string[];
    attempts: Record<string, number>;
    hintsUsed: Record<string, number>;
    xp: number;
    tutorialSeed: number;
    survivalBest: number;
    survivalBestStreak: number;
    timeAttackBest: number;
  };
  sound: boolean;
};

export function createBasicOpsProgress(): BasicOpsProgress {
  return {
    translate: { warmupVersion: 2, warmupSolved: 0, currentLevel: 1, cleared: [], solvedByLevel: {}, xp: 0 },
    rush: { completed: false, roundsCleared: 0, bestScore: 0, bestCombo: 0, xp: 0 },
    target: { completed: [], attempts: {}, hintsUsed: {}, xp: 0, tutorialSeed: 0, survivalBest: 0, survivalBestStreak: 0, timeAttackBest: 0 },
    sound: true,
  };
}

const puzzleIds = TARGET_PUZZLES.map((puzzle) => puzzle.id);

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
}

function levelRecord(value: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (!value || typeof value !== "object") return result;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const level = Number(key);
    if (!Number.isInteger(level) || level < 1 || level > 10) continue;
    result[key] = clampNumber(entry, 0, translateChallengeCount(level), 0);
  }
  return result;
}

function idCountRecord(value: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (!value || typeof value !== "object") return result;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!puzzleIds.includes(key)) continue;
    result[key] = clampNumber(entry, 0, 999, 0);
  }
  return result;
}

export function sanitizeBasicOpsProgress(value: unknown): BasicOpsProgress {
  const base = createBasicOpsProgress();
  if (!value || typeof value !== "object") return base;
  const source = value as Partial<BasicOpsProgress>;

  const cleared = Array.isArray(source.translate?.cleared)
    ? [...new Set(source.translate!.cleared.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry >= 1 && entry <= 10))].sort((a, b) => a - b)
    : [];

  const firstOpen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((level) => !cleared.includes(level)) ?? 10;
  const storedLevel = clampNumber(source.translate?.currentLevel, 1, 10, firstOpen);
  const currentLevel = cleared.includes(storedLevel) && firstOpen !== storedLevel ? storedLevel : firstOpen;

  const completed = Array.isArray(source.target?.completed)
    ? [...new Set(source.target!.completed.filter((entry): entry is string => typeof entry === "string" && puzzleIds.includes(entry)))]
    : [];

  return {
    translate: {
      warmupVersion: 2,
      warmupSolved: source.translate?.warmupVersion === 2
        ? clampNumber(source.translate.warmupSolved, 0, WARMUP_TOTAL, 0)
        : source.rush?.completed || cleared.length >= 10 ? WARMUP_TOTAL : 0,
      currentLevel,
      cleared,
      solvedByLevel: levelRecord(source.translate?.solvedByLevel),
      xp: clampNumber(source.translate?.xp, 0, 999_999, 0),
    },
    rush: {
      completed: Boolean(source.rush?.completed),
      roundsCleared: clampNumber(source.rush?.roundsCleared, 0, 5, 0),
      bestScore: clampNumber(source.rush?.bestScore, 0, MAX_RUSH_SCORE, 0),
      bestCombo: clampNumber(source.rush?.bestCombo, 0, 999, 0),
      xp: clampNumber(source.rush?.xp, 0, 999_999, 0),
    },
    target: {
      completed,
      attempts: idCountRecord(source.target?.attempts),
      hintsUsed: idCountRecord(source.target?.hintsUsed),
      xp: clampNumber(source.target?.xp, 0, 999_999, 0),
      tutorialSeed: clampNumber(source.target?.tutorialSeed, 0, 0x7fffffff, 0),
      survivalBest: clampNumber(source.target?.survivalBest, 0, MAX_SURVIVAL_SCORE, 0),
      survivalBestStreak: clampNumber(source.target?.survivalBestStreak, 0, MAX_SURVIVAL_SCORE, 0),
      timeAttackBest: clampNumber(source.target?.timeAttackBest, 0, MAX_SURVIVAL_SCORE, 0),
    },
    sound: source.sound === undefined ? true : Boolean(source.sound),
  };
}

function storageKey(login?: string) {
  return login ? `${BASIC_OPS_STORAGE_KEY}:${login}` : BASIC_OPS_STORAGE_KEY;
}

function available() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadBasicOpsProgress(login?: string): BasicOpsProgress {
  if (!available()) return createBasicOpsProgress();
  try {
    return sanitizeBasicOpsProgress(JSON.parse(window.localStorage.getItem(storageKey(login)) ?? "null"));
  } catch {
    return createBasicOpsProgress();
  }
}

export function saveBasicOpsProgress(progress: BasicOpsProgress, login?: string) {
  if (!available()) return;
  try {
    window.localStorage.setItem(storageKey(login), JSON.stringify(progress));
  } catch {
    // Private browsing can reject writes; the session keeps progress in memory.
  }
}

export function translateComplete(progress: BasicOpsProgress): boolean {
  return progress.translate.warmupSolved >= WARMUP_TOTAL;
}

export function rushComplete(progress: BasicOpsProgress): boolean {
  return progress.rush.completed;
}

export function targetComplete(progress: BasicOpsProgress): boolean {
  return progress.target.completed.length >= TARGET_PUZZLES.length;
}

export function moduleComplete(progress: BasicOpsProgress): boolean {
  return translateComplete(progress) && rushComplete(progress) && targetComplete(progress);
}

export function totalXp(progress: BasicOpsProgress): number {
  return progress.translate.xp + progress.rush.xp + progress.target.xp;
}

export function firstOpenLevel(progress: BasicOpsProgress): number {
  const open = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((level) => !progress.translate.cleared.includes(level));
  return open ?? progress.translate.currentLevel;
}

export function recordTranslateSolve(
  progress: BasicOpsProgress,
  level: number,
  usedHint: boolean,
): { progress: BasicOpsProgress; xp: number; levelCleared: boolean } {
  const total = translateChallengeCount(level);
  const key = String(level);
  const previous = progress.translate.solvedByLevel[key] ?? 0;
  const solved = Math.min(previous + 1, total);
  const firstPass = previous < total;
  const xpSolve = firstPass ? Math.max(XP_TRANSLATE_SOLVE - (usedHint ? XP_TRANSLATE_HINT : 0), 0) : 0;
  const levelCleared = solved >= total && !progress.translate.cleared.includes(level);
  const xpBonus = levelCleared ? XP_LEVEL_BONUS : 0;

  return {
    progress: {
      ...progress,
      translate: {
        ...progress.translate,
        currentLevel: levelCleared ? Math.min(10, level + 1) : progress.translate.currentLevel,
        cleared: levelCleared ? [...progress.translate.cleared, level].sort((a, b) => a - b) : progress.translate.cleared,
        solvedByLevel: { ...progress.translate.solvedByLevel, [key]: solved },
        xp: progress.translate.xp + xpSolve + xpBonus,
      },
    },
    xp: xpSolve + xpBonus,
    levelCleared,
  };
}

export function recordWarmupSolve(progress: BasicOpsProgress, usedHint: boolean): { progress: BasicOpsProgress; xp: number } {
  const firstPass = progress.translate.warmupSolved < WARMUP_TOTAL;
  const xp = firstPass ? XP_TRANSLATE_SOLVE - (usedHint ? XP_TRANSLATE_HINT : 0) : 0;
  return {
    progress: {
      ...progress,
      translate: {
        ...progress.translate,
        warmupSolved: Math.min(WARMUP_TOTAL, progress.translate.warmupSolved + 1),
        xp: progress.translate.xp + xp,
      },
    },
    xp,
  };
}

export function recordTargetAttempt(progress: BasicOpsProgress, id: string): BasicOpsProgress {
  return {
    ...progress,
    target: {
      ...progress.target,
      attempts: { ...progress.target.attempts, [id]: (progress.target.attempts[id] ?? 0) + 1 },
    },
  };
}

export function resetTargetAttempts(progress: BasicOpsProgress, id: string): BasicOpsProgress {
  const attempts = { ...progress.target.attempts };
  delete attempts[id];
  return { ...progress, target: { ...progress.target, attempts } };
}

export function recordTargetHint(progress: BasicOpsProgress, id: string): { progress: BasicOpsProgress; cost: number } {
  const cost = Math.min(XP_TARGET_HINT, progress.target.xp);
  return {
    progress: {
      ...progress,
      target: {
        ...progress.target,
        hintsUsed: { ...progress.target.hintsUsed, [id]: (progress.target.hintsUsed[id] ?? 0) + 1 },
        xp: progress.target.xp - cost,
      },
    },
    cost,
  };
}

export function recordTargetSolve(progress: BasicOpsProgress, id: string): { progress: BasicOpsProgress; xp: number } {
  if (progress.target.completed.includes(id)) return { progress, xp: 0 };
  return {
    progress: {
      ...progress,
      target: {
        ...progress.target,
        completed: [...progress.target.completed, id],
        xp: progress.target.xp + XP_TARGET_SOLVE,
      },
    },
    xp: XP_TARGET_SOLVE,
  };
}

export function setTargetTutorialSeed(progress: BasicOpsProgress, seed: number): BasicOpsProgress {
  return { ...progress, target: { ...progress.target, tutorialSeed: seed } };
}

export function recordSurvivalBest(progress: BasicOpsProgress, score: number, streak: number): BasicOpsProgress {
  return {
    ...progress,
    target: {
      ...progress.target,
      survivalBest: Math.max(progress.target.survivalBest, score),
      survivalBestStreak: Math.max(progress.target.survivalBestStreak, streak),
    },
  };
}

export function recordTimeAttackBest(progress: BasicOpsProgress, solved: number): BasicOpsProgress {
  return {
    ...progress,
    target: { ...progress.target, timeAttackBest: Math.max(progress.target.timeAttackBest, solved) },
  };
}

export function recordRushRound(progress: BasicOpsProgress, roundsCleared: number): BasicOpsProgress {
  return {
    ...progress,
    rush: { ...progress.rush, roundsCleared: Math.max(progress.rush.roundsCleared, Math.min(roundsCleared, 5)) },
  };
}

export function recordRushRun(progress: BasicOpsProgress, score: number, bestCombo: number): { progress: BasicOpsProgress; xp: number; completed: boolean } {
  const completed = !progress.rush.completed;
  const xp = completed ? XP_RUSH_COMPLETE : 0;
  return {
    progress: {
      ...progress,
      rush: {
        ...progress.rush,
        completed: true,
        roundsCleared: Math.max(progress.rush.roundsCleared, 5),
        bestScore: Math.max(progress.rush.bestScore, Math.min(Math.max(score, 0), MAX_RUSH_SCORE)),
        bestCombo: Math.max(progress.rush.bestCombo, Math.min(Math.max(bestCombo, 0), 999)),
        xp: progress.rush.xp + xp,
      },
    },
    xp,
    completed,
  };
}

export function setSoundEnabled(progress: BasicOpsProgress, sound: boolean): BasicOpsProgress {
  return { ...progress, sound };
}
