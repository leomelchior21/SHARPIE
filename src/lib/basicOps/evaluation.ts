import { executeCSharp, prepareCSharp } from "../runner";
import { analyzeExpression } from "./expression";
import type { ExpressionAnalysis, ExpressionError } from "./expression";

export async function startCSharpEngine(): Promise<boolean> {
  try {
    await prepareCSharp();
    return true;
  } catch {
    return false;
  }
}

function engineError(code: string | undefined, message: string, compiler: string): ExpressionError {
  if (code === "CS0020") {
    return { kind: "division-by-zero", message: "Division by zero.", detail: "C# cannot divide by zero. Change the expression." };
  }
  return { kind: "syntax", message, detail: compiler };
}

export async function evaluateExpression(input: string): Promise<ExpressionAnalysis & { engine: boolean }> {
  const analysis = analyzeExpression(input);
  if (!analysis.ok) return { ...analysis, engine: false };

  try {
    const doubleExpression = analysis.tokens
      .map((token) => (token.kind === "number" && !token.decimal ? `${token.text}.0` : token.text))
      .join(" ");
    const program = `double result = ${doubleExpression};\nConsole.WriteLine(result);`;
    const run = await executeCSharp(program);
    if (run.success) {
      const value = Number(run.output.trim());
      if (Number.isFinite(value)) {
        return { ok: true, tokens: analysis.tokens, value, output: run.output.trim(), engine: true };
      }
    }
    if (run.error) {
      if (run.error.title === "THAT TOOK TOO LONG") return { ...analysis, engine: false };
      return { ok: false, tokens: analysis.tokens, error: engineError(run.error.code, run.error.message, run.error.compiler), engine: true };
    }
  } catch {
    // The in-browser engine is optional for this module: the local analyzer already mirrors C#.
  }
  return { ...analysis, engine: false };
}
