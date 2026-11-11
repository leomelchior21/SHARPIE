import { canSyncProgress, saveProgress } from "./progressStore";

// The Final project keeps its full save in the browser. A compact summary is
// mirrored inside sharpie_progress.codes so the teacher dashboard can show it
// without a dedicated table. Backrooms Run is not part of it: the game keeps its
// progress on the device only. Live Flow and the Code Builder were retired for the
// Switchyard, so `flows` and `built` from older summaries are ignored.
// The Repair Shop keeps its full save on the device too; only the levels cleared and
// the number of repairs travel, so the teacher can see how far each student got.
// The code travels too, for the PDF report: each shipped Switchyard level's program and
// the Robot's hand-written final round.
export type FinalProjectSyncState = {
  xp: number;
  quizAnswered: number;
  quizRight: number;
  quizMissed: number[];
  /** Switchyard levels shipped, numbered from 1, and the stars earned on them. */
  levels: number[];
  stars: number;
  /** Mystery line levels shipped after level 10 (0 to 3); all three is Super Maker Master. */
  mystery: number;
  /** Super Mega Blaster Plus Advanced levels shipped (0 to 3); all three earns the MEGA CAT BRIAN badge. */
  blaster: number;
  policies: number;
  /** Repair Shop levels cleared, numbered from 1 (1 Arcade … 7 Robot), and repairs paid in all. */
  repairLevels: number[];
  repairFixed: number;
  /** The program of every Switchyard level shipped, by level number from 1 (11 to 13 Mystery, 14 to 16 Blaster), ready to print. */
  yardCodes?: Record<string, string>;
  /** The Repair Shop final round: the if / else the student hand-wrote for the Robot, after `int battery = ?;`. */
  repairCode?: string;
  reportDone: boolean;
  reflection: string;
  updatedAt: string | null;
};

export const FINAL_QUESTIONS = 20;
export const FINAL_LEVELS = 10;
export const FINAL_STARS = FINAL_LEVELS * 3;
export const FINAL_POLICIES = 4;
export const FINAL_MYSTERY = 3;
export const FINAL_BLASTER = 3;
/** The Repair Shop's seven levels, in order. The Robot is the boss; clearing it earns the Maker certificate. */
export const REPAIR_LEVELS = ["Arcade", "Vending machine", "Jukebox", "Electric scooter", "Claw machine", "Coffee machine", "Robot"];
export const FINAL_REPAIR = REPAIR_LEVELS.length;
/** "1 Arcade, 2 Vending machine…": the levels a student cleared, by name. */
export const repairNames = (levels: number[]) => levels.map((n) => `${n} ${REPAIR_LEVELS[n - 1] ?? ""}`.trim()).join(", ");

function count(value: unknown, max: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(Math.max(Math.round(numeric), 0), max) : 0;
}

function numbers(value: unknown, max: number): number[] {
  return Array.isArray(value) ? [...new Set(value.map((item) => count(item, max)).filter((item) => item > 0))].sort((a, b) => a - b) : [];
}

/** The longest program kept for one level: a typed Switchyard level or the Robot's final round. */
export const MAX_CODE = 2000;
const MAX_YARD_LEVELS = 30;
function codes(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, code] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(key);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_YARD_LEVELS && typeof code === "string" && code.trim()) out[String(n)] = code.slice(0, MAX_CODE);
  }
  return out;
}

export function parseFinalProjectSync(value: unknown): FinalProjectSyncState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    xp: count(raw.xp, 10_000_000),
    quizAnswered: count(raw.quizAnswered, FINAL_QUESTIONS),
    quizRight: count(raw.quizRight, FINAL_QUESTIONS),
    quizMissed: numbers(raw.quizMissed, FINAL_QUESTIONS),
    levels: numbers(raw.levels, FINAL_LEVELS),
    stars: count(raw.stars, FINAL_STARS),
    mystery: count(raw.mystery, FINAL_MYSTERY),
    blaster: count(raw.blaster, FINAL_BLASTER),
    policies: count(raw.policies, FINAL_POLICIES),
    repairLevels: numbers(raw.repairLevels, FINAL_REPAIR),
    repairFixed: count(raw.repairFixed, 99_999),
    yardCodes: codes(raw.yardCodes),
    repairCode: typeof raw.repairCode === "string" ? raw.repairCode.slice(0, MAX_CODE) : "",
    reportDone: raw.reportDone === true,
    reflection: typeof raw.reflection === "string" ? raw.reflection.slice(0, 600) : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

export async function pushFinalProjectSync(login: string, payload: FinalProjectSyncState): Promise<void> {
  await saveProgress(login, { codes: { finalProject: payload } });
}

let pendingTimer: number | null = null;

export function queueFinalProjectSync(login: string, payload: () => FinalProjectSyncState) {
  if (!canSyncProgress(login) || typeof window === "undefined") return;
  if (pendingTimer !== null) window.clearTimeout(pendingTimer);
  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    void pushFinalProjectSync(login, payload()).catch(() => {
      // Offline or transient failure: the browser save stays authoritative and
      // the next change queues another attempt.
    });
  }, 3000);
}
