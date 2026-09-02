import { describe, expect, it } from "vitest";
import { isMorningSignalCode } from "./morningSignal";

describe("Morning Signal evolution trigger", () => {
  it("accepts the two exact requested statements", () => {
    expect(isMorningSignalCode('Console.WriteLine("Bom dia, chat!");')).toBe(true);
    expect(isMorningSignalCode('Console.WriteLine("bom dia, chat!");')).toBe(true);
  });

  it("ignores the supplied instruction comment", () => {
    expect(isMorningSignalCode('// Change the message\nConsole.WriteLine("Bom dia, chat!");')).toBe(true);
  });

  it("rejects near matches and extra executable code", () => {
    expect(isMorningSignalCode('Console.WriteLine("BOM DIA, CHAT!");')).toBe(false);
    expect(isMorningSignalCode('Console.WriteLine("Bom dia, chat!")')).toBe(false);
    expect(isMorningSignalCode('Console.WriteLine("Bom dia, chat!");\nConsole.WriteLine("Leo");')).toBe(false);
  });
});
