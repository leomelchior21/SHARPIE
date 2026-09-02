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
    CS1002: ["SOMETHING'S MISSING", "C# expected a ; here."],
    CS1010: ["CHECK THE QUOTES", "A line of text is missing its closing quotation mark."],
    CS1026: ["CHECK THE PARENTHESES", "C# expected a closing ) here."],
    CS0103: ["UNKNOWN NAME", "C# does not recognize one of the names here yet."],
    CS1525: ["CHECK THIS LINE", "C# found something unexpected in this expression."],
    SHARP001: ["KEEP IT SIMPLE", "This playground supports WriteLine and simple variables for now."],
  };
  const [title, friendly] = messages[error.code] ?? messages.CS1525;
  return {
    title,
    message: friendly,
    compiler: `${error.code} — ${error.message}`,
    code: error.code,
    line: error.line,
    column: error.column,
  };
}

function stripComments(source) {
  let result = "";
  let inString = false;
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
      } else {
        result += " ";
      }
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        result += "  ";
        blockComment = false;
        index += 1;
      } else {
        result += char === "\n" ? "\n" : " ";
      }
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
    if (char === '"' && !escaped) inString = !inString;
    escaped = false;
  }

  return result;
}

function splitStatements(source) {
  const clean = stripComments(source);
  const statements = [];
  let buffer = "";
  let inString = false;
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
      const lastNewline = clean.lastIndexOf("\n", index - 1);
      startColumn = index - lastNewline;
    }

    if (inString && char === "\\" && !escaped) {
      escaped = true;
      buffer += char;
      continue;
    }

    if (char === '"' && !escaped) inString = !inString;
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

function decodeString(value, line, column) {
  if (!value.endsWith('"')) throw new SharpieError("CS1010", "Newline in constant", line, column);
  const content = value.slice(1, -1);
  let output = "";
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== "\\") {
      output += content[index];
      continue;
    }
    index += 1;
    if (index >= content.length) throw new SharpieError("CS1009", "Unrecognized escape sequence", line, column);
    const escapes = { n: "\n", r: "\r", t: "\t", "\\": "\\", '"': '"', "0": "\0" };
    if (!(content[index] in escapes)) throw new SharpieError("CS1009", `Unrecognized escape sequence \\${content[index]}`, line, column);
    output += escapes[content[index]];
  }
  return output;
}

function splitPlus(expression) {
  const parts = [];
  let buffer = "";
  let inString = false;
  let escaped = false;
  for (const char of expression) {
    if (inString && char === "\\" && !escaped) {
      escaped = true;
      buffer += char;
      continue;
    }
    if (char === '"' && !escaped) inString = !inString;
    escaped = false;
    if (char === "+" && !inString) {
      parts.push(buffer);
      buffer = "";
    } else {
      buffer += char;
    }
  }
  parts.push(buffer);
  return parts;
}

function evaluateAtom(expression, variables, line, column) {
  const value = expression.trim();
  if (!value) throw new SharpieError("CS1525", "Invalid expression term ')'", line, column);
  if (value.startsWith('"')) return decodeString(value, line, column);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if (variables.has(value)) return variables.get(value);
  throw new SharpieError("CS0103", `The name '${value}' does not exist in the current context`, line, column);
}

function evaluateExpression(expression, variables, line, column) {
  const parts = splitPlus(expression);
  const values = parts.map((part) => evaluateAtom(part, variables, line, column));
  if (values.length === 1) return values[0];
  if (values.some((value) => typeof value === "string")) return values.join("");
  if (values.every((value) => typeof value === "number")) return values.reduce((sum, value) => sum + value, 0);
  throw new SharpieError("CS0019", "Operator '+' cannot be applied to these values", line, column);
}

function runBasics(code) {
  const started = performance.now();
  if (!code.trim()) {
    return {
      success: true,
      output: "",
      durationMs: 0,
    };
  }
  if (code.length > CODE_LIMIT) throw new SharpieError("SHARP001", `Keep the experiment under ${CODE_LIMIT} characters.`);

  const variables = new Map();
  let output = "";
  let truncated = false;

  for (const statement of splitStatements(code)) {
    const declaration = /^(string|int|double|bool|var)\s+([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(statement.text);
    if (declaration) {
      variables.set(declaration[2], evaluateExpression(declaration[3], variables, statement.line, statement.column));
      continue;
    }

    const writeLine = /^Console\s*\.\s*WriteLine\s*\(([\s\S]*)\)$/.exec(statement.text);
    if (!writeLine) {
      if (/^Console\s*\.\s*WriteLine/.test(statement.text)) {
        throw new SharpieError("CS1026", ") expected", statement.line, statement.column + statement.text.length);
      }
      throw new SharpieError("SHARP001", "Only Console.WriteLine and simple variables are available in this playground.", statement.line, statement.column);
    }

    const value = writeLine[1].trim()
      ? evaluateExpression(writeLine[1], variables, statement.line, statement.column)
      : "";
    const next = `${String(value)}\n`;
    const remaining = OUTPUT_LIMIT - output.length;
    if (remaining > 0) output += next.slice(0, remaining);
    if (next.length > remaining) truncated = true;
  }

  return {
    success: true,
    output,
    durationMs: Math.max(1, Math.round(performance.now() - started)),
    truncated,
  };
}

self.addEventListener("message", (event) => {
  const { requestId, code } = event.data ?? {};
  if (!requestId || typeof code !== "string") return;

  self.postMessage({ type: "compiled", requestId });
  setTimeout(() => {
    try {
      self.postMessage({ type: "response", requestId, result: runBasics(code) });
    } catch (error) {
      const sharpieError = error instanceof SharpieError
        ? error
        : new SharpieError("CS1525", error instanceof Error ? error.message : String(error));
      self.postMessage({
        type: "response",
        requestId,
        result: {
          success: false,
          output: "",
          durationMs: 1,
          error: errorDetails(sharpieError),
        },
      });
    }
  }, 80);
});

self.postMessage({ type: "ready" });
