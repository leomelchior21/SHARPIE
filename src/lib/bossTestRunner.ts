import type { BossDefinition, BossTest } from "../data/finalBosses";

export const BOSS_EPSILON = 0.0001;

export type BossTestOutcome = {
  status: "pass" | "fail";
  received: number[] | null;
  outputError?: string;
};

export type BossTestCard = {
  status: "waiting" | "running" | "pass" | "fail";
  test: BossTest;
  received: number[] | null;
  outputError?: string;
};

export type ParsedNumericOutput = {
  values: number[];
  invalid: boolean;
};

export function expectedOutputCount(boss: Pick<BossDefinition, "tests">): number {
  return boss.tests[0]?.expected.length ?? 1;
}

export function parseNumericOutput(output: string): ParsedNumericOutput {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const values: number[] = [];
  for (const line of lines) {
    const numeric = Number(line);
    if (!Number.isFinite(numeric)) return { values, invalid: true };
    values.push(numeric);
  }
  return { values, invalid: false };
}

function outputErrorMessage(expectedCount: number, receivedCount: number, invalid: boolean): string {
  if (invalid || receivedCount === 0) return "Your program did not print a valid number.";
  if (expectedCount === 1) return "This challenge expects one result.";
  const words = ["zero", "one", "two", "three", "four", "five"];
  return `This challenge expects ${words[expectedCount] ?? expectedCount} numeric results.`;
}

export function evaluateBossTest(boss: BossDefinition, test: BossTest, output: string): BossTestOutcome {
  const expectedCount = test.expected.length;
  const parsed = parseNumericOutput(output);
  if (parsed.invalid || parsed.values.length !== expectedCount) {
    return {
      status: "fail",
      received: parsed.invalid || parsed.values.length === 0 ? null : parsed.values,
      outputError: outputErrorMessage(expectedCount, parsed.values.length, parsed.invalid),
    };
  }

  const passed = parsed.values.every((received, index) => {
    const expected = test.expected[index];
    return Number.isFinite(expected) && Math.abs(received - expected) < BOSS_EPSILON;
  });

  return { status: passed ? "pass" : "fail", received: parsed.values };
}

export function selectBossTests(boss: BossDefinition, count = 3, random: () => number = Math.random): BossTest[] {
  const pool = boss.tests.map((test) => test);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function formatBossNumber(value: number, maxDecimals = 4): string {
  if (!Number.isFinite(value)) return "?";
  if (Number.isInteger(value)) return String(value);
  const rounded = Number(value.toFixed(maxDecimals));
  return String(rounded);
}

export function formatBossInputs(inputs: number[]): string {
  return inputs.map((value) => formatBossNumber(value)).join(", ");
}
