import type { ClassCode, RosterStudent } from "../data/roster";
import { bossProgress, bossXp, createBossProgress, sanitizeBossProgress, unlockBossIds } from "./bossProgress";
import type { BossProgressState } from "./bossProgress";
import { supabase } from "./supabase";

export type SharpieProgressRow = {
  login: string;
  current_boss: number | null;
  completed_bosses: number[] | null;
  xp: number | null;
  codes: Record<string, string> | null;
  attempts: Record<string, number> | null;
  updated_at?: string | null;
};

type SharpieStudentRow = {
  login: string;
  display_name: string;
  class_code: ClassCode;
  group_name: string | null;
  sharpie_progress?: SharpieProgressRow | SharpieProgressRow[] | null;
};

export type ClassProgressRow = {
  student: RosterStudent;
  completedBosses: number[];
  xp: number;
  updatedAt: string | null;
  codes: Record<string, string>;
  attempts: Record<string, number>;
};

export function rowToBossProgress(row: SharpieProgressRow): BossProgressState {
  return sanitizeBossProgress({
    currentBoss: row.current_boss ?? 1,
    completedBosses: row.completed_bosses ?? [],
    unlockedBosses: [],
    codeByBoss: row.codes ?? {},
    attemptsByBoss: row.attempts ?? {},
  });
}

export function mergeBossProgress(local: BossProgressState, remote: BossProgressState | null): BossProgressState {
  if (!remote) return local;
  const completedBosses = [...new Set([...local.completedBosses, ...remote.completedBosses])].sort((a, b) => a - b);
  const unlockedBosses = unlockBossIds(completedBosses);

  const codeByBoss: Record<string, string> = { ...remote.codeByBoss };
  for (const [key, value] of Object.entries(local.codeByBoss)) {
    if (value?.trim()) codeByBoss[key] = value;
  }

  const attemptsByBoss: Record<string, number> = { ...remote.attemptsByBoss };
  for (const [key, value] of Object.entries(local.attemptsByBoss)) {
    attemptsByBoss[key] = Math.max(attemptsByBoss[key] ?? 0, value);
  }

  const currentBoss = unlockedBosses.includes(local.currentBoss) ? local.currentBoss : unlockedBosses[0] ?? 1;
  return sanitizeBossProgress({ currentBoss, completedBosses, unlockedBosses, codeByBoss, attemptsByBoss });
}

export async function fetchBossProgress(login: string): Promise<BossProgressState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("sharpie_progress")
    .select("login, current_boss, completed_bosses, xp, codes, attempts")
    .eq("login", login)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToBossProgress(data as SharpieProgressRow) : null;
}

export async function pushBossProgress(login: string, state: BossProgressState): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("sharpie_progress").upsert(
    {
      login,
      module: "final-bosses",
      current_boss: state.currentBoss,
      completed_bosses: state.completedBosses,
      xp: bossXp(state.completedBosses),
      codes: state.codeByBoss,
      attempts: state.attemptsByBoss,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "login" },
  );
  if (error) throw new Error(error.message);
}

const pendingSync = new Map<string, number>();

export function queueBossProgressSync(login: string, state: BossProgressState) {
  if (!supabase) return;
  const existing = pendingSync.get(login);
  if (existing) window.clearTimeout(existing);
  const timer = window.setTimeout(() => {
    pendingSync.delete(login);
    void pushBossProgress(login, state).catch(() => {
      // Offline or transient failure: the local draft stays authoritative and
      // the next change queues another attempt.
    });
  }, 900);
  pendingSync.set(login, timer);
}

export async function fetchClassProgress(): Promise<ClassProgressRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sharpie_students")
    .select("login, display_name, class_code, group_name, sharpie_progress(current_boss, completed_bosses, xp, codes, attempts, updated_at)");
  if (error) throw new Error(error.message);

  return (data ?? []).map((entry) => {
    const record = entry as unknown as SharpieStudentRow;
    const embedded = Array.isArray(record.sharpie_progress) ? record.sharpie_progress[0] : record.sharpie_progress;
    const progress = embedded ? rowToBossProgress(embedded) : createBossProgress();
    return {
      student: {
        login: record.login,
        name: record.display_name,
        classCode: record.class_code,
        group: record.group_name,
      },
      completedBosses: progress.completedBosses,
      xp: bossXp(progress.completedBosses),
      updatedAt: embedded?.updated_at ?? null,
      codes: progress.codeByBoss,
      attempts: progress.attemptsByBoss,
    };
  });
}

export function hydrateBossProgress(login: string): Promise<BossProgressState | null> {
  const local = bossProgress.load(login);
  return fetchBossProgress(login).then((remote) => {
    const merged = mergeBossProgress(local, remote);
    bossProgress.save(merged, login);
    return merged;
  });
}
