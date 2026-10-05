import { describe, expect, it } from "vitest";
import { WARMUP_TOTAL } from "../../data/basicOperations";
import { createBasicOpsProgress, recordWarmupSolve, sanitizeBasicOpsProgress, translateComplete } from "./progress";

describe("Mathler warmup progress", () => {
  it("unlocks Rush only after all twelve translations", () => {
    let progress = createBasicOpsProgress();
    for (let solved = 1; solved <= WARMUP_TOTAL; solved += 1) {
      progress = recordWarmupSolve(progress, false, solved - 1).progress;
      expect(progress.translate.warmupSolved).toBe(solved);
      expect(translateComplete(progress)).toBe(solved === WARMUP_TOTAL);
    }
    expect(recordWarmupSolve(progress, false, WARMUP_TOTAL - 1).progress.translate.warmupSolved).toBe(WARMUP_TOTAL);
  });

  it("does not advance or pay XP when a passed example is redone", () => {
    let progress = createBasicOpsProgress();
    for (let solved = 1; solved <= 5; solved += 1) progress = recordWarmupSolve(progress, false, solved - 1).progress;
    const xpBefore = progress.translate.xp;
    const redo = recordWarmupSolve(progress, false, 2);
    expect(redo.progress.translate.warmupSolved).toBe(5);
    expect(redo.xp).toBe(0);
    expect(redo.progress.translate.xp).toBe(xpBefore);
  });

  it("restarts an unfinished old warmup but preserves a completed Rush", () => {
    const previous = createBasicOpsProgress();
    previous.translate.warmupSolved = 3;
    const { warmupVersion: _version, ...legacyTranslate } = previous.translate;
    const legacy = { ...previous, translate: legacyTranslate };
    expect(sanitizeBasicOpsProgress(legacy).translate.warmupSolved).toBe(0);
    expect(sanitizeBasicOpsProgress({ ...legacy, rush: { ...legacy.rush, completed: true } }).translate.warmupSolved).toBe(WARMUP_TOTAL);
  });
});
