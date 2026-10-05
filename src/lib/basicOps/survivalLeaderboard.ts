import { supabase } from "../supabase";
import type { BasicOpsProgress } from "./progress";

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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  return (data ?? []) as TimeAttackLeader[];
}

export async function submitTimeAttackScore(solved: number): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("sharpie_record_mathler_time_attack", { p_correct: solved });
  if (error) throw new Error(error.message);
}

export async function submitSurvivalScore(score: number, streak: number): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("sharpie_record_mathler_survival", {
    p_score: score,
    p_streak: streak,
  });
  if (error) throw new Error(error.message);
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

export async function fetchClassMathlerProgress(): Promise<MathlerProgressRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sharpie_mathler_progress")
    .select("login,display_name,class_code,warmup_solved,rush_completed,rush_rounds,target_completed,updated_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as MathlerProgressRow[];
}

export async function pushMathlerProgress(progress: BasicOpsProgress): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("sharpie_record_mathler_progress", {
    p_warmup: progress.translate.warmupSolved,
    p_rush_completed: progress.rush.completed,
    p_rush_rounds: progress.rush.roundsCleared,
    p_target: progress.target.completed.length,
  });
  if (error) throw new Error(error.message);
}

let pendingProgressTimer: number | null = null;

export function queueMathlerProgressSync(progress: BasicOpsProgress) {
  if (!supabase || typeof window === "undefined") return;
  if (pendingProgressTimer !== null) window.clearTimeout(pendingProgressTimer);
  pendingProgressTimer = window.setTimeout(() => {
    pendingProgressTimer = null;
    void pushMathlerProgress(progress).catch(() => {
      // Offline or transient failure: the local draft stays authoritative.
    });
  }, 900);
}
