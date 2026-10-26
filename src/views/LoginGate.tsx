import { ArrowRight, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Brand } from "../components/Brand";
import { findStudent, normalizeLogin } from "../data/roster";
import { supabase } from "../lib/supabase";
import { TEACHER_LOGIN, loginToEmail } from "../lib/supabaseConfig";

type LoginGateProps = {
  onAuthenticated: (session: { login: string; name: string; isTeacher: boolean }) => void;
  onGuest?: () => void;
};

async function trySignIn(login: string): Promise<boolean> {
  if (!supabase) return false;
  const credentials = { email: loginToEmail(login), password: login };
  const attempt = async () => {
    const { error } = await supabase!.auth.signInWithPassword(credentials);
    return !error;
  };
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 6000));
  try {
    return await Promise.race([attempt(), timeout]);
  } catch {
    return false;
  }
}

export function LoginGate({ onAuthenticated, onGuest }: LoginGateProps) {
  const [loginInput, setLoginInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const login = normalizeLogin(loginInput);
  const isTeacherLogin = login === TEACHER_LOGIN;

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (!login) {
      setError("Type your first and last name.");
      return;
    }
    // Students are matched against the class roster on this device, with no
    // server sign-in, so entering never depends on Supabase Auth. Only the
    // teacher signs in, to read the whole class.
    if (!isTeacherLogin) {
      const student = findStudent(login);
      if (!student) {
        setError("That name is not on the class list. Type your first and last name together, like joaosilva.");
        return;
      }
      onAuthenticated({ login: student.login, name: student.name, isTeacher: false });
      return;
    }

    setBusy(true);
    setError(null);
    const signedIn = await trySignIn(login);
    setBusy(false);

    if (!signedIn) {
      setError("Could not sign in as the teacher.");
      return;
    }

    onAuthenticated({ login, name: "Professor", isTeacher: true });
  };

  return (
    <section className="name-gate screen-enter" aria-labelledby="login-title">
      <div className="name-orbit" aria-hidden="true">
        <span />
      </div>
      <div className="name-panel login-panel">
        <div className="signal-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <Brand />
        <p className="intro-line">CLASS ACCESS · 9A 9B 9C 9D</p>

        <form onSubmit={submit} className="name-form login-form">
          <label id="login-title" htmlFor="student-login">
            YOUR NAME
          </label>
          <div className="name-input-wrap">
            <input
              ref={inputRef}
              id="student-login"
              value={loginInput}
              onChange={(event) => setLoginInput(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={48}
              placeholder="joaosilva"
            />
          </div>

          <button className="enter-button login-submit" type="submit" disabled={busy || !loginInput.trim()}>
            {busy ? <>ENTERING <Loader2 size={18} className="spin" /></> : <>ENTER <ArrowRight size={18} strokeWidth={2} /></>}
          </button>

          <p className="session-note">
            {isTeacherLogin
              ? "TEACHER ACCESS."
              : "FIRST NAME + LAST NAME, TOGETHER. EX.: JOAOSILVA"}
          </p>
          {error && <p className="login-error" role="alert">{error}</p>}
          {onGuest && (
            <button className="login-guest" type="button" onClick={onGuest}>
              CONTINUE WITHOUT SAVING
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
