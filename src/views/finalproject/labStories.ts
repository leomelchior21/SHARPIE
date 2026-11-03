import type { Input, Question } from "./content";
import { conditionResult } from "./logic";

const comparison = /^(\w+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/;

// "grade >= 7" with grade = 6.75 reads "6.75 >= 7".
export function substitute(condition: string, variable: string, value: Input): string {
  const match = comparison.exec(condition);
  if (!match) return condition === variable ? String(value) : condition;
  return `${match[1] === variable ? String(value) : match[1]} ${match[2]} ${match[3]}`;
}

export type LineState = "run" | "skip" | "plain";

export interface CodeTrace {
  lines: LineState[];
  condition?: { code: string; result: boolean };
}

const declaration = /^(int|double|bool)\s+(\w+)\s*=\s*(.+);$/;

// Which lines of an if/else program run for its declared value.
export function traceProgram(code: string): CodeTrace {
  const lines = code.split("\n");
  const states: LineState[] = lines.map(() => "plain");
  let variable = "";
  let value: Input | null = null;
  lines.forEach((line, index) => {
    const match = declaration.exec(line.trim());
    if (match) {
      variable = match[2];
      value = match[3] === "true" ? true : match[3] === "false" ? false : Number(match[3]);
      states[index] = "run";
    }
  });
  const ifIndex = lines.findIndex((line) => line.trim().startsWith("if ("));
  if (ifIndex >= 0 && value !== null) {
    const condition = lines[ifIndex].trim().slice(4, -1);
    let result: boolean;
    try { result = conditionResult(condition, variable, value); } catch { return { lines: states }; }
    states[ifIndex] = "run";
    const blockEnd = (start: number) => { let end = start; while (end < lines.length && lines[end].trim() !== "}") end += 1; return end; };
    const ifEnd = blockEnd(ifIndex + 1);
    for (let index = ifIndex + 1; index <= ifEnd; index += 1) states[index] = result ? "run" : "skip";
    if (lines[ifEnd + 1]?.trim() === "else") {
      const elseEnd = blockEnd(ifEnd + 2);
      for (let index = ifEnd + 1; index <= elseEnd; index += 1) states[index] = result ? "skip" : "run";
    }
    return { lines: states, condition: { code: substitute(condition, variable, value), result } };
  }
  // Console.WriteLine(x < 5): the comparison itself is the output.
  const printed = lines.findIndex((line) => /Console\.WriteLine\(\w+\s*(>=|<=|==|!=|>|<)\s*\w+\)/.test(line));
  if (printed >= 0 && value !== null) {
    const inner = lines[printed].trim().slice("Console.WriteLine(".length, -2);
    try {
      const result = conditionResult(inner, variable, value);
      states[printed] = "run";
      return { lines: states, condition: { code: substitute(inner, variable, value), result } };
    } catch { return { lines: states }; }
  }
  return { lines: states };
}

export const questionTrace = (question: Question) => traceProgram(question.code);
