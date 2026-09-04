import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, Database, Power, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import { Brand } from "../components/Brand";
import { memoryProgress } from "../lib/memoryProgress";

type MemoryData = {
  name: string;
  age: string;
  countriesVisited: string;
  favoriteFood: string;
  likes: string;
};

type Stage = "opening" | "booting" | "collect" | "recall" | "update" | "concept" | "map" | "variable" | "final";
type MemoryKey = keyof MemoryData;

type VariableType = "string" | "int";

const questionKeys: MemoryKey[] = ["name", "age", "countriesVisited", "favoriteFood", "likes"];
const keyLabels: Record<MemoryKey, string> = {
  name: "name",
  age: "age",
  countriesVisited: "countriesVisited",
  favoriteFood: "favoriteFood",
  likes: "likes",
};

const variableTypes: Record<MemoryKey, VariableType> = {
  name: "string",
  age: "int",
  countriesVisited: "int",
  favoriteFood: "string",
  likes: "string",
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
  const [data, setData] = useState<MemoryData>({ name: "", age: "", countriesVisited: "", favoriteFood: "", likes: "" });
  const [entry, setEntry] = useState("");
  const [otherSelected, setOtherSelected] = useState(false);
  const [transfer, setTransfer] = useState<{ key: MemoryKey; value: string; response: string } | null>(null);
  const [recallCount, setRecallCount] = useState(1);
  const [replacement, setReplacement] = useState("");
  const [updateDone, setUpdateDone] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [conceptChoice, setConceptChoice] = useState<number | null>(null);
  const [valuesRevealed, setValuesRevealed] = useState(false);
  const [variableStep, setVariableStep] = useState(0);
  const [selectedVariable, setSelectedVariable] = useState<MemoryKey | null>(null);
  const [bucketAssignments, setBucketAssignments] = useState<Partial<Record<MemoryKey, VariableType>>>({});
  const [sortResult, setSortResult] = useState<"correct" | "wrong" | null>(null);
  const [finalStep, setFinalStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const transitionTimerRef = useRef<number | null>(null);

  const scheduleTransition = (callback: () => void, delay: number) => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      callback();
    }, delay);
  };

  useEffect(() => {
    if (stage === "collect" && !transfer) inputRef.current?.focus();
  }, [stage, questionIndex, transfer, otherSelected]);

  useEffect(() => {
    if (stage !== "recall" || recallCount >= questionKeys.length) return;
    const timer = window.setTimeout(() => setRecallCount((count) => count + 1), 380);
    return () => window.clearTimeout(timer);
  }, [stage, recallCount]);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
  }, []);

  const boot = () => {
    setStage("booting");
    scheduleTransition(() => setStage("collect"), 560);
  };

  const remember = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const key = questionKeys[questionIndex];
    const response = key === "name" ? `${clean}. Got it.` : variableTypes[key] === "int" ? `${clean}. Stored.` : "Saved to memory.";
    setData((current) => ({ ...current, [key]: clean }));
    setTransfer({ key, value: clean, response });
    setEntry("");
    scheduleTransition(() => {
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
    scheduleTransition(() => {
      setData((current) => ({ ...current, favoriteFood: clean }));
      setUpdating(false);
      setUpdateDone(true);
    }, 520);
  };

  const goBackOneStep = () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setTransfer(null);
    setUpdating(false);

    if (stage === "booting") return setStage("opening");
    if (stage === "collect") {
      if (questionIndex === 0) return setStage("opening");
      const previousIndex = questionIndex - 1;
      setQuestionIndex(previousIndex);
      setEntry(data[questionKeys[previousIndex]]);
      setOtherSelected(questionKeys[previousIndex] === "likes" && !["Games", "Music", "Sports", "Movies"].includes(data.likes));
      return;
    }
    if (stage === "recall") {
      setQuestionIndex(questionKeys.length - 1);
      setEntry(data.likes);
      setOtherSelected(!["Games", "Music", "Sports", "Movies"].includes(data.likes));
      return setStage("collect");
    }
    if (stage === "update") {
      setRecallCount(questionKeys.length);
      return setStage("recall");
    }
    if (stage === "concept") return setStage("update");
    if (stage === "map") return setStage("concept");
    if (stage === "variable") {
      if (variableStep > 0) return setVariableStep((step) => step - 1);
      setValuesRevealed(true);
      return setStage("map");
    }
    if (stage === "final") {
      if (finalStep > 0) return setFinalStep((step) => step - 1);
      setVariableStep(2);
      return setStage("variable");
    }
  };

  const assignVariable = (key: MemoryKey, type: VariableType) => {
    setBucketAssignments((current) => ({ ...current, [key]: type }));
    setSelectedVariable(null);
    setSortResult(null);
  };

  const removeAssignment = (key: MemoryKey) => {
    setBucketAssignments((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSelectedVariable(key);
    setSortResult(null);
  };

  const dropVariable = (event: DragEvent<HTMLElement>, type: VariableType) => {
    event.preventDefault();
    const key = event.dataTransfer.getData("text/plain") as MemoryKey;
    if (questionKeys.includes(key)) assignVariable(key, type);
  };

  const checkBuckets = () => {
    const correct = questionKeys.every((key) => bucketAssignments[key] === variableTypes[key]);
    setSortResult(correct ? "correct" : "wrong");
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

      <main className={`memory-machine-main ${stage !== "opening" ? "has-back" : ""}`}>
        {stage !== "opening" && (
          <button className="memory-step-back" onClick={goBackOneStep} aria-label="Back one step">
            <ChevronLeft size={18} /> <span>BACK</span>
          </button>
        )}
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
            <div className="memory-question-progress" aria-label={`Question ${questionIndex + 1} of ${questionKeys.length}`}>
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
                <p className="memory-kicker">INPUT {String(questionIndex + 1).padStart(2, "0")} / {String(questionKeys.length).padStart(2, "0")}</p>
                <h1 id="memory-title">
                  {questionIndex === 0 && "What's your name?"}
                  {questionIndex === 1 && `How old are you, ${data.name}?`}
                  {questionIndex === 2 && "How many countries have you visited?"}
                  {questionIndex === 3 && "What's your favorite food?"}
                  {questionIndex === 4 && "What do you like most?"}
                </h1>

                {questionKeys[questionIndex] !== "likes" ? (
                  <form className="memory-input-form" onSubmit={submitEntry}>
                    <input
                      ref={inputRef}
                      type={variableTypes[questionKeys[questionIndex]] === "int" ? "number" : "text"}
                      min={questionKeys[questionIndex] === "age" ? 1 : questionKeys[questionIndex] === "countriesVisited" ? 0 : undefined}
                      max={questionKeys[questionIndex] === "age" ? 120 : questionKeys[questionIndex] === "countriesVisited" ? 250 : undefined}
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
                        <button className={data.likes === option ? "selected" : ""} key={option} onClick={() => remember(option)}>{option}</button>
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
              {recallCount >= 3 && <p>You've visited <strong>{data.countriesVisited}</strong> countries.</p>}
              {recallCount >= 4 && <p>Your favorite food is <strong>{data.favoriteFood}</strong>.</p>}
              {recallCount >= 5 && <p>You like <strong>{data.likes}</strong>.</p>}
            </div>
            {recallCount >= questionKeys.length && <button className="memory-primary compact-button" onClick={() => setStage("update")}>CHANGE A MEMORY <ArrowRight size={17} /></button>}
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
            <div className={`memory-map-code ${valuesRevealed ? "show-values" : "categories-only"}`}>
              {(Object.keys(data) as MemoryKey[]).map((key) => (
                <code key={key}>
                  <b>{keyLabels[key]}</b>
                  {valuesRevealed && <><em>→</em><span>{data[key]}</span></>}
                </code>
              ))}
            </div>
            <button className="memory-primary compact-button" onClick={() => valuesRevealed ? setStage("variable") : setValuesRevealed(true)}>
              {valuesRevealed ? "WHAT IS THIS?" : "REVEAL THE VALUES"} <ArrowRight size={17} />
            </button>
          </div>
        )}

        {stage === "variable" && (
          <VariableBucketLesson
            data={data}
            step={variableStep}
            selectedVariable={selectedVariable}
            assignments={bucketAssignments}
            result={sortResult}
            onSelect={setSelectedVariable}
            onAssign={assignVariable}
            onRemove={removeAssignment}
            onDrop={dropVariable}
            onCheck={checkBuckets}
            onNext={() => setVariableStep((step) => step + 1)}
            onContinue={() => { setFinalStep(0); setStage("final"); }}
          />
        )}

        {stage === "final" && (
          <FinalMemoryWorkspace data={data} step={finalStep} onNext={() => setFinalStep((step) => step + 1)} onComplete={complete} />
        )}
      </main>
    </section>
  );
}

type BucketLessonProps = {
  data: MemoryData;
  step: number;
  selectedVariable: MemoryKey | null;
  assignments: Partial<Record<MemoryKey, VariableType>>;
  result: "correct" | "wrong" | null;
  onSelect: (key: MemoryKey | null) => void;
  onAssign: (key: MemoryKey, type: VariableType) => void;
  onRemove: (key: MemoryKey) => void;
  onDrop: (event: DragEvent<HTMLElement>, type: VariableType) => void;
  onCheck: () => void;
  onNext: () => void;
  onContinue: () => void;
};

function VariableBucketLesson({ data, step, selectedVariable, assignments, result, onSelect, onAssign, onRemove, onDrop, onCheck, onNext, onContinue }: BucketLessonProps) {
  if (step < 2) {
    const type: VariableType = step === 0 ? "string" : "int";
    const sampleKey: MemoryKey = type === "string" ? "name" : "countriesVisited";
    return (
      <div className={`variable-reveal stage-card bucket-explanation ${type === "string" ? "bucket-string" : "bucket-int"}`}>
        <p className="memory-kicker">VARIABLE TYPE {step + 1} / 02</p>
        <h1 id="memory-title">Meet <span>{type}</span>.</h1>
        <div className="bucket-explanation-split">
          <div className="bucket-explanation-copy">
            <p className="variable-definition">
              {type === "string" ? "string remembers text. Text values use quotation marks." : "int remembers whole numbers. Number values do not use quotation marks."}
            </p>
            <div className="bucket-value-card">
              <span className="value-card-type">{type}</span>
              <small>{sampleKey}</small>
              <strong>{data[sampleKey]}</strong>
            </div>
            <code className="bucket-code-example">
              {type === "string" ? `string name = "${csharpString(data.name)}";` : `int countriesVisited = ${data.countriesVisited};`}
            </code>
          </div>
          <RealBucket type={type}>
            <code><small>{sampleKey}</small>{data[sampleKey]}</code>
          </RealBucket>
        </div>
        <button className="memory-primary compact-button" onClick={onNext}>
          {step === 0 ? "NEXT: INT" : "SORT YOUR VARIABLES"} <ArrowRight size={17} />
        </button>
      </div>
    );
  }

  const unassigned = questionKeys.filter((key) => !assignments[key]);
  const allAssigned = unassigned.length === 0;

  const renderBucket = (type: VariableType) => (
    <RealBucket
      type={type}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, type)}
      onChoose={selectedVariable ? () => onAssign(selectedVariable, type) : undefined}
    >
      {questionKeys.filter((key) => assignments[key] === type).map((key) => (
        <button className={result === "wrong" && variableTypes[key] !== type ? "misplaced" : ""} key={key} onClick={() => onRemove(key)} aria-label={`Move ${keyLabels[key]} out of ${type}`}>
          <small>{keyLabels[key]}</small>{data[key]}
        </button>
      ))}
    </RealBucket>
  );

  return (
    <div className="variable-reveal stage-card bucket-sort-stage">
      <p className="memory-kicker">YOUR TURN · SORT THE MEMORY</p>
      <h1 id="memory-title">Which bucket does each variable belong in?</h1>
      <p className="bucket-sort-instruction">Drag each card, or tap a card and then choose its bucket.</p>

      <div className="variable-sort-workspace">
        {renderBucket("string")}
        <div className="variable-card-bank" aria-label="Variables waiting to be sorted">
          {unassigned.length ? unassigned.map((key) => (
            <button
              key={key}
              draggable
              className={selectedVariable === key ? "selected" : ""}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", key)}
              onClick={() => onSelect(selectedVariable === key ? null : key)}
            >
              <small>{keyLabels[key]}</small><strong>{data[key]}</strong>
            </button>
          )) : <span><Check size={15} /> ALL VARIABLES PLACED</span>}
        </div>
        {renderBucket("int")}
      </div>

      {result === "wrong" && <p className="bucket-feedback try-again">Not yet. Text goes to string; whole numbers go to int.</p>}
      {result === "correct" && <p className="bucket-feedback correct"><Check size={17} /> Perfect. Every value is in the right type.</p>}
      <button className="memory-primary compact-button" disabled={!allAssigned} onClick={result === "correct" ? onContinue : onCheck}>
        {result === "correct" ? "CONNECT TO C#" : "CHECK THE BUCKETS"} {result === "correct" ? <ArrowRight size={17} /> : <Check size={17} />}
      </button>
    </div>
  );
}

function RealBucket({ type, children, onDragOver, onDrop, onChoose }: { type: VariableType; children: React.ReactNode; onDragOver?: (event: DragEvent<HTMLElement>) => void; onDrop?: (event: DragEvent<HTMLElement>) => void; onChoose?: () => void }) {
  return (
    <section className={`real-bucket ${type}-real-bucket`} onDragOver={onDragOver} onDrop={onDrop}>
      <span className="bucket-handle" aria-hidden="true" />
      <div className="bucket-shell">
        <strong className="bucket-label">{type}</strong>
        <span>{type === "string" ? "TEXT" : "WHOLE NUMBERS"}</span>
        <div className="bucket-contents">{children}</div>
        {onChoose && <button className="bucket-place-button" onClick={onChoose}>PLACE HERE</button>}
      </div>
    </section>
  );
}

function FinalMemoryWorkspace({ data, step, onNext, onComplete }: { data: MemoryData; step: number; onNext: () => void; onComplete: () => void }) {
  const memoryKeys: MemoryKey[] = ["name", "age", "countriesVisited", "favoriteFood", "likes"];
  const printed = memoryKeys.map((key) => data[key]).join("\n");

  return (
    <div className="memory-final">
      <div className="memory-final-heading">
        <div>
          <p className="memory-kicker">FINAL CONNECTION</p>
          <h1 id="memory-title">
            {step === 0 && "Every variable needs a type."}
            {step === 1 && "Add int or string first."}
            {step === 2 && "Write it to the console."}
          </h1>
        </div>
        <span>{Math.min(step + 1, 3)} / 3</span>
      </div>
      <div className="memory-final-workspace">
        <section className="memory-code-panel">
          <header><div><span>01</span><strong>MEMORY MAP</strong></div><small>{step === 0 ? "NO TYPE YET" : "C#"}</small></header>
          <div className={`memory-code-content ${step === 0 ? "big-lines" : ""}`}>
            {step === 0 ? (
              memoryKeys.map((key) => <code key={key}><b>{keyLabels[key]}</b> <em>=</em> <span>{data[key]}</span></code>)
            ) : (
              <>
                {memoryKeys.map((key, index) => step === 1
                  ? <TypedLine key={key} index={index} type={variableTypes[key]} name={keyLabels[key]} value={data[key]} />
                  : <HighlightedLine key={key} type={variableTypes[key]} name={keyLabels[key]} value={data[key]} />)}
                {step === 2 && (
                  <div className="retrieval-code">
                    {memoryKeys.map((key) => <code key={key}>Console.WriteLine(<b>{keyLabels[key]}</b>);</code>)}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
        <section className="memory-console-panel">
          <header><div><span>02</span><strong>{step === 0 ? "EXPLANATION" : "CONSOLE"}</strong></div><small><i /> LIVE</small></header>
          <div className="memory-console-content">
            {step === 0 ? (
              <div className="type-explanation">
                <p>To remember a value, C# needs to know its kind.</p>
                <div className="type-chips">
                  <span className="type-chip string-type"><b>string</b><small>TEXT</small></span>
                  <span className="type-chip int-type"><b>int</b><small>WHOLE NUMBER</small></span>
                </div>
                <p className="type-note">Add it before every variable.</p>
              </div>
            ) : step === 1 ? (
              <div className="type-lead">
                <p>The type always leads. It goes <b>before</b> the name.</p>
                <div className="type-lead-list">
                  {memoryKeys.map((key) => (
                    <div className="type-lead-row" key={key}>
                      <span className={`lead-type ${variableTypes[key]}`}>{variableTypes[key]}</span>
                      <em>→</em>
                      <b>{keyLabels[key]}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <pre>{printed}</pre>
                <p><b>Console.WriteLine</b> prints each variable's value.</p>
              </>
            )}
          </div>
        </section>
      </div>
      <div className="memory-final-footer">
        {step === 2 ? <p><Sparkles size={16} /> Now you know what the memory does. Next, you create it yourself.</p> : <span />}
        <button className="memory-primary compact-button" onClick={step === 2 ? onComplete : onNext}>
          {step === 0 && "ADD int & string"}
          {step === 1 && "READ THE MEMORY"}
          {step === 2 && "COMPLETE MEMORY MACHINE"}
          {step === 2 ? <Check size={17} /> : <ArrowRight size={17} />}
        </button>
      </div>
    </div>
  );
}

function HighlightedLine({ type, name, value }: { type: "string" | "int"; name: string; value: string }) {
  return <code className="csharp-line"><i>{type}</i> <b>{name}</b> <em>=</em> <span>{type === "string" ? `"${csharpString(value)}"` : value}</span>;</code>;
}

function TypedLine({ type, name, value, index }: { type: "string" | "int"; name: string; value: string; index: number }) {
  return (
    <code className="csharp-line typed-line" style={{ "--line-delay": `${index * 0.42}s` } as CSSProperties}>
      <span className={`type-key type-${type}`}>{type}</span> <b>{name}</b> <em>=</em> <span>{type === "string" ? `"${csharpString(value)}"` : value}</span>;
    </code>
  );
}
