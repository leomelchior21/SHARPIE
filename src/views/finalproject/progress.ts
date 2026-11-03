import { questions } from "./content";
import { adoptLegacyBackroom } from "./backroomStore";
import { levelCount, levels } from "./switchyard/levels";
import type { FinalProjectSyncState } from "../../lib/finalProjectSync";
// lab is the Switchyard hub; yard is the Switchyard game inside it.
export const activities = ["overview","matrix","transition","lab","yard","quiz-intro","quiz","shadow","report"] as const;
export type Activity = typeof activities[number];
// Shadow Feed is hidden for now; its stage, save fields and code stay in place.
export const SHADOW_FEED_OPEN = false;
export type Progress = {
  // Backrooms Run keeps its own save on the device (backroomStore), apart from this one.
  version: 1; activity: Activity; transition: boolean; legacyXp: number;
  quizIndex: number; answers: Record<string,number>; attempts: Record<string,number>; mastered: string[];
  // The Switchyard: the level open now, levels shipped, best stars per level and each level's program.
  yardLevel: number; yardShipped: number[]; yardStars: number[]; yardDrafts: Record<string,string[]>;
  missionIndex: number; observed: number[]; repaired: number[]; patches: Record<string,string[]>;
  reflection: string; completedAt: string; awards: Record<string,number>;
};
export const freshProgress = (): Progress => ({version:1,activity:"overview",transition:false,legacyXp:0,quizIndex:0,answers:{},attempts:{},mastered:[],yardLevel:0,yardShipped:[],yardStars:Array(levelCount).fill(0),yardDrafts:{},missionIndex:0,observed:[],repaired:[],patches:{},reflection:"",completedAt:"",awards:{}});
export const storageKey = (student: string) => `sharpie:final-project:v1:${encodeURIComponent(student.trim().toLowerCase())}`;
const count = (v: unknown,max: number, fallback=0) => typeof v === "number" && Number.isFinite(v) ? Math.max(0,Math.min(max,Math.floor(v))) : fallback;
const indices = (v:unknown,max:number):number[] => Array.isArray(v) ? [...new Set(v.filter((x):x is number=>Number.isInteger(x)&&x>=0&&x<max))] : [];
// Saves from the IF / ELSE Lab: Live Flow and the Code Builder reopen as the Switchyard hub and game.
const renamed: Record<string,Activity> = { warmup:"transition", flow:"lab", builder:"yard" };
export function sanitizeProgress(raw: unknown): Progress {
  const p = freshProgress();
  if (!raw || typeof raw !== "object") return p;
  const s = raw as Partial<Progress> & { warmup?: unknown };
  if (s.version !== 1) return p;
  const activity = s.activity as string;
  p.activity = renamed[activity] ?? (activities.includes(activity as Activity) ? activity as Activity : "overview");
  p.transition=s.transition===true;
  // Preserve earned XP and existing saves when retiring Boolean Check.
  p.legacyXp=count(s.legacyXp,60,indices(s.warmup,6).length*10);
  p.quizIndex=count(s.quizIndex,20); p.missionIndex=count(s.missionIndex,3);
  p.observed=indices(s.observed,4); p.repaired=indices(s.repaired,4);
  p.yardShipped=indices(s.yardShipped,levelCount).sort((a,b)=>a-b);
  p.yardLevel=count(s.yardLevel,levelCount-1);
  p.yardStars=p.yardStars.map((_,i)=>p.yardShipped.includes(i)?Math.max(1,count(s.yardStars?.[i],3)):0);
  for (const level of levels) {
    const draft=s.yardDrafts?.[level.id];
    // Five program lines, or one typed program on the level written from scratch.
    if (Array.isArray(draft)&&(draft.length===5&&draft.every(v=>typeof v==="string"&&v.length<160)||draft.length===1&&typeof draft[0]==="string"&&draft[0].length<1200)) p.yardDrafts[level.id]=draft;
  }
  for (let i=0;i<4;i++) { const patch=s.patches?.[i]; if(Array.isArray(patch)&&patch.length===2&&patch.every(v=>typeof v==="string"&&v.length<40))p.patches[i]=patch; }
  for (const q of questions) {
    const answer=s.answers?.[q.id]; if(Number.isInteger(answer)&&answer!>=0&&answer!<4)p.answers[q.id]=answer!;
    if(s.attempts?.[q.id]) p.attempts[q.id]=count(s.attempts[q.id],999);
  }
  p.mastered=Array.isArray(s.mastered)?questions.filter(q=>s.mastered!.includes(q.id)).map(q=>q.id):[];
  p.reflection=typeof s.reflection==="string"?s.reflection.slice(0,600):"";
  p.completedAt=typeof s.completedAt==="string"&&Number.isFinite(Date.parse(s.completedAt))?s.completedAt:"";
  // Reconstruct XP from learning records; repeat runs cannot duplicate rewards.
  p.awards={};
  if(p.legacyXp)p.awards["legacy:checks"]=p.legacyXp;
  p.mastered.forEach(id=>p.awards[`quiz:${id}`]=10);
  p.yardShipped.forEach(i=>p.awards[`yard:${i}`]=30);
  p.repaired.forEach(i=>p.awards[`mission:${i}`]=50);
  return p;
}
export function loadProgress(student:string): { progress:Progress; warning:string } {
  try {
    const raw=localStorage.getItem(storageKey(student));
    const data:unknown=raw?JSON.parse(raw):null;
    // Older saves held Backrooms Run too; it moves to the game's own device save.
    adoptLegacyBackroom(student,data);
    return {progress:sanitizeProgress(data),warning:""};
  } catch { return {progress:freshProgress(),warning:"Saved progress could not be read. This session is still available; your unreadable save has not been deleted."}; }
}
export function saveProgress(student:string,p:Progress):boolean {
  try {localStorage.setItem(storageKey(student),JSON.stringify(p));return true;} catch{return false;}
}
export const xp = (p:Progress) => Object.values(p.awards).reduce((a,b)=>a+b,0);
// What the teacher dashboard sees: quiz answers, Switchyard levels and stars, and the audit fields.
export const syncSummary = (p:Progress): FinalProjectSyncState => ({
  xp:xp(p),
  quizAnswered:questions.filter(q=>p.answers[q.id]!==undefined).length,
  quizRight:questions.filter(q=>p.answers[q.id]===q.answer).length,
  quizMissed:questions.flatMap((q,i)=>p.answers[q.id]!==undefined&&p.answers[q.id]!==q.answer?[i+1]:[]),
  levels:p.yardShipped.map(i=>i+1), stars:p.yardStars.reduce((a,b)=>a+b,0),
  policies:p.repaired.length, reportDone:!!p.completedAt, reflection:p.reflection, updatedAt:new Date().toISOString(),
});
/** Every quiz question answered, right or wrong: the Switchyard game opens. */
export const quizDone = (p:Progress) => questions.every(q=>p.answers[q.id]!==undefined);
export const stageTwoDone = (p:Progress) => quizDone(p) && p.yardShipped.length===levelCount;
export const stageThreeDone = (p:Progress) => [0,1,2,3].every(i=>p.repaired.includes(i));
export function canOpen(activity:Activity,p:Progress,preview:boolean) {
  if(["shadow","report"].includes(activity))return SHADOW_FEED_OPEN&&(preview||stageTwoDone(p)&&(activity!=="report"||stageThreeDone(p)));
  if(activity==="yard")return preview||quizDone(p);
  return true;
}
export const award = (p:Progress,id:string,value:number):Progress => ({...p,awards:{...p.awards,[id]:value}});
export type Update = (change:(p:Progress)=>Progress)=>void;
