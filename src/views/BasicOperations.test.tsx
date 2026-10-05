import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TARGET_PUZZLES, WARMUP_TOTAL, generateSurvivalPuzzle, generateTargetTutorialPuzzles, generateWarmupChallenges, moduleSeed } from "../data/basicOperations";
import { createBasicOpsProgress, loadBasicOpsProgress, saveBasicOpsProgress } from "../lib/basicOps/progress";
import * as evaluation from "../lib/basicOps/evaluation";
import { submitSurvivalScore, submitTimeAttackScore } from "../lib/basicOps/survivalLeaderboard";
import { BasicOperations } from "./BasicOperations";

vi.mock("../lib/runner", () => ({
  prepareCSharp: vi.fn(() => Promise.resolve()),
  executeCSharp: vi.fn(() => Promise.reject(new Error("engine offline in tests"))),
}));

vi.mock("../lib/basicOps/survivalLeaderboard", () => ({
  fetchSurvivalLeaderboard: vi.fn(() => Promise.resolve([])),
  submitSurvivalScore: vi.fn(() => Promise.resolve()),
  fetchTimeAttackLeaderboard: vi.fn(() => Promise.resolve([])),
  submitTimeAttackScore: vi.fn(() => Promise.resolve()),
  fetchClassMathlerProgress: vi.fn(() => Promise.resolve([])),
  pushMathlerProgress: vi.fn(() => Promise.resolve()),
  queueMathlerProgressSync: vi.fn(),
}));

describe("BasicOperations module intro", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows three sequential Mathler activities", () => {
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    expect(screen.getAllByText("CRACK THE FORMULA.").length).toBeGreaterThan(0);
    expect(screen.getByText("TRANSLATE THE FORMULAS")).toBeInTheDocument();
    expect(screen.getByText("WARM UP")).toBeInTheDocument();
    expect(screen.getByText("MATHLER GAME")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START MODULE/ })).toBeInTheDocument();
  });

  it("opens the how-it-works dialog", () => {
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "HOW IT WORKS" }));
    expect(screen.getByText("Math in. C# out.")).toBeInTheDocument();
    expect(screen.getByText("Build a formula")).toBeInTheDocument();
  });

  it("starts the translate phase with the first level", () => {
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    expect(screen.getByRole("textbox", { name: "C# expression after double result" })).toHaveFocus();
    expect(screen.getByText("MATH EXPRESSION")).toBeInTheDocument();
    expect(screen.getByText("YOUR CODE")).toBeInTheDocument();
    expect(screen.getByText("CODE KEYPAD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /RUN \/ CHECK/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Warmup — Addition" })).toBeInTheDocument();
  });

  it("colors the Mathler editor with the WriteLine syntax palette", () => {
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));

    const prefix = document.querySelector(".bo-code-prefix");
    expect(prefix?.querySelector(".syn-type")?.textContent).toBe("double");
    expect(prefix?.querySelector(".syn-variable")?.textContent).toBe("result");

    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), { target: { value: "7 + 3" } });
    const mirror = document.querySelector(".bo-code-mirror");
    expect(mirror?.textContent).toBe("7 + 3");
    expect(mirror?.querySelector(".syn-number")?.textContent).toBe("7");
  });

  it("uses the on-screen keypad without opening an iPad text keyboard", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    const editor = screen.getByRole("textbox", { name: "C# expression after double result" });
    expect(editor).toHaveAttribute("readonly");
    expect(editor).toHaveAttribute("inputmode", "none");
    fireEvent.click(screen.getByRole("button", { name: "7" }));
    expect(editor).toHaveValue("7");
  });

  it("keeps the keypad-only field on Android tablets and phones", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    const editor = screen.getByRole("textbox", { name: "C# expression after double result" });
    expect(editor).toHaveAttribute("readonly");
    expect(editor).toHaveAttribute("inputmode", "none");
    expect(editor).toHaveAttribute("virtualkeyboardpolicy", "manual");
    fireEvent.click(screen.getByRole("button", { name: "8" }));
    expect(editor).toHaveValue("8");
  });

  it("keeps the keypad on generic tablets with a coarse pointer", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(pointer: coarse)",
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    const editor = screen.getByRole("textbox", { name: "C# expression after double result" });
    expect(editor).toHaveAttribute("readonly");
    expect(editor).toHaveAttribute("inputmode", "none");
  });

  it("keeps the Target editor keypad-only on touch devices", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    render(<BasicOperations name="Ada" studentKey="ada" fullAccess onBack={() => undefined} />);
    fireEvent.click(screen.getByText("WARM UP"));
    const editor = screen.getByRole("textbox", { name: "C# expression after double result" });
    expect(editor).toHaveAttribute("readonly");
    expect(editor).toHaveAttribute("inputmode", "none");
    fireEvent.click(screen.getByRole("button", { name: "9" }));
    expect(editor).toHaveValue("9");
  });

  it("shows the written warmup task when that randomized example is reached", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const examples = generateWarmupChallenges(moduleSeed());
    const writtenIndex = examples.findIndex((challenge) => Boolean(challenge.writtenPrompt));
    const progress = createBasicOpsProgress();
    progress.translate.warmupSolved = writtenIndex;
    saveBasicOpsProgress(progress, "ada");

    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));

    expect(screen.getByText(examples[writtenIndex].writtenPrompt!)).toHaveClass("bo-warmup-written-task");
  });

  it("checks a translated expression and reports the output", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const seed = moduleSeed();
    const challenge = generateWarmupChallenges(seed)[0];

    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));

    const editor = screen.getByRole("textbox", { name: "C# expression after double result" });
    fireEvent.change(editor, { target: { value: challenge.referenceExpression } });
    fireEvent.click(screen.getByRole("button", { name: /RUN \/ CHECK/ }));

    expect(await screen.findByText("CORRECT!")).toBeInTheDocument();
    expect(screen.getByText(String(challenge.expectedResult), { selector: ".bo-output-value" })).toBeInTheDocument();
    expect(screen.getByText("+50 XP")).toBeInTheDocument();
  });

  it("teaches the C# operator when the student types a math symbol", async () => {
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));

    const editor = screen.getByRole("textbox", { name: "C# expression after double result" });
    fireEvent.change(editor, { target: { value: "12 × 7" } });
    fireEvent.click(screen.getByRole("button", { name: /RUN \/ CHECK/ }));

    expect(await screen.findByText("NOT QUITE")).toBeInTheDocument();
    expect(screen.getByText(/Multiplication is \*/)).toBeInTheDocument();
  });

  it("keeps Target locked until the combined run is complete", () => {
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    const targetCard = screen.getByText("WARM UP").closest("button");
    expect(targetCard).toBeDisabled();
    expect(screen.getByText("UNLOCK: TRANSLATE THE FORMULAS")).toBeInTheDocument();
    expect(screen.getByText("MATHLER GAME").closest("button")).toBeDisabled();
  });

  it("unlocks guided Warm Up before Mathler Game", () => {
    const progress = createBasicOpsProgress();
    progress.translate.warmupSolved = WARMUP_TOTAL;
    progress.rush.completed = true;
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);

    expect(screen.getByText("WARM UP").closest("button")).toBeEnabled();
    expect(screen.getByText("MATHLER GAME").closest("button")).toBeDisabled();
    fireEvent.click(screen.getByText("WARM UP"));
    expect(screen.getByRole("heading", { name: "TARGET — Find the expression" })).toBeInTheDocument();
  });

  it("continues through three examples per operator before opening the timer explanation", () => {
    for (const [solved, operator] of [[3, "Subtraction"], [6, "Multiplication"], [9, "Division"]] as const) {
      const partial = createBasicOpsProgress();
      partial.translate.warmupSolved = solved;
      saveBasicOpsProgress(partial, "ada");
      const view = render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
      fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
      expect(screen.getByRole("heading", { name: `Warmup — ${operator}` })).toBeInTheDocument();
      expect(screen.getByText(`TRANSLATE · ${operator.toUpperCase()} 1 / 3 · EXAMPLE ${solved + 1} / ${WARMUP_TOTAL}`)).toBeInTheDocument();
      view.unmount();
    }

    const progress = createBasicOpsProgress();
    progress.translate.warmupSolved = WARMUP_TOTAL;
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    expect(screen.getByRole("heading", { name: "Now the timer starts." })).toBeInTheDocument();
    expect(screen.getByText(/five timed rounds with four steps each/)).toBeInTheDocument();
  });

  it("restarts Addition after a wrong Rush answer", async () => {
    const progress = createBasicOpsProgress();
    progress.translate.warmupSolved = WARMUP_TOTAL;
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    fireEvent.click(screen.getByRole("button", { name: /START ROUND/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), { target: { value: "1 + 1" } });
    fireEvent.click(screen.getByRole("button", { name: /^RUN/ }));
    expect(await screen.findByRole("button", { name: /RESTART ROUND/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /RESTART ROUND/ }));
    expect(screen.getByRole("heading", { name: /Round 01 — ADDITION/ })).toBeInTheDocument();
  });

  it("restarts the current four-step round after a mistake in a later round", async () => {
    const progress = createBasicOpsProgress();
    progress.translate.warmupSolved = WARMUP_TOTAL;
    progress.rush.roundsCleared = 3;
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    expect(screen.getByText(/ROUND 04 — DIVISION & REMAINDER/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /START ROUND/ }));
    expect(screen.getByRole("textbox", { name: "C# expression after double result" })).toHaveFocus();
    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), { target: { value: "1 + 1" } });
    fireEvent.click(screen.getByRole("button", { name: "RUN" }));
    fireEvent.click(await screen.findByRole("button", { name: "RESTART ROUND" }));
    expect(screen.getByRole("heading", { name: /Round 04 — DIVISION & REMAINDER/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "ROUND PROGRESS: 0 of 4" })).toBeInTheDocument();
  });

  it("opens procedural Survival after the twelve guided Target steps", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const seed = moduleSeed();
    const puzzle = generateSurvivalPuzzle(1, seed);
    const progress = createBasicOpsProgress();
    progress.translate.warmupSolved = WARMUP_TOTAL;
    progress.rush.completed = true;
    progress.target.completed = TARGET_PUZZLES.map((item) => item.id);
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /PLAY MATHLER GAME/ }));
    expect(screen.getByRole("heading", { name: /Mathler Game/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /TIME ATTACK$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /SURVIVAL$/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), { target: { value: puzzle.referenceExpression } });
    fireEvent.click(screen.getByRole("button", { name: "RUN" }));
    const next = await screen.findByRole("button", { name: /NEXT PUZZLE/ });
    expect(next).toHaveClass("is-next");
    expect(screen.queryByText("CHALLENGE CLEARED")).not.toBeInTheDocument();
    fireEvent.click(next);
    expect(screen.getByText("SURVIVAL · CHALLENGE 2")).toBeInTheDocument();
  });

  it("opens every activity for leleomaker", () => {
    render(<BasicOperations name="Leleomaker" studentKey="leleomaker" fullAccess onBack={() => undefined} />);
    fireEvent.click(screen.getByText("WARM UP"));
    expect(screen.getByRole("heading", { name: "TARGET — Find the expression" })).toBeInTheDocument();
    expect(screen.getByText("CODE KEYPAD")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ATTEMPTS" })).toBeInTheDocument();
  });

  it("keeps every keypad operator available in warmup and Target", () => {
    const warmup = render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    for (const key of ["divide", "multiply", "open parenthesis", "close parenthesis", "minus", "remainder"]) {
      expect(screen.getByRole("button", { name: key })).toBeEnabled();
    }
    warmup.unmount();

    render(<BasicOperations name="Ada" studentKey="ada" fullAccess onBack={() => undefined} />);
    fireEvent.click(screen.getByText("WARM UP"));
    for (const key of ["divide", "multiply", "open parenthesis", "close parenthesis", "minus", "remainder"]) {
      expect(screen.getByRole("button", { name: key })).toBeEnabled();
    }
  });

  it("offers warmup and Target tutorial replay after completion", () => {
    const progress = createBasicOpsProgress();
    progress.translate.warmupSolved = WARMUP_TOTAL;
    progress.rush.completed = true;
    progress.target.completed = TARGET_PUZZLES.map((item) => item.id);
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "REPLAY TRANSLATIONS" }));
    expect(screen.getByRole("heading", { name: "Warmup — Addition" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: `LEVEL PROGRESS: 0 of ${WARMUP_TOTAL}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /MODULE/ }));

    fireEvent.click(screen.getByRole("button", { name: "REPLAY TARGET WARM UP" }));
    expect(screen.getByRole("heading", { name: "TARGET — Find the expression" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Target progress: 0 of 12" })).toBeInTheDocument();
  });

  it("shows a successful Target attempt in the workbench", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const seed = moduleSeed();
    const progress = createBasicOpsProgress();
    progress.target.tutorialSeed = seed;
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" fullAccess onBack={() => undefined} />);
    fireEvent.click(screen.getByText("WARM UP"));

    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), {
      target: { value: generateTargetTutorialPuzzles(seed)[0].referenceExpression },
    });
    fireEvent.click(screen.getByRole("button", { name: /^RUN/ }));

    expect(await screen.findByText("MATCHED TARGET")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: /NEXT PUZZLE/ });
    expect(next).toHaveClass("is-next");
    expect(screen.queryByRole("button", { name: "TRY ANOTHER" })).not.toBeInTheDocument();
    expect(screen.queryByText("You cracked the target.")).not.toBeInTheDocument();
    fireEvent.click(next);
    expect(screen.getByText("STEP 2 / 12")).toBeInTheDocument();
  });

  it("unlocks the Target answer help only after a mistake", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const seed = moduleSeed();
    const puzzle = generateTargetTutorialPuzzles(seed)[0];
    const progress = createBasicOpsProgress();
    progress.target.tutorialSeed = seed;
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" fullAccess onBack={() => undefined} />);
    fireEvent.click(screen.getByText("WARM UP"));

    expect(screen.getByRole("button", { name: /NEED SOME HELP/ })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), { target: { value: String(puzzle.numbers[0]) } });
    fireEvent.click(screen.getByRole("button", { name: /^RUN/ }));
    await screen.findByText(/RULE ERROR|OUTPUT/);

    const help = screen.getByRole("button", { name: /NEED SOME HELP/ });
    expect(help).toBeEnabled();
    fireEvent.click(help);
    expect(screen.getByText("CORRECT ANSWER")).toBeInTheDocument();
    const answer = document.querySelector(".bo-answer-help code");
    expect(answer?.textContent).toBe(`double result = ${puzzle.referenceExpression};`);
  });

  it("lets students redo a passed warmup step without skipping ahead", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const challenge = generateWarmupChallenges(moduleSeed())[0];
    const progress = createBasicOpsProgress();
    progress.translate.warmupSolved = 3;
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    expect(screen.getByRole("heading", { name: "Warmup — Subtraction" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Redo level progress step 1" }));
    expect(screen.getByRole("heading", { name: "Warmup — Addition" })).toBeInTheDocument();
    expect(screen.getByText(/EXAMPLE 1 \/ 12/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), { target: { value: challenge.referenceExpression } });
    fireEvent.click(screen.getByRole("button", { name: /RUN \/ CHECK/ }));
    expect(await screen.findByText("CORRECT!")).toBeInTheDocument();
    expect(loadBasicOpsProgress("ada").translate.warmupSolved).toBe(3);
  });

  it("lets students redo a passed Target step", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const seed = moduleSeed();
    const progress = createBasicOpsProgress();
    progress.target.tutorialSeed = seed;
    progress.target.completed = ["target-01", "target-02"];
    saveBasicOpsProgress(progress, "ada");
    render(<BasicOperations name="Ada" studentKey="ada" fullAccess onBack={() => undefined} />);
    fireEvent.click(screen.getByText("WARM UP"));

    expect(screen.getByText("STEP 3 / 12")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Redo step 1" }));
    expect(screen.getByText("STEP 1 / 12")).toBeInTheDocument();
  });

  it("fires a run wave from the RUN button", () => {
    render(<BasicOperations name="Ada" studentKey="ada" onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /START MODULE/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), { target: { value: "1 + 1" } });
    fireEvent.click(screen.getByRole("button", { name: /RUN \/ CHECK/ }));
    expect(document.querySelector(".bo-run-wave")).not.toBeNull();
  });
});

describe("Mathler Game modes", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    vi.mocked(submitSurvivalScore).mockClear();
    vi.mocked(submitTimeAttackScore).mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function openGame(mode: "TIME ATTACK" | "SURVIVAL") {
    render(<BasicOperations name="Ada" studentKey="ada" fullAccess onBack={() => undefined} />);
    fireEvent.click(screen.getByText("MATHLER GAME"));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${mode}$`) }));
  }

  async function submit(expression: string) {
    fireEvent.change(screen.getByRole("textbox", { name: "C# expression after double result" }), { target: { value: expression } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "RUN" })); });
  }

  it("counts correct expressions during one uninterrupted minute and resets on replay", async () => {
    openGame("TIME ATTACK");
    expect(screen.getByRole("timer")).toHaveTextContent("1:00");
    await submit(generateSurvivalPuzzle(1, moduleSeed()).referenceExpression);
    expect(screen.getByText("TIME ATTACK · CHALLENGE 2")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(30_000); });
    await submit(generateSurvivalPuzzle(2, moduleSeed()).referenceExpression);
    expect(screen.getByRole("timer")).toHaveTextContent("0:30");
    expect(loadBasicOpsProgress("ada").target.timeAttackBest).toBe(2);
    expect(submitSurvivalScore).not.toHaveBeenCalled();
    expect(submitTimeAttackScore).toHaveBeenLastCalledWith(2);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole("heading", { name: "2 puzzles cleared" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("0:00");
    expect(screen.getByRole("button", { name: "RUN" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "PLAY AGAIN" }));
    expect(screen.getByRole("timer")).toHaveTextContent("1:00");
    expect(screen.getByText("TIME ATTACK · CHALLENGE 1")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole("heading", { name: "0 puzzles cleared" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "CHOOSE MODE" }));
    expect(screen.getByText(/BEST 2/)).toBeInTheDocument();
  });

  it("allows incorrect and invalid answers in Time Attack without resetting its timer", async () => {
    openGame("TIME ATTACK");
    act(() => { vi.advanceTimersByTime(10_000); });
    await submit("1");
    await submit("1 +");
    expect(screen.getByRole("timer")).toHaveTextContent("0:50");
    expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled();
    expect(screen.getByText("TIME ATTACK · CHALLENGE 1")).toBeInTheDocument();
    await submit(generateSurvivalPuzzle(1, moduleSeed()).referenceExpression);
    expect(loadBasicOpsProgress("ada").target.timeAttackBest).toBe(1);
  });

  it.each(["1", "1 +", "1 / 0"])("keeps Survival alive until the third mistake: %s", async (expression) => {
    openGame("SURVIVAL");
    act(() => { vi.advanceTimersByTime(75_000); });
    expect(screen.getByRole("textbox", { name: "C# expression after double result" })).toBeEnabled();
    await submit(expression);
    expect(screen.getByRole("textbox", { name: "C# expression after double result" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "0 puzzles cleared" })).not.toBeInTheDocument();
    await submit(expression);
    expect(screen.getByText("1 MISTAKE LEFT")).toBeInTheDocument();
    await submit(expression);
    expect(screen.getByRole("heading", { name: "0 puzzles cleared" })).toBeInTheDocument();
    expect(screen.getByText("You survived 1:15 before losing your last life.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "C# expression after double result" })).toBeDisabled();
    expect(submitSurvivalScore).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(screen.getByRole("timer")).toHaveTextContent("1:15");
  });

  it("does not count a check that finishes after the deadline or apply it to a replay", async () => {
    let resolveCheck!: (result: Awaited<ReturnType<typeof evaluation.evaluateExpression>>) => void;
    const expression = generateSurvivalPuzzle(1, moduleSeed()).referenceExpression;
    const result = await evaluation.evaluateExpression(expression);
    vi.spyOn(evaluation, "evaluateExpression").mockReturnValueOnce(new Promise((resolve) => { resolveCheck = resolve; }));
    openGame("TIME ATTACK");
    await submit(expression);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole("heading", { name: "0 puzzles cleared" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "PLAY AGAIN" }));
    await act(async () => { resolveCheck(result); });
    expect(screen.getByText("TIME ATTACK · CHALLENGE 1")).toBeInTheDocument();
    expect(loadBasicOpsProgress("ada").target.timeAttackBest).toBe(0);
    await submit(expression);
    expect(screen.getByText("TIME ATTACK · CHALLENGE 2")).toBeInTheDocument();
  });

  it("rejects a result past the deadline even before the timer callback runs", async () => {
    const expression = generateSurvivalPuzzle(1, moduleSeed()).referenceExpression;
    const result = await evaluation.evaluateExpression(expression);
    let resolveCheck!: (value: typeof result) => void;
    vi.spyOn(evaluation, "evaluateExpression").mockReturnValueOnce(new Promise((resolve) => { resolveCheck = resolve; }));
    openGame("TIME ATTACK");
    await submit(expression);
    vi.setSystemTime(Date.now() + 60_001);
    await act(async () => { resolveCheck(result); });
    expect(screen.getByRole("heading", { name: "0 puzzles cleared" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("0:00");
    expect(submitTimeAttackScore).not.toHaveBeenCalled();
  });

  it("ignores an answer that finishes after leaving the game", async () => {
    const expression = generateSurvivalPuzzle(1, moduleSeed()).referenceExpression;
    const result = await evaluation.evaluateExpression(expression);
    let resolveCheck!: (value: typeof result) => void;
    vi.spyOn(evaluation, "evaluateExpression").mockReturnValueOnce(new Promise((resolve) => { resolveCheck = resolve; }));
    openGame("SURVIVAL");
    await submit(expression);
    fireEvent.click(screen.getByRole("button", { name: "MODULE" }));
    await act(async () => { resolveCheck(result); });
    expect(submitSurvivalScore).not.toHaveBeenCalled();
    expect(loadBasicOpsProgress("ada").target.survivalBestStreak).toBe(0);
  });

  it("shows the target left and the stacked requirements right in the game HUD", () => {
    openGame("SURVIVAL");
    const focus = document.querySelector(".bo-game-focus");
    expect(focus).not.toBeNull();
    const target = focus!.querySelector(".bo-target-result");
    expect(target).not.toBeNull();
    const groups = focus!.querySelectorAll(".bo-chip-group");
    expect(groups).toHaveLength(2);
    expect(groups[0].textContent).toContain("USE THESE NUMBERS");
    expect(groups[1].textContent).toContain("AVAILABLE OPERATORS");
    expect(groups[0].querySelector(".bo-number-chip")).not.toBeNull();
    expect(groups[1].querySelector(".bo-op-chip")).not.toBeNull();
  });
});
