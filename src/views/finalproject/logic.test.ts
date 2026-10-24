import { describe, expect, it } from "vitest";
import { challenges, flows, missions, questions } from "./content";
import { compare, conditionResult, validatePieces } from "./logic";
import { boundaryCases, substitute, traceProgram } from "./labStories";
import { award, canOpen, enterLab, freshProgress, loadProgress, sanitizeProgress, saveProgress, stageOneDone, stageTwoDone, storageKey, xp } from "./progress";
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
    expect(validatePieces(challenges[7],challenges[7].preset).valid).toBe(false);
    expect(validatePieces(challenges[0],["age <= 12",challenges[0].yes,challenges[0].yes]).valid).toBe(false);
    expect(validatePieces(challenges[0],["", "", ""]).valid).toBe(false);
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
    const p={...freshProgress(),labVisited:true,activity:"builder" as const,builderIndex:4,drafts:{secret:["secret == 42","Door unlocked","Access denied"]},answers:{q1:1},reflection:"A correct instruction can implement an unfair rule."};
    saveProgress("ana",p);expect(loadProgress("ana").progress).toMatchObject(p);expect(loadProgress("bea").progress).toEqual(freshProgress());
    localStorage.removeItem(storageKey("ana"));
  });
  it("recovers malformed fields and reports inaccessible or corrupt storage",()=>{
    expect(sanitizeProgress({version:1,best:NaN,activity:"other",built:[0,0,-1,11],flowPaths:{0:null},answers:{q1:8}})).toMatchObject({best:0,activity:"overview",built:[0],answers:{}});
    localStorage.setItem(storageKey("broken"),"{");expect(loadProgress("broken").warning).not.toBe("");expect(localStorage.getItem(storageKey("broken"))).toBe("{");localStorage.removeItem(storageKey("broken"));
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
    expect(p.backroom).toEqual({bestXp:55,gates:9,operators:[">","<="],levels:[0,0,0,0,0,0],skills:{},coach:[]});expect(xp(p)).toBe(55);
  });
  it("restores Backrooms tape stars, field notes and their XP",()=>{
    const p=sanitizeProgress({...freshProgress(),backroom:{bestXp:40,gates:12,operators:[],coach:["steer","bogus","energy"],levels:[3,2,0,9,"x"],skills:{">":{right:4,wrong:1},bad:{right:1,wrong:0},"&&":{right:-3,wrong:2.7}}}});
    expect(p.backroom.levels).toEqual([3,2,0,3,0,0]);expect(p.backroom.coach).toEqual(["energy","steer"]);
    expect(p.backroom.skills).toEqual({">":{right:4,wrong:1},"&&":{right:0,wrong:2}});
    expect(xp(p)).toBe(40+3*20);
    expect(stageOneDone(p)).toBe(false);
    expect(stageOneDone({...p,backroom:{...p.backroom,levels:[1,1,1,1,1,1]}})).toBe(true);
  });
});
