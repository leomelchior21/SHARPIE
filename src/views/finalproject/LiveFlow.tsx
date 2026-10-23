import { useState } from "react";
import { flows, program } from "./content";
import { conditionResult, runProgram } from "./logic";
import { award, type Progress, type Update } from "./progress";
import { Code, InputControl, Panel, useExecution, waitStep } from "./shared";
import { FlowDiagram } from "./FlowDiagram";

export function LiveFlow({progress:p,update,onComplete}:{progress:Progress;update:Update;onComplete:()=>void}) {
  const [replay]=useState(()=>[0,1,2].every(i=>p.flowPaths[i]?.length===2));
  return <Flow key={p.flowIndex} index={p.flowIndex} progress={p} update={update} replay={replay} onComplete={onComplete}/>;
}
function Flow({index,progress:p,update,replay,onComplete}:{index:number;progress:Progress;update:Update;replay:boolean;onComplete:()=>void}) {
  const s=flows[index]; const value=p.flowValues[index];
  const [phase,setPhase]=useState(0);const [output,setOutput]=useState("");
  const [started,setStarted]=useState(false);
  const {run,busy,error}=useExecution();
  const result=conditionResult(s.condition,s.variable,value);
  const [seen,setSeen]=useState<string[]>(()=>replay?[]:p.flowPaths[index]??[]);
  const start=()=>run(async signal=>{
    setOutput("");setPhase(1);
    const printed=await runProgram(s,value,[s.condition,s.yes,s.no],signal);
    for(const step of [2,3,4,5,6,7]){await waitStep(signal,550);setPhase(step);if(step===5)setOutput(printed);}
    const paths=[...new Set([...seen,String(result)])];setSeen(paths);
    update(p=>award({...p,flowPaths:{...p.flowPaths,[index]:[...new Set([...(p.flowPaths[index]??[]),String(result)])]}},`flow:${index}:${result}`,10));
    if(paths.length===2){await waitStep(signal,1400);if(index===flows.length-1)onComplete();else update(p=>({...p,flowIndex:index+1}));}
  });
  if(!started)return <section className="fp-flow-intro"><small>LIVE FLOW · {index+1} / 3</small><h1>{s.title}</h1><p>{s.description}</p><button className="fp-flow-start" onClick={()=>setStarted(true)}>START LIVE FLOW</button></section>;
  return <><div className="fp-title"><div><small>LIVE FLOW · {index+1} / 3</small><h1>{s.title}</h1></div><span className="fp-badge">{seen.length} / 2 PATHS</span></div><div className="fp-flow-layout">
    <Panel title="CODE / C#"><Code code={program(s,value)} active={phase===2?0:phase===3||phase===4?2:phase>=5?(result?4:8):-1}/><div className="fp-flow-control"><InputControl scenario={s} value={value} disabled={busy} onChange={v=>{setPhase(0);setOutput("");update(p=>({...p,flowValues:p.flowValues.map((n,i)=>i===index?Number(v):n)}));}}/><button className="fp-primary" disabled={busy} onClick={start}>{busy?"RUNNING…":"▶ START FLOW"}</button></div><p className="fp-flow-prompt" role="status">{seen.length===2?"Both paths explored. Continuing…":seen.length===1?`Change the input to follow the ${seen[0]==="true"?"FALSE":"TRUE"} path.`:"Choose an input and run the flow."}</p><p className="fp-note">{s.note}</p></Panel>
    <Panel title="FOLLOW THE FLOW" className="fp-flowchart-panel"><FlowDiagram scenario={s} value={value} phase={phase} result={result}/><div className="fp-output" role="status"><small>CURRENT OUTPUT</small><strong>{error||output||"Run the flow to follow a path."}</strong></div>
    {index>0&&<div className={`fp-scene ${output===s.yes?"lit":""}`}><b>{index===1?"SHARPIE PICTURES · ADMIT ONE":"ECHO / FICTIONAL POST"}</b><span>{index===1?`AGE ${value} · ${output||"Ticket pending"}`:`A new idea worth checking. · ${value} views`}</span>{index===2&&<strong>{output||"Awaiting simulation"}</strong>}</div>}</Panel>
  </div></>;
}
