import type { Input } from "../content";
import { conditionResult } from "../logic";
import { substitute } from "../labStories";
import { ifLine, type Line, type YardLevel } from "./levels";

const ifPattern = /^if \((.+)\)$/;
const printPattern = /^Console\.WriteLine\(("(?:[^"\\]|\\.)*")\);$/;
const message = (line: Line | undefined) => {
  const match = printPattern.exec(line ?? "");
  return match ? JSON.parse(match[1]) as string : null;
};

/** The yard a program builds. Each slot of the program lays one part of it. */
export interface Yard {
  bay: boolean;
  condition: string | null;
  yes: string | null;
  hasElse: boolean;
  no: string | null;
  /** The first slot holding the wrong kind of line, and what is wrong with it. */
  fault: { slot: number; message: string } | null;
}

const roles: { ok: (line: Line) => boolean; message: string }[] = [
  { ok: (line) => line === "decl", message: "Line 1 must create the variable the switch tests." },
  { ok: (line) => ifPattern.test(line), message: "Line 2 must be the switch: an if ( … ) line." },
  { ok: (line) => printPattern.test(line), message: "Line 3 is the TRUE station. It must print a message." },
  { ok: (line) => line === "else", message: "Line 4 must be else: it lays the FALSE track." },
  { ok: (line) => printPattern.test(line), message: "Line 5 is the ELSE station. It must print a message." },
];

export function buildYard(lines: Line[]): Yard {
  let fault: Yard["fault"] = null;
  for (let slot = 0; slot < 5 && !fault; slot += 1) {
    const line = lines[slot] ?? "";
    // The two stations and the else track can still be under construction; the bay and the switch cannot.
    if (!line) { if (slot < 2) fault = { slot, message: slot === 0 ? "Line 1 is empty: the train has no variable to carry." : "Line 2 is empty: there is no switch to throw." }; continue; }
    if (!roles[slot].ok(line)) fault = { slot, message: roles[slot].message };
  }
  if (!fault && lines[4] && lines[3] !== "else") fault = { slot: 3, message: "Line 5 needs an else above it, or it would run for every train." };
  return {
    bay: lines[0] === "decl",
    condition: ifPattern.exec(lines[1] ?? "")?.[1] ?? null,
    yes: message(lines[2]),
    hasElse: lines[3] === "else",
    no: message(lines[4]),
    fault,
  };
}

export type Stop = "station" | "buffer" | "gap" | "jam";

export interface Route {
  side: "true" | "false" | null;
  stop: Stop;
  /** What the station prints; "" when nothing prints. */
  output: string;
  /** The condition, the condition with the value in it, then the result. */
  steps: string[];
  result: boolean | null;
  message: string;
}

const assigns = (condition: string) => /(^|[^=!<>])=([^=]|$)/.test(condition);

export function route(yard: Yard, variable: string, value: Input): Route {
  const none = { side: null, output: "", steps: [], result: null };
  if (yard.fault && yard.fault.slot < 2) return { ...none, stop: "gap", message: yard.fault.message };
  const condition = yard.condition!;
  if (assigns(condition)) return { ...none, stop: "jam", steps: [condition], message: "The switch jammed: = stores a value. To compare, use ==." };
  let result: boolean;
  try { result = conditionResult(condition, variable, value); }
  catch (error) { return { ...none, stop: "jam", steps: [condition], message: (error as Error).message }; }
  const steps = [condition, substitute(condition, variable, value), String(result)];
  if (result) {
    if (yard.fault?.slot === 2) return { side: "true", stop: "gap", output: "", steps, result, message: yard.fault.message };
    return { side: "true", stop: "station", output: yard.yes ?? "", steps, result, message: yard.yes === null ? "The TRUE station is not built yet: nothing printed." : "" };
  }
  if (yard.fault) return { side: "false", stop: "gap", output: "", steps, result, message: yard.fault.message };
  if (!yard.hasElse) return { side: "false", stop: "buffer", output: "", steps, result, message: "Dead end: there is no else track, so nothing printed." };
  return { side: "false", stop: "station", output: yard.no ?? "", steps, result, message: yard.no === null ? "The ELSE station is not built yet: nothing printed." : "" };
}

export const expected = (level: YardLevel, value: Input) => conditionResult(level.condition, level.variable, value) ? level.yes : level.no;

export const domain = (level: YardLevel): Input[] => typeof level.spotlight === "boolean"
  ? [true, false]
  : Array.from({ length: level.max - level.min + 1 }, (_, i) => level.min + i);

/** The first value the program sends to the wrong place, or null when it follows the rule everywhere. */
export function firstWrong(level: YardLevel, yard: Yard): Input | null {
  for (const value of domain(level)) {
    const where = route(yard, level.variable, value);
    if (where.stop !== "station" || where.output !== expected(level, value)) return value;
  }
  return null;
}

const declaration = (variable: string, value: Input) => `${typeof value === "boolean" ? "bool" : "int"} ${variable} = ${String(value)};`;

/** The real C# program the yard runs for one train. */
export function yardCode(variable: string, value: Input, yard: Yard): string {
  const block = (text: string | null) => `{\n${text === null ? "" : `    Console.WriteLine(${JSON.stringify(text)});\n`}}`;
  return `${declaration(variable, value)}\n\nif (${yard.condition})\n${block(yard.yes)}${yard.hasElse ? `\nelse\n${block(yard.no)}` : ""}`;
}

// The sensor dial reads and writes the if line.
const dialPattern = /^if \((\w+) (==|!=|>=|<=|>|<|=) (-?\d+)\)$/;
export function readDial(line: Line): { op: string; n: number } | null {
  const match = dialPattern.exec(line);
  return match ? { op: match[2], n: Number(match[3]) } : null;
}
export const dialLine = (variable: string, op: string, n: number) => ifLine(`${variable} ${op} ${n}`);

/** The two station messages trade places. */
export const swapStations = (lines: Line[]) => lines.map((line, slot) => slot === 2 ? lines[4] : slot === 4 ? lines[2] : line);

/** What a typed if / else builds so far, and the next thing it needs. */
export interface Written extends Yard { complete: boolean; next: string }

const tidy = (condition: string) => {
  const match = /^(\w+)\s*(==|!=|>=|<=|>|<|=)\s*(\w+)$/.exec(condition.trim());
  return match ? `${match[1]} ${match[2]} ${match[3]}` : condition.trim();
};

export function readWritten(code: string): Written {
  const source = code.replace(/\/\/.*$/gm, "");
  const result: Written = { bay: true, condition: null, yes: null, hasElse: false, no: null, fault: null, complete: false, next: "Start with the switch: if (water >= …)" };
  let rest = source;
  const take = (pattern: RegExp) => {
    const match = pattern.exec(rest);
    if (match) rest = rest.slice(match[0].length);
    return match;
  };
  const head = take(/^\s*if\s*\(([^)]*)\)/);
  if (!head) return result;
  result.condition = tidy(head[1]);
  if (!take(/^\s*\{/)) return { ...result, next: "Open the TRUE block with {" };
  const yes = take(/^\s*Console\.WriteLine\(\s*"([^"]*)"\s*\)\s*;/);
  if (yes) result.yes = yes[1];
  if (!take(/^\s*\}/)) return { ...result, next: yes ? "Close the TRUE block with }" : "Inside the block, print: Console.WriteLine(\"…\");" };
  if (!take(/^\s*else\b/)) return { ...result, next: rest.trim() ? "After the TRUE block comes else." : "Add else { … } to lay the FALSE track." };
  result.hasElse = true;
  if (!take(/^\s*\{/)) return { ...result, next: "Open the ELSE block with {" };
  const no = take(/^\s*Console\.WriteLine\(\s*"([^"]*)"\s*\)\s*;/);
  if (no) result.no = no[1];
  if (!take(/^\s*\}/)) return { ...result, next: no ? "Close the ELSE block with }" : "Inside the else block, print a message." };
  if (rest.trim()) return { ...result, next: "Nothing goes after the else block." };
  if (result.yes === null || result.no === null) return { ...result, next: "Both blocks need a Console.WriteLine." };
  return { ...result, complete: true, next: "The yard is built. Pick your tests." };
}

export const writtenCode = (variable: string, value: Input, code: string) => `${declaration(variable, value)}\n\n${code.trim()}`;

/** A set of tests proves a rule when it tries just below, exactly at and just above the edge. */
export function provesEdge(edge: number, picks: number[]): string | null {
  if (!picks.includes(edge)) return `Your tests never try the edge itself: ${edge}.`;
  if (!picks.includes(edge - 1)) return `Try the train just below the edge: ${edge - 1}.`;
  if (!picks.includes(edge + 1)) return `Try the train just above the edge: ${edge + 1}.`;
  return null;
}

/** Stars for a shipped level: first run three, second two, any later run one. */
export const starsFor = (runs: number) => runs <= 1 ? 3 : runs === 2 ? 2 : 1;
