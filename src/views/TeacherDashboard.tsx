import { ArrowLeft, Download, FileText, Loader2, LogOut, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { CLASS_CODES } from "../data/roster";
import type { ClassCode } from "../data/roster";
import { fetchClassMathlerProgress, fetchClassMathlerScores } from "../lib/basicOps/survivalLeaderboard";
import type { MathlerProgressRow, MathlerScoreRow } from "../lib/basicOps/survivalLeaderboard";
import { fetchClassProgress } from "../lib/bossSync";
import type { ClassProgressRow } from "../lib/bossSync";
import { FINAL_FLOWS, FINAL_POLICIES, FINAL_TAPES, FINAL_TICKETS } from "../lib/finalProjectSync";
import { supabase } from "../lib/supabase";
import {
  BOSS_TOTAL,
  MODULES,
  buildClassProgress,
  compareByClassAndName,
  isActiveNow,
  percent,
  relativeTime,
  summarizeClass,
} from "./teacher/progress";
import type { ClassSummary, StudentProgress } from "./teacher/progress";
import { StudentPanel } from "./teacher/StudentPanel";
import { BossStrip, ModuleBar, ProgressRing, StepBar } from "./teacher/visuals";
import "./teacher/teacher.css";

type TeacherDashboardProps = {
  onOpenModules: () => void;
  onSignOut: () => void;
};

type ClassFilter = "ALL" | ClassCode;
type GroupFilter = "ALL" | "Amarelo" | "Branco";
type SortMode = "class" | "progress" | "recent";

type DashboardData = {
  rows: ClassProgressRow[];
  scores: MathlerScoreRow[];
  steps: MathlerProgressRow[];
};

const GROUPS: GroupFilter[] = ["ALL", "Amarelo", "Branco"];
const SORTS: { key: SortMode; label: string }[] = [
  { key: "class", label: "BY CLASS" },
  { key: "progress", label: "PROGRESS" },
  { key: "recent", label: "RECENT" },
];
const AUTO_REFRESH_MS = 20_000;
const CLOCK_MS = 15_000;
const MATHLER_STEPS = ["Translate", "Warm up", "Mathler game"];
const FINAL_STAGES = ["Backrooms", "IF / ELSE Lab", "Shadow Feed"];

async function fetchDashboardData(): Promise<DashboardData> {
  const [rows, scores, steps] = await Promise.all([
    fetchClassProgress(),
    fetchClassMathlerScores().catch(() => [] as MathlerScoreRow[]),
    fetchClassMathlerProgress().catch(() => [] as MathlerProgressRow[]),
  ]);
  return { rows, scores, steps };
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function timeOf(value: string | null) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
}

export function TeacherDashboard({ onOpenModules, onSignOut }: TeacherDashboardProps) {
  const [data, setData] = useState<DashboardData>({ rows: [], scores: [], steps: [] });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [classFilter, setClassFilter] = useState<ClassFilter>("ALL");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("ALL");
  const [sort, setSort] = useState<SortMode>("class");
  const [query, setQuery] = useState("");
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null);
  const [report, setReport] = useState<"idle" | "building" | "error">("idle");

  const apply = useCallback((next: DashboardData) => {
    setData(next);
    setSyncedAt(Date.now());
    setNow(Date.now());
    setStatus("ready");
  }, []);

  // A quiet load refreshes the table in place, without the loading state.
  const load = useCallback(async (quiet = false) => {
    if (!quiet) {
      setStatus("loading");
      setError(null);
    }
    try {
      apply(await fetchDashboardData());
    } catch (loadError) {
      if (quiet) return;
      setError(loadError instanceof Error ? loadError.message : "Could not load submissions.");
      setStatus("error");
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  // Students save as they work, so the class view keeps itself current while
  // the tab is open, and catches up as soon as it becomes visible again.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const timer = window.setInterval(refresh, AUTO_REFRESH_MS);
    const clock = window.setInterval(() => setNow(Date.now()), CLOCK_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const students = useMemo(() => buildClassProgress(data.rows, data.scores, data.steps), [data]);

  const summaries = useMemo(
    () => [
      ...CLASS_CODES.map((code) => summarizeClass(code, students.filter((item) => item.student.classCode === code), now)),
      summarizeClass("ALL", students, now),
    ],
    [students, now],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = students
      .filter((item) => classFilter === "ALL" || item.student.classCode === classFilter)
      .filter((item) => groupFilter === "ALL" || item.student.group === groupFilter)
      .filter((item) => !needle || item.student.name.toLowerCase().includes(needle) || item.student.login.includes(needle));
    if (sort === "progress") return [...list].sort((a, b) => b.overall - a.overall || compareByClassAndName(a, b));
    if (sort === "recent") return [...list].sort((a, b) => timeOf(b.lastActive) - timeOf(a.lastActive) || compareByClassAndName(a, b));
    return list;
  }, [classFilter, groupFilter, query, sort, students]);

  // Sorted by class, the list is split into one titled block per class.
  const blocks = useMemo(() => {
    if (sort !== "class") return [{ code: null as ClassCode | null, items: filtered }];
    const codes = [...new Set(filtered.map((item) => item.student.classCode))];
    return codes.map((code) => ({ code, items: filtered.filter((item) => item.student.classCode === code) }));
  }, [filtered, sort]);

  const selected = students.find((item) => item.student.login === selectedLogin) ?? null;

  const exportCsv = () => {
    const header = ["name", "login", "class", "group", "overall_pct", "mathler_pct", "translate_warmup", "rush_completed", "rush_rounds", "target_steps", "time_attack_best", "survival_streak", "survival_score", "bosses", "xp", "final_pct", "final_tapes", "final_deep_best", "final_live_flows", "final_quiz_right", "final_quiz_answered", "final_builder", "final_policies", "final_report", "final_xp", "final_reflection", "last_active"];
    const lines = filtered.map((item) => {
      const { mathler, final } = item;
      const record = final.record;
      return [
        item.student.name,
        item.student.login,
        item.student.classCode,
        item.student.group ?? "",
        String(Math.round(item.overall * 100)),
        String(Math.round(mathler.share * 100)),
        mathler.steps ? String(mathler.warmup) : "",
        mathler.steps ? String(mathler.rushDone) : "",
        mathler.steps ? String(mathler.rushRounds) : "",
        mathler.steps ? String(mathler.target) : "",
        mathler.game ? String(mathler.game.time_attack_best) : "",
        mathler.game ? String(mathler.game.best_streak) : "",
        mathler.game ? String(mathler.game.best_score) : "",
        `${item.bosses.passed.length}/${BOSS_TOTAL}`,
        String(item.bosses.xp),
        String(Math.round(final.share * 100)),
        ...(record
          ? [
              `${final.tapes}/${FINAL_TAPES}`,
              String(record.endlessBest),
              `${record.flows}/${FINAL_FLOWS}`,
              String(record.quizRight),
              String(record.quizAnswered),
              `${record.built.length}/${FINAL_TICKETS}`,
              `${record.policies}/${FINAL_POLICIES}`,
              record.reportDone ? "yes" : "no",
              String(record.xp),
              record.reflection,
            ]
          : Array.from({ length: 10 }, () => "")),
        item.lastActive ?? "",
      ]
        .map(csvCell)
        .join(",");
    });
    const blob = new Blob([`﻿${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sharpie-submissions-${classFilter.toLowerCase()}-${groupFilter.toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // The report always covers every class, built from a fresh read so it
  // includes whatever students saved a moment ago.
  const downloadReport = async () => {
    if (report === "building") return;
    setReport("building");
    try {
      let latest = data;
      try {
        latest = await fetchDashboardData();
        apply(latest);
      } catch {
        // Offline: the report uses the last data on screen.
      }
      const { downloadClassReport } = await import("./teacher/pdfReport");
      downloadClassReport(buildClassProgress(latest.rows, latest.scores, latest.steps), new Date());
      setReport("idle");
    } catch {
      setReport("error");
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    onSignOut();
  };

  return (
    <section className="teacher-dashboard tdb screen-enter" aria-labelledby="teacher-title">
      <header className="playground-header teacher-header">
        <div className="playground-identity">
          <Brand compact />
          <span className="header-divider" />
          <div>
            <span>MODULES 04 · 05 · 08</span>
            <strong id="teacher-title">TEACHER DASHBOARD</strong>
          </div>
        </div>
        <div className="playground-tools">
          <button
            className={`tdb-sync ${status === "error" ? "is-error" : ""}`}
            onClick={() => void load()}
            disabled={status === "loading"}
            title="Updates by itself every 20 seconds. Click to refresh now."
          >
            {status === "loading" ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
            <i />
            <span>{status === "error" ? "OFFLINE" : syncedAt ? `LIVE · ${relativeTime(new Date(syncedAt).toISOString(), now).toUpperCase()}` : "SYNCING"}</span>
          </button>
          <button className="icon-text-button" onClick={onOpenModules}>
            <ArrowLeft size={15} /> <span>MODULES</span>
          </button>
          <button className="icon-text-button" onClick={() => void signOut()}>
            <LogOut size={15} /> <span>SIGN OUT</span>
          </button>
          <button className="icon-text-button" onClick={exportCsv} disabled={filtered.length === 0} title="Spreadsheet of the students shown">
            <Download size={15} /> <span>CSV</span>
          </button>
          <button
            className={`tdb-report-button ${report === "error" ? "is-error" : ""}`}
            onClick={() => void downloadReport()}
            disabled={report === "building" || (status !== "ready" && data.rows.length === 0)}
            title="Landscape PDF with every class and every student, built from the latest data"
          >
            {report === "building" ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}
            <span>{report === "building" ? "BUILDING PDF..." : report === "error" ? "PDF FAILED · RETRY" : "PDF REPORT"}</span>
          </button>
        </div>
      </header>

      <div className="tdb-body">
        <div className="tdb-classes">
          {summaries.map((summary) => (
            <ClassCard
              key={summary.code}
              summary={summary}
              active={classFilter === summary.code}
              onSelect={() => setClassFilter(summary.code === "ALL" || classFilter === summary.code ? "ALL" : summary.code)}
            />
          ))}
        </div>

        <div className="tdb-toolbar">
          <label className="tdb-search">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or login" aria-label="Search student" />
          </label>
          <div className="tdb-segment" role="tablist" aria-label="Groups">
            {GROUPS.map((group) => (
              <button key={group} role="tab" aria-selected={groupFilter === group} className={groupFilter === group ? "is-active" : ""} onClick={() => setGroupFilter(group)}>
                {group === "ALL" ? "ALL GROUPS" : group.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="tdb-segment" role="tablist" aria-label="Sort students">
            {SORTS.map((option) => (
              <button key={option.key} role="tab" aria-selected={sort === option.key} className={sort === option.key ? "is-active" : ""} onClick={() => setSort(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
          <span className="tdb-count">
            {filtered.length} {filtered.length === 1 ? "student" : "students"}
            {classFilter !== "ALL" && ` · ${classFilter}`}
          </span>
          <span className="tdb-legend" aria-hidden="true">
            <i className="is-done" /> done <i className="is-progress" /> in progress <i /> not started
          </span>
        </div>

        <div className={`tdb-workspace ${selected ? "has-panel" : ""}`}>
          <div className="tdb-table" role="table" aria-label="Student progress">
            <div className="tdb-head" role="row">
              <span role="columnheader">STUDENT</span>
              {MODULES.map((module) => (
                <span role="columnheader" key={module.key} className={`tdb-${module.key}`}>
                  <i /> {module.id} · {module.label.toUpperCase()}
                </span>
              ))}
              <span role="columnheader">OVERALL</span>
              <span role="columnheader">LAST ACTIVE</span>
            </div>

            {status === "loading" && data.rows.length === 0 && (
              <div className="tdb-state">
                <Loader2 size={18} className="spin" /> Loading the class...
              </div>
            )}
            {status === "error" && (
              <div className="tdb-state is-error">
                <strong>Could not load.</strong>
                <p>{error}</p>
                <p className="tdb-state-hint">Make sure the setup SQL was run in Supabase.</p>
              </div>
            )}
            {status !== "error" && data.rows.length > 0 && filtered.length === 0 && <div className="tdb-state">No students match these filters.</div>}

            {status !== "error" &&
              blocks.map((block) => (
                <div key={block.code ?? "all"} role="rowgroup">
                  {block.code && <ClassDivider summary={summarizeClass(block.code, block.items, now)} />}
                  {block.items.map((item) => (
                    <StudentRow
                      key={item.student.login}
                      progress={item}
                      now={now}
                      active={item.student.login === selectedLogin}
                      onSelect={() => setSelectedLogin(item.student.login === selectedLogin ? null : item.student.login)}
                    />
                  ))}
                </div>
              ))}
          </div>

          {selected && <StudentPanel key={selected.student.login} progress={selected} now={now} onClose={() => setSelectedLogin(null)} />}
        </div>
      </div>
    </section>
  );
}

function ClassCard({ summary, active, onSelect }: { summary: ClassSummary; active: boolean; onSelect: () => void }) {
  const total = summary.students.length;
  return (
    <button className={`tdb-class-card ${active ? "is-active" : ""} ${summary.code === "ALL" ? "is-all" : ""}`} onClick={onSelect} aria-pressed={active}>
      <header>
        <strong>{summary.code === "ALL" ? "ALL CLASSES" : summary.code}</strong>
        <span>{total} students</span>
      </header>
      <div className="tdb-class-main">
        <ProgressRing share={summary.overall} size={58} label={`${summary.code} ${percent(summary.overall)} overall`} />
        <ul>
          {MODULES.map((module) => (
            <li key={module.key} className={`tdb-${module.key}`}>
              <span>{module.short}</span>
              <ModuleBar share={summary[module.key]} module={module.key} />
              <b>{percent(summary[module.key])}</b>
            </li>
          ))}
        </ul>
      </div>
      <footer>
        <span className={summary.activeNow ? "is-live" : ""}>
          <i /> {summary.activeNow} active now
        </span>
        <span>
          {summary.started}/{total} started
        </span>
      </footer>
    </button>
  );
}

function ClassDivider({ summary }: { summary: ClassSummary }) {
  return (
    <div className="tdb-divider" role="row">
      <strong>{summary.code}</strong>
      <span>{summary.students.length} students</span>
      <span>{summary.started} started</span>
      <span className={summary.activeNow ? "is-live" : ""}>{summary.activeNow} active now</span>
      <b>{percent(summary.overall)} average</b>
    </div>
  );
}

function StudentRow({ progress, now, active, onSelect }: { progress: StudentProgress; now: number; active: boolean; onSelect: () => void }) {
  const { student, mathler, bosses, final } = progress;
  const live = isActiveNow(progress, now);
  return (
    <button role="row" className={`tdb-row ${active ? "is-active" : ""} ${progress.started ? "" : "is-idle"}`} onClick={onSelect}>
      <span role="cell" className="tdb-student">
        <strong>{student.name}</strong>
        <small>
          <b>{student.classCode}</b>
          {student.group && <em className={`tdb-group is-${student.group.toLowerCase()}`}>{student.group}</em>}
          {student.login}
        </small>
      </span>
      <span role="cell" className="tdb-module-cell tdb-mathler">
        <StepBar parts={mathler.parts} module="mathler" titles={MATHLER_STEPS} />
        <em>{mathler.stepsDone}/3 steps</em>
      </span>
      <span role="cell" className="tdb-module-cell tdb-bosses">
        <BossStrip passed={bosses.passed} attempts={bosses.attempts} />
        <em>
          {bosses.passed.length}/{BOSS_TOTAL} bosses
        </em>
      </span>
      <span role="cell" className="tdb-module-cell tdb-final">
        <StepBar parts={final.parts} module="final" titles={FINAL_STAGES} />
        <em>{final.record ? `${final.stagesDone}/3 stages` : "not opened"}</em>
      </span>
      <span role="cell" className="tdb-overall">
        <ProgressRing share={progress.overall} size={36} />
      </span>
      <span role="cell" className={`tdb-active ${live ? "is-live" : ""}`}>
        <i /> {relativeTime(progress.lastActive, now)}
      </span>
    </button>
  );
}
