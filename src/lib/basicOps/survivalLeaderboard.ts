import { supabase } from "../supabase";

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
