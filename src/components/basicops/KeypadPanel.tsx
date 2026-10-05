import { Keyboard } from "lucide-react";
import { CodeKeypad } from "./CodeKeypad";

type RunOrigin = { clientX: number; clientY: number };

type KeypadPanelProps = {
  onInsert: (symbol: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onResult?: () => void;
  onRun?: (origin?: RunOrigin) => void;
  disabled?: boolean;
};

export function KeypadPanel({ onInsert, onBackspace, onClear, onResult, onRun, disabled = false }: KeypadPanelProps) {
  return (
    <aside className="bo-keypad-panel" aria-label="Code keypad">
      <header className="panel-header">
        <div>
          <span className="bo-keypad-icon"><Keyboard size={16} /></span>
          <strong>CODE KEYPAD</strong>
        </div>
        <span className="bo-keypad-hint">Tap buttons to type code</span>
      </header>
      <div className="bo-keypad-body">
        <CodeKeypad
          onInsert={onInsert}
          onBackspace={onBackspace}
          onClear={onClear}
          onResult={onResult}
          onRun={onRun}
          disabled={disabled}
        />
      </div>
    </aside>
  );
}
