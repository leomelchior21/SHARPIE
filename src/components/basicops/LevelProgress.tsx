type LevelProgressProps = {
  total: number;
  completed: number;
  label?: string;
  onSelect?: (step: number) => void;
};

export function LevelProgress({ total, completed, label = "LEVEL PROGRESS", onSelect }: LevelProgressProps) {
  const filled = Math.max(0, Math.min(completed, total));
  return (
    <div className="bo-progress-block" role="group" aria-label={`${label}: ${filled} of ${total}`}>
      <div className="bo-progress-top">
        <span>{label}</span>
        <b>{filled} / {total}</b>
      </div>
      <div className="bo-level-bar">
        {Array.from({ length: total }, (_, index) => {
          const step = index + 1;
          const done = index < filled;
          if (onSelect && done) {
            return (
              <button
                type="button"
                key={index}
                className="is-done"
                aria-label={`Redo ${label.toLowerCase()} step ${step}`}
                title={`Redo step ${step}`}
                onClick={() => onSelect(step)}
              />
            );
          }
          return <i key={index} className={done ? "is-done" : ""} />;
        })}
      </div>
    </div>
  );
}
