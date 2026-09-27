import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherLive } from "./TeacherLive";

type LiveRow = {
  login: string;
  module: string;
  detail: string | null;
  code: string;
  updated_at: string;
};

const db = vi.hoisted(() => ({
  rows: [] as unknown[],
  handler: null as ((payload: { new: unknown }) => void) | null,
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: db.rows, error: null }),
      }),
    }),
    channel: () => ({
      on: (_event: string, _filter: unknown, handler: (payload: { new: unknown }) => void) => {
        db.handler = handler;
        return { subscribe: () => ({}) };
      },
    }),
    removeChannel: () => Promise.resolve(),
  },
}));

function row(login: string, overrides: Partial<LiveRow> = {}): LiveRow {
  return {
    login,
    module: "final-bosses",
    detail: "Boss 01 · Two Numbers",
    code: "double result = a + b;",
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("teacher live view", () => {
  afterEach(cleanup);

  beforeEach(() => {
    db.rows = [];
    db.handler = null;
  });

  it("shows the current code of every student with roster names", async () => {
    db.rows = [row("joaodedivitis")];
    render(<TeacherLive onBack={() => undefined} />);

    await waitFor(() => expect(screen.getByText("João Pedro Dedivitis")).toBeInTheDocument());
    expect(screen.getByText("9A · Amarelo")).toBeInTheDocument();
    expect(screen.getByText("FINAL BOSSES")).toBeInTheDocument();
    expect(screen.getByText(/double result = a \+ b;/)).toBeInTheDocument();
    expect(screen.getByText("1 ACTIVE")).toBeInTheDocument();
  });

  it("updates the grid as new code arrives in real time", async () => {
    db.rows = [row("joaodedivitis")];
    render(<TeacherLive onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByText("João Pedro Dedivitis")).toBeInTheDocument());

    await act(async () => {
      db.handler?.({ new: row("anamascarenhas", { module: "stop", detail: "STOP · String Sheet", code: 'print("Name: " + answer1)' }) });
    });

    await waitFor(() => expect(screen.getByText("Ana Luiza Netto Mascarenhas")).toBeInTheDocument());
    expect(screen.getByText("STOP")).toBeInTheDocument();
    expect(screen.getByText(/print\("Name: " \+ answer1\)/)).toBeInTheDocument();
    expect(screen.getByText("2 ACTIVE")).toBeInTheDocument();
  });

  it("filters by class and opens a larger code view", async () => {
    db.rows = [
      row("joaodedivitis", { code: "double a = ?;" }),
      row("carolinaramos", { code: "double days = hours / 24;", module: "final-bosses", detail: "Boss 11 · Time Split" }),
    ];
    render(<TeacherLive onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByText("João Pedro Dedivitis")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "9D" }));
    expect(screen.queryByText("João Pedro Dedivitis")).not.toBeInTheDocument();
    expect(screen.getByText("Carolina de Oliveira Ramos")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "ALL" }));
    fireEvent.click(screen.getByText("João Pedro Dedivitis"));
    const dialog = screen.getByRole("dialog", { name: "Student code" });
    expect(within(dialog).getByText("double a = ?;")).toBeInTheDocument();
  });
});
