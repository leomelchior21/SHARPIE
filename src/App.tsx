import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { FINAL_BOSSES_ENABLED, FINAL_BOSSES_STUDENT_ACCESS } from "./data/finalBosses";
import { findStudent } from "./data/roster";
import { activeStudent } from "./lib/activeStudent";
import type { BossProgressState } from "./lib/bossProgress";
import { queueBossProgressSync } from "./lib/bossSync";
import { session } from "./lib/session";
import { supabase } from "./lib/supabase";
import { TEACHER_LOGIN, isSupabaseConfigured } from "./lib/supabaseConfig";
import type { Screen } from "./types";
import { Hub } from "./views/Hub";
import { LoginGate } from "./views/LoginGate";
import { NameGate } from "./views/NameGate";

const WriteLinePlayground = lazy(() =>
  import("./views/WriteLinePlayground").then((module) => ({ default: module.WriteLinePlayground })),
);

const StopPlayground = lazy(() =>
  import("./views/StopPlayground").then((module) => ({ default: module.StopPlayground })),
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
const VariableSprint = lazy(() =>
  import("./views/VariableSprint").then((module) => ({ default: module.VariableSprint })),
);
const BasicOperations = lazy(() =>
  import("./views/BasicOperations").then((module) => ({ default: module.BasicOperations })),
);
const FinalBosses = lazy(() =>
  import("./views/FinalBosses").then((module) => ({ default: module.FinalBosses })),
);
const TeacherDashboard = lazy(() =>
  import("./views/TeacherDashboard").then((module) => ({ default: module.TeacherDashboard })),
);
const TeacherLive = lazy(() =>
  import("./views/TeacherLive").then((module) => ({ default: module.TeacherLive })),
);

type AuthState = "checking" | "signed-out" | "student" | "teacher";

function screenFromPath(): Screen {
  if (typeof window === "undefined") return "hub";
  if (window.location.pathname === "/final-bosses") return "final-bosses";
  if (window.location.pathname === "/professor/live") return "teacher-live";
  if (window.location.pathname === "/professor") return "teacher";
  if (window.location.pathname === "/memory-machine/experience") return "memory-experience";
  if (window.location.pathname === "/memory-machine/variable-run") return "variable-run";
  if (window.location.pathname === "/memory-machine/variable-sprint") return "variable-sprint";
  if (window.location.pathname === "/memory-machine") return "memory-hub";
  if (window.location.pathname === "/writeline") return "writeline";
  if (window.location.pathname === "/stop") return "stop";
  if (window.location.pathname === "/mathler") return "mathler";
  return "hub";
}

const paths: Partial<Record<Screen, string>> = {
  hub: "/",
  writeline: "/writeline",
  stop: "/stop",
  mathler: "/mathler",
  "memory-hub": "/memory-machine",
  "memory-experience": "/memory-machine/experience",
  "variable-run": "/memory-machine/variable-run",
  "variable-sprint": "/memory-machine/variable-sprint",
  "final-bosses": "/final-bosses",
  teacher: "/professor",
  "teacher-live": "/professor/live",
};

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (isSupabaseConfigured) return "checking";
    return session.getName() ? "student" : "signed-out";
  });
  const [login, setLogin] = useState("");
  const [name, setName] = useState(() => session.getName());
  const [screen, setScreen] = useState<Screen>(() => (isSupabaseConfigured ? "hub" : session.getName() ? screenFromPath() : "name"));

  const navigate = (next: Screen, replace = false) => {
    const path = paths[next];
    if (path && typeof window !== "undefined") {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setScreen(next);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const stored = session.getName();
      setName(stored);
      setAuthState(stored ? "student" : "signed-out");
      setScreen(stored ? screenFromPath() : "name");
      return;
    }

    let active = true;
    const applySession = (userLogin: string) => {
      if (!active) return;
      const isTeacher = userLogin === TEACHER_LOGIN;
      const student = findStudent(userLogin);
      const displayName = isTeacher ? "Professor" : student?.name ?? userLogin;
      activeStudent.set({ login: userLogin, name: displayName, isTeacher });
      session.setName(displayName);
      setLogin(userLogin);
      setName(displayName);
      setAuthState(isTeacher ? "teacher" : "student");
      const restored = screenFromPath();
      const teacherOnly = restored === "teacher" || restored === "teacher-live";
      setScreen(isTeacher ? (restored === "hub" ? "teacher" : restored) : teacherOnly ? "hub" : restored);
    };

    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      if (!email) {
        if (active) {
          activeStudent.clear();
          setAuthState("signed-out");
          setScreen("name");
        }
        return;
      }
      applySession(email.split("@")[0]);
    }).catch(() => {
      if (active) {
        activeStudent.clear();
        setAuthState("signed-out");
        setScreen("name");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      const email = authSession?.user?.email;
      if (!email) {
        if (active) {
          activeStudent.clear();
          session.setName("");
          setLogin("");
          setName("");
          setAuthState("signed-out");
          setScreen("name");
        }
        return;
      }
      applySession(email.split("@")[0]);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const restorePath = () => setScreen(authState === "signed-out" || authState === "checking" ? "name" : screenFromPath());
    window.addEventListener("popstate", restorePath);
    return () => window.removeEventListener("popstate", restorePath);
  }, [authState]);

  const enter = (student: { login: string; name: string; isTeacher: boolean }) => {
    activeStudent.set({ login: student.login, name: student.name, isTeacher: student.isTeacher });
    session.setName(student.name);
    setLogin(student.login);
    setName(student.name);
    setAuthState(student.isTeacher ? "teacher" : "student");
    navigate(student.isTeacher ? "teacher" : "hub", true);
  };

  const enterLocal = (localName: string) => {
    activeStudent.set({ login: localName.toLowerCase(), name: localName, isTeacher: false });
    session.setName(localName);
    setName(localName);
    setAuthState("student");
    navigate(screenFromPath(), true);
  };

  const signOut = () => {
    activeStudent.clear();
    session.setName("");
    setLogin("");
    setName("");
    setAuthState("signed-out");
    navigate("name", true);
  };

  const syncProgress = useCallback((state: BossProgressState) => {
    if (!login) return;
    queueBossProgressSync(login, state);
  }, [login]);

  const authenticated = authState === "student" || authState === "teacher";
  const isTeacher = authState === "teacher";
  const fullAccess = isTeacher || login.toLowerCase() === TEACHER_LOGIN || name.toLowerCase() === TEACHER_LOGIN;
  const teacherOnly = screen === "teacher" || screen === "teacher-live";
  const finalBossesLocked = screen === "final-bosses" && (!FINAL_BOSSES_ENABLED || (!isTeacher && !FINAL_BOSSES_STUDENT_ACCESS));
  const activeScreen: Screen = teacherOnly && !isTeacher ? "hub" : finalBossesLocked ? "hub" : screen;

  return (
    <main className="app-shell">
      <div className="ambient-light" aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />
      {authState === "checking" && <ModuleLoader />}
      {authState === "signed-out" && (
        isSupabaseConfigured ? <LoginGate onAuthenticated={enter} /> : <NameGate onEnter={enterLocal} />
      )}
      {authenticated && (
        <>
          {activeScreen === "teacher" && (
            <Suspense fallback={<ModuleLoader />}>
              <TeacherDashboard
                onOpenModules={() => navigate("hub")}
                onOpenLive={() => navigate("teacher-live")}
                onSignOut={signOut}
              />
            </Suspense>
          )}
          {activeScreen === "teacher-live" && (
            <Suspense fallback={<ModuleLoader />}>
              <TeacherLive onBack={() => navigate("teacher")} />
            </Suspense>
          )}
          {activeScreen === "hub" && (
            <Hub
              name={name}
              isTeacher={isTeacher}
              onOpenTeacher={() => navigate("teacher")}
              onSignOut={signOut}
              onOpenWriteLine={() => navigate("writeline")}
              onOpenStop={() => navigate("stop")}
              onOpenMathler={() => navigate("mathler")}
              onOpenMemoryMachine={() => navigate("memory-hub")}
              onOpenFinalBosses={() => navigate("final-bosses")}
            />
          )}
          {activeScreen === "writeline" && (
            <Suspense fallback={<ModuleLoader />}>
              <WriteLinePlayground name={name} onBack={() => navigate("hub")} />
            </Suspense>
          )}
          {activeScreen === "stop" && (
            <Suspense fallback={<ModuleLoader />}>
              <StopPlayground name={name} onBack={() => navigate("hub")} />
            </Suspense>
          )}
          {activeScreen === "memory-hub" && (
            <Suspense fallback={<ModuleLoader />}>
              <MemoryMachineHub
                name={name}
                fullAccess={fullAccess}
                onBack={() => navigate("hub")}
                onOpenExperience={() => navigate("memory-experience")}
                onOpenVariableRun={() => navigate("variable-run")}
                onOpenVariableSprint={() => navigate("variable-sprint")}
              />
            </Suspense>
          )}
          {activeScreen === "memory-experience" && (
            <Suspense fallback={<ModuleLoader />}>
              <MemoryMachineExperience
                initialName={name}
                onBack={() => navigate("memory-hub")}
                onComplete={() => navigate("memory-hub")}
              />
            </Suspense>
          )}
          {activeScreen === "variable-run" && (
            <Suspense fallback={<ModuleLoader />}>
              <VariableRun fullAccess={fullAccess} onBack={() => navigate("memory-hub")} onFinish={() => navigate("memory-hub")} />
            </Suspense>
          )}
          {activeScreen === "variable-sprint" && (
            <Suspense fallback={<ModuleLoader />}>
              <VariableSprint fullAccess={fullAccess} onBack={() => navigate("memory-hub")} />
            </Suspense>
          )}
          {activeScreen === "mathler" && (
            <Suspense fallback={<ModuleLoader />}>
              <BasicOperations
                name={name}
                studentKey={login || name.toLowerCase()}
                onBack={() => navigate("hub")}
              />
            </Suspense>
          )}
          {activeScreen === "final-bosses" && (
            <Suspense fallback={<ModuleLoader />}>
              <FinalBosses
                onBack={() => navigate("hub")}
                fullAccess={fullAccess}
                studentLogin={authState === "student" ? login : undefined}
                onProgressChange={authState === "student" ? syncProgress : undefined}
              />
            </Suspense>
          )}
        </>
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
