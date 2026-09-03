import { describe, expect, it } from "vitest";
import { challenges, getRunNote } from "./challenges";

describe("WriteLine activities", () => {
  it("ships five core activities followed by three extras", () => {
    expect(challenges).toHaveLength(8);
    expect(challenges.map((challenge) => challenge.title)).toEqual([
      "Morning signal",
      "Introduce yourself",
      "Leave a gap",
      "Make a frame",
      "Initials banner",
      "Student ID card",
      "Crack the code",
      "Launch countdown",
    ]);
    expect(challenges.map((challenge) => challenge.title)).not.toContain("The meme");
    expect(challenges.map((challenge) => challenge.title)).not.toContain("Make it yours");
    expect(challenges.slice(0, 5).every((challenge) => !challenge.extra)).toBe(true);
    expect(challenges.slice(5).every((challenge) => challenge.extra)).toBe(true);
    expect(challenges.every((challenge) => challenge.starterCode("Leo").startsWith("//"))).toBe(true);
  });

  it("keeps every starter incomplete so the student has something to solve", () => {
    const starterOutputs = [
      "Hello!\n",
      "Bom dia,\n",
      "TOP\nBOTTOM\n",
      "#####\n",
      "?\n",
      "================\n",
      "ACCESS CODE\n",
      "3\n",
    ];
    challenges.forEach((challenge, index) => {
      expect(challenge.isComplete(starterOutputs[index], "Leo", challenge.starterCode("Leo"))).toBe(false);
    });
  });

  it("checks the requested output and requires WriteLine practice", () => {
    expect(challenges[0].isComplete("Bom dia, chat!\n", "Leo", 'Console.WriteLine("Bom dia, chat!");')).toBe(true);
    expect(challenges[0].isComplete("bom dia, chat!\n", "Leo", 'Console.WriteLine("bom dia, chat!");')).toBe(true);
    expect(challenges[0].isComplete("bom dia, chat!\n", "Leo", 'Console.WriteLine("bom dia, chat!");')).toBe(true);
    expect(challenges[0].isComplete("Hello!\n", "Leo", 'Console.WriteLine("Hello!");')).toBe(false);

    const introduction = 'Console.WriteLine("Bom dia,"); Console.WriteLine("Leo");';
    expect(challenges[1].isComplete("Bom dia,\nLeo\n", "Leo", introduction)).toBe(true);
    expect(challenges[1].isComplete("Bom dia,\n", "Leo", 'Console.WriteLine("Bom dia,");')).toBe(false);
  });

  it("validates gap, frame, and banner challenges", () => {
    const gapCode = 'Console.WriteLine("TOP"); Console.WriteLine(); Console.WriteLine("BOTTOM");';
    expect(challenges[2].isComplete("TOP\n\nBOTTOM\n", "Leo", gapCode)).toBe(true);

    const frameCode = 'Console.WriteLine("###"); Console.WriteLine("# #"); Console.WriteLine("###");';
    expect(challenges[3].isComplete("###\n# #\n###\n", "Leo", frameCode)).toBe(true);

    const bannerCode = [
      'Console.WriteLine("LL");',
      'Console.WriteLine("L1");',
      'Console.WriteLine("LL");',
      'Console.WriteLine("L1");',
      'Console.WriteLine("LL");',
    ].join("\n");
    expect(challenges[4].isComplete("LL\nL1\nLL\nL1\nLL\n", "Leo", bannerCode)).toBe(true);
    expect(challenges[4].isComplete("LL\nL1\nLL\n", "Leo", bannerCode)).toBe(false);
  });

  it("validates the ID card, access code, and launch extras", () => {
    const cardCode = [
      'Console.WriteLine("================");',
      'Console.WriteLine("LEO");',
      'Console.WriteLine("SHARPIE");',
      'Console.WriteLine("================");',
    ].join("\n");
    expect(challenges[5].isComplete("================\nLEO\nSHARPIE\n================\n", "Leo", cardCode)).toBe(true);
    expect(challenges[5].isComplete("================\nOTHER\nSHARPIE\n================\n", "Leo", cardCode)).toBe(false);

    const accessCode = 'int accessCode = 6 * 7;\nConsole.WriteLine("ACCESS CODE");\nConsole.WriteLine(accessCode);';
    expect(challenges[6].isComplete("ACCESS CODE\n42\n", "Leo", accessCode)).toBe(true);
    expect(challenges[6].isComplete("ACCESS CODE\n42\n", "Leo", 'Console.WriteLine("ACCESS CODE");\nConsole.WriteLine(42);')).toBe(false);

    const launchCode = ["3", "2", "1", "LIFTOFF!"].map((line) => `Console.WriteLine("${line}");`).join("\n");
    expect(challenges[7].isComplete("3\n2\n1\nLIFTOFF!\n", "Leo", launchCode)).toBe(true);
    expect(challenges[7].isComplete("3\n2\n1\nGO!\n", "Leo", launchCode)).toBe(false);
  });

  it("recognizes a completed WriteLine activity in the run note", () => {
    expect(getRunNote("Bom dia, chat!\n", 1, true)).toBe("Signal matched. Activity complete.");
  });
});
