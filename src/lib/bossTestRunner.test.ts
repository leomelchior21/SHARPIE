import { describe, expect, it } from "vitest";
import { bossById, finalBosses } from "../data/finalBosses";
import {
  BOSS_EPSILON,
  evaluateBossTest,
  expectedOutputCount,
  formatBossInputs,
  formatBossNumber,
  parseNumericOutput,
  selectBossTests,
} from "./bossTestRunner";

const additionBoss = bossById(1)!;
const timeBoss = bossById(11)!;

describe("Final Bosses numeric comparison", () => {
  it("treats equivalent numeric output as equal", () => {
    const test = { inputs: [8.5, 4], expected: [12.5] };
    for (const output of ["12.5\n", "12.50\n", "12.5000\n", " 12.5 \n"]) {
      expect(evaluateBossTest(additionBoss, test, output).status).toBe("pass");
    }
    const integerTest = { inputs: [2, 3], expected: [5] };
    expect(evaluateBossTest(additionBoss, integerTest, "5\n").status).toBe("pass");
    expect(evaluateBossTest(additionBoss, integerTest, "5.0000\n").status).toBe("pass");
    expect(evaluateBossTest(additionBoss, integerTest, "5.01\n").status).toBe("fail");
  });

  it("uses the epsilon tolerance for floating point results", () => {
    const test = { inputs: [2, 3], expected: [Math.sqrt(13)] };
    const received = Math.sqrt(13) + BOSS_EPSILON / 2;
    expect(evaluateBossTest(additionBoss, test, `${received}\n`).status).toBe("pass");
    const tooFar = Math.sqrt(13) + BOSS_EPSILON * 10;
    expect(evaluateBossTest(additionBoss, test, `${tooFar}\n`).status).toBe("fail");
  });

  it("parses multi-line numeric output and rejects invalid values", () => {
    expect(parseNumericOutput("2\n5\n")).toEqual({ values: [2, 5], invalid: false });
    expect(parseNumericOutput("  \n2.5\n\n")).toEqual({ values: [2.5], invalid: false });
    expect(parseNumericOutput("")).toEqual({ values: [], invalid: false });
    expect(parseNumericOutput("hello\n").invalid).toBe(true);
    expect(parseNumericOutput("NaN\n").invalid).toBe(true);
    expect(parseNumericOutput("Infinity\n").invalid).toBe(true);
    expect(parseNumericOutput("12abc\n").invalid).toBe(true);
  });

  it("reports an output error instead of a wrong answer when nothing numeric was printed", () => {
    const outcome = evaluateBossTest(additionBoss, additionBoss.tests[0], "");
    expect(outcome.status).toBe("fail");
    expect(outcome.received).toBeNull();
    expect(outcome.outputError).toBe("Your program did not print a valid number.");
    expect(evaluateBossTest(additionBoss, additionBoss.tests[0], "5\n6\n").outputError).toBe(
      "This challenge expects one result.",
    );
  });

  it("expects exactly three numeric results for the multi-output boss", () => {
    expect(expectedOutputCount(timeBoss)).toBe(3);
    expect(evaluateBossTest(timeBoss, { inputs: [86400], expected: [1440, 24, 1] }, "1440\n24\n1\n").status).toBe("pass");
    expect(evaluateBossTest(timeBoss, { inputs: [86400], expected: [1440, 24, 1] }, "1440\n24\n").outputError).toBe(
      "This challenge expects three numeric results.",
    );
    expect(evaluateBossTest(timeBoss, { inputs: [86400], expected: [1440, 24, 1] }, "1440\n24\n1\n0\n").received).toEqual([1440, 24, 1, 0]);
  });

  it("selects three distinct tests from the curated pool with a shuffled order", () => {
    const values = [0.9, 0.1, 0.5, 0.3, 0.7, 0.2];
    let cursor = 0;
    const random = () => values[cursor++ % values.length];
    const selection = selectBossTests(additionBoss, 3, random);
    expect(selection).toHaveLength(3);
    expect(new Set(selection.map((test) => JSON.stringify(test))).size).toBe(3);
    for (const test of selection) {
      expect(additionBoss.tests).toContain(test);
    }
    const repeat = selectBossTests(additionBoss, 3, random);
    expect(repeat).toHaveLength(3);
  });

  it("never selects more tests than the pool holds", () => {
    const selection = selectBossTests(additionBoss, 99, () => 0.5);
    expect(selection).toHaveLength(additionBoss.tests.length);
    for (const boss of finalBosses) {
      expect(selectBossTests(boss, 3, () => 0.42)).toHaveLength(3);
    }
  });

  it("formats numbers cleanly for display", () => {
    expect(formatBossNumber(5)).toBe("5");
    expect(formatBossNumber(12.5)).toBe("12.5");
    expect(formatBossNumber(3.605551275463989)).toBe("3.6056");
    expect(formatBossNumber(8.333333333333334)).toBe("8.3333");
    expect(formatBossNumber(0.75)).toBe("0.75");
    expect(formatBossInputs([8.5, 4])).toBe("8.5, 4");
  });
});
