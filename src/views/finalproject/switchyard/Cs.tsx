// C# coloured with the palette the other modules use: magenta if / else, gold types and numbers,
// red variables, green strings and a cyan Console.WriteLine.
const tokens = /("(?:[^"\\]|\\.)*"|\b(?:if|else)\b|\b(?:int|double|bool)\b|\b(?:true|false)\b|\b\d+(?:\.\d+)?\b|Console\.WriteLine|\b[A-Za-z_]\w*\b)/;
export function Cs({ code }: { code: string }) {
  return <>{code.split(tokens).filter(Boolean).map((part, i) => {
    const kind = part.startsWith('"') ? "str" : /^(if|else)$/.test(part) ? "kw" : /^(int|double|bool)$/.test(part) ? "type" : /^(true|false|\d+(\.\d+)?)$/.test(part) ? "num" : part === "Console.WriteLine" ? "fn" : /^[A-Za-z_]\w*$/.test(part) ? "var" : "";
    return <span key={i} className={kind ? `cs-${kind}` : undefined}>{part}</span>;
  })}</>;
}
