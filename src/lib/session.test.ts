import { beforeEach, describe, expect, it } from "vitest";
import { session } from "./session";

describe("activity visit state", () => {
  beforeEach(() => sessionStorage.clear());

  it("persists opened activities independently from solved activities", () => {
    session.setVisited([1, 4, 8]);
    session.setCompleted([1]);

    expect(session.getVisited()).toEqual([1, 4, 8]);
    expect(session.getCompleted()).toEqual([1]);
  });
});
