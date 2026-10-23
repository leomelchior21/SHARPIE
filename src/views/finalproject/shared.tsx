import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SyntaxLine } from "../../components/SyntaxLine";
import type { Input, Scenario } from "./content";
export function Panel({ title, children, className="" }: {title:string;children:ReactNode;className?:string}) {
  return <section className={`fp-panel ${className}`}><div className="fp-panel-label">{title}</div>{children}</section>;
}
export function Code({ code, active=-1 }: {code:string;active?:number}) {
  return <pre className="fp-code" aria-label="C# program">{code.split("\n").map((line,i)=><span className={`fp-code-line ${active===i?"is-active":""}`} key={i}><span className="fp-line-number" aria-hidden="true">{i+1}</span><code><SyntaxLine code={line}/></code></span>)}</pre>;
}
export function InputControl({scenario:s,value,onChange,disabled=false}:{scenario:Pick<Scenario,"variable"|"min"|"max"|"step">;value:Input;onChange:(v:Input)=>void;disabled?:boolean}) {
  return <div className="fp-input"><label>{s.variable.toUpperCase()} · INPUT</label>{typeof value==="boolean"?<div className="fp-toggle">{[true,false].map(v=><button key={String(v)} disabled={disabled} aria-pressed={v===value} onClick={()=>onChange(v)}>{String(v)}</button>)}</div>:<><div className="fp-stepper"><button aria-label={`Decrease ${s.variable}`} disabled={disabled||value<=s.min} onClick={()=>onChange(Math.max(s.min,value-s.step))}>‹</button><output>{value}</output><button aria-label={`Increase ${s.variable}`} disabled={disabled||value>=s.max} onClick={()=>onChange(Math.min(s.max,value+s.step))}>›</button></div><input aria-label={s.variable} type="range" min={s.min} max={s.max} step={s.step} value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}/><div className="fp-range-ends"><span>{s.min}</span><span>{s.max}</span></div></>}</div>;
}
export function useExecution() {
  const controller=useRef<AbortController>();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>()=>controller.current?.abort(),[]);
  const run=async (task:(signal:AbortSignal)=>Promise<void>)=>{
    if(controller.current&&!controller.current.signal.aborted)return;
    const current=new AbortController();controller.current=current;setBusy(true);setError("");
    try{await task(current.signal);}catch(e){if(!current.signal.aborted)setError((e as Error).message||"The run failed. Try again.");}
    finally{if(!current.signal.aborted){setBusy(false);controller.current=undefined;}}
  };
  return {run,busy,error};
}
export const waitStep=(signal:AbortSignal,ms:number)=>new Promise<void>((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException("Cancelled","AbortError"));return;}
  const abort=()=>{clearTimeout(timer);reject(new DOMException("Cancelled","AbortError"));};
  const timer=window.setTimeout(()=>{signal.removeEventListener("abort",abort);resolve();},ms);
  signal.addEventListener("abort",abort,{once:true});
});
