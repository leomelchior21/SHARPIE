import { describe, expect, it } from "vitest";
import type { RunResult } from "../types";
import { isSandboxChallengeComplete, sandboxChallenges, sandboxPracticeCount, sandboxTimedCount } from "./VariableRun";

const successfulRun: RunResult = {
  success: true,
  output: "ok",
  durationMs: 1,
};

describe("Variable Run final exercises", () => {
  it("splits the finale into string, int, and combined variable exercises", () => {
    expect(sandboxChallenges.slice(0, sandboxPracticeCount).map((challenge) => challenge.title)).toEqual([
      "Create a string variable",
      "Create an int variable",
      "Create two variables",
    ]);
    expect(sandboxPracticeCount).toBe(3);
    expect(sandboxTimedCount).toBe(5);
  });

  it.each([
    [0, 'string favoriteColor = "Blue";\nConsole.WriteLine(favoriteColor);'],
    [1, "int favoriteNumber = 7;\nConsole.WriteLine(favoriteNumber);"],
    [2, 'string name = "Luna";\nint age = 14;\nConsole.WriteLine(name + age);'],
  ])("validates completed exercise %i after a successful run", (index, code) => {
    expect(isSandboxChallengeComplete(index, code, successfulRun, true)).toBe(true);
  });

  it("does not complete the combined exercise without both variable types", () => {
    expect(isSandboxChallengeComplete(2, 'string name = "Luna";', successfulRun, true)).toBe(false);
  });

  it("requires the requested declaration, console command, and output in timed rounds", () => {
    const heroRun = { ...successfulRun, output: "Hero: Nova\n" };
    const correctCode = 'string heroName = "Nova";\nConsole.WriteLine("Hero: " + heroName);';

    expect(isSandboxChallengeComplete(3, correctCode, heroRun, true)).toBe(true);
    expect(isSandboxChallengeComplete(3, 'Console.WriteLine("Hero: Nova");', heroRun, true)).toBe(false);
    expect(isSandboxChallengeComplete(3, correctCode, { ...heroRun, output: "Nova\n" }, true)).toBe(false);
  });

  it("uses Console.Write in the laps speed round", () => {
    const lapsRun = { ...successfulRun, output: "Laps left: 3" };
    expect(isSandboxChallengeComplete(6, 'int laps = 3;\nConsole.Write("Laps left: " + laps);', lapsRun, true)).toBe(true);
    expect(isSandboxChallengeComplete(6, 'int laps = 3;\nConsole.WriteLine("Laps left: " + laps);', lapsRun, true)).toBe(false);
  });
});
