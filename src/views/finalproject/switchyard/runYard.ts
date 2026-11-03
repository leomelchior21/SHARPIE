import { executeCSharp, prepareCSharp } from "../../../lib/runner";

// Every train runs the real C# program through Sharpie's in-browser engine.
export async function runYard(code: string, signal?: AbortSignal): Promise<string> {
  const result = await executeCSharp(code, signal);
  if (!result.success) throw new Error(result.error?.message ?? "The C# could not run. Check the code and try again.");
  return result.output.trimEnd();
}

// Start the engine while the student reads the dispatch, so the first train does not wait for it.
export function warmYard() {
  try { void prepareCSharp().catch(() => undefined); } catch { /* The first run starts it instead. */ }
}
