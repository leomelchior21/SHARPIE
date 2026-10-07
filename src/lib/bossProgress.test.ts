import { beforeEach, describe, expect, it } from "vitest";
import {
  bossProgress,
  bossXp,
  completeBoss,
  createBossProgress,
  isBossUnlocked,
  nextBossId,
  sanitizeBossProgress,
  unlockBossIds,
} from "./bossProgress";

describe("Final Bosses progression", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts with bosses 1-3 available and the rest locked", () => {
    const state = createBossProgress();
    expect(state.unlockedBosses).toEqual([1, 2, 3]);
    expect(state.completedBosses).toEqual([]);
    expect(isBossUnlocked(1, [])).toBe(true);
    expect(isBossUnlocked(3, [])).toBe(true);
    expect(isBossUnlocked(4, [])).toBe(false);
    expect(isBossUnlocked(15, [])).toBe(false);
  });

  it("unlocks the next sector only when all three bosses of the previous sector are complete", () => {
    expect(unlockBossIds([1, 2])).toEqual([1, 2, 3]);
    expect(unlockBossIds([1, 2, 3])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(unlockBossIds([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(unlockBossIds([3, 4, 5, 6])).toEqual([1, 2, 3]);
  });

  it("does not unlock sector 2 when only boss 03 is solved", () => {
    const state = completeBoss(createBossProgress(), 3);
    expect(state.completedBosses).toEqual([3]);
    expect(state.unlockedBosses).toEqual([1, 2, 3]);
    expect(state.currentBoss).toBe(1);
    expect(nextBossId([3], 3)).toBe(1);
  });

  it("keeps every boss available after the teacher completes a later boss", () => {
    const state = completeBoss({ ...createBossProgress(true), currentBoss: 15 }, 15, true);
    expect(state.completedBosses).toEqual([15]);
    expect(state.unlockedBosses).toEqual(Array.from({ length: 15 }, (_, index) => index + 1));
    expect(bossXp(state.completedBosses)).toBe(100);
    expect(nextBossId(state.completedBosses, 14, true)).toBe(14);
    expect(nextBossId(state.completedBosses, 15, true)).toBe(1);
  });

  it("applies access rules when restoring a saved teacher selection", () => {
    const state = { ...createBossProgress(true), currentBoss: 15, codeByBoss: { "15": "// draft" } };
    bossProgress.save(state);
    expect(bossProgress.load(undefined, true)).toEqual(state);
    expect(bossProgress.load().currentBoss).toBe(1);
    expect(bossProgress.load().unlockedBosses).toEqual([1, 2, 3]);
  });

  it("selects the first incomplete available boss after a success", () => {
    expect(nextBossId([1], 1)).toBe(2);
    expect(nextBossId([1, 2], 2)).toBe(3);
    expect(nextBossId([1, 2, 3], 3)).toBe(4);
    expect(nextBossId([1, 2, 3, 4, 5, 6], 6)).toBe(7);
    expect(nextBossId([1, 3], 3)).toBe(2);
    expect(nextBossId([2, 3], 3)).toBe(1);
  });

  it("returns null after every boss is defeated", () => {
    const all = Array.from({ length: 15 }, (_, index) => index + 1);
    expect(nextBossId(all, 15)).toBeNull();
    expect(unlockBossIds(all)).toHaveLength(15);
  });

  it("awards 100 XP per defeated boss plus a final 500 XP bonus", () => {
    expect(bossXp([])).toBe(0);
    expect(bossXp([1])).toBe(100);
    expect(bossXp([1, 2, 3])).toBe(300);
    const all = Array.from({ length: 15 }, (_, index) => index + 1);
    expect(bossXp(all)).toBe(2000);
    expect(bossXp(all.slice(0, 14))).toBe(1400);
  });

  it("records a defeated boss without erasing any other progress", () => {
    const initial = { ...createBossProgress(), codeByBoss: { "1": "double a = 1;" }, attemptsByBoss: { "1": 4 } };
    const state = completeBoss(initial, 1);
    expect(state.completedBosses).toEqual([1]);
    expect(state.codeByBoss["1"]).toBe("double a = 1;");
    expect(state.attemptsByBoss["1"]).toBe(4);
    const again = completeBoss(state, 1);
    expect(again.completedBosses).toEqual([1]);
  });

  it("heals stored progress and ignores corrupted entries", () => {
    const healed = sanitizeBossProgress({
      currentBoss: 99,
      completedBosses: [1, 2, 3, 3, "nope", 42],
      unlockedBosses: [],
      codeByBoss: { "1": "double a = 1;", bad: "nope" },
      attemptsByBoss: { "1": 2, "x": 5 },
    });
    expect(healed.completedBosses).toEqual([1, 2, 3]);
    expect(healed.unlockedBosses).toEqual([1, 2, 3, 4, 5, 6]);
    expect(healed.currentBoss).toBe(4);
    expect(healed.codeByBoss).toEqual({ "1": "double a = 1;" });
    expect(healed.attemptsByBoss).toEqual({ "1": 2 });

    expect(sanitizeBossProgress(null)).toEqual(createBossProgress());
    expect(sanitizeBossProgress("broken")).toEqual(createBossProgress());
  });

  it("persists and restores progress through localStorage", () => {
    const state = completeBoss(createBossProgress(), 1);
    state.codeByBoss["2"] = "double b = 2;";
    state.attemptsByBoss["2"] = 3;
    bossProgress.save(state);
    expect(bossProgress.load()).toEqual(state);
    bossProgress.clear();
    expect(bossProgress.load()).toEqual(createBossProgress());
  });
});
