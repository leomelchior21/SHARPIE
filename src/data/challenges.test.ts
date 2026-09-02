import { describe, expect, it } from "vitest";
import { challenges, getRunNote } from "./challenges";

describe("WriteLine activities", () => {
  it("ships five focused activities in the requested order", () => {
    expect(challenges).toHaveLength(5);
    expect(challenges.map((challenge) => challenge.title)).toEqual([
      "Morning signal",
      "Introduce yourself",
      "Leave a gap",
      "Make a frame",
      "Initials banner",
    ]);
    expect(challenges.map((challenge) => challenge.title)).not.toContain("The meme");
    expect(challenges.map((challenge) => challenge.title)).not.toContain("Make it yours");
    expect(challenges.every((challenge) => challenge.starterCode("Leo").startsWith("//"))).toBe(true);
  });

  it("keeps every starter incomplete so the student has something to solve", () => {
    const starterOutputs = [
      "Hello!\n",
      "Bom dia,\n",
      "TOP\nBOTTOM\n",
      "#####\n",
      "?\n",
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

    const bannerCode = 'Console.WriteLine("LL"); Console.WriteLine("L1"); Console.WriteLine("LL");';
    expect(challenges[4].isComplete("LL\nL1\nLL\n", "Leo", bannerCode)).toBe(true);
  });

  it("recognizes a completed WriteLine activity in the run note", () => {
    expect(getRunNote("Bom dia, chat!\n", 1, true)).toBe("Signal matched. Activity complete.");
  });
});
