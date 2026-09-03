import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RunResult } from "../types";
import { WriteLinePlayground } from "./WriteLinePlayground";

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe("WriteLine playground diagnostics", () => {
  afterEach(cleanup);

  beforeEach(() => {
    sessionStorage.clear();
    runner.prepare.mockClear();
    runner.execute.mockReset();
  });

  it("does not show a stale parenthesis error after the source is corrected", async () => {
    const pending = deferred<RunResult>();
    runner.execute.mockReturnValueOnce(pending.promise);
    render(<WriteLinePlayground name="Ada" onBack={() => undefined} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());
    const editor = screen.getByRole("textbox", { name: "C# code" });
    fireEvent.change(editor, { target: { value: 'Console.WriteLine("ready";' } });
    fireEvent.click(screen.getByRole("button", { name: "RUN" }));
    await waitFor(() => expect(runner.execute).toHaveBeenCalledOnce());

    fireEvent.change(editor, { target: { value: 'Console.WriteLine("ready");' } });
    await act(async () => {
      pending.resolve({
        success: false,
        output: "",
        durationMs: 1,
        error: {
          title: "CHECK THE PARENTHESES",
          message: "C# expected a closing ) here.",
          compiler: "CS1026 - ) expected",
          code: "CS1026",
        },
      });
      await pending.promise;
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());
    expect(screen.queryByText("CHECK THE PARENTHESES")).not.toBeInTheDocument();
    expect(screen.getByText("YOUR PROGRAM WILL SPEAK HERE.")).toBeInTheDocument();
  });

  it("marks the optional activities as purple extras", async () => {
    render(<WriteLinePlayground name="Ada" onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());

    const extraButtons = [6, 7, 8].map((id) => screen.getByRole("button", { name: new RegExp(`Challenge ${id}, extra`) }));
    extraButtons.forEach((button) => expect(button).toHaveClass("extra-activity"));

    fireEvent.click(extraButtons[0]);
    expect(screen.getByText("EXTRA · FINAL TRANSMISSION")).toBeInTheDocument();
    expect(document.querySelector(".challenge-bar")).toHaveClass("challenge-extra");
  });
});
