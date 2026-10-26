import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { CellHookData, HookData, RowInput } from "jspdf-autotable";
import { TARGET_PUZZLES, WARMUP_TOTAL } from "../../data/basicOperations";
import { finalBosses } from "../../data/finalBosses";
import { CLASS_CODES } from "../../data/roster";
import type { ClassCode } from "../../data/roster";
import { FINAL_FLOWS, FINAL_POLICIES, FINAL_QUESTIONS, FINAL_TAPES, FINAL_TICKETS } from "../../lib/finalProjectSync";
import { BOSS_TOTAL, MODULES, RUSH_ROUNDS, formatWhen, summarizeClass } from "./progress";
import type { ClassSummary, ModuleKey, StudentProgress } from "./progress";

// Landscape A4 class report: an overview of every class, one page per class
// with all its students, then a page per student who has started, with their
// submitted Final Bosses code.

type RGB = [number, number, number];

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 10;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BAND_H = 22;

const INK: RGB = [20, 27, 46];
const SOFT: RGB = [88, 99, 126];
const FAINT: RGB = [146, 155, 178];
const LINE: RGB = [223, 228, 239];
const WASH: RGB = [244, 246, 251];
const NAVY: RGB = [10, 16, 40];
const DONE: RGB = [30, 160, 105];
const DONE_SOFT: RGB = [220, 245, 232];
const PROGRESS: RGB = [222, 146, 26];
const PROGRESS_SOFT: RGB = [253, 241, 216];
const TRACK: RGB = [228, 232, 241];
const MODULE_RGB: Record<ModuleKey, RGB> = { mathler: [57, 117, 255], bosses: [226, 58, 86], final: [30, 160, 105] };
const MODULE_SOFT: Record<ModuleKey, RGB> = { mathler: [232, 239, 255], bosses: [253, 232, 236], final: [224, 246, 236] };

const MAX_CODE_LINES = 60;

/** The built-in PDF fonts only cover Latin-1, so anything else is swapped for a close match. */
export function latin(text: string): string {
  return text
    .replace(/\t/g, "    ")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•∙]/g, "·")
    .replace(/[★☆]/g, "*")
    .replace(/[✓✔]/g, "ok")
    .replace(/[←-⇿]/g, "->")
    .replace(/[^\n -~ -ÿ]/g, "?");
}

// PDF bookmarks are shown without accents, which some viewers cannot decode.
const plain = (text: string) => latin(text.normalize("NFD").replace(/[̀-ͯ]/g, ""));

const pct = (share: number) => `${Math.round(Math.min(Math.max(share, 0), 1) * 100)}%`;

function tintFor(share: number): RGB | null {
  return share >= 1 ? DONE_SOFT : share > 0 ? PROGRESS_SOFT : null;
}

function lastY(doc: jsPDF) {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function setText(doc: jsPDF, size: number, color: RGB, style: "normal" | "bold" = "normal", font = "helvetica") {
  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function bar(doc: jsPDF, x: number, y: number, w: number, h: number, share: number, color: RGB) {
  const value = Math.min(Math.max(share, 0), 1);
  doc.setFillColor(...TRACK);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  if (value <= 0) return;
  doc.setFillColor(...color);
  doc.roundedRect(x, y, Math.max(w * value, h), h, h / 2, h / 2, "F");
}

function band(doc: jsPDF, title: string, subtitle: string, right?: { label: string; value: string }) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, BAND_H, "F");
  MODULES.forEach((module, index) => {
    doc.setFillColor(...MODULE_RGB[module.key]);
    doc.rect((PAGE_W / 3) * index, BAND_H - 1.2, PAGE_W / 3, 1.2, "F");
  });
  setText(doc, 7, [128, 160, 255], "bold");
  doc.text("SHARPIE", MARGIN, 8, { charSpace: 0.8 });
  setText(doc, 15, [255, 255, 255], "bold");
  doc.text(latin(title), MARGIN, 16.2);
  setText(doc, 8.5, [175, 190, 225]);
  const titleWidth = doc.setFont("helvetica", "bold").setFontSize(15).getTextWidth(latin(title));
  setText(doc, 8.5, [175, 190, 225]);
  doc.text(latin(subtitle), MARGIN + titleWidth + 6, 16);
  if (right) {
    setText(doc, 6.5, [140, 160, 210], "bold");
    doc.text(right.label, PAGE_W - MARGIN, 8, { align: "right" });
    setText(doc, 15, [255, 255, 255], "bold");
    doc.text(right.value, PAGE_W - MARGIN, 16.2, { align: "right" });
  }
}

function continuationBand(doc: jsPDF, title: string) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 12, "F");
  setText(doc, 6.5, [128, 160, 255], "bold");
  doc.text("SHARPIE", MARGIN, 7.6, { charSpace: 0.8 });
  setText(doc, 9, [255, 255, 255], "bold");
  doc.text(`${latin(title)}  (continued)`, MARGIN + 20, 7.8);
}

function sectionTitle(doc: jsPDF, text: string, y: number, color: RGB = SOFT) {
  setText(doc, 7.2, color, "bold");
  doc.text(text, MARGIN, y, { charSpace: 0.4 });
}

function moduleShare(summary: ClassSummary, key: ModuleKey) {
  return summary[key];
}

/* Overview */

function overviewPage(doc: jsPDF, students: StudentProgress[], generated: string) {
  const all = summarizeClass("ALL", students, 0);
  const classes = CLASS_CODES.map((code) => summarizeClass(code, students.filter((item) => item.student.classCode === code), 0));
  band(doc, "Class progress report", `All classes · ${generated}`, { label: "OVERALL", value: pct(all.overall) });

  const tiles = [
    { label: "STUDENTS", value: String(all.students.length), note: `${CLASS_CODES.length} classes` },
    { label: "STARTED", value: String(all.started), note: `${pct(all.students.length ? all.started / all.students.length : 0)} of the year` },
    { label: "MATHLER · 3/3 STEPS", value: String(all.mathlerComplete), note: `class average ${pct(all.mathler)}`, color: MODULE_RGB.mathler },
    { label: "FINAL BOSSES · 15/15", value: String(all.bossesComplete), note: `class average ${pct(all.bosses)}`, color: MODULE_RGB.bosses },
    { label: "FINAL PROJECT · 3/3", value: String(all.finalComplete), note: `class average ${pct(all.final)}`, color: MODULE_RGB.final },
    { label: "AVERAGE OVERALL", value: pct(all.overall), note: "three modules together" },
  ];
  const gap = 4;
  const tileW = (CONTENT_W - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((tile, index) => {
    const x = MARGIN + index * (tileW + gap);
    const y = 28;
    doc.setFillColor(...WASH);
    doc.roundedRect(x, y, tileW, 24, 2, 2, "F");
    if (tile.color) {
      doc.setFillColor(...tile.color);
      doc.roundedRect(x, y, 1.6, 24, 0.8, 0.8, "F");
    }
    setText(doc, 6.2, tile.color ?? SOFT, "bold");
    doc.text(tile.label, x + 5, y + 6.5, { charSpace: 0.3 });
    setText(doc, 17, INK, "bold");
    doc.text(tile.value, x + 5, y + 16);
    setText(doc, 6.8, FAINT);
    doc.text(tile.note, x + 5, y + 21);
  });

  sectionTitle(doc, "PROGRESS BY CLASS", 61);
  const body: RowInput[] = [...classes, all].map((summary) => [
    summary.code === "ALL" ? "All classes" : summary.code,
    String(summary.students.length),
    `${summary.started} (${pct(summary.students.length ? summary.started / summary.students.length : 0)})`,
    pct(summary.mathler),
    pct(summary.bosses),
    pct(summary.final),
    pct(summary.overall),
    `${summary.mathlerComplete}`,
    `${summary.bossesComplete}`,
    `${summary.finalComplete}`,
  ]);
  const barColumns: Record<number, ModuleKey | "overall"> = { 3: "mathler", 4: "bosses", 5: "final", 6: "overall" };
  const summaries = [...classes, all];
  autoTable(doc, {
    startY: 64,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Class", "Students", "Started", "Mathler", "Final Bosses", "Final Project", "Overall", "Mathler done", "Bosses 15/15", "Project done"]],
    body,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8.5, textColor: INK, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, valign: "middle", lineColor: LINE, lineWidth: { bottom: 0.2 } },
    headStyles: { fontSize: 7, fontStyle: "bold", textColor: SOFT, fillColor: WASH },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 26, halign: "center" },
      3: { cellWidth: 38, halign: "right" },
      4: { cellWidth: 38, halign: "right" },
      5: { cellWidth: 38, halign: "right" },
      6: { cellWidth: 38, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section === "body" && data.row.index === summaries.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = WASH;
      }
      if (data.section === "head" && barColumns[data.column.index] && barColumns[data.column.index] !== "overall") {
        data.cell.styles.textColor = MODULE_RGB[barColumns[data.column.index] as ModuleKey];
      }
    },
    didDrawCell: (data: CellHookData) => {
      const key = barColumns[data.column.index];
      if (data.section !== "body" || !key) return;
      const summary = summaries[data.row.index];
      const share = key === "overall" ? summary.overall : moduleShare(summary, key);
      bar(doc, data.cell.x + 3, data.cell.y + data.cell.height / 2 - 1.2, data.cell.width - 17, 2.4, share, key === "overall" ? INK : MODULE_RGB[key]);
    },
  });

  // Where students sit: how many are at each stage of their overall progress.
  let y = lastY(doc) + 10;
  sectionTitle(doc, "WHERE STUDENTS ARE · OVERALL PROGRESS", y);
  const buckets = [
    { label: "not started", test: (s: StudentProgress) => !s.started, color: TRACK, ink: SOFT },
    { label: "under 25%", test: (s: StudentProgress) => s.started && s.overall < 0.25, color: [252, 214, 160] as RGB, ink: INK },
    { label: "25-49%", test: (s: StudentProgress) => s.started && s.overall >= 0.25 && s.overall < 0.5, color: [245, 178, 80] as RGB, ink: INK },
    { label: "50-74%", test: (s: StudentProgress) => s.started && s.overall >= 0.5 && s.overall < 0.75, color: [140, 210, 175] as RGB, ink: INK },
    { label: "75-99%", test: (s: StudentProgress) => s.started && s.overall >= 0.75 && s.overall < 1, color: [60, 180, 125] as RGB, ink: [255, 255, 255] as RGB },
    { label: "complete", test: (s: StudentProgress) => s.started && s.overall >= 1, color: DONE, ink: [255, 255, 255] as RGB },
  ];
  y += 5;
  const labelW = 26;
  const barW = CONTENT_W - labelW - 4;
  for (const summary of classes) {
    setText(doc, 8.5, INK, "bold");
    doc.text(summary.code, MARGIN, y + 4.6);
    let x = MARGIN + labelW;
    const total = summary.students.length || 1;
    for (const bucket of buckets) {
      const count = summary.students.filter(bucket.test).length;
      if (!count) continue;
      const w = (count / total) * barW;
      doc.setFillColor(...bucket.color);
      doc.rect(x, y, w, 6.5, "F");
      if (w > 6) {
        setText(doc, 7, bucket.ink, "bold");
        doc.text(String(count), x + w / 2, y + 4.4, { align: "center" });
      }
      x += w;
    }
    y += 9;
  }
  let lx = MARGIN + labelW;
  for (const bucket of buckets) {
    doc.setFillColor(...bucket.color);
    doc.rect(lx, y + 0.6, 3.2, 3.2, "F");
    setText(doc, 7, SOFT);
    doc.text(bucket.label, lx + 4.6, y + 3.4);
    lx += doc.getTextWidth(bucket.label) + 12;
  }

  y = Math.max(y + 12, 178);
  doc.setFillColor(...WASH);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, "F");
  setText(doc, 6.6, SOFT, "bold");
  doc.text("HOW TO READ THIS REPORT", MARGIN + 4, y + 5.5, { charSpace: 0.3 });
  setText(doc, 7.2, SOFT);
  doc.text(
    doc.splitTextToSize(
      `Mathler = average of its 3 steps (Translate with Rush, Warm up, Mathler game). Final Bosses = bosses passed out of ${BOSS_TOTAL}. Final Project = average of Backrooms tapes, the IF / ELSE Lab (Live Flow, Quiz, Builder) and Shadow Feed (policies + report). Overall = the three modules together. Green means complete, amber means in progress. Each class page lists every student; a page per student who has started follows, with their submitted code.`,
      CONTENT_W - 8,
    ),
    MARGIN + 4,
    y + 10,
  );
}

/* Class page */

function stepText(item: StudentProgress) {
  const { mathler, final } = item;
  const record = final.record;
  return {
    translate: mathler.steps ? `${mathler.warmup}/${WARMUP_TOTAL} · ${mathler.rushDone ? "rush ok" : `rush ${mathler.rushRounds}/${RUSH_ROUNDS}`}` : "-",
    warmUp: mathler.steps ? `${mathler.target}/${TARGET_PUZZLES.length}` : "-",
    game: mathler.game && mathler.parts[2] > 0 ? `TA ${mathler.game.time_attack_best} · SV ${mathler.game.best_streak}` : "-",
    tapes: record ? `${final.tapes}/${FINAL_TAPES}` : "-",
    lab: record ? `${record.flows}/${FINAL_FLOWS} · ${record.quizAnswered}/${FINAL_QUESTIONS} · ${record.built.length}/${FINAL_TICKETS}` : "-",
    shadow: record ? `${record.policies}/${FINAL_POLICIES}${record.reportDone ? " · rep." : ""}` : "-",
  };
}

function classPage(doc: jsPDF, summary: ClassSummary) {
  const code = summary.code as ClassCode;
  const total = summary.students.length;
  band(doc, `Class ${code}`, `${total} students · ${summary.started} started`, { label: "CLASS AVERAGE", value: pct(summary.overall) });

  const blockW = (CONTENT_W - 8) / 3;
  MODULES.forEach((module, index) => {
    const x = MARGIN + index * (blockW + 4);
    const complete = module.key === "mathler" ? summary.mathlerComplete : module.key === "bosses" ? summary.bossesComplete : summary.finalComplete;
    setText(doc, 7, MODULE_RGB[module.key], "bold");
    doc.text(`MODULE ${module.id} · ${module.label.toUpperCase()}`, x, 30, { charSpace: 0.3 });
    setText(doc, 7, SOFT);
    doc.text(`${complete} of ${total} complete`, x + blockW - 16, 30, { align: "right" });
    setText(doc, 9, INK, "bold");
    doc.text(pct(summary[module.key]), x + blockW, 30, { align: "right" });
    bar(doc, x, 32.5, blockW, 2.6, summary[module.key], MODULE_RGB[module.key]);
  });

  const students = [...summary.students].sort(
    (a, b) => (a.student.group ?? "~").localeCompare(b.student.group ?? "~") || a.student.name.localeCompare(b.student.name),
  );
  const shares = students.map((item) => [
    item.mathler.parts[0], item.mathler.parts[1], item.mathler.parts[2], item.mathler.share,
    item.bosses.share, item.final.parts[0], item.final.parts[1], item.final.parts[2], item.final.share, item.overall,
  ]);
  // Column index -> position in the shares row above.
  const shareColumn: Record<number, number> = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9 };
  const barColumn: Record<number, RGB> = { 5: MODULE_RGB.mathler, 6: MODULE_RGB.bosses, 10: MODULE_RGB.final, 11: INK };
  const moduleHead: Record<number, RGB> = { 2: MODULE_RGB.mathler, 3: MODULE_RGB.mathler, 4: MODULE_RGB.mathler, 5: MODULE_RGB.mathler, 6: MODULE_RGB.bosses, 7: MODULE_RGB.final, 8: MODULE_RGB.final, 9: MODULE_RGB.final, 10: MODULE_RGB.final };

  autoTable(doc, {
    startY: 38,
    margin: { left: MARGIN, right: MARGIN, top: 18, bottom: 12 },
    head: [["Student", "Group", "Translate", "Warm up", "Game", "Mathler", "Bosses", "Tapes", "Lab flow·quiz·build", "Shadow", "Final project", "Overall", "Last active"]],
    body: students.map((item) => {
      const text = stepText(item);
      return [
        latin(item.student.name),
        item.student.group ?? "-",
        text.translate,
        text.warmUp,
        text.game,
        pct(item.mathler.share),
        `${item.bosses.passed.length}/${BOSS_TOTAL}`,
        text.tapes,
        text.lab,
        text.shadow,
        pct(item.final.share),
        pct(item.overall),
        item.lastActive ? formatWhen(item.lastActive) : "never",
      ];
    }),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7, textColor: INK, cellPadding: { top: 1.25, bottom: 1.25, left: 1.6, right: 1.6 }, valign: "middle", overflow: "ellipsize", lineColor: LINE, lineWidth: { bottom: 0.15 } },
    headStyles: { fontSize: 6.2, fontStyle: "bold", textColor: SOFT, fillColor: WASH, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold" },
      1: { cellWidth: 15 },
      2: { cellWidth: 23 },
      3: { cellWidth: 13, halign: "center" },
      4: { cellWidth: 20 },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 12, halign: "center" },
      8: { cellWidth: 26, halign: "center" },
      9: { cellWidth: 17, halign: "center" },
      10: { cellWidth: 22, halign: "right" },
      11: { cellWidth: 19, halign: "right", fontStyle: "bold" },
      12: { cellWidth: 18, textColor: SOFT },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section === "head" && moduleHead[data.column.index]) data.cell.styles.textColor = moduleHead[data.column.index];
      if (data.section !== "body") return;
      const item = students[data.row.index];
      if (!item.started) data.cell.styles.textColor = FAINT;
      const position = shareColumn[data.column.index];
      if (position === undefined || barColumn[data.column.index]) return;
      const tint = tintFor(shares[data.row.index][position]);
      if (tint) data.cell.styles.fillColor = tint;
    },
    didDrawCell: (data: CellHookData) => {
      const color = barColumn[data.column.index];
      if (data.section !== "body" || !color) return;
      const share = shares[data.row.index][shareColumn[data.column.index]];
      bar(doc, data.cell.x + 1.6, data.cell.y + data.cell.height / 2 - 0.9, data.cell.width - 12, 1.8, share, color);
    },
    didDrawPage: (data: HookData) => {
      if (data.pageNumber > 1) continuationBand(doc, `Class ${code}`);
    },
  });

  const idle = students.filter((item) => !item.started);
  let y = lastY(doc) + 6;
  if (idle.length && y < PAGE_H - 20) {
    setText(doc, 7, SOFT, "bold");
    doc.text(`NO ACTIVITY YET (${idle.length})`, MARGIN, y, { charSpace: 0.3 });
    setText(doc, 7.2, SOFT);
    const lines = doc.splitTextToSize(idle.map((item) => latin(item.student.name)).join("  ·  "), CONTENT_W);
    doc.text(lines, MARGIN, y + 4.5);
    y += 4.5 + lines.length * 3.4;
  }
}

/* Student page */

type CardLine = { label: string; value: string; share: number };

function moduleCard(doc: jsPDF, x: number, y: number, w: number, h: number, key: ModuleKey, title: string, share: number, lines: CardLine[]) {
  doc.setFillColor(...MODULE_SOFT[key]);
  doc.roundedRect(x, y, w, h, 2.2, 2.2, "F");
  doc.setFillColor(...MODULE_RGB[key]);
  doc.roundedRect(x, y, w, 1.6, 0.8, 0.8, "F");
  setText(doc, 7, MODULE_RGB[key], "bold");
  doc.text(title, x + 4.5, y + 8, { charSpace: 0.3 });
  setText(doc, 13, INK, "bold");
  doc.text(pct(share), x + w - 4.5, y + 9, { align: "right" });
  bar(doc, x + 4.5, y + 12, w - 9, 2.4, share, MODULE_RGB[key]);
  let lineY = y + 21;
  for (const line of lines) {
    setText(doc, 6.6, SOFT, "bold");
    doc.text(line.label, x + 4.5, lineY, { charSpace: 0.2 });
    setText(doc, 8, INK, "bold");
    doc.text(latin(line.value), x + w - 4.5, lineY, { align: "right" });
    bar(doc, x + 4.5, lineY + 1.8, w - 9, 1.4, line.share, line.share >= 1 ? DONE : PROGRESS);
    lineY += 8.6;
  }
  return lineY;
}

function studentPage(doc: jsPDF, item: StudentProgress) {
  const { student, mathler, bosses, final } = item;
  const record = final.record;
  band(doc, student.name, `${student.classCode} · ${student.group ?? "no group"} · ${student.login}`, { label: "OVERALL", value: pct(item.overall) });

  setText(doc, 7.4, SOFT);
  const facts = [
    `Last active ${item.lastActive ? formatWhen(item.lastActive) : "never"}`,
    `Final Bosses XP ${bosses.xp}`,
    record ? `Final project XP ${record.xp}` : "Final project not opened",
  ];
  doc.text(facts.join("   ·   "), MARGIN, 28.5);

  const cardW = (CONTENT_W - 10) / 3;
  const cardY = 32;
  const cardH = 68;
  const game = mathler.game;
  moduleCard(doc, MARGIN, cardY, cardW, cardH, "mathler", "MODULE 04 · MATHLER", mathler.share, [
    { label: "01 · TRANSLATE", value: mathler.steps ? `${mathler.warmup}/${WARMUP_TOTAL} · ${mathler.rushDone ? "rush done" : `rush ${mathler.rushRounds}/${RUSH_ROUNDS}`}` : "not started", share: mathler.parts[0] },
    { label: "02 · WARM UP", value: mathler.steps ? `${mathler.target}/${TARGET_PUZZLES.length} steps` : "not started", share: mathler.parts[1] },
    { label: "03 · MATHLER GAME", value: game && mathler.parts[2] > 0 ? `TA ${game.time_attack_best} · SV ${game.best_streak} · ${game.best_score} pts` : "not played", share: mathler.parts[2] },
  ]);

  // Final Bosses card: a 5 x 3 board of the fifteen bosses.
  const bx = MARGIN + cardW + 5;
  moduleCard(doc, bx, cardY, cardW, cardH, "bosses", "MODULE 05 · FINAL BOSSES", bosses.share, []);
  setText(doc, 8, INK, "bold");
  doc.text(`${bosses.passed.length} / ${BOSS_TOTAL} passed`, bx + 4.5, cardY + 21);
  const totalTries = Object.values(bosses.attempts).reduce((sum, value) => sum + (value || 0), 0);
  setText(doc, 7, SOFT);
  doc.text(`${totalTries} attempts in all`, bx + cardW - 4.5, cardY + 21, { align: "right" });
  const cellGap = 1.6;
  const cellW = (cardW - 9 - cellGap * 4) / 5;
  const cellH = 9.4;
  finalBosses.forEach((boss, index) => {
    const cx = bx + 4.5 + (index % 5) * (cellW + cellGap);
    const cy = cardY + 25 + Math.floor(index / 5) * (cellH + cellGap);
    const passed = bosses.passed.includes(boss.id);
    const tries = bosses.attempts[String(boss.id)] ?? 0;
    doc.setFillColor(...(passed ? MODULE_RGB.bosses : tries > 0 ? ([250, 205, 213] as RGB) : ([255, 255, 255] as RGB)));
    doc.roundedRect(cx, cy, cellW, cellH, 1.2, 1.2, "F");
    setText(doc, 7.5, passed ? [255, 255, 255] : tries > 0 ? MODULE_RGB.bosses : FAINT, "bold");
    doc.text(String(boss.id).padStart(2, "0"), cx + cellW / 2, cy + 4.4, { align: "center" });
    setText(doc, 5.2, passed ? [255, 230, 235] : FAINT);
    doc.text(passed ? "passed" : tries === 1 ? "1 try" : tries > 0 ? `${tries} tries` : "-", cx + cellW / 2, cy + 7.6, { align: "center" });
  });

  moduleCard(doc, MARGIN + (cardW + 5) * 2, cardY, cardW, cardH, "final", "MODULE 08 · FINAL PROJECT", final.share, record
    ? [
        { label: "01 · BACKROOMS", value: `${final.tapes}/${FINAL_TAPES} tapes · ${final.stars} star${final.stars === 1 ? "" : "s"} · deep ${record.endlessBest}`, share: final.parts[0] },
        { label: "02 · LIVE FLOW", value: `${record.flows}/${FINAL_FLOWS} tickets`, share: record.flows / FINAL_FLOWS },
        { label: "02 · QUIZ", value: `${record.quizRight} right · ${record.quizAnswered}/${FINAL_QUESTIONS} answered`, share: record.quizAnswered / FINAL_QUESTIONS },
        { label: "02 · BUILDER", value: `${record.built.length}/${FINAL_TICKETS} shipped`, share: record.built.length / FINAL_TICKETS },
        { label: "03 · SHADOW FEED", value: `${record.policies}/${FINAL_POLICIES} policies · report ${record.reportDone ? "done" : "not yet"}`, share: final.parts[2] },
      ]
    : [{ label: "STATUS", value: "not opened yet", share: 0 }]);

  let y = cardY + cardH + 7;
  const notes: string[] = [];
  if (record?.quizMissed.length) notes.push(`Quiz to review: ${record.quizMissed.map((n) => `Q${n}`).join(", ")}`);
  if (record && record.built.length > 0 && record.built.length < FINAL_TICKETS) notes.push(`Builder tickets shipped: ${record.built.join(", ")}`);
  const inProgress = finalBosses.filter((boss) => !bosses.passed.includes(boss.id) && (bosses.attempts[String(boss.id)] ?? 0) > 0);
  if (inProgress.length) notes.push(`Bosses tried but not passed: ${inProgress.map((boss) => `${boss.id} ${boss.title}`).join(", ")}`);
  if (notes.length) {
    setText(doc, 7.4, SOFT);
    for (const note of notes) {
      const lines = doc.splitTextToSize(latin(note), CONTENT_W);
      doc.text(lines, MARGIN, y);
      y += lines.length * 3.6 + 1;
    }
    y += 2;
  }

  if (record?.reflection.trim()) {
    const lines = doc.splitTextToSize(latin(record.reflection.trim()), CONTENT_W - 12);
    const h = 9 + lines.length * 3.8;
    doc.setFillColor(...DONE_SOFT);
    doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, "F");
    doc.setFillColor(...DONE);
    doc.rect(MARGIN, y, 1.4, h, "F");
    setText(doc, 6.4, DONE, "bold");
    doc.text("WHITE HAT REFLECTION", MARGIN + 5, y + 5, { charSpace: 0.3 });
    setText(doc, 8.2, INK);
    doc.text(lines, MARGIN + 5, y + 9.6);
    y += h + 6;
  }

  codeSection(doc, item, y);
}

function codeSection(doc: jsPDF, item: StudentProgress, startY: number) {
  const { bosses, student } = item;
  const submitted = finalBosses.filter((boss) => bosses.codes[String(boss.id)]?.trim());
  let y = startY;
  if (y > PAGE_H - 30) {
    doc.addPage();
    continuationBand(doc, student.name);
    y = 20;
  }
  sectionTitle(doc, `FINAL BOSSES · SUBMITTED CODE (${submitted.length})`, y, MODULE_RGB.bosses);
  if (!submitted.length) {
    setText(doc, 8, FAINT);
    doc.text("No Final Bosses code submitted yet.", MARGIN, y + 6);
    return;
  }

  const columns = 3;
  const rows: (typeof submitted)[] = [];
  for (let index = 0; index < submitted.length; index += columns) rows.push(submitted.slice(index, index + columns));
  const codeOf = (bossId: number) => {
    const lines = latin(bosses.codes[String(bossId)].replace(/\r\n?/g, "\n").trimEnd()).split("\n");
    return lines.length > MAX_CODE_LINES
      ? [...lines.slice(0, MAX_CODE_LINES), `// ... ${lines.length - MAX_CODE_LINES} more lines`].join("\n")
      : lines.join("\n");
  };

  // A long row continues on the next page as a new row with the same raw cells.
  const body = rows.map((row) => Array.from({ length: columns }, (_, index) => (row[index] ? codeOf(row[index].id) : "")));
  const bossesOf = new Map<unknown, (typeof submitted)>(body.map((cells, index) => [cells, rows[index]]));
  const bossAt = (data: CellHookData) => bossesOf.get(data.row.raw)?.[data.column.index];

  autoTable(doc, {
    startY: y + 3,
    margin: { left: MARGIN, right: MARGIN, top: 18, bottom: 12 },
    body,
    theme: "plain",
    rowPageBreak: "auto",
    styles: {
      font: "courier",
      fontSize: 6.8,
      textColor: INK,
      cellPadding: { top: 10.5, bottom: 3, left: 3, right: 3 },
      overflow: "linebreak",
      lineColor: [255, 255, 255],
      lineWidth: 1.2,
      fillColor: [248, 249, 252],
      valign: "top",
    },
    columnStyles: { 0: { cellWidth: CONTENT_W / 3 }, 1: { cellWidth: CONTENT_W / 3 }, 2: { cellWidth: CONTENT_W / 3 } },
    didParseCell: (data: CellHookData) => {
      if (!bossAt(data)) data.cell.styles.fillColor = [255, 255, 255];
    },
    didDrawCell: (data: CellHookData) => {
      const boss = bossAt(data);
      if (!boss) return;
      const passed = bosses.passed.includes(boss.id);
      const tries = bosses.attempts[String(boss.id)] ?? 0;
      const x = data.cell.x + 0.6;
      const w = data.cell.width - 1.2;
      doc.setFillColor(...(passed ? DONE_SOFT : tries > 0 ? PROGRESS_SOFT : WASH));
      doc.rect(x, data.cell.y + 0.6, w, 7.4, "F");
      setText(doc, 7.2, INK, "bold");
      doc.text(latin(`Boss ${String(boss.id).padStart(2, "0")} · ${boss.title}`), x + 2.4, data.cell.y + 5.2);
      setText(doc, 6.4, passed ? DONE : tries > 0 ? PROGRESS : FAINT, "bold");
      doc.text(`${passed ? "PASSED" : tries > 0 ? "NOT PASSED YET" : "DRAFT"} · ${tries} attempt${tries === 1 ? "" : "s"}`, x + w - 2.4, data.cell.y + 5.2, { align: "right" });
    },
    didDrawPage: (data: HookData) => {
      if (data.pageNumber > 1) continuationBand(doc, student.name);
    },
  });
}

/* Assembly */

function footers(doc: jsPDF, generated: string) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 8.5, PAGE_W - MARGIN, PAGE_H - 8.5);
    setText(doc, 6.6, FAINT);
    doc.text(`SHARPIE · Class progress report · ${generated}`, MARGIN, PAGE_H - 4.6);
    doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, PAGE_H - 4.6, { align: "right" });
  }
}

export function buildClassReport(students: StudentProgress[], generatedAt: Date): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const generated = generatedAt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  doc.setProperties({ title: `SHARPIE class progress report · ${generated}`, subject: "Class progress", creator: "SHARPIE" });

  overviewPage(doc, students, generated);
  const outline = (doc as unknown as { outline?: { add: (parent: unknown, title: string, options: { pageNumber: number }) => unknown } }).outline;
  outline?.add(null, "Overview", { pageNumber: 1 });

  for (const code of CLASS_CODES) {
    const summary = summarizeClass(code, students.filter((item) => item.student.classCode === code), 0);
    if (!summary.students.length) continue;
    doc.addPage();
    const classNode = outline?.add(null, `Class ${code}`, { pageNumber: doc.getNumberOfPages() });
    classPage(doc, summary);
    const started = [...summary.students].filter((item) => item.started).sort((a, b) => a.student.name.localeCompare(b.student.name));
    for (const item of started) {
      doc.addPage();
      outline?.add(classNode ?? null, plain(item.student.name), { pageNumber: doc.getNumberOfPages() });
      studentPage(doc, item);
    }
  }

  footers(doc, generated);
  return doc;
}

export function reportFileName(generatedAt: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `sharpie-report-${generatedAt.getFullYear()}-${pad(generatedAt.getMonth() + 1)}-${pad(generatedAt.getDate())}-${pad(generatedAt.getHours())}${pad(generatedAt.getMinutes())}.pdf`;
}

export function downloadClassReport(students: StudentProgress[], generatedAt: Date) {
  buildClassReport(students, generatedAt).save(reportFileName(generatedAt));
}
