import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, Braces, Database, LayoutDashboard, LockKeyhole, LogOut } from "lucide-react";
import { Brand } from "../components/Brand";
import { FINAL_BOSSES_STUDENT_ACCESS } from "../data/finalBosses";

type HubProps = {
  name: string;
  isTeacher?: boolean;
  onOpenTeacher?: () => void;
  onSignOut: () => void;
  onOpenWriteLine: () => void;
  onOpenStop: () => void;
  onOpenMemoryMachine: () => void;
  onOpenFinalBosses: () => void;
};

type Module = {
  id: string;
  name: string;
  subtitle: string;
  glyph: ReactNode;
  state: "available" | "featured" | "locked";
  onClick?: () => void;
};

export function Hub({ name, isTeacher, onOpenTeacher, onSignOut, onOpenWriteLine, onOpenStop, onOpenMemoryMachine, onOpenFinalBosses }: HubProps) {
  const [notice, setNotice] = useState(false);

  const locked = () => {
    setNotice(true);
    window.setTimeout(() => setNotice(false), 1800);
  };

  const finalBossesOpen = Boolean(isTeacher) || FINAL_BOSSES_STUDENT_ACCESS;
  const modules: Module[] = [
    { id: "01", name: "WriteLine Playground", subtitle: "Make C# talk.", glyph: <Braces size={28} />, state: "available", onClick: onOpenWriteLine },
    { id: "02", name: "Memory Machine", subtitle: "Discover how programs remember.", glyph: <Database size={28} />, state: "featured", onClick: onOpenMemoryMachine },
    { id: "03", name: "STOP", subtitle: "Basic String Formatting", glyph: "Aa", state: "available", onClick: onOpenStop },
    { id: "04", name: "Wordle", subtitle: "Basic Operations", glyph: "◇", state: "locked" },
    { id: "05", name: "Final Bosses", subtitle: "Build the formula.", glyph: "?", state: finalBossesOpen ? "available" : "locked", onClick: onOpenFinalBosses },
  ];

  const renderCard = (module: Module) => {
    const available = module.state !== "locked";
    const featured = module.state === "featured";
    return (
      <button
        className={`module-card ${featured ? "featured-module" : available ? "available-module" : "locked-module"}`}
        key={module.id}
        onClick={available ? module.onClick : locked}
        aria-disabled={!available}
      >
        {featured && <span className="module-callout" aria-hidden="true" />}
        {featured && <span className="module-light" aria-hidden="true" />}
        <span className="module-topline">
          <span>MODULE {module.id}</span>
          {available ? <span className="available"><i /> AVAILABLE</span> : <LockKeyhole size={13} />}
        </span>
        <span className={`module-glyph ${featured ? "featured-glyph" : ""}`}>{module.glyph}</span>
        <span className="module-content">
          <strong>{module.name}</strong>
          <small>{module.subtitle}</small>
        </span>
        {available ? <span className="module-open">OPEN <ArrowUpRight size={13} /></span> : <span className="coming-soon">COMING SOON</span>}
      </button>
    );
  };

  return (
    <section className="hub screen-enter" aria-labelledby="hub-title">
      <header className="hub-header">
        <Brand compact />
        <div className="hub-tools">
          {isTeacher && (
            <button className="icon-text-button" onClick={onOpenTeacher}>
              <LayoutDashboard size={15} /> <span>PAINEL</span>
            </button>
          )}
          <div className="hub-student">
            <span>ACTIVE STUDENT</span>
            <strong>{name}</strong>
          </div>
          <button className="icon-text-button logout-button" onClick={onSignOut}>
            <LogOut size={15} /> <span>LOG OUT</span>
          </button>
        </div>
      </header>

      <div className="hub-copy">
        <p>READY, {name.toUpperCase()}?</p>
        <h1 id="hub-title">Choose an experiment.</h1>
      </div>

      <div className="module-grid">
        <div className="module-row">{modules.slice(0, 2).map(renderCard)}</div>
        <div className="module-row module-row-bottom">{modules.slice(2).map(renderCard)}</div>
      </div>

      <div className={`toast ${notice ? "toast-visible" : ""}`} role="status">
        NOT READY YET <span>— STAY CURIOUS.</span>
      </div>
    </section>
  );
}
