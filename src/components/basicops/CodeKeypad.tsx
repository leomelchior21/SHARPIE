import { Delete, Play, RotateCcw } from "lucide-react";

type RunOrigin = { clientX: number; clientY: number };

type CodeKeypadProps = {
  onInsert: (symbol: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onResult?: () => void;
  onRun?: (origin?: RunOrigin) => void;
  disabled?: boolean;
};

type CalcKeyProps = {
  label: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
};

function CalcKey({ label, ariaLabel, className = "", disabled = false, onClick }: CalcKeyProps) {
  return (
    <button
      type="button"
      className={`bo-calc-key ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      aria-disabled={disabled}
    >
      {label}
    </button>
  );
}

export function CodeKeypad({ onInsert, onBackspace, onClear, onResult, onRun, disabled = false }: CodeKeypadProps) {
  return (
    <div className={`bo-calc ${disabled ? "is-disabled" : ""}`}>
      <div className="bo-calc-grid">
        <CalcKey label="7" disabled={disabled} onClick={() => onInsert("7")} />
        <CalcKey label="8" disabled={disabled} onClick={() => onInsert("8")} />
        <CalcKey label="9" disabled={disabled} onClick={() => onInsert("9")} />
        <button type="button" className="bo-calc-key is-back" onClick={onBackspace} disabled={disabled} aria-label="Backspace">
          <Delete size={22} />
        </button>

        <CalcKey label="4" disabled={disabled} onClick={() => onInsert("4")} />
        <CalcKey label="5" disabled={disabled} onClick={() => onInsert("5")} />
        <CalcKey label="6" disabled={disabled} onClick={() => onInsert("6")} />
        <CalcKey label="/" ariaLabel="divide" className="is-slash" disabled={disabled} onClick={() => onInsert("/")} />

        <CalcKey label="1" disabled={disabled} onClick={() => onInsert("1")} />
        <CalcKey label="2" disabled={disabled} onClick={() => onInsert("2")} />
        <CalcKey label="3" disabled={disabled} onClick={() => onInsert("3")} />
        <CalcKey label="*" ariaLabel="multiply" className="is-star" disabled={disabled} onClick={() => onInsert("*")} />

        <CalcKey label="0" disabled={disabled} onClick={() => onInsert("0")} />
        <CalcKey label="." disabled={disabled} onClick={() => onInsert(".")} />
        <CalcKey label="(" ariaLabel="open parenthesis" disabled={disabled} onClick={() => onInsert("(")} />
        <CalcKey label=")" ariaLabel="close parenthesis" disabled={disabled} onClick={() => onInsert(")")} />

        <CalcKey label="+" className="is-plus" disabled={disabled} onClick={() => onInsert("+")} />
        <CalcKey label="−" ariaLabel="minus" className="is-minus" disabled={disabled} onClick={() => onInsert("-")} />
        <CalcKey label="%" ariaLabel="remainder" className="is-percent" disabled={disabled} onClick={() => onInsert("%")} />
        <button type="button" className="bo-calc-key is-run" disabled={disabled} aria-label="Run expression" onClick={(event) => onRun ? onRun({ clientX: event.clientX, clientY: event.clientY }) : onResult?.()}><Play size={24} fill="currentColor" /></button>
      </div>

      <button type="button" className="bo-calc-clear" onClick={onClear} disabled={disabled}>
        <RotateCcw size={16} /> CLEAR
      </button>
    </div>
  );
}
