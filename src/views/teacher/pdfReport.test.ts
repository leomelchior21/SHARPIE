import { describe, expect, it } from "vitest";
import type { ClassProgressRow } from "../../lib/bossSync";
import { buildClassReport, latin, reportFileName } from "./pdfReport";
import { buildClassProgress } from "./progress";

function row(login: string, name: string, classCode: "9A" | "9B" | "9C" | "9D", extra: Partial<ClassProgressRow> = {}): ClassProgressRow {
  return {
    student: { login, name, classCode, group: "Amarelo" },
    completedBosses: [],
    xp: 0,
    updatedAt: null,
    codes: {},
    attempts: {},
    ...extra,
  };
}

const longCode = Array.from({ length: 140 }, (_, index) => `Console.WriteLine("linha ${index} → ok");`).join("\n");

const students = buildClassProgress(
  [
    row("ada", "Ada Lovelace", "9A", { completedBosses: [1, 2], xp: 300, updatedAt: "2026-10-26T10:00:00Z", codes: { "1": "double a = 1;", "2": longCode, "3": "double c = 3;", "4": "x" }, attempts: { "1": 1, "2": 3, "3": 1 } }),
    row("joao", "João Pedro Dedivitis", "9A"),
    row("grace", "Grace Hopper", "9B", {
      updatedAt: "2026-10-26T11:00:00Z",
      finalProject: {
        xp: 640, tapes: [3, 2, 3, 3], endlessBest: 23, flows: 3, quizAnswered: 20, quizRight: 17, quizMissed: [4], built: [1, 2], policies: 4, reportDone: true,
        reflection: "Regras “justas” — nem sempre são.", updatedAt: "2026-10-26T11:00:00Z",
      },
    }),
    row("linus", "Linus Torvalds", "9C"),
  ],
  [],
  [],
);

describe("class PDF report", () => {
  it("has an overview, a page for each class and a page for every student who started", () => {
    const doc = buildClassReport(students, new Date("2026-10-26T14:30:00"));
    // Overview + 9A, 9B, 9C class pages + Ada (code runs past one page) + Grace.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(7);
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    // Page streams are compressed; the document title and bookmarks are not.
    const text = doc.output();
    expect(text).toContain("SHARPIE class progress report");
    expect(text).toContain("(Class 9A)");
    expect(text).toContain("(Ada Lovelace)");
    expect(text).toContain("(Grace Hopper)");
    // Students with no activity are listed on their class page, without a page of their own.
    expect(text).not.toContain("(Joao Pedro Dedivitis)");
    expect(text).not.toContain("(Linus Torvalds)");
    expect(text).not.toContain("(Class 9D)");
  });

  it("keeps text inside the PDF fonts' Latin-1 range", () => {
    expect(latin("João “quoted” — ok → next ★ ✓")).toBe('João "quoted" - ok -> next * ok');
    expect(latin("tab\there 🙂")).toBe("tab    here ??");
  });

  it("names the file after the time it was made", () => {
    expect(reportFileName(new Date(2026, 9, 26, 9, 5))).toBe("sharpie-report-2026-10-26-0905.pdf");
  });
});
