import { describe, expect, it } from "vitest";
import { WARMUP_TOTAL } from "../../data/basicOperations";
import { createBasicOpsProgress, recordWarmupSolve, sanitizeBasicOpsProgress, translateComplete } from "./progress";

describe("Mathler warmup progress", () => {
  it("unlocks Rush only after all twelve translations", () => {
    let progress = createBasicOpsProgress();
    for (let solved = 1; solved <= WARMUP_TOTAL; solved += 1) {
      progress = recordWarmupSolve(progress, false).progress;
      expect(progress.translate.warmupSolved).toBe(solved);
      expect(translateComplete(progress)).toBe(solved === WARMUP_TOTAL);
    }
    expect(recordWarmupSolve(progress, false).progress.translate.warmupSolved).toBe(WARMUP_TOTAL);
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
