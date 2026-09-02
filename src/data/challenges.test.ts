import { describe, expect, it } from "vitest";
import { challenges, getRunNote } from "./challenges";

describe("C# basics activities", () => {
  it("ships eight progressive activities without the removed titles", () => {
    expect(challenges).toHaveLength(8);
    expect(challenges.map((challenge) => challenge.title)).not.toContain("The meme");
    expect(challenges.map((challenge) => challenge.title)).not.toContain("Make it yours");
  });

  it("checks both output and the mechanic used by the student", () => {
    const stringActivity = challenges[2];
    expect(stringActivity.isComplete("Leo\n", "Leo", 'string student = "Leo"; Console.WriteLine(student);')).toBe(true);
    expect(stringActivity.isComplete("Leo\n", "Leo", 'Console.WriteLine("Leo");')).toBe(false);

    const operatorActivity = challenges[4];
    expect(operatorActivity.isComplete("42\n", "Leo", "int answer = 6 * 7; Console.WriteLine(answer);")).toBe(true);
    expect(operatorActivity.isComplete("42\n", "Leo", "Console.WriteLine(42);")).toBe(false);
  });

  it("recognizes a completed activity in the run note", () => {
    expect(getRunNote("42\n", 1, true)).toBe("Signal matched. Activity complete.");
  });
});
