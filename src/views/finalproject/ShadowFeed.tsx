import { useState } from "react";
import { missions, program } from "./content";
import { runProgram } from "./logic";
import { award, stageThreeDone, type Progress, type Update } from "./progress";
import { Code, Panel, useExecution } from "./shared";
export function ShadowFeed({progress:p,update}:{progress:Progress;update:Update}) {
  return <><div className="fp-shadow-intro"><span className="fp-status-dot"/> WHITE HAT AUDIT / ECHO TRAINING ENVIRONMENT <span>FICTIONAL · CONTAINED · NO LIVE ACCOUNTS</span></div><nav className="fp-tabs" aria-label="Audit missions">{missions.map((m,i)=><button key={m.id} aria-pressed={p.missionIndex===i} disabled={i>0&&!p.repaired.includes(i-1)} onClick={()=>update(p=>({...p,missionIndex:i}))}>{String(i+1).padStart(2,"0")} · {i===3?"Final directive":m.title} {p.repaired.includes(i)?"✓":""}</button>)}</nav><Mission key={p.missionIndex} progress={p} update={update}/></>;
}
function Mission({progress:p,update}:{progress:Progress;update:Update}) {
  const index=p.missionIndex,m=missions[index],observed=p.observed.includes(index),repaired=p.repaired.includes(index);
  const pieces=p.patches[index]??m.broken;
  const [result,setResult]=useState("");const [message,setMessage]=useState("");const [input,setInput]=useState(true);
  const [selected,setSelected]=useState(0);const [mode,setMode]=useState<"broken"|"patch">("broken");
  const {run,busy,error}=useExecution();
  const scenario={variable:m.variable,initial:input,condition:m.variable,yes:pieces[0],no:pieces[1]};
  const observe=()=>run(async signal=>{
    setMode("broken");setInput(true);
    const out=await runProgram(scenario,true,[m.variable,...m.broken],signal);setResult(out);
    update(p=>({...p,observed:[...new Set([...p.observed,index])]}));
    setMessage("Broken rule observed. Select an output line, then tap a replacement below.");
  });
  const simulate=()=>run(async signal=>{
    setMode("patch");const out=await runProgram(scenario,input,[m.variable,...pieces],signal);setResult(out);
    // Verify both branches through Sharpie's runtime, not only the visible sample.
    for(const value of [true,false]){
      const actual=await runProgram(scenario,value,[m.variable,...pieces],signal);
      if(actual!==m.repaired[value?0:1]){
        setMessage(index===3&&actual==="SHOW"?"SHOW preserves the questions. In this case some claims remain unresolved: add REVIEW while keeping them visible.":`With ${m.variable} = ${value}, the rule prints ${actual}. ${value?"Repair the flagged-content action.":"Keep the ordinary-content path appropriate too."}`);return;
      }
    }
    setMessage(`PATCH SUCCESSFUL — ${m.result}`);
    update(p=>{const next=award({...p,repaired:[...new Set([...p.repaired,index])]},`mission:${index}`,50);return stageThreeDone(next)?{...next,completedAt:p.completedAt||new Date().toISOString()}:next;});
  });
  const shown=mode==="broken"?m.broken:pieces;
  return <><div className="fp-title"><div><small>OPERATION WHITE HAT · CASE {index+1} / 4</small><h1>{m.title}</h1></div><span className="fp-badge">{repaired?"PATCH VERIFIED":observed?"REPAIR THE RULE":"OBSERVE FIRST"}</span></div><div className="fp-shadow-layout"><Panel title="01 / CASE FILE"><div className="fp-classified">ECHO / INTERNAL MESSAGE</div><blockquote>{m.message}</blockquote><p className="fp-note">ECHO is a fictional company with data centers in the Brazilian Amazon region. Environmental impacts in this story remain under investigation.</p><article className="fp-post"><small>AFFECTED POST</small><h3>{m.author}</h3><p>{m.post}</p></article><p>{m.lesson}</p></Panel>
    <Panel title="02 / ALGORITHM"><Code code={program({...scenario,yes:shown[0],no:shown[1]},input)} active={result?(input?4:8):-1}/><button className="fp-secondary" disabled={busy} onClick={observe}>{busy?"RUNNING…":"01 · RUN BROKEN SYSTEM"}</button><fieldset disabled={!observed||busy} className="fp-patch-controls"><legend>02 · REPAIR THE OUTPUTS</legend><div className="fp-toggle">{[0,1].map(branch=><button key={branch} aria-pressed={selected===branch} onClick={()=>{setSelected(branch);setMode("patch");}}>{branch===0?"IF":"ELSE"} → {pieces[branch]}</button>)}</div><div className="fp-pieces">{m.choices.map(choice=><button key={choice} onClick={()=>{const next=[...pieces];next[selected]=choice;update(p=>({...p,patches:{...p.patches,[index]:next}}));setMode("patch");setResult("");setMessage("Patch edited. Run the simulation to test both paths.");}}>{choice}</button>)}</div><label className="fp-test-flag"><input type="checkbox" checked={input} onChange={e=>{setInput(e.target.checked);setResult("");setMode("patch");}}/>{m.variable} = {String(input)}</label><button className="fp-primary" onClick={simulate}>03 · RUN SIMULATION</button></fieldset>{!observed&&<p className="fp-note">Run the broken rule to unlock the repair controls.</p>}</Panel>
    <Panel title="03 / LIVE FEED"><div className="fp-feed-brand">echo<span>SIMULATED FEED</span></div><div className={`fp-feed ${result==="HIDE"?"hidden-post":""} ${result==="BOOST"?"boosted":""}`}><div className="fp-feed-state" role="status">{result||"AWAITING SIMULATION"}</div>{result==="HIDE"?<div className="fp-removed">POST REMOVED<br/><small>The rule hid this topic before checking its claims.</small></div>:<article className="fp-post"><div className="fp-avatar">{index===2?"S":"E"}</div><b>{m.author}</b>{result==="SPONSORED"&&<span className="fp-disclosure">SPONSORED · PAID CONTENT</span>}<p>{m.post}</p>{result.includes("REVIEW")&&<div className="fp-review-label">◉ IN REVIEW · NOT A VERDICT</div>}<footer>♡ 128 <span>↗ Share · simulation only</span></footer></article>}{result==="BOOST"&&<div className="fp-repeated">↗ EXTRA VISIBILITY<br/>{m.post}<br/>{m.post}</div>}</div><div className={`fp-feedback ${message.startsWith("PATCH")?"success":""}`} role="status">{error||message||"Observe → repair → run → inspect the change."}</div>{repaired&&<button className="fp-next" onClick={()=>update(p=>({...p,missionIndex:Math.min(3,index+1),activity:index===3?"report":"shadow"}))}>{index===3?"GENERATE AUDIT REPORT →":"NEXT CASE →"}</button>}</Panel></div></>;
}
