import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RunResult } from "../types";
import { StopPlayground } from "./StopPlayground";

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

describe("STOP playground sheet", () => {
  afterEach(cleanup);

  beforeEach(() => {
    sessionStorage.clear();
    runner.prepare.mockClear();
    runner.execute.mockReset();
  });

  it("starts from the answer1 sample without the bottom task banner", async () => {
    render(<StopPlayground name="Ada" onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());

    const editor = screen.getByRole("textbox", { name: "C# code" }) as HTMLTextAreaElement;
    expect(editor.value).toContain('string answer1 = "Ada";');
    expect(editor.value).toContain('Console.WriteLine("Name: " + answer1);');
    expect(editor.value).not.toContain("Reuse answer1");
    expect(screen.getByText("NAME")).toBeInTheDocument();
    expect(screen.getByText("1/6 COLUMNS")).toBeInTheDocument();
    expect(document.querySelector(".challenge-bar")).not.toBeInTheDocument();
  });

  it("color codes the command in the empty sheet hint", async () => {
    render(<StopPlayground name="Ada" onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());

    const editor = screen.getByRole("textbox", { name: "C# code" });
    fireEvent.change(editor, { target: { value: 'string answer1 = "Ada";' } });

    expect(document.querySelector(".stop-empty .syn-method")).toHaveTextContent("Console.WriteLine");
    expect(document.querySelector(".stop-empty .syn-string")).toHaveTextContent('"Name: "');
  });

  it("validates a labeled WriteLine with a check as soon as it is complete", async () => {
    render(<StopPlayground name="Ada" onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());

    const editor = screen.getByRole("textbox", { name: "C# code" });
    fireEvent.change(editor, {
      target: { value: 'string answer1 = "Aveiro";\nConsole.WriteLine("City: " + answer1);' },
    });

    expect(screen.getByText("CITY")).toBeInTheDocument();
    expect(screen.getByText("Aveiro")).toBeInTheDocument();
    expect(screen.getByText("VALID")).toBeInTheDocument();
    expect(document.querySelectorAll(".stop-column footer svg")).toHaveLength(1);
    expect(screen.getByText("1/6 COLUMNS")).toBeInTheDocument();
  });

  it("reuses the same variable for a second column after reassignment", async () => {
    render(<StopPlayground name="Ada" onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());

    const editor = screen.getByRole("textbox", { name: "C# code" });
    fireEvent.change(editor, {
      target: {
        value: [
          'string answer1 = "Ana";',
          'Console.WriteLine("Name: " + answer1);',
          'answer1 = "Braga";',
          'Console.WriteLine("City: " + answer1);',
        ].join("\n"),
      },
    });

    expect(screen.getByText("NAME")).toBeInTheDocument();
    expect(screen.getByText("CITY")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Braga")).toBeInTheDocument();
    expect(screen.getAllByText("VALID")).toHaveLength(2);
    expect(document.querySelectorAll(".stop-column footer svg")).toHaveLength(2);
    expect(screen.getByText("2/6 COLUMNS")).toBeInTheDocument();
  });

  it("does not add a column for a bare variable print and explains why", async () => {
    render(<StopPlayground name="Ada" onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());

    const editor = screen.getByRole("textbox", { name: "C# code" });
    fireEvent.change(editor, { target: { value: 'string answer1 = "Aveiro";\nConsole.WriteLine(answer1);' } });

    expect(screen.getByText(/Add a label before the variable/)).toBeInTheDocument();
    expect(screen.getByText("YOUR STOP SHEET IS WAITING.")).toBeInTheDocument();
    expect(screen.getByText("0/6")).toBeInTheDocument();
  });

  it("prints the labeled output after RUN", async () => {
    runner.execute.mockResolvedValueOnce({ success: true, output: "Name: Ana\nCity: Braga\n", durationMs: 4 } satisfies RunResult);
    render(<StopPlayground name="Ada" onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "RUN" })).toBeEnabled());

    const editor = screen.getByRole("textbox", { name: "C# code" });
    fireEvent.change(editor, {
      target: {
        value: [
          'string answer1 = "Ana";',
          'Console.WriteLine("Name: " + answer1);',
          'answer1 = "Braga";',
          'Console.WriteLine("City: " + answer1);',
        ].join("\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "RUN" }));

    await waitFor(() => expect(screen.getByText("LAST OUTPUT")).toBeInTheDocument());
    expect(screen.getByText(/Name: Ana/)).toBeInTheDocument();
    expect(screen.getByText(/City: Braga/)).toBeInTheDocument();
  });
});
