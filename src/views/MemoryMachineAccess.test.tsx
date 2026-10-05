import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryMachineHub } from "./MemoryMachineHub";
import { VariableRun } from "./VariableRun";
import { VariableSprint } from "./VariableSprint";

vi.mock("../lib/runner", () => ({
  prepareCSharp: vi.fn(() => Promise.resolve()),
  executeCSharp: vi.fn(() => Promise.reject(new Error("engine offline in tests"))),
}));

function renderHub(fullAccess = false) {
  render(
    <MemoryMachineHub
      name="Leleomaker"
      fullAccess={fullAccess}
      onBack={() => undefined}
      onOpenExperience={() => undefined}
      onOpenVariableRun={() => undefined}
      onOpenVariableSprint={() => undefined}
    />,
  );
}

describe("Memory Machine access", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("locks Variable Run and Variable Sprint for a fresh student", () => {
    renderHub();
    expect(screen.getByText("Variable Run").closest("button")).toBeDisabled();
    expect(screen.getByText("Variable Sprint").closest("button")).toBeDisabled();
    expect(screen.getByText("UNLOCK: MEMORY MACHINE")).toBeInTheDocument();
    expect(screen.getByText("UNLOCK: VARIABLE RUN")).toBeInTheDocument();
  });

  it("opens every activity for full access", () => {
    renderHub(true);
    expect(screen.getByText("Variable Run").closest("button")).toBeEnabled();
    expect(screen.getByText("Variable Sprint").closest("button")).toBeEnabled();
    expect(screen.queryByText("UNLOCK: MEMORY MACHINE")).not.toBeInTheDocument();
    expect(screen.queryByText("UNLOCK: VARIABLE RUN")).not.toBeInTheDocument();
  });

  it("lets full access deep-link into Variable Run", () => {
    render(<VariableRun fullAccess onBack={() => undefined} onFinish={() => undefined} />);
    expect(screen.queryByText("Complete Memory Machine first.")).not.toBeInTheDocument();
  });

  it("lets full access deep-link into Variable Sprint", () => {
    render(<VariableSprint fullAccess onBack={() => undefined} />);
    expect(screen.queryByText("Complete Variable Run first.")).not.toBeInTheDocument();
  });
});
