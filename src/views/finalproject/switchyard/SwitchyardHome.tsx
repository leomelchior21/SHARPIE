import { ArrowRight, Lock } from "lucide-react";
import { questions } from "../content";
import { quizDone, type Progress } from "../progress";
import { levelCount } from "./levels";
import { buildYard } from "./yard";
import { YardScene } from "./YardScene";
import "./switchyard.css";

// The card art is the yard itself, finished, with the scenery the student has earned.
const finishedYard = buildYard(["decl", "if (age <= 12)", 'Console.WriteLine("Child discount");', "else", 'Console.WriteLine("Regular ticket");']);

/** The Switchyard's front door: the quiz first, then the game it unlocks. */
export function SwitchyardHome({ progress: p, preview, onQuiz, onYard }: { progress: Progress; preview: boolean; onQuiz: () => void; onYard: () => void }) {
  const answered = questions.filter((q) => p.answers[q.id] !== undefined).length;
  const right = questions.filter((q) => p.answers[q.id] === q.answer).length;
  const licensed = quizDone(p);
  const open = licensed || preview;
  const shipped = p.yardShipped.length;
  const stars = p.yardStars.reduce((a, b) => a + b, 0);
  return <section className="sy-hub">
    <header>
      <small>FINAL PROJECT · STAGE 02 · C# DISPATCH</small>
      <h1>SWITCHYARD</h1>
      <p>Every train takes exactly one track. Your if / else throws the switch. Pass the quiz to earn your yard license.</p>
    </header>
    <div className="sy-hub-cards">
      <button className={`sy-card sy-card--quiz ${licensed ? "is-done" : "is-next"}`} onClick={onQuiz} aria-label="Quiz">
        <span className="sy-card-n">01</span>
        <span className="sy-card-art sy-license" aria-hidden="true">
          <b>YARD LICENSE</b>
          <i /><i /><i />
          <em>{licensed ? "LICENSED" : `${answered} / ${questions.length}`}</em>
        </span>
        <strong>Quiz</strong>
        <em>Read the code. Say what it prints.</em>
        <span className="sy-card-bar"><i style={{ width: `${Math.round(answered / questions.length * 100)}%` }} /></span>
        <span className="sy-card-foot">{right} right · {answered} / {questions.length} answered{!licensed && <span className="sy-card-go">{answered ? "RESUME" : "START"} <ArrowRight size={13} /></span>}</span>
      </button>
      <button className={`sy-card sy-card--yard ${open ? licensed && !shipped ? "is-next" : "" : "is-locked"} ${shipped === levelCount ? "is-done" : ""}`} disabled={!open} onClick={onYard} aria-label="The Switchyard">
        <span className="sy-card-n">02</span>
        <span className="sy-card-art" aria-hidden="true"><YardScene yard={finishedYard} variable="age" train={null} lever={null} readout={[]} arrived={null} decorCount={shipped} duration={0} /></span>
        <strong>The Switchyard</strong>
        <em>Lay track, set sensors, fix incidents, write it yourself.</em>
        <span className="sy-card-bar"><i style={{ width: `${Math.round(shipped / levelCount * 100)}%` }} /></span>
        <span className="sy-card-foot">{open ? <>{shipped} / {levelCount} levels · {stars}★{licensed && shipped < levelCount && <span className="sy-card-go">{shipped ? "RESUME" : "START"} <ArrowRight size={13} /></span>}</> : <><Lock size={13} /> FINISH THE QUIZ TO OPEN</>}</span>
      </button>
    </div>
  </section>;
}
