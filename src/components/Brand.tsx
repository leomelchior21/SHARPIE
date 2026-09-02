type BrandProps = {
  compact?: boolean;
  asButton?: boolean;
  onClick?: () => void;
};

export function Brand({ compact = false, asButton = false, onClick }: BrandProps) {
  const content = (
    <>
      <span className="brand-name">SHARPIE</span>
      <span className="brand-sub">C# PLAYGROUND</span>
    </>
  );

  if (asButton) {
    return (
      <button className={`brand brand-button ${compact ? "brand-compact" : ""}`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={`brand ${compact ? "brand-compact" : ""}`}>{content}</div>;
}
