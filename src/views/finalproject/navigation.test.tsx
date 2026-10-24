import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FinalProject } from "./FinalProject";
import { conditionResult } from "./logic";
import { freshProgress, saveProgress, storageKey } from "./progress";

vi.mock("./logic",async importOriginal=>({
  ...await importOriginal<typeof import("./logic")>(),
  runProgram:vi.fn(async(s:import("./content").Scenario,value:number,pieces?:string[])=>conditionResult(pieces?.[0]??s.condition,s.variable,value)?(pieces?.[1]??s.yes):(pieces?.[2]??s.no)),
}));

const student="navigation-test";
const mount=()=>render(<FinalProject name="Ada" studentKey={student} isTeacher={false} onBack={vi.fn()}/>);
const back=()=>fireEvent.click(screen.getByRole("button",{name:"BACK"}));
const saved=()=>JSON.parse(localStorage.getItem(storageKey(student))!);
describe("Student Final project navigation",()=>{
  beforeEach(()=>{localStorage.removeItem(storageKey(student));});
  afterEach(()=>{cleanup();vi.useRealTimers();localStorage.removeItem(storageKey(student));});

  it("opens Live Flow on the first visit, then the lab home with its three stations",()=>{
    const {container}=mount();
    expect(screen.getByRole("button",{name:/Backrooms Run.*Open stage/})).toBeEnabled();
    const lab=screen.getByRole("button",{name:/IF \/ ELSE Lab.*Open stage/});expect(lab).toBeEnabled();fireEvent.click(lab);
    expect(screen.getByRole("heading",{name:"The school result"})).toBeInTheDocument();
    expect(container.querySelector(".lab-flow-grid")).toBeNull();
    expect(screen.getByText(/Report cards go out tonight/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"START LIVE FLOW"}));
    expect(container.querySelector(".fp-flow-svg")).not.toBeNull();
    expect(container.querySelectorAll(".fp-header button")).toHaveLength(1);
    back();
    expect(screen.getByRole("heading",{name:"Every client needs a rule with two paths."})).toBeInTheDocument();
    expect([...container.querySelectorAll(".lab-station")].map(b=>b.getAttribute("aria-label"))).toEqual(["Live Flow","Code Builder","Quiz"]);
    fireEvent.click(screen.getByRole("button",{name:"Quiz"}));
    expect(screen.getByRole("heading",{name:"Let’s start."})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"START QUIZ"}));expect(container.querySelector(".lab-answers")).not.toBeNull();
    back();back();
    expect(screen.getByRole("button",{name:/IF \/ ELSE Lab.*Open stage/})).toBeInTheDocument();
  });

  it("asks for a prediction before each run and moves on to the Code Builder after three stories",async()=>{
    vi.useFakeTimers();const {container}=mount();fireEvent.click(screen.getByRole("button",{name:/IF \/ ELSE Lab.*Open stage/}));
    for(const [index,[label,values,next]] of ([["grade",[6.75,7],"NEXT TICKET →"],["age",[12,13],"NEXT TICKET →"],["views",[1000,1100],"OPEN THE CODE BUILDER →"]] as const).entries()){
      fireEvent.click(screen.getByRole("button",{name:"START LIVE FLOW"}));
      for(const value of values){
        fireEvent.change(screen.getByRole("slider",{name:label}),{target:{value}});
        fireEvent.click(screen.getByRole("button",{name:/PREDICT & RUN/}));
        const result=label==="grade"?value>=7:label==="age"?value<=12:value>1000;
        // Predict TRUE every time: half the runs check the wrong-prediction feedback.
        fireEvent.click(within(screen.getByRole("group",{name:"Predict the path"})).getByRole("button",{name:/TRUE/}));
        await act(async()=>{await vi.advanceTimersByTimeAsync(3600);});
        expect(container.querySelector(`[data-segment="${result?"true":"false"}-output"]`)).not.toBeNull();
        expect(container.querySelector(`[data-segment="${result?"false":"true"}-output"]`)).toBeNull();
        if(!result)expect(container.querySelector(".lab-verdict")?.textContent).toMatch(/You predicted TRUE, but .* is false/);
      }
      expect(screen.getByText("Both paths explored")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button",{name:next}));
      if(index<2)expect(container.querySelector(".lab-intro")).not.toBeNull();
    }
    expect(saved().flowPaths).toEqual({0:["false","true"],1:["true","false"],2:["false","true"]});
    expect(screen.getByRole("navigation",{name:"Code Builder challenges"})).toBeInTheDocument();
  });

  it("checks the spec at the boundary and ships a correct rule",async()=>{
    saveProgress(student,{...freshProgress(),labVisited:true,activity:"builder",builderIndex:2,drafts:{heat:["temperature >= 30","Turn on the fan","Fan stays off"]}});
    const {container}=mount();
    fireEvent.click(screen.getByRole("button",{name:/RUN TESTS/}));
    await act(async()=>{await new Promise(r=>setTimeout(r,0));});
    expect(container.querySelector(".lab-spec tr.is-fail")?.textContent).toContain("30");
    expect(screen.getByText(/With temperature = 30, your code prints "Turn on the fan"/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Select condition slot"}));
    fireEvent.click([...container.querySelectorAll<HTMLButtonElement>(".lab-pieces button")].find(b=>b.textContent==="temperature > 30")!);
    fireEvent.click(screen.getByRole("button",{name:/RUN TESTS/}));
    await act(async()=>{await new Promise(r=>setTimeout(r,0));});
    expect(screen.getByText(/Shipped. Every test passes./)).toBeInTheDocument();
    expect(container.querySelectorAll(".lab-spec tr.is-pass")).toHaveLength(3);
    expect(saved().built).toEqual([2]);
  });

  it("shows the lines that ran after an answer, waits on a mistake and moves on after a right answer",async()=>{
    vi.useFakeTimers();
    saveProgress(student,{...freshProgress(),labVisited:true,activity:"quiz",quizIndex:12});
    const {container}=mount();
    expect(screen.getByText(/QUESTION 13 \/ 20/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"A Fan on"}));
    expect(container.querySelector(".lab-eval")?.textContent).toContain("30 > 30");
    expect(container.querySelectorAll(".lab-line.is-skip").length).toBeGreaterThan(0);
    await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
    expect(screen.getByText(/QUESTION 13 \/ 20/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:/NEXT/}));
    fireEvent.click(screen.getByRole("button",{name:"A Unlocked"}));
    expect(screen.getByText("Correct.")).toBeInTheDocument();
    await act(async()=>{await vi.advanceTimersByTimeAsync(2300);});
    expect(screen.getByText(/QUESTION 15 \/ 20/)).toBeInTheDocument();
    expect(saved().mastered).toEqual(["q14"]);
  });

  it("resumes the quiz from its introduction without losing saved answers",()=>{
    saveProgress(student,{...freshProgress(),labVisited:true,activity:"quiz-intro",quizIndex:4,answers:{q1:1,q2:0,q3:2,q4:3}});
    mount();fireEvent.click(screen.getByRole("button",{name:"RESUME QUIZ"}));
    expect(saved().quizIndex).toBe(4);
    expect(screen.getByText(/QUESTION 5 \/ 20/)).toBeInTheDocument();
  });

  it("changes grades by quarter points and restores the fractional grade after reentry",()=>{
    const page=mount();fireEvent.click(screen.getByRole("button",{name:/IF \/ ELSE Lab.*Open stage/}));
    fireEvent.click(screen.getByRole("button",{name:"START LIVE FLOW"}));
    fireEvent.click(screen.getByRole("button",{name:"Increase grade"}));
    expect(screen.getByRole("slider",{name:"grade"})).toHaveValue("5.25");
    fireEvent.click(screen.getByRole("button",{name:"Decrease grade"}));
    expect(screen.getByRole("slider",{name:"grade"})).toHaveValue("5");
    fireEvent.click(within(screen.getByRole("group",{name:"Try the edge"})).getByRole("button",{name:"6.75"}));
    expect(page.container.querySelector(".lab-code")?.textContent).toContain("double grade = 6.75;");
    page.unmount();mount();fireEvent.click(screen.getByRole("button",{name:"START LIVE FLOW"}));
    expect(screen.getByRole("slider",{name:"grade"})).toHaveValue("6.75");
    fireEvent.click(screen.getByRole("button",{name:"Increase grade"}));
    expect(screen.getByRole("slider",{name:"grade"})).toHaveValue("7");
    fireEvent.change(screen.getByRole("slider",{name:"grade"}),{target:{value:10}});
    expect(screen.getByRole("button",{name:"Increase grade"})).toBeDisabled();
  });
});
