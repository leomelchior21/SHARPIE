import { describe, expect, it } from "vitest";
import {
  TARGET_PUZZLES,
  RUSH_ROUNDS,
  TRANSLATE_LEVELS,
  WARMUP_TOTAL,
  generateRushChallenges,
  generateTranslateChallenges,
  generateWarmupChallenges,
  generateTargetTutorialPuzzles,
  generateSurvivalPuzzle,
  translateChallengeCount,
} from "./basicOperations";
import type { TranslationChallenge } from "./basicOperations";
import { analyzeExpression, validateTokens } from "../lib/basicOps/expression";

const SEEDS = [1, 42, 987654];

function numberCounts(values: number[]) {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function expectValidReference(challenge: TranslationChallenge) {
  expect(challenge.referenceExpression, challenge.id).toBeTruthy();
  const analysis = analyzeExpression(challenge.referenceExpression);
  expect(analysis.ok, `${challenge.id}: ${challenge.referenceExpression}`).toBe(true);
  if (!analysis.ok) return;

  const violations = validateTokens(analysis.tokens, {
    numbers: challenge.requiredNumbers,
    numberUsage: challenge.numberUsage,
    allowedOperators: challenge.allowedOperators,
  });
  expect(violations, challenge.id).toEqual([]);

  const used = numberCounts(analysis.tokens.filter((token) => token.kind === "number").map((token) => token.value));
  expect(used, challenge.id).toEqual(numberCounts(challenge.requiredNumbers));

  expect(Math.abs(analysis.value - challenge.expectedResult), challenge.id).toBeLessThan(1e-9);
  expect(challenge.hintSequence.length, challenge.id).toBeGreaterThan(0);
  expect(challenge.transformNote, challenge.id).toBeTruthy();
  expect(challenge.mathLatex || challenge.promptContext, challenge.id).toBeTruthy();
}

describe("translate level data", () => {
  it("ships ten levels", () => {
    expect(TRANSLATE_LEVELS).toHaveLength(10);
    expect(TRANSLATE_LEVELS.map((level) => level.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("generates 5 to 8 challenges per level for every seed", () => {
    for (const level of TRANSLATE_LEVELS) {
      for (const seed of SEEDS) {
        const challenges = generateTranslateChallenges(level.level, seed);
        expect(challenges).toHaveLength(translateChallengeCount(level.level));
        expect(challenges.length).toBeGreaterThanOrEqual(4);
        expect(challenges.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it("every generated reference expression follows its own rules", () => {
    for (const level of TRANSLATE_LEVELS) {
      for (const seed of SEEDS) {
        for (const challenge of generateTranslateChallenges(level.level, seed)) {
          expectValidReference(challenge);
        }
      }
    }
  });

  it("pairs parentheses challenges when grouping changes the result", () => {
    for (const seed of SEEDS) {
      const challenges = generateTranslateChallenges(7, seed);
      const pairs = new Map<string, TranslationChallenge[]>();
      for (const challenge of challenges) {
        expect(challenge.pair).toBeTruthy();
        const id = challenge.pair!.id;
        pairs.set(id, [...(pairs.get(id) ?? []), challenge]);
      }
      for (const [id, members] of pairs) {
        expect(members, id).toHaveLength(2);
        expect(members[0].pair!.role).toBe("a");
        expect(members[1].pair!.role).toBe("b");
        expect(members[0].expectedResult).not.toBe(members[1].expectedResult);
        expect(members[0].requiredNumbers).toEqual(members[1].requiredNumbers);
      }
    }
  });

  it("remainder prompts ask for the leftover of the shown division", () => {
    for (const seed of SEEDS) {
      for (const challenge of generateTranslateChallenges(5, seed)) {
        const [total, group] = challenge.requiredNumbers;
        expect(challenge.expectedResult).toBe(total % group);
        expect(challenge.allowedOperators).toEqual(["%"]);
      }
    }
  });
});

describe("operator rush", () => {
  it("defines five progressively faster rounds", () => {
    expect(RUSH_ROUNDS).toHaveLength(5);
    expect(RUSH_ROUNDS.map((round) => round.label)).toEqual(["ADDITION", "SUBTRACTION", "MULTIPLICATION", "DIVISION & REMAINDER", "MIXED EXPRESSIONS"]);
    for (const round of RUSH_ROUNDS) {
      expect(round.count).toBe(4);
      expect(round.seconds).toBeGreaterThanOrEqual(14);
      expect(round.seconds).toBeLessThanOrEqual(18);
    }
    expect(RUSH_ROUNDS[4].hintAfterMisses).toBeNull();
  });

  it("generates only valid challenges", () => {
    for (const round of RUSH_ROUNDS) {
      for (const seed of SEEDS) {
        const challenges = generateRushChallenges(round.round, seed);
        expect(challenges, `round ${round.round}`).toHaveLength(round.count);
        for (const challenge of challenges) expectValidReference(challenge);
      }
    }
  });

  it("mixes written tasks into simple rounds and keeps mixed expressions visual", () => {
    const words: Record<number, string> = { 1: "plus", 2: "minus", 3: "times", 4: "divided by" };
    for (const seed of SEEDS) {
      for (const round of [1, 2, 3]) {
        const challenges = generateRushChallenges(round, seed);
        expect(challenges.filter((challenge) => challenge.writtenPrompt)).toHaveLength(2);
        challenges.forEach((challenge, index) => {
          expect(challenge.writtenPrompt).toBe(index % 2 === 1
            ? `${challenge.requiredNumbers[0]} ${words[challenge.level]} ${challenge.requiredNumbers[1]}`
            : undefined);
        });
      }

      const divisionRound = generateRushChallenges(4, seed);
      expect(divisionRound.filter((challenge) => challenge.level === 4 && challenge.writtenPrompt)).toHaveLength(1);
      expect(divisionRound.filter((challenge) => challenge.level === 5 && challenge.promptContext).length).toBeGreaterThan(0);
      expect(generateRushChallenges(5, seed).every((challenge) => !challenge.writtenPrompt)).toBe(true);
    }
  });
});

describe("new Mathler journey", () => {
  it("gives three distinct, valid expressions for each warmup operator", () => {
    for (const seed of SEEDS) {
      const examples = generateWarmupChallenges(seed);
      expect(examples).toHaveLength(WARMUP_TOTAL);
      expect(examples.map((item) => item.level)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
      expect(new Set(examples.map((item) => item.id)).size).toBe(WARMUP_TOTAL);
      for (let start = 0; start < WARMUP_TOTAL; start += 3) {
        expect(new Set(examples.slice(start, start + 3).map((item) => item.referenceExpression)).size).toBe(3);
      }
      examples.forEach(expectValidReference);
    }
    expect(generateWarmupChallenges(1).map((item) => item.referenceExpression)).not.toEqual(generateWarmupChallenges(42).map((item) => item.referenceExpression));
  });

  it("mixes a randomized written task into each operator's warmup", () => {
    const positions = [1, 2, 3, 4].map(() => new Set<number>());
    for (const seed of [1, 42, 987654, 139, 12345, 87654]) {
      const examples = generateWarmupChallenges(seed);
      for (let level = 1; level <= 4; level += 1) {
        const group = examples.slice((level - 1) * 3, level * 3);
        const writtenIndex = group.findIndex((challenge) => Boolean(challenge.writtenPrompt));
        expect(group.filter((challenge) => challenge.writtenPrompt)).toHaveLength(1);
        positions[level - 1].add(writtenIndex);
        const challenge = group[writtenIndex];
        const [left, right] = challenge.requiredNumbers;
        const expected = ({
          1: [`${left} plus ${right}`, `Add ${left} and ${right}`],
          2: [`${left} minus ${right}`, `Subtract ${right} from ${left}`],
          3: [`${left} times ${right}`, `Multiply ${left} by ${right}`],
          4: [`${left} divided by ${right}`, `Divide ${left} by ${right}`],
        } as Record<number, string[]>)[level];
        expect(expected).toContain(challenge.writtenPrompt);
        expect(challenge.hintSequence.join(" ")).toContain(challenge.referenceExpression);
      }
    }
    positions.forEach((seen) => expect(seen.size).toBeGreaterThan(1));
  });

  it("self-validates randomized tutorial and survival puzzles", () => {
    for (const seed of SEEDS) {
      const tutorial = generateTargetTutorialPuzzles(seed);
      expect(tutorial).toHaveLength(12);
      for (const puzzle of [...tutorial, ...Array.from({ length: 30 }, (_, index) => generateSurvivalPuzzle(index + 1, seed))]) {
        const analysis = analyzeExpression(puzzle.referenceExpression);
        expect(analysis.ok, puzzle.id).toBe(true);
        if (!analysis.ok) continue;
        expect(analysis.value, puzzle.id).toBe(puzzle.target);
        expect(validateTokens(analysis.tokens, { numbers: puzzle.numbers, numberUsage: puzzle.numberUsage, allowedOperators: puzzle.allowedOperators }), puzzle.id).toEqual([]);
      }
    }
    expect(generateTargetTutorialPuzzles(1).map((item) => item.referenceExpression)).not.toEqual(generateTargetTutorialPuzzles(42).map((item) => item.referenceExpression));
    expect(generateSurvivalPuzzle(5, 1).referenceExpression).not.toBe(generateSurvivalPuzzle(5, 42).referenceExpression);
  });

  it("varies every guided step and successive survival challenges", () => {
    const versions = Array.from({ length: 12 }, (_, seed) => generateTargetTutorialPuzzles(seed + 1));
    for (let index = 0; index < TARGET_PUZZLES.length; index += 1) {
      expect(new Set(versions.map((run) => run[index].referenceExpression)).size).toBeGreaterThanOrEqual(5);
    }
    const survival = Array.from({ length: 20 }, (_, index) => generateSurvivalPuzzle(index + 1, 98765).referenceExpression);
    expect(new Set(survival).size).toBeGreaterThanOrEqual(18);
  });
});

describe("target puzzles", () => {
  it("has twelve well-formed puzzles", () => {
    expect(TARGET_PUZZLES).toHaveLength(12);
    expect(new Set(TARGET_PUZZLES.map((puzzle) => puzzle.id)).size).toBe(12);
    expect(TARGET_PUZZLES.map((puzzle) => puzzle.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("reference expressions reach their targets and follow the rules", () => {
    for (const puzzle of TARGET_PUZZLES) {
      const analysis = analyzeExpression(puzzle.referenceExpression);
      expect(analysis.ok, puzzle.id).toBe(true);
      if (!analysis.ok) continue;
      expect(validateTokens(analysis.tokens, {
        numbers: puzzle.numbers,
        numberUsage: puzzle.numberUsage,
        allowedOperators: puzzle.allowedOperators,
      }), puzzle.id).toEqual([]);
      expect(Math.abs(analysis.value - puzzle.target), puzzle.id).toBeLessThan(1e-9);
      expect(puzzle.hints.length, puzzle.id).toBeGreaterThan(0);
    }
  });

  it("accepts valid alternative solutions", () => {
    const alternatives: Record<string, string> = {
      "target-10": "(9 - 5) * 1",
      "target-11": "6 * 4 - 3 * 2",
      "target-12": "8 * 5 * (4 - 3) * 1",
    };
    for (const [id, expression] of Object.entries(alternatives)) {
      const puzzle = TARGET_PUZZLES.find((item) => item.id === id)!;
      const analysis = analyzeExpression(expression);
      expect(analysis.ok, id).toBe(true);
      if (!analysis.ok) continue;
      expect(validateTokens(analysis.tokens, {
        numbers: puzzle.numbers,
        numberUsage: puzzle.numberUsage,
        allowedOperators: puzzle.allowedOperators,
      }), id).toEqual([]);
      expect(Math.abs(analysis.value - puzzle.target), id).toBeLessThan(1e-9);
      expect(expression).not.toBe(puzzle.referenceExpression);
    }
  });
});
