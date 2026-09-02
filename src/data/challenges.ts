import type { Challenge } from "../types";

const lines = (value: string) =>
  value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const sample = () => 'Console.WriteLine("SHARPIE");';

export const challenges: Challenge[] = [
  {
    id: 1,
    eyebrow: "FIRST SIGNAL",
    title: "Say something",
    prompt: "Make C# print Hello!",
    starterCode: () => 'Console.WriteLine("Hello!");',
    hints: [
      "Text belongs between quotation marks.",
      "Write the text inside Console.WriteLine( ).",
      'Try: Console.WriteLine("Hello!");',
    ],
    isComplete: (output) => lines(output).includes("Hello!"),
  },
  {
    id: 2,
    eyebrow: "PERSONAL SIGNAL",
    title: "Your name",
    prompt: "Print your name.",
    starterCode: sample,
    hints: [
      "Replace the word inside the quotation marks.",
      "Keep the opening and closing quotation marks.",
      'Example: Console.WriteLine("Alex");',
    ],
    isComplete: (output, name) =>
      lines(output).some((line) => line.toLowerCase() === name.toLowerCase()),
  },
  {
    id: 3,
    eyebrow: "NUMBER SIGNAL",
    title: "Favorite number",
    prompt: "Print your favorite number.",
    starterCode: sample,
    hints: [
      "Numbers can work without quotation marks.",
      "Put a number inside the parentheses.",
      "Example: Console.WriteLine(42);",
    ],
    isComplete: (output) => lines(output).some((line) => /^-?\d+(\.\d+)?$/.test(line)),
  },
  {
    id: 4,
    eyebrow: "CLASSIFIED",
    title: "The meme",
    prompt: "Make the console say 67.",
    starterCode: sample,
    hints: [
      "This one is a number.",
      "No quotation marks needed.",
      "Put 67 inside Console.WriteLine( ).",
    ],
    isComplete: (output) => lines(output).includes("67"),
  },
  {
    id: 5,
    eyebrow: "DOUBLE SIGNAL",
    title: "Two lines",
    prompt: "Show Hello and World on separate lines.",
    starterCode: () => 'Console.WriteLine("First line");',
    hints: [
      "One WriteLine makes one line.",
      "Use two Console.WriteLine statements.",
      'First line: Console.WriteLine("Hello");',
    ],
    isComplete: (output) => {
      const outputLines = lines(output);
      return outputLines.includes("Hello") && outputLines.includes("World");
    },
  },
  {
    id: 6,
    eyebrow: "SHAPE THE SIGNAL",
    title: "Initials",
    prompt: "Build your initials with lines of text.",
    starterCode: () => 'Console.WriteLine("L");\nConsole.WriteLine("L");',
    hints: [
      "One WriteLine makes one row of your letter.",
      "Repeat WriteLine to draw downward.",
      'Try adding: Console.WriteLine("LLLLL");',
    ],
    isComplete: (output) => lines(output).length >= 3,
  },
  {
    id: 7,
    eyebrow: "BROADCAST",
    title: "Mini banner",
    prompt: "Frame SHARPIE with stars.",
    starterCode: () => 'Console.WriteLine("***********");\nConsole.WriteLine("* SHARPIE *");',
    hints: [
      "A banner needs a top, middle, and bottom.",
      "Use the same star line twice.",
      'Add: Console.WriteLine("***********");',
    ],
    isComplete: (output) => output.includes("SHARPIE") && (output.match(/\*/g)?.length ?? 0) >= 8,
  },
  {
    id: 8,
    eyebrow: "OPEN CHANNEL",
    title: "Make it yours",
    prompt: "Make the console say something that is yours.",
    starterCode: sample,
    hints: [
      "There is no single right answer.",
      "Change the text. Add another line. Make a shape.",
      "If the console shows your idea, it works.",
    ],
    isComplete: (output) => lines(output).length > 0,
  },
];

export function getRunNote(output: string, writeLineCount: number, completed: boolean) {
  if (lines(output).includes("67")) return "Obviously.";
  if (writeLineCount >= 20) return "That's a lot of talking.";
  if (!output.trim()) return "Quiet program.";
  if (completed) return "Signal received.";
  return "C# answered.";
}
