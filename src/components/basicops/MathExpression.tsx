import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type MathExpressionProps = {
  latex: string;
  label: string;
  size?: "lg" | "md" | "sm";
  block?: boolean;
};

export function MathExpression({ latex, label, size = "lg", block = false }: MathExpressionProps) {
  const html = useMemo(() => {
    if (!latex) return null;
    try {
      return katex.renderToString(latex, { throwOnError: true, displayMode: block, strict: false, output: "html" });
    } catch {
      return null;
    }
  }, [latex, block]);

  if (!html) {
    return (
      <span className={`bo-math-fallback bo-math-${size}`} role="img" aria-label={label}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={`bo-math bo-math-${size}`}
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
