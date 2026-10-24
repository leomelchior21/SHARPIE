import { useCallback, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Eye, Footprints, GitBranch, LockKeyhole, ShieldCheck } from "lucide-react";
import { Brand } from "../../components/Brand";
import { canOpen, enterLab, freshProgress, loadProgress, saveProgress, stageOneDone, stageThreeDone, stageTwoDone, xp, type Activity, type Progress } from "./progress";
import { Code, useExecution } from "./shared";
import { executeCSharp } from "../../lib/runner";
import { MatrixRun } from "./MatrixRun";
import { LiveFlow } from "./LiveFlow";
import { CodeBuilder } from "./CodeBuilder";
import { Quiz } from "./Quiz";
import { LabHome, QuizIntro } from "./LabHome";
import { ShadowFeed } from "./ShadowFeed";
import { AuditReport } from "./AuditReport";
import "./finalproject.css";
import "./lab.css";
const labels:Record<Activity,string>={overview:"FINAL PROJECT",matrix:"BACKROOMS RUN",transition:"THE C# CONNECTION",lab:"IF / ELSE LAB",flow:"LIVE FLOW",builder:"CODE BUILDER","quiz-intro":"CODE REVIEW",quiz:"CODE REVIEW",shadow:"SHADOW FEED",report:"AUDIT REPORT"};
export function FinalProject({name,studentKey,isTeacher,onBack}:{name:string;studentKey:string;isTeacher:boolean;onBack:()=>void}) {
  const [loaded]=useState(()=>loadProgress(studentKey));
  const [p,setP]=useState(loaded.progress);const [preview,setPreview]=useState(false);const [previewProgress,setPreviewProgress]=useState(freshProgress);
  const [warning,setWarning]=useState(loaded.warning);
  const active=preview?previewProgress:p;
  const update=useCallback((change:(p:Progress)=>Progress)=>{
    if(preview){setPreviewProgress(change);return;}
    setP(previous=>{const next=change(previous);const saved=saveProgress(studentKey,next);setWarning(saved?"":"This browser cannot save progress right now. Keep this tab open; you can still export your report.");return next;});
  },[preview,studentKey]);
  const activity=canOpen(active.activity,active,preview)?active.activity:"overview";
  const go=(next:Activity)=>{if(canOpen(next,active,preview))update(p=>({...p,activity:next}));};
  const openLab=()=>update(enterLab);
  const openFlow=()=>update(p=>({...p,activity:"flow",flowIndex:[0,1,2].every(i=>p.flowPaths[i]?.length===2)?0:p.flowIndex}));
  const one=stageOneDone(active),two=stageTwoDone(active),three=stageThreeDone(active);
  // Inside the lab, Back returns to the lab's three stations.
  const inLab=["flow","builder","quiz-intro","quiz"].includes(activity);
  return <section className={`fp-shell fp-activity-${activity} ${activity==="shadow"||activity==="report"?"fp-audit-theme":""} ${activity==="matrix"?"fp-game-shell":""}`}>
    <header className="fp-header">
      <Brand compact/>
      <div className="fp-header-title"><small>FINAL PROJECT {preview&&<span className="fp-preview-marker">· PREVIEW</span>}</small><b>{labels[activity]}</b></div>
      <div className="fp-header-actions"><span className="fp-xp">ϟ {xp(active)} XP</span>
        {isTeacher&&<button className={preview?"preview-on":""} aria-label={preview?"Exit teacher preview":"Teacher preview"} aria-pressed={preview} onClick={()=>setPreview(!preview)}><Eye size={16}/></button>}
        <button className="fp-back" onClick={()=>activity==="overview"?onBack():go(inLab&&active.labVisited?"lab":"overview")}><ArrowLeft size={15}/> BACK</button>
      </div>
    </header>
    {warning&&<div className="fp-save-warning" role="status">{warning}</div>}
    <div className="fp-content" key={`${preview}-${activity}`}>
    {activity==="overview"&&<><div className="fp-stage-grid memory-experience-grid">{[
      {n:"01",title:"Backrooms Run",copy:"Every gate runs C#. Read it right or lose a battery.",icon:Footprints,color:"memory-card-purple fp-stage--backrooms",activity:"matrix" as Activity,enabled:true,done:one,unlock:"",detail:`Tapes: ${active.backroom.levels.filter(stars=>stars>0).length}/${active.backroom.levels.length} · Endless best: ${active.best} gates`},
      {n:"02",title:"IF / ELSE Lab",copy:"Follow a decision. Build and test your C# code.",icon:GitBranch,color:"",activity:"lab" as Activity,enabled:true,done:two,unlock:"",detail:`${Object.values(active.flowPaths).filter(v=>v.length===2).length}/3 flows · ${active.built.length}/10 builds · ${Object.keys(active.answers).length}/20 quiz`},
      {n:"03",title:"Shadow Feed",copy:"Operation White Hat. Audit the rules behind the feed.",icon:ShieldCheck,color:"memory-card-red",activity:"shadow" as Activity,enabled:two||preview,done:three,unlock:"IF / ELSE LAB",detail:`${active.repaired.length}/4 policies repaired · ${three?"Report ready":"Audit pending"}`},
    ].map(s=><button
      key={s.n}
      className={`fp-stage memory-experience-card ${s.color} ${s.enabled?"is-available":"is-locked"}`}
      disabled={!s.enabled}
      onClick={()=>s.activity==="lab"?openLab():go(s.activity)}
      aria-label={`${s.title}. ${s.detail}. ${s.enabled?"Open stage":`Unlock: ${s.unlock}`}`}
    >
      <span className="memory-card-number">{s.n}</span>
      <span className="memory-card-icon"><s.icon size={28}/></span>
      <span className="memory-card-copy"><strong>{s.title}</strong><small>{s.copy}</small></span>
      <span className="memory-card-status">{s.enabled?s.done?<><Check size={14}/> COMPLETE</>:<><i/> {s.n!=="03"?"AVAILABLE":"UNLOCKED"}</>:<><LockKeyhole size={14}/> UNLOCK: {s.unlock}</>}</span>
      {s.enabled&&<span className="memory-card-enter">ENTER <ArrowUpRight size={18}/></span>}
    </button>)}</div><div className="fp-overview-bottom"><p>Welcome back, <b>{name}</b>. Your progress is saved in this browser.</p>{three&&<button onClick={()=>go("report")}>OPEN AUDIT REPORT →</button>}</div></>}
    {activity==="matrix"&&<MatrixRun progress={active} update={update} name={name} studentKey={studentKey} isTeacher={isTeacher||preview} onBack={()=>go("overview")}/>}
    {activity==="transition"&&<Transition update={update} completed={active.transition} canContinue={one} onNext={()=>go("lab")} onRun={()=>go("matrix")}/>}
    {activity==="lab"&&<LabHome progress={active} onFlow={openFlow} onBuilder={()=>go("builder")} onQuiz={()=>go("quiz-intro")}/>}
    {activity==="flow"&&<LiveFlow progress={active} update={update} onComplete={()=>go("builder")}/>}
    {activity==="quiz-intro"&&<QuizIntro index={active.quizIndex} onStart={()=>go("quiz")}/>}
    {activity==="builder"&&<CodeBuilder progress={active} update={update} onFinish={()=>go("quiz-intro")}/>}
    {activity==="quiz"&&<Quiz progress={active} update={update}/>}
    {activity==="shadow"&&<ShadowFeed progress={active} update={update}/>}
    {activity==="report"&&<AuditReport name={name} progress={active} update={update}/>}
    </div></section>;
}
function Transition({update,completed,canContinue,onNext,onRun}:{update:(f:(p:Progress)=>Progress)=>void;completed:boolean;canContinue:boolean;onNext:()=>void;onRun:()=>void}) {
  const [output,setOutput]=useState("");const {run,busy,error}=useExecution();const code='int energy = 75;\n\nbool gateOpen = energy > 60;\n\nConsole.WriteLine(gateOpen);';
  return <div className="fp-transition"><small>THE CONDITION YOU PLAYED IS THE CODE YOU CAN READ.</small><h1>You already know a boolean.</h1><div className="fp-connection"><span>ENERGY 75</span><i>→</i><span>75 &gt; 60</span><i>→</i><span className={output?"lit":""}>{output||"?"}</span></div><Code code={code} active={output?4:-1}/><p><b>bool</b> holds one of two values: <code>true</code> or <code>false</code>. The comparison controls the gate. In C#, <code>Console.WriteLine</code> prints <b>True</b>.</p><button className="fp-primary" disabled={busy} onClick={()=>run(async signal=>{const result=await executeCSharp(code,signal);if(!result.success)throw new Error(result.error?.message);setOutput(result.output.trim());update(p=>({...p,transition:true}));})}>{busy?"RUNNING…":"▶ RUN THE C# CONNECTION"}</button><p role="status">{error||output&&`The gate opens: ${output}`||completed&&"Connection explored. You can replay it."}</p><div className="fp-inline-actions"><button onClick={onRun}>Final run / keep playing</button><button disabled={!canContinue} onClick={onNext}>{canContinue?"CONTINUE TO IF / ELSE LAB →":"NEED 3 PASSED GATES + THE C# CONNECTION"}</button></div></div>;
}
