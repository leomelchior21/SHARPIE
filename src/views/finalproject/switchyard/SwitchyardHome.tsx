import { ArrowRight, Lock } from "lucide-react";
import { questions } from "../content";
import { quizDone, type Progress } from "../progress";
import { levelCount } from "./levels";
import { buildYard } from "./yard";
import { TrackDiagram } from "./TrackDiagram";
import "./switchyard.css";

// The card art is the switch itself, built and waiting for its first train.
const finishedYard = buildYard(["decl", "if (grade >= 7)", 'Console.WriteLine("Approved");', "else", 'Console.WriteLine("Try again");']);

/** The Switchyard's front door: the quiz first, then the game it unlocks. */
export function SwitchyardHome({ progress: p, allOpen, onQuiz, onYard }: { progress: Progress; allOpen: boolean; onQuiz: () => void; onYard: () => void }) {
  const answered = questions.filter((q) => p.answers[q.id] !== undefined).length;
  const right = questions.filter((q) => p.answers[q.id] === q.answer).length;
  const licensed = quizDone(p);
  const open = licensed || allOpen;
  const shipped = p.yardShipped.length;
  const stars = p.yardStars.reduce((a, b) => a + b, 0);
  return <section className="sy-hub">
    <header>
      <div className="sy-mission-top"><span className="sy-cs">C#</span><small>true, false &amp; if / else</small></div>
      <h1 className="sy-label sy-label--big">SWITCHYARD</h1>
      <p className="sy-caption">Every train takes exactly <b>one</b> track. Your <code>if / else</code> throws the switch.</p>
    </header>
    <div className="sy-hub-cards">
      <button className={`sy-card sy-card--quiz ${licensed ? "is-done" : "is-next"}`} onClick={onQuiz} aria-label="Quiz">
        <span className="sy-card-n">01</span>
        <span className="sy-card-art sy-quiz-art" aria-hidden="true">
          <span className="sy-mini-code"><i className="cs-type">int</i> x = <i className="cs-num">10</i>;<br /><i className="cs-kw">if</i> (x &lt; <i className="cs-num">5</i>)</span>
          <span className="sy-mini-answers"><i>A</i><i className="is-right">B</i><i>C</i><i>D</i></span>
          <em className={licensed ? "is-done" : ""}>{licensed ? "LICENSED" : `${answered} / ${questions.length}`}</em>
        </span>
        <strong>Quiz</strong>
        <em>Read the code. Say what it prints. Answer all 20 to get your yard license.</em>
        <span className="sy-card-bar"><i style={{ width: `${Math.round(answered / questions.length * 100)}%` }} /></span>
        <span className="sy-card-foot">{right} right · {answered} / {questions.length} answered{!licensed && <span className="sy-card-go">{answered ? "RESUME" : "START"} <ArrowRight size={14} /></span>}</span>
      </button>
      <button className={`sy-card sy-card--yard ${open ? (licensed || allOpen) && !shipped ? "is-next" : "" : "is-locked"} ${shipped === levelCount ? "is-done" : ""}`} disabled={!open} onClick={onYard} aria-label="The Switchyard">
        <span className="sy-card-n">02</span>
        <span className="sy-card-art" aria-hidden="true"><TrackDiagram yard={finishedYard} train={null} lever={null} readout={[]} arrived={null} duration={0} /></span>
        <strong>The Switchyard</strong>
        <em>Lay track, set sensors, fix incidents, write it yourself.</em>
        <span className="sy-card-bar"><i style={{ width: `${Math.round(shipped / levelCount * 100)}%` }} /></span>
        <span className="sy-card-foot">{open ? <>{shipped} / {levelCount} levels · {stars}★{shipped < levelCount && <span className="sy-card-go">{shipped ? "RESUME" : "START"} <ArrowRight size={14} /></span>}</> : <><Lock size={14} /> FINISH THE QUIZ TO OPEN</>}</span>
      </button>
    </div>
  </section>;
}
