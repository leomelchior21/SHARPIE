import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { TARGET_PUZZLES, WARMUP_TOTAL } from "../../data/basicOperations";
import { finalBosses } from "../../data/finalBosses";
import { FINAL_FLOWS, FINAL_POLICIES, FINAL_QUESTIONS, FINAL_TAPES, FINAL_TICKETS } from "../../lib/finalProjectSync";
import { BOSS_TOTAL, RUSH_ROUNDS, formatWhen, isActiveNow, percent, relativeTime } from "./progress";
import type { ModuleKey, StudentProgress } from "./progress";
import { ModuleBar, ProgressRing, stateOf } from "./visuals";

type StudentPanelProps = {
  progress: StudentProgress;
  now: number;
  onClose: () => void;
};

function firstBossWithCode(progress: StudentProgress) {
  return finalBosses.find((boss) => progress.bosses.codes[String(boss.id)]?.trim())?.id ?? 1;
}

export function StudentPanel({ progress, now, onClose }: StudentPanelProps) {
  const { student, mathler, bosses, final } = progress;
  // The dashboard keys this panel by login, so each student opens on their first submitted code.
  const [bossId, setBossId] = useState(() => firstBossWithCode(progress));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const boss = finalBosses.find((item) => item.id === bossId) ?? finalBosses[0];
  const code = bosses.codes[String(boss.id)]?.trim();
  const bossTries = bosses.attempts[String(boss.id)] ?? 0;
  const bossPassed = bosses.passed.includes(boss.id);
  const record = final.record;
  const game = mathler.game;

  return (
    <aside className="tdb-panel" aria-label={`${student.name} details`}>
      <header className="tdb-panel-head">
        <ProgressRing share={progress.overall} size={64} label={`${percent(progress.overall)} overall`} />
        <div>
          <strong>{student.name}</strong>
          <span>
            {student.classCode} · {student.group ?? "no group"} · {student.login}
          </span>
          <small className={isActiveNow(progress, now) ? "is-live" : ""}>
            <i /> {progress.lastActive ? `Active ${relativeTime(progress.lastActive, now)} · ${formatWhen(progress.lastActive)}` : "No activity yet"}
          </small>
        </div>
        <button className="tdb-icon-button" onClick={onClose} aria-label="Close student details">
          <X size={16} />
        </button>
      </header>

      <div className="tdb-panel-body">
        <Section module="mathler" title="MODULE 04 · MATHLER · 3 STEPS" share={mathler.share} note={mathler.steps?.updated_at ? `updated ${formatWhen(mathler.steps.updated_at)}` : game ? `played ${formatWhen(game.updated_at)}` : "not started"}>
          <Step label="01 · TRANSLATE" share={mathler.parts[0]} value={mathler.steps ? `${mathler.warmup} / ${WARMUP_TOTAL}${mathler.rushDone ? " · RUSH ✓" : ` · RUSH ${mathler.rushRounds}/${RUSH_ROUNDS}`}` : "-"} />
          <Step label="02 · WARM UP" share={mathler.parts[1]} value={mathler.steps ? `${mathler.target} / ${TARGET_PUZZLES.length} steps` : "-"} />
          <Step label="03 · MATHLER GAME" share={mathler.parts[2]} value={`TA ${game?.time_attack_best ?? 0} · SV ${game?.best_streak ?? 0} · ${(game?.best_score ?? 0).toLocaleString("en-US")} pts`} />
        </Section>

        <Section module="bosses" title="MODULE 05 · FINAL BOSSES" share={bosses.share} note={`${bosses.passed.length} / ${BOSS_TOTAL} · ${bosses.xp} XP`}>
          <div className="tdb-boss-grid">
            {finalBosses.map((item) => {
              const passed = bosses.passed.includes(item.id);
              const tries = bosses.attempts[String(item.id)] ?? 0;
              return (
                <button
                  key={item.id}
                  className={`${passed ? "is-done" : tries > 0 ? "is-progress" : ""} ${bossId === item.id ? "is-active" : ""}`}
                  onClick={() => setBossId(item.id)}
                  title={`${item.title} · ${tries} attempt(s)`}
                >
                  {passed ? <Check size={12} /> : String(item.id).padStart(2, "0")}
                </button>
              );
            })}
          </div>
          <div className="tdb-code">
            <div className="tdb-code-head">
              <span>BOSS {String(boss.id).padStart(2, "0")} · {boss.title}</span>
              <small className={bossPassed ? "is-done" : ""}>{bossPassed ? "PASSED" : bossTries ? "IN PROGRESS" : "NOT TRIED"} · {bossTries} attempt(s)</small>
            </div>
            <pre>{code || "No code submitted for this boss."}</pre>
          </div>
        </Section>

        <Section module="final" title="MODULE 08 · FINAL PROJECT" share={final.share} note={record?.updatedAt ? `updated ${formatWhen(record.updatedAt)}` : "not opened"}>
          {record ? (
            <>
              <Step label="01 · BACKROOMS" share={final.parts[0]} value={`${final.tapes} / ${FINAL_TAPES} tapes · ${final.stars}★ · Deep ${record.endlessBest}`} />
              <Step label="02 · LIVE FLOW" share={record.flows / FINAL_FLOWS} value={`${record.flows} / ${FINAL_FLOWS} tickets`} />
              <Step label="02 · QUIZ" share={record.quizAnswered / FINAL_QUESTIONS} value={`${record.quizRight} right · ${record.quizAnswered} / ${FINAL_QUESTIONS} answered`} />
              <Step label="02 · BUILDER" share={record.built.length / FINAL_TICKETS} value={`${record.built.length} / ${FINAL_TICKETS} shipped`} />
              <Step label="03 · SHADOW FEED" share={final.parts[2]} value={`${record.policies} / ${FINAL_POLICIES} policies${record.reportDone ? " · REPORT ✓" : ""}`} />
              {record.quizMissed.length > 0 && (
                <p className="tdb-note">
                  Quiz to review: <b>{record.quizMissed.map((n) => `Q${n}`).join(" · ")}</b>
                </p>
              )}
              {record.built.length > 0 && record.built.length < FINAL_TICKETS && <p className="tdb-note">Builder tickets shipped: {record.built.join(", ")}</p>}
              {record.reflection.trim() && (
                <blockquote className="tdb-reflection">
                  <small>WHITE HAT REFLECTION</small>
                  {record.reflection}
                </blockquote>
              )}
            </>
          ) : (
            <p className="tdb-empty">The final project has not been opened yet.</p>
          )}
        </Section>
      </div>
    </aside>
  );
}

function Section({ module, title, share, note, children }: { module: ModuleKey; title: string; share: number; note: string; children: ReactNode }) {
  return (
    <section className={`tdb-section tdb-${module}`}>
      <header>
        <span>{title}</span>
        <strong>{percent(share)}</strong>
      </header>
      <ModuleBar share={share} module={module} />
      <small className="tdb-section-note">{note}</small>
      <div className="tdb-section-body">{children}</div>
    </section>
  );
}

function Step({ label, share, value }: { label: string; share: number; value: string }) {
  return (
    <div className={`tdb-step ${stateOf(share)}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <i>
        <b style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%` }} />
      </i>
    </div>
  );
}
