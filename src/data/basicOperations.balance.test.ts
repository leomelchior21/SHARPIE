import { describe, expect, it } from "vitest";
import { analyzeExpression, validateTokens } from "../lib/basicOps/expression";
import type { ExpressionToken } from "../lib/basicOps/expression";
import {
  RUSH_ROUNDS,
  TARGET_PUZZLES,
  WARMUP_EXAMPLES_PER_OPERATOR,
  WARMUP_LEVELS,
  WARMUP_TOTAL,
  generateRushChallenges,
  generateSurvivalPuzzle,
  generateTargetTutorialPuzzles,
  generateTranslateChallenges,
  generateWarmupChallenges,
  translateChallengeCount,
} from "./basicOperations";
import type { TargetPuzzle, TranslationChallenge } from "./basicOperations";

function analysisOf(expression: string): { value: number; tokens: ExpressionToken[] } {
  const result = analyzeExpression(expression);
  if (!result.ok) throw new Error(`invalid reference "${expression}": ${result.error.message}`);
  return { value: result.value, tokens: result.tokens };
}

function expectChallengeCorrect(challenge: TranslationChallenge) {
  const { value, tokens } = analysisOf(challenge.referenceExpression);
  expect(Number.isInteger(value), challenge.referenceExpression).toBe(true);
  expect(value).toBe(challenge.expectedResult);
  const violations = validateTokens(tokens, {
    numbers: challenge.requiredNumbers,
    numberUsage: challenge.numberUsage,
    allowedOperators: challenge.allowedOperators,
  });
  expect(violations, challenge.referenceExpression).toEqual([]);
}

function expectPuzzleCorrect(puzzle: TargetPuzzle) {
  const { value, tokens } = analysisOf(puzzle.referenceExpression);
  expect(Number.isInteger(value), puzzle.referenceExpression).toBe(true);
  expect(value).toBe(puzzle.target);
  expect(puzzle.target).toBeGreaterThanOrEqual(0);
  expect(puzzle.target).toBeLessThanOrEqual(300);
  const violations = validateTokens(tokens, {
    numbers: puzzle.numbers,
    numberUsage: puzzle.numberUsage,
    allowedOperators: puzzle.allowedOperators,
  });
  expect(violations, puzzle.referenceExpression).toEqual([]);
}

const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

describe("Mathler content balance", () => {
  it("builds a full set of unique, correct warmup examples", () => {
    for (const seed of [1, 42, 987654321]) {
      const challenges = generateWarmupChallenges(seed);
      expect(challenges).toHaveLength(WARMUP_TOTAL);
      expect(new Set(challenges.map((challenge) => challenge.referenceExpression)).size).toBe(WARMUP_TOTAL);
      for (const level of [1, 2, 3, 4]) {
        expect(challenges.filter((challenge) => challenge.level === level)).toHaveLength(WARMUP_EXAMPLES_PER_OPERATOR);
      }
      for (const challenge of challenges) expectChallengeCorrect(challenge);
    }
  });

  it("is deterministic for a seed and varied across seeds", () => {
    const first = generateWarmupChallenges(111).map((challenge) => challenge.referenceExpression);
    const again = generateWarmupChallenges(111).map((challenge) => challenge.referenceExpression);
    const other = generateWarmupChallenges(222).map((challenge) => challenge.referenceExpression);
    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });

  it("keeps every translate level correct and on its own operators", () => {
    for (let level = 1; level <= 10; level += 1) {
      const challenges = generateTranslateChallenges(level, 2026);
      expect(challenges).toHaveLength(translateChallengeCount(level));
      expect(new Set(challenges.map((challenge) => challenge.referenceExpression)).size).toBe(challenges.length);
      for (const challenge of challenges) {
        expectChallengeCorrect(challenge);
        const operators = new Set(analysisOf(challenge.referenceExpression).tokens.filter((token) => token.kind === "operator").map((token) => token.text));
        for (const operator of operators) expect(challenge.allowedOperators).toContain(operator);
      }
    }
  });

  it("ramps translate difficulty from two-number basics to grouped expressions", () => {
    const basics = generateTranslateChallenges(1, 77);
    expect(basics.every((challenge) => challenge.requiredNumbers.length === 2)).toBe(true);
    const grouped = generateTranslateChallenges(10, 77);
    expect(average(grouped.map((challenge) => challenge.requiredNumbers.length))).toBeGreaterThanOrEqual(3);
    expect(grouped.some((challenge) => challenge.allowedOperators.includes("("))).toBe(true);
  });

  it("keeps every rush round correct, unique and progressively faster", () => {
    for (const round of RUSH_ROUNDS) {
      const challenges = generateRushChallenges(round.round, 777);
      expect(challenges).toHaveLength(round.count);
      expect(new Set(challenges.map((challenge) => challenge.referenceExpression)).size).toBe(round.count);
      for (const challenge of challenges) expectChallengeCorrect(challenge);
    }
    for (let index = 1; index < RUSH_ROUNDS.length; index += 1) {
      expect(RUSH_ROUNDS[index].seconds).toBeLessThan(RUSH_ROUNDS[index - 1].seconds);
    }
    const mixed = generateRushChallenges(5, 777);
    expect(new Set(mixed.map((challenge) => challenge.level)).size).toBeGreaterThan(1);
  });

  it("generates twelve correct, unique target tutorial puzzles", () => {
    for (const seed of [1, 4242, 98765]) {
      const puzzles = generateTargetTutorialPuzzles(seed);
      expect(puzzles).toHaveLength(TARGET_PUZZLES.length);
      expect(new Set(puzzles.map((puzzle) => puzzle.referenceExpression)).size).toBe(TARGET_PUZZLES.length);
      expect(new Set(puzzles.map((puzzle) => puzzle.target)).size).toBeGreaterThan(1);
      for (const puzzle of puzzles) expectPuzzleCorrect(puzzle);
    }
  });

  it("scales survival difficulty and never repeats the same expression twice in a row", () => {
    const seed = 31337;
    const early: number[] = [];
    const late: number[] = [];
    const templates = new Set<string>();
    let previous = "";
    for (let index = 1; index <= 60; index += 1) {
      const puzzle = generateSurvivalPuzzle(index, seed);
      expectPuzzleCorrect(puzzle);
      expect(puzzle.referenceExpression).not.toBe(previous);
      previous = puzzle.referenceExpression;
      templates.add(puzzle.allowedOperators.join(""));
      (index <= 12 ? early : late).push(Math.max(...puzzle.numbers));
    }
    expect(average(late)).toBeGreaterThan(average(early));
    expect(templates.size).toBeGreaterThan(2);
  });

  it("keeps survival procedural and varied across seeds", () => {
    const base = generateSurvivalPuzzle(7, 1000).referenceExpression;
    const other = generateSurvivalPuzzle(7, 2000).referenceExpression;
    expect(other).not.toBe(base);
    expect(generateSurvivalPuzzle(7, 1000).referenceExpression).toBe(base);
    const targets = Array.from({ length: 40 }, (_, position) => generateSurvivalPuzzle(position + 1, 555).target);
    expect(new Set(targets).size).toBeGreaterThan(10);
    expect(targets.every((target) => Number.isInteger(target) && target >= 0 && target <= 300)).toBe(true);
  });

  it("never repeats an expression across the five rush rounds", () => {
    const seeds = Array.from({ length: 24 }, (_, index) => (index + 1) * 104729 + 11);
    for (const seed of seeds) {
      const perRound = RUSH_ROUNDS.map((round) => generateRushChallenges(round.round, seed).map((challenge) => challenge.referenceExpression));
      const all = perRound.flat();
      expect(new Set(all).size, `seed ${seed}`).toBe(all.length);
      for (const challenges of perRound) {
        expect(new Set(challenges).size).toBe(challenges.length);
      }
    }
  });

  it("grows rush round complexity from one operator to mixed expressions", () => {
    const early = generateRushChallenges(1, 99);
    const late = generateRushChallenges(5, 99);
    const operatorsOf = (challenge: TranslationChallenge) => new Set(analysisOf(challenge.referenceExpression).tokens.filter((token) => token.kind === "operator").map((token) => token.text));
    expect(early.every((challenge) => operatorsOf(challenge).size === 1)).toBe(true);
    expect(late.some((challenge) => operatorsOf(challenge).size >= 2)).toBe(true);
    expect(late.every((challenge) => challenge.requiredNumbers.length >= 3)).toBe(true);
  });

  it("ramps the guided target steps from two numbers to grouped formulas", () => {
    for (const seed of [3, 1234, 555555]) {
      const puzzles = generateTargetTutorialPuzzles(seed);
      const early = puzzles.slice(0, 4);
      const late = puzzles.slice(6);
      expect(early.every((puzzle) => puzzle.numbers.length === 2 && puzzle.allowedOperators.length === 1)).toBe(true);
      expect(late.filter((puzzle) => puzzle.numbers.length >= 3).length).toBeGreaterThanOrEqual(4);
      expect(late.some((puzzle) => puzzle.allowedOperators.includes("("))).toBe(true);
      expect(late.some((puzzle) => puzzle.allowedOperators.includes("/"))).toBe(true);
      expect(late.some((puzzle) => puzzle.allowedOperators.includes("%"))).toBe(true);
    }
  });

  it("keeps the survival templates scaling with the wave number", () => {
    const seed = 24680;
    const earlyTemplates = new Set<string>();
    const lateTemplates = new Set<string>();
    for (let index = 1; index <= 60; index += 1) {
      const puzzle = generateSurvivalPuzzle(index, seed);
      const operators = new Set(puzzle.allowedOperators.filter((operator) => operator !== "(" && operator !== ")"));
      const template = puzzle.allowedOperators.join("");
      if (index <= 6) {
        earlyTemplates.add(template);
        expect(operators.size).toBeLessThanOrEqual(2);
        expect(puzzle.numbers.length).toBeLessThanOrEqual(3);
      } else {
        lateTemplates.add(template);
      }
    }
    expect(lateTemplates.size).toBeGreaterThan(earlyTemplates.size);
    expect([...lateTemplates].some((template) => template.includes("("))).toBe(true);
  });

  it("produces every warmup operator level in teaching order", () => {
    const challenges = generateWarmupChallenges(13579);
    const levels = challenges.map((challenge) => challenge.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(new Set(levels)).toEqual(new Set([1, 2, 3, 4]));
    const written = challenges.filter((challenge) => challenge.writtenPrompt);
    expect(written).toHaveLength(WARMUP_LEVELS.length);
    expect(new Set(written.map((challenge) => challenge.level)).size).toBe(WARMUP_LEVELS.length);
  });
});
