import { stopBoardLimits } from "../lib/stopBoard";
import type { StopBoard } from "../lib/stopBoard";

const cleanValue = (value: string) => value.replace(/["\\\r\n]/g, "").trim() || "Ada";

export function stopStarter(name: string) {
  return [
    "// STOP RULES",
    "// 1. A string variable stores text.",
    "// 2. The + sign joins text together.",
    `string answer1 = "${cleanValue(name)}";`,
    'Console.WriteLine("Name: " + answer1);',
  ].join("\n");
}

export function getStopNote(board: StopBoard) {
  if (board.columns.length === 0) return "Create a string variable and print it with a label to open your sheet.";
  if (board.columns.length >= stopBoardLimits.maxColumns) return "STOP! Sheet complete.";
  return "Sheet updated. Add another category to grow the board.";
}
