import type { Challenge } from "../types";

const lines = (value: string) =>
  value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const challenges: Challenge[] = [
  {
    id: 1,
    eyebrow: "FIRST SIGNAL",
    title: "Write a line",
    prompt: "Use WriteLine to print Hello!",
    starterCode: () => 'Console.WriteLine("Hello!");',
    hints: [
      "Text belongs between quotation marks.",
      "Write the text inside Console.WriteLine( ).",
      'Try: Console.WriteLine("Hello!");',
    ],
    isComplete: (output, _name, code) => lines(output).includes("Hello!") && /Console\s*\.\s*WriteLine\s*\(/.test(code),
  },
  {
    id: 2,
    eyebrow: "SAME SIGNAL",
    title: "Keep writing",
    prompt: "Use Write twice to print Hello World! on one line.",
    starterCode: () => 'Console.Write("Hello ");\nConsole.WriteLine("World?");',
    hints: [
      "Console.Write does not move to a new line.",
      "Use two separate Console.Write statements.",
      'Try writing "Hello " first, including the space.',
    ],
    isComplete: (output, _name, code) => output.trim() === "Hello World!" && (code.match(/Console\s*\.\s*Write\s*\(/g)?.length ?? 0) >= 2,
  },
  {
    id: 3,
    eyebrow: "TEXT MEMORY",
    title: "String variable",
    prompt: "Store your name in a string, then print the variable.",
    starterCode: () => 'string student = "SHARPIE";\nConsole.WriteLine(student);',
    hints: [
      "A string variable stores text under a name.",
      "Declare it first, then pass the variable to WriteLine.",
      'Pattern: string student = "Alex";',
    ],
    isComplete: (output, name, code) =>
      lines(output).some((line) => line.toLowerCase() === name.toLowerCase()) &&
      /\bstring\s+[A-Za-z_]\w*\s*=/.test(code) &&
      /WriteLine\s*\(\s*[A-Za-z_]\w*\s*\)/.test(code),
  },
  {
    id: 4,
    eyebrow: "NUMBER MEMORY",
    title: "Integer variable",
    prompt: "Store the number 8 in an int, then print it.",
    starterCode: () => "int level = 1;\nConsole.WriteLine(level);",
    hints: [
      "The int type stores whole numbers.",
      "Numbers do not need quotation marks.",
      "Pattern: int level = 8;",
    ],
    isComplete: (output, _name, code) =>
      lines(output).includes("8") &&
      /\bint\s+[A-Za-z_]\w*\s*=\s*-?\d+/.test(code) &&
      /WriteLine\s*\(\s*[A-Za-z_]\w*\s*\)/.test(code),
  },
  {
    id: 5,
    eyebrow: "MATH SIGNAL",
    title: "Use an operator",
    prompt: "Use a math operator to calculate and print 42.",
    starterCode: () => "int answer = 6 + 7;\nConsole.WriteLine(answer);",
    hints: [
      "Operators include +, -, *, /, and %.",
      "Six multiplied by seven makes the target.",
      "Use * between 6 and 7.",
    ],
    isComplete: (output, _name, code) => lines(output).includes("42") && /\d\s*[+\-*/%]\s*\d/.test(code),
  },
  {
    id: 6,
    eyebrow: "JOIN SIGNALS",
    title: "Concatenation",
    prompt: "Join text and a variable with +, then print the result.",
    starterCode: () => 'string language = "C#";\nConsole.WriteLine("I am learning ");',
    hints: [
      "The + operator can join pieces of text.",
      "Put + between the quoted text and the variable.",
      'Pattern: "Hello " + name',
    ],
    isComplete: (output, _name, code) =>
      output.trim().length > 0 &&
      /WriteLine\s*\([\s\S]*["'][\s\S]*\+[\s\S]*[A-Za-z_]\w*[\s\S]*\)/.test(code),
  },
  {
    id: 7,
    eyebrow: "SMART SIGNAL",
    title: "Interpolation",
    prompt: "Use $ and { } to place a variable inside a string.",
    starterCode: (name) => `string student = "${name}";\nint score = 100;\nConsole.WriteLine("Score ready!");`,
    hints: [
      "Start the string with $ before the opening quote.",
      "Place variable names inside curly braces.",
      'Pattern: $"Hello {name}!"',
    ],
    isComplete: (output, _name, code) => output.trim().length > 0 && /\$"[^"\n]*\{\s*[A-Za-z_]\w*[^}]*\}/.test(code),
  },
  {
    id: 8,
    eyebrow: "FULL TRANSMISSION",
    title: "Build a receipt",
    prompt: "Use variables, multiplication, and interpolation to print Total: 12.",
    starterCode: () => 'string item = "Marker";\nint price = 4;\nint quantity = 3;\nint total = 0;\nConsole.WriteLine("Total pending");',
    hints: [
      "Store words in string variables and whole numbers in int variables.",
      "Multiply price by quantity and store the result in total.",
      'Finish with: Console.WriteLine($"{item} Total: {total}");',
    ],
    isComplete: (output, _name, code) =>
      /Total:\s*12/i.test(output) &&
      /\bstring\s+/.test(code) &&
      (code.match(/\bint\s+/g)?.length ?? 0) >= 3 &&
      /[A-Za-z_]\w*\s*\*\s*[A-Za-z_]\w*/.test(code) &&
      /\$"/.test(code),
  },
];

export function getRunNote(output: string, writeCount: number, completed: boolean) {
  if (!output.trim()) return "Quiet program. Console.Write can keep building the same line.";
  if (writeCount >= 12) return "That's a lot of talking.";
  if (completed) return "Signal matched. Activity complete.";
  return "C# answered. Check the activity target.";
}
