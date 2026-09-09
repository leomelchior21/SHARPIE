import { describe, expect, it } from "vitest";
import type { RunResult } from "../types";
import { isSandboxChallengeComplete, sandboxChallenges } from "./VariableRun";

const successfulRun: RunResult = {
  success: true,
  output: "ok",
  durationMs: 1,
};

describe("Variable Run final exercises", () => {
  it("splits the finale into string, int, and combined variable exercises", () => {
    expect(sandboxChallenges.map((challenge) => challenge.title)).toEqual([
      "Create a string variable",
      "Create an int variable",
      "Create two variables",
    ]);
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
});
