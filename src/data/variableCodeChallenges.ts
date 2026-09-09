import type { RunResult } from "../types";

export type VariableCodeChallenge = {
  title: string;
  instruction: string;
  editorHint: string;
  success: string;
  starter: string;
  baseXp?: number;
  validate: (code: string, output: string) => boolean;
};

export type VariableBuildChallenge = {
  title: string;
  instruction: string;
  editorHint: string;
  blocks: string[];
  expected: string[];
};

const executableCode = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const writesVariable = (code: string, variable: string, method = "WriteLine") => new RegExp(`Console\\s*\\.\\s*${method}\\s*\\([^;]*\\b${variable}\\b[^;]*\\)\\s*;`).test(executableCode(code));
const declares = (code: string, type: "string" | "int" | "double", variable: string, value: string) => new RegExp(`\\b${type}\\s+${variable}\\s*=\\s*${value}\\s*;`).test(executableCode(code));

function normalizeOutput(output: string) {
  return output
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*/g, ": ")
    .toLocaleLowerCase();
}

const outputMatches = (output: string, expected: string) => normalizeOutput(output) === normalizeOutput(expected);

export const variableRunPracticeChallenges: VariableCodeChallenge[] = [
  {
    title: "Create a string variable",
    instruction: "Create a string named favoriteColor, then run the code.",
    editorHint: "CREATE ONE STRING",
    success: "String variable created.",
    starter: `// Create a string variable named favoriteColor.

Console.WriteLine(favoriteColor);`,
    validate: (code: string) => /\bstring\s+favoriteColor\s*=\s*"(?:\\.|[^"\\])*"\s*;/.test(code),
  },
  {
    title: "Create an int variable",
    instruction: "Create an int named favoriteNumber, then run the code.",
    editorHint: "CREATE ONE INT",
    success: "Int variable created.",
    starter: `// Create an int variable named favoriteNumber.

Console.WriteLine(favoriteNumber);`,
    validate: (code: string) => /\bint\s+favoriteNumber\s*=\s*-?\d+\s*;/.test(code),
  },
  {
    title: "Create two variables",
    instruction: "Create a string named name and an int named age so the message can run.",
    editorHint: "CREATE A STRING + INT",
    success: "String and int variables created.",
    starter: `// Create a string named name and an int named age.

Console.WriteLine("Hello, my name is: " + name + " and my age is: " + age);`,
    validate: (code: string) => /\bstring\s+name\s*=\s*"(?:\\.|[^"\\])*"\s*;/.test(code) && /\bint\s+age\s*=\s*-?\d+\s*;/.test(code),
  },
];

export const variableSprintChallenges: VariableCodeChallenge[] = [
  {
    title: "Name the hero",
    instruction: "Create a string variable named heroName with the value Nova. Use Console.WriteLine to print the label Hero: followed by heroName.",
    editorHint: "VARIABLE + WRITELINE",
    success: "Hero signal transmitted.",
    baseXp: 40,
    starter: `// Create a string variable named heroName with the value "Nova".
// Use Console.WriteLine to print "Hero: " followed by the heroName variable.
`,
    validate: (code, output) => declares(code, "string", "heroName", '"Nova"') && writesVariable(code, "heroName") && outputMatches(output, "Hero: Nova"),
  },
  {
    title: "Count the coins",
    instruction: "Create an int variable named coins with the value 25. Use Console.WriteLine to print the label Coins: followed by coins.",
    editorHint: "VARIABLE + WRITELINE",
    success: "Coin count locked in.",
    baseXp: 40,
    starter: `// Create an int variable named coins with the value 25.
// Use Console.WriteLine to print "Coins: " followed by the coins variable.
`,
    validate: (code, output) => declares(code, "int", "coins", "25") && writesVariable(code, "coins") && outputMatches(output, "Coins: 25"),
  },
  {
    title: "Set the destination",
    instruction: "Create a string variable named destination with the value Mars. Use Console.WriteLine to print the label Next stop: followed by destination.",
    editorHint: "VARIABLE + WRITELINE",
    success: "Destination confirmed.",
    baseXp: 50,
    starter: `// Create a string variable named destination with the value "Mars".
// Use Console.WriteLine to print "Next stop: " followed by the destination variable.
`,
    validate: (code, output) => declares(code, "string", "destination", '"Mars"') && writesVariable(code, "destination") && outputMatches(output, "Next stop: Mars"),
  },
  {
    title: "Finish the laps",
    instruction: "Create an int variable named laps with the value 3. Use Console.Write to print the label Laps left: followed by laps.",
    editorHint: "VARIABLE + CONSOLE.WRITE",
    success: "Lap counter is live.",
    baseXp: 50,
    starter: `// Create an int variable named laps with the value 3.
// Use Console.Write (not WriteLine) to print "Laps left: " followed by the laps variable.
`,
    validate: (code, output) => declares(code, "int", "laps", "3") && writesVariable(code, "laps", "Write") && outputMatches(output, "Laps left: 3"),
  },
  {
    title: "Combine two memories",
    instruction: "Create string pet with Pixel and int tricks with 4. Use Console.WriteLine to print pet, the label knows, tricks, and the word tricks.",
    editorHint: "2 VARIABLES + WRITELINE",
    success: "Final combo complete.",
    baseXp: 75,
    starter: `// Create a string variable named pet with "Pixel" and an int variable named tricks with 4.
// Use Console.WriteLine to print pet + " knows " + tricks + " tricks.".
`,
    validate: (code, output) => declares(code, "string", "pet", '"Pixel"') && declares(code, "int", "tricks", "4") && writesVariable(code, "pet") && writesVariable(code, "tricks") && outputMatches(output, "Pixel knows 4 tricks."),
  },
  {
    title: "Read the temperature",
    instruction: "Create a double variable named temperature with the value 21.5. Use Console.WriteLine to print the label Temperature: followed by temperature.",
    editorHint: "DOUBLE + WRITELINE",
    success: "Temperature reading confirmed.",
    baseXp: 60,
    starter: `// Create a double variable named temperature with the value 21.5.
// Use Console.WriteLine to print "Temperature: " followed by temperature.
`,
    validate: (code, output) => declares(code, "double", "temperature", "21\\.5") && writesVariable(code, "temperature") && outputMatches(output, "Temperature: 21.5"),
  },
  {
    title: "Award the badge",
    instruction: "Create a string variable named badge with the value Gold. Use Console.WriteLine to print the label Badge: followed by badge.",
    editorHint: "STRING + WRITELINE",
    success: "Badge awarded.",
    baseXp: 60,
    starter: `// Create a string variable named badge with the value "Gold".
// Use Console.WriteLine to print "Badge: " followed by badge.
`,
    validate: (code, output) => declares(code, "string", "badge", '"Gold"') && writesVariable(code, "badge") && outputMatches(output, "Badge: Gold"),
  },
  {
    title: "Post the score",
    instruction: "Create an int variable named score with the value 120. Use Console.WriteLine to print the label Score: followed by score.",
    editorHint: "INT + WRITELINE",
    success: "Score posted.",
    baseXp: 65,
    starter: `// Create an int variable named score with the value 120.
// Use Console.WriteLine to print "Score: " followed by score.
`,
    validate: (code, output) => declares(code, "int", "score", "120") && writesVariable(code, "score") && outputMatches(output, "Score: 120"),
  },
  {
    title: "Measure the distance",
    instruction: "Create a double variable named distance with the value 7.5. Use Console.WriteLine to print the label Distance: followed by distance.",
    editorHint: "DOUBLE + WRITELINE",
    success: "Distance measured.",
    baseXp: 65,
    starter: `// Create a double variable named distance with the value 7.5.
// Use Console.WriteLine to print "Distance: " followed by distance.
`,
    validate: (code, output) => declares(code, "double", "distance", "7\\.5") && writesVariable(code, "distance") && outputMatches(output, "Distance: 7.5"),
  },
  {
    title: "Promote the pilot",
    instruction: "Create string pilot with Iris and int level with 8. Use Console.WriteLine to print pilot, the words reached level, and level.",
    editorHint: "2 VARIABLES + WRITELINE",
    success: "Pilot promotion complete.",
    baseXp: 85,
    starter: `// Create a string pilot with "Iris" and an int level with 8.
// Use Console.WriteLine to print pilot + " reached level " + level.
`,
    validate: (code, output) => declares(code, "string", "pilot", '"Iris"') && declares(code, "int", "level", "8") && writesVariable(code, "pilot") && writesVariable(code, "level") && outputMatches(output, "Iris reached level 8"),
  },
];

export const variableSprintBuildChallenges: VariableBuildChallenge[] = [
  {
    title: "Choose the hero type",
    instruction: "Nova is text. Build the declaration with the correct variable type.",
    editorHint: "STRING OR INT?",
    blocks: ["int", '"Nova"', ";", "heroName", "string", "=", "25"],
    expected: ["string", "heroName", "=", '"Nova"', ";"],
  },
  {
    title: "Repair the coin counter",
    instruction: "Coins are whole numbers. Assemble a valid int declaration.",
    editorHint: "WHOLE NUMBER TYPE",
    blocks: ["coins", '"25"', "string", "=", "int", "25", ";"],
    expected: ["int", "coins", "=", "25", ";"],
  },
  {
    title: "Build the destination",
    instruction: "Mars is text. Put the declaration blocks in executable order.",
    editorHint: "TEXT VARIABLE",
    blocks: ['"Mars"', "destination", "int", ";", "=", "string"],
    expected: ["string", "destination", "=", '"Mars"', ";"],
  },
  {
    title: "Pick the exact console command",
    instruction: "Build the statement that prints without adding a new line.",
    editorHint: "WRITE OR WRITELINE?",
    blocks: ["Console.WriteLine", "laps", ");", '"Laps left: "', "Console.Write", "(", "+"],
    expected: ["Console.Write", "(", '"Laps left: "', "+", "laps", ");"],
  },
  {
    title: "Debug the pet memory",
    instruction: "Pixel is text. Remove the type bug by building the correct declaration.",
    editorHint: "DEBUG THE TYPE",
    blocks: ["pet", "int", '"Pixel"', "=", ";", "string", "4"],
    expected: ["string", "pet", "=", '"Pixel"', ";"],
  },
  {
    title: "Choose a decimal type",
    instruction: "21.5 has a decimal point. Build it with the type that keeps the decimal.",
    editorHint: "DECIMAL VALUE",
    blocks: ["int", "temperature", "21.5", "double", ";", "=", '"21.5"'],
    expected: ["double", "temperature", "=", "21.5", ";"],
  },
  {
    title: "Store the badge",
    instruction: "Gold is a word. Build the matching variable declaration.",
    editorHint: "TEXT NEEDS QUOTES",
    blocks: ["badge", "Gold", "string", ";", '"Gold"', "=", "int"],
    expected: ["string", "badge", "=", '"Gold"', ";"],
  },
  {
    title: "Assemble the score",
    instruction: "120 is a whole number. Build a declaration without quotes.",
    editorHint: "NUMBER WITHOUT QUOTES",
    blocks: ['"120"', "score", "=", "int", ";", "120", "string"],
    expected: ["int", "score", "=", "120", ";"],
  },
  {
    title: "Preserve the distance",
    instruction: "Build a declaration that preserves the 7.5 decimal value.",
    editorHint: "DOUBLE VARIABLE",
    blocks: ["distance", "7.5", "int", "=", ";", "double", "75"],
    expected: ["double", "distance", "=", "7.5", ";"],
  },
  {
    title: "Connect both variables",
    instruction: "Assemble one WriteLine statement that uses pilot and level.",
    editorHint: "TWO VARIABLES",
    blocks: ["pilot", "+", "Console.WriteLine", "level", ");", '" reached level "', "(", '"pilot"', "+"],
    expected: ["Console.WriteLine", "(", "pilot", "+", '" reached level "', "+", "level", ");"],
  },
];

export const sandboxChallenges = [...variableRunPracticeChallenges, ...variableSprintChallenges];
export const sandboxPracticeCount = variableRunPracticeChallenges.length;
export const sandboxTimedCount = variableSprintChallenges.length;

export function isVariableCodeChallengeComplete(challenge: VariableCodeChallenge | undefined, code: string, result: RunResult | null, hasRun: boolean) {
  return Boolean(challenge && result?.success && hasRun && challenge.validate(code, result.output));
}

export function isVariableBuildChallengeComplete(challenge: VariableBuildChallenge | undefined, selected: number[]) {
  if (!challenge || selected.length !== challenge.expected.length || new Set(selected).size !== selected.length) return false;
  if (selected.some((index) => !Number.isInteger(index) || index < 0 || index >= challenge.blocks.length)) return false;
  return selected.every((blockIndex, position) => challenge.blocks[blockIndex] === challenge.expected[position]);
}

export function isSandboxChallengeComplete(challengeIndex: number, code: string, result: RunResult | null, hasRun: boolean) {
  return isVariableCodeChallengeComplete(sandboxChallenges[challengeIndex], code, result, hasRun);
}
