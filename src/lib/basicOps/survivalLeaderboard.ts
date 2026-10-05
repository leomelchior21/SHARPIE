import { supabase } from "../supabase";
import { MAX_SURVIVAL_SCORE } from "./progress";
import type { BasicOpsProgress } from "./progress";

function isMissingRelation(message: string) {
  return /does not exist|could not find the (table|function)|schema cache/i.test(message);
}

export type SurvivalLeader = {
  display_name: string;
  class_code: string;
  best_score: number;
  best_streak: number;
};

export type TimeAttackLeader = {
  display_name: string;
  class_code: string;
  time_attack_best: number;
};

export type MathlerScoreRow = {
  login: string;
  display_name: string;
  class_code: string;
  best_score: number;
  best_streak: number;
  time_attack_best: number;
  updated_at: string | null;
};

export async function fetchClassMathlerScores(): Promise<MathlerScoreRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sharpie_mathler_scores")
    .select("login,display_name,class_code,best_score,best_streak,time_attack_best,updated_at");
  if (error) {
    if (isMissingRelation(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as MathlerScoreRow[];
}

export async function fetchSurvivalLeaderboard(): Promise<SurvivalLeader[]> {
  if (!supabase) throw new Error("Class leaderboard is unavailable in local mode.");
  const { data, error } = await supabase
    .from("sharpie_mathler_scores")
    .select("display_name,class_code,best_score,best_streak")
    .gt("best_streak", 0)
    .order("best_streak", { ascending: false })
    .order("best_score", { ascending: false })
    .limit(20);
  if (error) {
    if (isMissingRelation(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as SurvivalLeader[];
}

export async function fetchTimeAttackLeaderboard(): Promise<TimeAttackLeader[]> {
  if (!supabase) throw new Error("Class leaderboard is unavailable in local mode.");
  const { data, error } = await supabase
    .from("sharpie_mathler_scores")
    .select("display_name,class_code,time_attack_best")
    .gt("time_attack_best", 0)
    .order("time_attack_best", { ascending: false })
    .limit(20);
  if (error) {
    if (isMissingRelation(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as TimeAttackLeader[];
}

let dedicatedScoresAvailable = true;

export async function submitTimeAttackScore(solved: number): Promise<void> {
  if (!supabase || !dedicatedScoresAvailable) return;
  const { error } = await supabase.rpc("sharpie_record_mathler_time_attack", { p_correct: solved });
  if (!error) return;
  if (isMissingRelation(error.message)) {
    dedicatedScoresAvailable = false;
    return;
  }
  throw new Error(error.message);
}

export async function submitSurvivalScore(score: number, streak: number): Promise<void> {
  if (!supabase || !dedicatedScoresAvailable) return;
  const { error } = await supabase.rpc("sharpie_record_mathler_survival", {
    p_score: score,
    p_streak: streak,
  });
  if (!error) return;
  if (isMissingRelation(error.message)) {
    dedicatedScoresAvailable = false;
    return;
  }
  throw new Error(error.message);
}

export type MathlerProgressRow = {
  login: string;
  display_name: string;
  class_code: string;
  warmup_solved: number;
  rush_completed: boolean;
  rush_rounds: number;
  target_completed: number;
  updated_at: string | null;
};

export type MathlerSyncState = {
  warmup: number;
  rushCompleted: boolean;
  rushRounds: number;
  target: number;
  timeAttack: number;
  survivalStreak: number;
  survivalScore: number;
  updatedAt: string | null;
};

function syncCount(value: unknown, max: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(Math.max(Math.round(numeric), 0), max);
}

export function parseMathlerSyncState(value: unknown): MathlerSyncState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const warmup = syncCount(raw.warmup, 1000);
  const rushRounds = syncCount(raw.rushRounds, 100);
  const target = syncCount(raw.target, 1000);
  if (warmup === null || rushRounds === null || target === null) return null;
  return {
    warmup,
    rushCompleted: Boolean(raw.rushCompleted),
    rushRounds,
    target,
    timeAttack: syncCount(raw.timeAttack, MAX_SURVIVAL_SCORE) ?? 0,
    survivalStreak: syncCount(raw.survivalStreak, MAX_SURVIVAL_SCORE) ?? 0,
    survivalScore: syncCount(raw.survivalScore, MAX_SURVIVAL_SCORE) ?? 0,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

export function mathlerSyncPayload(progress: BasicOpsProgress): MathlerSyncState {
  return {
    warmup: progress.translate.warmupSolved,
    rushCompleted: progress.rush.completed,
    rushRounds: progress.rush.roundsCleared,
    target: progress.target.completed.length,
    timeAttack: progress.target.timeAttackBest,
    survivalStreak: progress.target.survivalBestStreak,
    survivalScore: progress.target.survivalBest,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchClassMathlerProgress(): Promise<MathlerProgressRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sharpie_mathler_progress")
    .select("login,display_name,class_code,warmup_solved,rush_completed,rush_rounds,target_completed,updated_at");
  if (error) {
    if (isMissingRelation(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as MathlerProgressRow[];
}

// The dedicated sharpie_mathler_progress table is optional. When it is not in
// the project yet, the same state is mirrored inside sharpie_progress.codes so
// the teacher dashboard still tracks the three steps.
async function writeMathlerSyncState(login: string, payload: MathlerSyncState): Promise<void> {
  if (!supabase || !login) return;
  const { data, error } = await supabase.from("sharpie_progress").select("codes").eq("login", login).maybeSingle();
  if (error) throw new Error(error.message);
  const existing = data?.codes && typeof data.codes === "object" ? (data.codes as Record<string, unknown>) : {};
  const { error: writeError } = await supabase.from("sharpie_progress").upsert(
    { login, codes: { ...existing, mathler: payload }, updated_at: payload.updatedAt },
    { onConflict: "login" },
  );
  if (writeError) throw new Error(writeError.message);
}

let dedicatedProgressAvailable = true;

export async function pushMathlerProgress(login: string, progress: BasicOpsProgress): Promise<void> {
  if (!supabase || !login) return;
  const payload = mathlerSyncPayload(progress);
  if (dedicatedProgressAvailable) {
    const { error } = await supabase.rpc("sharpie_record_mathler_progress", {
      p_warmup: payload.warmup,
      p_rush_completed: payload.rushCompleted,
      p_rush_rounds: payload.rushRounds,
      p_target: payload.target,
    });
    if (error) {
      if (isMissingRelation(error.message)) dedicatedProgressAvailable = false;
      else throw new Error(error.message);
    }
  }
  await writeMathlerSyncState(login, payload);
}

let pendingProgressTimer: number | null = null;

export function queueMathlerProgressSync(login: string, progress: BasicOpsProgress) {
  if (!supabase || typeof window === "undefined") return;
  if (pendingProgressTimer !== null) window.clearTimeout(pendingProgressTimer);
  pendingProgressTimer = window.setTimeout(() => {
    pendingProgressTimer = null;
    void pushMathlerProgress(login, progress).catch(() => {
      // Offline or transient failure: the local draft stays authoritative.
    });
  }, 900);
}
