import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import { ArrowRight, Check, Sparkles } from "lucide-react";
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
const csharpExtension = StreamLanguage.define(csharp);

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
  ].join("\n");
}

function hasWriteLine(code: string, key: MemoryKey) {
  return new RegExp(`Console\\s*\\.\\s*WriteLine\\s*\\(\\s*${key}\\s*\\)\\s*;`).test(code);
}

export function FinalMemoryWorkspaceV2({ data, screen, typeReveal, consoleStep, onTypeReveal, onConsoleStep, onOpenConsole, onComplete }: Props) {
  const extensions = useMemo(() => [csharpExtension], []);
  const [code, setCode] = useState(() => starterCode(data));
  const [editorResult, setEditorResult] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (consoleStep < 5) setEditorResult(null);
  }, [consoleStep]);

  const checkStudentCode = () => {
    const correct = memoryKeys.every((key) => hasWriteLine(code, key));
    setEditorResult(correct ? "correct" : "wrong");
    if (correct) onConsoleStep(5);
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
          <button className="memory-primary compact-button" onClick={() => typeReveal === 0 ? onTypeReveal(1) : typeReveal === 1 ? onTypeReveal(2) : onOpenConsole()}>
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
  const editorVisible = consoleStep >= 4;
  const outputValues = consoleStep >= 5 ? memoryKeys.map((key) => data[key]) : consoleStep >= 4 ? [data.name, data.age] : consoleStep >= 2 ? [data.name] : [];

  const advanceConsole = () => {
    if (consoleStep < 4) onConsoleStep(consoleStep + 1);
    else if (consoleStep === 4) checkStudentCode();
    else onComplete();
  };

  return (
    <div className="memory-final console-builder-screen">
      <div className="memory-final-heading">
        <div><p className="memory-kicker">FINAL CONNECTION</p><h1 id="memory-title">Write it to the console.</h1></div>
        <span>2 / 2</span>
      </div>
      <div className="memory-final-workspace">
        <section className={`memory-code-panel ${editorVisible ? "student-editor-panel" : ""}`}>
          <header><div><span>01</span><strong>{editorVisible ? "YOUR C# CODE" : "C# MEMORY"}</strong></div><small>{editorVisible ? "EDIT" : "C#"}</small></header>
          {editorVisible ? (
            <div className="memory-student-editor">
              <CodeMirror
                value={code}
                height="100%"
                theme="dark"
                extensions={extensions}
                onChange={(value) => { setCode(value); setEditorResult(null); }}
                basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
                aria-label="Complete the Console.WriteLine code"
              />
            </div>
          ) : (
            <div className="memory-code-content console-code-content">
              {memoryKeys.map((key) => (
                <DeclarationLine key={key} type={variableTypes[key]} name={key} value={data[key]} highlighted={(consoleStep === 2 && key === "name") || (consoleStep === 4 && key === "age")} />
              ))}
              {(firstLineVisible || secondLineVisible) && (
                <div className="retrieval-code guided-retrieval">
                  {firstLineVisible && <code className={`typewriter-code ${consoleStep === 2 ? "run-link-pulse" : ""}`}>Console.WriteLine(<b>name</b>);</code>}
                  {secondLineVisible && <code className={`typewriter-code second-code ${consoleStep === 4 ? "run-link-pulse" : ""}`}>Console.WriteLine(<b>age</b>);</code>}
                </div>
              )}
            </div>
          )}
        </section>
        <section className={`memory-console-panel console-step-${consoleStep} ${consoleStep === 2 || consoleStep === 4 || consoleStep === 5 ? "console-success-glow" : ""}`}>
          <header><div><span>02</span><strong>CONSOLE</strong></div><small><i /> LIVE</small></header>
          <div className="memory-console-content align-left">
            {outputValues.length ? <pre>{outputValues.join("\n")}</pre> : <span className="console-waiting">Nothing printed yet.</span>}
            {consoleStep === 0 && <p>Add a WriteLine instruction for the first variable.</p>}
            {consoleStep === 1 && <p>The instruction is ready. Run it to retrieve <b>name</b>.</p>}
            {consoleStep === 2 && <p><b>name</b> was replaced by the value it remembers.</p>}
            {consoleStep === 3 && <p>Now run the new line to retrieve <b>age</b>.</p>}
            {consoleStep === 4 && <div className="student-code-task"><strong>Your turn.</strong><p>Add WriteLine instructions for <code>countriesVisited</code>, <code>favoriteFood</code>, and <code>likes</code>.</p></div>}
            {consoleStep === 5 && <div className="student-code-task success"><Check size={18} /><strong>All five values retrieved.</strong></div>}
          </div>
        </section>
      </div>
      <div className="memory-final-footer">
        {editorResult === "wrong" ? <p className="editor-feedback wrong">Not yet. Add one WriteLine for each of the three remaining variables.</p> : consoleStep === 5 ? <p><Sparkles size={16} /> You created memory and retrieved it with C#.</p> : <span />}
        <button className="memory-primary compact-button" onClick={advanceConsole}>
          {consoleStep === 0 && "ADD WRITELINE FOR NAME"}
          {consoleStep === 1 && "RUN FIRST LINE"}
          {consoleStep === 2 && "ADD WRITELINE FOR AGE"}
          {consoleStep === 3 && "RUN SECOND LINE"}
          {consoleStep === 4 && "CHECK MY CODE"}
          {consoleStep === 5 && "COMPLETE MEMORY MACHINE"}
          {consoleStep === 1 || consoleStep === 3 || consoleStep >= 4 ? <Check size={17} /> : <ArrowRight size={17} />}
        </button>
      </div>
    </div>
  );
}

function DeclarationLine({ type, name, value, highlighted }: { type: VariableType; name: MemoryKey; value: string; highlighted: boolean }) {
  return <code className={`csharp-line ${highlighted ? "run-link-pulse" : ""}`}><i>{type}</i> <b>{name}</b> <em>=</em> <span>{type === "string" ? `"${escapeString(value)}"` : value}</span>;</code>;
}
