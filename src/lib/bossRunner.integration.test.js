import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { finalBosses } from "../data/finalBosses";
import { BOSS_EPSILON, parseNumericOutput } from "./bossTestRunner";

function createRunner() {
  let handler;
  const messages = [];
  const sandbox = {
    performance,
    setTimeout(callback) { callback(); },
    self: {
      addEventListener(_name, callback) { handler = callback; },
      postMessage(message) { messages.push(message); },
    },
  };
  vm.runInNewContext(readFileSync("public/sharpie-runner.worker.js", "utf8"), sandbox);

  return (code, inputs = []) => {
    messages.length = 0;
    handler({ data: { requestId: "test", code, inputs } });
    return messages.find((message) => message.type === "response").result;
  };
}

const solvedPrograms = {
  1: `double a = ?; // random number
double b = ?; // random number

double result = a + b;
Console.WriteLine(result);`,
  2: `double a = ?; // random number
double b = ?; // random number

double result = a - b;
Console.WriteLine(result);`,
  3: `double number = ?; // random number

double result = number * 2;
Console.WriteLine(result);`,
  4: `double number = ?; // random number

double result = number * 3;
Console.WriteLine(result);`,
  5: `double a = ?; // random number
double b = ?; // random number

double result = a / b;
Console.WriteLine(result);`,
  6: `double a = ?; // random number
double b = ?; // random number

double result = a % b;
Console.WriteLine(result);`,
  7: `double celsius = ?; // random number

double fahrenheit = celsius * 9 / 5 + 32;
Console.WriteLine(fahrenheit);`,
  8: `double distance = ?; // random number
double fuel = ?; // random number

double result = distance / fuel;
Console.WriteLine(result);`,
  9: `double baseFare = ?; // random number
double distance = ?; // random number
double rate = ?; // random number

double fare = baseFare + distance * rate;
Console.WriteLine(fare);`,
  10: `double a = ?; // random number
double b = ?; // random number
double c = ?; // random number

double average = (a + b + c) / 3;
Console.WriteLine(average);`,
  11: `double seconds = ?; // random number

double minutes = seconds / 60;
double hours = minutes / 60;
double days = hours / 24;

Console.WriteLine(minutes);
Console.WriteLine(hours);
Console.WriteLine(days);`,
  12: `double a = ?; // random number
double b = ?; // random number

double score = a * 0.4 + b * 0.6;
Console.WriteLine(score);`,
  13: `double number = ?; // random number

double result = number * number;
Console.WriteLine(result);`,
  14: `double price = ?; // random number
double discount = ?; // random number

double finalPrice = price - price * discount / 100;
Console.WriteLine(finalPrice);`,
  15: `double a = ?; // random number
double b = ?; // random number

double c = Math.Sqrt(a * a + b * b);
Console.WriteLine(c);`,
};

describe("Final Bosses end-to-end execution", () => {
  const run = createRunner();

  it.each(finalBosses.map((boss) => [boss.id, boss.title]))("solves every curated test for boss %i (%s)", (id) => {
    const boss = finalBosses.find((entry) => entry.id === id);
    const code = solvedPrograms[id];
    expect(code, `boss ${id} needs a reference program`).toBeTruthy();
    for (const test of boss.tests) {
      const result = run(code, test.inputs.map(String));
      expect(result.success, `boss ${id} failed with ${test.inputs.join(", ")}: ${result.error?.compiler ?? ""}`).toBe(true);
      const parsed = parseNumericOutput(result.output);
      expect(parsed.invalid, `boss ${id} printed a non-number`).toBe(false);
      expect(parsed.values, `boss ${id} output count for ${test.inputs.join(", ")}`).toHaveLength(test.expected.length);
      parsed.values.forEach((received, index) => {
        expect(
          Math.abs(received - test.expected[index]),
          `boss ${id} with ${test.inputs.join(", ")} expected ${test.expected[index]} but received ${received}`,
        ).toBeLessThan(BOSS_EPSILON);
      });
    }
  });

  it("accepts mathematically equivalent formulas", () => {
    for (const test of finalBosses[0].tests) {
      const result = run("double a = ?; // random number\ndouble b = ?; // random number\ndouble result = b + a;\nConsole.WriteLine(result);", test.inputs.map(String));
      expect(Math.abs(Number(result.output.trim()) - test.expected[0])).toBeLessThan(BOSS_EPSILON);
    }

    const celsius = finalBosses[6].tests[4];
    const canonical = run(solvedPrograms[7], celsius.inputs.map(String));
    const equivalent = run("double celsius = ?; // random number\ndouble fahrenheit = celsius * 1.8 + 32;\nConsole.WriteLine(fahrenheit);", celsius.inputs.map(String));
    expect(Math.abs(Number(canonical.output.trim()) - Number(equivalent.output.trim()))).toBeLessThan(BOSS_EPSILON);

    const discount = finalBosses[13].tests[2];
    const alternative = run("double price = ?; // random number\ndouble discount = ?; // random number\ndouble finalPrice = price * (100 - discount) / 100;\nConsole.WriteLine(finalPrice);", discount.inputs.map(String));
    expect(Math.abs(Number(alternative.output.trim()) - discount.expected[0])).toBeLessThan(BOSS_EPSILON);

    const triangle = finalBosses[14].tests[4];
    const swapped = run("double a = ?; // random number\ndouble b = ?; // random number\ndouble c = Math.Sqrt(b * b + a * a);\nConsole.WriteLine(c);", triangle.inputs.map(String));
    expect(Math.abs(Number(swapped.output.trim()) - triangle.expected[0])).toBeLessThan(BOSS_EPSILON);
  });

  it("keeps the unsolved starter from passing the hidden tests", () => {
    const additions = run(finalBosses[0].starterCode, ["2", "3"]);
    expect(additions.success).toBe(true);
    expect(Number(additions.output.trim())).toBe(0);
  });
});
