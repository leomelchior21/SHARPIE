import { activeStudent } from "../activeStudent";
import { canSyncProgress, saveProgress } from "../progressStore";
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

// Scores go under the roster login of whoever is playing; guests keep them on the device only.
async function recordMathlerScore(score: { p_score?: number; p_streak?: number; p_time_attack?: number }): Promise<void> {
  const login = activeStudent.get()?.login;
  if (!supabase || !dedicatedScoresAvailable || !canSyncProgress(login)) return;
  const { error } = await supabase.rpc("sharpie_record_mathler_score", { p_login: login, ...score });
  if (!error) return;
  if (isMissingRelation(error.message)) {
    dedicatedScoresAvailable = false;
    return;
  }
  throw new Error(error.message);
}

export function submitTimeAttackScore(solved: number): Promise<void> {
  return recordMathlerScore({ p_time_attack: solved });
}

export function submitSurvivalScore(score: number, streak: number): Promise<void> {
  return recordMathlerScore({ p_score: score, p_streak: streak });
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
  await saveProgress(login, { codes: { mathler: payload } });
}

let dedicatedProgressAvailable = true;

export async function pushMathlerProgress(login: string, progress: BasicOpsProgress): Promise<void> {
  if (!supabase || !canSyncProgress(login)) return;
  const payload = mathlerSyncPayload(progress);
  if (dedicatedProgressAvailable) {
    const { error } = await supabase.rpc("sharpie_record_mathler_steps", {
      p_login: login,
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
  if (!canSyncProgress(login) || typeof window === "undefined") return;
  if (pendingProgressTimer !== null) window.clearTimeout(pendingProgressTimer);
  pendingProgressTimer = window.setTimeout(() => {
    pendingProgressTimer = null;
    void pushMathlerProgress(login, progress).catch(() => {
      // Offline or transient failure: the local draft stays authoritative.
    });
  }, 3000);
}
