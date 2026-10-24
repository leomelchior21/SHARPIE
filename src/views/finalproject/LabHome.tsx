import { ArrowUpRight, Check, CircleDashed, GitBranch, ListChecks, Workflow, Wrench } from "lucide-react";
import { challenges, flows, questions, roundSize, rounds } from "./content";
import type { Progress } from "./progress";

// Small illustrations of what each station feels like.
const art = {
  flow: <svg viewBox="0 0 160 110" aria-hidden="true"><path d="M80 8 V26 M50 55 H30 V80 M110 55 H130 V80" /><polygon points="80,30 110,55 80,80 50,55" /><rect x="8" y="82" width="44" height="20" rx="6" className="is-true" /><rect x="108" y="82" width="44" height="20" rx="6" className="is-false" /><circle cx="30" cy="70" r="5" className="is-token" /></svg>,
  builder: <div aria-hidden="true"><code>if ( <i /> )</code><code>{"{"} <i className="is-filled" /> {"}"}</code><code>else {"{"} <i /> {"}"}</code></div>,
  quiz: <div aria-hidden="true"><i>A</i><i className="is-right">B</i><i>C</i><i>D</i></div>,
};

// The lab's front door: three stations in order, with the next one lit up.
export function LabHome({ progress: p, onFlow, onBuilder, onQuiz }: { progress: Progress; onFlow: () => void; onBuilder: () => void; onQuiz: () => void }) {
  const flowsDone = [0, 1, 2].filter((i) => p.flowPaths[i]?.length === 2).length;
  const coreBuilt = [0, 1, 2].filter((i) => p.built.includes(i)).length;
  const answered = questions.filter((q) => p.answers[q.id] !== undefined).length;
  const right = questions.filter((q) => p.answers[q.id] === q.answer).length;
  const stations = [
    { id: "flow", title: "Live Flow", verb: "Watch a rule run", copy: "Guess the path. Watch the code decide.", icon: Workflow, progress: `${flowsDone} / ${flows.length} tickets`, share: flowsDone / flows.length, done: flowsDone === flows.length, open: onFlow },
    { id: "quiz", title: "Quiz", verb: "Read the code", copy: `Say what it prints. ${rounds.length} rounds of ${roundSize}.`, icon: ListChecks, progress: `${right} / ${questions.length} right`, share: answered / questions.length, done: answered === questions.length, open: onQuiz },
    { id: "builder", title: "Code Builder", verb: "Ship the rule", copy: "Build the if / else a client asked for.", icon: Wrench, progress: `${p.built.length} / ${challenges.length} shipped`, share: p.built.length / challenges.length, done: p.built.length === challenges.length, open: onBuilder },
  ];
  const next = stations.find((station) => !station.done)?.id;
  const unlocked = flowsDone === 3 && coreBuilt === 3;
  return <section className="lab-home">
    <header>
      <small><GitBranch size={14} /> SHARPIE STUDIO · DECISION DESK</small>
      <h1>Every client needs a rule with two paths.</h1>
      <p>{next ? "Go in order. The glowing station is next." : "Every station is done. Replay any of them."}</p>
    </header>
    <div className="lab-stations">{stations.map((station, index) => <button key={station.id} className={`lab-station lab-station--${station.id} ${station.id === next ? "is-next" : ""} ${station.done ? "is-done" : ""}`} onClick={station.open} aria-label={station.title}>
      <span className="lab-station-index">0{index + 1}</span>
      <span className="lab-station-top">
        <station.icon size={30} />
        {station.id === next ? <b className="lab-station-badge">NEXT UP</b> : station.done ? <b className="lab-station-badge is-done"><Check size={12} strokeWidth={3} /> DONE</b> : null}
      </span>
      <span className={`lab-station-art lab-art--${station.id}`}>{art[station.id as keyof typeof art]}</span>
      <strong>{station.title}</strong>
      <em>{station.verb}</em>
      <small>{station.copy}</small>
      <span className="lab-station-progress"><i style={{ width: `${Math.round(station.share * 100)}%` }} /></span>
      <span className="lab-station-foot">{station.progress}{station.id === next ? <span className="lab-station-go">START <ArrowUpRight size={14} /></span> : <ArrowUpRight size={16} />}</span>
    </button>)}</div>
    <footer className={`lab-unlock ${unlocked ? "is-open" : ""}`}>
      <b>{unlocked ? "SHADOW FEED UNLOCKED" : "TO UNLOCK SHADOW FEED"}</b>
      <span>{flowsDone === 3 ? <Check size={14} /> : <CircleDashed size={14} />} Both paths in all 3 Live Flows ({flowsDone}/3)</span>
      <span>{coreBuilt === 3 ? <Check size={14} /> : <CircleDashed size={14} />} Ship tickets 1 to 3 in the Code Builder ({coreBuilt}/3)</span>
    </footer>
  </section>;
}

export function QuizIntro({ progress: p, onStart }: { progress: Progress; onStart: () => void }) {
  const index = p.quizIndex;
  return <section className="lab-quiz-intro">
    <small><ListChecks size={14} /> STATION 02 · QUIZ</small>
    <h1>Read it. Say what it prints.</h1>
    <p>Read the code first. The answers show up a moment later.</p>
    <ol className="lab-rounds">{rounds.map((round, r) => {
      const items = questions.slice(r * roundSize, (r + 1) * roundSize);
      const answered = items.filter((q) => p.answers[q.id] !== undefined).length;
      const right = items.filter((q) => p.answers[q.id] === q.answer).length;
      const now = index >= r * roundSize && index < (r + 1) * roundSize;
      return <li key={round.name} className={`${now ? "is-now" : ""} ${answered === items.length ? "is-done" : ""}`}>
        <small>ROUND {r + 1}</small>
        <strong>{round.name}</strong>
        <span>{round.focus}</span>
        <i>{answered === items.length ? <><Check size={13} strokeWidth={3} /> {right} / {items.length}</> : now && answered ? `${answered} / ${items.length}` : `${items.length} questions`}</i>
      </li>;
    })}</ol>
    <button className="fp-primary lab-cta is-cue" onClick={onStart}>{index >= questions.length ? "SEE RESULTS" : index > 0 ? "RESUME QUIZ" : "START QUIZ"}</button>
  </section>;
}
