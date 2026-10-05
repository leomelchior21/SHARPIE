import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherDashboard } from "./TeacherDashboard";

vi.mock("../lib/bossSync", () => ({
  fetchClassProgress: vi.fn(() => Promise.resolve([
    {
      student: { login: "ada", name: "Ada Lovelace", classCode: "7A", group: "Amarelo" },
      completedBosses: [1, 2, 3],
      xp: 450,
      updatedAt: "2026-10-01T12:00:00Z",
      codes: {},
      attempts: {},
    },
  ])),
}));

vi.mock("../lib/basicOps/survivalLeaderboard", () => ({
  fetchClassMathlerScores: vi.fn(() => Promise.resolve([
    {
      login: "ada",
      display_name: "Ada Lovelace",
      class_code: "7A",
      best_score: 960,
      best_streak: 5,
      time_attack_best: 12,
      updated_at: "2026-10-02T12:00:00Z",
    },
  ])),
}));

vi.mock("../lib/supabase", () => ({ supabase: null }));

describe("Teacher dashboard", () => {
  afterEach(cleanup);

  it("shows Mathler Game scores next to boss progress", async () => {
    render(<TeacherDashboard onOpenModules={() => undefined} onOpenLive={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());

    expect(screen.getByText("MATHLER")).toBeInTheDocument();
    const row = screen.getByText("Ada Lovelace").closest(".teacher-row");
    expect(row?.textContent).toContain("TA 12");
    expect(row?.textContent).toContain("SV 5");

    fireEvent.click(screen.getByText("Ada Lovelace"));
    expect(screen.getByText("MODULE 04 · MATHLER GAME")).toBeInTheDocument();
    expect(screen.getByText("TIME ATTACK")).toBeInTheDocument();
    expect(screen.getByText("SURVIVAL STREAK")).toBeInTheDocument();
    expect(screen.getByText("SURVIVAL SCORE")).toBeInTheDocument();
    expect(screen.getByText("960")).toBeInTheDocument();
  });
});
