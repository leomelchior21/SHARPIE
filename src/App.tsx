import { lazy, Suspense, useEffect, useState } from "react";
import { session } from "./lib/session";
import type { Screen } from "./types";
import { Hub } from "./views/Hub";
import { NameGate } from "./views/NameGate";

const WriteLinePlayground = lazy(() =>
  import("./views/WriteLinePlayground").then((module) => ({ default: module.WriteLinePlayground })),
);

const MemoryMachineHub = lazy(() =>
  import("./views/MemoryMachineHub").then((module) => ({ default: module.MemoryMachineHub })),
);
const MemoryMachineExperience = lazy(() =>
  import("./views/MemoryMachineExperience").then((module) => ({ default: module.MemoryMachineExperience })),
);
const VariableRun = lazy(() =>
  import("./views/VariableRun").then((module) => ({ default: module.VariableRun })),
);

function screenFromPath(): Screen {
  if (typeof window === "undefined") return "hub";
  if (window.location.pathname === "/memory-machine/experience") return "memory-experience";
  if (window.location.pathname === "/memory-machine/variable-run") return "variable-run";
  if (window.location.pathname === "/memory-machine") return "memory-hub";
  if (window.location.pathname === "/writeline") return "writeline";
  return "hub";
}

const paths: Partial<Record<Screen, string>> = {
  hub: "/",
  writeline: "/writeline",
  "memory-hub": "/memory-machine",
  "memory-experience": "/memory-machine/experience",
  "variable-run": "/memory-machine/variable-run",
};

export default function App() {
  const storedName = session.getName();
  const [name, setName] = useState(storedName);
  const [screen, setScreen] = useState<Screen>(storedName ? screenFromPath() : "name");

  const navigate = (next: Screen, replace = false) => {
    const path = paths[next];
    if (path && typeof window !== "undefined") {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setScreen(next);
  };

  const enter = (studentName: string) => {
    session.setName(studentName);
    setName(studentName);
    navigate(screenFromPath(), true);
  };

  useEffect(() => {
    const restorePath = () => setScreen(session.getName() ? screenFromPath() : "name");
    window.addEventListener("popstate", restorePath);
    return () => window.removeEventListener("popstate", restorePath);
  }, []);

  return (
    <main className="app-shell">
      <div className="ambient-light" aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />
      {screen === "name" && <NameGate onEnter={enter} />}
      {screen === "hub" && (
        <Hub
          name={name}
          onOpenWriteLine={() => navigate("writeline")}
          onOpenMemoryMachine={() => navigate("memory-hub")}
        />
      )}
      {screen === "writeline" && (
        <Suspense fallback={<ModuleLoader />}>
          <WriteLinePlayground name={name} onBack={() => navigate("hub")} />
        </Suspense>
      )}
      {screen === "memory-hub" && (
        <Suspense fallback={<ModuleLoader />}>
          <MemoryMachineHub
            name={name}
            onBack={() => navigate("hub")}
            onOpenExperience={() => navigate("memory-experience")}
            onOpenVariableRun={() => navigate("variable-run")}
          />
        </Suspense>
      )}
      {screen === "memory-experience" && (
        <Suspense fallback={<ModuleLoader />}>
          <MemoryMachineExperience
            initialName={name}
            onBack={() => navigate("memory-hub")}
            onComplete={() => navigate("memory-hub")}
          />
        </Suspense>
      )}
      {screen === "variable-run" && (
        <Suspense fallback={<ModuleLoader />}>
          <VariableRun onBack={() => navigate("memory-hub")} onFinish={() => navigate("hub")} />
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
