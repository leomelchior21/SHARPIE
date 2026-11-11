import { freshShop, loadShop, repairSummary } from "./repair/logic";
import { questions } from "./content";
import { adoptLegacyBackroom } from "./backroomStore";
import { blasterCount, levelCount, levels, mysteryCount, mysteryEnd } from "./switchyard/levels";
import { buildYard, yardCode } from "./switchyard/yard";
const allLevels = levels.length;
import { MAX_CODE, type FinalProjectSyncState } from "../../lib/finalProjectSync";
import type { ClassCode } from "../../data/roster";
// lab is the Switchyard hub; yard is the Switchyard game inside it.
// repair is the Repair Shop: stage 03, saved on the device (repair/logic.ts), only for repairClasses.
export const activities = ["overview","matrix","transition","lab","yard","quiz-intro","quiz","repair","shadow","report"] as const;
export type Activity = typeof activities[number];
// Shadow Feed is hidden for now; its stage, save fields and code stay in place.
export const SHADOW_FEED_OPEN = false;
export type Progress = {
  // Backrooms Run keeps its own save on the device (backroomStore), apart from this one.
  version: 1; activity: Activity; transition: boolean; legacyXp: number;
  quizIndex: number; answers: Record<string,number>; attempts: Record<string,number>; mastered: string[];
  // The Switchyard: the level open now, levels shipped, best stars per level and each level's program.
  yardLevel: number; yardShipped: number[]; yardStars: number[]; yardDrafts: Record<string,string[]>;
  // The animated how-to-play tour has been watched (or skipped) once.
  yardIntro: boolean;
  missionIndex: number; observed: number[]; repaired: number[]; patches: Record<string,string[]>;
  reflection: string; completedAt: string; awards: Record<string,number>;
};
export const freshProgress = (): Progress => ({version:1,activity:"overview",transition:false,legacyXp:0,quizIndex:0,answers:{},attempts:{},mastered:[],yardLevel:0,yardShipped:[],yardStars:Array(allLevels).fill(0),yardDrafts:{},yardIntro:false,missionIndex:0,observed:[],repaired:[],patches:{},reflection:"",completedAt:"",awards:{}});
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
  p.yardShipped=indices(s.yardShipped,allLevels).sort((a,b)=>a-b);
  p.yardLevel=count(s.yardLevel,allLevels-1);
  p.yardIntro=s.yardIntro===true;
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
/*
 * Teacher grants, by login: a student's save is moved forward the next time it loads, on any device.
 * quiz: every question still unanswered counts as answered right. yardFrom: every Switchyard level
 * before this one (numbered from 1) counts as shipped, so the game opens on it. Nothing already earned is lost.
 */
export const grants: Record<string,{quiz?:boolean;yardFrom?:number}> = {
  constanzacampofiorito:{quiz:true,yardFrom:5},
};
export function applyGrant(student:string,p:Progress):Progress {
  const grant=grants[student.trim().toLowerCase()];
  if(!grant)return p;
  const next:Progress={...p,answers:{...p.answers},mastered:[...p.mastered],awards:{...p.awards},yardStars:[...p.yardStars]};
  if(grant.quiz)for(const q of questions){
    if(next.answers[q.id]!==undefined)continue;
    next.answers[q.id]=q.answer;
    if(!next.mastered.includes(q.id))next.mastered.push(q.id);
    next.awards[`quiz:${q.id}`]=10;
  }
  const shipped=Math.max(0,Math.min(levelCount,(grant.yardFrom??1)-1));
  if(shipped){
    next.yardShipped=[...new Set([...next.yardShipped,...Array.from({length:shipped},(_,i)=>i)])].sort((a,b)=>a-b);
    for(let i=0;i<shipped;i++){next.yardStars[i]=Math.max(1,next.yardStars[i]);next.awards[`yard:${i}`]=30;}
    if(next.yardLevel<shipped)next.yardLevel=shipped;
  }
  return next;
}
export function loadProgress(student:string): { progress:Progress; warning:string } {
  try {
    const raw=localStorage.getItem(storageKey(student));
    const data:unknown=raw?JSON.parse(raw):null;
    // Older saves held Backrooms Run too; it moves to the game's own device save.
    adoptLegacyBackroom(student,data);
    return {progress:applyGrant(student,sanitizeProgress(data)),warning:""};
  } catch { return {progress:applyGrant(student,freshProgress()),warning:"Saved progress could not be read. This session is still available; your unreadable save has not been deleted."}; }
}
export function saveProgress(student:string,p:Progress):boolean {
  try {localStorage.setItem(storageKey(student),JSON.stringify(p));return true;} catch{return false;}
}
export const xp = (p:Progress) => Object.values(p.awards).reduce((a,b)=>a+b,0);
/**
 * A Switchyard level's program as C#, for the teacher's report: line 1 declares the variable
 * (its value changes with every train, so it shows ?), then the if / else the student made. "" if there is none.
 */
export function levelProgram(index:number,p:Progress):string {
  const level=levels[index];
  if(!level)return "";
  const draft=p.yardDrafts[level.id];
  const decl=`${typeof level.spotlight==="boolean"?"bool":"int"} ${level.variable} = ?;`;
  if(level.tool==="write")return draft?.[0]?.trim()?`${decl}\n\n${draft[0].replace(/\r/g,"").trim()}`:"";
  const lines=level.preset.map((line,slot)=>level.given.includes(slot)?line:draft?.[slot]??line);
  const yard=buildYard(lines);
  if(!yard.condition)return "";
  return [decl,...yardCode(level.variable,0,yard).split("\n").slice(1)].join("\n");
}
/** Every shipped level's program, by level number from 1. */
export const shippedPrograms = (p:Progress):Record<string,string> => Object.fromEntries(
  p.yardShipped.map(i=>[String(i+1),levelProgram(i,p).slice(0,MAX_CODE)] as const).filter(([,code])=>code),
);
// What the teacher dashboard sees: quiz answers, Switchyard levels, stars and programs, the Repair Shop levels and final round, and the audit fields.
// login: whose Repair Shop save to read (it lives on the device, apart from this save).
export const syncSummary = (p:Progress, login?:string): FinalProjectSyncState => ({
  xp:xp(p),
  quizAnswered:questions.filter(q=>p.answers[q.id]!==undefined).length,
  quizRight:questions.filter(q=>p.answers[q.id]===q.answer).length,
  quizMissed:questions.flatMap((q,i)=>p.answers[q.id]!==undefined&&p.answers[q.id]!==q.answer?[i+1]:[]),
  // The main line counts for the grade; the Mystery line is reported on its own.
  levels:p.yardShipped.filter(i=>i<levelCount).map(i=>i+1), stars:p.yardStars.slice(0,levelCount).reduce((a,b)=>a+b,0),
  mystery:p.yardShipped.filter(i=>i>=levelCount&&i<mysteryEnd).length,
  blaster:p.yardShipped.filter(i=>i>=mysteryEnd).length,
  yardCodes:shippedPrograms(p),
  policies:p.repaired.length, ...repairSummary(login?loadShop(login):freshShop()), reportDone:!!p.completedAt, reflection:p.reflection, updatedAt:new Date().toISOString(),
});
/** Every quiz question answered, right or wrong: the Switchyard game opens. */
export const quizDone = (p:Progress) => questions.every(q=>p.answers[q.id]!==undefined);
export const mainShipped = (p:Progress) => p.yardShipped.filter(i=>i<levelCount).length;
/** All three Mystery levels shipped: the Super Maker Master title. */
export const superMaker = (p:Progress) => p.yardShipped.filter(i=>i>=levelCount&&i<mysteryEnd).length===mysteryCount;
/** All three Super Mega Blaster Plus Advanced levels shipped: the MEGA CAT BRIAN badge. */
export const megaCat = (p:Progress) => p.yardShipped.filter(i=>i>=mysteryEnd).length===blasterCount;
export const stageTwoDone = (p:Progress) => quizDone(p) && mainShipped(p)===levelCount;
export const stageThreeDone = (p:Progress) => [0,1,2,3].every(i=>p.repaired.includes(i));
/*
 * The classes that get the Repair Shop: all four since 2026-11-11 (9A joined last).
 * Students outside these classes (and logins not in the roster) never see it.
 */
export const repairClasses: ClassCode[] = ["9A","9B","9C","9D"];
export const repairOpen = (classCode:ClassCode|undefined,allOpen:boolean) => allOpen||(!!classCode&&repairClasses.includes(classCode));
// allOpen: the teacher, or the teacher preview. classCode: the student's class from the roster.
export function canOpen(activity:Activity,p:Progress,allOpen:boolean,classCode?:ClassCode) {
  if(activity==="repair")return repairOpen(classCode,allOpen);
  if(["shadow","report"].includes(activity))return SHADOW_FEED_OPEN&&(allOpen||stageTwoDone(p)&&(activity!=="report"||stageThreeDone(p)));
  if(activity==="yard")return allOpen||quizDone(p);
  return true;
}
export const award = (p:Progress,id:string,value:number):Progress => ({...p,awards:{...p.awards,[id]:value}});
export type Update = (change:(p:Progress)=>Progress)=>void;
