import { ArrowLeft, ArrowRight, Check, ChevronDown, Database, Power, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Brand } from "../components/Brand";
import { memoryProgress } from "../lib/memoryProgress";

type MemoryData = {
  name: string;
  age: string;
  favoriteFood: string;
  likes: string;
};

type Stage = "opening" | "booting" | "collect" | "recall" | "update" | "concept" | "map" | "variable" | "final";
type MemoryKey = keyof MemoryData;

const questionKeys: MemoryKey[] = ["name", "age", "favoriteFood", "likes"];
const keyLabels: Record<MemoryKey, string> = {
  name: "name",
  age: "age",
  favoriteFood: "favoriteFood",
  likes: "likes",
};

function csharpString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function MemoryMachineExperience({
  initialName,
  onBack,
  onComplete,
}: {
  initialName: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [stage, setStage] = useState<Stage>("opening");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [data, setData] = useState<MemoryData>({ name: "", age: "", favoriteFood: "", likes: "" });
  const [entry, setEntry] = useState("");
  const [otherSelected, setOtherSelected] = useState(false);
  const [transfer, setTransfer] = useState<{ key: MemoryKey; value: string; response: string } | null>(null);
  const [recallCount, setRecallCount] = useState(1);
  const [replacement, setReplacement] = useState("");
  const [updateDone, setUpdateDone] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [conceptChoice, setConceptChoice] = useState<number | null>(null);
  const [mapArrows, setMapArrows] = useState(false);
  const [finalStep, setFinalStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === "collect" && !transfer) inputRef.current?.focus();
  }, [stage, questionIndex, transfer, otherSelected]);

  useEffect(() => {
    if (stage !== "recall" || recallCount >= 4) return;
    const timer = window.setTimeout(() => setRecallCount((count) => count + 1), 380);
    return () => window.clearTimeout(timer);
  }, [stage, recallCount]);

  const boot = () => {
    setStage("booting");
    window.setTimeout(() => setStage("collect"), 560);
  };

  const remember = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const key = questionKeys[questionIndex];
    const response = key === "name" ? `${clean}. Got it.` : key === "age" ? `${clean}. Stored.` : "Saved to memory.";
    setData((current) => ({ ...current, [key]: clean }));
    setTransfer({ key, value: clean, response });
    setEntry("");
    window.setTimeout(() => {
      setTransfer(null);
      setOtherSelected(false);
      if (questionIndex === questionKeys.length - 1) {
        setStage("recall");
      } else {
        setQuestionIndex((index) => index + 1);
      }
    }, 540);
  };

  const submitEntry = (event: FormEvent) => {
    event.preventDefault();
    remember(entry);
  };

  const replaceFood = (event: FormEvent) => {
    event.preventDefault();
    const clean = replacement.trim();
    if (!clean || clean === data.favoriteFood) return;
    setUpdating(true);
    window.setTimeout(() => {
      setData((current) => ({ ...current, favoriteFood: clean }));
      setUpdating(false);
      setUpdateDone(true);
    }, 520);
  };

  const complete = () => {
    memoryProgress.completeMemoryMachine();
    onComplete();
  };

  return (
    <section className={`memory-machine screen-enter memory-stage-${stage}`} aria-labelledby="memory-title">
      <header className="memory-machine-header">
        <Brand compact asButton onClick={onBack} />
        <div className="memory-machine-status"><i /> MODULE 02 · MEMORY ONLINE</div>
        <button className="icon-text-button back-button" onClick={onBack}>
          <ArrowLeft size={17} /> <span>MODULE</span>
        </button>
      </header>

      <main className="memory-machine-main">
        {stage === "opening" && (
          <div className="memory-boot-card stage-card">
            <span className="memory-machine-orb"><Database size={42} /></span>
            <p className="memory-kicker">MODULE 02 · EXPERIMENT 01</p>
            <h1 id="memory-title">MEMORY MACHINE</h1>
            <p className="memory-subtitle">Can a machine actually remember you?</p>
            <button className="memory-primary" onClick={boot}><Power size={18} /> TURN IT ON</button>
          </div>
        )}

        {stage === "booting" && (
          <div className="memory-boot-card stage-card boot-sequence" role="status">
            <span className="boot-line">MEMORY SYSTEM</span>
            <strong>BOOTING...</strong>
            <span className="boot-ready"><i /> READY.</span>
          </div>
        )}

        {stage === "collect" && (
          <div className="memory-conversation stage-card">
            <div className="memory-question-progress" aria-label={`Question ${questionIndex + 1} of 4`}>
              {questionKeys.map((key, index) => <i key={key} className={index <= questionIndex ? "active" : ""} />)}
            </div>
            {transfer ? (
              <div className="memory-transfer" role="status">
                <span>WRITING TO MEMORY</span>
                <code><b>{keyLabels[transfer.key]}</b><em>→</em>{transfer.value}</code>
                <p><Check size={17} /> {transfer.response}</p>
              </div>
            ) : (
              <>
                <p className="memory-kicker">INPUT {String(questionIndex + 1).padStart(2, "0")} / 04</p>
                <h1 id="memory-title">
                  {questionIndex === 0 && "What's your name?"}
                  {questionIndex === 1 && `How old are you, ${data.name}?`}
                  {questionIndex === 2 && "What's your favorite food?"}
                  {questionIndex === 3 && "What do you like most?"}
                </h1>

                {questionIndex < 3 ? (
                  <form className="memory-input-form" onSubmit={submitEntry}>
                    <input
                      ref={inputRef}
                      type={questionIndex === 1 ? "number" : "text"}
                      min={questionIndex === 1 ? 1 : undefined}
                      max={questionIndex === 1 ? 120 : undefined}
                      maxLength={32}
                      value={entry}
                      onChange={(event) => setEntry(event.currentTarget.value)}
                      placeholder={questionIndex === 0 ? initialName || "TYPE YOUR NAME" : "TYPE YOUR ANSWER"}
                      aria-label={questionKeys[questionIndex]}
                    />
                    <button type="submit" disabled={!entry.trim()} aria-label="Save answer"><ArrowRight size={20} /></button>
                  </form>
                ) : (
                  <div className="memory-choice-area">
                    <div className="memory-options">
                      {["Games", "Music", "Sports", "Movies"].map((option) => (
                        <button key={option} onClick={() => remember(option)}>{option}</button>
                      ))}
                      <button className={otherSelected ? "selected" : ""} onClick={() => setOtherSelected(true)}>Other</button>
                    </div>
                    {otherSelected && (
                      <form className="memory-input-form compact" onSubmit={submitEntry}>
                        <input ref={inputRef} value={entry} maxLength={32} onChange={(event) => setEntry(event.currentTarget.value)} placeholder="WHAT DO YOU LIKE?" aria-label="Other interest" />
                        <button type="submit" disabled={!entry.trim()} aria-label="Save other interest"><ArrowRight size={20} /></button>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {stage === "recall" && (
          <div className="memory-recall stage-card">
            <p className="memory-kicker">READING MEMORY</p>
            <h1 id="memory-title">Let's check my memory.</h1>
            <div className="recall-lines" aria-live="polite">
              {recallCount >= 1 && <p>Your name is <strong>{data.name}</strong>.</p>}
              {recallCount >= 2 && <p>You're <strong>{data.age}</strong>.</p>}
              {recallCount >= 3 && <p>Your favorite food is <strong>{data.favoriteFood}</strong>.</p>}
              {recallCount >= 4 && <p>You like <strong>{data.likes}</strong>.</p>}
            </div>
            {recallCount >= 4 && <button className="memory-primary compact-button" onClick={() => setStage("update")}>CHANGE A MEMORY <ArrowRight size={17} /></button>}
          </div>
        )}

        {stage === "update" && (
          <div className="memory-update stage-card">
            <p className="memory-kicker">UPDATE MEMORY</p>
            <code className="memory-slot"><b>favoriteFood</b><em>→</em>{data.favoriteFood}</code>
            {!updateDone ? (
              <>
                <h1 id="memory-title">Changed your mind? Replace it.</h1>
                <form className="memory-input-form" onSubmit={replaceFood}>
                  <input value={replacement} maxLength={32} onChange={(event) => setReplacement(event.currentTarget.value)} placeholder="A NEW FAVORITE FOOD" aria-label="New favorite food" />
                  <button type="submit" disabled={!replacement.trim() || updating} aria-label="Replace favorite food"><ArrowRight size={20} /></button>
                </form>
                {updating && <div className="value-replacement"><span>{data.favoriteFood}</span><ChevronDown /><strong>{replacement.trim()}</strong></div>}
              </>
            ) : (
              <div className="update-success">
                <Check size={25} />
                <h1>Same name. New value.</h1>
                <code className="memory-slot"><b>favoriteFood</b><em>→</em>{data.favoriteFood}</code>
                <button className="memory-primary compact-button" onClick={() => setStage("concept")}>CONTINUE <ArrowRight size={17} /></button>
              </div>
            )}
          </div>
        )}

        {stage === "concept" && (
          <div className="memory-concept stage-card">
            <p className="memory-kicker">QUICK CHECK</p>
            <h1 id="memory-title">How am I remembering all this?</h1>
            <div className="concept-options">
              {["I saved the information", "I am guessing", "I am reading your mind"].map((answer, index) => (
                <button
                  key={answer}
                  className={conceptChoice === index ? (index === 0 ? "correct" : "try-again") : ""}
                  onClick={() => setConceptChoice(index)}
                >
                  <span>{index + 1}</span>{answer}{conceptChoice === index && index === 0 && <Check size={18} />}
                </button>
              ))}
            </div>
            {conceptChoice !== null && conceptChoice !== 0 && <p className="concept-feedback">Not quite. Think about what happened after each answer.</p>}
            {conceptChoice === 0 && (
              <div className="concept-correct"><strong>Exactly.</strong><button className="memory-primary compact-button" onClick={() => setStage("map")}>OPEN MEMORY <ArrowRight size={17} /></button></div>
            )}
          </div>
        )}

        {stage === "map" && (
          <div className="memory-map stage-card">
            <p className="memory-kicker">THIS IS WHAT I REMEMBER</p>
            <h1 id="memory-title">MEMORY MAP</h1>
            <div className={`memory-map-code ${mapArrows ? "show-arrows" : ""}`}>
              {(Object.keys(data) as MemoryKey[]).map((key) => (
                <code key={key}><b>{keyLabels[key]}</b><em>{mapArrows ? "→" : "="}</em><span>{data[key]}</span></code>
              ))}
            </div>
            <button className="memory-primary compact-button" onClick={() => mapArrows ? setStage("variable") : setMapArrows(true)}>
              {mapArrows ? "WHAT IS THIS?" : "SEE THE PATTERN"} <ArrowRight size={17} />
            </button>
          </div>
        )}

        {stage === "variable" && (
          <div className="variable-reveal stage-card">
            <p className="memory-kicker">THE IDEA HAS A NAME</p>
            <h1 id="memory-title">VARIABLE</h1>
            <p className="variable-definition">A named place where a program remembers information.</p>
            <div className="variable-diagrams">
              <div><span><b>NAME</b><b>VALUE</b></span><code><strong>name</strong><em>→</em>{data.name}</code></div>
              <div><span><b>NAME</b><b>VALUE</b></span><code><strong>age</strong><em>→</em>{data.age}</code></div>
            </div>
            <button className="memory-primary compact-button" onClick={() => setStage("final")}>CONNECT TO C# <ArrowRight size={17} /></button>
          </div>
        )}

        {stage === "final" && (
          <FinalMemoryWorkspace data={data} step={finalStep} onNext={() => setFinalStep((step) => step + 1)} onComplete={complete} />
        )}
      </main>
    </section>
  );
}

function FinalMemoryWorkspace({ data, step, onNext, onComplete }: { data: MemoryData; step: number; onNext: () => void; onComplete: () => void }) {
  const memoryRows: [string, string][] = [["name", data.name], ["age", data.age], ["favoriteFood", data.favoriteFood], ["likes", data.likes]];
  const output = step === 0
    ? "Memory ready."
    : step === 1
      ? `${data.name}\n${data.age}\n${data.favoriteFood}`
      : `Hello ${data.name}\nI am ${data.age}\nMy favorite food is ${data.favoriteFood}\n${data.name} likes ${data.likes}`;

  return (
    <div className="memory-final">
      <div className="memory-final-heading">
        <div><p className="memory-kicker">FINAL CONNECTION</p><h1 id="memory-title">Your memory, now in C#.</h1></div>
        <span>{Math.min(step + 1, 3)} / 3</span>
      </div>
      <div className="memory-final-workspace">
        <section className="memory-code-panel">
          <header><div><span>01</span><strong>MEMORY MAP</strong></div><small>{step >= 3 ? "C#" : "PSEUDOCODE"}</small></header>
          <div className="memory-code-content">
            {step < 3 ? memoryRows.map(([key, value]) => <code key={key}><b>{key}</b> <em>=</em> <span>{value}</span></code>) : (
              <>
                <HighlightedLine type="string" name="name" value={data.name} />
                <HighlightedLine type="int" name="age" value={data.age} />
                <HighlightedLine type="string" name="favoriteFood" value={data.favoriteFood} />
                <HighlightedLine type="string" name="likes" value={data.likes} />
              </>
            )}
            {step === 1 && <div className="retrieval-code"><code>Console.WriteLine(<b>name</b>);</code><code>Console.WriteLine(<b>age</b>);</code><code>Console.WriteLine(<b>favoriteFood</b>);</code></div>}
            {step >= 2 && step < 3 && (
              <div className="retrieval-code mixed-code">
                <code>Console.WriteLine(<span>"Hello "</span> + <b>name</b>);</code>
                <code>Console.WriteLine(<span>"I am "</span> + <b>age</b>);</code>
                <code>Console.WriteLine(<span>"My favorite food is "</span> + <b>favoriteFood</b>);</code>
                <code>Console.WriteLine(<b>name</b> + <span>" likes "</span> + <b>likes</b>);</code>
              </div>
            )}
          </div>
        </section>
        <section className="memory-console-panel">
          <header><div><span>02</span><strong>{step === 0 ? "EXPLANATION" : "CONSOLE"}</strong></div><small><i /> LIVE</small></header>
          <div className="memory-console-content">
            {step === 0 ? <div className="memory-route"><b>name</b><em>→</em><strong>{data.name}</strong><em>→</em><span>console</span></div> : <pre>{output}</pre>}
            {step === 1 && <p><b>name</b> retrieves <strong>{data.name}</strong> from memory.</p>}
            {step === 2 && <div className="raw-memory-key"><span><b>"Hello "</b><small>RAW TEXT</small></span><em>+</em><span><b>name</b><small>MEMORY</small></span></div>}
            {step >= 2 && <p>C# can mix text you write with information it remembers.</p>}
          </div>
        </section>
      </div>
      <div className="memory-final-footer">
        {step >= 3 ? <p><Sparkles size={16} /> Now you know what the memory does. Next, you create it yourself.</p> : <span />}
        <button className="memory-primary compact-button" onClick={step >= 3 ? onComplete : onNext}>
          {step === 0 && "READ THE MEMORY"}
          {step === 1 && "MIX TEXT + MEMORY"}
          {step === 2 && "SHOW REAL C#"}
          {step >= 3 && "COMPLETE MEMORY MACHINE"}
          {step < 3 ? <ArrowRight size={17} /> : <Check size={17} />}
        </button>
      </div>
    </div>
  );
}

function HighlightedLine({ type, name, value }: { type: "string" | "int"; name: string; value: string }) {
  return <code className="csharp-line"><i>{type}</i> <b>{name}</b> <em>=</em> <span>{type === "string" ? `"${csharpString(value)}"` : value}</span>;</code>;
}
