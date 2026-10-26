import { canSyncProgress, saveProgress } from "./progressStore";

// The Final project keeps its full save in the browser. A compact summary is
// mirrored inside sharpie_progress.codes so the teacher dashboard can show it
// without a dedicated table.
export type FinalProjectSyncState = {
  xp: number;
  tapes: number[];
  endlessBest: number;
  flows: number;
  quizAnswered: number;
  quizRight: number;
  quizMissed: number[];
  built: number[];
  policies: number;
  reportDone: boolean;
  reflection: string;
  updatedAt: string | null;
};

export const FINAL_TAPES = 4;
export const FINAL_FLOWS = 3;
export const FINAL_QUESTIONS = 20;
export const FINAL_TICKETS = 10;
export const FINAL_POLICIES = 4;

function count(value: unknown, max: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(Math.max(Math.round(numeric), 0), max) : 0;
}

function numbers(value: unknown, max: number): number[] {
  return Array.isArray(value) ? [...new Set(value.map((item) => count(item, max)).filter((item) => item > 0))].sort((a, b) => a - b) : [];
}

export function parseFinalProjectSync(value: unknown): FinalProjectSyncState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    xp: count(raw.xp, 10_000_000),
    tapes: Array.from({ length: FINAL_TAPES }, (_, index) => count(Array.isArray(raw.tapes) ? raw.tapes[index] : 0, 3)),
    endlessBest: count(raw.endlessBest, 100_000),
    flows: count(raw.flows, FINAL_FLOWS),
    quizAnswered: count(raw.quizAnswered, FINAL_QUESTIONS),
    quizRight: count(raw.quizRight, FINAL_QUESTIONS),
    quizMissed: numbers(raw.quizMissed, FINAL_QUESTIONS),
    built: numbers(raw.built, FINAL_TICKETS),
    policies: count(raw.policies, FINAL_POLICIES),
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
