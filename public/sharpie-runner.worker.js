const OUTPUT_LIMIT = 16_384;
const CODE_LIMIT = 12_000;

class SharpieError extends Error {
  constructor(code, message, line = 1, column = 1) {
    super(message);
    this.code = code;
    this.line = line;
    this.column = column;
  }
}

function errorDetails(error) {
  const messages = {
    CS0019: ["OPERATOR MISMATCH", "That operator cannot be used with those values."],
    CS0020: ["DIVISION BY ZERO", "A number cannot be divided by zero."],
    CS0029: ["TYPE MISMATCH", "The value does not match this variable's type."],
    CS0103: ["UNKNOWN NAME", "C# does not recognize one of the names here yet."],
    CS0128: ["NAME ALREADY USED", "A variable with this name already exists."],
    CS1002: ["SOMETHING'S MISSING", "C# expected a ; here."],
    CS1003: ["CHECK THIS EXPRESSION", "C# expected another part of this expression."],
    CS1009: ["CHECK THE ESCAPE", "This string contains an unknown escape sequence."],
    CS1010: ["CHECK THE QUOTES", "A line of text is missing its closing quotation mark."],
    CS1026: ["CHECK THE PARENTHESES", "C# expected a closing ) here."],
    CS1039: ["CHECK THE INTERPOLATION", "The interpolated string is missing a closing brace."],
    CS1525: ["CHECK THIS LINE", "C# found something unexpected in this expression."],
    SHARP001: ["NOT IN THIS MODULE YET", "This beginner playground does not support that C# feature yet."],
  };
  const [title, friendly] = messages[error.code] ?? messages.CS1525;
  return {
    title,
    message: friendly,
    compiler: `${error.code} - ${error.message}`,
    code: error.code,
    line: error.line,
    column: error.column,
  };
}

function stripComments(source) {
  let result = "";
  let inString = false;
  let stringQuote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        result += char;
      } else result += " ";
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        result += "  ";
        blockComment = false;
        index += 1;
      } else result += char === "\n" ? "\n" : " ";
      continue;
    }
    if (!inString && char === "/" && next === "/") {
      result += "  ";
      lineComment = true;
      index += 1;
      continue;
    }
    if (!inString && char === "/" && next === "*") {
      result += "  ";
      blockComment = true;
      index += 1;
      continue;
    }
    result += char;
    if (inString && char === "\\" && !escaped) {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && !escaped) {
      if (!inString) {
        inString = true;
        stringQuote = char;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
    }
    escaped = false;
  }
  return result;
}

function splitStatements(source) {
  const clean = stripComments(source);
  const statements = [];
  let buffer = "";
  let inString = false;
  let stringQuote = "";
  let escaped = false;
  let depth = 0;
  let line = 1;
  let startLine = 1;
  let startColumn = 1;
  let sawContent = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (!sawContent && !/\s/.test(char)) {
      sawContent = true;
      startLine = line;
      startColumn = index - clean.lastIndexOf("\n", index - 1);
    }
    if (inString && char === "\\" && !escaped) {
      escaped = true;
      buffer += char;
      continue;
    }
    if ((char === '"' || char === "'") && !escaped) {
      if (!inString) {
        inString = true;
        stringQuote = char;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
    }
    escaped = false;
    if (!inString) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (depth < 0) throw new SharpieError("CS1525", "Invalid expression term ')'", line, startColumn);
      if (char === ";" && depth === 0) {
        if (buffer.trim()) statements.push({ text: buffer.trim(), line: startLine, column: startColumn });
        buffer = "";
        sawContent = false;
        continue;
      }
    }
    buffer += char;
    if (char === "\n") line += 1;
  }
  if (inString) throw new SharpieError("CS1010", "Newline in constant", line, Math.max(1, startColumn));
  if (depth > 0) throw new SharpieError("CS1026", ") expected", line, Math.max(1, startColumn));
  if (buffer.trim()) throw new SharpieError("CS1002", "; expected", line, clean.trimEnd().length + 1);
  return statements;
}

function decodeEscapes(content, line, column) {
  let output = "";
  const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", "\\": "\\", '"': '"', "'": "'", "0": "\0" };
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== "\\") {
      output += content[index];
      continue;
    }
    index += 1;
    if (index >= content.length || !(content[index] in escapes)) {
      const sequence = index < content.length ? `\\${content[index]}` : "\\";
      throw new SharpieError("CS1009", `Unrecognized escape sequence '${sequence}'`, line, column);
    }
    output += escapes[content[index]];
  }
  return output;
}

const value = (kind, raw) => ({ kind, value: raw });
const isNumber = (item) => item.kind === "int" || item.kind === "double";
const formatValue = (item) => item.kind === "bool" ? (item.value ? "True" : "False") : String(item.value);

function binary(operator, left, right, line, column) {
  if (operator === "+" && [left.kind, right.kind].some((kind) => kind === "string" || kind === "char")) {
    return value("string", formatValue(left) + formatValue(right));
  }
  if (["+", "-", "*", "/", "%"].includes(operator)) {
    if (!isNumber(left) || !isNumber(right)) throw new SharpieError("CS0019", `Operator '${operator}' cannot be applied to '${left.kind}' and '${right.kind}'`, line, column);
    if ((operator === "/" || operator === "%") && right.value === 0) throw new SharpieError("CS0020", "Division by constant zero", line, column);
    let raw;
    if (operator === "+") raw = left.value + right.value;
    if (operator === "-") raw = left.value - right.value;
    if (operator === "*") raw = left.value * right.value;
    if (operator === "/") raw = left.kind === "int" && right.kind === "int" ? Math.trunc(left.value / right.value) : left.value / right.value;
    if (operator === "%") raw = left.value % right.value;
    return value(left.kind === "double" || right.kind === "double" ? "double" : "int", raw);
  }
  if (["<", "<=", ">", ">="].includes(operator)) {
    if (!isNumber(left) || !isNumber(right)) throw new SharpieError("CS0019", `Operator '${operator}' requires two numbers`, line, column);
    if (operator === "<") return value("bool", left.value < right.value);
    if (operator === "<=") return value("bool", left.value <= right.value);
    if (operator === ">") return value("bool", left.value > right.value);
    return value("bool", left.value >= right.value);
  }
  if (operator === "==" || operator === "!=") {
    const equal = isNumber(left) && isNumber(right) ? left.value === right.value : left.kind === right.kind && left.value === right.value;
    return value("bool", operator === "==" ? equal : !equal);
  }
  if (operator === "&&" || operator === "||") {
    if (left.kind !== "bool" || right.kind !== "bool") throw new SharpieError("CS0019", `Operator '${operator}' requires two bool values`, line, column);
    return value("bool", operator === "&&" ? left.value && right.value : left.value || right.value);
  }
  throw new SharpieError("CS1525", `Unexpected operator '${operator}'`, line, column);
}

function tokenize(expression, line, column) {
  const tokens = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const position = index;
    const interpolated = char === "$" && expression[index + 1] === '"';
    if (char === '"' || char === "'" || interpolated) {
      const quote = interpolated ? '"' : char;
      index += interpolated ? 2 : 1;
      let raw = "";
      let closed = false;
      while (index < expression.length) {
        const next = expression[index];
        if (next === "\\" && index + 1 < expression.length) {
          raw += next + expression[index + 1];
          index += 2;
          continue;
        }
        if (next === quote) {
          index += 1;
          closed = true;
          break;
        }
        raw += next;
        index += 1;
      }
      if (!closed) throw new SharpieError("CS1010", "Newline in constant", line, column + position);
      tokens.push({ type: interpolated ? "interpolated" : quote === "'" ? "char" : "string", value: raw, position });
      continue;
    }
    if (/\d/.test(char) || (char === "." && /\d/.test(expression[index + 1] ?? ""))) {
      let raw = "";
      let dots = 0;
      while (index < expression.length && /[\d.]/.test(expression[index])) {
        if (expression[index] === ".") dots += 1;
        raw += expression[index++];
      }
      if (dots > 1) throw new SharpieError("CS1525", `Invalid number '${raw}'`, line, column + position);
      tokens.push({ type: "number", value: raw, position });
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let raw = "";
      while (index < expression.length && /[A-Za-z0-9_]/.test(expression[index])) raw += expression[index++];
      tokens.push({ type: "identifier", value: raw, position });
      continue;
    }
    const pair = expression.slice(index, index + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(pair)) {
      tokens.push({ type: "operator", value: pair, position });
      index += 2;
      continue;
    }
    if (["+", "-", "*", "/", "%", "!", "<", ">"].includes(char)) {
      tokens.push({ type: "operator", value: char, position });
      index += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ type: char, value: char, position });
      index += 1;
      continue;
    }
    throw new SharpieError("CS1525", `Invalid expression term '${char}'`, line, column + position);
  }
  tokens.push({ type: "eof", value: "", position: expression.length });
  return tokens;
}

function interpolate(content, variables, line, column) {
  let output = "";
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === "\\") {
      output += decodeEscapes(content.slice(index, index + 2), line, column + index);
      index += 1;
      continue;
    }
    if (char === "{" && content[index + 1] === "{") {
      output += "{";
      index += 1;
      continue;
    }
    if (char === "}" && content[index + 1] === "}") {
      output += "}";
      index += 1;
      continue;
    }
    if (char !== "{") {
      if (char === "}") throw new SharpieError("CS1039", "Unexpected '}' in interpolated string", line, column + index);
      output += char;
      continue;
    }
    let depth = 1;
    let end = index + 1;
    let quote = "";
    let escaped = false;
    for (; end < content.length; end += 1) {
      const current = content[end];
      if (quote && current === "\\" && !escaped) {
        escaped = true;
        continue;
      }
      if ((current === '"' || current === "'") && !escaped) quote = quote ? (quote === current ? "" : quote) : current;
      escaped = false;
      if (quote) continue;
      if (current === "{") depth += 1;
      if (current === "}") depth -= 1;
      if (depth === 0) break;
    }
    if (depth !== 0) throw new SharpieError("CS1039", "Unterminated interpolation", line, column + index);
    const expression = content.slice(index + 1, end).trim();
    if (!expression) throw new SharpieError("CS1525", "Invalid empty interpolation", line, column + index);
    output += formatValue(evaluateExpression(expression, variables, line, column + index + 1));
    index = end;
  }
  return output;
}

function evaluateExpression(expression, variables, line, column) {
  const tokens = tokenize(expression, line, column);
  let current = 0;
  const peek = () => tokens[current];
  const take = () => tokens[current++];
  const matchOperator = (...operators) => peek().type === "operator" && operators.includes(peek().value) ? take() : null;

  function parsePrimary() {
    const token = take();
    if (token.type === "number") return value(token.value.includes(".") ? "double" : "int", Number(token.value));
    if (token.type === "string") return value("string", decodeEscapes(token.value, line, column + token.position));
    if (token.type === "char") {
      const decoded = decodeEscapes(token.value, line, column + token.position);
      if ([...decoded].length !== 1) throw new SharpieError("CS1012", "Too many characters in character literal", line, column + token.position);
      return value("char", decoded);
    }
    if (token.type === "interpolated") return value("string", interpolate(token.value, variables, line, column + token.position));
    if (token.type === "identifier") {
      if (token.value === "true" || token.value === "false") return value("bool", token.value === "true");
      if (variables.has(token.value)) return variables.get(token.value);
      throw new SharpieError("CS0103", `The name '${token.value}' does not exist in the current context`, line, column + token.position);
    }
    if (token.type === "(") {
      const result = parseOr();
      if (peek().type !== ")") throw new SharpieError("CS1026", ") expected", line, column + peek().position);
      take();
      return result;
    }
    throw new SharpieError("CS1525", `Invalid expression term '${token.value || ")"}'`, line, column + token.position);
  }

  function parseUnary() {
    const operator = matchOperator("!", "+", "-");
    if (!operator) return parsePrimary();
    const right = parseUnary();
    if (operator.value === "!") {
      if (right.kind !== "bool") throw new SharpieError("CS0023", "Operator '!' cannot be applied to this value", line, column + operator.position);
      return value("bool", !right.value);
    }
    if (!isNumber(right)) throw new SharpieError("CS0023", `Operator '${operator.value}' requires a number`, line, column + operator.position);
    return operator.value === "-" ? value(right.kind, -right.value) : right;
  }

  function parseFactor() {
    let left = parseUnary();
    let operator;
    while ((operator = matchOperator("*", "/", "%"))) left = binary(operator.value, left, parseUnary(), line, column + operator.position);
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    let operator;
    while ((operator = matchOperator("+", "-"))) left = binary(operator.value, left, parseFactor(), line, column + operator.position);
    return left;
  }
  function parseComparison() {
    let left = parseTerm();
    let operator;
    while ((operator = matchOperator("<", "<=", ">", ">="))) left = binary(operator.value, left, parseTerm(), line, column + operator.position);
    return left;
  }
  function parseEquality() {
    let left = parseComparison();
    let operator;
    while ((operator = matchOperator("==", "!="))) left = binary(operator.value, left, parseComparison(), line, column + operator.position);
    return left;
  }
  function parseAnd() {
    let left = parseEquality();
    let operator;
    while ((operator = matchOperator("&&"))) left = binary(operator.value, left, parseEquality(), line, column + operator.position);
    return left;
  }
  function parseOr() {
    let left = parseAnd();
    let operator;
    while ((operator = matchOperator("||"))) left = binary(operator.value, left, parseAnd(), line, column + operator.position);
    return left;
  }

  const result = parseOr();
  if (peek().type !== "eof") throw new SharpieError("CS1003", `Unexpected '${peek().value}'`, line, column + peek().position);
  return result;
}

function coerce(declaredType, item, line, column) {
  if (declaredType === "var" || declaredType === item.kind) return item;
  if (declaredType === "double" && item.kind === "int") return value("double", item.value);
  throw new SharpieError("CS0029", `Cannot implicitly convert type '${item.kind}' to '${declaredType}'`, line, column);
}

function appendOutput(current, addition) {
  const remaining = OUTPUT_LIMIT - current.length;
  return { output: remaining > 0 ? current + addition.slice(0, remaining) : current, truncated: addition.length > remaining };
}

function runBasics(code) {
  const started = performance.now();
  if (!code.trim()) return { success: true, output: "", durationMs: 0 };
  if (code.length > CODE_LIMIT) throw new SharpieError("SHARP001", `Keep the experiment under ${CODE_LIMIT} characters.`);
  const variables = new Map();
  let output = "";
  let truncated = false;

  for (const statement of splitStatements(code)) {
    const declaration = /^(string|int|double|bool|char|var)\s+([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(statement.text);
    if (declaration) {
      const [, declaredType, name, expression] = declaration;
      if (variables.has(name)) throw new SharpieError("CS0128", `A local variable named '${name}' is already defined`, statement.line, statement.column);
      variables.set(name, coerce(declaredType, evaluateExpression(expression, variables, statement.line, statement.column), statement.line, statement.column));
      continue;
    }
    const assignment = /^([A-Za-z_]\w*)\s*(=|\+=|-=|\*=|\/=|%=)\s*([\s\S]+)$/.exec(statement.text);
    if (assignment) {
      const [, name, operator, expression] = assignment;
      if (!variables.has(name)) throw new SharpieError("CS0103", `The name '${name}' does not exist in the current context`, statement.line, statement.column);
      const current = variables.get(name);
      const right = evaluateExpression(expression, variables, statement.line, statement.column);
      const next = operator === "=" ? right : binary(operator[0], current, right, statement.line, statement.column);
      variables.set(name, coerce(current.kind, next, statement.line, statement.column));
      continue;
    }
    const increment = /^([A-Za-z_]\w*)\s*(\+\+|--)$/.exec(statement.text);
    if (increment) {
      const [, name, operator] = increment;
      if (!variables.has(name)) throw new SharpieError("CS0103", `The name '${name}' does not exist in the current context`, statement.line, statement.column);
      const current = variables.get(name);
      const next = binary(operator === "++" ? "+" : "-", current, value("int", 1), statement.line, statement.column);
      variables.set(name, coerce(current.kind, next, statement.line, statement.column));
      continue;
    }
    const write = /^Console\s*\.\s*(WriteLine|Write)\s*\(([\s\S]*)\)$/.exec(statement.text);
    if (!write) {
      if (/^Console\s*\.\s*(WriteLine|Write)/.test(statement.text)) throw new SharpieError("CS1003", "Unexpected text in Console output statement", statement.line, statement.column + statement.text.length);
      throw new SharpieError("SHARP001", "This module supports variables, expressions, Console.Write, and Console.WriteLine.", statement.line, statement.column);
    }
    const item = write[2].trim() ? evaluateExpression(write[2], variables, statement.line, statement.column) : value("string", "");
    const addition = formatValue(item) + (write[1] === "WriteLine" ? "\n" : "");
    const appended = appendOutput(output, addition);
    output = appended.output;
    truncated ||= appended.truncated;
  }
  return { success: true, output, durationMs: Math.max(1, Math.round(performance.now() - started)), truncated };
}

self.addEventListener("message", (event) => {
  const { requestId, code } = event.data ?? {};
  if (!requestId || typeof code !== "string") return;
  self.postMessage({ type: "compiled", requestId });
  setTimeout(() => {
    try {
      self.postMessage({ type: "response", requestId, result: runBasics(code) });
    } catch (error) {
      const sharpieError = error instanceof SharpieError ? error : new SharpieError("CS1525", error instanceof Error ? error.message : String(error));
      self.postMessage({ type: "response", requestId, result: { success: false, output: "", durationMs: 1, error: errorDetails(sharpieError) } });
    }
  }, 180);
});

self.postMessage({ type: "ready" });
