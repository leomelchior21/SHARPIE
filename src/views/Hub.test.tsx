import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hub } from "./Hub";

function renderHub(overrides: { isTeacher?: boolean } = {}) {
  const openFinalBosses = vi.fn();
  const signOut = vi.fn();
  render(
    <Hub
      name={overrides.isTeacher ? "Professor" : "Ana"}
      isTeacher={overrides.isTeacher}
      onOpenTeacher={() => undefined}
      onSignOut={signOut}
      onOpenWriteLine={() => undefined}
      onOpenStop={() => undefined}
      onOpenMemoryMachine={() => undefined}
      onOpenFinalBosses={openFinalBosses}
    />,
  );
  return { openFinalBosses, signOut };
}

describe("Hub module access", () => {
  afterEach(cleanup);

  it("keeps Final Bosses locked for students", () => {
    const { openFinalBosses } = renderHub();
    const card = screen.getByText("Final Bosses").closest("button");
    expect(card).toHaveAttribute("aria-disabled", "true");
    expect(within(card!).getByText("COMING SOON")).toBeInTheDocument();
    fireEvent.click(card!);
    expect(openFinalBosses).not.toHaveBeenCalled();
  });

  it("opens Final Bosses for the teacher", () => {
    const { openFinalBosses } = renderHub({ isTeacher: true });
    fireEvent.click(screen.getByText("Final Bosses"));
    expect(openFinalBosses).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByText("COMING SOON")).toHaveLength(1);
  });

  it("shows a log out button on the top right", () => {
    const { signOut } = renderHub();
    fireEvent.click(screen.getByRole("button", { name: /LOG OUT/ }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
