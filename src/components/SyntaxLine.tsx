const tokenPattern =
  /(\/\/.*|"(?:\\.|[^"\\])*"|\bConsole\s*\.\s*(?:Write(?:Line)?|ReadLine)\b|\b(?:string|int|double|bool|char|var)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;

export function SyntaxLine({ code }: { code: string }) {
  const parts = code.split(tokenPattern).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        const className = part.startsWith("//")
          ? "syn-comment"
          : part.startsWith('"')
            ? "syn-string"
            : /^(string|int|double|bool|char|var)$/.test(part)
              ? "syn-type"
              : /^Console\s*\.\s*(?:Write(?:Line)?|ReadLine)$/.test(part)
                ? "syn-method"
                : /^\d+(?:\.\d+)?$/.test(part)
                  ? "syn-number"
                  : /^[A-Za-z_]\w*$/.test(part)
                    ? "syn-variable"
                    : "";
        return <span className={className} key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}
