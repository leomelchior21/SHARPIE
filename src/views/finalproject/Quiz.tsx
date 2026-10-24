import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Flame, RotateCcw, X } from "lucide-react";
import { questions } from "./content";
import { award, type Progress, type Update } from "./progress";
import { LabCode } from "./LabParts";
import { questionTrace } from "./labStories";

const ADVANCE_MS = 2200;

export function Quiz({ progress: p, update }: { progress: Progress; update: Update }) {
  const [review, setReview] = useState(p.quizIndex >= questions.length);
  const [feedback, setFeedback] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const q = questions[p.quizIndex];
  const correct = feedback !== null && q && feedback === q.answer;

  const advance = () => {
    setFeedback(null);
    update((current) => ({ ...current, quizIndex: Math.min(questions.length, current.quizIndex + 1) }));
  };
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  // A right answer moves on by itself; a wrong one waits so the explanation can be read.
  useEffect(() => {
    if (!correct) return;
    const timer = setTimeout(() => advanceRef.current(), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [correct]);

  useEffect(() => { if (p.quizIndex >= questions.length) setReview(true); }, [p.quizIndex]);

  const choose = (answer: number) => {
    if (feedback !== null) return;
    setFeedback(answer);
    setStreak((value) => answer === q.answer ? value + 1 : 0);
    update((current) => {
      const next = { ...current, answers: { ...current.answers, [q.id]: answer }, attempts: { ...current.attempts, [q.id]: (current.attempts[q.id] ?? 0) + 1 }, mastered: answer === q.answer ? [...new Set([...current.mastered, q.id])] : current.mastered };
      return answer === q.answer ? award(next, `quiz:${q.id}`, 10) : next;
    });
  };

  const practice = (index: number) => { setReview(false); setFeedback(null); update((current) => ({ ...current, quizIndex: index })); };

  if (review || !q) {
    const right = questions.filter((item) => p.answers[item.id] === item.answer).length;
    const firstWrong = questions.findIndex((item) => p.answers[item.id] !== undefined && p.answers[item.id] !== item.answer);
    const firstOpen = questions.findIndex((item) => p.answers[item.id] === undefined);
    return <section className="lab-review">
      <header className="lab-review-head">
        <div className="lab-score" style={{ "--score": right / questions.length } as CSSProperties}><b>{right}</b><span>/ {questions.length}</span></div>
        <div>
          <small>CODE REVIEW · SAVED RESULTS</small>
          <h1>{right === questions.length ? "Every review approved." : `${right} of ${questions.length} reviews right.`}</h1>
          <p>{p.mastered.length} / {questions.length} concepts practiced correctly at least once. Practice never removes XP.</p>
        </div>
        <div className="lab-review-actions">
          {firstOpen >= 0 && <button className="fp-primary" onClick={() => practice(firstOpen)}>RESUME / PRACTICE</button>}
          {firstWrong >= 0 && <button className="fp-primary" onClick={() => practice(firstWrong)}><RotateCcw size={14} /> PRACTICE MISTAKES</button>}
          <button onClick={() => practice(0)}>Practice from question 1</button>
        </div>
      </header>
      <ol className="lab-review-grid">{questions.map((item, index) => {
        const answer = p.answers[item.id];
        const state = answer === undefined ? "open" : answer === item.answer ? "right" : "wrong";
        return <li key={item.id}><button className={`is-${state}`} onClick={() => practice(index)} aria-label={`Question ${index + 1}, ${item.concept}: ${state === "open" ? "not answered" : state === "right" ? "correct" : "review this idea"}`}>
          <b>{String(index + 1).padStart(2, "0")}</b>
          <span>{item.concept}</span>
          {state === "right" ? <Check size={15} /> : state === "wrong" ? <X size={15} /> : <i />}
        </button></li>;
      })}</ol>
    </section>;
  }

  const trace = feedback !== null ? questionTrace(q) : null;
  return <section className="lab-quiz">
    <header className="lab-quiz-head">
      <div>
        <small>CODE REVIEW · QUESTION {p.quizIndex + 1} / {questions.length} · {q.concept.toUpperCase()}</small>
        <h1>{q.prompt}</h1>
      </div>
      <div className="lab-quiz-meta">
        {streak >= 2 && <span className="lab-streak"><Flame size={15} /> {streak} IN A ROW</span>}
        <ol className="lab-dots" aria-label="Quiz progress">{questions.map((item, index) => {
          const answer = p.answers[item.id];
          return <li key={item.id} className={`${index === p.quizIndex ? "is-now" : ""} ${answer === undefined ? "" : answer === item.answer ? "is-right" : "is-wrong"}`} />;
        })}</ol>
      </div>
    </header>
    <div className="lab-quiz-grid">
      <div className="lab-panel lab-quiz-code">
        <div className="lab-panel-label">READ THE CODE · C#</div>
        <LabCode code={q.code} states={trace?.lines} />
        {trace?.condition && <div className={`lab-eval ${trace.condition.result ? "is-true" : "is-false"}`}><code>{trace.condition.code}</code><b>→ {String(trace.condition.result)}</b></div>}
      </div>
      <div className="lab-panel lab-quiz-answers">
        <div className="lab-panel-label">CHOOSE ONE ANSWER</div>
        <div className="fp-answers lab-answers">{q.options.map((option, index) => <button key={option} disabled={feedback !== null} className={feedback === null ? "" : index === q.answer ? "is-correct" : index === feedback ? "is-incorrect" : "is-faded"} aria-label={`${String.fromCharCode(65 + index)} ${option}`} onClick={() => choose(index)}>
          <b>{String.fromCharCode(65 + index)}</b><span>{option}</span>
        </button>)}</div>
        <div className={`lab-feedback ${feedback === null ? "" : correct ? "is-right" : "is-wrong"}`} role="status">
          {feedback === null ? <p>Read the code line by line, then choose. A correct answer earns 10 XP.</p> : <>
            <strong>{correct ? <><Check size={16} /> Correct.</> : <><X size={16} /> Not quite. The answer is {String.fromCharCode(65 + q.answer)}.</>}</strong>
            <p>{q.explanation}</p>
            {correct ? <i className="lab-timer" style={{ animationDuration: `${ADVANCE_MS}ms` }} /> : null}
            <button className="fp-primary" onClick={advance}>{p.quizIndex + 1 >= questions.length ? "SEE RESULTS" : "NEXT"} <ArrowRight size={14} /></button>
          </>}
        </div>
      </div>
    </div>
  </section>;
}
