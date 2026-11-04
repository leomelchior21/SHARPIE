// C# coloured like the explainer video: keywords purple, types blue, numbers and bools teal, strings gold.
const tokens = /("(?:[^"\\]|\\.)*"|\b(?:if|else)\b|\b(?:int|double|bool)\b|\b(?:true|false)\b|\b\d+(?:\.\d+)?\b|Console\.WriteLine)/;
export function Cs({ code }: { code: string }) {
  return <>{code.split(tokens).filter(Boolean).map((part, i) => {
    const kind = part.startsWith('"') ? "str" : /^(if|else)$/.test(part) ? "kw" : /^(int|double|bool)$/.test(part) ? "type" : /^(true|false|\d+(\.\d+)?)$/.test(part) ? "num" : part === "Console.WriteLine" ? "fn" : "";
    return <span key={i} className={kind ? `cs-${kind}` : undefined}>{part}</span>;
  })}</>;
}
