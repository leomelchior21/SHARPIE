import { analyzeExpression, validateTokens } from "../lib/basicOps/expression";

export type OperatorSymbol = "+" | "-" | "*" | "/" | "%" | "(" | ")";
export type NumberUsage = "exactly-once" | "at-least-once";
export type HintMode = "explicit" | "guided" | "minimal" | "none";

export type TranslationChallenge = {
  id: string;
  level: number;
  mathLatex: string;
  mathText: string;
  writtenPrompt?: string;
  promptContext?: string[];
  requiredNumbers: number[];
  numberUsage: NumberUsage;
  allowedOperators: OperatorSymbol[];
  expectedResult: number;
  referenceExpression: string;
  hintSequence: string[];
  transformNote: string;
  pair?: { id: string; role: "a" | "b" };
};

export type TranslateLevel = {
  level: number;
  name: string;
  instruction: string;
  goal: string;
  rules: string[];
  snippets: string[];
  hintMode: HintMode;
  attemptsBeforeHint: number;
};

export type RushRound = {
  round: number;
  label: string;
  seconds: number;
  count: number;
  hintAfterMisses: number | null;
  levels: number[];
};

export type TargetPuzzle = {
  id: string;
  index: number;
  target: number;
  numbers: number[];
  numberUsage: NumberUsage;
  allowedOperators: OperatorSymbol[];
  referenceExpression: string;
  hints: string[];
};

export const MAX_TARGET_ATTEMPTS = 6;

export const CONCEPT_SYMBOLS = ["+", "-", "*", "/", "%", "(", ")", "result"] as const;

export const TRANSLATE_LEVELS: TranslateLevel[] = [
  {
    level: 1,
    name: "Addition",
    instruction: "Write the formula in C# to match the expression.",
    goal: "Turn the math expression into valid C# code.",
    rules: ["Use only +", "Finish with ;", "Store it in result"],
    snippets: ["+", "result", ";"],
    hintMode: "explicit",
    attemptsBeforeHint: 2,
  },
  {
    level: 2,
    name: "Subtraction",
    instruction: "Write the formula in C# to match the expression.",
    goal: "Translate subtraction without changing the order.",
    rules: ["Use only -", "Finish with ;", "Store it in result"],
    snippets: ["-", "result", ";"],
    hintMode: "explicit",
    attemptsBeforeHint: 2,
  },
  {
    level: 3,
    name: "Multiplication",
    instruction: "Math has many ways to write multiplication. C# has one.",
    goal: "Find the C# multiplication operator.",
    rules: ["× and · both become *", "Implicit products need * too", "Store it in result"],
    snippets: ["*", "(", ")", "result"],
    hintMode: "explicit",
    attemptsBeforeHint: 2,
  },
  {
    level: 4,
    name: "Division",
    instruction: "Read the fraction. Write it as C#.",
    goal: "Turn a fraction into a C# division.",
    rules: ["The fraction bar becomes /", "Top comes first", "Store it in result"],
    snippets: ["/", "(", ")", "result"],
    hintMode: "explicit",
    attemptsBeforeHint: 2,
  },
  {
    level: 5,
    name: "Remainder",
    instruction: "Objects are packed into groups. What is left over?",
    goal: "Use the C# operator that finds the leftover.",
    rules: ["Leftovers have their own operator", "Finish with ;"],
    snippets: ["%", "result"],
    hintMode: "explicit",
    attemptsBeforeHint: 2,
  },
  {
    level: 6,
    name: "Order of Operations",
    instruction: "Same expression, C# rules. Write it exactly as C# should run it.",
    goal: "Respect multiplication before addition.",
    rules: ["× happens before + and -", "Extra ( ) are allowed, not required"],
    snippets: ["+", "-", "*"],
    hintMode: "guided",
    attemptsBeforeHint: 2,
  },
  {
    level: 7,
    name: "Parentheses",
    instruction: "Two versions of the same numbers. Grouping changes the result.",
    goal: "Move the parentheses from math into C#.",
    rules: ["Parentheses change what runs first"],
    snippets: ["(", ")", "*", "+"],
    hintMode: "guided",
    attemptsBeforeHint: 2,
  },
  {
    level: 8,
    name: "Fractions",
    instruction: "The numerator is an expression. The fraction bar divides all of it.",
    goal: "Group the whole numerator inside the division.",
    rules: ["The fraction bar divides everything above it", "Group the numerator"],
    snippets: ["+", "/", "(", ")"],
    hintMode: "guided",
    attemptsBeforeHint: 1,
  },
  {
    level: 9,
    name: "Mixed Expressions",
    instruction: "Fractions, products and sums together. Translate the structure.",
    goal: "Keep every part in its mathematical place.",
    rules: [],
    snippets: ["+", "-", "*", "/", "(", ")"],
    hintMode: "minimal",
    attemptsBeforeHint: 2,
  },
  {
    level: 10,
    name: "Formula Boss",
    instruction: "No hints. No operator notes. Translate it.",
    goal: "Turn a full formula into one C# expression.",
    rules: [],
    snippets: [],
    hintMode: "none",
    attemptsBeforeHint: 99,
  },
];

export const TRANSLATE_LEVEL_COUNTS: Record<number, number> = {
  1: 6,
  2: 6,
  3: 6,
  4: 6,
  5: 5,
  6: 6,
  7: 8,
  8: 6,
  9: 5,
  10: 4,
};

export const WARMUP_LEVELS = [1, 2, 3, 4] as const;
export const WARMUP_EXAMPLES_PER_OPERATOR = 3;
export const WARMUP_TOTAL = WARMUP_LEVELS.length * WARMUP_EXAMPLES_PER_OPERATOR;

export const RUSH_ROUNDS: RushRound[] = [
  { round: 1, label: "ADDITION", seconds: 18, count: 4, hintAfterMisses: null, levels: [1] },
  { round: 2, label: "SUBTRACTION", seconds: 17, count: 4, hintAfterMisses: null, levels: [2] },
  { round: 3, label: "MULTIPLICATION", seconds: 16, count: 4, hintAfterMisses: null, levels: [3] },
  { round: 4, label: "DIVISION & REMAINDER", seconds: 15, count: 4, hintAfterMisses: null, levels: [4, 5] },
  { round: 5, label: "MIXED EXPRESSIONS", seconds: 14, count: 4, hintAfterMisses: null, levels: [6, 7, 8, 9] },
];

export const TARGET_PUZZLES: TargetPuzzle[] = [
  {
    id: "target-01",
    index: 1,
    target: 10,
    numbers: [7, 3],
    numberUsage: "exactly-once",
    allowedOperators: ["+"],
    referenceExpression: "7 + 3",
    hints: ["Addition is the only operator here.", "Order does not change a sum.", "Add the two numbers."],
  },
  {
    id: "target-02",
    index: 2,
    target: 12,
    numbers: [15, 3],
    numberUsage: "exactly-once",
    allowedOperators: ["-"],
    referenceExpression: "15 - 3",
    hints: ["Subtraction is the only operator here.", "The bigger number goes first.", "Take 15 and remove 3."],
  },
  {
    id: "target-03",
    index: 3,
    target: 24,
    numbers: [6, 4],
    numberUsage: "exactly-once",
    allowedOperators: ["*"],
    referenceExpression: "6 * 4",
    hints: ["You need a product, not a sum.", "Multiplication is the only operator here.", "What times what gives 24?"],
  },
  {
    id: "target-04",
    index: 4,
    target: 6,
    numbers: [18, 3],
    numberUsage: "exactly-once",
    allowedOperators: ["/"],
    referenceExpression: "18 / 3",
    hints: ["You need to split, not combine.", "Division is the only operator here.", "How many groups of 3 fit in 18?"],
  },
  {
    id: "target-05",
    index: 5,
    target: 22,
    numbers: [8, 3, 2],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "-", "*"],
    referenceExpression: "8 * 3 - 2",
    hints: ["Multiplication alone is not enough.", "Build a bigger number, then reduce it.", "Try a product first."],
  },
  {
    id: "target-06",
    index: 6,
    target: 35,
    numbers: [4, 3, 5],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "*", "(", ")"],
    referenceExpression: "(4 + 3) * 5",
    hints: ["Multiplication alone won't get you there.", "Try changing which operation happens first.", "Parentheses may help."],
  },
  {
    id: "target-07",
    index: 7,
    target: 5,
    numbers: [12, 8, 4],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "-", "*", "/", "(", ")"],
    referenceExpression: "(12 + 8) / 4",
    hints: ["Division will be part of it.", "Combine before you divide.", "The fraction bar divides the whole sum."],
  },
  {
    id: "target-08",
    index: 8,
    target: 7,
    numbers: [2, 3, 4, 2],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "*", "/", "(", ")"],
    referenceExpression: "(2 + 3 * 4) / 2",
    hints: ["Multiplication runs before addition.", "You will divide at the end.", "Group what happens before the division."],
  },
  {
    id: "target-09",
    index: 9,
    target: 2,
    numbers: [17, 5],
    numberUsage: "exactly-once",
    allowedOperators: ["%"],
    referenceExpression: "17 % 5",
    hints: ["One special operator remains.", "You need what is left over after grouping.", "17 objects, groups of 5."],
  },
  {
    id: "target-10",
    index: 10,
    target: 4,
    numbers: [9, 5, 1],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "-", "*", "/", "(", ")"],
    referenceExpression: "9 - 5 * 1",
    hints: ["One subtraction can do most of the work.", "The last number is neutral.", "There is more than one path to 4."],
  },
  {
    id: "target-11",
    index: 11,
    target: 18,
    numbers: [6, 3, 4, 2],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "-", "*", "/", "(", ")"],
    referenceExpression: "(6 + 3) * (4 - 2)",
    hints: ["Two groups are multiplied together.", "Both groups need parentheses.", "One group adds, the other subtracts."],
  },
  {
    id: "target-12",
    index: 12,
    target: 40,
    numbers: [8, 5, 4, 3, 1],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "-", "*", "/", "(", ")"],
    referenceExpression: "(8 + 5 - 3) * 4 * 1",
    hints: ["A product produces 40.", "Build a group that equals 10.", "The number 1 is a neutral multiplier."],
  },
];

type Rng = () => number;

function hashSeed(...parts: number[]): number {
  let hash = 2166136261 >>> 0;
  for (const part of parts) {
    hash ^= part >>> 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function createRng(seed: number): Rng {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function pickDivisor(rng: Rng, value: number, min: number, max: number): number | null {
  const divisors: number[] = [];
  for (let divisor = min; divisor <= max; divisor += 1) {
    if (value % divisor === 0) divisors.push(divisor);
  }
  return divisors.length ? pick(rng, divisors) : null;
}

function translateId(level: number, index: number): string {
  return `t${String(level).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
}

function fill(level: number, count: number, build: (rng: Rng, index: number) => Omit<TranslationChallenge, "id" | "level">): (rng: Rng) => TranslationChallenge[] {
  return (rng) =>
    Array.from({ length: count }, (_, index) => {
      const partial = build(rng, index);
      return { ...partial, id: translateId(level, index), level };
    });
}

const additionHints = ["The two numbers stay in the same order.", "Addition uses the + symbol.", "12 + 7 is already one step from the answer."];
const subtractionHints = ["Subtract the second number from the first.", "Subtraction uses the - symbol.", "The larger number comes first here."];

const level1 = fill(1, TRANSLATE_LEVEL_COUNTS[1], (rng) => {
  const a = randomInt(rng, 7, 48);
  const b = randomInt(rng, 3, 39);
  return {
    mathLatex: `${a} + ${b}`,
    mathText: `${a} plus ${b}`,
    requiredNumbers: [a, b],
    numberUsage: "exactly-once",
    allowedOperators: ["+"],
    expectedResult: a + b,
    referenceExpression: `${a} + ${b}`,
    hintSequence: additionHints,
    transformNote: "Math + is C# +.",
  };
});

const level2 = fill(2, TRANSLATE_LEVEL_COUNTS[2], (rng) => {
  const b = randomInt(rng, 6, 39);
  const a = b + randomInt(rng, 4, 50);
  return {
    mathLatex: `${a} - ${b}`,
    mathText: `${a} minus ${b}`,
    requiredNumbers: [a, b],
    numberUsage: "exactly-once",
    allowedOperators: ["-"],
    expectedResult: a - b,
    referenceExpression: `${a} - ${b}`,
    hintSequence: subtractionHints,
    transformNote: "Math - is C# -.",
  };
});

const multiplicationNotations = ["times", "dot", "implicit", "times", "implicit", "dot"] as const;

const level3 = fill(3, TRANSLATE_LEVEL_COUNTS[3], (rng, index) => {
  const a = randomInt(rng, 3, 12);
  const b = randomInt(rng, 3, 9);
  const notation = multiplicationNotations[index % multiplicationNotations.length];
  const latex = notation === "times" ? `${a} \\times ${b}` : notation === "dot" ? `${a} \\cdot ${b}` : `${a}\\,(${b})`;
  const readable = notation === "implicit" ? `${a} times ${b}, written side by side` : `${a} times ${b}`;
  return {
    mathLatex: latex,
    mathText: readable,
    requiredNumbers: [a, b],
    numberUsage: "exactly-once",
    allowedOperators: ["*", "(", ")"],
    expectedResult: a * b,
    referenceExpression: `${a} * ${b}`,
    hintSequence: [
      "In C#, multiplication is written with *.",
      "× and · both become *.",
      "Implicit products also need *: 3(5) is 3 * 5.",
    ],
    transformNote: "× · and 3(5) all become *.",
  };
});

const level4 = fill(4, TRANSLATE_LEVEL_COUNTS[4], (rng) => {
  const b = randomInt(rng, 3, 12);
  const q = randomInt(rng, 3, 9);
  const a = b * q;
  return {
    mathLatex: `\\frac{${a}}{${b}}`,
    mathText: `${a} divided by ${b}`,
    requiredNumbers: [a, b],
    numberUsage: "exactly-once",
    allowedOperators: ["/", "(", ")"],
    expectedResult: q,
    referenceExpression: `${a} / ${b}`,
    hintSequence: [
      "The fraction bar means division.",
      "Division uses the / symbol.",
      "24 over 4 becomes 24 / 4.",
    ],
    transformNote: "The fraction bar becomes /.",
  };
});

const level5 = fill(5, TRANSLATE_LEVEL_COUNTS[5], (rng) => {
  const group = randomInt(rng, 4, 9);
  const containers = randomInt(rng, 3, 8);
  const leftover = randomInt(rng, 1, group - 1);
  const total = containers * group + leftover;
  return {
    mathLatex: "",
    mathText: `${total} objects packed in groups of ${group}. How many are left over?`,
    promptContext: [`${total} objects`, `groups of ${group}`, "How many are left over?"],
    requiredNumbers: [total, group],
    numberUsage: "exactly-once",
    allowedOperators: ["%"],
    expectedResult: leftover,
    referenceExpression: `${total} % ${group}`,
    hintSequence: [
      "There is a C# operator just for leftovers.",
      "REMAINDER → %",
      "17 objects in groups of 5 leaves 17 % 5.",
    ],
    transformNote: "Leftover becomes %.",
  };
});

const level6 = fill(6, TRANSLATE_LEVEL_COUNTS[6], (rng, index) => {
  const mode = index % 3;
  const b = randomInt(rng, 2, 6);
  const c = randomInt(rng, 2, 6);
  const base = b * c;
  if (mode === 0) {
    const a = randomInt(rng, 3, 20);
    return {
      mathLatex: `${a} + ${b} \\times ${c}`,
      mathText: `${a} plus ${b} times ${c}`,
      requiredNumbers: [a, b, c],
      numberUsage: "exactly-once",
      allowedOperators: ["+", "*", "(", ")"],
      expectedResult: a + base,
      referenceExpression: `${a} + ${b} * ${c}`,
      hintSequence: ["Multiplication runs before addition.", "C# follows the same order as math.", "Keep the numbers exactly as shown."],
      transformNote: "× happens before +, in math and in C#.",
    };
  }
  if (mode === 1) {
    const a = base + randomInt(rng, 2, 14);
    return {
      mathLatex: `${a} - ${b} \\times ${c}`,
      mathText: `${a} minus ${b} times ${c}`,
      requiredNumbers: [a, b, c],
      numberUsage: "exactly-once",
      allowedOperators: ["-", "*", "(", ")"],
      expectedResult: a - base,
      referenceExpression: `${a} - ${b} * ${c}`,
      hintSequence: ["Multiplication runs before subtraction.", "C# follows the same order as math.", "Keep the numbers exactly as shown."],
      transformNote: "× happens before -, in math and in C#.",
    };
  }
  const a = randomInt(rng, 3, 20);
  return {
    mathLatex: `${b} \\times ${c} + ${a}`,
    mathText: `${b} times ${c} plus ${a}`,
    requiredNumbers: [b, c, a],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "*", "(", ")"],
    expectedResult: base + a,
    referenceExpression: `${b} * ${c} + ${a}`,
    hintSequence: ["Multiplication runs before addition.", "C# follows the same order as math.", "Keep the numbers exactly as shown."],
    transformNote: "× happens before +, in math and in C#.",
  };
});

function level7(rng: Rng): TranslationChallenge[] {
  const challenges: TranslationChallenge[] = [];
  const pairCount = TRANSLATE_LEVEL_COUNTS[7] / 2;
  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    const a = randomInt(rng, 2, 6);
    const b = randomInt(rng, 2, 6);
    const c = randomInt(rng, 2, 7);
    const pairId = `pair-${pairIndex + 1}`;
    challenges.push(
      {
        id: translateId(7, pairIndex * 2),
        level: 7,
        mathLatex: `${a} + ${b} \\times ${c}`,
        mathText: `${a} plus ${b} times ${c}`,
        requiredNumbers: [a, b, c],
        numberUsage: "exactly-once",
        allowedOperators: ["+", "*", "(", ")"],
        expectedResult: a + b * c,
        referenceExpression: `${a} + ${b} * ${c}`,
        hintSequence: ["No parentheses here, so × runs first.", "Write the numbers in the same order.", "C# needs no extra grouping."],
        transformNote: "× before + when there are no parentheses.",
        pair: { id: pairId, role: "a" },
      },
      {
        id: translateId(7, pairIndex * 2 + 1),
        level: 7,
        mathLatex: `(${a} + ${b}) \\times ${c}`,
        mathText: `${a} plus ${b}, grouped, times ${c}`,
        requiredNumbers: [a, b, c],
        numberUsage: "exactly-once",
        allowedOperators: ["+", "*", "(", ")"],
        expectedResult: (a + b) * c,
        referenceExpression: `(${a} + ${b}) * ${c}`,
        hintSequence: ["The parentheses change which operation runs first.", "C# groups with the same ( ) symbols.", `Translate the group as (${a} + ${b}).`],
        transformNote: "The math grouping ( ) becomes C# ( ).",
        pair: { id: pairId, role: "b" },
      },
    );
  }
  return challenges;
}

const level8 = fill(8, TRANSLATE_LEVEL_COUNTS[8], (rng, index) => {
  const c = randomInt(rng, 2, 8);
  const q = randomInt(rng, 2, 8);
  if (index % 2 === 0) {
    const sum = c * q;
    const a = randomInt(rng, 1, sum - 1);
    const b = sum - a;
    return {
      mathLatex: `\\frac{${a} + ${b}}{${c}}`,
      mathText: `${a} plus ${b}, all divided by ${c}`,
      requiredNumbers: [a, b, c],
      numberUsage: "exactly-once",
      allowedOperators: ["+", "/", "(", ")"],
      expectedResult: q,
      referenceExpression: `(${a} + ${b}) / ${c}`,
      hintSequence: [
        "The fraction bar divides everything above it.",
        "Group the whole numerator.",
        `Parentheses keep the sum together before division.`,
      ],
      transformNote: "The fraction bar divides the whole numerator.",
    };
  }
  const b = randomInt(rng, 2, 9);
  const a = c * q + b;
  return {
    mathLatex: `\\frac{${a} - ${b}}{${c}}`,
    mathText: `${a} minus ${b}, all divided by ${c}`,
    requiredNumbers: [a, b, c],
    numberUsage: "exactly-once",
    allowedOperators: ["-", "/", "(", ")"],
    expectedResult: q,
    referenceExpression: `(${a} - ${b}) / ${c}`,
    hintSequence: [
      "The fraction bar divides everything above it.",
      "Group the whole numerator.",
      "Parentheses keep the difference together before division.",
    ],
    transformNote: "The fraction bar divides the whole numerator.",
  };
});

const level9 = fill(9, TRANSLATE_LEVEL_COUNTS[9], (rng, index) => {
  if (index % 3 === 0) {
    const b = randomInt(rng, 2, 5);
    const c = randomInt(rng, 2, 5);
    const a = randomInt(rng, 1, 9);
    const numerator = a + b * c;
    const divisor = pickDivisor(rng, numerator, 2, 9) ?? numerator;
    return {
      mathLatex: `\\frac{${a} + ${b} \\times ${c}}{${divisor}}`,
      mathText: `${a} plus ${b} times ${c}, all divided by ${divisor}`,
      requiredNumbers: [a, b, c, divisor],
      numberUsage: "exactly-once",
      allowedOperators: ["+", "*", "/", "(", ")"],
      expectedResult: numerator / divisor,
      referenceExpression: `(${a} + ${b} * ${c}) / ${divisor}`,
      hintSequence: [
        "The fraction bar divides the whole numerator.",
        "Multiplication still runs before addition.",
        "Group the numerator so the division sees the full result.",
      ],
      transformNote: "Fraction bar → /, numerator → ( ).",
    };
  }
  if (index % 3 === 1) {
    const b = randomInt(rng, 1, 6);
    const c = randomInt(rng, 1, 6);
    const denominator = b + c;
    const q = randomInt(rng, 2, 6);
    const a = denominator * q;
    const d = randomInt(rng, 2, 6);
    const e = randomInt(rng, 2, 6);
    return {
      mathLatex: `\\frac{${a}}{${b} + ${c}} + ${d} \\times ${e}`,
      mathText: `${a} divided by the sum of ${b} and ${c}, plus ${d} times ${e}`,
      requiredNumbers: [a, b, c, d, e],
      numberUsage: "exactly-once",
      allowedOperators: ["+", "*", "/", "(", ")"],
      expectedResult: q + d * e,
      referenceExpression: `${a} / (${b} + ${c}) + ${d} * ${e}`,
      hintSequence: [
        "The denominator is a sum, so it needs its own group.",
        "Division and multiplication both run before addition.",
        "Wrap the bottom of the fraction in parentheses.",
      ],
      transformNote: "Denominator sum → ( ), division → /.",
    };
  }
  const c = randomInt(rng, 2, 5);
  const d = randomInt(rng, 2, 5);
  const denominator = c * d;
  const q = randomInt(rng, 2, 6);
  const b = randomInt(rng, 2, 9);
  const a = denominator * q + b;
  const e = randomInt(rng, 2, 8);
  return {
    mathLatex: `\\frac{${a} - ${b}}{${c} \\times ${d}} + ${e}`,
    mathText: `${a} minus ${b}, divided by ${c} times ${d}, plus ${e}`,
    requiredNumbers: [a, b, c, d, e],
    numberUsage: "exactly-once",
    allowedOperators: ["+", "-", "*", "/", "(", ")"],
    expectedResult: q + e,
    referenceExpression: `(${a} - ${b}) / (${c} * ${d}) + ${e}`,
    hintSequence: [
      "Every part of a fraction keeps its own group in C#.",
      "The denominator is a product.",
      "Group the numerator and the denominator.",
    ],
    transformNote: "Top and bottom of the fraction each get ( ).",
  };
});

const level10 = fill(10, TRANSLATE_LEVEL_COUNTS[10], (rng, index) => {
  if (index === 0) {
    const a = randomInt(rng, 1, 6);
    const b = randomInt(rng, 1, 6);
    const sum = a + b;
    const c = randomInt(rng, 2, 5);
    const numerator = sum * c;
    const q = pickDivisor(rng, numerator, 2, 6) ?? c;
    const denominator = numerator / q;
    const d = randomInt(rng, 1, Math.max(1, denominator - 1));
    const e = denominator - d;
    return {
      mathLatex: `\\frac{(${a} + ${b}) \\times ${c}}{${d} + ${e}}`,
      mathText: `${a} plus ${b}, times ${c}, divided by ${d} plus ${e}`,
      requiredNumbers: [a, b, c, d, e],
      numberUsage: "exactly-once",
      allowedOperators: ["+", "*", "/", "(", ")"],
      expectedResult: q,
      referenceExpression: `(${a} + ${b}) * ${c} / (${d} + ${e})`,
      hintSequence: ["Group every block before combining."],
      transformNote: "Top and bottom groups survive into C#.",
    };
  }
  if (index === 1) {
    const i = randomInt(rng, 1, 4);
    const j = randomInt(rng, 1, 4);
    const sum = i + j;
    const h = randomInt(rng, 2, 3);
    const q = randomInt(rng, 2, 4);
    const g = h * sum * q;
    const f = randomInt(rng, 2, 9);
    return {
      mathLatex: `${f} + \\frac{${g}}{${h}(${i} + ${j})}`,
      mathText: `${f} plus ${g} divided by ${h} times the group ${i} plus ${j}`,
      requiredNumbers: [f, g, h, i, j],
      numberUsage: "exactly-once",
      allowedOperators: ["+", "*", "/", "(", ")"],
      expectedResult: f + q,
      referenceExpression: `${f} + ${g} / (${h} * (${i} + ${j}))`,
      hintSequence: ["The product beside the parentheses also needs a *."],
      transformNote: "Side-by-side factors become *.",
    };
  }
  if (index === 2) {
    const c = randomInt(rng, 3, 7);
    const d = randomInt(rng, 1, c - 2);
    const denominator = c - d;
    const q = randomInt(rng, 3, 8);
    const numerator = denominator * q;
    const a = pickDivisor(rng, numerator, 2, 9) ?? 2;
    const b = numerator / a;
    const e = randomInt(rng, 1, q - 1);
    return {
      mathLatex: `\\frac{${a} \\times ${b}}{${c} - ${d}} - ${e}`,
      mathText: `${a} times ${b}, divided by ${c} minus ${d}, minus ${e}`,
      requiredNumbers: [a, b, c, d, e],
      numberUsage: "exactly-once",
      allowedOperators: ["-", "*", "/", "(", ")"],
      expectedResult: q - e,
      referenceExpression: `${a} * ${b} / (${c} - ${d}) - ${e}`,
      hintSequence: ["The denominator is a difference."],
      transformNote: "Denominator difference → ( ).",
    };
  }
  const a = randomInt(rng, 5, 12);
  const b = randomInt(rng, 1, Math.max(1, a - 1));
  const x = a - b;
  const c = randomInt(rng, 2, 5);
  const numerator = x * c;
  const d = pickDivisor(rng, numerator, 2, 9) ?? 2;
  return {
    mathLatex: `\\frac{(${a} - ${b}) \\times ${c}}{${d}}`,
    mathText: `${a} minus ${b}, times ${c}, all divided by ${d}`,
    requiredNumbers: [a, b, c, d],
    numberUsage: "exactly-once",
    allowedOperators: ["-", "*", "/", "(", ")"],
    expectedResult: numerator / d,
    referenceExpression: `(${a} - ${b}) * ${c} / ${d}`,
    hintSequence: ["Group the difference first."],
    transformNote: "Grouped difference → ( ).",
  };
});

const levelGenerators: Record<number, (rng: Rng) => TranslationChallenge[]> = {
  1: level1,
  2: level2,
  3: level3,
  4: level4,
  5: level5,
  6: level6,
  7: level7,
  8: level8,
  9: level9,
  10: level10,
};

export function translateChallengeCount(level: number): number {
  return TRANSLATE_LEVEL_COUNTS[level] ?? 0;
}

export function generateTranslateChallenges(level: number, seed: number): TranslationChallenge[] {
  const generator = levelGenerators[level] ?? level1;
  return generator(createRng(hashSeed(seed, level * 7919)));
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function uniqueExpressions(challenges: TranslationChallenge[], count: number): TranslationChallenge[] {
  const seen = new Set<string>();
  const unique: TranslationChallenge[] = [];
  for (const challenge of challenges) {
    if (seen.has(challenge.referenceExpression)) continue;
    seen.add(challenge.referenceExpression);
    unique.push(challenge);
    if (unique.length >= count) break;
  }
  return unique;
}

export function generateRushChallenges(round: number, seed: number): TranslationChallenge[] {
  const config = RUSH_ROUNDS.find((item) => item.round === round) ?? RUSH_ROUNDS[0];
  const rng = createRng(hashSeed(seed, round * 104729));
  if (config.levels.length === 1) {
    return uniqueExpressions(generateTranslateChallenges(config.levels[0], hashSeed(seed, round)), config.count)
      .map((challenge, index) => index % 2 === 1
        ? { ...challenge, writtenPrompt: simpleWrittenPrompt(challenge) }
        : challenge);
  }
  const pool: TranslationChallenge[] = [];
  for (const level of config.levels) {
    pool.push(...generateTranslateChallenges(level, hashSeed(seed, round, level)));
  }
  const mixed: TranslationChallenge[] = [];
  let lastLevel = -1;
  const remaining = uniqueExpressions(shuffle(rng, pool), pool.length);
  while (mixed.length < config.count && remaining.length > 0) {
    const nextIndex = remaining.findIndex((item) => item.level !== lastLevel);
    const [item] = remaining.splice(nextIndex === -1 ? 0 : nextIndex, 1);
    lastLevel = item.level;
    mixed.push({ ...item, id: `r${round}-${mixed.length + 1}` });
  }
  let writtenDivisionAdded = false;
  return mixed.map((challenge) => {
    if (round === 4 && challenge.level === 4 && !writtenDivisionAdded) {
      writtenDivisionAdded = true;
      return { ...challenge, writtenPrompt: simpleWrittenPrompt(challenge) };
    }
    return challenge;
  });
}

function simpleWrittenPrompt(challenge: TranslationChallenge, variant = 0): string | undefined {
  if (challenge.requiredNumbers.length !== 2) return undefined;
  const operator = ({ 1: "plus", 2: "minus", 3: "times", 4: "divided by" } as Record<number, string>)[challenge.level];
  if (!operator) return undefined;
  const [left, right] = challenge.requiredNumbers;
  if (variant === 1) {
    return ({
      1: `Add ${left} and ${right}`,
      2: `Subtract ${right} from ${left}`,
      3: `Multiply ${left} by ${right}`,
      4: `Divide ${left} by ${right}`,
    } as Record<number, string>)[challenge.level];
  }
  return `${left} ${operator} ${right}`;
}

function writtenWarmupHints(challenge: TranslationChallenge): string[] {
  const [left, right] = challenge.requiredNumbers;
  const symbol = ({ 1: "+", 2: "-", 3: "*", 4: "/" } as Record<number, string>)[challenge.level];
  return [
    `Translate the operation in the sentence to the C# symbol ${symbol}.`,
    `Keep ${left} first and ${right} second.`,
    `Use each number once: ${left} ${symbol} ${right}.`,
  ];
}

export function generateWarmupChallenges(seed: number): TranslationChallenge[] {
  return WARMUP_LEVELS.flatMap((level) => {
    const promptRng = createRng(hashSeed(seed, level, 8923));
    const writtenSlot = Math.floor(promptRng() * WARMUP_EXAMPLES_PER_OPERATOR);
    const wordingVariant = Math.floor(promptRng() * 2);
    const examples: TranslationChallenge[] = [];
    const expressions = new Set<string>();
    for (let slot = 0; slot < WARMUP_EXAMPLES_PER_OPERATOR; slot += 1) {
      for (let attempt = 0; ; attempt += 1) {
        const candidate = generateTranslateChallenges(level, hashSeed(seed, level, attempt))[slot];
        if (expressions.has(candidate.referenceExpression)) continue;
        expressions.add(candidate.referenceExpression);
        examples.push({ ...candidate, id: `warmup-${level}-${slot + 1}` });
        break;
      }
    }
    return examples.map((challenge, slot) => slot === writtenSlot
      ? {
          ...challenge,
          writtenPrompt: simpleWrittenPrompt(challenge, wordingVariant),
          hintSequence: writtenWarmupHints(challenge),
          transformNote: "The words become the matching C# operator.",
        }
      : challenge);
  });
}

function checkedPuzzle(puzzle: TargetPuzzle): TargetPuzzle | null {
  const analysis = analyzeExpression(puzzle.referenceExpression);
  if (!analysis.ok || !Number.isInteger(analysis.value) || analysis.value < 0 || analysis.value > 300) return null;
  if (validateTokens(analysis.tokens, {
    numbers: puzzle.numbers,
    numberUsage: puzzle.numberUsage,
    allowedOperators: puzzle.allowedOperators,
  }).length > 0) return null;
  return { ...puzzle, target: analysis.value };
}

export function generateTargetTutorialPuzzles(seed: number): TargetPuzzle[] {
  const rng = createRng(hashSeed(seed, 4301));
  return TARGET_PUZZLES.map((base) => {
    const originalNumbers = [...new Set(base.numbers)];
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const replacements = new Map(originalNumbers.map((number) => [number, randomInt(rng, 2, 18)]));
      const referenceExpression = base.referenceExpression.replace(/\d+/g, (text) => String(replacements.get(Number(text)) ?? text));
      if (referenceExpression === base.referenceExpression) continue;
      const candidate = checkedPuzzle({
        ...base,
        numbers: base.numbers.map((number) => replacements.get(number) ?? number),
        referenceExpression,
        hints: [
          `Available operators: ${base.allowedOperators.join(" ")}.`,
          "Use every shown number exactly once.",
          "Try grouping with parentheses when the order matters.",
        ],
      });
      if (candidate) return candidate;
    }
    return base;
  });
}

export function generateSurvivalPuzzle(index: number, seed: number): TargetPuzzle {
  const rng = createRng(hashSeed(seed, index * 2237));
  const templates = [
    (a: number, b: number, c: number, _d: number) => `${a} + ${b} * ${c}`,
    (a: number, b: number, c: number, _d: number) => `(${a} + ${b}) * ${c}`,
    (a: number, b: number, c: number, _d: number) => `${a} * ${b} - ${c}`,
    (a: number, b: number, c: number, _d: number) => `(${a} + ${b}) / ${c}`,
    (a: number, b: number, c: number, _d: number) => `${a} * ${b} % ${c}`,
    (a: number, b: number, c: number, d: number) => `(${a} + ${b}) * (${c} - ${d})`,
    (a: number, b: number, c: number, d: number) => `(${a} * ${b} + ${c}) / ${d}`,
  ];
  const template = templates[Math.min(templates.length - 1, Math.floor((index - 1) / 3) + Math.floor(rng() * 2))];
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const numbers = Array.from({ length: 4 }, () => randomInt(rng, 2, Math.min(18, 8 + Math.floor(index / 3))));
    const referenceExpression = template(...(numbers as [number, number, number, number]));
    const analysis = analyzeExpression(referenceExpression);
    if (!analysis.ok) continue;
    const usedNumbers = analysis.tokens.filter((token) => token.kind === "number").map((token) => token.value);
    const allowedOperators = [...new Set(analysis.tokens.filter((token) => token.kind !== "number").map((token) => token.text))] as OperatorSymbol[];
    const candidate = checkedPuzzle({
      id: `survival-${index}-${seed}`,
      index,
      target: analysis.value,
      numbers: usedNumbers,
      numberUsage: "exactly-once",
      allowedOperators,
      referenceExpression,
      hints: ["Use every number exactly once.", "Check the order of operations.", "Parentheses can change the result."],
    });
    if (candidate) return candidate;
  }
  const a = randomInt(rng, 3, 16);
  const b = randomInt(rng, 2, 12);
  return { id: `survival-${index}-${seed}`, index, target: a + b, numbers: [a, b], numberUsage: "exactly-once", allowedOperators: ["+"], referenceExpression: `${a} + ${b}`, hints: ["Add the two numbers."] };
}

export function moduleSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
