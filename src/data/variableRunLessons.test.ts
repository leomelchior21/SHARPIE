import { describe, expect, it } from "vitest";
import { variableRunLessons } from "./variableRunLessons";

describe("Variable Run lessons", () => {
  it("contains ten sequential, data-driven challenges", () => {
    expect(variableRunLessons).toHaveLength(10);
    expect(variableRunLessons.map((lesson) => lesson.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("gives every challenge a valid answer definition", () => {
    for (const lesson of variableRunLessons) {
      if (lesson.type === "multiple-choice") {
        expect(lesson.answers?.[lesson.correct ?? -1]).toBeDefined();
      } else {
        expect(lesson.expectedBlocks?.length).toBeGreaterThan(0);
      }
    }
  });
});
