export type StopColumn = {
  key: string;
  label: string;
  value: string;
  source: string;
  built: boolean;
};

export type StopBoard = {
  columns: StopColumn[];
  pending: string[];
  unlabeled: string[];
  missing: string[];
};

type StopValue = {
  kind: "string" | "int" | "double" | "bool" | "char";
  value: string | number | boolean;
};

type StopVariable = StopValue & { built: boolean };

const MAX_COLUMNS = 6;

const escapes: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  f: "\f",
  v: "\v",
  "\\": "\\",
  '"': '"',
  "'": "'",
  "0": "\0",
};

function stripComments(source: string) {
  let result = "";
  let inString = false;
  let quote = "";
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
        quote = char;
      } else if (char === quote) {
        inString = false;
        quote = "";
      }
    }
    escaped = false;
  }
  return result;
}

function splitStatements(source: string) {
  const clean = stripComments(source);
  const statements: string[] = [];
  let buffer = "";
  let inString = false;
  let quote = "";
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (inString && char === "\\" && !escaped) {
      escaped = true;
      buffer += char;
      continue;
    }
    if ((char === '"' || char === "'") && !escaped) {
      if (!inString) {
        inString = true;
        quote = char;
      } else if (char === quote) {
        inString = false;
        quote = "";
      }
    }
    escaped = false;
    if (!inString) {
      if (char === "(") depth += 1;
      if (char === ")") depth = Math.max(0, depth - 1);
      if (char === ";" && depth === 0) {
        if (buffer.trim()) statements.push(buffer.trim());
        buffer = "";
        continue;
      }
    }
    buffer += char;
  }
  return statements;
}

function decodeLiteral(content: string) {
  let output = "";
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== "\\") {
      output += content[index];
      continue;
    }
    index += 1;
    if (index >= content.length) break;
    output += escapes[content[index]] ?? content[index];
  }
  return output;
}

function splitTerms(expression: string): string[] | null {
  const terms: string[] = [];
  let buffer = "";
  let inString = false;
  let quote = "";
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (inString && char === "\\" && !escaped) {
      escaped = true;
      buffer += char;
      continue;
    }
    if ((char === '"' || char === "'") && !escaped) {
      if (!inString) {
        inString = true;
        quote = char;
      } else if (char === quote) {
        inString = false;
        quote = "";
      }
    }
    escaped = false;
    if (!inString) {
      if (char === "(") depth += 1;
      if (char === ")") {
        depth -= 1;
        if (depth < 0) return null;
      }
      if (char === "+" && depth === 0) {
        terms.push(buffer.trim());
        buffer = "";
        continue;
      }
    }
    buffer += char;
  }

  if (inString || depth !== 0) return null;
  terms.push(buffer.trim());
  if (terms.some((term) => !term)) return null;
  return terms;
}

function stringLiteral(term: string) {
  if (term.length < 2 || !term.startsWith('"') || !term.endsWith('"')) return null;
  return decodeLiteral(term.slice(1, -1));
}

function formatValue(item: StopValue) {
  if (item.kind === "bool") return item.value ? "True" : "False";
  return String(item.value);
}

function concatenate(left: StopValue, right: StopValue): StopValue {
  if (left.kind === "string" || right.kind === "string" || left.kind === "char" || right.kind === "char") {
    return { kind: "string", value: formatValue(left) + formatValue(right) };
  }
  if (left.kind === "double" || right.kind === "double") {
    return { kind: "double", value: Number(left.value) + Number(right.value) };
  }
  if (left.kind === "int" && right.kind === "int") {
    return { kind: "int", value: Number(left.value) + Number(right.value) };
  }
  return { kind: "string", value: formatValue(left) + formatValue(right) };
}

function evaluateTerm(term: string, variables: Map<string, StopVariable>): StopValue | null {
  const trimmed = term.trim();
  const text = stringLiteral(trimmed);
  if (text !== null) return { kind: "string", value: text };
  if (trimmed.length >= 3 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return { kind: "char", value: decodeLiteral(trimmed.slice(1, -1)) };
  }
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return trimmed.includes(".") ? { kind: "double", value: Number(trimmed) } : { kind: "int", value: Number(trimmed) };
  }
  if (trimmed === "true" || trimmed === "false") return { kind: "bool", value: trimmed === "true" };
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return evaluateExpression(trimmed.slice(1, -1), variables);
  }
  if (/^[A-Za-z_]\w*$/.test(trimmed)) {
    const variable = variables.get(trimmed);
    return variable ? { kind: variable.kind, value: variable.value } : null;
  }
  return null;
}

function evaluateExpression(expression: string, variables: Map<string, StopVariable>): StopValue | null {
  const terms = splitTerms(expression);
  if (!terms) return null;
  let result: StopValue | null = null;
  for (const term of terms) {
    const item = evaluateTerm(term, variables);
    if (!item) return null;
    result = result === null ? item : concatenate(result, item);
  }
  return result;
}

function stripLiterals(term: string) {
  return term.replace(/"(?:\\.|[^"\\])*"/g, " ").replace(/'(?:\\.|[^'\\])*'/g, " ");
}

function termIdentifiers(term: string) {
  return stripLiterals(term)
    .match(/[A-Za-z_]\w*/g)
    ?.filter((token) => token !== "true" && token !== "false") ?? [];
}

function cleanLabel(label: string) {
  return label
    .replace(/^[\s:=\-–—]+/, "")
    .replace(/[\s:=\-–—]+$/, "")
    .trim()
    .toUpperCase();
}

export function buildStopBoard(code: string): StopBoard {
  const variables = new Map<string, StopVariable>();
  const declaredStrings: string[] = [];
  const columns = new Map<string, StopColumn>();
  const printed = new Set<string>();
  const unlabeled: string[] = [];
  const missing: string[] = [];

  const remember = (list: string[], name: string) => {
    if (!list.includes(name)) list.push(name);
  };

  for (const statement of splitStatements(code)) {
    const declaration = /^(string|var|char|int|double|bool)\s+([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(statement);
    if (declaration) {
      const [, declaredType, variableName, expression] = declaration;
      const evaluated = evaluateExpression(expression, variables);
      if (!evaluated) continue;
      const compatible =
        declaredType === "var" ||
        declaredType === evaluated.kind ||
        (declaredType === "double" && evaluated.kind === "int");
      if (!compatible) continue;
      const kind = declaredType === "var" ? evaluated.kind : (declaredType as StopValue["kind"]);
      variables.set(variableName, {
        kind,
        value: evaluated.value,
        built: (splitTerms(expression)?.length ?? 0) > 1,
      });
      if (kind === "string") remember(declaredStrings, variableName);
      continue;
    }

    const assignment = /^([A-Za-z_]\w*)\s*(=|\+=)\s*([\s\S]+)$/.exec(statement);
    if (assignment) {
      const [, variableName, operator, expression] = assignment;
      const current = variables.get(variableName);
      if (!current) continue;
      const right = evaluateExpression(expression, variables);
      if (!right) continue;
      if (operator === "+=") {
        const combined = concatenate(current, right);
        variables.set(variableName, { ...combined, built: true });
      } else {
        variables.set(variableName, {
          kind: current.kind,
          value: right.value,
          built: (splitTerms(expression)?.length ?? 0) > 1,
        });
      }
      continue;
    }

    const write = /^Console\s*\.\s*WriteLine\s*\(([\s\S]*)\)$/.exec(statement);
    if (!write) continue;
    const argument = write[1].trim();
    if (!argument) continue;
    const terms = splitTerms(argument);
    if (!terms) continue;

    const label = terms.length > 1 ? stringLiteral(terms[0]) : null;
    const valueTerms = label !== null ? terms.slice(1) : terms;
    const identifiers = valueTerms.flatMap(termIdentifiers);
    if (identifiers.length === 0) continue;

    const evaluated = evaluateExpression(valueTerms.join(" + "), variables);
    if (!evaluated) {
      identifiers.forEach((identifier) => {
        if (!variables.has(identifier)) remember(missing, identifier);
      });
      continue;
    }

    if (label === null) {
      identifiers.forEach((identifier) => remember(unlabeled, identifier));
      continue;
    }

    const columnLabel = cleanLabel(label) || (identifiers[0] ?? "").toUpperCase();
    const value = formatValue(evaluated);
    columns.set(columnLabel, {
      key: columnLabel,
      label: columnLabel,
      value,
      source: identifiers.join(" + "),
      built: valueTerms.length > 1 || identifiers.some((identifier) => variables.get(identifier)?.built),
    });
    identifiers.forEach((identifier) => printed.add(identifier));
  }

  return {
    columns: [...columns.values()],
    pending: declaredStrings.filter((variableName) => !printed.has(variableName)),
    unlabeled,
    missing,
  };
}

export const stopBoardLimits = { maxColumns: MAX_COLUMNS };
