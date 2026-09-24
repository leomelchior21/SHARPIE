import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { setDiagnostics } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { SyntaxLine } from "../components/SyntaxLine";
import { getStopNote, stopStarter } from "../data/stopStarter";
import { csharpEditorBasicSetup, csharpEditorExtensions } from "../lib/csharpSyntax";
import { executeCSharp, prepareCSharp } from "../lib/runner";
import { buildStopBoard, stopBoardLimits } from "../lib/stopBoard";
import type { StopBoard } from "../lib/stopBoard";
import { stopSession } from "../lib/stopSession";
import type { RunResult, RunnerError } from "../types";

type StopPlaygroundProps = {
  name: string;
  onBack: () => void;
};

export function StopPlayground({ name, onBack }: StopPlaygroundProps) {
  const starter = useMemo(() => stopStarter(name), [name]);
  const [code, setCode] = useState(() => stopSession.getCode() || starter);
  const [result, setResult] = useState<RunResult | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [runPulse, setRunPulse] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const editorRef = useRef<EditorView | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sourceVersionRef = useRef(0);

  const extensions = useMemo(() => csharpEditorExtensions, []);
  const board = useMemo(() => buildStopBoard(code), [code]);
  const previousColumnsRef = useRef(board.columns.length);
  const [boardPulse, setBoardPulse] = useState(0);

  useEffect(() => {
    if (board.columns.length > previousColumnsRef.current) setBoardPulse((value) => value + 1);
    previousColumnsRef.current = board.columns.length;
  }, [board.columns.length]);

  useEffect(() => {
    let active = true;
    prepareCSharp()
      .then(() => {
        if (active) setRuntimeStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRuntimeStatus("error");
        setResult({
          success: false,
          output: "",
          durationMs: 0,
          error: {
            title: "C# COULD NOT LOAD",
            message: "The browser could not start its C# engine yet.",
            compiler: error instanceof Error ? error.message : "Refresh the page and try again.",
          },
        });
      });
    return () => { active = false; };
  }, []);

  const run = useCallback(async () => {
    if (isRunning || runtimeStatus === "loading" || !code.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const sourceVersion = sourceVersionRef.current;
    const submittedCode = code;
    setRunPulse((current) => current + 1);
    setIsRunning(true);
    setResult(null);

    try {
      if (runtimeStatus !== "ready") {
        setRuntimeStatus("loading");
        await prepareCSharp();
        setRuntimeStatus("ready");
      }
      if (sourceVersionRef.current !== sourceVersion) return;

      const nextResult = await executeCSharp(submittedCode, controller.signal);
      if (sourceVersionRef.current !== sourceVersion) return;

      setResult(nextResult);
      setHasRun(true);
    } catch (error) {
      if (sourceVersionRef.current !== sourceVersion) return;

      if ((error as Error).name !== "AbortError") {
        setRuntimeStatus("error");
        setResult({
          success: false,
          output: "",
          durationMs: 0,
          error: {
            title: "C# COULD NOT LOAD",
            message: "The browser could not start its C# engine yet.",
            compiler: error instanceof Error ? error.message : "Refresh the page and try again.",
          },
        });
        setHasRun(true);
      }
    } finally {
      setIsRunning(false);
    }
  }, [code, isRunning, runtimeStatus]);

  useEffect(() => {
    const keyboardRun = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", keyboardRun);
    return () => window.removeEventListener("keydown", keyboardRun);
  }, [run]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    const error = result?.error;
    if (!error?.line) {
      view.dispatch(setDiagnostics(view.state, []));
      return;
    }
    const safeLine = Math.min(Math.max(error.line, 1), view.state.doc.lines);
    const line = view.state.doc.line(safeLine);
    const offset = Math.min(Math.max((error.column ?? 1) - 1, 0), line.length);
    const from = line.from + offset;
    view.dispatch(
      setDiagnostics(view.state, [
        {
          from,
          to: Math.min(from + 1, line.to),
          severity: "error",
          message: error.compiler,
        },
      ]),
    );
  }, [result]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const changeCode = (value: string) => {
    sourceVersionRef.current += 1;
    setCode(value);
    setResult(null);
    setHasRun(false);
    stopSession.setCode(value);
  };

  const reset = () => {
    if (code !== starter) {
      setShowReset(true);
      return;
    }
    setResult(null);
    setHasRun(false);
  };

  const confirmReset = () => {
    changeCode(starter);
    setShowReset(false);
  };

  const sheetComplete = board.columns.length >= stopBoardLimits.maxColumns;
  const statusLabel =
    runtimeStatus === "loading"
      ? "LOADING C#"
      : runtimeStatus === "error"
        ? "RETRY"
        : isRunning
          ? "RUNNING"
          : result?.error
            ? "CHECK CODE"
            : sheetComplete
              ? "STOP READY"
              : board.columns.length
                ? "SHEET LIVE"
                : "C# READY";

  return (
    <section className="playground stop-playground screen-enter" aria-labelledby="stop-title">
      <header className="playground-header">
        <div className="playground-identity">
          <Brand compact asButton onClick={onBack} />
          <span className="header-divider" />
          <div>
            <span>MODULE 03</span>
            <strong id="stop-title">STOP · STRING SHEET</strong>
          </div>
        </div>
        <div className="playground-tools">
          <span className="student-chip"><i /> {name}</span>
          <button className="icon-text-button" onClick={() => setShowHelp(true)}>
            <CircleHelp size={17} /> <span>HELP</span>
          </button>
          <button className="icon-text-button back-button" onClick={onBack}>
            <ArrowLeft size={17} /> <span>HUB</span>
          </button>
        </div>
      </header>

      <div className="workspace">
        <section className="work-panel editor-panel" aria-label="C# code editor">
          <header className="panel-header">
            <div>
              <span className="panel-index">01</span>
              <strong>CODE</strong>
            </div>
            <div className="panel-actions">
              <span className="language-chip">C#</span>
              <button onClick={reset}><RotateCcw size={14} /> RESET</button>
            </div>
          </header>
          <div className="editor-wrap">
            <CodeMirror
              value={code}
              height="100%"
              theme="dark"
              extensions={extensions}
              onChange={changeCode}
              onCreateEditor={(view) => { editorRef.current = view; }}
              basicSetup={csharpEditorBasicSetup}
              editable
              indentWithTab
              aria-label="C# code"
            />
          </div>
          <footer className="editor-footer">
            <span>{code.split("\n").length} LINES</span>
            <span>C# STRINGS</span>
            <span>CTRL / ⌘ + ENTER TO RUN</span>
          </footer>
        </section>

        <section className={`work-panel output-panel stop-panel ${isRunning ? "panel-running" : ""} ${result?.success && hasRun ? "panel-success" : ""} ${runPulse ? `run-flash-${runPulse % 2 ? "a" : "b"}` : ""}`} aria-live="polite">
          <header className="panel-header">
            <div>
              <span className="panel-index">02</span>
              <strong>STOP SHEET</strong>
            </div>
            <div className="panel-actions output-actions">
              <span className={`runtime-status ${runtimeStatus === "ready" ? "status-live" : ""}`}>
                <i /> {statusLabel}
              </span>
              <span className="stop-count-chip">{board.columns.length}/{stopBoardLimits.maxColumns}</span>
            </div>
          </header>

          <div className="console-surface stop-surface">
            {hasRun && result?.error ? <StopErrorBanner error={result.error} /> : null}

            {board.columns.length > 0 ? (
              <StopSheet board={board} complete={sheetComplete} pulse={boardPulse} />
            ) : (
              <div className="empty-output stop-empty">
                <span>&gt;_</span>
                <p>YOUR STOP SHEET IS WAITING.</p>
                <small>
                  CREATE A STRING VARIABLE, THEN PRINT IT WITH A LABEL:
                  <code><SyntaxLine code={'Console.WriteLine("Name: " + answer1);'} /></code>
                </small>
                <StopTips board={board} />
              </div>
            )}

            {hasRun && result?.success && result.output.trim() ? (
              <div className="stop-console">
                <span>LAST OUTPUT</span>
                <pre>{result.output}</pre>
                <div className="output-note"><Sparkles size={14} /> {getStopNote(board)}</div>
              </div>
            ) : null}
          </div>

          <button className="run-button" onClick={() => void run()} disabled={isRunning || runtimeStatus === "loading" || !code.trim()}>
            <span>{isRunning ? "RUNNING" : runtimeStatus === "error" ? "RETRY C#" : "RUN"}</span>
            <Play size={19} fill="currentColor" />
          </button>
        </section>
      </div>

      {showReset && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowReset(false)}>
          <div className="modal reset-modal" role="alertdialog" aria-modal="true" aria-labelledby="stop-reset-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="modal-kicker">RESET CODE</span>
            <h2 id="stop-reset-title">Clear your changes?</h2>
            <p>This brings back the starting sample.</p>
            <div className="modal-actions">
              <button onClick={() => setShowReset(false)}>KEEP MINE</button>
              <button className="modal-primary" onClick={confirmReset}>RESET</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <div className="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="stop-help-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowHelp(false)} aria-label="Close help"><X size={18} /></button>
            <span className="modal-kicker">STOP RULES</span>
            <h2 id="stop-help-title">One variable, many columns.</h2>
            <code><SyntaxLine code={'string answer1 = "Aveiro";'} /></code>
            <code><SyntaxLine code={'Console.WriteLine("City: " + answer1);'} /></code>
            <div className="help-flow"><span>VARIABLE</span><i>+</i><span>LABEL</span><i>→</i><span>COLUMN</span></div>
            <p>One string variable can fill the whole sheet: give it a new value, then print it again with a different label. Every labeled WriteLine is checked and adds a column automatically.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function StopSheet({ board, complete, pulse }: { board: StopBoard; complete: boolean; pulse: number }) {
  const ghostSlots = Math.max(0, stopBoardLimits.maxColumns - board.columns.length);

  return (
    <div className={`stop-board ${complete ? "stop-complete" : ""}`} role="status" aria-label={`STOP sheet with ${board.columns.length} categories`}>
      <div className="stop-board-head">
        <span className="stop-logo" aria-hidden="true">
          {"STOP".split("").map((letter, index) => <i key={index} style={{ "--stop-order": index } as CSSProperties}>{letter}</i>)}
        </span>
      </div>

      <div className="stop-list">
        {board.columns.map((column, index) => (
          <article className="stop-row" key={column.key} style={{ "--stop-order": index } as CSSProperties}>
            <span className="stop-row-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="stop-row-category">
              <strong title={column.label}>{column.label}</strong>
              <span className="stop-row-source" title={`Console.WriteLine("${column.label}: " + ${column.source});`}>
                <SyntaxLine code={column.source} />
              </span>
            </span>
            <span className="stop-row-value">{column.value}</span>
            <span className="stop-row-check"><Check size={13} /> {column.built ? "COMBO" : "VALID"}</span>
          </article>
        ))}
        {Array.from({ length: ghostSlots }).map((_, index) => (
          <div className="stop-row stop-row-ghost" key={`empty-${index}`} aria-hidden="true">
            <span>EMPTY SLOT</span>
            <i />
          </div>
        ))}
      </div>

      {pulse > 0 && <span className="stop-flash" key={pulse} aria-hidden="true" />}

      <div className="stop-board-foot">
        <span>{board.columns.length}/{stopBoardLimits.maxColumns} COLUMNS</span>
        <span className={complete ? "stop-call" : ""}>
          {complete ? "STOP! SHEET COMPLETE" : "KEEP ADDING CATEGORIES"}
        </span>
      </div>

      <StopTips board={board} />
    </div>
  );
}

function StopTips({ board }: { board: StopBoard }) {
  const tips: ReactNode[] = [];
  if (board.unlabeled.length) {
    tips.push(
      <>
        Almost! Add a label before the variable:{" "}
        <code><SyntaxLine code={`Console.WriteLine("Name: " + ${board.unlabeled[0]});`} /></code>
      </>,
    );
  }
  if (board.missing.length) {
    tips.push(<>C# does not know {board.missing.join(", ")} yet. Declare it above the WriteLine.</>);
  }
  if (board.pending.length) {
    tips.push(<>Not on the sheet yet: {board.pending.join(", ")}. Print it with a label to add a column.</>);
  }
  if (!tips.length) return null;

  return (
    <div className="stop-tips">
      {tips.map((tip, index) => <p key={index}><Sparkles size={13} /> <span>{tip}</span></p>)}
    </div>
  );
}

function StopErrorBanner({ error }: { error: RunnerError }) {
  return (
    <div className="stop-error-banner" role="alert">
      <span>{error.code ?? "C#"}</span>
      <div>
        <strong>{error.title}</strong>
        <p>{error.message}</p>
        <code>{error.compiler}</code>
      </div>
    </div>
  );
}
