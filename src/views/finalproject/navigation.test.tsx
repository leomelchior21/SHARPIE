import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FinalProject } from "./FinalProject";
import { conditionResult } from "./logic";
import { freshProgress, saveProgress, storageKey } from "./progress";

vi.mock("./logic",async importOriginal=>({
  ...await importOriginal<typeof import("./logic")>(),
  runProgram:vi.fn(async(s:import("./content").Scenario,value:number)=>conditionResult(s.condition,s.variable,value)?s.yes:s.no),
}));

const student="navigation-test";
const mount=()=>render(<FinalProject name="Ada" studentKey={student} isTeacher={false} onBack={vi.fn()}/>);
const back=()=>fireEvent.click(screen.getByRole("button",{name:"BACK"}));
describe("Student Final project navigation",()=>{
  beforeEach(()=>{localStorage.removeItem(storageKey(student));});
  afterEach(()=>{cleanup();vi.useRealTimers();localStorage.removeItem(storageKey(student));});
  it("opens Live Flow on the first visit, then shows only three titled options on reentry",()=>{
    const {container}=mount();
    expect(screen.getByRole("button",{name:/Backrooms Run.*Open stage/})).toBeEnabled();
    const lab=screen.getByRole("button",{name:/IF \/ ELSE Lab.*Open stage/});expect(lab).toBeEnabled();fireEvent.click(lab);
    expect(screen.getByRole("heading",{name:"The school result"})).toBeInTheDocument();
    expect(container.querySelector(".fp-flow-layout")).toBeNull();
    expect(screen.getByText(/Change a student's grade/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"START LIVE FLOW"}));
    expect(container.querySelector(".fp-flow-svg")).not.toBeNull();
    expect(container.querySelectorAll(".fp-header button")).toHaveLength(1);
    expect(container.querySelector(".fp-tabs")).toBeNull();expect(container.querySelector(".fp-bottom-nav")).toBeNull();
    back();fireEvent.click(screen.getByRole("button",{name:/IF \/ ELSE Lab.*Open stage/}));
    const options=container.querySelectorAll(".fp-lab-options button");
    expect([...options].map(b=>b.textContent)).toEqual(["Live Flow","Code Builder","Quiz"]);
    fireEvent.click(screen.getByRole("button",{name:"Quiz"}));
    expect(screen.getByRole("heading",{name:"Let’s start."})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"START QUIZ"}));expect(container.querySelector(".fp-answers")).not.toBeNull();
  });
  it("plays both paths sequentially and opens the quiz introduction after all three flows",async()=>{
    vi.useFakeTimers();const {container}=mount();fireEvent.click(screen.getByRole("button",{name:/IF \/ ELSE Lab.*Open stage/}));
    for(const [label,values,next] of [["grade",[6.75,7],"Movie night"],["age",[12,13],"The viral post"],["views",[1000,1100],"Let’s start."]] as const){
      expect(container.querySelector(".fp-flow-layout")).toBeNull();
      fireEvent.click(screen.getByRole("button",{name:"START LIVE FLOW"}));
      for(const [i,value] of values.entries()){
        fireEvent.change(screen.getByRole("slider",{name:label}),{target:{value}});
        fireEvent.click(screen.getByRole("button",{name:/START FLOW/}));
        await act(async()=>{await vi.advanceTimersByTimeAsync(3350);});
        const result=label==="grade"?value>=7:label==="age"?value<=12:value>1000;
        expect(container.querySelector(`[data-segment="${result?"true":"false"}-output"]`)).not.toBeNull();
        expect(container.querySelector(`[data-segment="${result?"false":"true"}-output"]`)).toBeNull();
        await act(async()=>{await vi.advanceTimersByTimeAsync(1500);});
        if(i===1)expect(screen.getByRole("heading",{name:next})).toBeInTheDocument();
      }
    }
    expect(JSON.parse(localStorage.getItem(storageKey(student))!).flowPaths).toEqual({0:["false","true"],1:["true","false"],2:["false","true"]});
    expect(screen.getByRole("button",{name:"START QUIZ"})).toBeEnabled();
  });
  it("resumes the quiz from its introduction without losing saved answers",()=>{
    saveProgress(student,{...freshProgress(),labVisited:true,activity:"quiz-intro",quizIndex:4,answers:{q1:1,q2:0,q3:2,q4:3}});
    mount();fireEvent.click(screen.getByRole("button",{name:"RESUME QUIZ"}));
    expect(JSON.parse(localStorage.getItem(storageKey(student))!).quizIndex).toBe(4);
    expect(screen.getByText(/QUESTION 5 \/ 20/)).toBeInTheDocument();
  });
  it("changes grades by quarter points and restores the fractional grade after reentry",()=>{
    const page=mount();fireEvent.click(screen.getByRole("button",{name:/IF \/ ELSE Lab.*Open stage/}));
    fireEvent.click(screen.getByRole("button",{name:"START LIVE FLOW"}));
    fireEvent.click(screen.getByRole("button",{name:"Increase grade"}));
    expect(screen.getByRole("slider",{name:"grade"})).toHaveValue("5.25");
    fireEvent.click(screen.getByRole("button",{name:"Decrease grade"}));
    expect(screen.getByRole("slider",{name:"grade"})).toHaveValue("5");
    fireEvent.change(screen.getByRole("slider",{name:"grade"}),{target:{value:6.75}});
    expect(page.container.querySelector(".fp-code")?.textContent).toContain("double grade = 6.75;");
    page.unmount();mount();fireEvent.click(screen.getByRole("button",{name:"START LIVE FLOW"}));
    expect(screen.getByRole("slider",{name:"grade"})).toHaveValue("6.75");
    fireEvent.click(screen.getByRole("button",{name:"Increase grade"}));
    expect(screen.getByRole("slider",{name:"grade"})).toHaveValue("7");
    fireEvent.change(screen.getByRole("slider",{name:"grade"}),{target:{value:10}});
    expect(screen.getByRole("button",{name:"Increase grade"})).toBeDisabled();
  });
});
