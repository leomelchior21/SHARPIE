import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hub } from "./Hub";

function renderHub(overrides: { isTeacher?: boolean } = {}) {
  const openFinalBosses = vi.fn();
  const openMathler = vi.fn();
  const openFinalProject = vi.fn();
  const signOut = vi.fn();
  render(
    <Hub
      name={overrides.isTeacher ? "Professor" : "Ana"}
      isTeacher={overrides.isTeacher}
      onOpenTeacher={() => undefined}
      onSignOut={signOut}
      onOpenWriteLine={() => undefined}
      onOpenStop={() => undefined}
      onOpenMathler={openMathler}
      onOpenMemoryMachine={() => undefined}
      onOpenFinalBosses={openFinalBosses}
      onOpenFinalProject={openFinalProject}
    />,
  );
  return { openFinalBosses, openMathler, openFinalProject, signOut };
}

describe("Hub module access", () => {
  afterEach(cleanup);

  it("opens Final project as a separate sixth module", () => {
    const { openFinalProject, openFinalBosses } = renderHub();
    fireEvent.click(screen.getByText("Final project"));
    expect(openFinalProject).toHaveBeenCalledTimes(1);
    expect(openFinalBosses).not.toHaveBeenCalled();
    expect(screen.getByText("Boolean Logic, Decisions & Digital Investigations")).toBeInTheDocument();
    expect(document.querySelectorAll(".module-card")).toHaveLength(6);
  });

  it("opens Final Bosses for students", () => {
    const { openFinalBosses } = renderHub();
    const card = screen.getByText("Final Bosses").closest("button");
    expect(card).toHaveAttribute("aria-disabled", "false");
    expect(within(card!).queryByText("COMING SOON")).not.toBeInTheDocument();
    fireEvent.click(card!);
    expect(openFinalBosses).toHaveBeenCalledTimes(1);
  });

  it("opens Final Bosses for the teacher", () => {
    const { openFinalBosses } = renderHub({ isTeacher: true });
    const card = screen.getByText("Final Bosses").closest("button");
    expect(card).toHaveAttribute("aria-disabled", "false");
    expect(within(card!).queryByText("COMING SOON")).not.toBeInTheDocument();
    fireEvent.click(card!);
    expect(openFinalBosses).toHaveBeenCalledTimes(1);
  });

  it("shows a log out button on the top right", () => {
    const { signOut } = renderHub();
    fireEvent.click(screen.getByRole("button", { name: /LOG OUT/ }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("opens the Mathler basic operations module for students", () => {
    const { openMathler } = renderHub();
    fireEvent.click(screen.getByText("Mathler"));
    expect(openMathler).toHaveBeenCalledTimes(1);
  });
});
