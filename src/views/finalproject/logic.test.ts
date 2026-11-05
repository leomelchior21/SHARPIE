import { describe, expect, it } from "vitest";
import { missions, questions } from "./content";
import { compare, conditionResult } from "./logic";
import { substitute, traceProgram } from "./labStories";
import { parseFinalProjectSync } from "../../lib/finalProjectSync";
import { applyGrant, award, canOpen, freshProgress, loadProgress, megaCat, quizDone, sanitizeProgress, saveProgress, stageTwoDone, storageKey, superMaker, syncSummary, xp } from "./progress";
import { blasterCount, levelCount, levels, mysteryCount } from "./switchyard/levels";
const allAnswered=Object.fromEntries(questions.map(q=>[q.id,q.answer]));
describe("Final project curriculum and behavioral validation",()=>{
  it("applies teacher grants on load without losing anything already earned",()=>{
    localStorage.removeItem(storageKey("constanzacampofiorito"));
    const granted=loadProgress("constanzacampofiorito").progress;
    expect(quizDone(granted)).toBe(true);expect(canOpen("yard",granted,false)).toBe(true);
    expect(granted.yardShipped).toEqual([0,1,2,3]);expect(granted.yardLevel).toBe(4);
    expect(syncSummary(granted)).toMatchObject({quizAnswered:20,quizRight:20,levels:[1,2,3,4]});
    const ahead=applyGrant("constanzacampofiorito",sanitizeProgress({...freshProgress(),answers:{q1:0},yardShipped:[0,1,2,3,4,5],yardStars:[3,3,3,3,3,2],yardLevel:6}));
    expect(ahead.answers.q1).toBe(0);expect(ahead.yardShipped).toEqual([0,1,2,3,4,5]);expect(ahead.yardStars.slice(0,6)).toEqual([3,3,3,3,3,2]);expect(ahead.yardLevel).toBe(6);
    expect(applyGrant("someone-else",freshProgress())).toEqual(freshProgress());
  });
  it("contains exactly the requested activities and answer key",()=>{
    expect(levels).toHaveLength(16);expect(levelCount).toBe(10);expect(mysteryCount).toBe(3);expect(blasterCount).toBe(3);expect(questions).toHaveLength(20);expect(missions).toHaveLength(4);
    expect(questions.map(q=>q.answer)).toEqual([1,0,2,3,1,2,1,0,2,1,2,1,2,0,3,1,2,0,3,0]);
    expect(questions.every(q=>q.options.length===4)).toBe(true);
  });
  it("supports each comparison, typed booleans, and refuses arbitrary expressions",()=>{
    expect(compare(60,">",60)).toBe(false);expect(compare(60,">=",60)).toBe(true);
    expect(conditionResult("hasEvidence == false","hasEvidence",false)).toBe(true);
    expect(()=>conditionResult("alert(1)","x",1)).toThrow();
    expect(()=>conditionResult("x == true","x",1)).toThrow();
  });
});
describe("Quiz traces",()=>{
  it("marks the lines an if / else runs and skips, with the substituted condition",()=>{
    const trace=traceProgram(questions[12].code);
    expect(trace.condition).toEqual({code:"30 > 30",result:false});
    expect(trace.lines).toEqual(["run","plain","run","skip","skip","skip","run","run","run","run"]);
    expect(traceProgram(questions[0].code).condition).toEqual({code:"10 < 5",result:false});
    expect(traceProgram(questions[9].code).lines.slice(2)).toEqual(["run","skip","skip","skip"]);
    expect(substitute("views > 1000","views",900)).toBe("900 > 1000");
    expect(substitute("sponsored","sponsored",true)).toBe("true");
  });
});
describe("Final project profile persistence and milestones",()=>{
  it("opens Backrooms and the Switchyard hub right away, and the yard only after the quiz",()=>{
    const p=freshProgress();
    for(const activity of ["matrix","lab","quiz-intro","quiz"] as const)expect(canOpen(activity,p,false)).toBe(true);
    expect(canOpen("yard",p,false)).toBe(false);expect(canOpen("yard",p,true)).toBe(true);
    expect(quizDone({...p,answers:{q1:0}})).toBe(false);
    // Every answer counts, right or wrong.
    const answered={...p,answers:Object.fromEntries(questions.map(q=>[q.id,0]))};
    expect(quizDone(answered)).toBe(true);expect(canOpen("yard",answered,false)).toBe(true);
  });
  it("keeps Shadow Feed hidden, even for a finished Switchyard and the teacher preview",()=>{
    const done={...freshProgress(),answers:allAnswered,yardShipped:levels.map((_,i)=>i)};
    expect(stageTwoDone(done)).toBe(true);
    for(const activity of ["shadow","report"] as const){expect(canOpen(activity,done,false)).toBe(false);expect(canOpen(activity,done,true)).toBe(false);}
  });
  it("reopens retired IF / ELSE Lab activities as the Switchyard",()=>{
    expect(sanitizeProgress({...freshProgress(),activity:"flow"}).activity).toBe("lab");
    expect(sanitizeProgress({...freshProgress(),activity:"builder"}).activity).toBe("yard");
    const old=sanitizeProgress({...freshProgress(),built:[0,1,2],drafts:{movie:["decl","","","",""]},flowPaths:{0:["true","false"]}});
    expect(old.yardShipped).toEqual([]);expect(xp(old)).toBe(0);
  });
  it("saves current activity, drafts, answers and reflection separately per student",()=>{
    const p={...freshProgress(),activity:"yard" as const,yardLevel:4,yardDrafts:{vault:["decl","if (code == 42)",'Console.WriteLine("Door opens");',"else",'Console.WriteLine("Access denied");'],pool:["if (water >= 26)\n{\n}"]},answers:{q1:1},reflection:"A correct instruction can implement an unfair rule."};
    saveProgress("ana",p);expect(loadProgress("ana").progress).toMatchObject(p);expect(loadProgress("bea").progress).toEqual(freshProgress());
    localStorage.removeItem(storageKey("ana"));
  });
  it("recovers malformed fields and reports inaccessible or corrupt storage",()=>{
    expect(sanitizeProgress({version:1,activity:"other",yardShipped:[0,0,-1,16],yardStars:[9,"x"],yardLevel:40,answers:{q1:8},yardDrafts:{cinema:["too","short"]}})).toMatchObject({activity:"overview",yardShipped:[0],yardStars:[3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],yardLevel:15,answers:{},yardDrafts:{}});
    localStorage.setItem(storageKey("broken"),"{");expect(loadProgress("broken").warning).not.toBe("");expect(localStorage.getItem(storageKey("broken"))).toBe("{");localStorage.removeItem(storageKey("broken"));
  });
  it("summarizes progress for the teacher dashboard and survives the round trip",()=>{
    const p=sanitizeProgress({...freshProgress(),yardShipped:[2,0],yardStars:[3,0,2],answers:{q1:1,q2:1},repaired:[0],reflection:"Rules need review."});
    const summary=syncSummary(p);
    expect(summary).toMatchObject({levels:[1,3],stars:5,quizAnswered:2,quizRight:1,quizMissed:[2],policies:1,reportDone:false,reflection:"Rules need review.",xp:xp(p)});
    expect(parseFinalProjectSync(JSON.parse(JSON.stringify(summary)))).toEqual(summary);
    // The Mystery line is reported apart from the ten graded levels.
    const master=sanitizeProgress({...freshProgress(),yardShipped:levels.map((_,i)=>i),yardStars:levels.map(()=>3)});
    expect(syncSummary(master)).toMatchObject({levels:[1,2,3,4,5,6,7,8,9,10],stars:30,mystery:3,blaster:3});
    expect(superMaker(master)).toBe(true);expect(superMaker({...master,yardShipped:master.yardShipped.slice(0,12)})).toBe(false);
    // The Blaster line earns the MEGA CAT BRIAN badge, apart from the Mystery title.
    expect(megaCat(master)).toBe(true);expect(megaCat({...master,yardShipped:master.yardShipped.slice(0,15)})).toBe(false);
    expect(superMaker({...master,yardShipped:master.yardShipped.slice(0,13)})).toBe(true);
    expect(parseFinalProjectSync({levels:[99,-1,"x"],quizRight:500,stars:90})).toMatchObject({levels:[10],quizRight:20,stars:30});
    // Older summaries from the IF / ELSE Lab do not count as Switchyard levels.
    expect(parseFinalProjectSync({built:[1,2,3],flows:3})).toMatchObject({levels:[],stars:0});
    expect(summary).not.toHaveProperty("tapes");
    expect(parseFinalProjectSync(null)).toBeNull();
  });
  it("never awards duplicate XP on replays",()=>{
    const p=award(award(freshProgress(),"quiz:q1",10),"quiz:q1",10);expect(xp(p)).toBe(10);
    expect(xp(sanitizeProgress({...freshProgress(),yardShipped:[0,1],awards:{"yard:0":999}}))).toBe(60);
  });
  it("migrates retired Boolean Check saves without losing XP or other activities",()=>{
    const p=sanitizeProgress({...freshProgress(),activity:"warmup",warmup:[0,1,2],legacyXp:undefined,transition:true,yardShipped:[0,1,2],answers:{q1:1}});
    expect(p.activity).toBe("transition");expect(p.legacyXp).toBe(30);
    expect(p.yardShipped).toEqual([0,1,2]);expect(p.answers).toEqual({q1:1});expect(xp(p)).toBe(120);
  });
});
