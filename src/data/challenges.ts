import type { Challenge } from "../types";

const lines = (value: string) =>
  value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const countWriteLines = (code: string) => code.match(/Console\s*\.\s*WriteLine\s*\(/g)?.length ?? 0;

export const challenges: Challenge[] = [
  {
    id: 1,
    eyebrow: "EDIT THE MESSAGE",
    title: "Morning signal",
    prompt: 'Change the existing line so the output says exactly: Bom dia, chat!',
    starterCode: () => '// Change the message to "Bom dia, chat!"\nConsole.WriteLine("Hello!");',
    hints: [
      "Keep the instruction name and change only the text between the quotes.",
      "Capital letters, punctuation, and spaces must match the target.",
      "The target ends with an exclamation mark.",
    ],
    isComplete: (output, _name, code) => lines(output).includes("Bom dia, chat!") && countWriteLines(code) >= 1,
  },
  {
    id: 2,
    eyebrow: "ADD A LINE",
    title: "Introduce yourself",
    prompt: "Keep the greeting, then add a second output line containing your name.",
    starterCode: () => '// Add a second WriteLine that prints your name.\nConsole.WriteLine("Bom dia, chat!");',
    hints: [
      "Do not replace the greeting—create another statement below it.",
      "Each WriteLine statement produces its own output line.",
      "Put your name between quotation marks in the new statement.",
    ],
    isComplete: (output, name, code) =>
      countWriteLines(code) >= 2 &&
      lines(output).includes("Bom dia, chat!") &&
      lines(output).some((line) => line.toLowerCase().includes(name.toLowerCase())),
  },
  {
    id: 3,
    eyebrow: "STACK THE SIGNAL",
    title: "Initials banner",
    prompt: "Build a banner at least 3 lines tall using your initials, letters, or numbers.",
    starterCode: () => '// Stack your initials, letters, or numbers into a 3-line banner.\nConsole.WriteLine("?");',
    hints: [
      "Think of every WriteLine as one row of the banner.",
      "Add at least two more WriteLine statements.",
      "Repeat characters to make the rows look bold from a distance.",
    ],
    isComplete: (output, _name, code) => {
      const banner = lines(output);
      return countWriteLines(code) >= 3 && banner.length >= 3 && banner.every((line) => /[A-Za-z0-9]/.test(line));
    },
  },
  {
    id: 4,
    eyebrow: "CONTROL THE SPACE",
    title: "Leave a gap",
    prompt: "Print TOP and BOTTOM with one completely empty output line between them.",
    starterCode: () => '// Add one empty output line between TOP and BOTTOM.\nConsole.WriteLine("TOP");\nConsole.WriteLine("BOTTOM");',
    hints: [
      "An empty line still needs its own WriteLine statement.",
      "Try calling WriteLine without any text inside the parentheses.",
      "Place that new statement between the other two.",
    ],
    isComplete: (output, _name, code) =>
      /TOP\n\s*\nBOTTOM/.test(output.replace(/\r/g, "")) &&
      /Console\s*\.\s*WriteLine\s*\(\s*\)\s*;/.test(code),
  },
  {
    id: 5,
    eyebrow: "DRAW WITH TEXT",
    title: "Hash box",
    prompt: "Draw a closed box made from # characters using at least 3 output lines.",
    starterCode: () => '// Draw a closed box made from # characters, at least 3 lines tall.\nConsole.WriteLine("#####");',
    hints: [
      "The top and bottom borders should match.",
      "Add a middle row with a # at both ends.",
      "Use spaces between the two sides of the middle row.",
    ],
    isComplete: (output, _name, code) => {
      const box = lines(output);
      return countWriteLines(code) >= 3 && box.length >= 3 && box[0] === box[box.length - 1] && /^#{3,}$/.test(box[0]) && box.slice(1, -1).every((line) => /^#.*#$/.test(line));
    },
  },
  {
    id: 6,
    eyebrow: "TELL A STORY",
    title: "Three-line story",
    prompt: "Print START, one sentence of your own, and END on 3 separate lines.",
    starterCode: () => '// Write a 3-line story: START, one sentence, then END.\nConsole.WriteLine("START");',
    hints: [
      "Your first line is ready; add two more statements.",
      "The middle line can be any sentence, but it cannot be empty.",
      "Finish with the exact word END in capital letters.",
    ],
    isComplete: (output, _name, code) => {
      const story = lines(output);
      return countWriteLines(code) >= 3 && story.length >= 3 && story[0] === "START" && story[story.length - 1] === "END" && story.slice(1, -1).some((line) => line !== "START" && line !== "END");
    },
  },
  {
    id: 7,
    eyebrow: "COUNT IT DOWN",
    title: "Launch sequence",
    prompt: "Print 3, 2, 1, and GO! in that order, each on its own line.",
    starterCode: () => '// Complete the countdown: 3, 2, 1, then GO!\nConsole.WriteLine("3");',
    hints: [
      "You need four output lines in total.",
      "Continue the countdown one line at a time.",
      "The final line is a word followed by an exclamation mark.",
    ],
    isComplete: (output, _name, code) =>
      countWriteLines(code) >= 4 && JSON.stringify(lines(output)) === JSON.stringify(["3", "2", "1", "GO!"]),
  },
  {
    id: 8,
    eyebrow: "FINAL TRANSMISSION",
    title: "Student ID card",
    prompt: "Build a 4-line card with matching borders, your name, and the word SHARPIE.",
    starterCode: () => '// Build a 4-line ID card with matching top and bottom borders.\n// Include your name and the word SHARPIE.\nConsole.WriteLine("================");',
    hints: [
      "Use the first line as the top border and repeat it at the bottom.",
      "Put your name and SHARPIE on the two lines between the borders.",
      "Your finished output should have at least four visible lines.",
    ],
    isComplete: (output, name, code) => {
      const card = lines(output);
      return countWriteLines(code) >= 4 && card.length >= 4 && card[0] === card[card.length - 1] && card.some((line) => line.toLowerCase().includes(name.toLowerCase())) && card.some((line) => line.toUpperCase().includes("SHARPIE"));
    },
  },
];

export function getRunNote(output: string, writeLineCount: number, completed: boolean) {
  if (!output.trim()) return "Quiet program. WriteLine is waiting for a message.";
  if (writeLineCount >= 12) return "That's a lot of talking.";
  if (completed) return "Signal matched. Activity complete.";
  return "Output received. Compare it with the task below.";
}
