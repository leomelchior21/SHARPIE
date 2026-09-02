import { describe, expect, it } from "vitest";
import { challenges, getRunNote } from "./challenges";

describe("WriteLine activities", () => {
  it("ships eight focused activities without revealing complete solutions", () => {
    expect(challenges).toHaveLength(8);
    expect(challenges.map((challenge) => challenge.title)).not.toContain("The meme");
    expect(challenges.map((challenge) => challenge.title)).not.toContain("Make it yours");
    expect(challenges.every((challenge) => challenge.starterCode("Leo").startsWith("//"))).toBe(true);
  });

  it("keeps every starter incomplete so the student has something to solve", () => {
    const starterOutputs = [
      "Hello!\n",
      "Bom dia, chat!\n",
      "?\n",
      "TOP\nBOTTOM\n",
      "#####\n",
      "START\n",
      "3\n",
      "================\n",
    ];
    challenges.forEach((challenge, index) => {
      expect(challenge.isComplete(starterOutputs[index], "Leo", challenge.starterCode("Leo"))).toBe(false);
    });
  });

  it("checks the requested output and requires WriteLine practice", () => {
    expect(challenges[0].isComplete("Bom dia, chat!\n", "Leo", 'Console.WriteLine("Bom dia, chat!");')).toBe(true);
    expect(challenges[0].isComplete("Hello!\n", "Leo", 'Console.WriteLine("Hello!");')).toBe(false);

    const introduction = 'Console.WriteLine("Bom dia, chat!"); Console.WriteLine("Leo");';
    expect(challenges[1].isComplete("Bom dia, chat!\nLeo\n", "Leo", introduction)).toBe(true);
    expect(challenges[1].isComplete("Bom dia, chat!\n", "Leo", 'Console.WriteLine("Bom dia, chat!");')).toBe(false);
  });

  it("validates the banner and launch-sequence challenges", () => {
    const bannerCode = 'Console.WriteLine("LL"); Console.WriteLine("L1"); Console.WriteLine("LL");';
    expect(challenges[2].isComplete("LL\nL1\nLL\n", "Leo", bannerCode)).toBe(true);

    const launchCode = ["3", "2", "1", "GO!"].map((text) => `Console.WriteLine("${text}");`).join(" ");
    expect(challenges[6].isComplete("3\n2\n1\nGO!\n", "Leo", launchCode)).toBe(true);
  });

  it("recognizes a completed WriteLine activity in the run note", () => {
    expect(getRunNote("Bom dia, chat!\n", 1, true)).toBe("Signal matched. Activity complete.");
  });
});
