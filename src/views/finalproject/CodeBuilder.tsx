import { useState } from "react";
import { SyntaxLine } from "../../components/SyntaxLine";
import { challenges, type Input } from "./content";
import { runProgram, validatePieces } from "./logic";
import { award, type Progress, type Update } from "./progress";
import { InputControl, Panel, useExecution } from "./shared";
export function CodeBuilder({progress:p,update}:{progress:Progress;update:Update}) {
  return <><nav className="fp-levels" aria-label="Code Builder challenges"><span>CHALLENGE<br/><b>{String(p.builderIndex+1).padStart(2,"0")} / 10</b></span>{challenges.map((c,i)=><button key={c.id} aria-label={`Challenge ${i+1}: ${c.title}`} aria-pressed={p.builderIndex===i} className={p.built.includes(i)?"done":""} onClick={()=>update(p=>({...p,builderIndex:i}))}>{i+1}{p.built.includes(i)?" ✓":""}</button>)}</nav><Builder key={p.builderIndex} progress={p} update={update}/></>;
}
function Builder({progress:p,update}:{progress:Progress;update:Update}) {
  const i=p.builderIndex,s=challenges[i],pieces=p.drafts[s.id]??s.preset;
  const [slot,setSlot]=useState(pieces.findIndex(v=>!v)<0?1:pieces.findIndex(v=>!v));
  const [value,setValue]=useState<Input>(s.initial);const [hint,setHint]=useState(0);
  const [feedback,setFeedback]=useState("");const [output,setOutput]=useState("");const [valid,setValid]=useState(false);
  const {run,busy,error}=useExecution();
  const change=(next:string[])=>{update(p=>({...p,drafts:{...p.drafts,[s.id]:next}}));setValid(false);setOutput("");setFeedback("");};
  const place=(piece:string)=>{const next=[...pieces];next[slot]=piece;change(next);const empty=next.findIndex(v=>!v);if(empty>=0)setSlot(empty);};
  const check=()=>run(async signal=>{
    const checked=validatePieces(s,pieces);setFeedback(checked.message);setValid(checked.valid);
    if(!checked.valid)return;
    const printed=await runProgram(s,value,pieces,signal);setOutput(printed);
    update(p=>award({...p,built:[...new Set([...p.built,i])]},`builder:${i}`,30));
  });
  const outputs=[s.yes,s.no,...(i===9?["HIDE"]:[])];
  const slotButton=(n:number)=><button className={`fp-slot ${slot===n?"selected":""}`} disabled={busy} aria-label={`Select ${["condition","IF output","ELSE output"][n]} slot`} aria-pressed={slot===n} onClick={()=>setSlot(n)}>{pieces[n]?<SyntaxLine code={n===0?pieces[n]:`Console.WriteLine(${JSON.stringify(pieces[n])})`}/>:<span>{i<3?["? condition","? IF action","? ELSE action"][n]:"?"}</span>}</button>;
  return <div className="fp-builder-layout"><Panel title={`YOUR MISSION / ${s.phase}`} className="fp-mission"><h1>{s.title}<em>.</em></h1><p>{s.description}</p><div className={`fp-illustration scene-${s.id}`} aria-hidden="true"><span>SHARPIE / {s.id==="movie"?"PICTURES":"DECISION LAB"}</span><b>{s.symbol}</b><small>{s.variable.toUpperCase()} = {String(value)}</small></div>{i<4&&<div className="fp-two-paths"><span><b>IF</b> {s.yes}</span><span><b>ELSE</b> {s.no}</span></div>}<p className="fp-note">{s.note}</p><button className="fp-help" disabled={hint>=3} onClick={()=>setHint(h=>h+1)}>◇ {hint>=3?"All hints shown":"Need a hint?"}</button>{hint>0&&<p className="fp-hint" role="status">{s.hints[hint-1]}</p>}</Panel>
    <Panel title="BUILD YOUR CODE · TAP A SLOT, THEN A PIECE" className="fp-assembly"><div className="fp-build-code"><div><SyntaxLine code={`${typeof value==="boolean"?"bool":"int"} ${s.variable} = ${value};`}/></div><div><span className="fp-keyword">if</span> ( {slotButton(0)} )</div><div>{"{"}</div><div className="indented">{slotButton(1)} ;</div><div>{"}"}</div><div className="fp-keyword">else</div><div>{"{"}</div><div className="indented">{slotButton(2)} ;</div><div>{"}"}</div></div><div className="fp-piece-tray"><div className="fp-panel-label">{slot===0?"CONDITION PIECES":"OUTPUT PIECES"}</div><div className="fp-pieces">{(slot===0?s.conditions:outputs).map(piece=><button key={piece} disabled={busy} onClick={()=>place(piece)}><SyntaxLine code={slot===0?piece:`Console.WriteLine(${JSON.stringify(piece)})`}/></button>)}</div></div><div className="fp-inline-actions"><button disabled={busy} onClick={()=>change(pieces.map((v,n)=>n===slot?"":v))}>Remove selected</button><button disabled={busy} onClick={()=>{change([...s.preset]);setSlot(s.preset.findIndex(v=>!v)<0?1:s.preset.findIndex(v=>!v));}}>Reset code</button></div></Panel>
    <Panel title="TEST YOUR CODE"><InputControl scenario={s} value={value} disabled={busy} onChange={v=>{setValue(v);setOutput("");}}/><button className="fp-primary" disabled={busy} onClick={check}>{busy?"RUNNING…":"▶ CHECK CODE + RUN"}</button><div className={`fp-feedback ${valid?"success":""}`} role="status">{error||feedback||"Place the pieces. C# supplies the braces and semicolons."}</div><div className="fp-output"><small>OUTPUT</small><strong>{output?`> ${output}`:"Waiting for a valid program…"}</strong></div>{valid&&output&&<button className="fp-next" onClick={()=>update(p=>({...p,builderIndex:Math.min(9,i+1),activity:i===9?"lab":"builder"}))}>{i===9?"BACK TO THE LAB":"NEXT CHALLENGE →"}</button>}</Panel>
  </div>;
}
