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
    isComplete: (output, _name, code) => lines(output).some((line) => line.toLowerCase() === "bom dia, chat!") && countWriteLines(code) >= 1,
  },
  {
    id: 2,
    eyebrow: "ADD A LINE",
    title: "Introduce yourself",
    prompt: "Keep the greeting, then add a second output line containing your name.",
    starterCode: () => '// Add a second WriteLine that prints your name.\nConsole.WriteLine("Bom dia,");',
    hints: [
      "Do not replace the greeting—create another statement below it.",
      "Each WriteLine statement produces its own output line.",
      "Put your name between quotation marks in the new statement.",
    ],
    isComplete: (output, name, code) =>
      countWriteLines(code) >= 2 &&
      lines(output).includes("Bom dia,") &&
      lines(output).some((line) => line.toLowerCase().includes(name.toLowerCase())),
  },
  {
    id: 3,
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
    id: 4,
    eyebrow: "DRAW WITH TEXT",
    title: "Make a frame",
    prompt: "Draw a closed frame made from # characters using at least 3 output lines.",
    starterCode: () => '// Draw a closed frame made from # characters, at least 3 lines tall.\nConsole.WriteLine("#####");',
    hints: [
      "The top and bottom borders should match.",
      "Add a middle row with a # at both ends.",
      "Use spaces between the two sides of the middle row.",
    ],
    isComplete: (output, _name, code) => {
      const frame = lines(output);
      return countWriteLines(code) >= 3 && frame.length >= 3 && frame[0] === frame[frame.length - 1] && /^#{3,}$/.test(frame[0]) && frame.slice(1, -1).every((line) => /^#.*#$/.test(line));
    },
  },
  {
    id: 5,
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
];

export function getRunNote(output: string, writeLineCount: number, completed: boolean) {
  if (!output.trim()) return "Quiet program. WriteLine is waiting for a message.";
  if (writeLineCount >= 12) return "That's a lot of talking.";
  if (completed) return "Signal matched. Activity complete.";
  return "Output received. Compare it with the task below.";
}
