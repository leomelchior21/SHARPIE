import { describe, expect, it } from "vitest";
import { getIntroductionMessage, isFrameSignalCode, isGapFlightCode } from "./specialOutputs";

describe("special activity outputs", () => {
  it("extracts the second, perfectly written WriteLine message", () => {
    const code = [
      "// Add a second WriteLine that prints your name.",
      'Console.WriteLine("Bom dia, chat!");',
      'Console.WriteLine("Leo");',
    ].join("\n");

    expect(getIntroductionMessage(code, "Bom dia, chat!\nLeo\n")).toBe("Leo");
  });

  it("does not activate the car for an empty or loosely written second statement", () => {
    expect(getIntroductionMessage('Console.WriteLine("Hi");\nConsole.WriteLine( "Leo" );', "Hi\nLeo\n")).toBeNull();
    expect(getIntroductionMessage('Console.WriteLine("Hi");\nConsole.WriteLine("");', "Hi\n\n")).toBeNull();
  });

  it("recognizes only the requested three-line hash frame", () => {
    const frame = [
      "// Build the frame.",
      'Console.WriteLine("#####");',
      "",
      'Console.WriteLine("#   #");',
      "",
      'Console.WriteLine("#####");',
    ].join("\n");

    expect(isFrameSignalCode(frame)).toBe(true);
    expect(isFrameSignalCode(frame.replace("#   #", "#  #"))).toBe(false);
  });

  it("also recognizes the requested four-line hash frame", () => {
    const frame = [
      'Console.WriteLine("#####");',
      'Console.WriteLine("#   #");',
      'Console.WriteLine("#   #");',
      'Console.WriteLine("#####");',
    ].join("\n");

    expect(isFrameSignalCode(frame)).toBe(true);
  });

  it("recognizes a gap made from one through five literal spaces", () => {
    for (let spaces = 1; spaces <= 5; spaces += 1) {
      const code = `Console.WriteLine("TOP");\nConsole.WriteLine("${" ".repeat(spaces)}");\nConsole.WriteLine("BOTTOM");`;
      expect(isGapFlightCode(code)).toBe(true);
    }

    expect(isGapFlightCode('Console.WriteLine("TOP");\nConsole.WriteLine("");\nConsole.WriteLine("BOTTOM");')).toBe(false);
    expect(isGapFlightCode('Console.WriteLine("TOP");\nConsole.WriteLine("      ");\nConsole.WriteLine("BOTTOM");')).toBe(false);
  });
});
