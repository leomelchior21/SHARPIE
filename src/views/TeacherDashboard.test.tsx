import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchClassProgress } from "../lib/bossSync";
import { fetchClassMathlerProgress, fetchClassMathlerScores } from "../lib/basicOps/survivalLeaderboard";
import { TeacherDashboard } from "./TeacherDashboard";
import { downloadClassReport } from "./teacher/pdfReport";

vi.mock("../lib/bossSync", () => ({
  fetchClassProgress: vi.fn(() => Promise.resolve([
    {
      student: { login: "ada", name: "Ada Lovelace", classCode: "9A", group: "Amarelo" },
      completedBosses: [1, 2, 3],
      xp: 450,
      updatedAt: "2026-10-01T12:00:00Z",
      codes: { "1": "Console.WriteLine(1 + 1);" },
      attempts: { "1": 2 },
    },
  ])),
}));

vi.mock("../lib/basicOps/survivalLeaderboard", () => ({
  fetchClassMathlerScores: vi.fn(() => Promise.resolve([
    {
      login: "ada",
      display_name: "Ada Lovelace",
      class_code: "9A",
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
      class_code: "9A",
      warmup_solved: 24,
      rush_completed: true,
      rush_rounds: 5,
      target_completed: 12,
      updated_at: "2026-10-03T12:00:00Z",
    },
  ])),
}));

vi.mock("./teacher/pdfReport", () => ({ downloadClassReport: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: null }));

const segments = (name: string, module: "mathler" | "final") =>
  [...screen.getByText(name).closest(".tdb-row")!.querySelectorAll(`.tdb-${module} .tdb-steps i`)].map((segment) => segment.className);

describe("Teacher dashboard", () => {
  afterEach(cleanup);

  it("shows the three Mathler steps in the row and in the student panel", async () => {
    render(<TeacherDashboard onOpenModules={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());

    expect(segments("Ada Lovelace", "mathler")).toEqual(["is-done", "is-done", "is-done"]);
    expect(within(screen.getByText("Ada Lovelace").closest(".tdb-row") as HTMLElement).getByText("3/3 steps")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Ada Lovelace"));
    expect(screen.getByText("MODULE 04 · MATHLER · 3 STEPS")).toBeInTheDocument();
    expect(screen.getByText("01 · TRANSLATE")).toBeInTheDocument();
    expect(screen.getByText("02 · WARM UP")).toBeInTheDocument();
    expect(screen.getByText("03 · MATHLER GAME")).toBeInTheDocument();
    expect(screen.getByText("TA 12 · SV 5 · 960 pts")).toBeInTheDocument();
    expect(screen.getByText("Console.WriteLine(1 + 1);")).toBeInTheDocument();
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

    render(<TeacherDashboard onOpenModules={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Grace Hopper")).toBeInTheDocument());

    expect(segments("Grace Hopper", "mathler")).toEqual(["is-done", "is-done", "is-done"]);

    fireEvent.click(screen.getByText("Grace Hopper"));
    expect(screen.getByText("12 / 12 · RUSH ✓")).toBeInTheDocument();
    expect(screen.getByText("TA 9 · SV 4 · 800 pts")).toBeInTheDocument();
  });

  it("shows partial Mathler progress in the student list", async () => {
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

    render(<TeacherDashboard onOpenModules={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Linus Torvalds")).toBeInTheDocument());

    expect(segments("Linus Torvalds", "mathler")).toEqual(["is-progress", "is-progress", ""]);
    expect(within(screen.getByText("Linus Torvalds").closest(".tdb-row") as HTMLElement).getByText("0/3 steps")).toBeInTheDocument();
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
          xp: 640, tapes: [3, 2, 3, 3], endlessBest: 23, flows: 3, quizAnswered: 20, quizRight: 17, quizMissed: [4, 13, 16],
          built: [1, 2, 3, 4], policies: 2, reportDone: false, reflection: "A rule can be followed and still be unfair.", updatedAt: "2026-10-24T10:00:00Z",
        },
      },
    ]);
    render(<TeacherDashboard onOpenModules={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Alan Turing")).toBeInTheDocument());

    expect(segments("Alan Turing", "final")).toEqual(["is-done", "is-progress", "is-progress"]);
    expect(within(screen.getByText("Alan Turing").closest(".tdb-row") as HTMLElement).getByText("1/3 stages")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Alan Turing"));
    expect(screen.getByText("MODULE 08 · FINAL PROJECT")).toBeInTheDocument();
    expect(screen.getByText("4 / 4 tapes · 11★ · Deep 23")).toBeInTheDocument();
    expect(screen.getByText("17 right · 20 / 20 answered")).toBeInTheDocument();
    expect(screen.getByText("4 / 10 shipped")).toBeInTheDocument();
    expect(screen.getByText("Q4 · Q13 · Q16")).toBeInTheDocument();
    expect(screen.getByText("A rule can be followed and still be unfair.")).toBeInTheDocument();
  });

  it("filters by class from the class cards", async () => {
    vi.mocked(fetchClassProgress).mockResolvedValueOnce([
      { student: { login: "ada", name: "Ada Lovelace", classCode: "9A", group: "Amarelo" }, completedBosses: [], xp: 0, updatedAt: null, codes: {}, attempts: {} },
      { student: { login: "alan", name: "Alan Turing", classCode: "9B", group: "Branco" }, completedBosses: [], xp: 0, updatedAt: null, codes: {}, attempts: {} },
    ]);
    render(<TeacherDashboard onOpenModules={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Alan Turing")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /^9B/ }));
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
  });

  it("builds the PDF report from a fresh read of the class", async () => {
    render(<TeacherDashboard onOpenModules={() => undefined} onSignOut={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    const reads = vi.mocked(fetchClassProgress).mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /PDF REPORT/ }));
    await waitFor(() => expect(downloadClassReport).toHaveBeenCalled());

    expect(vi.mocked(fetchClassProgress).mock.calls.length).toBe(reads + 1);
    const calls = vi.mocked(downloadClassReport).mock.calls;
    const [students] = calls[calls.length - 1];
    expect(students.map((item) => item.student.login)).toEqual(["ada"]);
    await waitFor(() => expect(screen.getByRole("button", { name: /PDF REPORT/ })).toBeEnabled());
  });
});
