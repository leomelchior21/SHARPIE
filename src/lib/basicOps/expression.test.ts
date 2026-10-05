import { describe, expect, it } from "vitest";
import {
  analyzeExpression,
  normalizeExpressionInput,
  referenceFeedback,
  tokenKey,
  validateTokens,
} from "./expression";
import type { ExpressionToken } from "./expression";

function valueOf(expression: string): number {
  const result = analyzeExpression(expression);
  if (!result.ok) throw new Error(`Expected valid expression: ${expression} (${result.error.message})`);
  return result.value;
}

function tokensOf(expression: string): ExpressionToken[] {
  const result = analyzeExpression(expression);
  if (!result.ok) throw new Error(`Expected valid expression: ${expression}`);
  return result.tokens;
}

describe("C# expression semantics", () => {
  it("evaluates the basic operations", () => {
    expect(valueOf("12 + 7")).toBe(19);
    expect(valueOf("34 - 16")).toBe(18);
    expect(valueOf("8 * 6")).toBe(48);
    expect(valueOf("24 / 4")).toBe(6);
    expect(valueOf("17 % 5")).toBe(2);
  });

  it("keeps real C# integer division", () => {
    expect(valueOf("7 / 2")).toBe(3);
    expect(valueOf("1 / 2")).toBe(0);
    expect(valueOf("7.0 / 2")).toBe(3.5);
    expect(valueOf("10 - 2 - 3")).toBe(5);
    expect(valueOf("100 / 10 / 5")).toBe(2);
  });

  it("follows C# precedence and grouping", () => {
    expect(valueOf("4 + 3 * 5")).toBe(19);
    expect(valueOf("(4 + 3) * 5")).toBe(35);
    expect(valueOf("2 + 3 * 4")).toBe(14);
    expect(valueOf("(2 + 3 * 4) / 2")).toBe(7);
    expect(valueOf("-3 + 5")).toBe(2);
    expect(valueOf("+(4) * 2")).toBe(8);
  });

  it("strips the locked prefix and suffix when pasted", () => {
    expect(normalizeExpressionInput("double result = 12 + 7;")).toBe("12 + 7");
    expect(normalizeExpressionInput("  8 * 6  ")).toBe("8 * 6");
  });
});

describe("syntax errors", () => {
  it("rejects C# syntax that does not exist", () => {
    for (const expression of ["8 ** 3", "3(5)", "12 +", "(12 + 7", "12 @ 7", "abc + 1", "8 + + "]) {
      const result = analyzeExpression(expression);
      expect(result.ok, expression).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("syntax");
    }
  });

  it("teaches the C# operator for math symbols", () => {
    const times = analyzeExpression("12 × 7");
    expect(times.ok).toBe(false);
    if (!times.ok) expect(times.error.message).toContain("Multiplication is *");

    const division = analyzeExpression("24 ÷ 4");
    expect(division.ok).toBe(false);
    if (!division.ok) expect(division.error.message).toContain("Division is /");

    const comma = analyzeExpression("2,5 + 1");
    expect(comma.ok).toBe(false);
    if (!comma.ok) expect(comma.error.message).toContain("dot");
  });

  it("reports division by zero instead of crashing", () => {
    for (const expression of ["5 / 0", "5 % 0", "10 / (3 - 3)"]) {
      const result = analyzeExpression(expression);
      expect(result.ok, expression).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("division-by-zero");
    }
  });
});

describe("rule validation", () => {
  it("accepts the reference expression for the fraction level", () => {
    expect(validateTokens(tokensOf("(12 + 8) / 4"), {
      numbers: [12, 8, 4],
      allowedOperators: ["+", "/", "(", ")"],
    })).toEqual([]);
  });

  it("enforces exactly-once number usage including duplicates", () => {
    const good = validateTokens(tokensOf("(2 + 3 * 4) / 2"), {
      numbers: [2, 3, 4, 2],
      allowedOperators: ["+", "*", "/", "(", ")"],
    });
    expect(good).toEqual([]);

    const missing = validateTokens(tokensOf("2 + 3 * 4"), {
      numbers: [2, 3, 4, 2],
      allowedOperators: ["+", "*", "/", "(", ")"],
    });
    expect(missing[0]?.kind).toBe("numbers");
    expect(missing[0]?.message).toContain("exactly once");

    const extra = validateTokens(tokensOf("2 + 3 * 4 + 7"), {
      numbers: [2, 3, 4, 2],
      allowedOperators: ["+", "*", "/", "(", ")"],
    });
    expect(extra[0]?.kind).toBe("numbers");
  });

  it("supports at-least-once usage", () => {
    expect(validateTokens(tokensOf("(2 + 3 * 4) / 2"), {
      numbers: [2, 3, 4],
      numberUsage: "at-least-once",
      allowedOperators: ["+", "*", "/", "(", ")"],
    })).toEqual([]);
  });

  it("rejects unavailable operators and parentheses", () => {
    const percent = validateTokens(tokensOf("17 % 5"), {
      numbers: [17, 5],
      allowedOperators: ["+", "-", "*"],
    });
    expect(percent[0]?.message).toContain("%");

    const parens = validateTokens(tokensOf("(7 + 3)"), {
      numbers: [7, 3],
      allowedOperators: ["+"],
    });
    expect(parens.some((violation) => violation.kind === "parentheses")).toBe(true);
  });

  it("can require parentheses", () => {
    const missing = validateTokens(tokensOf("4 + 3 * 5"), {
      numbers: [4, 3, 5],
      allowedOperators: ["+", "*", "(", ")"],
      requireParentheses: true,
    });
    expect(missing.some((violation) => violation.kind === "parentheses")).toBe(true);
  });
});

describe("token feedback", () => {
  it("marks right place, present and unused tokens", () => {
    const attempt = tokensOf("8 + 3 * 2");
    const feedback = referenceFeedback(attempt, "8 * 3 - 2");
    expect(feedback).toEqual(["green", "dark", "green", "yellow", "green"]);
  });

  it("is all green for the reference expression", () => {
    const attempt = tokensOf("8 * 3 - 2");
    expect(referenceFeedback(attempt, "8 * 3 - 2")).toEqual(attempt.map(() => "green"));
  });

  it("normalizes numeric tokens", () => {
    expect(tokenKey(tokensOf("7.0")[0])).toBe(tokenKey(tokensOf("7")[0]));
  });
});
