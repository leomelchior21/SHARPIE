import { describe, expect, it, vi } from "vitest";
import { executeCSharp } from "../runner";
import { evaluateExpression } from "./evaluation";

vi.mock("../runner", () => ({
  prepareCSharp: vi.fn(),
  executeCSharp: vi.fn(),
}));

describe("Mathler expression evaluation", () => {
  it("uses the local arithmetic result when the optional C# worker times out", async () => {
    vi.mocked(executeCSharp).mockResolvedValue({
      success: false,
      output: "",
      durationMs: 2_000,
      error: {
        title: "THAT TOOK TOO LONG",
        message: "This experiment kept running, so SHARPIE stopped it.",
        compiler: "Execution stopped after the two-second classroom limit.",
      },
    });

    const result = await evaluateExpression("10 * 5 - 18");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(32);
      expect(result.engine).toBe(false);
    }
  });
});
