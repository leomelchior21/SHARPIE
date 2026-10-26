import { describe, expect, it } from "vitest";
import { challenges, flows, missions, printLine, questions, solution } from "./content";
import { compare, conditionResult, linesToPieces, validateLines, validatePieces } from "./logic";
import { boundaryCases, substitute, traceProgram } from "./labStories";
import { parseFinalProjectSync } from "../../lib/finalProjectSync";
import { award, canOpen, enterLab, freshProgress, loadProgress, sanitizeProgress, saveProgress, stageOneDone, stageTwoDone, storageKey, syncSummary, xp } from "./progress";
describe("Final project curriculum and behavioral validation",()=>{
  it("contains exactly the requested activities and answer key",()=>{
    expect(flows).toHaveLength(3);expect(challenges).toHaveLength(10);expect(questions).toHaveLength(20);expect(missions).toHaveLength(4);
    expect(questions.map(q=>q.answer)).toEqual([1,0,2,3,1,2,1,0,2,1,2,1,2,0,3,1,2,0,3,0]);
    expect(questions.every(q=>q.options.length===4)).toBe(true);
  });
  it("accepts all canonical solutions and inverted equivalent branches",()=>{
    for(const c of challenges)expect(validatePieces(c,[c.condition,c.yes,c.no]).valid,c.title).toBe(true);
    const battery=challenges[3];expect(validatePieces(battery,["battery >= 20",battery.no,battery.yes]).valid).toBe(true);
    const ad=challenges[7];expect(validatePieces(ad,["sponsored == true",ad.yes,ad.no]).valid).toBe(true);
  });
  it("rejects solutions that pass the current input but fail a boundary or other branch",()=>{
    const heat=challenges[2];expect(validatePieces(heat,["temperature >= 30",heat.yes,heat.no])).toEqual({valid:false,message:expect.stringContaining("temperature = 30")});
    expect(validatePieces(challenges[7],linesToPieces(challenges[7].level.preset)!).valid).toBe(false);
    expect(validatePieces(challenges[0],["age <= 12",challenges[0].yes,challenges[0].yes]).valid).toBe(false);
    expect(validatePieces(challenges[0],["", "", ""]).valid).toBe(false);
  });
  it("builds programs from five lines and names the line that is out of place",()=>{
    for(const c of challenges){
      expect(validateLines(c,solution(c)).valid,c.title).toBe(true);
      // Every bank holds what the student needs, and given lines are already in place.
      solution(c).forEach((line,n)=>expect(c.level.given.includes(n)?c.level.preset[n]:c.level.bank,c.title).toContain(line));
    }
    const movie=challenges[0],lines=solution(movie);
    expect(validateLines(movie,[lines[1],lines[0],...lines.slice(2)]).message).toBe("Line 1 must create the variable that the if tests.");
    expect(validateLines(movie,[...lines.slice(0,3),printLine(movie.no),"else"]).message).toMatch(/Line 4 must be else/);
    expect(validateLines(movie,[...lines.slice(0,4),""]).message).toMatch(/Fill every line/);
    expect(validateLines(challenges[6],challenges[6].level.preset)).toEqual({valid:false,message:expect.stringContaining("views = 1000")});
  });
  it("supports each comparison, typed booleans, and refuses arbitrary expressions",()=>{
    expect(compare(60,">",60)).toBe(false);expect(compare(60,">=",60)).toBe(true);
    expect(conditionResult("hasEvidence == false","hasEvidence",false)).toBe(true);
    expect(()=>conditionResult("alert(1)","x",1)).toThrow();
    expect(()=>conditionResult("x == true","x",1)).toThrow();
  });

});
describe("IF / ELSE Lab traces",()=>{
  it("marks the lines an if / else runs and skips, with the substituted condition",()=>{
    const trace=traceProgram(questions[12].code);
    expect(trace.condition).toEqual({code:"30 > 30",result:false});
    expect(trace.lines).toEqual(["run","plain","run","skip","skip","skip","run","run","run","run"]);
    expect(traceProgram(questions[0].code).condition).toEqual({code:"10 < 5",result:false});
    expect(traceProgram(questions[9].code).lines.slice(2)).toEqual(["run","skip","skip","skip"]);
  });
  it("tests just below, at and just above the edge",()=>{
    expect(boundaryCases("grade >= 7",5,0.25,0,10)).toEqual([6.75,7,7.25]);
    expect(boundaryCases("health == 0",0,1,0,100)).toEqual([0,1]);
    expect(boundaryCases("sponsored",true,1,0,1)).toEqual([true,false]);
    expect(substitute("views > 1000","views",900)).toBe("900 > 1000");
    expect(substitute("sponsored","sponsored",true)).toBe("true");
  });
});
describe("Final project profile persistence and milestones",()=>{
  it("makes Backrooms and IF / ELSE available without a previous run",()=>{
    const p=freshProgress();
    for(const activity of ["matrix","lab","flow","builder","quiz-intro","quiz"] as const)expect(canOpen(activity,p,false)).toBe(true);
    expect(stageOneDone({...p,best:3})).toBe(true);
  });
  it("starts the first lab visit in Live Flow and later visits at its three options",()=>{
    const first=enterLab(freshProgress());expect(first).toMatchObject({activity:"flow",labVisited:true});
    expect(enterLab({...first,activity:"overview"}).activity).toBe("lab");
    expect(sanitizeProgress({...freshProgress(),flowPaths:{0:["false"]}}).labVisited).toBe(true);
    expect(sanitizeProgress({...freshProgress(),activity:"builder"}).labVisited).toBe(true);
  });
  it("unlocks core learning without requiring all practice",()=>{
    let p=freshProgress();expect(canOpen("shadow",p,false)).toBe(false);expect(canOpen("shadow",p,true)).toBe(true);
    p={...p,best:3,transition:true};expect(stageOneDone(p)).toBe(true);expect(canOpen("flow",p,false)).toBe(true);
    p={...p,flowPaths:{0:["true","false"],1:["true","false"],2:["true","false"]},built:[0,1,2]};
    expect(stageTwoDone(p)).toBe(true);expect(canOpen("shadow",p,false)).toBe(true);expect(canOpen("report",p,false)).toBe(false);
    expect(p.answers).toEqual({});
  });
  it("saves current activity, drafts, answers and reflection separately per student",()=>{
    const p={...freshProgress(),labVisited:true,activity:"builder" as const,builderIndex:4,drafts:{secret:["decl","if (secret == 42)",printLine("Door unlocked"),"else",printLine("Access denied")]},answers:{q1:1},reflection:"A correct instruction can implement an unfair rule."};
    saveProgress("ana",p);expect(loadProgress("ana").progress).toMatchObject(p);expect(loadProgress("bea").progress).toEqual(freshProgress());
    localStorage.removeItem(storageKey("ana"));
  });
  it("recovers malformed fields and reports inaccessible or corrupt storage",()=>{
    expect(sanitizeProgress({version:1,best:NaN,activity:"other",built:[0,0,-1,11],flowPaths:{0:null},answers:{q1:8}})).toMatchObject({best:0,activity:"overview",built:[0],answers:{}});
    localStorage.setItem(storageKey("broken"),"{");expect(loadProgress("broken").warning).not.toBe("");expect(localStorage.getItem(storageKey("broken"))).toBe("{");localStorage.removeItem(storageKey("broken"));
  });
  it("summarizes progress for the teacher dashboard and survives the round trip",()=>{
    const p=sanitizeProgress({...freshProgress(),best:12,flowPaths:{0:["true","false"]},built:[2,0],answers:{q1:1,q2:1},repaired:[0],reflection:"Rules need review."});
    const summary=syncSummary(p);
    expect(summary).toMatchObject({endlessBest:12,flows:1,quizAnswered:2,quizRight:1,quizMissed:[2],built:[1,3],policies:1,reportDone:false,reflection:"Rules need review.",xp:xp(p)});
    expect(parseFinalProjectSync(JSON.parse(JSON.stringify(summary)))).toEqual(summary);
    expect(parseFinalProjectSync({built:[99,-1,"x"],quizRight:500})).toMatchObject({built:[10],quizRight:20,tapes:[0,0,0,0]});
    expect(parseFinalProjectSync(null)).toBeNull();
  });
  it("never awards duplicate XP on replays",()=>{
    const p=award(award(freshProgress(),"quiz:q1",10),"quiz:q1",10);expect(xp(p)).toBe(10);
  });
  it("migrates retired Boolean Check saves without losing XP or other activities",()=>{
    const p=sanitizeProgress({...freshProgress(),activity:"warmup",best:3,backroom:undefined,warmup:[0,1,2],legacyXp:undefined,transition:true,built:[0,1,2],answers:{q1:1}});
    expect(p.activity).toBe("transition");expect(p.legacyXp).toBe(30);expect(p.backroom.bestXp).toBe(45);
    expect(p.built).toEqual([0,1,2]);expect(p.answers).toEqual({q1:1});expect(xp(p)).toBe(165);
    expect(stageOneDone(p)).toBe(true);
  });
  it("preserves the full game's best XP, gate count and operators on reload",()=>{
    const p=sanitizeProgress({...freshProgress(),best:4,backroom:{bestXp:55,gates:9,operators:[">","<=",">","bad"]}});
    expect(p.backroom).toEqual({bestXp:55,gates:9,operators:[">","<="],levels:[0,0,0,0],skills:{},coach:[],layout:3});expect(xp(p)).toBe(55);
  });
  it("restores Backrooms tape stars, field notes and their XP",()=>{
    const p=sanitizeProgress({...freshProgress(),backroom:{bestXp:40,gates:12,operators:[],coach:["steer","bogus","energy"],levels:[3,2,0,9,"x"],skills:{">":{right:4,wrong:1},bad:{right:1,wrong:0},"&&":{right:-3,wrong:2.7}}}});
    // A save from before the tape reorder: its stars move with their tapes (old Two Doors 9→3 is now tape 02; Edge + Exactly merge).
    expect(p.backroom.levels).toEqual([3,3,2,0]);expect(p.backroom.coach).toEqual(["energy","steer"]);
    expect(sanitizeProgress({...freshProgress(),backroom:{...p.backroom,levels:[3,2,0,1,0,0],layout:2}}).backroom.levels).toEqual([3,2,1,0]);
    expect(sanitizeProgress({...freshProgress(),backroom:{...p.backroom,levels:[3,2,1,0],layout:3}}).backroom.levels).toEqual([3,2,1,0]);
    expect(p.backroom.skills).toEqual({">":{right:4,wrong:1},"&&":{right:0,wrong:2}});
    expect(xp(p)).toBe(40+3*20);
    expect(stageOneDone(p)).toBe(false);
    expect(stageOneDone({...p,backroom:{...p.backroom,levels:[1,1,1,1]}})).toBe(true);
  });
});
