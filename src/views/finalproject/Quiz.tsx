import { useEffect, useState } from "react";
import { questions } from "./content";
import { award, type Progress, type Update } from "./progress";
import { Code, Panel } from "./shared";
export function Quiz({progress:p,update}:{progress:Progress;update:Update}) {
  const [review,setReview]=useState(p.quizIndex>=20);const [feedback,setFeedback]=useState<number|null>(null);const [hold,setHold]=useState(false);
  const q=questions[p.quizIndex];
  useEffect(()=>{
    if(feedback===null||hold)return;
    const timer=setTimeout(()=>{setFeedback(null);update(p=>({...p,quizIndex:Math.min(20,p.quizIndex+1)}));},2600);
    return()=>clearTimeout(timer);
  },[feedback,hold,update]);
  const choose=(answer:number)=>{
    if(feedback!==null)return;
    setFeedback(answer);
    update(p=>{const next={...p,answers:{...p.answers,[q.id]:answer},attempts:{...p.attempts,[q.id]:(p.attempts[q.id]??0)+1},mastered:answer===q.answer?[...new Set([...p.mastered,q.id])]:p.mastered};return answer===q.answer?award(next,`quiz:${q.id}`,10):next;});
  };
  if(review||!q)return <div className="fp-quiz-review"><div className="fp-title"><div><small>KNOWLEDGE CHECK / SAVED RESULTS</small><h1>{p.mastered.length} / 20 concepts practiced correctly.</h1><p>Latest answers: {questions.filter(q=>p.answers[q.id]===q.answer).length} correct · {Object.keys(p.answers).length} answered. Repeat practice never removes XP.</p></div></div><div className="fp-inline-actions"><button className="fp-primary" onClick={()=>{setReview(false);setFeedback(null);update(p=>({...p,quizIndex:Math.max(0,questions.findIndex(q=>p.answers[q.id]===undefined))}));}}>RESUME / PRACTICE</button><button onClick={()=>{setReview(false);setFeedback(null);update(p=>({...p,quizIndex:0}));}}>Practice from question 1</button></div><div className="fp-review-grid">{questions.map((q,i)=><article className="fp-panel" key={q.id}><small>{String(i+1).padStart(2,"0")} / {q.concept}</small><h3>{p.answers[q.id]===undefined?"Not answered":p.answers[q.id]===q.answer?"✓ Correct":"Review this idea"}</h3><p>Your answer: {q.options[p.answers[q.id]]??"—"}</p><p><b>Correct: {q.options[q.answer]}</b></p><p>{q.explanation}</p><button onClick={()=>{setReview(false);setFeedback(null);update(p=>({...p,quizIndex:i}));}}>Practice this question</button></article>)}</div></div>;
  return <><div className="fp-title"><div><small>QUESTION {p.quizIndex+1} / 20 · {q.concept.toUpperCase()}</small><h1>{q.prompt}</h1></div></div><progress className="fp-progress" aria-label="Quiz progress" value={p.quizIndex} max={20}/><div className="fp-quiz-layout"><Panel title="READ THE CODE / C#"><Code code={q.code}/></Panel><Panel title="CHOOSE ONE ANSWER"><div className="fp-answers">{q.options.map((option,i)=><button key={option} disabled={feedback!==null} className={feedback!==null?(i===q.answer?"correct":i===feedback?"incorrect":""):""} aria-label={`${String.fromCharCode(65+i)} ${option}`} onClick={()=>choose(i)}><b>{String.fromCharCode(65+i)}</b><span>{option}</span></button>)}</div><div className="fp-feedback" role="status">{feedback===null?"A correct answer earns 10 XP. Your place is saved.":`${feedback===q.answer?"✓ Correct.":"Not quite."} ${q.explanation}`}</div><div className="fp-inline-actions"><label><input type="checkbox" checked={hold} onChange={e=>setHold(e.target.checked)}/> Keep feedback on screen</label>{feedback!==null&&<button onClick={()=>{setFeedback(null);update(p=>({...p,quizIndex:Math.min(20,p.quizIndex+1)}));}}>Next →</button>}</div></Panel></div></>;
}
