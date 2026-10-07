import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { finalBosses } from "../data/finalBosses";
import type { RunResult } from "../types";
import { FinalBosses } from "./FinalBosses";

const runner = vi.hoisted(() => ({
  prepare: vi.fn(() => Promise.resolve()),
  execute: vi.fn(),
}));

vi.mock("../lib/runner", () => ({
  prepareCSharp: runner.prepare,
  executeCSharp: runner.execute,
}));

vi.mock("@uiw/react-codemirror", () => ({
  default: ({ value, onChange, ...props }: { value: string; onChange: (value: string) => void; [key: string]: unknown }) => (
    <textarea
      aria-label={String(props["aria-label"])}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  ),
}));

const editor = () => screen.getByRole("textbox", { name: "C# code for the current boss" }) as HTMLTextAreaElement;

function additionAnswers(code: string, inputs: string[]): RunResult {
  const [a, b] = inputs.map(Number);
  return { success: true, output: `${a + b}\n`, durationMs: 1 };
}

function subtractionAnswers(code: string, inputs: string[]): RunResult {
  const [a, b] = inputs.map(Number);
  return { success: true, output: `${a - b}\n`, durationMs: 1 };
}

describe("Final Bosses view", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
    runner.prepare.mockClear();
    runner.execute.mockReset();
  });

  it("opens on boss 01 with a 15-node trail, locked later sectors, and 0 XP", async () => {
    render(<FinalBosses onBack={() => undefined} />);
    await waitFor(() => expect(runner.prepare).toHaveBeenCalled());

    expect(screen.getByRole("heading", { name: "Two Numbers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Two Numbers" }).closest(".boss-brief-panel")).not.toBeNull();
    expect(editor().closest(".boss-editor-panel")).not.toBeNull();
    expect(document.querySelector(".boss-tests-panel")).not.toBeNull();
    expect(screen.getByText("BOSS 01 // OPERATORS")).toBeInTheDocument();
    expect(screen.getByText("00 / 15")).toBeInTheDocument();
    expect(screen.getByText("0 XP")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Boss \d\d/ })).toHaveLength(15);
    expect(screen.getByRole("button", { name: /Boss 03.*available/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Boss 04.*locked/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Boss 15.*locked/ })).toBeDisabled();
    expect(screen.getByText("TEST LAB")).toBeInTheDocument();
    expect(screen.getAllByText("WAITING")).toHaveLength(3);
    expect(editor().value).toContain("double result = 0; // Change this");
  });

  it("lets the teacher open every boss and restores the last selection and draft", async () => {
    const { unmount } = render(<FinalBosses fullAccess onBack={() => undefined} />);
    await waitFor(() => expect(runner.prepare).toHaveBeenCalled());

    for (const boss of finalBosses) {
      const button = screen.getByRole("button", { name: new RegExp(`^Boss ${String(boss.id).padStart(2, "0")},`) });
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(screen.getByRole("heading", { name: boss.title })).toBeInTheDocument();
      expect(editor().value).toBe(boss.starterCode);
    }
    expect(screen.getByText("00 / 15")).toBeInTheDocument();
    expect(screen.getByText("0 XP")).toBeInTheDocument();

    const draft = `${editor().value}\n// Teacher draft`;
    fireEvent.change(editor(), { target: { value: draft } });
    await waitFor(() => expect(screen.getByText("DRAFT SAVED")).toBeInTheDocument());
    unmount();

    render(<FinalBosses fullAccess onBack={() => undefined} />);
    expect(screen.getByRole("heading", { name: "The Hypotenuse" })).toBeInTheDocument();
    expect(editor().value).toBe(draft);
    expect(screen.getByRole("button", { name: /Boss 04.*available/ })).toBeEnabled();
    expect(screen.getByText("00 / 15")).toBeInTheDocument();
  });

  it("runs three hidden tests and defeats the boss when every result passes", async () => {
    runner.execute.mockImplementation((_code: string, _signal: AbortSignal, inputs: string[]) => Promise.resolve(additionAnswers("", inputs)));
    render(<FinalBosses onBack={() => undefined} />);
    await waitFor(() => expect(runner.prepare).toHaveBeenCalled());

    fireEvent.change(editor(), {
      target: { value: editor().value.replace("double result = 0; // Change this", "double result = b + a;") },
    });
    fireEvent.click(screen.getByRole("button", { name: /RUN TESTS/ }));

    await waitFor(() => expect(screen.getByText("BOSS DEFEATED")).toBeInTheDocument(), { timeout: 20000 });
    expect(runner.execute).toHaveBeenCalledTimes(3);
    expect(screen.getAllByText("PASS")).toHaveLength(3);
    expect(document.querySelectorAll(".boss-test-card.is-pass")).toHaveLength(3);
    expect(screen.getByText("+100 XP")).toBeInTheDocument();
    expect(screen.getByText("100 XP")).toBeInTheDocument();
    expect(screen.getAllByText("01 / 15")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /NEXT BOSS/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Boss 01.*complete/ })).toBeInTheDocument();
  });

  it("keeps the student code and offers TRY AGAIN when a result fails", async () => {
    runner.execute.mockImplementation((_code: string, _signal: AbortSignal, inputs: string[]) => Promise.resolve(subtractionAnswers("", inputs)));
    render(<FinalBosses onBack={() => undefined} />);
    await waitFor(() => expect(runner.prepare).toHaveBeenCalled());

    const wrong = editor().value.replace("double result = 0; // Change this", "double result = a - b;");
    fireEvent.change(editor(), { target: { value: wrong } });
    fireEvent.click(screen.getByRole("button", { name: /RUN TESTS/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /TRY AGAIN/ })).toBeInTheDocument(), { timeout: 20000 });
    expect(screen.getByText(/TESTS PASSED/)).toBeInTheDocument();
    expect(editor().value).toBe(wrong);
    expect(screen.getByRole("button", { name: /Boss 01.*current/ })).toBeInTheDocument();
  });

  it("keeps a separate draft for each boss and resets only the current boss", async () => {
    render(<FinalBosses onBack={() => undefined} />);
    await waitFor(() => expect(runner.prepare).toHaveBeenCalled());

    const firstDraft = editor().value.replace("double result = 0; // Change this", "double result = a + b;");
    fireEvent.change(editor(), { target: { value: firstDraft } });

    fireEvent.click(screen.getByRole("button", { name: /Boss 02/ }));
    expect(editor().value).toContain("double result = 0; // Change this");

    const secondDraft = editor().value.replace("double result = 0; // Change this", "double result = a - b;");
    fireEvent.change(editor(), { target: { value: secondDraft } });

    fireEvent.click(screen.getByRole("button", { name: /Boss 01/ }));
    expect(editor().value).toBe(firstDraft);

    fireEvent.click(screen.getByRole("button", { name: /RESET CODE/ }));
    fireEvent.click(screen.getByRole("button", { name: "RESET" }));
    expect(editor().value).toBe(finalBosses[0].starterCode);

    fireEvent.click(screen.getByRole("button", { name: /Boss 02/ }));
    expect(editor().value).toBe(secondDraft);
  });

  it("ignores clicks on locked bosses", async () => {
    render(<FinalBosses onBack={() => undefined} />);
    await waitFor(() => expect(runner.prepare).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Boss 07.*locked/ }));
    expect(screen.getByRole("heading", { name: "Two Numbers" })).toBeInTheDocument();
  });

  it("reports compiler errors with a friendly message and highlights nothing fatal", async () => {
    runner.execute.mockResolvedValueOnce({
      success: false,
      output: "",
      durationMs: 1,
      error: {
        title: "SOMETHING'S MISSING",
        message: "C# expected a ; here.",
        compiler: "CS1002 - ; expected",
        code: "CS1002",
        line: 4,
        column: 1,
      },
    } satisfies RunResult);
    render(<FinalBosses onBack={() => undefined} />);
    await waitFor(() => expect(runner.prepare).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /RUN TESTS/ }));
    await waitFor(() => expect(screen.getByText("COMPILER ERROR")).toBeInTheDocument(), { timeout: 20000 });
    expect(screen.getByText("LINE 4")).toBeInTheDocument();
    expect(screen.getAllByText("C# expected a ; here.")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "SHOW DETAILS" }));
    expect(screen.getByText("CS1002 - ; expected")).toBeInTheDocument();
    expect(runner.execute).toHaveBeenCalledTimes(1);
    expect(editor().value).toContain("double result = 0;");
  });

  it("shows the completion screen when all bosses are already defeated", async () => {
    const completed = Array.from({ length: 15 }, (_, index) => index + 1);
    window.localStorage.setItem("sharpie:final-bosses:v2", JSON.stringify({
      currentBoss: 15,
      unlockedBosses: completed,
      completedBosses: completed,
      codeByBoss: {},
      attemptsByBoss: {},
    }));
    render(<FinalBosses onBack={() => undefined} />);
    await waitFor(() => expect(runner.prepare).toHaveBeenCalled());

    expect(screen.getByText("FINAL BOSSES COMPLETE")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "15 / 15 BOSSES DEFEATED" })).toBeInTheDocument();
    expect(screen.getByText("+500 XP")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "REVIEW BOSSES" }));
    expect(screen.getByRole("heading", { name: "The Hypotenuse" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Boss trail" })).toBeInTheDocument();
  });
});
