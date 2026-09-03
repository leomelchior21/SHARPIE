import { beforeEach, describe, expect, it } from "vitest";
import { session } from "./session";

describe("activity visit state", () => {
  beforeEach(() => sessionStorage.clear());

  it("persists opened activities independently from solved activities", () => {
    session.setVisited([1, 3, 5]);
    session.setCompleted([1]);

    expect(session.getVisited()).toEqual([1, 3, 5]);
    expect(session.getCompleted()).toEqual([1]);
  });

  it("restores extra activities from the current session", () => {
    session.setChallenge(8);
    expect(session.getChallenge()).toBe(8);

    session.setChallenge(9);
    expect(session.getChallenge()).toBe(1);
  });
});
