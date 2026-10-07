import {
  BOSS_COMPLETION_BONUS,
  BOSS_SECTORS,
  finalBosses,
} from "../data/finalBosses";

export type BossProgressState = {
  currentBoss: number;
  unlockedBosses: number[];
  completedBosses: number[];
  codeByBoss: Record<string, string>;
  attemptsByBoss: Record<string, number>;
};

const STORAGE_KEY = "sharpie:final-bosses:v2";
const bossIds = finalBosses.map((boss) => boss.id);

function storageKey(login?: string) {
  return login ? `${STORAGE_KEY}:${login}` : STORAGE_KEY;
}

export function createBossProgress(fullAccess = false): BossProgressState {
  return {
    currentBoss: BOSS_SECTORS[0].bossIds[0],
    unlockedBosses: unlockBossIds([], fullAccess),
    completedBosses: [],
    codeByBoss: {},
    attemptsByBoss: {},
  };
}

function sortedInts(value: unknown, min: number, max: number): number[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<number>();
  for (const item of value) {
    const numeric = Number(item);
    if (Number.isInteger(numeric) && numeric >= min && numeric <= max) unique.add(numeric);
  }
  return [...unique].sort((a, b) => a - b);
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (/^\d+$/.test(key) && typeof entry === "string") result[key] = entry;
  }
  return result;
}

function countRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const numeric = Number(entry);
    if (/^\d+$/.test(key) && Number.isInteger(numeric) && numeric >= 0) result[key] = numeric;
  }
  return result;
}

export function unlockBossIds(completed: number[], fullAccess = false): number[] {
  if (fullAccess) return [...bossIds];
  const done = new Set(completed);
  const unlocked: number[] = [];
  for (const [index, sector] of BOSS_SECTORS.entries()) {
    if (index === 0) {
      unlocked.push(...sector.bossIds);
      continue;
    }
    const previous = BOSS_SECTORS[index - 1];
    if (previous.bossIds.every((id) => done.has(id))) {
      unlocked.push(...sector.bossIds);
    } else {
      break;
    }
  }
  return unlocked;
}

export function isBossUnlocked(id: number, completed: number[]): boolean {
  return unlockBossIds(completed).includes(id);
}

export function nextBossId(completed: number[], currentId: number, fullAccess = false): number | null {
  const unlocked = unlockBossIds(completed, fullAccess);
  const incomplete = unlocked.filter((id) => !completed.includes(id));
  if (incomplete.length === 0) return null;
  if (incomplete.includes(currentId)) return currentId;
  return incomplete[0];
}

export function bossXp(completed: number[]): number {
  const done = new Set(completed);
  const earned = finalBosses.reduce((total, boss) => (done.has(boss.id) ? total + boss.reward : total), 0);
  const allComplete = bossIds.every((id) => done.has(id));
  return earned + (allComplete ? BOSS_COMPLETION_BONUS : 0);
}

export function sanitizeBossProgress(value: unknown, fullAccess = false): BossProgressState {
  const base = createBossProgress(fullAccess);
  if (!value || typeof value !== "object") return base;

  const completedBosses = sortedInts((value as BossProgressState).completedBosses, 1, bossIds.length);
  const unlocked = unlockBossIds(completedBosses, fullAccess);
  const storedCurrent = Number((value as BossProgressState).currentBoss);
  const currentBoss = unlocked.includes(storedCurrent)
    ? storedCurrent
    : nextBossId(completedBosses, storedCurrent, fullAccess) ?? unlocked[0] ?? 1;

  return {
    currentBoss,
    unlockedBosses: unlocked,
    completedBosses,
    codeByBoss: stringRecord((value as BossProgressState).codeByBoss),
    attemptsByBoss: countRecord((value as BossProgressState).attemptsByBoss),
  };
}

export function completeBoss(state: BossProgressState, id: number, fullAccess = false): BossProgressState {
  const completedBosses = state.completedBosses.includes(id)
    ? state.completedBosses
    : [...state.completedBosses, id].sort((a, b) => a - b);
  const unlockedBosses = unlockBossIds(completedBosses, fullAccess);
  const next = nextBossId(completedBosses, state.currentBoss, fullAccess);
  return {
    ...state,
    completedBosses,
    unlockedBosses,
    currentBoss: next ?? state.currentBoss,
  };
}

function available() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export const bossProgress = {
  load: (login?: string, fullAccess = false): BossProgressState => {
    if (!available()) return createBossProgress(fullAccess);
    try {
      return sanitizeBossProgress(JSON.parse(window.localStorage.getItem(storageKey(login)) ?? "null"), fullAccess);
    } catch {
      return createBossProgress(fullAccess);
    }
  },
  save: (state: BossProgressState, login?: string) => {
    if (!available()) return;
    try {
      window.localStorage.setItem(storageKey(login), JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private browsing; progress stays in memory.
    }
  },
  clear: (login?: string) => {
    if (available()) window.localStorage.removeItem(storageKey(login));
  },
};
