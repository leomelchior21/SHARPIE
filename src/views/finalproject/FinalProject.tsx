import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Eye, Footprints, LockKeyhole, ShieldCheck, TrainFront, Wrench } from "lucide-react";
import { Brand } from "../../components/Brand";
import { SHADOW_FEED_OPEN, canOpen, repairOpen, freshProgress, loadProgress, saveProgress, stageThreeDone, stageTwoDone, syncSummary, xp, type Activity, type Progress } from "./progress";
import { queueFinalProjectSync } from "../../lib/finalProjectSync";
import { Code, useExecution } from "./shared";
import { executeCSharp } from "../../lib/runner";
import { MatrixRun } from "./MatrixRun";
import { backroomStageDone, loadBackroomProgress, saveBackroomProgress } from "./backroomStore";
import { createBackroomProgress, type BackroomProgress } from "./backroom/types";
import { Quiz, QuizIntro } from "./Quiz";
import { Switchyard } from "./switchyard/Switchyard";
import { SwitchyardHome } from "./switchyard/SwitchyardHome";
import { ShadowFeed } from "./ShadowFeed";
import { AuditReport } from "./AuditReport";
import { RepairShop } from "./repair/RepairShop";
import { restoreRepair } from "./repair/remote";
import { allMachines, cleared, loadShop } from "./repair/logic";
import { findStudent, type ClassCode } from "../../data/roster";
import "./finalproject.css";
import "./lab.css";
const labels:Record<Activity,string>={overview:"FINAL PROJECT",matrix:"BACKROOMS RUN",transition:"THE C# CONNECTION",lab:"SWITCHYARD",yard:"THE SWITCHYARD","quiz-intro":"QUIZ",quiz:"QUIZ",repair:"REPAIR SHOP",shadow:"SHADOW FEED",report:"AUDIT REPORT"};
// classCode: the student's class; it comes from the roster unless a QA page passes one.
export function FinalProject({name,studentKey,isTeacher,onBack,classCode=findStudent(studentKey)?.classCode}:{name:string;studentKey:string;isTeacher:boolean;onBack:()=>void;classCode?:ClassCode}) {
  const [loaded]=useState(()=>loadProgress(studentKey));
  const [p,setP]=useState(loaded.progress);const [preview,setPreview]=useState(false);const [previewProgress,setPreviewProgress]=useState(freshProgress);
  const [warning,setWarning]=useState(loaded.warning);
  const [headerSlot,setHeaderSlot]=useState<HTMLDivElement|null>(null);
  // Backrooms Run saves on this device only; nothing from it is synced to the teacher.
  const [backroom,setBackroom]=useState(()=>loadBackroomProgress({username:studentKey,name,isTeacher}));
  const [previewBackroom,setPreviewBackroom]=useState(()=>createBackroomProgress(name,studentKey,true));
  const activeBackroom=preview?previewBackroom:backroom;
  const saveBackroom=useCallback((next:BackroomProgress)=>{
    if(preview){setPreviewBackroom(next);return;}
    saveBackroomProgress(next);setBackroom(next);
  },[preview]);
  const active=preview?previewProgress:p;
  const update=useCallback((change:(p:Progress)=>Progress)=>{
    if(preview){setPreviewProgress(change);return;}
    setP(previous=>{const next=change(previous);const saved=saveProgress(studentKey,next);setWarning(saved?"":"This browser cannot save progress right now. Keep this tab open; you can still export your report.");if(!isTeacher)queueFinalProjectSync(studentKey,()=>syncSummary(next,studentKey));return next;});
  },[preview,studentKey,isTeacher]);
  // Saves from before the dashboard sync reach the teacher on the next visit.
  // Repair Shop levels cleared on another tablet come back first, so the dashboard copy never goes down.
  useEffect(()=>{if(isTeacher)return;void restoreRepair(studentKey).finally(()=>queueFinalProjectSync(studentKey,()=>syncSummary(loadProgress(studentKey).progress,studentKey)));},[isTeacher,studentKey]);
  // A Repair Shop level paid (or a coin spent): the dashboard summary goes again, read fresh from this device's saves.
  const repairChanged=useCallback(()=>{if(!isTeacher&&!preview)queueFinalProjectSync(studentKey,()=>syncSummary(loadProgress(studentKey).progress,studentKey));},[isTeacher,preview,studentKey]);
  // Teachers always have the quiz and every Switchyard level open, preview or not.
  const allOpen=preview||isTeacher;
  // A save left inside a stage this student cannot open (e.g. the Repair Shop in 9A) falls back to the stage list.
  const activity=canOpen(active.activity,active,allOpen,classCode)?active.activity:"overview";
  const go=(next:Activity)=>{if(canOpen(next,active,allOpen,classCode))update(p=>({...p,activity:next}));};
  // The Repair Shop (only some classes) keeps its coins and tools on this device.
  const repair=repairOpen(classCode,allOpen);
  const repairShop=activity==="overview"&&!preview?loadShop(studentKey):null;
  const repairDetail=repairShop?`${allMachines.filter(m=>cleared(repairShop,m)).length} of ${allMachines.length} levels cleared · ${repairShop.coins} coins`:"Seven machines to fix";
  const one=backroomStageDone(activeBackroom),two=stageTwoDone(active),three=stageThreeDone(active);
  // Inside the Switchyard, Back returns to its two stations.
  const inLab=["yard","quiz-intro","quiz"].includes(activity);
  return <section className={`fp-shell fp-activity-${activity} ${activity==="shadow"||activity==="report"?"fp-audit-theme":""} ${activity==="matrix"?"fp-game-shell":""} ${["lab","yard","quiz-intro","quiz"].includes(activity)?"fp-yard-theme":""} ${activity==="repair"?"fp-yard-theme fp-repair-theme":""}`}>
    <header className="fp-header">
      <Brand compact/>
      <div className="fp-header-title"><small>FINAL PROJECT {preview&&<span className="fp-preview-marker">· PREVIEW</span>}</small><b>{labels[activity]}</b></div>
      {/* The Switchyard puts its level line here. */}
      {(activity==="yard"||activity==="repair")&&<div className="fp-header-slot" ref={setHeaderSlot}/>}
      <div className="fp-header-actions"><span className="fp-xp">ϟ {xp(active)} XP</span>
        {isTeacher&&<button className={preview?"preview-on":""} aria-label={preview?"Exit teacher preview":"Teacher preview"} aria-pressed={preview} onClick={()=>setPreview(!preview)}><Eye size={16}/></button>}
        <button className="fp-back" onClick={()=>activity==="overview"?onBack():go(inLab?"lab":"overview")}><ArrowLeft size={15}/> BACK</button>
      </div>
    </header>
    {warning&&<div className="fp-save-warning" role="status">{warning}</div>}
    <div className="fp-content" key={`${preview}-${activity}`}>
    {activity==="overview"&&<><div className="fp-stage-grid memory-experience-grid">{[
      {title:"Backrooms Run",copy:"Every gate runs C#. Read it right or lose a battery.",icon:Footprints,color:"memory-card-purple fp-stage--backrooms",activity:"matrix" as Activity,enabled:true,done:one,unlock:"",detail:`Tapes: ${activeBackroom.levelStars.filter(stars=>stars>0).length}/${activeBackroom.levelStars.length} · Endless best: ${activeBackroom.backroomRunBest} gates`},
      {title:"Switchyard",copy:"Pass the quiz, then run the yard: your C# throws every switch.",icon:TrainFront,color:"fp-stage--yard",activity:"lab" as Activity,enabled:true,done:two,unlock:"",detail:`${Object.keys(active.answers).length}/20 quiz · ${active.yardShipped.length}/10 levels`},
      // Not every class has the Repair Shop yet: no card at all, and the cards after it move up a number.
      ...(repair?[{title:"Repair Shop",copy:"Open broken machines, fix the insides, reprogram the logic chip.",icon:Wrench,color:"fp-stage--repair",activity:"repair" as Activity,enabled:true,done:false,unlock:"",detail:repairDetail}]:[]),
      // Shadow Feed is hidden for now.
      ...(SHADOW_FEED_OPEN?[{title:"Shadow Feed",copy:"Operation White Hat. Audit the rules behind the feed.",icon:ShieldCheck,color:"memory-card-red",activity:"shadow" as Activity,enabled:two||preview,done:three,unlock:"SWITCHYARD",detail:`${active.repaired.length}/4 policies repaired · ${three?"Report ready":"Audit pending"}`}]:[]),
    ].map((s,i)=>({...s,n:String(i+1).padStart(2,"0")})).map(s=><button
      key={s.title}
      className={`fp-stage memory-experience-card ${s.color} ${s.enabled?"is-available":"is-locked"}`}
      disabled={!s.enabled}
      onClick={()=>go(s.activity)}
      aria-label={`${s.title}. ${s.detail}. ${s.enabled?"Open stage":`Unlock: ${s.unlock}`}`}
    >
      <span className="memory-card-number">{s.n}</span>
      <span className="memory-card-icon"><s.icon size={28}/></span>
      <span className="memory-card-copy"><strong>{s.title}</strong><small>{s.copy}</small></span>
      <span className="memory-card-status">{s.enabled?s.done?<><Check size={14}/> COMPLETE</>:<><i/> {s.unlock?"UNLOCKED":"AVAILABLE"}</>:<><LockKeyhole size={14}/> UNLOCK: {s.unlock}</>}</span>
      {s.enabled&&<span className="memory-card-enter">ENTER <ArrowUpRight size={18}/></span>}
    </button>)}</div><div className="fp-overview-bottom"><p>Welcome back, <b>{name}</b>. Your progress is saved in this browser.</p>{SHADOW_FEED_OPEN&&three&&<button onClick={()=>go("report")}>OPEN AUDIT REPORT →</button>}</div></>}
    {activity==="matrix"&&<MatrixRun progress={{...activeBackroom,isTeacher:isTeacher||preview}} onProgress={saveBackroom} preview={preview} onBack={()=>go("overview")}/>}
    {activity==="transition"&&<Transition update={update} completed={active.transition} canContinue={one} onNext={()=>go("lab")} onRun={()=>go("matrix")}/>}
    {activity==="lab"&&<SwitchyardHome progress={active} allOpen={allOpen} onQuiz={()=>go("quiz-intro")} onYard={()=>go("yard")}/>}
    {activity==="quiz-intro"&&<QuizIntro progress={active} onStart={()=>go("quiz")} onPick={allOpen?index=>update(p=>({...p,quizIndex:index,activity:"quiz"})):undefined}/>}
    {activity==="yard"&&<Switchyard progress={active} update={update} allOpen={allOpen} headerSlot={headerSlot} onHub={()=>go("lab")}/>}
    {activity==="quiz"&&<Quiz progress={active} update={update} allOpen={allOpen} onYard={()=>go("yard")}/>}
    {activity==="repair"&&<RepairShop name={name} studentKey={studentKey} progress={active} teacher={allOpen} preview={preview} headerSlot={headerSlot} onShopChange={repairChanged}/>}
    {activity==="shadow"&&<ShadowFeed progress={active} update={update}/>}
    {activity==="report"&&<AuditReport name={name} progress={active} update={update}/>}
    </div></section>;
}
function Transition({update,completed,canContinue,onNext,onRun}:{update:(f:(p:Progress)=>Progress)=>void;completed:boolean;canContinue:boolean;onNext:()=>void;onRun:()=>void}) {
  const [output,setOutput]=useState("");const {run,busy,error}=useExecution();const code='int energy = 75;\n\nbool gateOpen = energy > 60;\n\nConsole.WriteLine(gateOpen);';
  return <div className="fp-transition"><small>THE CONDITION YOU PLAYED IS THE CODE YOU CAN READ.</small><h1>You already know a boolean.</h1><div className="fp-connection"><span>ENERGY 75</span><i>→</i><span>75 &gt; 60</span><i>→</i><span className={output?"lit":""}>{output||"?"}</span></div><Code code={code} active={output?4:-1}/><p><b>bool</b> holds one of two values: <code>true</code> or <code>false</code>. The comparison controls the gate. In C#, <code>Console.WriteLine</code> prints <b>True</b>.</p><button className="fp-primary" disabled={busy} onClick={()=>run(async signal=>{const result=await executeCSharp(code,signal);if(!result.success)throw new Error(result.error?.message);setOutput(result.output.trim());update(p=>({...p,transition:true}));})}>{busy?"RUNNING…":"▶ RUN THE C# CONNECTION"}</button><p role="status">{error||output&&`The gate opens: ${output}`||completed&&"Connection explored. You can replay it."}</p><div className="fp-inline-actions"><button onClick={onRun}>Final run / keep playing</button><button disabled={!canContinue} onClick={onNext}>{canContinue?"CONTINUE TO THE SWITCHYARD →":"NEED 3 PASSED GATES + THE C# CONNECTION"}</button></div></div>;
}
