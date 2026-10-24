import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchClassProgress } from "../lib/bossSync";
import { fetchClassMathlerProgress, fetchClassMathlerScores } from "../lib/basicOps/survivalLeaderboard";
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

  it("tracks Mathler from the shared progress row when the dedicated tables are absent", async () => {
    vi.mocked(fetchClassMathlerScores).mockResolvedValueOnce([]);
    vi.mocked(fetchClassMathlerProgress).mockResolvedValueOnce([]);
    vi.mocked(fetchClassProgress).mockResolvedValueOnce([
      {
        student: { login: "grace", name: "Grace Hopper", classCode: "9B", group: "Branco" },
        completedBosses: [],
        xp: 0,
        updatedAt: "2026-10-04T10:00:00Z",
        codes: {},
        attempts: {},
        mathlerSteps: {
          login: "grace",
          display_name: "Grace Hopper",
          class_code: "9B",
          warmup_solved: 12,
          rush_completed: true,
          rush_rounds: 5,
          target_completed: 12,
          updated_at: "2026-10-04T10:00:00Z",
        },
        mathlerGame: {
          login: "grace",
          display_name: "Grace Hopper",
          class_code: "9B",
          best_score: 800,
          best_streak: 4,
          time_attack_best: 9,
          updated_at: "2026-10-04T10:00:00Z",
        },
      },
    ]);

    render(<TeacherDashboard onOpenModules={() => undefined} onOpenLive={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Grace Hopper")).toBeInTheDocument());

    const row = screen.getByText("Grace Hopper").closest(".teacher-row");
    expect(row?.querySelectorAll(".teacher-mathler-cell b.is-done")).toHaveLength(3);

    fireEvent.click(screen.getByText("Grace Hopper"));
    expect(screen.getByText("01 · TRANSLATE")).toBeInTheDocument();
    expect(screen.getByText("12 / 12 · RUSH ✓")).toBeInTheDocument();
    expect(screen.getByText("TA 9 · SV 4 · 800 pts")).toBeInTheDocument();
  });

  it("shows partial Mathler progress counts in the student list", async () => {
    vi.mocked(fetchClassMathlerScores).mockResolvedValueOnce([]);
    vi.mocked(fetchClassMathlerProgress).mockResolvedValueOnce([]);
    vi.mocked(fetchClassProgress).mockResolvedValueOnce([
      {
        student: { login: "linus", name: "Linus Torvalds", classCode: "9C", group: "Amarelo" },
        completedBosses: [],
        xp: 0,
        updatedAt: "2026-10-04T10:00:00Z",
        codes: {},
        attempts: {},
        mathlerSteps: {
          login: "linus",
          display_name: "Linus Torvalds",
          class_code: "9C",
          warmup_solved: 12,
          rush_completed: false,
          rush_rounds: 4,
          target_completed: 7,
          updated_at: "2026-10-04T10:00:00Z",
        },
      },
    ]);

    render(<TeacherDashboard onOpenModules={() => undefined} onOpenLive={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Linus Torvalds")).toBeInTheDocument());

    const badges = screen.getByText("Linus Torvalds").closest(".teacher-row")!.querySelectorAll(".teacher-mathler-cell b");
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveClass("is-progress");
    expect(badges[0].textContent).toBe("T12");
    expect(badges[1]).toHaveClass("is-progress");
    expect(badges[1].textContent).toBe("W7");
    expect(badges[2].textContent).toBe("G0");
    expect(badges[2].className).toBe("");
  });

  it("shows the Final project stages, missed questions and reflection", async () => {
    vi.mocked(fetchClassProgress).mockResolvedValueOnce([
      {
        student: { login: "alan", name: "Alan Turing", classCode: "9A", group: "Branco" },
        completedBosses: [],
        xp: 0,
        updatedAt: "2026-10-24T10:00:00Z",
        codes: {},
        attempts: {},
        finalProject: {
          xp: 640, tapes: [3, 2, 3, 3, 1, 2], endlessBest: 23, flows: 3, quizAnswered: 20, quizRight: 17, quizMissed: [4, 13, 16],
          built: [1, 2, 3, 4], policies: 2, reportDone: false, reflection: "A rule can be followed and still be unfair.", updatedAt: "2026-10-24T10:00:00Z",
        },
      },
    ]);
    render(<TeacherDashboard onOpenModules={() => undefined} onOpenLive={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Alan Turing")).toBeInTheDocument());

    const badges = screen.getByText("Alan Turing").closest(".teacher-row")!.querySelectorAll(".teacher-final-cell b");
    expect([...badges].map((badge) => badge.textContent)).toEqual(["B6", "L2", "S2"]);
    expect(badges[0]).toHaveClass("is-done");
    expect(badges[1]).toHaveClass("is-progress");

    fireEvent.click(screen.getByText("Alan Turing"));
    expect(screen.getByText("MODULE 08 · FINAL PROJECT")).toBeInTheDocument();
    expect(screen.getByText("6 / 6 tapes · 14★ · Deep 23")).toBeInTheDocument();
    expect(screen.getByText("17 right · 20 / 20 answered")).toBeInTheDocument();
    expect(screen.getByText("4 / 10 shipped")).toBeInTheDocument();
    expect(screen.getByText("Q4 · Q13 · Q16")).toBeInTheDocument();
    expect(screen.getByText("A rule can be followed and still be unfair.")).toBeInTheDocument();
  });
});
