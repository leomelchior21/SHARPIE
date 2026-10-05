import type { NumberUsage, OperatorSymbol } from "../../data/basicOperations";

export type ExpressionToken =
  | { kind: "number"; text: string; value: number; decimal: boolean; position: number }
  | { kind: "operator"; text: string; position: number }
  | { kind: "paren"; text: "(" | ")"; position: number };

export type ExpressionErrorKind = "syntax" | "division-by-zero";

export type ExpressionError = {
  kind: ExpressionErrorKind;
  message: string;
  detail: string;
  position?: number;
};

export type ExpressionAnalysis =
  | { ok: true; tokens: ExpressionToken[]; value: number; output: string }
  | { ok: false; tokens: ExpressionToken[]; error: ExpressionError };

export type ExpressionRules = {
  numbers?: number[];
  numberUsage?: NumberUsage;
  allowedOperators?: OperatorSymbol[];
  allowParentheses?: boolean;
  requireParentheses?: boolean;
};

export type RuleViolation =
  | { kind: "numbers"; message: string; detail: string }
  | { kind: "operators"; message: string; detail: string }
  | { kind: "parentheses"; message: string; detail: string };

export type TokenFeedback = "green" | "yellow" | "dark";

type NumericValue = { kind: "int" | "double"; value: number };

class ParseFailure extends Error {
  error: ExpressionError;

  constructor(error: ExpressionError) {
    super(error.message);
    this.error = error;
  }
}

export function normalizeExpressionInput(raw: string): string {
  let value = raw.trim();
  if (!value) return "";
  value = value.replace(/^double\s+result\s*=\s*/i, "");
  value = value.replace(/;\s*$/, "");
  return value.trim();
}

const characterHints: Record<string, { message: string; detail: string }> = {
  "×": { message: "C# does not use ×. Multiplication is *.", detail: "× is a math symbol, not a C# operator." },
  "·": { message: "C# does not use ·. Multiplication is *.", detail: "· is a math symbol, not a C# operator." },
  "÷": { message: "C# does not use ÷. Division is /.", detail: "÷ is a math symbol, not a C# operator." },
  "−": { message: "That is not the C# minus sign. Use -.", detail: "U+2212 is a math minus, not the keyboard hyphen." },
  ",": { message: "Use a dot for decimals, like 2.5", detail: "C# decimals use a dot, not a comma." },
  "^": { message: "C# has no ^ here. Write products with *.", detail: "Powers are not part of this module." },
  ";": { message: "Remove the ; — it is already written for you.", detail: "The line ends with a locked semicolon." },
  "=": { message: "Write only the expression after double result =.", detail: "The prefix is already written for you." },
  "&": { message: "& is not available here.", detail: "Only arithmetic operators are allowed." },
  "|": { message: "| is not available here.", detail: "Only arithmetic operators are allowed." },
  "!": { message: "! is not available here.", detail: "Only arithmetic operators are allowed." },
  "<": { message: "Comparisons are not part of this module.", detail: "Only arithmetic operators are allowed." },
  ">": { message: "Comparisons are not part of this module.", detail: "Only arithmetic operators are allowed." },
};

export function tokenizeExpression(input: string): { tokens: ExpressionToken[]; error?: ExpressionError } {
  const tokens: ExpressionToken[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(input[index + 1] ?? ""))) {
      let raw = "";
      let dots = 0;
      const position = index;
      while (index < input.length && /[0-9.]/.test(input[index])) {
        if (input[index] === ".") dots += 1;
        raw += input[index];
        index += 1;
      }
      if (dots > 1 || raw === ".") {
        return {
          tokens,
          error: { kind: "syntax", message: `"${raw}" is not a valid number.`, detail: "A number can only have one dot.", position },
        };
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        return {
          tokens,
          error: { kind: "syntax", message: `"${raw}" is too large for this module.`, detail: "Keep numbers small.", position },
        };
      }
      tokens.push({ kind: "number", text: raw, value, decimal: raw.includes("."), position });
      continue;
    }

    if ("+-*/%".includes(char)) {
      tokens.push({ kind: "operator", text: char, position: index });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", text: char, position: index });
      index += 1;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let word = "";
      while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) {
        word += input[index];
        index += 1;
      }
      return {
        tokens,
        error: { kind: "syntax", message: "Names are not allowed here. Use numbers only.", detail: `C# cannot read "${word}" in this line.`, position: index - word.length },
      };
    }

    const hint = characterHints[char];
    if (hint) {
      return { tokens, error: { kind: "syntax", message: hint.message, detail: hint.detail, position: index } };
    }

    return {
      tokens,
      error: { kind: "syntax", message: `C# does not recognize "${char}".`, detail: "Only numbers, + - * / % and ( ) are allowed.", position: index },
    };
  }

  return { tokens };
}

function applyBinaryExpression(operator: string, left: NumericValue, right: NumericValue, position: number): NumericValue {
  if ((operator === "/" || operator === "%") && right.value === 0) {
    throw new ParseFailure({
      kind: "division-by-zero",
      message: "Division by zero.",
      detail: "C# cannot divide by zero. Change the expression.",
      position,
    });
  }
  let value: number;
  switch (operator) {
    case "+":
      value = left.value + right.value;
      break;
    case "-":
      value = left.value - right.value;
      break;
    case "*":
      value = left.value * right.value;
      break;
    case "/":
      value = left.value / right.value;
      break;
    default:
      value = left.value % right.value;
      break;
  }
  const kind: NumericValue["kind"] = left.kind === "double" || right.kind === "double" || operator === "/" ? "double" : "int";
  return { kind, value: Object.is(value, -0) ? 0 : value };
}

export function parseTokens(tokens: ExpressionToken[]): { ok: true; value: number } | { ok: false; error: ExpressionError } {
  let current = 0;
  const peek = () => tokens[current];
  const take = () => tokens[current++];

  const matchOperator = (...operators: string[]) => {
    const token = peek();
    if (token && token.kind === "operator" && operators.includes(token.text)) return take();
    return null;
  };

  const fail = (message: string, detail: string, token: ExpressionToken | undefined): never => {
    throw new ParseFailure({ kind: "syntax", message, detail, position: token?.position });
  };

  const parsePrimary = (): NumericValue => {
    const token = take();
    if (!token) fail("The expression ends too early.", "Add the missing part.", token);
    if (token!.kind === "number") return { kind: token!.decimal ? "double" : "int", value: token!.value };
    if (token!.kind === "paren" && token!.text === "(") {
      const inner = parseOr();
      const closing = take();
      if (!closing || closing.kind !== "paren" || closing.text !== ")") {
        fail("A closing ) is missing.", "Every ( needs its pair.", closing ?? token);
      }
      return inner;
    }
    fail(`Unexpected "${token!.text}" in the expression.`, "Check the order of the symbols.", token);
    return { kind: "int", value: 0 };
  };

  const parseUnary = (): NumericValue => {
    const operator = matchOperator("+", "-");
    if (!operator) return parsePrimary();
    const right = parseUnary();
    if (operator.text === "-") return { kind: right.kind, value: -right.value };
    return right;
  };

  const parseFactor = (): NumericValue => {
    let left = parseUnary();
    let operator = matchOperator("*", "/", "%");
    while (operator) {
      const right = parseUnary();
      left = applyBinaryExpression(operator.text, left, right, operator.position);
      operator = matchOperator("*", "/", "%");
    }
    return left;
  };

  const parseTerm = (): NumericValue => {
    let left = parseFactor();
    let operator = matchOperator("+", "-");
    while (operator) {
      const right = parseFactor();
      left = applyBinaryExpression(operator.text, left, right, operator.position);
      operator = matchOperator("+", "-");
    }
    return left;
  };

  const parseOr = (): NumericValue => parseTerm();

  try {
    if (!tokens.length) {
      return { ok: false, error: { kind: "syntax", message: "Write an expression first.", detail: "The line is empty." } };
    }
    const value = parseOr();
    if (current < tokens.length) {
      const token = peek();
      return {
        ok: false,
        error: {
          kind: "syntax",
          message: `C# cannot read "${token.text}" after the expression.`,
          detail: "Check for missing operators.",
          position: token.position,
        },
      };
    }
    return { ok: true, value: value.value };
  } catch (error) {
    if (error instanceof ParseFailure) return { ok: false, error: error.error };
    throw error;
  }
}

export function analyzeExpression(input: string): ExpressionAnalysis {
  const normalized = normalizeExpressionInput(input);
  if (!normalized) {
    return {
      ok: false,
      tokens: [],
      error: { kind: "syntax", message: "Write an expression first.", detail: "The line is empty." },
    };
  }
  const tokenized = tokenizeExpression(normalized);
  if (tokenized.error) return { ok: false, tokens: tokenized.tokens, error: tokenized.error };
  const parsed = parseTokens(tokenized.tokens);
  if (!parsed.ok) return { ok: false, tokens: tokenized.tokens, error: parsed.error };
  return { ok: true, tokens: tokenized.tokens, value: parsed.value, output: formatExpressionValue(parsed.value) };
}

export function safeTokens(input: string): ExpressionToken[] {
  return tokenizeExpression(normalizeExpressionInput(input)).tokens;
}

export function formatExpressionValue(value: number): string {
  if (Object.is(value, -0)) return "0";
  return String(value);
}

export function resultEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

export function tokenKey(token: ExpressionToken): string {
  if (token.kind === "number") {
    const value = Object.is(token.value, -0) ? 0 : token.value;
    return `#${value}`;
  }
  return token.text;
}

export function tokensToExpression(tokens: ExpressionToken[]): string {
  return tokens.map((token) => token.text).join(" ");
}

function numberCounts(values: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const value of values) {
    const normalized = Object.is(value, -0) ? 0 : value;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return counts;
}

export function validateTokens(tokens: ExpressionToken[], rules: ExpressionRules): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const operators = tokens.filter((token): token is Extract<ExpressionToken, { kind: "operator" }> => token.kind === "operator");
  const parentheses = tokens.filter((token): token is Extract<ExpressionToken, { kind: "paren" }> => token.kind === "paren");

  if (rules.allowedOperators) {
    const allowed = new Set<string>(rules.allowedOperators);
    const rejected = [...new Set(operators.map((token) => token.text))].filter((text) => !allowed.has(text));
    if (rejected.length) {
      violations.push({
        kind: "operators",
        message: `"${rejected[0]}" is not available in this puzzle.`,
        detail: `Available operators: ${rules.allowedOperators.filter((op) => op !== "(" && op !== ")").join(" ") || "none"}.`,
      });
    }
    const parensAllowed = allowed.has("(") && allowed.has(")");
    if (!parensAllowed && parentheses.length) {
      violations.push({
        kind: "parentheses",
        message: "Parentheses are not available here.",
        detail: "Write the expression without ( ).",
      });
    }
  } else if (parentheses.length && rules.allowParentheses === false) {
    violations.push({
      kind: "parentheses",
      message: "Parentheses are not available here.",
      detail: "Write the expression without ( ).",
    });
  }

  if (rules.requireParentheses && !parentheses.length) {
    violations.push({
      kind: "parentheses",
      message: "This expression needs grouping.",
      detail: "Use parentheses to control what runs first.",
    });
  }

  if (rules.numbers) {
    const required = numberCounts(rules.numbers);
    const used = numberCounts(tokens.filter((token) => token.kind === "number").map((token) => token.value));
    const missing: number[] = [];
    const extra: number[] = [];
    const values = new Set([...required.keys(), ...used.keys()]);
    for (const value of values) {
      const needed = required.get(value) ?? 0;
      const have = used.get(value) ?? 0;
      if (have < needed) for (let count = 0; count < needed - have; count += 1) missing.push(value);
      if (have > needed) for (let count = 0; count < have - needed; count += 1) extra.push(value);
    }
    if (rules.numberUsage === "at-least-once") {
      if (missing.length) {
        violations.push({
          kind: "numbers",
          message: "You must use every number at least once.",
          detail: `Missing: ${missing.join(", ")}.`,
        });
      }
    } else if (missing.length || extra.length) {
      const parts: string[] = [];
      if (missing.length) parts.push(`Missing: ${missing.join(", ")}.`);
      if (extra.length) parts.push(`Not in this puzzle: ${extra.join(", ")}.`);
      violations.push({
        kind: "numbers",
        message: "You must use each number exactly once.",
        detail: parts.join(" "),
      });
    }
  }

  return violations;
}

export function referenceFeedback(tokens: ExpressionToken[], reference: string): TokenFeedback[] {
  const referenceTokens = tokenizeExpression(reference).tokens;
  if (!referenceTokens.length) return tokens.map(() => "dark");
  const referenceKeys = referenceTokens.map(tokenKey);
  const totals = new Map<string, number>();
  for (const key of referenceKeys) totals.set(key, (totals.get(key) ?? 0) + 1);

  const used = new Map<string, number>();
  const feedback: TokenFeedback[] = tokens.map(() => "dark");

  tokens.forEach((token, index) => {
    const key = tokenKey(token);
    if (referenceKeys[index] === key) {
      feedback[index] = "green";
      used.set(key, (used.get(key) ?? 0) + 1);
    }
  });

  tokens.forEach((token, index) => {
    if (feedback[index] === "green") return;
    const key = tokenKey(token);
    const available = (totals.get(key) ?? 0) - (used.get(key) ?? 0);
    if (available > 0) {
      feedback[index] = "yellow";
      used.set(key, (used.get(key) ?? 0) + 1);
    }
  });

  return feedback;
}
