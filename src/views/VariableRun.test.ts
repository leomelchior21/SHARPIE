import { describe, expect, it } from "vitest";
import type { RunResult } from "../types";
import { isVariableBuildChallengeComplete, variableSprintBuildChallenges, variableSprintChallenges } from "../data/variableCodeChallenges";
import { sprintTouchGames } from "../components/VariableCodeMissions";
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
    expect(sandboxTimedCount).toBe(10);
    expect(variableSprintChallenges).toHaveLength(10);
    expect(variableSprintBuildChallenges).toHaveLength(10);
    expect(sprintTouchGames).toHaveLength(10);
    for (const challenge of variableSprintBuildChallenges) {
      expect(challenge.expected.length).toBeGreaterThan(0);
      const availableBlocks = [...challenge.blocks];
      for (const expectedBlock of challenge.expected) {
        const blockIndex = availableBlocks.indexOf(expectedBlock);
        expect(blockIndex).toBeGreaterThanOrEqual(0);
        availableBlocks.splice(blockIndex, 1);
      }
    }
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
    expect(isSandboxChallengeComplete(3, 'string heroName = "Nova";\nConsole.Write("Hero: " + heroName);', heroRun, true)).toBe(false);
    expect(isSandboxChallengeComplete(3, correctCode, { ...heroRun, output: "Nova\n" }, true)).toBe(false);
  });

  it("does not accept required code hidden in comments", () => {
    const code = '// string heroName = "Nova";\n// Console.WriteLine(heroName);\nConsole.WriteLine("Hero: Nova");';
    expect(isSandboxChallengeComplete(3, code, { ...successfulRun, output: "Hero: Nova\n" }, true)).toBe(false);
  });

  it("rejects reordered, decoy, repeated, and out-of-range build blocks", () => {
    const challenge = variableSprintBuildChallenges[0];
    const correct = [4, 3, 5, 1, 2];
    expect(isVariableBuildChallengeComplete(challenge, correct)).toBe(true);
    expect(isVariableBuildChallengeComplete(challenge, [3, 4, 5, 1, 2])).toBe(false);
    expect(isVariableBuildChallengeComplete(challenge, [0, 3, 5, 1, 2])).toBe(false);
    expect(isVariableBuildChallengeComplete(challenge, [4, 3, 5, 1, 1])).toBe(false);
    expect(isVariableBuildChallengeComplete(challenge, [4, 3, 5, 1, 99])).toBe(false);
  });

  it("uses Console.Write in the laps speed round", () => {
    const lapsRun = { ...successfulRun, output: "Laps left: 3" };
    expect(isSandboxChallengeComplete(6, 'int laps = 3;\nConsole.Write("Laps left: " + laps);', lapsRun, true)).toBe(true);
    expect(isSandboxChallengeComplete(6, 'int laps = 3;\nConsole.WriteLine("Laps left: " + laps);', lapsRun, true)).toBe(false);
  });

  it.each([
    "Next stop: Mars",
    "Next Stop: Mars",
    "next stop: mars",
    "  Next   Stop :   Mars  \n",
  ])("accepts equivalent destination output: %s", (output) => {
    const code = 'string destination = "Mars";\nConsole.WriteLine("Next Stop: " + destination);';
    expect(isSandboxChallengeComplete(5, code, { ...successfulRun, output }, true)).toBe(true);
  });

  it("still requires the requested variable in flexible-output rounds", () => {
    const output = "Next Stop: Mars\n";
    expect(isSandboxChallengeComplete(5, 'Console.WriteLine("Next Stop: Mars");', { ...successfulRun, output }, true)).toBe(false);
  });
});
