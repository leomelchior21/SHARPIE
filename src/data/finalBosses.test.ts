import { describe, expect, it } from "vitest";
import { BOSS_COMPLETION_BONUS, BOSS_SECTORS, finalBosses } from "./finalBosses";
import { BOSS_EPSILON, expectedOutputCount } from "../lib/bossTestRunner";

describe("Final Bosses definitions", () => {
  it("defines 15 bosses across 5 sectors of 3", () => {
    expect(finalBosses).toHaveLength(15);
    expect(finalBosses.map((boss) => boss.id)).toEqual(Array.from({ length: 15 }, (_, index) => index + 1));
    expect(BOSS_SECTORS).toHaveLength(5);
    for (const [index, sector] of BOSS_SECTORS.entries()) {
      expect(sector.bossIds).toHaveLength(3);
      expect(sector.id).toBe(index + 1);
      for (const id of sector.bossIds) {
        expect(finalBosses.find((boss) => boss.id === id)?.sector).toBe(sector.id);
      }
    }
    expect(BOSS_COMPLETION_BONUS).toBe(500);
  });

  it("uses double everywhere and never asks students for another numeric type", () => {
    for (const boss of finalBosses) {
      expect(boss.starterCode).toContain("double ");
      expect(boss.starterCode).toContain("= ?; // random number");
      expect(boss.starterCode).not.toContain("Console.ReadLine");
      expect(boss.starterCode).not.toMatch(/\bint\b/);
      expect(boss.starterCode).not.toMatch(/\bfloat\b/);
      expect(boss.reward).toBe(100);
      expect(boss.hints.length).toBeGreaterThan(0);
      expect(boss.failureHint.length).toBeGreaterThan(0);
    }
  });

  it("keeps every curated test expected value equal to its reference formula", () => {
    for (const boss of finalBosses) {
      expect(boss.tests.length).toBeGreaterThanOrEqual(3);
      for (const test of boss.tests) {
        const reference = boss.reference(test.inputs);
        expect(test.expected).toHaveLength(expectedOutputCount(boss));
        expect(reference).toHaveLength(expectedOutputCount(boss));
        reference.forEach((value, index) => {
          expect(Math.abs(value - test.expected[index])).toBeLessThan(BOSS_EPSILON);
        });
      }
    }
  });

  it("keeps hidden inputs decimal-friendly, except for whole-second time splits", () => {
    for (const boss of finalBosses) {
      const hasDecimal = boss.tests.some((test) => test.inputs.some((input) => !Number.isInteger(input)));
      if (boss.id === 11) {
        expect(hasDecimal).toBe(false);
        expect(boss.tests.every((test) => test.inputs.every((input) => Number.isInteger(input)))).toBe(true);
        continue;
      }
      expect(hasDecimal).toBe(true);
    }
  });

  it("teaches squaring with multiplication and reserves Math.Sqrt for the final boss", () => {
    const squareBoss = finalBosses.find((boss) => boss.id === 13)!;
    expect(squareBoss.reference([4])).toEqual([16]);
    expect(squareBoss.starterCode).not.toContain("Math.Pow");
    expect(squareBoss.hints.join(" ")).not.toContain("Math.Pow");

    const finalBoss = finalBosses.find((boss) => boss.id === 15)!;
    expect(finalBoss.title).toBe("The Hypotenuse");
    expect(finalBoss.category).toBe("FINAL BOSS // PYTHAGOREAN THEOREM");
    expect(finalBoss.visualizer).toBe("pythagorean");
    expect(finalBoss.steps).toEqual(["SQUARE BOTH SIDES", "ADD THEM", "FIND THE SQUARE ROOT"]);
    expect(finalBoss.helper?.name).toBe("Math.Sqrt(value)");
    expect(finalBoss.starterCode).not.toContain("Math.Pow");
    expect(finalBoss.reference([3, 4])[0]).toBeCloseTo(5, 10);
    expect(finalBoss.reference([2, 3])[0]).toBeCloseTo(3.605551275463989, 10);
  });

  it("splits time in three cascading steps in the multi-output boss", () => {
    const timeBoss = finalBosses.find((boss) => boss.id === 11)!;
    expect(timeBoss.compareMode).toBe("multi-double");
    expect(timeBoss.reference([86400])).toEqual([1440, 24, 1]);
    expect(timeBoss.reference([43200])).toEqual([720, 12, 0.5]);
    expect(timeBoss.starterCode).toContain("double hours = 0");
    expect(timeBoss.starterCode).toContain("double days = 0");
    expect(timeBoss.starterCode).toContain("Console.WriteLine(minutes)");
    expect(timeBoss.starterCode).toContain("Console.WriteLine(days)");
    expect(timeBoss.starterCode).not.toContain("Math.Floor");
  });
});
