import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FinalProject } from "./FinalProject";
import { conditionResult } from "./logic";
import { freshProgress, saveProgress, storageKey, type Progress } from "./progress";
import { questions } from "./content";
import { readWritten } from "./switchyard/yard";
import { runYard } from "./switchyard/runYard";

// The C# engine runs in a worker the test browser does not have; this stands in for it.
vi.mock("./switchyard/runYard", () => ({ runYard: vi.fn(), warmYard: vi.fn() }));
const simulate = async (code: string) => {
  const [, variable, raw] = /^(?:int|bool) (\w+) = (\w+);/.exec(code)!;
  const value = raw === "true" ? true : raw === "false" ? false : Number(raw);
  const yard = readWritten(code.slice(code.indexOf("\n\n") + 2));
  return (conditionResult(yard.condition!, variable, value) ? yard.yes : yard.hasElse ? yard.no : "") ?? "";
};

const student = "navigation-test";
const mount = () => render(<FinalProject name="Ada" studentKey={student} isTeacher={false} onBack={vi.fn()} />);
const back = () => fireEvent.click(screen.getByRole("button", { name: "BACK" }));
const saved = () => JSON.parse(localStorage.getItem(storageKey(student))!) as Progress;
const licensed = Object.fromEntries(questions.map((q) => [q.id, q.answer]));
const atLevel = (yardLevel: number, extra: Partial<Progress> = {}) => saveProgress(student, { ...freshProgress(), activity: "yard", answers: licensed, quizIndex: 20, yardLevel, yardShipped: Array.from({ length: yardLevel }, (_, i) => i), yardStars: Array.from({ length: 10 }, (_, i) => i < yardLevel ? 1 : 0), ...extra });
const playOut = () => act(async () => { await vi.advanceTimersByTimeAsync(60000); });
const verdict = (container: HTMLElement) => container.querySelector(".sy-verdict")?.textContent ?? "";

describe("Student Final project navigation", () => {
  beforeEach(() => { localStorage.removeItem(storageKey(student)); vi.mocked(runYard).mockImplementation(simulate); });
  afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.removeItem(storageKey(student)); });

  it("opens the Switchyard hub with the quiz first and the game locked until it is done", () => {
    const { container } = mount();
    expect(screen.getByRole("button", { name: /Backrooms Run.*Open stage/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Shadow Feed/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Switchyard.*Open stage/ }));
    expect(screen.getByRole("heading", { name: "SWITCHYARD" })).toBeInTheDocument();
    expect([...container.querySelectorAll(".sy-card")].map((card) => card.getAttribute("aria-label"))).toEqual(["Quiz", "The Switchyard"]);
    expect(screen.getByRole("button", { name: "The Switchyard" })).toBeDisabled();
    expect(screen.getByText(/FINISH THE QUIZ TO OPEN/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quiz" }));
    expect(screen.getByRole("heading", { name: "Read it. Say what it prints." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "START QUIZ" })); expect(container.querySelector(".lab-answers")).not.toBeNull();
    back(); back();
    expect(screen.getByRole("button", { name: /Switchyard.*Open stage/ })).toBeInTheDocument();
  });

  it("keeps the quiz and every Switchyard level open for the teacher", () => {
    render(<FinalProject name="Teacher" studentKey={student} isTeacher onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Switchyard.*Open stage/ }));
    expect(screen.getByRole("button", { name: "Quiz" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "The Switchyard" }));
    expect(screen.getByRole("heading", { name: "First Switch" })).toBeInTheDocument();
    for (let n = 2; n <= 10; n += 1) expect(screen.getByRole("button", { name: new RegExp(`^Level ${n}:`) })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Level 10: Rush Hour" }));
    expect(screen.getByRole("heading", { name: "Rush Hour" })).toBeInTheDocument();
  });

  it("sends a save that stopped in the old Code Builder back to the hub while the quiz is open", () => {
    saveProgress(student, { ...freshProgress(), activity: "yard" });
    mount();
    expect(screen.queryByRole("navigation", { name: "Switchyard levels" })).toBeNull();
    expect(screen.getByRole("button", { name: /Switchyard.*Open stage/ })).toBeInTheDocument();
  });

  it("lays the track for level 1, asks for a prediction, ships it and checks why", async () => {
    vi.useFakeTimers();
    atLevel(0);
    const { container } = mount();
    expect(screen.getByRole("button", { name: "Level 2: No Labels" })).toBeDisabled();
    const tap = (line: string) => fireEvent.click(container.querySelector<HTMLButtonElement>(`.sy-bank [data-line='${line}']`)!);
    for (const line of ["decl", "if (age <= 12)", 'Console.WriteLine("Child discount");', "else", 'Console.WriteLine("Regular ticket");']) tap(line);
    expect(container.querySelector("[data-slot='0']")?.textContent).toBe("int age = 12;");
    fireEvent.click(screen.getByRole("button", { name: "▶ RUN THE TIMETABLE" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Predict the track" })).getByRole("button", { name: /TRUE TRACK/ }));
    await playOut();
    expect(container.querySelectorAll(".sy-board li.is-ok")).toHaveLength(3);
    expect(verdict(container)).toMatch(/You called train 12 right/);
    expect(saved()).toMatchObject({ yardShipped: [0], yardStars: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    const dialog = screen.getByRole("dialog", { name: "Level shipped" });
    fireEvent.click(within(dialog).getByRole("button", { name: "12 is smaller than 12." }));
    expect(within(dialog).queryByRole("button", { name: /NEXT LEVEL/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: /includes 12/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /NEXT LEVEL/ }));
    expect(screen.getByRole("heading", { name: "No Labels" })).toBeInTheDocument();
    expect(saved().yardLevel).toBe(1);
  });

  it("stops a train at the dead end until the else track is laid", async () => {
    vi.useFakeTimers();
    atLevel(2);
    const { container } = mount();
    expect(container.querySelector(".sy-bank")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "▶ RUN THE YARD AS IT IS" }));
    await playOut();
    expect(verdict(container)).toMatch(/Train 29 hit the dead end: nothing printed/);
    fireEvent.click(container.querySelector<HTMLButtonElement>(".sy-bank [data-line='else']")!);
    fireEvent.click(container.querySelector<HTMLButtonElement>(`.sy-bank [data-line='Console.WriteLine("Fan off");']`)!);
    fireEvent.click(screen.getByRole("button", { name: "▶ RUN THE TIMETABLE" }));
    await playOut();
    expect(saved().yardShipped).toContain(2);
  });

  it("jams on = and opens the vault with == on the sensor dial", async () => {
    vi.useFakeTimers();
    atLevel(4);
    const { container } = mount();
    const ops = within(screen.getByRole("group", { name: "Operator" }));
    fireEvent.click(ops.getByRole("button", { name: "=" }));
    fireEvent.change(screen.getByRole("slider", { name: "Sensor number" }), { target: { value: 42 } });
    // A jammed switch has no track to predict yet.
    fireEvent.click(screen.getByRole("button", { name: "▶ RUN THE TIMETABLE" }));
    expect(screen.queryByRole("group", { name: "Predict the track" })).toBeNull();
    await playOut();
    expect(verdict(container)).toMatch(/jammed: = stores a value/);
    fireEvent.click(ops.getByRole("button", { name: "==" }));
    fireEvent.click(screen.getByRole("button", { name: "▶ RUN THE TIMETABLE" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Predict the track" })).getByRole("button", { name: /ELSE TRACK/ }));
    await playOut();
    expect(verdict(container)).toMatch(/You said train 42 would take the ELSE track/);
    expect(saved()).toMatchObject({ yardShipped: [0, 1, 2, 3, 4] });
    expect(saved().yardStars[4]).toBe(2);
  });

  it("replays the incident before the ride's sensor can be fixed", async () => {
    vi.useFakeTimers();
    atLevel(7);
    const { container } = mount();
    expect(screen.getByText(/LOCKED UNTIL YOU WATCH THE INCIDENT/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "▶ WATCH THE INCIDENT" }));
    await playOut();
    expect(verdict(container)).toMatch(/Incident confirmed\. Train 140 printed “Too short”\. The rule wants “Ride open”/);
    fireEvent.click(within(screen.getByRole("group", { name: "Operator" })).getByRole("button", { name: ">=" }));
    fireEvent.click(screen.getByRole("button", { name: "▶ RUN THE TIMETABLE" }));
    await playOut();
    expect(saved().yardShipped).toContain(7);
    expect(saved().yardStars[7]).toBe(3);
  });

  it("builds the pool's yard from typed code, checks the timetable, then runs rush hour", async () => {
    vi.useFakeTimers();
    atLevel(9);
    const { container } = mount();
    const editor = screen.getByRole("textbox", { name: "Your if / else" });
    fireEvent.change(editor, { target: { value: "if (water >= 26)" } });
    expect(verdict(container)).toMatch(/Open the TRUE block/);
    fireEvent.change(editor, { target: { value: 'if (water >= 26)\n{\n    Console.WriteLine("Pool open");\n}\nelse\n{\n    Console.WriteLine("Too cold");\n}' } });
    fireEvent.click(screen.getByRole("button", { name: "PICK YOUR TIMETABLE →" }));
    expect(verdict(container)).toMatch(/never tries the edge itself: 26/);
    expect(screen.getByRole("button", { name: "▶ RUN MY TIMETABLE" })).toBeDisabled();
    const step = (train: number, name: "higher" | "lower", times: number) => { for (let i = 0; i < times; i += 1) fireEvent.click(screen.getByRole("button", { name: `Train ${train} ${name}` })); };
    step(1, "higher", 15); step(2, "higher", 6); step(3, "lower", 3);
    fireEvent.click(screen.getByRole("button", { name: "▶ RUN MY TIMETABLE" }));
    await playOut();
    expect(verdict(container)).toMatch(/proves the edge/);
    fireEvent.click(screen.getByRole("button", { name: "▶ START RUSH HOUR" }));
    await playOut();
    expect(container.querySelectorAll(".sy-board li.is-ok")).toHaveLength(12);
    expect(saved().yardShipped).toContain(9);
    expect(saved().yardDrafts.pool[0]).toContain("Too cold");
  });

  it("shows the lines that ran after an answer and waits for NEXT, right or wrong", async () => {
    vi.useFakeTimers();
    saveProgress(student, { ...freshProgress(), activity: "quiz", quizIndex: 12 });
    const { container } = mount();
    expect(screen.getByText(/QUESTION 13 \/ 20/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "A Fan on" }));
    expect(container.querySelector(".lab-eval")?.textContent).toContain("30 > 30");
    expect(container.querySelectorAll(".lab-line.is-skip").length).toBeGreaterThan(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText(/QUESTION 13 \/ 20/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /NEXT/ }));
    fireEvent.click(screen.getByRole("button", { name: "A Unlocked" }));
    expect(screen.getByText("Correct.")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByText(/QUESTION 14 \/ 20/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /NEXT/ }));
    expect(screen.getByText(/QUESTION 15 \/ 20/)).toBeInTheDocument();
    expect(saved().mastered).toEqual(["q14"]);
  });

  it("pauses between rounds of five and opens the Switchyard after the last answer", async () => {
    vi.useFakeTimers();
    saveProgress(student, { ...freshProgress(), activity: "quiz", quizIndex: 4, answers: { q1: 1, q2: 0, q3: 2, q4: 3 } });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "B False" }));
    fireEvent.click(screen.getByRole("button", { name: /NEXT/ }));
    expect(screen.getByRole("heading", { name: "Perfect round!" })).toBeInTheDocument();
    expect(saved().quizIndex).toBe(5);
    fireEvent.click(screen.getByRole("button", { name: /ROUND 2: TRUE OR FALSE/ }));
    expect(screen.getByText(/QUESTION 6 \/ 20/)).toBeInTheDocument();
    cleanup();
    saveProgress(student, { ...freshProgress(), activity: "quiz", quizIndex: 20, answers: { q1: 1 } });
    mount(); expect(screen.queryByRole("button", { name: /OPEN THE SWITCHYARD/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /RESUME QUIZ/ }));
    expect(screen.getByText(/QUESTION 2 \/ 20/)).toBeInTheDocument();
    cleanup();
    saveProgress(student, { ...freshProgress(), activity: "quiz", quizIndex: 20, answers: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`q${i + 1}`, 0])) });
    mount(); fireEvent.click(screen.getByRole("button", { name: /OPEN THE SWITCHYARD/ }));
    expect(screen.getByRole("navigation", { name: "Switchyard levels" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "First Switch" })).toBeInTheDocument();
  });

  it("resumes the quiz from its introduction without losing saved answers", () => {
    saveProgress(student, { ...freshProgress(), activity: "quiz-intro", quizIndex: 4, answers: { q1: 1, q2: 0, q3: 2, q4: 3 } });
    mount(); fireEvent.click(screen.getByRole("button", { name: "RESUME QUIZ" }));
    expect(saved().quizIndex).toBe(4);
    expect(screen.getByText(/QUESTION 5 \/ 20/)).toBeInTheDocument();
  });
});
