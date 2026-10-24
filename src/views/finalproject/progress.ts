import { challenges, flows, questions } from "./content";
import { comparisonOperators, skillKeys, type ComparisonOperator } from "./backroom/backroomEngine";
import { coachMoments, levelCount, normalizeStars, type CoachMoment } from "./backroom/backroomLevels";
import type { SkillRecord } from "./backroom/types";
import type { FinalProjectSyncState } from "../../lib/finalProjectSync";
export const activities = ["overview","matrix","transition","lab","flow","builder","quiz-intro","quiz","shadow","report"] as const;
export type Activity = typeof activities[number];
export type Progress = {
  version: 1; activity: Activity; best: number; transition: boolean; legacyXp: number;
  backroom: { bestXp: number; gates: number; operators: ComparisonOperator[]; levels: number[]; skills: SkillRecord; coach: CoachMoment[] };
  flowIndex: number; flowPaths: Record<string,string[]>; flowValues: number[];
  labVisited: boolean;
  builderIndex: number; built: number[]; drafts: Record<string,string[]>;
  quizIndex: number; answers: Record<string,number>; attempts: Record<string,number>; mastered: string[];
  missionIndex: number; observed: number[]; repaired: number[]; patches: Record<string,string[]>;
  reflection: string; completedAt: string; awards: Record<string,number>;
};
export const freshProgress = (): Progress => ({version:1,activity:"overview",best:0,transition:false,legacyXp:0,backroom:{bestXp:0,gates:0,operators:[],levels:normalizeStars([]),skills:{},coach:[]},labVisited:false,flowIndex:0,flowPaths:{},flowValues:[5,12,900],builderIndex:0,built:[],drafts:{},quizIndex:0,answers:{},attempts:{},mastered:[],missionIndex:0,observed:[],repaired:[],patches:{},reflection:"",completedAt:"",awards:{}});
export const storageKey = (student: string) => `sharpie:final-project:v1:${encodeURIComponent(student.trim().toLowerCase())}`;
const count = (v: unknown,max: number, fallback=0) => typeof v === "number" && Number.isFinite(v) ? Math.max(0,Math.min(max,Math.floor(v))) : fallback;
const indices = (v:unknown,max:number):number[] => Array.isArray(v) ? [...new Set(v.filter((x):x is number=>Number.isInteger(x)&&x>=0&&x<max))] : [];
export function sanitizeProgress(raw: unknown): Progress {
  const p = freshProgress();
  if (!raw || typeof raw !== "object") return p;
  const s = raw as Partial<Progress> & { warmup?: unknown };
  if (s.version !== 1) return p;
  p.activity = (s.activity as string) === "warmup" ? "transition" : activities.includes(s.activity as Activity) ? s.activity! : "overview";
  p.best=count(s.best,100000); p.transition=s.transition===true;
  // Preserve earned XP and existing saves when retiring Boolean Check.
  p.legacyXp=count(s.legacyXp,60,indices(s.warmup,6).length*10);
  p.backroom={
    bestXp:count(s.backroom?.bestXp,1500000,p.best*15),
    gates:Math.max(p.best,count(s.backroom?.gates,10000000,p.best)),
    operators:Array.isArray(s.backroom?.operators)?[...new Set(s.backroom.operators.filter(op=>comparisonOperators.includes(op)))]:[],
    levels:normalizeStars(Array.isArray(s.backroom?.levels)?s.backroom.levels:[]),
    skills:{},
    coach:Array.isArray(s.backroom?.coach)?coachMoments.filter(moment=>s.backroom!.coach.includes(moment)):[],
  };
  for (const key of skillKeys) { const record=s.backroom?.skills?.[key]; if(record&&typeof record==="object")p.backroom.skills[key]={right:count(record.right,1000000),wrong:count(record.wrong,1000000)}; }
  p.flowIndex=count(s.flowIndex,2); p.builderIndex=count(s.builderIndex,9); p.quizIndex=count(s.quizIndex,20); p.missionIndex=count(s.missionIndex,3);
  p.built=indices(s.built,10); p.observed=indices(s.observed,4); p.repaired=indices(s.repaired,4);
  p.flowValues=p.flowValues.map((v,i)=>{
    const stored=s.flowValues?.[i],flow=flows[i];
    return typeof stored==="number"&&Number.isFinite(stored)?Math.round(Math.max(flow.min,Math.min(flow.max,stored))/flow.step)*flow.step:v;
  });
  for (let i=0;i<3;i++) p.flowPaths[i]=Array.isArray(s.flowPaths?.[i]) ? [...new Set(s.flowPaths[i].filter(v=>v==="true"||v==="false"))] : [];
  for (const c of challenges) {
    const draft=s.drafts?.[c.id];
    if (Array.isArray(draft)&&draft.length===5&&draft.every(v=>typeof v==="string"&&v.length<160)) p.drafts[c.id]=draft;
  }
  for (let i=0;i<4;i++) { const patch=s.patches?.[i]; if(Array.isArray(patch)&&patch.length===2&&patch.every(v=>typeof v==="string"&&v.length<40))p.patches[i]=patch; }
  for (const q of questions) {
    const answer=s.answers?.[q.id]; if(Number.isInteger(answer)&&answer!>=0&&answer!<4)p.answers[q.id]=answer!;
    if(s.attempts?.[q.id]) p.attempts[q.id]=count(s.attempts[q.id],999);
  }
  p.mastered=Array.isArray(s.mastered)?questions.filter(q=>s.mastered!.includes(q.id)).map(q=>q.id):[];
  p.labVisited=s.labVisited===true || ["lab","flow","builder","quiz-intro","quiz"].includes(p.activity) || Object.values(p.flowPaths).some(paths=>paths.length>0) || p.built.length>0 || Object.keys(p.answers).length>0;
  p.reflection=typeof s.reflection==="string"?s.reflection.slice(0,600):"";
  p.completedAt=typeof s.completedAt==="string"&&Number.isFinite(Date.parse(s.completedAt))?s.completedAt:"";
  // Reconstruct XP from learning records; repeat runs cannot duplicate rewards.
  p.awards={};
  if(p.backroom.bestXp)p.awards["backroom:best-run"]=p.backroom.bestXp;
  p.backroom.levels.forEach((stars,i)=>{if(stars>0)p.awards[`backroom:level:${i}`]=levelXp;});
  if(p.legacyXp)p.awards["legacy:checks"]=p.legacyXp;
  Object.entries(p.flowPaths).forEach(([i,paths])=>paths.forEach(path=>p.awards[`flow:${i}:${path}`]=10));
  p.built.forEach(i=>p.awards[`builder:${i}`]=30);
  p.mastered.forEach(id=>p.awards[`quiz:${id}`]=10);
  p.repaired.forEach(i=>p.awards[`mission:${i}`]=50);
  return p;
}
export function loadProgress(student:string): { progress:Progress; warning:string } {
  try {
    const raw=localStorage.getItem(storageKey(student));
    return {progress:sanitizeProgress(raw?JSON.parse(raw):null),warning:""};
  } catch { return {progress:freshProgress(),warning:"Saved progress could not be read. This session is still available; your unreadable save has not been deleted."}; }
}
export function saveProgress(student:string,p:Progress):boolean {
  try {localStorage.setItem(storageKey(student),JSON.stringify(p));return true;} catch{return false;}
}
export const xp = (p:Progress) => Object.values(p.awards).reduce((a,b)=>a+b,0);
// What the teacher dashboard sees: counts per activity, missed quiz questions and the reflection.
export const syncSummary = (p:Progress): FinalProjectSyncState => ({
  xp:xp(p), tapes:[...p.backroom.levels], endlessBest:p.best,
  flows:[0,1,2].filter(i=>p.flowPaths[i]?.length===2).length,
  quizAnswered:questions.filter(q=>p.answers[q.id]!==undefined).length,
  quizRight:questions.filter(q=>p.answers[q.id]===q.answer).length,
  quizMissed:questions.flatMap((q,i)=>p.answers[q.id]!==undefined&&p.answers[q.id]!==q.answer?[i+1]:[]),
  built:[...p.built].sort((a,b)=>a-b).map(i=>i+1), policies:p.repaired.length,
  reportDone:!!p.completedAt, reflection:p.reflection, updatedAt:new Date().toISOString(),
});
export const levelXp = 20;
// Older saves finished stage 1 with three gates in the original game.
export const stageOneDone = (p:Progress) => p.best>=3 || (p.backroom.levels.length===levelCount && p.backroom.levels.every(stars=>stars>0));
export const stageTwoDone = (p:Progress) => [0,1,2].every(i=>(p.flowPaths[i]?.length??0)===2) && [0,1,2].every(i=>p.built.includes(i));
export const stageThreeDone = (p:Progress) => [0,1,2,3].every(i=>p.repaired.includes(i));
export function canOpen(activity:Activity,p:Progress,preview:boolean) {
  if(preview)return true;
  if(["lab","flow","builder","quiz-intro","quiz"].includes(activity))return true;
  if(["shadow","report"].includes(activity))return stageTwoDone(p)&&(activity!=="report"||stageThreeDone(p));
  return true;
}
export const award = (p:Progress,id:string,value:number):Progress => ({...p,awards:{...p.awards,[id]:value}});
export type Update = (change:(p:Progress)=>Progress)=>void;
export function enterLab(p:Progress):Progress {
  return {...p,labVisited:true,activity:p.labVisited?"lab":"flow"};
}
