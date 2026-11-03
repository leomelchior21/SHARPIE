import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { missions, program, questions } from "./content";
import { levels } from "./switchyard/levels";
import { buildYard, domain, expected, readWritten, writtenCode, yardCode } from "./switchyard/yard";
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
  it("runs every Switchyard level's rule for every train it could carry",()=>{
    const written=level=>`if (${level.condition})\n{\n    Console.WriteLine("${level.yes}");\n}\nelse\n{\n    Console.WriteLine("${level.no}");\n}`;
    for(const level of levels){
      const yard=level.tool==="write"?readWritten(written(level)):buildYard(["decl",`if (${level.condition})`,`Console.WriteLine(${JSON.stringify(level.yes)});`,"else",`Console.WriteLine(${JSON.stringify(level.no)});`]);
      for(const value of domain(level)){const result=run(yardCode(level.variable,value,yard));expect(result,`${level.title} ${value}`).toMatchObject({success:true,output:`${expected(level,value)}\n`});}
    }
  });
  it("runs a yard with no else track and prints nothing for its FALSE trains",()=>{
    const fan=levels[2];const yard=buildYard(fan.preset);
    expect(run(yardCode(fan.variable,29,yard))).toMatchObject({success:true,output:""});
    expect(run(yardCode(fan.variable,31,yard))).toMatchObject({success:true,output:"Fan on\n"});
  });
  it("runs the switch a student types on the last level, for every water temperature",()=>{
    const pool=levels[9];const code='if (water >= 26)\n{\n    Console.WriteLine("Pool open");\n}\nelse\n{\n    Console.WriteLine("Too cold");\n}';
    for(let value=pool.min;value<=pool.max;value++)expect(run(writtenCode(pool.variable,value,code)).output).toBe(`${expected(pool,value)}\n`);
  });
  it("executes every broken and repaired audit rule",()=>{
    missions.forEach(m=>{for(const outputs of [m.broken,m.repaired])for(const input of [true,false]){
      const result=run(program({variable:m.variable,initial:input,condition:m.variable,yes:outputs[0],no:outputs[1]}));expect(result).toMatchObject({success:true,output:`${outputs[input?0:1]}\n`});
    }});
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
