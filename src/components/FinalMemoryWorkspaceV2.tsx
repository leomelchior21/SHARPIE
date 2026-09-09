import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { csharpEditorBasicSetup, csharpEditorExtensions } from "../lib/csharpSyntax";
import type { MemoryData } from "../views/MemoryMachineExperience";

type Props = {
  data: MemoryData;
  screen: number;
  typeReveal: number;
  consoleStep: number;
  onTypeReveal: (step: number) => void;
  onConsoleStep: (step: number) => void;
  onOpenConsole: () => void;
  onComplete: () => void;
};

type MemoryKey = keyof MemoryData;
type VariableType = "string" | "int";

const memoryKeys: MemoryKey[] = ["name", "age", "countriesVisited", "favoriteFood", "likes"];
const variableTypes: Record<MemoryKey, VariableType> = {
  name: "string",
  age: "int",
  countriesVisited: "int",
  favoriteFood: "string",
  likes: "string",
};

function escapeString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function declaration(type: VariableType, key: MemoryKey, value: string) {
  return `${type} ${key} = ${type === "string" ? `"${escapeString(value)}"` : value};`;
}

function starterCode(data: MemoryData) {
  return [
    ...memoryKeys.map((key) => declaration(variableTypes[key], key, data[key])),
    "",
    "Console.WriteLine(name);",
    "Console.WriteLine(age);",
    "",
    "// Add the other three WriteLine statements here.",
    "",
  ].join("\n");
}

function hasWriteLine(code: string, key: MemoryKey) {
  return new RegExp(`Console\\s*\\.\\s*WriteLine\\s*\\(\\s*${key}\\s*\\)\\s*;`).test(code);
}

function StudentTurnInstruction() {
  return (
    <div className="student-turn-copy">
      <strong>Your turn.</strong>
      <p>Add WriteLine instructions for <code>countriesVisited</code>, <code>favoriteFood</code>, and <code>likes</code>.</p>
    </div>
  );
}

export function FinalMemoryWorkspaceV2({ data, screen, typeReveal, consoleStep, onTypeReveal, onConsoleStep, onOpenConsole, onComplete }: Props) {
  const extensions = useMemo(() => csharpEditorExtensions, []);
  const [code, setCode] = useState(() => starterCode(data));
  const [editorResult, setEditorResult] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (consoleStep < 5) setEditorResult(null);
  }, [consoleStep]);

  const checkStudentCode = () => {
    const correct = memoryKeys.every((key) => hasWriteLine(code, key));
    setEditorResult(correct ? "correct" : "wrong");
    if (correct) onConsoleStep(6);
  };

  const resetStudentCode = () => {
    setCode(starterCode(data));
    setEditorResult(null);
  };

  if (screen === 0) {
    return (
      <div className="memory-final type-builder-screen">
        <div className="memory-final-heading">
          <div><p className="memory-kicker">FINAL CONNECTION</p><h1 id="memory-title">Every variable needs a type.</h1></div>
          <span>1 / 2</span>
        </div>
        <div className="memory-final-workspace">
          <section className="memory-code-panel">
            <header><div><span>01</span><strong>MEMORY MAP</strong></div><small>ADD THE TYPES</small></header>
            <div className="memory-code-content type-builder-code">
              {memoryKeys.map((key, index) => {
                const type = variableTypes[key];
                const visible = type === "string" ? typeReveal >= 1 : typeReveal >= 2;
                const order = type === "string" ? ["name", "favoriteFood", "likes"].indexOf(key) : ["age", "countriesVisited"].indexOf(key);
                return (
                  <code className="type-builder-line" key={key}>
                    <span className="type-prefix-slot">
                      {visible && <i className={`typed-prefix prefix-${type}`} style={{ "--type-delay": `${Math.max(order, 0) * 0.16}s` } as CSSProperties}>{type}</i>}
                    </span>
                    <b>{key}</b> <em>=</em> <span>{type === "string" ? `"${escapeString(data[key])}"` : data[key]}</span>;
                  </code>
                );
              })}
            </div>
          </section>
          <section className="memory-console-panel">
            <header><div><span>02</span><strong>TYPE GUIDE</strong></div><small><i /> READY</small></header>
            <div className="memory-console-content align-left">
              <div className="type-prefix-guide">
                <p>The type goes before the variable name.</p>
                <code><i>string</i><span>tells C# to expect text</span></code>
                <code><i>int</i><span>tells C# to expect a whole number</span></code>
                {typeReveal === 0 && <small>Start with the text variables.</small>}
                {typeReveal === 1 && <small>Great. Now give the number variables their type.</small>}
                {typeReveal === 2 && <strong><Check size={16} /> Every variable now has a type.</strong>}
              </div>
            </div>
          </section>
        </div>
        <div className="memory-final-footer">
          <span />
          <button className="memory-primary compact-button progress-ready" onClick={() => typeReveal === 0 ? onTypeReveal(1) : typeReveal === 1 ? onTypeReveal(2) : onOpenConsole()}>
            {typeReveal === 0 && "ADD STRING"}
            {typeReveal === 1 && "ADD INT"}
            {typeReveal === 2 && "CONTINUE TO CONSOLE"}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  const firstLineVisible = consoleStep >= 1;
  const secondLineVisible = consoleStep >= 3;
  const editorVisible = consoleStep >= 5;
  const outputValues = consoleStep >= 6 ? memoryKeys.map((key) => data[key]) : consoleStep >= 4 ? [data.name, data.age] : consoleStep >= 2 ? [data.name] : [];

  const advanceConsole = () => {
    if (consoleStep < 4) onConsoleStep(consoleStep + 1);
    else if (consoleStep === 4) onConsoleStep(5);
    else if (consoleStep === 5) checkStudentCode();
    else onComplete();
  };

  if (consoleStep === 6) {
    return (
      <div className="memory-final console-builder-screen console-complete-screen">
        <div className="memory-final-heading">
          <div><p className="memory-kicker">FINAL CONNECTION</p><h1 id="memory-title">Write it to the console.</h1></div>
          <span>2 / 2</span>
        </div>
        <div className="console-complete-center">
          <section className="fishing-complete-card" role="status" aria-label="All five values retrieved">
            <div className="fishing-scene" aria-hidden="true">
              <span className="fishing-water" />
              <span className="fishing-person">
                <i className="fishing-head" />
                <i className="fishing-body" />
                <i className="fishing-arm" />
                <i className="fishing-leg one" />
                <i className="fishing-leg two" />
              </span>
              <span className="fishing-rod" />
              <span className="fishing-line" />
              <span className="fishing-fish"><i /></span>
            </div>
            <div className="fishing-complete-copy">
              <strong>All five values retrieved.</strong>
              <p>The program caught every memory with <code className="console-method">Console.WriteLine</code>.</p>
            </div>
            <pre className="fishing-output">{outputValues.join("\n")}</pre>
            <button className="memory-primary compact-button progress-ready" onClick={onComplete}>
              COMPLETE MEMORY MACHINE <Check size={17} />
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-final console-builder-screen">
      <div className="memory-final-heading">
        <div><p className="memory-kicker">FINAL CONNECTION</p><h1 id="memory-title">Write it to the console.</h1></div>
        <span>2 / 2</span>
      </div>
      <div className="memory-final-workspace">
        <section className={`memory-code-panel ${editorVisible ? "student-editor-panel" : ""}`}>
          <header>
            <div><span>01</span><strong>{editorVisible ? "YOUR C# CODE" : "C# MEMORY"}</strong></div>
            <div className="memory-code-header-actions">
              {editorVisible && <button onClick={resetStudentCode} aria-label="Reset final code"><RotateCcw size={13} /> RESET</button>}
              <small>{editorVisible ? "EDIT" : "C#"}</small>
            </div>
          </header>
          {editorVisible ? (
            <div className="memory-student-editor">
              <CodeMirror
                value={code}
                height="100%"
                theme="dark"
                extensions={extensions}
                onChange={(value) => { setCode(value); setEditorResult(null); }}
                basicSetup={csharpEditorBasicSetup}
                editable
                indentWithTab
                aria-label="Complete the console C# code editor"
              />
            </div>
          ) : (
            <div className="memory-code-content console-code-content">
              {memoryKeys.map((key) => (
                <DeclarationLine key={key} type={variableTypes[key]} name={key} value={data[key]} highlighted={(consoleStep === 2 && key === "name") || (consoleStep === 4 && key === "age")} />
              ))}
              {(firstLineVisible || secondLineVisible) && (
                <div className="retrieval-code guided-retrieval">
                  {firstLineVisible && <code className={`typewriter-code ${consoleStep === 2 ? "run-link-pulse" : ""}`}><span className="console-method">Console.WriteLine</span>(<b>name</b>);</code>}
                  {secondLineVisible && <code className={`typewriter-code second-code ${consoleStep === 4 ? "run-link-pulse" : ""}`}><span className="console-method">Console.WriteLine</span>(<b>age</b>);</code>}
                </div>
              )}
            </div>
          )}
        </section>
        <section className={`memory-console-panel console-step-${consoleStep} ${consoleStep === 2 || consoleStep === 4 || consoleStep === 6 ? "console-success-glow" : ""}`}>
          <header><div><span>02</span><strong>CONSOLE</strong></div><small><i /> LIVE</small></header>
          <div className={`memory-console-content align-left ${consoleStep >= 4 ? "student-task-visible" : ""}`}>
            {consoleStep >= 4 && (
              <div className={`student-code-task prominent ${consoleStep === 4 ? "try-card" : ""}`}>
                <StudentTurnInstruction />
                {consoleStep === 4 && (
                  <button className="memory-primary compact-button student-try-button progress-ready" onClick={advanceConsole}>
                    TRY IT <ArrowRight size={17} />
                  </button>
                )}
              </div>
            )}
            <div className={consoleStep >= 5 ? "console-output-box" : ""}>
              {outputValues.length ? <pre>{outputValues.join("\n")}</pre> : <span className="console-waiting">Nothing printed yet.</span>}
            </div>
            {consoleStep === 0 && <p>Add a WriteLine instruction for the first variable.</p>}
            {consoleStep === 1 && <p>The instruction is ready. Run it to retrieve <b>name</b>.</p>}
            {consoleStep === 2 && <p><b>name</b> was replaced by the value it remembers.</p>}
            {consoleStep === 3 && <p>Now run the new line to retrieve <b>age</b>.</p>}
          </div>
        </section>
      </div>
      <div className="memory-final-footer">
        {editorResult === "wrong" ? <p className="editor-feedback wrong">Not yet. Add one WriteLine for each of the three remaining variables.</p> : <span />}
        {consoleStep !== 4 && (
          <button className={`memory-primary compact-button progress-ready ${consoleStep === 1 || consoleStep === 3 ? "run-action" : ""}`} onClick={advanceConsole}>
            {consoleStep === 0 && "ADD WRITELINE FOR NAME"}
            {consoleStep === 1 && "RUN FIRST LINE"}
            {consoleStep === 2 && "ADD WRITELINE FOR AGE"}
            {consoleStep === 3 && "RUN SECOND LINE"}
            {consoleStep === 5 && "CHECK MY CODE"}
            {consoleStep === 1 || consoleStep === 3 || consoleStep === 5 ? <Check size={17} /> : <ArrowRight size={17} />}
          </button>
        )}
      </div>
    </div>
  );
}

function DeclarationLine({ type, name, value, highlighted }: { type: VariableType; name: MemoryKey; value: string; highlighted: boolean }) {
  return <code className={`csharp-line ${highlighted ? "run-link-pulse" : ""}`}><i>{type}</i> <b>{name}</b> <em>=</em> <span className={type === "string" ? "code-string" : "code-number"}>{type === "string" ? `"${escapeString(value)}"` : value}</span>;</code>;
}
