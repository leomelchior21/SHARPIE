import { ArrowLeft, Eye, Loader2, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { CLASS_CODES, findStudent } from "../data/roster";
import type { ClassCode } from "../data/roster";
import { supabase } from "../lib/supabase";

type TeacherLiveProps = {
  onBack: () => void;
};

type ClassFilter = "ALL" | ClassCode;
type GroupFilter = "ALL" | "Amarelo" | "Branco";

type LiveCodeRow = {
  login: string;
  module: string;
  detail: string | null;
  code: string;
  updated_at: string;
};

const GROUPS: GroupFilter[] = ["ALL", "Amarelo", "Branco"];

const MODULE_LABELS: Record<string, string> = {
  "final-bosses": "FINAL BOSSES",
  writeline: "WRITELINE",
  stop: "STOP",
  "variable-run": "VARIABLE RUN",
  "variable-sprint": "VARIABLE SPRINT",
};

const LIVE_WINDOW_MS = 90_000;

function ageLabel(updatedAt: string, now: number) {
  const timestamp = new Date(updatedAt).getTime();
  if (Number.isNaN(timestamp)) return "—";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export function TeacherLive({ onBack }: TeacherLiveProps) {
  const [rows, setRows] = useState<LiveCodeRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<ClassFilter>("ALL");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("ALL");
  const [query, setQuery] = useState("");
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 2000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    setStatus("loading");
    setError(null);
    const { data, error: loadError } = await supabase
      .from("sharpie_live_code")
      .select("login, module, detail, code, updated_at")
      .order("updated_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      setStatus("error");
      return;
    }
    setRows((data ?? []) as LiveCodeRow[]);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("sharpie-live-code")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sharpie_live_code" },
        (payload) => {
          const next = payload.new as LiveCodeRow | null;
          if (!next?.login) return;
          setRows((previous) => [...previous.filter((row) => row.login !== next.login), next]);
        },
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .map((row) => ({ row, student: findStudent(row.login) }))
      .filter(({ student }) => classFilter === "ALL" || student?.classCode === classFilter)
      .filter(({ student }) => groupFilter === "ALL" || student?.group === groupFilter)
      .filter(({ row, student }) => !needle || (student?.name.toLowerCase().includes(needle) ?? false) || row.login.includes(needle))
      .sort(
        (a, b) =>
          (a.student?.classCode ?? "zz").localeCompare(b.student?.classCode ?? "zz") ||
          (a.student?.name ?? a.row.login).localeCompare(b.student?.name ?? b.row.login),
      );
  }, [classFilter, groupFilter, query, rows]);

  const liveCount = useMemo(
    () => rows.filter((row) => now - new Date(row.updated_at).getTime() < LIVE_WINDOW_MS).length,
    [now, rows],
  );

  const selected = rows.find((row) => row.login === selectedLogin) ?? null;
  const selectedStudent = selected ? findStudent(selected.login) : null;

  return (
    <section className="teacher-dashboard screen-enter" aria-labelledby="live-title">
      <header className="playground-header teacher-header">
        <div className="playground-identity">
          <Brand compact />
          <span className="header-divider" />
          <div>
            <span>TEACHER</span>
            <strong id="live-title">LIVE VIEW</strong>
          </div>
        </div>
        <div className="playground-tools">
          <span className="live-counter"><i /> {liveCount} ACTIVE</span>
          <button className="icon-text-button" onClick={() => void load()} disabled={status === "loading"}>
            <RefreshCw size={15} /> <span>REFRESH</span>
          </button>
          <button className="icon-text-button" onClick={onBack}>
            <ArrowLeft size={15} /> <span>DASHBOARD</span>
          </button>
        </div>
      </header>

      <div className="teacher-body">
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
        </div>

        {status === "loading" && (
          <div className="teacher-state"><Loader2 size={18} className="spin" /> Connecting to live code...</div>
        )}
        {status === "error" && (
          <div className="teacher-state is-error">
            <strong>Could not connect.</strong>
            <p>{error}</p>
            <p className="teacher-state-hint">Run supabase/sharpie-live.sql in Supabase first.</p>
          </div>
        )}
        {status === "ready" && filtered.length === 0 && (
          <div className="teacher-state"><Eye size={18} /> No students typing right now. Codes appear here the moment they type.</div>
        )}

        {status === "ready" && filtered.length > 0 && (
          <div className="live-grid">
            {filtered.map(({ row, student }) => {
              const isLive = now - new Date(row.updated_at).getTime() < LIVE_WINDOW_MS;
              return (
                <button
                  key={row.login}
                  className={`live-card ${isLive ? "is-live" : ""}`}
                  onClick={() => setSelectedLogin(row.login)}
                >
                  <header>
                    <strong>{student?.name ?? row.login}</strong>
                    <span>{student?.classCode ?? "—"} · {student?.group ?? "no group"}</span>
                  </header>
                  <div className="live-card-meta">
                    <span>{MODULE_LABELS[row.module] ?? row.module.toUpperCase()}</span>
                    {row.detail && <em>{row.detail}</em>}
                    <small>{ageLabel(row.updated_at, now)}</small>
                  </div>
                  <pre>{row.code.trim() || "// empty editor"}</pre>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedLogin(null)}>
          <div
            className="modal live-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Student code"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="close-modal" onClick={() => setSelectedLogin(null)} aria-label="Close"><X size={18} /></button>
            <span className="modal-kicker">{MODULE_LABELS[selected.module] ?? selected.module.toUpperCase()}{selected.detail ? ` · ${selected.detail}` : ""}</span>
            <h2>{selectedStudent?.name ?? selected.login}</h2>
            <p className="live-modal-meta">
              {selectedStudent?.classCode ?? "—"} · {selectedStudent?.group ?? "no group"} · {ageLabel(selected.updated_at, now)}
            </p>
            <pre className="live-modal-code">{selected.code.trim() || "// empty editor"}</pre>
          </div>
        </div>
      )}
    </section>
  );
}
