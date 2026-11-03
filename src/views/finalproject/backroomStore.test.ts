import { beforeEach, describe, expect, it } from "vitest";
import { freshProgress, loadProgress, saveProgress, storageKey, syncSummary, xp } from "./progress";
import { backroomStageDone, loadBackroomProgress, saveBackroomProgress } from "./backroomStore";

const ana = { username: "ana", name: "Ana", isTeacher: false };

describe("Backrooms Run device save", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the game progress on this device, apart from the Final Project save", () => {
    expect(loadBackroomProgress(ana)).toMatchObject({ username: "ana", name: "Ana", backroomRunBest: 0, levelStars: [0, 0, 0, 0] });
    saveBackroomProgress({ ...loadBackroomProgress(ana), backroomRunBest: 7, backroomRunXp: 90, levelStars: [3, 2, 0, 0], skills: { ">": { right: 2, wrong: 1 } }, coachSeen: ["energy"] });
    expect(loadBackroomProgress(ana)).toMatchObject({ backroomRunBest: 7, backroomRunXp: 90, levelStars: [3, 2, 0, 0], skills: { ">": { right: 2, wrong: 1 } }, coachSeen: ["energy"] });
    expect(loadBackroomProgress({ ...ana, username: "bea" }).levelStars).toEqual([0, 0, 0, 0]);
    expect(localStorage.getItem(storageKey("ana"))).toBeNull();
    expect(xp(loadProgress("ana").progress)).toBe(0);
  });

  it("finishes stage 01 with every tape cleared or three gates in the original game", () => {
    const fresh = loadBackroomProgress(ana);
    expect(backroomStageDone(fresh)).toBe(false);
    expect(backroomStageDone({ ...fresh, levelStars: [1, 1, 1, 0] })).toBe(false);
    expect(backroomStageDone({ ...fresh, levelStars: [1, 1, 1, 1] })).toBe(true);
    expect(backroomStageDone({ ...fresh, backroomRunBest: 3 })).toBe(true);
  });

  it("moves Backrooms out of an older Final Project save once, keeping the rest", () => {
    localStorage.setItem(storageKey("ana"), JSON.stringify({ ...freshProgress(), best: 4, yardShipped: [0], backroom: { bestXp: 55, gates: 9, operators: [">", "<=", ">", "bad"], coach: ["steer", "bogus", "energy"], levels: [3, 2, 1, 0], layout: 3, skills: { ">": { right: 4, wrong: 1 }, bad: { right: 1, wrong: 0 }, "&&": { right: -3, wrong: 2.7 } } } }));
    const { progress } = loadProgress("ana");
    expect(progress.yardShipped).toEqual([0]);
    expect(progress).not.toHaveProperty("backroom");
    expect(progress).not.toHaveProperty("best");
    expect(xp(progress)).toBe(30);
    expect(syncSummary(progress)).not.toHaveProperty("tapes");
    expect(loadBackroomProgress(ana)).toMatchObject({ backroomRunBest: 4, backroomRunXp: 55, backroomRunGates: 9, backroomRunOperators: [">", "<="], levelStars: [3, 2, 1, 0], coachSeen: ["energy", "steer"], skills: { ">": { right: 4, wrong: 1 }, "&&": { right: 0, wrong: 2 } } });

    // The device save wins from then on, and the cleaned Final Project save no longer carries it.
    saveBackroomProgress({ ...loadBackroomProgress(ana), backroomRunBest: 20 });
    saveProgress("ana", progress);
    loadProgress("ana");
    expect(loadBackroomProgress(ana).backroomRunBest).toBe(20);
  });

  it("moves stars from the six-tape layouts into the four tapes", () => {
    // Before the tape reorder: old Two Doors 9→3 is now tape 02; Edge + Exactly merge.
    localStorage.setItem(storageKey("ana"), JSON.stringify({ ...freshProgress(), backroom: { bestXp: 40, gates: 12, levels: [3, 2, 0, 9, "x"] } }));
    loadProgress("ana");
    expect(loadBackroomProgress(ana).levelStars).toEqual([3, 3, 2, 0]);
    localStorage.clear();
    localStorage.setItem(storageKey("ana"), JSON.stringify({ ...freshProgress(), backroom: { levels: [3, 2, 0, 1, 0, 0], layout: 2 } }));
    loadProgress("ana");
    expect(loadBackroomProgress(ana).levelStars).toEqual([3, 2, 1, 0]);
  });

  it("gives saves from the first game, with only a gate count, their XP", () => {
    localStorage.setItem(storageKey("ana"), JSON.stringify({ ...freshProgress(), best: 3 }));
    loadProgress("ana");
    expect(loadBackroomProgress(ana)).toMatchObject({ backroomRunBest: 3, backroomRunXp: 45, backroomRunGates: 3 });
    expect(backroomStageDone(loadBackroomProgress(ana))).toBe(true);
  });
});
