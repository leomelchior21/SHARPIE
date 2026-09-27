import { describe, expect, it } from "vitest";
import { createBossProgress } from "./bossProgress";
import { mergeBossProgress, rowToBossProgress } from "./bossSync";

describe("Final Bosses cloud sync", () => {
  it("converts a Supabase row into local boss progress", () => {
    const progress = rowToBossProgress({
      login: "joaosilva",
      current_boss: 4,
      completed_bosses: [1, 2, 3],
      xp: 300,
      codes: { "1": "double result = a + b;" },
      attempts: { "1": 2 },
    });
    expect(progress.currentBoss).toBe(4);
    expect(progress.completedBosses).toEqual([1, 2, 3]);
    expect(progress.unlockedBosses).toEqual([1, 2, 3, 4, 5, 6]);
    expect(progress.codeByBoss["1"]).toContain("a + b");
    expect(progress.attemptsByBoss["1"]).toBe(2);
  });

  it("merges remote and local progress without losing either side", () => {
    const local = createBossProgress();
    local.currentBoss = 2;
    local.completedBosses = [1];
    local.codeByBoss = { "1": "double result = a + b;", "2": "double result = a - b;" };
    local.attemptsByBoss = { "1": 5, "2": 1 };

    const remote = createBossProgress();
    remote.completedBosses = [1, 2, 3];
    remote.codeByBoss = { "1": "old code", "3": "double result = number * 2;" };
    remote.attemptsByBoss = { "1": 2, "3": 4 };

    const merged = mergeBossProgress(local, remote);
    expect(merged.completedBosses).toEqual([1, 2, 3]);
    expect(merged.unlockedBosses).toEqual([1, 2, 3, 4, 5, 6]);
    expect(merged.codeByBoss["1"]).toBe("double result = a + b;");
    expect(merged.codeByBoss["2"]).toBe("double result = a - b;");
    expect(merged.codeByBoss["3"]).toContain("number * 2");
    expect(merged.attemptsByBoss["1"]).toBe(5);
    expect(merged.attemptsByBoss["3"]).toBe(4);
    expect(merged.currentBoss).toBe(2);
  });

  it("keeps the local state when there is nothing in the cloud", () => {
    const local = createBossProgress();
    local.completedBosses = [1, 2, 3];
    expect(mergeBossProgress(local, null)).toBe(local);
  });
});
