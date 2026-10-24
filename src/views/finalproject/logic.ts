import type { Challenge, Input, Line, Operator } from "./content";
import { program } from "./content";
import { executeCSharp } from "../../lib/runner";
export function compare(value: number, op: Operator, threshold: number): boolean {
  switch(op) { case ">": return value > threshold; case "<": return value < threshold; case ">=": return value >= threshold; case "<=": return value <= threshold; case "==": return value === threshold; case "!=": return value !== threshold; }
}
export function conditionResult(condition: string, variable: string, input: Input): boolean {
  if (condition === variable && typeof input === "boolean") return input;
  const match = /^(\w+)\s*(>=|<=|==|!=|>|<)\s*(true|false|\d+)$/.exec(condition);
  if (!match || match[1] !== variable) throw new Error("Choose a condition from the code pieces.");
  const right = match[3] === "true" ? true : match[3] === "false" ? false : Number(match[3]);
  if (typeof input !== typeof right) throw new Error("The comparison needs matching types.");
  if (typeof input === "boolean") {
    if (match[2] === "==") return input === right;
    if (match[2] === "!=") return input !== right;
    throw new Error("Boolean values use == or !=.");
  }
  return compare(input, match[2] as Operator, right as number);
}
export function validatePieces(s: Challenge, pieces: string[]): { valid: boolean; message: string } {
  if (pieces.some(p => !p)) return {valid:false, message:"Fill all three code slots before running."};
  const inputs: Input[] = typeof s.initial === "boolean" ? [false,true] : Array.from({length:s.max - s.min + 1},(_,i)=>s.min+i);
  try {
    for (const input of inputs) {
      const expected = conditionResult(s.condition,s.variable,input) ? s.yes : s.no;
      const actual = conditionResult(pieces[0],s.variable,input) ? pieces[1] : pieces[2];
      if (actual !== expected) return {valid:false,message:`With ${s.variable} = ${input}, your code prints "${actual}". The mission needs "${expected}". Check the comparison and that branch.`};
    }
    return {valid:true,message:"Both paths work, including the boundary."};
  } catch (error) { return {valid:false,message:(error as Error).message}; }
}
const printed = /^Console\.WriteLine\(("(?:[^"\\]|\\.)*")\);$/;
const ifTest = /^if \((.+)\)$/;
// Each of the five program lines has one job; say which line is out of place.
const roles: { ok: (line: Line) => boolean; message: string }[] = [
  { ok: (line) => line === "decl", message: "Line 1 must create the variable that the if tests." },
  { ok: (line) => ifTest.test(line), message: "Line 2 must be the test: an if ( … ) line." },
  { ok: (line) => printed.test(line), message: "Line 3 runs when the test is TRUE. It must print a message." },
  { ok: (line) => line === "else", message: "Line 4 must be else: it starts the FALSE path." },
  { ok: (line) => printed.test(line), message: "Line 5 runs when the test is FALSE. It must print a message." },
];
export const structureProblem = (lines: Line[]) => roles.find((role, i) => !role.ok(lines[i] ?? ""))?.message ?? null;
// [condition, IF message, ELSE message], or null while the program is incomplete or out of order.
export function linesToPieces(lines: Line[]): string[] | null {
  if (lines.length !== 5 || structureProblem(lines)) return null;
  return [ifTest.exec(lines[1])![1], JSON.parse(printed.exec(lines[2])![1]), JSON.parse(printed.exec(lines[4])![1])];
}
export function validateLines(s: Challenge, lines: Line[]): { valid: boolean; message: string } {
  if (lines.some((line) => !line)) return { valid: false, message: "Fill every line of the program before running." };
  const problem = structureProblem(lines);
  return problem ? { valid: false, message: problem } : validatePieces(s, linesToPieces(lines)!);
}
export async function runProgram(s: Parameters<typeof program>[0], input: Input, pieces: string[], signal?: AbortSignal) {
  const result = await executeCSharp(program(s,input,pieces), signal);
  if (!result.success) throw new Error(result.error?.message ?? "The code could not run. Try again.");
  return result.output.trimEnd();
}
