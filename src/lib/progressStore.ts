import { findStudent } from "../data/roster";
import { supabase } from "./supabase";

// Students do not sign in to Supabase: progress is saved under their roster
// login through sharpie_save_progress, which rejects logins not in the class.
export type ProgressPatch = {
  codes?: Record<string, unknown>;
  currentBoss?: number;
  completedBosses?: number[];
  xp?: number;
  attempts?: Record<string, number>;
};

export type StoredProgress = {
  current_boss: number | null;
  completed_bosses: number[] | null;
  xp: number | null;
  codes: Record<string, unknown> | null;
  attempts: Record<string, number> | null;
};

export function canSyncProgress(login: string | null | undefined): login is string {
  return !!supabase && !!login && findStudent(login)?.login === login;
}

export async function saveProgress(login: string, patch: ProgressPatch): Promise<void> {
  if (!supabase || !canSyncProgress(login)) return;
  const { error } = await supabase.rpc("sharpie_save_progress", {
    p_login: login,
    p_codes: patch.codes ?? {},
    p_current_boss: patch.currentBoss ?? null,
    p_completed_bosses: patch.completedBosses ?? null,
    p_xp: patch.xp ?? null,
    p_attempts: patch.attempts ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function loadProgress(login: string): Promise<StoredProgress | null> {
  if (!supabase || !canSyncProgress(login)) return null;
  const { data, error } = await supabase.rpc("sharpie_get_progress", { p_login: login });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as StoredProgress[];
  return rows[0] ?? null;
}
