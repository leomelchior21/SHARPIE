import { stopBoardLimits } from "../lib/stopBoard";
import type { StopBoard } from "../lib/stopBoard";

const cleanValue = (value: string) => value.replace(/["\\\r\n]/g, "").trim() || "Ada";

const TRAILING_BLANK_LINES = 11;

export function stopStarter(name: string) {
  return [
    "// STOP RULES",
    "// 1. A string variable stores text.",
    `string answer1 = "${cleanValue(name)}";`,
    "",
    '// 2. Use the "+" sign to add the text and variable.',
    'Console.WriteLine("Name: " + answer1);',
    ...Array.from({ length: TRAILING_BLANK_LINES }, () => ""),
  ].join("\n");
}

export function getStopNote(board: StopBoard) {
  if (board.columns.length === 0) return "Create a string variable and print it with a label to open your sheet.";
  if (board.columns.length >= stopBoardLimits.maxColumns) return "STOP! Sheet complete.";
  return "Sheet updated. Add another category to grow the board.";
}
