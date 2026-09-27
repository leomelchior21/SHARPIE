import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hub } from "./Hub";

function renderHub(overrides: { isTeacher?: boolean } = {}) {
  const openFinalBosses = vi.fn();
  render(
    <Hub
      name={overrides.isTeacher ? "Professor" : "Ana"}
      isTeacher={overrides.isTeacher}
      onOpenTeacher={() => undefined}
      onOpenWriteLine={() => undefined}
      onOpenStop={() => undefined}
      onOpenMemoryMachine={() => undefined}
      onOpenFinalBosses={openFinalBosses}
    />,
  );
  return openFinalBosses;
}

describe("Hub module access", () => {
  afterEach(cleanup);

  it("keeps Final Bosses locked for students", () => {
    const openFinalBosses = renderHub();
    const card = screen.getByText("Final Bosses").closest("button");
    expect(card).toHaveAttribute("aria-disabled", "true");
    expect(within(card!).getByText("COMING SOON")).toBeInTheDocument();
    fireEvent.click(card!);
    expect(openFinalBosses).not.toHaveBeenCalled();
  });

  it("opens Final Bosses for the teacher", () => {
    const openFinalBosses = renderHub({ isTeacher: true });
    fireEvent.click(screen.getByText("Final Bosses"));
    expect(openFinalBosses).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByText("COMING SOON")).toHaveLength(1);
  });
});
