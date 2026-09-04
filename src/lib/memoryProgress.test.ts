import { beforeEach, describe, expect, it } from "vitest";
import { memoryProgress } from "./memoryProgress";

describe("Memory Machine progress", () => {
  beforeEach(() => localStorage.clear());

  it("unlocks Variable Run when Memory Machine is completed", () => {
    expect(memoryProgress.isVariableRunUnlocked()).toBe(false);
    memoryProgress.completeMemoryMachine();
    expect(localStorage.getItem("memoryMachineCompleted")).toBe("true");
    expect(localStorage.getItem("variableRunUnlocked")).toBe("true");
    expect(memoryProgress.isVariableRunUnlocked()).toBe(true);
  });
});
