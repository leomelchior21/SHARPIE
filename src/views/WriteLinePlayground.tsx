import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import { setDiagnostics } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { challenges, getRunNote } from "../data/challenges";
import { executeCSharp, prepareCSharp } from "../lib/runner";
import { session } from "../lib/session";
import type { RunResult } from "../types";

type PlaygroundProps = {
  name: string;
  onBack: () => void;
};

const defaultResult: RunResult = {
  success: true,
  output: "Hello!\n",
  durationMs: 0,
};

export function WriteLinePlayground({ name, onBack }: PlaygroundProps) {
  const [challengeId, setChallengeId] = useState(session.getChallenge());
  const challenge = challenges[challengeId - 1];
  const savedCodes = session.getCodes();
  const [code, setCode] = useState(savedCodes[challengeId] ?? challenge.starterCode(name));
  const [result, setResult] = useState<RunResult | null>(challengeId === 1 ? defaultResult : null);
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [completed, setCompleted] = useState<number[]>(session.getCompleted());
  const [runPulse, setRunPulse] = useState(0);
  const [completionFeedback, setCompletionFeedback] = useState<{ challengeId: number; nextId: number | null } | null>(null);
  const [hintIndex, setHintIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<EditorView | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const extensions = useMemo(() => [StreamLanguage.define(csharp)], []);

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

  const selectChallenge = useCallback((id: number) => {
    if (id === challengeId) return;
    session.setCode(challengeId, code);
    session.setChallenge(id);
    const next = challenges[id - 1];
    const saved = session.getCodes()[id];
    setChallengeId(id);
    setCode(saved ?? next.starterCode(name));
    setResult(null);
    setHasRun(false);
    setHintIndex(-1);
    setCompletionFeedback(null);
  }, [challengeId, code, name]);

  const run = useCallback(async () => {
    if (isRunning || runtimeStatus === "loading" || !code.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunPulse((current) => current + 1);
    setCompletionFeedback(null);
    setIsRunning(true);
    setResult(null);

    try {
      if (runtimeStatus !== "ready") {
        setRuntimeStatus("loading");
        await prepareCSharp();
        setRuntimeStatus("ready");
      }
      const nextResult = await executeCSharp(code, controller.signal);
      setResult(nextResult);
      setHasRun(true);

      if (nextResult.success && challenge.isComplete(nextResult.output, name, code)) {
        setCompleted((current) => {
          if (current.includes(challenge.id)) return current;
          const next = [...current, challenge.id].sort((a, b) => a - b);
          session.setCompleted(next);
          return next;
        });
        setCompletionFeedback({
          challengeId: challenge.id,
          nextId: challenge.id < challenges.length ? challenge.id + 1 : null,
        });
      }
    } catch (error) {
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
  }, [challenge, code, isRunning, name, runtimeStatus]);

  useEffect(() => {
    if (!completionFeedback?.nextId || completionFeedback.challengeId !== challengeId) return;
    const timer = window.setTimeout(() => selectChallenge(completionFeedback.nextId!), 1450);
    return () => window.clearTimeout(timer);
  }, [challengeId, completionFeedback, selectChallenge]);

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
    setCode(value);
    session.setCode(challengeId, value);
  };

  const reset = () => {
    const starter = challenge.starterCode(name);
    if (code !== starter) {
      setShowReset(true);
      return;
    }
    setResult(null);
    setHasRun(false);
  };

  const confirmReset = () => {
    const starter = challenge.starterCode(name);
    changeCode(starter);
    setResult(null);
    setHasRun(false);
    setShowReset(false);
  };

  const revealHint = () => setHintIndex((current) => Math.min(current + 1, challenge.hints.length - 1));
  const isChallengeComplete = completed.includes(challenge.id);
  const writeLineCount = (code.match(/Console\s*\.\s*Write(?:Line)?/g) ?? []).length;
  const successNote = result?.success
    ? hasRun
      ? getRunNote(result.output, writeLineCount, challenge.isComplete(result.output, name, code))
      : "One line in. One line out."
    : "";

  const copyOutput = async () => {
    if (!result?.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="playground screen-enter" aria-labelledby="playground-title">
      <header className="playground-header">
        <div className="playground-identity">
          <Brand compact asButton onClick={onBack} />
          <span className="header-divider" />
          <div>
            <span>MODULE 01</span>
            <strong id="playground-title">WRITELINE PLAYGROUND</strong>
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
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                autocompletion: true,
                bracketMatching: true,
                closeBrackets: true,
              }}
              aria-label="C# code"
            />
          </div>
          <footer className="editor-footer">
            <span>{code.split("\n").length} LINES</span>
            <span>C# BASICS</span>
            <span>CTRL / ⌘ + ENTER TO RUN</span>
          </footer>
        </section>

        <section className={`work-panel output-panel ${isRunning || runtimeStatus === "loading" ? "panel-running" : ""} ${result?.success && hasRun ? "panel-success" : ""} ${runPulse ? `run-flash-${runPulse % 2 ? "a" : "b"}` : ""}`} aria-live="polite">
          <header className="panel-header">
            <div>
              <span className="panel-index">02</span>
              <strong>OUTPUT</strong>
            </div>
            <div className="panel-actions output-actions">
              <span className={`runtime-status ${runtimeStatus === "ready" ? "status-live" : ""}`}>
                <i /> {runtimeStatus === "loading" ? "LOADING C#" : isRunning ? "RUNNING" : result?.success && hasRun ? "SIGNAL LIVE" : runtimeStatus === "error" ? "RETRY" : "C# READY"}
              </span>
              <button onClick={copyOutput} disabled={!result?.output} aria-label="Copy output">
                {copied ? <Check size={14} /> : <Clipboard size={14} />}
              </button>
            </div>
          </header>

          <div className="console-surface">
            {isRunning || runtimeStatus === "loading" ? (
              <div className="running-state">
                <span className="run-wave"><i /><i /><i /><i /></span>
                <p>{isRunning ? "RUNNING C# BASICS..." : "STARTING C# BASICS..."}</p>
              </div>
            ) : result?.error ? (
              <div className="error-state">
                <span className="error-label">{result.error.code ?? "C#"}</span>
                <h2>{result.error.title}</h2>
                <p>{result.error.message}</p>
                <div className="compiler-message">
                  <span>COMPILER</span>
                  <code>{result.error.compiler}</code>
                </div>
              </div>
            ) : result ? (
              <div className="output-content">
                <span className="output-prompt">SHARPIE OUTPUT /</span>
                <pre>{result.output || " "}</pre>
                <div className="output-note"><Sparkles size={14} /> {successNote}</div>
              </div>
            ) : (
              <div className="empty-output">
                <span>&gt;_</span>
                <p>YOUR PROGRAM WILL SPEAK HERE.</p>
              </div>
            )}
          </div>

          <button className="run-button" onClick={() => void run()} disabled={isRunning || runtimeStatus === "loading" || !code.trim()}>
            <span>{isRunning ? "RUNNING" : runtimeStatus === "error" ? "RETRY C#" : "RUN"}</span>
            <Play size={19} fill="currentColor" />
          </button>
        </section>
      </div>

      <section className={`challenge-bar ${completionFeedback?.challengeId === challenge.id ? "challenge-complete-flash" : ""}`} aria-labelledby="challenge-title">
        {completionFeedback?.challengeId === challenge.id && (
          <div className="challenge-success-feedback" role="status">
            <span><Check size={16} /> ACTIVITY COMPLETE</span>
            <strong>{completionFeedback.nextId ? "NEXT SIGNAL INCOMING" : "ALL 8 SIGNALS COMPLETE"}</strong>
          </div>
        )}
        <div className="challenge-copy">
          <div className="challenge-number">{String(challenge.id).padStart(2, "0")}<span>/08</span></div>
          <div>
            <span>TASK · {challenge.eyebrow}</span>
            <h2 id="challenge-title">{challenge.title}</h2>
            <p>{challenge.prompt}</p>
          </div>
        </div>

        <div className="hint-zone">
          {hintIndex >= 0 ? (
            <p><span>HINT {hintIndex + 1}</span>{challenge.hints[hintIndex]}</p>
          ) : (
            <p className="hint-empty"><span>STUCK?</span>Reveal one small clue at a time.</p>
          )}
          <button onClick={revealHint} disabled={hintIndex === challenge.hints.length - 1}>
            <CircleHelp size={16} /> {hintIndex < 0 ? "HINT" : "NEXT HINT"}
          </button>
        </div>

        <nav className="challenge-nav" aria-label="WriteLine challenges">
          <button
            className="nav-arrow"
            onClick={() => selectChallenge(Math.max(1, challengeId - 1))}
            disabled={challengeId === 1}
            aria-label="Previous challenge"
          ><ChevronLeft size={18} /></button>
          <div className="challenge-dots">
            {challenges.map((item) => (
              <button
                key={item.id}
                className={`${item.id === challengeId ? "current" : ""} ${completed.includes(item.id) ? "complete" : ""}`}
                onClick={() => selectChallenge(item.id)}
                aria-label={`Challenge ${item.id}${completed.includes(item.id) ? ", complete" : ""}`}
                aria-current={item.id === challengeId ? "step" : undefined}
              >
                {completed.includes(item.id) ? <Check size={11} /> : item.id}
              </button>
            ))}
          </div>
          <button
            className="nav-arrow"
            onClick={() => selectChallenge(Math.min(8, challengeId + 1))}
            disabled={challengeId === 8}
            aria-label="Next challenge"
          ><ChevronRight size={18} /></button>
          <span className={`done-label ${isChallengeComplete ? "is-done" : ""}`}>
            <Check size={13} /> {isChallengeComplete ? "DONE" : "OPEN"}
          </span>
        </nav>
      </section>

      {showReset && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowReset(false)}>
          <div className="modal reset-modal" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="modal-kicker">RESET CODE</span>
            <h2 id="reset-title">Clear your changes?</h2>
            <p>This brings back the starting sample for this challenge.</p>
            <div className="modal-actions">
              <button onClick={() => setShowReset(false)}>KEEP MINE</button>
              <button className="modal-primary" onClick={confirmReset}>RESET</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <div className="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowHelp(false)} aria-label="Close help"><X size={18} /></button>
            <span className="modal-kicker">QUICK HELP</span>
            <h2 id="help-title">C# basics, ready to run.</h2>
            <code><span>int total</span> = <b>6 * 7</b>;</code>
            <div className="help-flow"><span>YOUR CODE</span><i>→</i><span>RUN</span><i>→</i><span>OUTPUT</span></div>
            <p>Use Write or WriteLine, create variables, calculate with operators, and combine text through concatenation or interpolation. Errors are part of the experiment.</p>
          </div>
        </div>
      )}
    </section>
  );
}
