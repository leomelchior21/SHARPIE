import { TARGET_PUZZLES, WARMUP_TOTAL } from "../../data/basicOperations";
import { finalBosses } from "../../data/finalBosses";
import type { ClassCode, RosterStudent } from "../../data/roster";
import type { MathlerProgressRow, MathlerScoreRow } from "../../lib/basicOps/survivalLeaderboard";
import type { ClassProgressRow } from "../../lib/bossSync";
import { FINAL_FLOWS, FINAL_POLICIES, FINAL_QUESTIONS, FINAL_TAPES, FINAL_TICKETS } from "../../lib/finalProjectSync";
import type { FinalProjectSyncState } from "../../lib/finalProjectSync";

// One reading of every student's progress, shared by the dashboard and the
// PDF report so both always show the same numbers. Shares run from 0 to 1.

export const RUSH_ROUNDS = 5;
export const BOSS_TOTAL = finalBosses.length;
export const ACTIVE_NOW_MS = 5 * 60_000;

export const MODULES = [
  { key: "mathler", id: "04", label: "Mathler", short: "Mathler" },
  { key: "bosses", id: "05", label: "Final Bosses", short: "Bosses" },
  { key: "final", id: "08", label: "Final Project", short: "Project" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export type StudentProgress = {
  student: RosterStudent;
  mathler: {
    steps: MathlerProgressRow | null;
    game: MathlerScoreRow | null;
    warmup: number;
    rushDone: boolean;
    rushRounds: number;
    target: number;
    /** Share of each step: translate (warm-up examples + rush), warm up (target puzzles), game. */
    parts: [number, number, number];
    stepsDone: number;
    share: number;
  };
  bosses: {
    passed: number[];
    attempts: Record<string, number>;
    codes: Record<string, string>;
    xp: number;
    share: number;
  };
  final: {
    record: FinalProjectSyncState | null;
    tapes: number;
    stars: number;
    /** Share of each stage: Backrooms tapes, IF / ELSE Lab, Shadow Feed. */
    parts: [number, number, number];
    stagesDone: number;
    share: number;
  };
  overall: number;
  lastActive: string | null;
  started: boolean;
};

export type ClassSummary = {
  code: ClassCode | "ALL";
  students: StudentProgress[];
  started: number;
  activeNow: number;
  mathler: number;
  bosses: number;
  final: number;
  overall: number;
  mathlerComplete: number;
  bossesComplete: number;
  finalComplete: number;
};

const clampShare = (value: number) => (Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0);
const average = (values: number[]) => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0);

function latest(...values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestTime = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isFinite(time) && time > bestTime) {
      best = value;
      bestTime = time;
    }
  }
  return best;
}

export function buildStudentProgress(
  row: ClassProgressRow,
  steps: MathlerProgressRow | null,
  game: MathlerScoreRow | null,
): StudentProgress {
  const warmup = steps ? Math.min(steps.warmup_solved, WARMUP_TOTAL) : 0;
  const rushDone = !!steps?.rush_completed;
  const rushRounds = steps ? Math.min(steps.rush_rounds, RUSH_ROUNDS) : 0;
  const target = steps ? Math.min(steps.target_completed, TARGET_PUZZLES.length) : 0;
  const gamePlayed = !!game && (game.time_attack_best > 0 || game.best_streak > 0);
  const mathlerParts: [number, number, number] = [
    clampShare((warmup / WARMUP_TOTAL + (rushDone ? 1 : rushRounds / RUSH_ROUNDS)) / 2),
    clampShare(target / TARGET_PUZZLES.length),
    gamePlayed ? 1 : 0,
  ];

  const record = row.finalProject ?? null;
  const tapes = record ? record.tapes.filter((stars) => stars > 0).length : 0;
  const finalParts: [number, number, number] = record
    ? [
        clampShare(tapes / FINAL_TAPES),
        clampShare((record.flows / FINAL_FLOWS + record.quizAnswered / FINAL_QUESTIONS + record.built.length / FINAL_TICKETS) / 3),
        record.reportDone ? 1 : clampShare(record.policies / (FINAL_POLICIES + 1)),
      ]
    : [0, 0, 0];

  const mathlerShare = average(mathlerParts);
  const bossShare = clampShare(row.completedBosses.length / BOSS_TOTAL);
  const finalShare = average(finalParts);
  const lastActive = latest(row.updatedAt, steps?.updated_at, game?.updated_at, record?.updatedAt);
  const anyCode = Object.values(row.codes).some((code) => code?.trim());

  return {
    student: row.student,
    mathler: {
      steps,
      game,
      warmup,
      rushDone,
      rushRounds,
      target,
      parts: mathlerParts,
      stepsDone: mathlerParts.filter((part) => part >= 1).length,
      share: mathlerShare,
    },
    bosses: { passed: row.completedBosses, attempts: row.attempts, codes: row.codes, xp: row.xp, share: bossShare },
    final: {
      record,
      tapes,
      stars: record ? record.tapes.reduce((total, stars) => total + stars, 0) : 0,
      parts: finalParts,
      stagesDone: finalParts.filter((part) => part >= 1).length,
      share: finalShare,
    },
    overall: (mathlerShare + bossShare + finalShare) / 3,
    lastActive,
    started: mathlerShare > 0 || bossShare > 0 || finalShare > 0 || anyCode || !!record,
  };
}

/** Joins the class rows with the Mathler tables, falling back to the copy kept in sharpie_progress. */
export function buildClassProgress(
  rows: ClassProgressRow[],
  scores: MathlerScoreRow[],
  steps: MathlerProgressRow[],
): StudentProgress[] {
  const scoreByLogin = new Map(scores.map((row) => [row.login, row]));
  const stepsByLogin = new Map(steps.map((row) => [row.login, row]));
  return rows
    .map((row) =>
      buildStudentProgress(
        row,
        stepsByLogin.get(row.student.login) ?? row.mathlerSteps ?? null,
        scoreByLogin.get(row.student.login) ?? row.mathlerGame ?? null,
      ),
    )
    .sort(compareByClassAndName);
}

export function compareByClassAndName(a: StudentProgress, b: StudentProgress) {
  return a.student.classCode.localeCompare(b.student.classCode) || a.student.name.localeCompare(b.student.name);
}

export function isActiveNow(progress: StudentProgress, now: number) {
  if (!progress.lastActive) return false;
  return now - new Date(progress.lastActive).getTime() < ACTIVE_NOW_MS;
}

export function summarizeClass(code: ClassCode | "ALL", students: StudentProgress[], now: number): ClassSummary {
  return {
    code,
    students,
    started: students.filter((item) => item.started).length,
    activeNow: students.filter((item) => isActiveNow(item, now)).length,
    mathler: average(students.map((item) => item.mathler.share)),
    bosses: average(students.map((item) => item.bosses.share)),
    final: average(students.map((item) => item.final.share)),
    overall: average(students.map((item) => item.overall)),
    mathlerComplete: students.filter((item) => item.mathler.stepsDone === 3).length,
    bossesComplete: students.filter((item) => item.bosses.passed.length === BOSS_TOTAL).length,
    finalComplete: students.filter((item) => item.final.stagesDone === 3).length,
  };
}

export function percent(share: number) {
  return `${Math.round(clampShare(share) * 100)}%`;
}

export function relativeTime(value: string | null, now: number) {
  if (!value) return "never";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "never";
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function formatWhen(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
