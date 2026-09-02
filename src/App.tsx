import { lazy, Suspense, useState } from "react";
import { session } from "./lib/session";
import type { Screen } from "./types";
import { Hub } from "./views/Hub";
import { NameGate } from "./views/NameGate";

const WriteLinePlayground = lazy(() =>
  import("./views/WriteLinePlayground").then((module) => ({ default: module.WriteLinePlayground })),
);

export default function App() {
  const storedName = session.getName();
  const [name, setName] = useState(storedName);
  const [screen, setScreen] = useState<Screen>(storedName ? "hub" : "name");

  const enter = (studentName: string) => {
    session.setName(studentName);
    setName(studentName);
    setScreen("hub");
  };

  return (
    <main className="app-shell">
      <div className="ambient-light" aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />
      {screen === "name" && <NameGate onEnter={enter} />}
      {screen === "hub" && <Hub name={name} onOpen={() => setScreen("writeline")} />}
      {screen === "writeline" && (
        <Suspense fallback={<ModuleLoader />}>
          <WriteLinePlayground name={name} onBack={() => setScreen("hub")} />
        </Suspense>
      )}
    </main>
  );
}

function ModuleLoader() {
  return (
    <div className="module-loader" role="status">
      <div className="signal-mark" aria-hidden="true"><i /><i /><i /></div>
      <strong>SHARPIE</strong>
      <span>OPENING C# PLAYGROUND...</span>
    </div>
  );
}
