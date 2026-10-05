import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";

export type ExpressionEditorHandle = {
  insert: (symbol: string) => void;
  backspace: () => void;
  clear: () => void;
  pulseResult: () => void;
  focus: () => void;
};

type ExpressionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  compact?: boolean;
  focusOnMount?: boolean;
  keypadOnlyOnIPad?: boolean;
};

function isIPad() {
  if (typeof navigator === "undefined") return false;
  return /iPad/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export const ExpressionEditor = forwardRef<ExpressionEditorHandle, ExpressionEditorProps>(function ExpressionEditor(
  { value, onChange, onRun, disabled = false, label = "double result =", ariaLabel = "C# expression after double result", placeholder = "", compact = false, focusOnMount = false, keypadOnlyOnIPad = false },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const keypadOnly = keypadOnlyOnIPad && isIPad();

  useEffect(() => {
    if (focusOnMount && !keypadOnly && !disabled) inputRef.current?.focus();
  }, [focusOnMount, keypadOnly, disabled]);

  const placeCaret = (position: number) => {
    window.requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(position, position);
    });
  };

  const insert = (symbol: string) => {
    const input = inputRef.current;
    if (!input) {
      onChange(value + symbol);
      return;
    }
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const next = value.slice(0, start) + symbol + value.slice(end);
    onChange(next);
    placeCaret(start + symbol.length);
  };

  const backspace = () => {
    const input = inputRef.current;
    if (!input) {
      onChange(value.slice(0, -1));
      return;
    }
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    if (start !== end) {
      onChange(value.slice(0, start) + value.slice(end));
      placeCaret(start);
      return;
    }
    if (start <= 0) {
      input.focus();
      return;
    }
    onChange(value.slice(0, start - 1) + value.slice(start));
    placeCaret(start - 1);
  };

  const clear = () => {
    onChange("");
    placeCaret(0);
  };

  useImperativeHandle(ref, () => ({
    insert,
    backspace,
    clear,
    pulseResult: () => setPulseKey((key) => key + 1),
    focus: () => inputRef.current?.focus(),
  }));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onRun?.();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.value);
  };

  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === inputRef.current) return;
    inputRef.current?.focus();
  };

  return (
    <div className={`bo-editor ${compact ? "bo-editor-compact" : ""}`} onClick={focusInput}>
      <span className="bo-line-no" aria-hidden="true">1</span>
      <div className="bo-editor-line">
        <span
          key={pulseKey}
          className={`bo-code-locked bo-code-prefix ${pulseKey ? (pulseKey % 2 ? "is-pulse-a" : "is-pulse-b") : ""}`}
        >
          {label === "double result =" ? <><span className="bo-code-keyword">double</span> result =</> : label}
        </span>
        <input
          ref={inputRef}
          className="bo-code-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          readOnly={keypadOnly}
          inputMode={keypadOnly ? "none" : undefined}
          aria-label={ariaLabel}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          style={{ width: `${Math.max(placeholder.length, value.length, 2) + 1}ch` }}
        />
        <span className="bo-code-locked bo-code-suffix">;</span>
      </div>
    </div>
  );
});
