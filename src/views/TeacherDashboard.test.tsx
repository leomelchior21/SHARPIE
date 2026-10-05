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
  fetchClassMathlerProgress: vi.fn(() => Promise.resolve([
    {
      login: "ada",
      display_name: "Ada Lovelace",
      class_code: "7A",
      warmup_solved: 24,
      rush_completed: true,
      rush_rounds: 5,
      target_completed: 12,
      updated_at: "2026-10-03T12:00:00Z",
    },
  ])),
}));

vi.mock("../lib/supabase", () => ({ supabase: null }));

describe("Teacher dashboard", () => {
  afterEach(cleanup);

  it("shows the three Mathler steps before the boss progress", async () => {
    render(<TeacherDashboard onOpenModules={() => undefined} onOpenLive={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());

    expect(screen.getByText("MATHLER")).toBeInTheDocument();
    expect(screen.queryByText("UPDATED")).not.toBeInTheDocument();
    const row = screen.getByText("Ada Lovelace").closest(".teacher-row");
    expect(row?.querySelectorAll(".teacher-mathler-cell b.is-done")).toHaveLength(3);

    fireEvent.click(screen.getByText("Ada Lovelace"));
    expect(screen.getByText("MODULE 04 · MATHLER · 3 STEPS")).toBeInTheDocument();
    expect(screen.getByText("01 · TRANSLATE")).toBeInTheDocument();
    expect(screen.getByText("02 · WARM UP")).toBeInTheDocument();
    expect(screen.getByText("03 · MATHLER GAME")).toBeInTheDocument();
    expect(screen.getByText("TA 12 · SV 5 · 960 pts")).toBeInTheDocument();
  });
});
