import { ArrowLeft, Check, Download, Eye, Loader2, LogOut, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { finalBosses } from "../data/finalBosses";
import { CLASS_CODES } from "../data/roster";
import type { ClassCode } from "../data/roster";
import { fetchClassProgress } from "../lib/bossSync";
import type { ClassProgressRow } from "../lib/bossSync";
import { supabase } from "../lib/supabase";

type TeacherDashboardProps = {
  onOpenModules: () => void;
  onOpenLive: () => void;
  onSignOut: () => void;
};

type ClassFilter = "ALL" | ClassCode;
type GroupFilter = "ALL" | "Amarelo" | "Branco";

const GROUPS: GroupFilter[] = ["ALL", "Amarelo", "Branco"];

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-US", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function TeacherDashboard({ onOpenModules, onOpenLive, onSignOut }: TeacherDashboardProps) {
  const [rows, setRows] = useState<ClassProgressRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<ClassFilter>("ALL");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("ALL");
  const [query, setQuery] = useState("");
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null);
  const [selectedBoss, setSelectedBoss] = useState(1);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchClassProgress();
      setRows(data);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load submissions.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => classFilter === "ALL" || row.student.classCode === classFilter)
      .filter((row) => groupFilter === "ALL" || row.student.group === groupFilter)
      .filter((row) => !needle || row.student.name.toLowerCase().includes(needle) || row.student.login.includes(needle))
      .sort((a, b) => a.student.classCode.localeCompare(b.student.classCode) || a.student.name.localeCompare(b.student.name));
  }, [classFilter, groupFilter, query, rows]);

  const summary = useMemo(() => {
    return CLASS_CODES.map((code) => {
      const students = rows.filter((row) => row.student.classCode === code);
      const finished = students.filter((row) => row.completedBosses.length === finalBosses.length).length;
      const average = students.length
        ? students.reduce((total, row) => total + row.completedBosses.length, 0) / students.length
        : 0;
      return { code, total: students.length, finished, average };
    });
  }, [rows]);

  const selected = rows.find((row) => row.student.login === selectedLogin) ?? null;

  const exportCsv = () => {
    const header = ["name", "login", "class", "group", "bosses", "xp", "updated_at"];
    const lines = filtered.map((row) =>
      [
        row.student.name,
        row.student.login,
        row.student.classCode,
        row.student.group ?? "",
        `${row.completedBosses.length}/15`,
        String(row.xp),
        row.updatedAt ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([`\uFEFF${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sharpie-submissions-${classFilter.toLowerCase()}-${groupFilter.toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    onSignOut();
  };

  return (
    <section className="teacher-dashboard screen-enter" aria-labelledby="teacher-title">
      <header className="playground-header teacher-header">
        <div className="playground-identity">
          <Brand compact />
          <span className="header-divider" />
          <div>
            <span>MODULE 05</span>
            <strong id="teacher-title">TEACHER DASHBOARD</strong>
          </div>
        </div>
        <div className="playground-tools">
          <button className="icon-text-button live-view-button" onClick={onOpenLive}>
            <Eye size={15} /> <span>LIVE VIEW</span>
          </button>
          <button className="icon-text-button" onClick={() => void load()} disabled={status === "loading"}>
            <RefreshCw size={15} /> <span>REFRESH</span>
          </button>
          <button className="icon-text-button" onClick={onOpenModules}>
            <ArrowLeft size={15} /> <span>MODULES</span>
          </button>
          <button className="icon-text-button" onClick={() => void signOut()}>
            <LogOut size={15} /> <span>SIGN OUT</span>
          </button>
        </div>
      </header>

      <div className="teacher-body">
        <div className="teacher-summary">
          {summary.map((item) => (
            <button
              key={item.code}
              className={`teacher-summary-card ${classFilter === item.code ? "is-active" : ""}`}
              onClick={() => setClassFilter(classFilter === item.code ? "ALL" : item.code)}
            >
              <span>{item.code}</span>
              <strong>{item.finished}<small>/{item.total}</small></strong>
              <em>{item.total ? item.average.toFixed(1) : "0.0"} bosses avg</em>
            </button>
          ))}
          <button className={`teacher-summary-card ${classFilter === "ALL" ? "is-active" : ""}`} onClick={() => setClassFilter("ALL")}>
            <span>ALL</span>
            <strong>{rows.filter((row) => row.completedBosses.length === finalBosses.length).length}<small>/{rows.length}</small></strong>
            <em>students with 15/15</em>
          </button>
        </div>

        <div className="teacher-toolbar">
          <label className="teacher-search">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or login"
              aria-label="Search student"
            />
          </label>
          <div className="teacher-class-tabs" role="tablist" aria-label="Classes">
            {(["ALL", ...CLASS_CODES] as ClassFilter[]).map((code) => (
              <button
                key={code}
                role="tab"
                aria-selected={classFilter === code}
                className={classFilter === code ? "is-active" : ""}
                onClick={() => setClassFilter(code)}
              >
                {code === "ALL" ? "ALL" : code}
              </button>
            ))}
          </div>
          <div className="teacher-class-tabs teacher-group-tabs" role="tablist" aria-label="Groups">
            {GROUPS.map((group) => (
              <button
                key={group}
                role="tab"
                aria-selected={groupFilter === group}
                className={groupFilter === group ? "is-active" : ""}
                onClick={() => setGroupFilter(group)}
              >
                {group === "ALL" ? "ALL GROUPS" : group.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="teacher-export" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={14} /> CSV
          </button>
        </div>

        <div className="teacher-workspace">
          <div className="teacher-list" role="table" aria-label="Student submissions">
            <div className="teacher-list-head" role="row">
              <span role="columnheader">STUDENT</span>
              <span role="columnheader">CLASS</span>
              <span role="columnheader">GROUP</span>
              <span role="columnheader">BOSSES</span>
              <span role="columnheader">XP</span>
              <span role="columnheader">UPDATED</span>
            </div>

            {status === "loading" && (
              <div className="teacher-state"><Loader2 size={18} className="spin" /> Loading submissions...</div>
            )}
            {status === "error" && (
              <div className="teacher-state is-error">
                <strong>Could not load.</strong>
                <p>{error}</p>
                <p className="teacher-state-hint">Make sure the setup SQL was run in Supabase.</p>
              </div>
            )}
            {status === "ready" && filtered.length === 0 && (
              <div className="teacher-state">No students found.</div>
            )}
            {status === "ready" && filtered.map((row) => {
              const done = row.completedBosses.length;
              const active = row.student.login === selectedLogin;
              return (
                <button
                  key={row.student.login}
                  role="row"
                  className={`teacher-row ${active ? "is-active" : ""}`}
                  onClick={() => { setSelectedLogin(row.student.login); setSelectedBoss(1); }}
                >
                  <span role="cell" className="teacher-name">
                    <strong>{row.student.name}</strong>
                    <small>{row.student.login}</small>
                  </span>
                  <span role="cell">{row.student.classCode}</span>
                  <span role="cell">{row.student.group ?? "—"}</span>
                  <span role="cell" className={`teacher-progress ${done === finalBosses.length ? "is-done" : ""}`}>
                    {done === finalBosses.length && <Check size={12} />}
                    {done}/15
                    <i><b style={{ width: `${(done / finalBosses.length) * 100}%` }} /></i>
                  </span>
                  <span role="cell" className="teacher-xp">{row.xp} XP</span>
                  <span role="cell" className="teacher-when">{formatWhen(row.updatedAt)}</span>
                </button>
              );
            })}
          </div>

          <aside className="teacher-detail" aria-label="Student details">
            {!selected ? (
              <div className="teacher-state">Select a student to see their submissions.</div>
            ) : (
              <>
                <header>
                  <strong>{selected.student.name}</strong>
                  <span>{selected.student.classCode} · {selected.student.group ?? "no group"} · {selected.xp} XP</span>
                </header>
                <div className="teacher-boss-grid">
                  {finalBosses.map((boss) => {
                    const passed = selected.completedBosses.includes(boss.id);
                    const attempts = selected.attempts[String(boss.id)] ?? 0;
                    return (
                      <button
                        key={boss.id}
                        className={`${passed ? "is-pass" : ""} ${selectedBoss === boss.id ? "is-active" : ""}`}
                        onClick={() => setSelectedBoss(boss.id)}
                        title={`${boss.title} · ${attempts} attempt(s)`}
                      >
                        {passed ? <Check size={11} /> : String(boss.id).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
                <div className="teacher-code">
                  <div className="teacher-code-head">
                    <span>BOSS {String(selectedBoss).padStart(2, "0")} · {finalBosses.find((boss) => boss.id === selectedBoss)?.title}</span>
                    <small>{selected.attempts[String(selectedBoss)] ?? 0} attempt(s)</small>
                  </div>
                  <pre>{selected.codes[String(selectedBoss)]?.trim() || "No code submitted for this boss."}</pre>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
