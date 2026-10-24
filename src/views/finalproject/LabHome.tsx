import { ArrowUpRight, Check, CircleDashed, GitBranch, ListChecks, Workflow, Wrench } from "lucide-react";
import { challenges, flows, questions } from "./content";
import type { Progress } from "./progress";

// Small illustrations of what each station feels like.
const art = {
  flow: <svg viewBox="0 0 160 110" aria-hidden="true"><path d="M80 8 V26 M50 55 H30 V80 M110 55 H130 V80" /><polygon points="80,30 110,55 80,80 50,55" /><rect x="8" y="82" width="44" height="20" rx="6" className="is-true" /><rect x="108" y="82" width="44" height="20" rx="6" className="is-false" /><circle cx="30" cy="70" r="5" className="is-token" /></svg>,
  builder: <div aria-hidden="true"><code>if ( <i /> )</code><code>{"{"} <i className="is-filled" /> {"}"}</code><code>else {"{"} <i /> {"}"}</code></div>,
  quiz: <div aria-hidden="true"><i>A</i><i className="is-right">B</i><i>C</i><i>D</i></div>,
};

// The lab's front door: three stations and what unlocks Shadow Feed.
export function LabHome({ progress: p, onFlow, onBuilder, onQuiz }: { progress: Progress; onFlow: () => void; onBuilder: () => void; onQuiz: () => void }) {
  const flowsDone = [0, 1, 2].filter((i) => p.flowPaths[i]?.length === 2).length;
  const coreBuilt = [0, 1, 2].filter((i) => p.built.includes(i)).length;
  const right = questions.filter((q) => p.answers[q.id] === q.answer).length;
  const stations = [
    { id: "flow", title: "Live Flow", verb: "Watch a rule run", copy: "Predict the path, then watch the program decide.", icon: Workflow, progress: `${flowsDone} / ${flows.length} tickets`, share: flowsDone / flows.length, open: onFlow },
    { id: "builder", title: "Code Builder", verb: "Ship the rule", copy: "Build the if / else a client asked for and pass its tests.", icon: Wrench, progress: `${p.built.length} / ${challenges.length} shipped`, share: p.built.length / challenges.length, open: onBuilder },
    { id: "quiz", title: "Quiz", verb: "Code review", copy: "Read twenty snippets and say exactly what they print.", icon: ListChecks, progress: `${right} / ${questions.length} right`, share: right / questions.length, open: onQuiz },
  ];
  const unlocked = flowsDone === 3 && coreBuilt === 3;
  return <section className="lab-home">
    <header>
      <small><GitBranch size={14} /> SHARPIE STUDIO · DECISION DESK</small>
      <h1>Every client needs a rule with two paths.</h1>
      <p>You are the studio’s newest developer. Clients across Port Sharpie send tickets: a school, a cinema, a delivery app, a game studio and, finally, the ECHO feed.</p>
    </header>
    <div className="lab-stations">{stations.map((station, index) => <button key={station.id} className={`lab-station lab-station--${station.id}`} onClick={station.open} aria-label={station.title}>
      <span className="lab-station-index">0{index + 1}</span>
      <station.icon size={30} />
      <span className={`lab-station-art lab-art--${station.id}`}>{art[station.id as keyof typeof art]}</span>
      <strong>{station.title}</strong>
      <em>{station.verb}</em>
      <small>{station.copy}</small>
      <span className="lab-station-progress"><i style={{ width: `${Math.round(station.share * 100)}%` }} /></span>
      <span className="lab-station-foot">{station.progress}<ArrowUpRight size={16} /></span>
    </button>)}</div>
    <footer className={`lab-unlock ${unlocked ? "is-open" : ""}`}>
      <b>{unlocked ? "SHADOW FEED UNLOCKED" : "TO UNLOCK SHADOW FEED"}</b>
      <span>{flowsDone === 3 ? <Check size={14} /> : <CircleDashed size={14} />} Both paths in all 3 Live Flows ({flowsDone}/3)</span>
      <span>{coreBuilt === 3 ? <Check size={14} /> : <CircleDashed size={14} />} Ship tickets 1 to 3 in the Code Builder ({coreBuilt}/3)</span>
      <span className="lab-muted">The other tickets and the quiz are extra practice.</span>
    </footer>
  </section>;
}

export function QuizIntro({ index, onStart }: { index: number; onStart: () => void }) {
  return <section className="lab-quiz-intro">
    <small><ListChecks size={14} /> CODE REVIEW</small>
    <h1>Let’s start.</h1>
    <p>Twenty snippets from the studio’s codebase. Read each one and say exactly what it prints. After every answer, the code lights up the lines that ran.</p>
    <button className="fp-primary lab-cta" onClick={onStart}>{index >= questions.length ? "SEE RESULTS" : index > 0 ? "RESUME QUIZ" : "START QUIZ"}</button>
  </section>;
}
