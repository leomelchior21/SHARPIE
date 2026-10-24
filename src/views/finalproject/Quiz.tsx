import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Flame, RotateCcw, Trophy, Wrench, X, Zap } from "lucide-react";
import { questions, roundSize, rounds } from "./content";
import { award, type Progress, type Update } from "./progress";
import { LabCode } from "./LabParts";
import { questionTrace } from "./labStories";

const ADVANCE_MS = 2200;
const letter = (index: number) => String.fromCharCode(65 + index);
const roundOf = (index: number) => Math.floor(index / roundSize);
const roundItems = (round: number) => questions.slice(round * roundSize, (round + 1) * roundSize);

export function Quiz({ progress: p, update, onBuilder }: { progress: Progress; update: Update; onBuilder: () => void }) {
  const [review, setReview] = useState(p.quizIndex >= questions.length);
  const [feedback, setFeedback] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  // The round just finished; a short break before the next one starts.
  const [checkpoint, setCheckpoint] = useState<number | null>(null);
  const q = questions[p.quizIndex];
  const correct = feedback !== null && q && feedback === q.answer;

  const advance = () => {
    const next = p.quizIndex + 1;
    setFeedback(null);
    if (next < questions.length && next % roundSize === 0) setCheckpoint(roundOf(next) - 1);
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

  const practice = (index: number) => { setReview(false); setCheckpoint(null); setFeedback(null); update((current) => ({ ...current, quizIndex: index })); };

  if (review || !q) {
    const right = questions.filter((item) => p.answers[item.id] === item.answer).length;
    const firstWrong = questions.findIndex((item) => p.answers[item.id] !== undefined && p.answers[item.id] !== item.answer);
    const firstOpen = questions.findIndex((item) => p.answers[item.id] === undefined);
    return <section className="lab-review">
      <header className="lab-review-head">
        <div className="lab-score" style={{ "--score": right / questions.length } as CSSProperties}><b>{right}</b><span>/ {questions.length}</span></div>
        <div>
          <small>QUIZ · SAVED RESULTS</small>
          <h1>{right === questions.length ? "Perfect score!" : `${right} of ${questions.length} right.`}</h1>
          <p>{firstWrong >= 0 ? "Red tiles are worth another look. Practice never removes XP." : "Next station: build the rules yourself."}</p>
        </div>
        <div className="lab-review-actions">
          {firstOpen < 0 && <button className="fp-primary is-cue" onClick={onBuilder}><Wrench size={14} /> CODE BUILDER →</button>}
          {firstOpen >= 0 && <button className="fp-primary is-cue" onClick={() => practice(firstOpen)}>RESUME QUIZ</button>}
          {firstWrong >= 0 && <button onClick={() => practice(firstWrong)}><RotateCcw size={14} /> Practice mistakes</button>}
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

  if (checkpoint !== null) {
    const items = roundItems(checkpoint);
    const right = items.filter((item) => p.answers[item.id] === item.answer).length;
    const upcoming = rounds[checkpoint + 1];
    return <section className={`lab-checkpoint ${right === items.length ? "is-perfect" : ""}`}>
      <small>ROUND {checkpoint + 1} OF {rounds.length} · {rounds[checkpoint].name.toUpperCase()}</small>
      <div className="lab-checkpoint-score"><Trophy size={34} /><b>{right}</b><span>/ {items.length}</span></div>
      <h1>{right === items.length ? "Perfect round!" : right >= 3 ? "Nice round." : "Slow down and read every line."}</h1>
      <ol className="lab-checkpoint-tiles">{items.map((item, index) => {
        const ok = p.answers[item.id] === item.answer;
        return <li key={item.id} className={ok ? "is-right" : "is-wrong"} style={{ "--i": index } as CSSProperties}>{ok ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}<span>{item.concept}</span></li>;
      })}</ol>
      {right > 0 && <p className="lab-checkpoint-xp"><Zap size={15} fill="currentColor" /> +{right * 10} XP this round</p>}
      <button className="fp-primary lab-cta is-cue" onClick={() => setCheckpoint(null)}>ROUND {checkpoint + 2}: {upcoming.name.toUpperCase()} →</button>
    </section>;
  }

  const round = roundOf(p.quizIndex);
  const trace = feedback !== null ? questionTrace(q) : null;
  return <section className={`lab-quiz ${feedback === null ? "" : correct ? "is-right" : "is-wrong"}`}>
    <header className="lab-quiz-head">
      <div className="lab-quiz-round">
        <small>ROUND {round + 1} / {rounds.length} · {rounds[round].name.toUpperCase()}</small>
        <ol className="lab-round-bar" aria-label="Round progress">{roundItems(round).map((item, index) => {
          const answer = p.answers[item.id];
          const now = round * roundSize + index === p.quizIndex;
          return <li key={item.id} className={`${now ? "is-now" : ""} ${now && feedback === null ? "" : answer === undefined ? "" : answer === item.answer ? "is-right" : "is-wrong"}`} />;
        })}</ol>
      </div>
      <div className="lab-quiz-meta">
        {streak >= 2 && <span className="lab-streak" key={streak}><Flame size={16} fill="currentColor" /> {streak} IN A ROW</span>}
        <span className="lab-quiz-count">QUESTION {p.quizIndex + 1} / {questions.length}</span>
      </div>
    </header>
    <div className="lab-quiz-grid" key={q.id}>
      <div className="lab-panel lab-quiz-code">
        <div className="lab-window-bar" aria-hidden="true"><i /><i /><i /><span>Review{String(p.quizIndex + 1).padStart(2, "0")}.cs</span><em>{q.concept}</em></div>
        <LabCode code={q.code} states={trace?.lines} />
        {trace?.condition && <div className={`lab-eval ${trace.condition.result ? "is-true" : "is-false"}`}><code>{trace.condition.code}</code><b>→ {String(trace.condition.result)}</b></div>}
      </div>
      <div className="lab-quiz-answers">
        <h1>{q.prompt}</h1>
        <div className="lab-answers">{q.options.map((option, index) => {
          const state = feedback === null ? "" : index === q.answer ? "is-correct" : index === feedback ? "is-incorrect" : "is-faded";
          return <button key={option} style={{ "--i": index } as CSSProperties} disabled={feedback !== null} className={`lab-answer is-${letter(index).toLowerCase()} ${option.length > 24 ? "is-long" : ""} ${state}`} aria-label={`${letter(index)} ${option}`} onClick={() => choose(index)}>
            <b>{feedback !== null && index === q.answer ? <Check size={16} strokeWidth={3} /> : index === feedback ? <X size={16} strokeWidth={3} /> : letter(index)}</b>
            <span>{option}</span>
            {correct && index === q.answer && <><span className="lab-xp-pop" aria-hidden="true">+10 XP</span><span className="lab-burst" aria-hidden="true">{Array.from({ length: 10 }, (_, n) => <i key={n} style={{ "--n": n } as CSSProperties} />)}</span></>}
          </button>;
        })}</div>
        {feedback !== null && <div className={`lab-feedback ${correct ? "is-right" : "is-wrong"}`} role="status">
          <strong>{correct ? <><Check size={18} strokeWidth={3} /> Correct.</> : <><X size={18} strokeWidth={3} /> Not quite. The answer is {letter(q.answer)}.</>}</strong>
          <p><b>{correct ? "Because" : "Why"}</b> {q.explanation}</p>
          {correct ? <i className="lab-timer" style={{ animationDuration: `${ADVANCE_MS}ms` }} /> : null}
          <button className={`fp-primary ${correct ? "" : "is-cue"}`} onClick={advance}>{p.quizIndex + 1 >= questions.length ? "SEE RESULTS" : "NEXT"} <ArrowRight size={14} /></button>
        </div>}
      </div>
    </div>
  </section>;
}
