import { describe, expect, it } from "vitest";
import { challenges, getRunNote } from "./challenges";

describe("WriteLine challenges", () => {
  it("ships all eight activities", () => {
    expect(challenges).toHaveLength(8);
  });

  it("checks the student's entered name case-insensitively", () => {
    expect(challenges[1].isComplete("leo\n", "Leo")).toBe(true);
    expect(challenges[1].isComplete("Ada\n", "Leo")).toBe(false);
  });

  it("recognizes the 67 microcopy", () => {
    expect(getRunNote("67\n", 1, true)).toBe("Obviously.");
  });
});
