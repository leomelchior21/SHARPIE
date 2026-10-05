export type BossCompareMode = "single-double" | "multi-double";

export type BossTest = {
  inputs: number[];
  expected: number[];
};

export type BossHelper = {
  name: string;
  text: string;
  example: string;
};

export type BossDefinition = {
  id: number;
  sector: number;
  category: string;
  title: string;
  description: string;
  starterCode: string;
  inputsLabel: string;
  outputLabel: string;
  editTarget: string;
  compareMode: BossCompareMode;
  tests: BossTest[];
  hints: string[];
  failureHint: string;
  reward: number;
  reference: (inputs: number[]) => number[];
  helper?: BossHelper;
  steps?: string[];
  visualizer?: "pythagorean";
};

export type BossSector = {
  id: number;
  label: string;
  bossIds: number[];
};

export const BOSS_SECTORS: BossSector[] = [
  { id: 1, label: "SECTOR 01", bossIds: [1, 2, 3] },
  { id: 2, label: "SECTOR 02", bossIds: [4, 5, 6] },
  { id: 3, label: "SECTOR 03", bossIds: [7, 8, 9] },
  { id: 4, label: "SECTOR 04", bossIds: [10, 11, 12] },
  { id: 5, label: "FINAL SECTOR", bossIds: [13, 14, 15] },
];

export const BOSS_REWARD = 100;
export const BOSS_COMPLETION_BONUS = 500;
export const FINAL_BOSS_ID = 15;

// Students can only open the module when this is true. The teacher always can.
// Flip to true to release FINAL BOSSES to the classes.
export const FINAL_BOSSES_STUDENT_ACCESS = false;

// Module 05 is paused for everyone right now, teacher included.
// Flip to true to bring FINAL BOSSES back to the hub.
export const FINAL_BOSSES_ENABLED = false;

const twoNumbersStarter = `double a = ?; // random number
double b = ?; // random number

double result = 0; // Change this
Console.WriteLine(result);`;

const singleNumberStarter = `double number = ?; // random number

double result = 0; // Change this
Console.WriteLine(result);`;

export const finalBosses: BossDefinition[] = [
  {
    id: 1,
    sector: 1,
    category: "OPERATORS",
    title: "Two Numbers",
    description: "Two numbers arrive as `a` and `b`.\nChange `result` so it adds both values.",
    starterCode: twoNumbersStarter,
    inputsLabel: "a, b",
    outputLabel: "their total",
    editTarget: "result",
    compareMode: "single-double",
    reference: ([a, b]) => [a + b],
    tests: [
      { inputs: [2, 3], expected: [5] },
      { inputs: [8.5, 4], expected: [12.5] },
      { inputs: [10.25, 1.75], expected: [12] },
      { inputs: [0, 6.5], expected: [6.5] },
      { inputs: [-2, 7], expected: [5] },
      { inputs: [22.2, 3.3], expected: [25.5] },
    ],
    hints: [
      "Which operator joins two numerical values?",
      "Your calculation must use both `a` and `b`.",
    ],
    failureHint: "Check the operator used in `result`.",
    reward: BOSS_REWARD,
  },
  {
    id: 2,
    sector: 1,
    category: "OPERATORS",
    title: "Difference",
    description: "Subtract `b` from `a`.\nThe order of the two values matters.",
    starterCode: twoNumbersStarter,
    inputsLabel: "a, b",
    outputLabel: "a minus b",
    editTarget: "result",
    compareMode: "single-double",
    reference: ([a, b]) => [a - b],
    tests: [
      { inputs: [10, 4], expected: [6] },
      { inputs: [4.5, 1.5], expected: [3] },
      { inputs: [3, 8], expected: [-5] },
      { inputs: [6.75, 6.75], expected: [0] },
      { inputs: [20.5, 7.25], expected: [13.25] },
    ],
    hints: ["Order matters here. Start with `a`.", "Subtraction is not the same in both directions."],
    failureHint: "The first value must come before the second.",
    reward: BOSS_REWARD,
  },
  {
    id: 3,
    sector: 1,
    category: "OPERATORS",
    title: "Double It",
    description: "Make `result` twice the value of `number`.",
    starterCode: singleNumberStarter,
    inputsLabel: "number",
    outputLabel: "double the value",
    editTarget: "result",
    compareMode: "single-double",
    reference: ([number]) => [number * 2],
    tests: [
      { inputs: [5], expected: [10] },
      { inputs: [2.5], expected: [5] },
      { inputs: [-4], expected: [-8] },
      { inputs: [0], expected: [0] },
      { inputs: [7.75], expected: [15.5] },
    ],
    hints: ["What calculation means \u201ctwo times something\u201d?", "Multiplication uses the `*` operator."],
    failureHint: "Multiply `number` by `2`.",
    reward: BOSS_REWARD,
  },
  {
    id: 4,
    sector: 2,
    category: "OPERATORS",
    title: "Triple It",
    description: "Turn `number` into three times its value.",
    starterCode: singleNumberStarter,
    inputsLabel: "number",
    outputLabel: "triple the value",
    editTarget: "result",
    compareMode: "single-double",
    reference: ([number]) => [number * 3],
    tests: [
      { inputs: [4], expected: [12] },
      { inputs: [2.5], expected: [7.5] },
      { inputs: [-3], expected: [-9] },
      { inputs: [8.25], expected: [24.75] },
      { inputs: [0], expected: [0] },
    ],
    hints: ["Use multiplication with the value `3`."],
    failureHint: "Multiply `number` by `3`.",
    reward: BOSS_REWARD,
  },
  {
    id: 5,
    sector: 2,
    category: "DIVISION",
    title: "Quotient",
    description: "Divide `a` by `b`.\nBoth values are already `double`, so the decimal is preserved.",
    starterCode: twoNumbersStarter,
    inputsLabel: "a, b",
    outputLabel: "a \u00f7 b",
    editTarget: "result",
    compareMode: "single-double",
    reference: ([a, b]) => [a / b],
    tests: [
      { inputs: [5, 2], expected: [2.5] },
      { inputs: [7.5, 3], expected: [2.5] },
      { inputs: [1, 4], expected: [0.25] },
      { inputs: [10, 5], expected: [2] },
      { inputs: [12.5, 2.5], expected: [5] },
    ],
    hints: ["Which operator represents division?", "Put `a` before the operator and `b` after it."],
    failureHint: "Check the order of the division.",
    reward: BOSS_REWARD,
  },
  {
    id: 6,
    sector: 2,
    category: "OPERATORS",
    title: "Remainder",
    description: "Divide `a` by `b` and store what remains.",
    starterCode: `double a = ?; // random number
double b = ?; // random number

double result = 0; // Use %
Console.WriteLine(result);`,
    inputsLabel: "a, b",
    outputLabel: "the remainder",
    editTarget: "result",
    compareMode: "single-double",
    reference: ([a, b]) => [a % b],
    tests: [
      { inputs: [10, 3], expected: [1] },
      { inputs: [17, 5], expected: [2] },
      { inputs: [8.5, 2], expected: [0.5] },
      { inputs: [12, 4], expected: [0] },
      { inputs: [10.75, 2.5], expected: [0.75] },
    ],
    hints: ["The `%` operator returns the remainder after division.", "Use `a` and `b` around the `%`."],
    failureHint: "The remainder comes from the `%` operator.",
    reward: BOSS_REWARD,
  },
  {
    id: 7,
    sector: 3,
    category: "FORMULAS",
    title: "Celsius to Fahrenheit",
    description:
      "Convert a Celsius temperature to Fahrenheit.\nThe rule is: multiply by `9`, divide by `5`, then add `32`.",
    starterCode: `double celsius = ?; // random number

double fahrenheit = 0; // Complete the formula
Console.WriteLine(fahrenheit);`,
    inputsLabel: "celsius",
    outputLabel: "the Fahrenheit value",
    editTarget: "fahrenheit",
    compareMode: "single-double",
    reference: ([celsius]) => [(celsius * 9) / 5 + 32],
    tests: [
      { inputs: [0], expected: [32] },
      { inputs: [100], expected: [212] },
      { inputs: [20], expected: [68] },
      { inputs: [-40], expected: [-40] },
      { inputs: [37.5], expected: [99.5] },
    ],
    hints: [
      "Build the calculation in the same sequence as the description.",
      "Start with `celsius * 9`.",
      "Finish with `/ 5 + 32`.",
    ],
    failureHint: "Multiply first, divide next, add `32` last.",
    reward: BOSS_REWARD,
  },
  {
    id: 8,
    sector: 3,
    category: "FORMULAS",
    title: "Fuel Efficiency",
    description: "Calculate the distance traveled for each unit of fuel.",
    starterCode: `double distance = ?; // random number
double fuel = ?; // random number

double result = 0; // Change this
Console.WriteLine(result);`,
    inputsLabel: "distance, fuel",
    outputLabel: "distance per fuel",
    editTarget: "result",
    compareMode: "single-double",
    reference: ([distance, fuel]) => [distance / fuel],
    tests: [
      { inputs: [100, 10], expected: [10] },
      { inputs: [250, 20], expected: [12.5] },
      { inputs: [147.5, 10], expected: [14.75] },
      { inputs: [80, 6.4], expected: [12.5] },
      { inputs: [360, 24], expected: [15] },
    ],
    hints: ["You want distance PER unit of fuel.", "Think division: `distance` first, `fuel` second."],
    failureHint: "Divide `distance` by `fuel`.",
    reward: BOSS_REWARD,
  },
  {
    id: 9,
    sector: 3,
    category: "MULTI-STEP",
    title: "Taxi Fare",
    description: "Start with the base fare.\nThen add the distance multiplied by the rate.",
    starterCode: `double baseFare = ?; // random number
double distance = ?; // random number
double rate = ?; // random number

double fare = 0; // Complete the formula
Console.WriteLine(fare);`,
    inputsLabel: "baseFare, distance, rate",
    outputLabel: "the total fare",
    editTarget: "fare",
    compareMode: "single-double",
    reference: ([baseFare, distance, rate]) => [baseFare + distance * rate],
    tests: [
      { inputs: [5, 10, 2], expected: [25] },
      { inputs: [4.5, 3, 1.5], expected: [9] },
      { inputs: [10, 8.5, 2], expected: [27] },
      { inputs: [6, 12.5, 2.4], expected: [36] },
    ],
    hints: [
      "Find the distance cost first.",
      "Distance cost is `distance * rate`. Then add the base fare.",
    ],
    failureHint: "Multiply the distance by the rate before adding the base fare.",
    reward: BOSS_REWARD,
  },
  {
    id: 10,
    sector: 4,
    category: "AVERAGES",
    title: "Three Scores",
    description: "Calculate the average of three scores.\nParentheses decide what happens first.",
    starterCode: `double a = ?; // random number
double b = ?; // random number
double c = ?; // random number

double average = 0; // Change this
Console.WriteLine(average);`,
    inputsLabel: "a, b, c",
    outputLabel: "the average",
    editTarget: "average",
    compareMode: "single-double",
    reference: ([a, b, c]) => [(a + b + c) / 3],
    tests: [
      { inputs: [8, 7, 9], expected: [8] },
      { inputs: [7.5, 8, 9.5], expected: [(7.5 + 8 + 9.5) / 3] },
      { inputs: [10, 10, 5], expected: [25 / 3] },
      { inputs: [6.5, 7.5, 8.5], expected: [7.5] },
    ],
    hints: ["An average needs two steps.", "Add all three values first. Then divide the total by `3`."],
    failureHint: "Add the three scores together before dividing by `3`.",
    reward: BOSS_REWARD,
  },
  {
    id: 11,
    sector: 4,
    category: "MULTI-OUTPUT",
    title: "Time Split",
    description:
      "Convert a number of seconds in three steps:\n1. split `seconds` into minutes\n2. split those minutes into hours\n3. split those hours into days",
    starterCode: `double seconds = ?; // random number

double minutes = 0; // Change this
double hours = 0;   // Change this
double days = 0;    // Change this

Console.WriteLine(minutes);
Console.WriteLine(hours);
Console.WriteLine(days);`,
    inputsLabel: "seconds",
    outputLabel: "minutes, hours, days",
    editTarget: "minutes, hours, days",
    compareMode: "multi-double",
    reference: ([seconds]) => {
      const minutes = seconds / 60;
      const hours = minutes / 60;
      const days = hours / 24;
      return [minutes, hours, days];
    },
    tests: [
      { inputs: [86400], expected: [1440, 24, 1] },
      { inputs: [43200], expected: [720, 12, 0.5] },
      { inputs: [3600], expected: [60, 1, 1 / 24] },
      { inputs: [7200], expected: [120, 2, 1 / 12] },
      { inputs: [172800], expected: [2880, 48, 2] },
      { inputs: [5400], expected: [90, 1.5, 0.0625] },
    ],
    hints: [
      "Each line divides by the same value the previous line used.",
      "Minutes come from `seconds / 60`, and the next line reuses `minutes`.",
      "Days come from `hours / 24`.",
    ],
    failureHint: "Build each value from the previous one: seconds \u2192 minutes \u2192 hours \u2192 days.",
    reward: BOSS_REWARD,
  },
  {
    id: 12,
    sector: 4,
    category: "PERCENTAGES",
    title: "Weighted Score",
    description: "Calculate a final score using `40%` of `a` and `60%` of `b`.",
    starterCode: `double a = ?; // random number
double b = ?; // random number

double score = 0; // Complete the formula
Console.WriteLine(score);`,
    inputsLabel: "a, b",
    outputLabel: "the combined score",
    editTarget: "score",
    compareMode: "single-double",
    reference: ([a, b]) => [a * 0.4 + b * 0.6],
    tests: [
      { inputs: [10, 10], expected: [10] },
      { inputs: [5, 10], expected: [8] },
      { inputs: [7.5, 9], expected: [8.4] },
      { inputs: [6, 8], expected: [7.2] },
      { inputs: [9.25, 7.75], expected: [8.35] },
    ],
    hints: [
      "40% can be written as `0.4`.",
      "Calculate one part from `a`, another from `b`, then combine them.",
    ],
    failureHint: "Convert each percentage to a decimal before multiplying.",
    reward: BOSS_REWARD,
  },
  {
    id: 13,
    sector: 5,
    category: "FINAL SECTOR",
    title: "Square It",
    description: "Calculate the square of `number`.\nMultiply the value by itself.",
    starterCode: singleNumberStarter,
    inputsLabel: "number",
    outputLabel: "number squared",
    editTarget: "result",
    compareMode: "single-double",
    reference: ([number]) => [number * number],
    tests: [
      { inputs: [4], expected: [16] },
      { inputs: [2.5], expected: [6.25] },
      { inputs: [-3], expected: [9] },
      { inputs: [10], expected: [100] },
      { inputs: [0.5], expected: [0.25] },
    ],
    hints: ["A square means multiplying a value by itself.", "Use `number * number`."],
    failureHint: "Multiply `number` by itself.",
    reward: BOSS_REWARD,
  },
  {
    id: 14,
    sector: 5,
    category: "FINAL SECTOR",
    title: "Discount",
    description: "Calculate the final price after applying a percentage discount.",
    starterCode: `double price = ?; // random number
double discount = ?; // random number

double finalPrice = 0; // Complete the formula
Console.WriteLine(finalPrice);`,
    inputsLabel: "price, discount",
    outputLabel: "the final price",
    editTarget: "finalPrice",
    compareMode: "single-double",
    reference: ([price, discount]) => [price - (price * discount) / 100],
    tests: [
      { inputs: [100, 10], expected: [90] },
      { inputs: [80, 25], expected: [60] },
      { inputs: [49.9, 20], expected: [39.92] },
      { inputs: [150, 12.5], expected: [131.25] },
      { inputs: [25, 0], expected: [25] },
      { inputs: [200, 50], expected: [100] },
    ],
    hints: [
      "First determine how much money is being removed.",
      "Find `price * discount / 100`. Then subtract it from the original price.",
    ],
    failureHint: "Subtract the discount amount from the original price.",
    reward: BOSS_REWARD,
  },
  {
    id: 15,
    sector: 5,
    category: "FINAL BOSS // PYTHAGOREAN THEOREM",
    title: "The Hypotenuse",
    description:
      "A right triangle has two known sides: `a` and `b`.\nThe Pythagorean theorem says `a² + b² = c²`.\nTurn that equation into code and find `c`.",
    starterCode: `double a = ?; // random number
double b = ?; // random number

double c = 0; // Complete the formula
Console.WriteLine(c);`,
    inputsLabel: "a, b",
    outputLabel: "the hypotenuse",
    editTarget: "c",
    compareMode: "single-double",
    reference: ([a, b]) => [Math.sqrt(a * a + b * b)],
    tests: [
      { inputs: [3, 4], expected: [5] },
      { inputs: [5, 12], expected: [13] },
      { inputs: [8, 15], expected: [17] },
      { inputs: [7, 24], expected: [25] },
      { inputs: [2, 3], expected: [Math.sqrt(13)] },
      { inputs: [10, 10], expected: [Math.sqrt(200)] },
      { inputs: [6.5, 4], expected: [Math.sqrt(6.5 * 6.5 + 4 * 4)] },
      { inputs: [1.5, 2], expected: [2.5] },
      { inputs: [3.6, 4.8], expected: [Math.sqrt(3.6 * 3.6 + 4.8 * 4.8)] },
    ],
    hints: [
      "Remember Boss 13. How did you square a number?",
      "You need both `a * a` and `b * b` before finding the hypotenuse.",
      "`Math.Sqrt(value)` returns a square root.",
    ],
    failureHint: "Square both sides, add them, then take the square root.",
    reward: BOSS_REWARD,
    helper: {
      name: "Math.Sqrt(value)",
      text: "Returns the square root of a number.",
      example: "Math.Sqrt(25) produces 5",
    },
    steps: ["SQUARE BOTH SIDES", "ADD THEM", "FIND THE SQUARE ROOT"],
    visualizer: "pythagorean",
  },
];

export function bossById(id: number): BossDefinition | undefined {
  return finalBosses.find((boss) => boss.id === id);
}

export function sectorForBoss(id: number): BossSector | undefined {
  return BOSS_SECTORS.find((sector) => sector.bossIds.includes(id));
}
