import { createContext, useContext } from "react";

// Provided by App once someone is signed in: the logo always leads to the homepage.
export const BrandHomeContext = createContext<(() => void) | null>(null);

type BrandProps = {
  compact?: boolean;
};

export function Brand({ compact = false }: BrandProps) {
  const goHome = useContext(BrandHomeContext);
  const content = (
    <>
      <span className="brand-name">SHARPIE</span>
      <span className="brand-sub">C# PLAYGROUND</span>
    </>
  );

  if (goHome) {
    return (
      <button type="button" className={`brand brand-button ${compact ? "brand-compact" : ""}`} onClick={goHome} aria-label="Sharpie home">
        {content}
      </button>
    );
  }

  return <div className={`brand ${compact ? "brand-compact" : ""}`}>{content}</div>;
}
