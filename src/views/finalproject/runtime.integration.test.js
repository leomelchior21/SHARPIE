import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { challenges, flows, missions, program, questions } from "./content";
import { conditionResult } from "./logic";
let handler;const messages=[];
vm.runInNewContext(readFileSync("public/sharpie-runner.worker.js","utf8"),{performance,setTimeout:callback=>callback(),self:{addEventListener:(_name,callback)=>{handler=callback;},postMessage:message=>messages.push(message)}});
const run=code=>{messages.length=0;handler({data:{requestId:"final-project-test",code}});return messages.find(m=>m.type==="response").result;};
describe("Final project uses the existing C# worker",()=>{
  it("executes all quiz answers with correct C# capitalization",()=>{
    questions.filter(q=>!["q7","q20"].includes(q.id)).forEach(q=>{
      const result=run(q.code);expect(result.success,q.id).toBe(true);const expected=q.options[q.answer];expect(result.output.trim(),q.id).toBe(expected==="Nothing prints"?"":expected);
    });expect(run(questions[19].code).output).toBe("HIDE\n");
  });
  it("executes every Live Flow and builder in both branches and at boundaries",()=>{
    [...flows,...challenges].forEach(s=>{
      const inputs=typeof s.initial==="boolean"?[true,false]:[s.min,s.initial,s.max,...(s.condition.match(/\d+$/)?[-1,0,1].map(n=>Number(s.condition.match(/\d+$/)[0])+n):[])];
      for(const input of inputs){const result=run(program(s,input));expect(result.success,`${s.title} ${input}`).toBe(true);expect(result.output.trim()).toBe(conditionResult(s.condition,s.variable,input)?s.yes:s.no);}
    });
  });
  it("executes every broken and repaired audit rule",()=>{
    missions.forEach(m=>{for(const outputs of [m.broken,m.repaired])for(const input of [true,false]){
      const result=run(program({variable:m.variable,initial:input,condition:m.variable,yes:outputs[0],no:outputs[1]}));expect(result).toMatchObject({success:true,output:`${outputs[input?0:1]}\n`});
    }});
  });
  it("executes every quarter-point grade with a valid C# double declaration",()=>{
    const school=flows[0];
    for(let grade=0;grade<=10;grade+=0.25){
      const code=program(school,grade);expect(code).toContain(`double grade = ${grade};`);
      expect(run(code)).toMatchObject({success:true,output:`${grade>=7?school.yes:school.no}\n`});
    }
  });
  it("handles quoted delimiters, comments, assignments, and IF without ELSE",()=>{
    expect(run('string message = "if (x) { yes; }"; bool flag = true; if (flag) { Console.WriteLine(message); } // else\nConsole.WriteLine("Done");')).toMatchObject({success:true,output:"if (x) { yes; }\nDone\n"});
    expect(run('int x=3; if (x > 1) { x = 8; } else { x = 9; } Console.WriteLine(x);')).toMatchObject({success:true,output:"8\n"});
    expect(run('bool b=false; if (b) { Console.WriteLine("Skip"); } Console.WriteLine("End");')).toMatchObject({success:true,output:"End\n"});
  });
  it("rejects non-bool conditions, malformed blocks and out-of-scope variables",()=>{
    expect(run('if (1) { Console.WriteLine("bad"); }').success).toBe(false);
    expect(run('if (true) { Console.WriteLine("bad");').success).toBe(false);
    expect(run('if (true) { int x = 1; } Console.WriteLine(x);').success).toBe(false);
    expect(run('if (true) { Console.WriteLine("bad") }').success).toBe(false);
  });
});
