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
import { BrandHomeContext } from "./components/Brand";
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
const FinalProject = lazy(() => import("./views/finalproject/FinalProject").then((module) => ({ default: module.FinalProject })));
const TeacherDashboard = lazy(() =>
  import("./views/TeacherDashboard").then((module) => ({ default: module.TeacherDashboard })),
);
type AuthState = "checking" | "signed-out" | "student" | "teacher";

function screenFromPath(): Screen {
  if (typeof window === "undefined") return "hub";
  if (window.location.pathname === "/final-project") return "final-project";
  if (window.location.pathname === "/final-bosses") return "final-bosses";
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
  "final-project": "/final-project",
  teacher: "/professor",
};

const GUEST_NAME = "Guest";

function isTeacherPath() {
  return window.location.pathname.startsWith("/professor");
}

// Students enter with their roster login, without a Supabase account. The
// device remembers it so they only type it once.
const STUDENT_KEY = "sharpie:student";

const rememberedStudent = {
  get: () => {
    try {
      return findStudent(localStorage.getItem(STUDENT_KEY) ?? "") ?? null;
    } catch {
      return null;
    }
  },
  set: (login: string) => {
    try {
      localStorage.setItem(STUDENT_KEY, login);
    } catch {
      // Storage is optional; the student types their name again next time.
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(STUDENT_KEY);
    } catch {
      // Nothing to forget.
    }
  },
};

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() =>
    !isTeacherPath() && rememberedStudent.get() ? "student" : "signed-out",
  );
  const [login, setLogin] = useState(() => (isTeacherPath() ? "" : rememberedStudent.get()?.login ?? ""));
  const [name, setName] = useState(() => (isTeacherPath() ? "" : rememberedStudent.get()?.name) || session.getName() || GUEST_NAME);
  const [screen, setScreen] = useState<Screen>(() =>
    !isTeacherPath() && rememberedStudent.get() ? screenFromPath() : "name",
  );

  const navigate = (next: Screen, replace = false) => {
    const path = paths[next];
    if (path && typeof window !== "undefined") {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setScreen(next);
  };
  const goHome = () => navigate("hub");

  // Without a teacher session: the remembered student, or the name prompt.
  const enterStudent = () => {
    const student = isTeacherPath() ? null : rememberedStudent.get();
    if (!student) {
      activeStudent.clear();
      setLogin("");
      setAuthState("signed-out");
      setScreen("name");
      return;
    }
    activeStudent.set({ login: student.login, name: student.name, isTeacher: false });
    session.setName(student.name);
    setLogin(student.login);
    setName(student.name);
    setAuthState("student");
    setScreen(screenFromPath());
  };

  const enterGuest = () => {
    activeStudent.set({ login: "", name: GUEST_NAME, isTeacher: false });
    setLogin("");
    setName(GUEST_NAME);
    setAuthState("student");
    navigate(isTeacherPath() ? "hub" : screenFromPath(), true);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      enterStudent();
      return;
    }

    let active = true;
    // Only the teacher keeps a Supabase session; older student sessions are ignored.
    const applySession = (email: string | undefined) => {
      if (!active) return;
      if (email?.split("@")[0] !== TEACHER_LOGIN) {
        enterStudent();
        return;
      }
      activeStudent.set({ login: TEACHER_LOGIN, name: "Professor", isTeacher: true });
      session.setName("Professor");
      setLogin(TEACHER_LOGIN);
      setName("Professor");
      setAuthState("teacher");
      const restored = screenFromPath();
      setScreen(restored === "hub" ? "teacher" : restored);
    };

    enterStudent();
    supabase.auth.getSession().then(({ data }) => applySession(data.session?.user?.email)).catch(() => {
      if (active) enterStudent();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      applySession(authSession?.user?.email);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const restorePath = () => {
      setScreen(authState === "signed-out" || authState === "checking" ? "name" : screenFromPath());
    };
    window.addEventListener("popstate", restorePath);
    return () => window.removeEventListener("popstate", restorePath);
  }, [authState]);

  const enter = (student: { login: string; name: string; isTeacher: boolean }) => {
    if (!student.isTeacher) rememberedStudent.set(student.login);
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
    if (authState === "teacher") void supabase?.auth.signOut();
    rememberedStudent.clear();
    session.setName("");
    window.history.replaceState({}, "", "/");
    enterStudent();
  };

  const syncProgress = useCallback((state: BossProgressState) => {
    if (!login) return;
    queueBossProgressSync(login, state);
  }, [login]);

  const authenticated = authState === "student" || authState === "teacher";
  const isTeacher = authState === "teacher";
  const fullAccess = isTeacher || login.toLowerCase() === TEACHER_LOGIN || name.toLowerCase() === TEACHER_LOGIN;
  const teacherOnly = screen === "teacher";
  const finalBossesLocked = screen === "final-bosses" && (!FINAL_BOSSES_ENABLED || (!isTeacher && !FINAL_BOSSES_STUDENT_ACCESS));
  const activeScreen: Screen = teacherOnly && !isTeacher ? "hub" : finalBossesLocked ? "hub" : screen;

  return (
    <main className="app-shell">
      <div className="ambient-light" aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />
      {authState === "checking" && <ModuleLoader />}
      {authState === "signed-out" && (
        isSupabaseConfigured ? <LoginGate onAuthenticated={enter} onGuest={enterGuest} /> : <NameGate onEnter={enterLocal} />
      )}
      {authenticated && (
        <BrandHomeContext.Provider value={goHome}>
          {activeScreen === "teacher" && (
            <Suspense fallback={<ModuleLoader />}>
              <TeacherDashboard
                onOpenModules={() => navigate("hub")}
                onSignOut={signOut}
              />
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
              onOpenFinalProject={() => navigate("final-project")}
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
          {activeScreen === "final-project" && (
            <Suspense fallback={<ModuleLoader />}>
              <FinalProject key={login || name} name={name} studentKey={login || name.toLowerCase()} isTeacher={isTeacher} onBack={() => navigate("hub")} />
            </Suspense>
          )}
        </BrandHomeContext.Provider>
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
