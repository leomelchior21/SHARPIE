type LevelProgressProps = {
  total: number;
  completed: number;
  label?: string;
};

export function LevelProgress({ total, completed, label = "LEVEL PROGRESS" }: LevelProgressProps) {
  const filled = Math.max(0, Math.min(completed, total));
  return (
    <div className="bo-progress-block" role="img" aria-label={`${label}: ${filled} of ${total}`}>
      <div className="bo-progress-top">
        <span>{label}</span>
        <b>{filled} / {total}</b>
      </div>
      <div className="bo-level-bar" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <i key={index} className={index < filled ? "is-done" : ""} />
        ))}
      </div>
    </div>
  );
}
