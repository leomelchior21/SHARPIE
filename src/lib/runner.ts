import type { RunResult } from "../types";

export async function executeCSharp(code: string, signal?: AbortSignal): Promise<RunResult> {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("The runner is taking a quick breather. Try again in a moment.");
    }
    throw new Error("The C# runner is offline. Start the Docker service and try again.");
  }

  return (await response.json()) as RunResult;
}
