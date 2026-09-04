import { useState } from "react";
import { ArrowUpRight, Braces, Database, LockKeyhole } from "lucide-react";
import { Brand } from "../components/Brand";

type HubProps = {
  name: string;
  onOpenWriteLine: () => void;
  onOpenMemoryMachine: () => void;
};

const futureModules = [
  { id: "02", glyph: "▣", name: "Memory Machine", subtitle: "Restore Data from Variables" },
  { id: "03", glyph: "Aa", name: "STOP", subtitle: "Basic String Formatting" },
  { id: "04", glyph: "◇", name: "Wordle", subtitle: "Basic Operations" },
  { id: "05", glyph: "?", name: "Final Boss", subtitle: "Secret Challenge" },
];

export function Hub({ name, onOpenWriteLine, onOpenMemoryMachine }: HubProps) {
  const [notice, setNotice] = useState(false);

  const locked = () => {
    setNotice(true);
    window.setTimeout(() => setNotice(false), 1800);
  };

  return (
    <section className="hub screen-enter" aria-labelledby="hub-title">
      <header className="hub-header">
        <Brand compact />
        <div className="hub-student">
          <span>ACTIVE STUDENT</span>
          <strong>{name}</strong>
        </div>
      </header>

      <div className="hub-copy">
        <p>READY, {name.toUpperCase()}?</p>
        <h1 id="hub-title">Choose an experiment.</h1>
      </div>

      <div className="module-grid">
        <button className="module-card active-module" onClick={onOpenWriteLine}>
          <span className="module-callout" aria-hidden="true" />
          <span className="module-light" aria-hidden="true" />
          <span className="module-topline">
            <span>MODULE 01</span>
            <span className="available"><i /> AVAILABLE</span>
          </span>
          <span className="module-glyph active-glyph"><Braces size={34} /></span>
          <span className="module-content">
            <strong>WriteLine<br />Playground</strong>
            <small>Make C# talk.</small>
          </span>
          <span className="module-enter">ENTER MODULE <ArrowUpRight size={19} /></span>
        </button>

        <div className="future-grid">
          <button className="module-card future-module available-module" onClick={onOpenMemoryMachine}>
            <span className="module-light" aria-hidden="true" />
            <span className="module-topline">
              <span>MODULE 02</span>
              <span className="available"><i /> AVAILABLE</span>
            </span>
            <span className="module-glyph active-glyph"><Database size={21} /></span>
            <span className="module-content">
              <strong>Memory Machine</strong>
              <small>Discover how programs remember.</small>
            </span>
            <span className="coming-soon module-open">OPEN <ArrowUpRight size={13} /></span>
          </button>
          {futureModules.filter((module) => module.id !== "02").map((module) => (
            <button
              className="module-card future-module"
              key={module.id}
              onClick={locked}
              aria-disabled="true"
            >
              <span className="module-topline">
                <span>MODULE {module.id}</span>
                <LockKeyhole size={13} />
              </span>
              <span className="module-glyph">{module.glyph}</span>
              <span className="module-content">
                <strong>{module.name}</strong>
                <small>{module.subtitle}</small>
              </span>
              <span className="coming-soon">COMING SOON</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`toast ${notice ? "toast-visible" : ""}`} role="status">
        NOT READY YET <span>— STAY CURIOUS.</span>
      </div>
    </section>
  );
}
