import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Brand } from "../components/Brand";

type NameGateProps = {
  onEnter: (name: string) => void;
};

export function NameGate({ onEnter }: NameGateProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 24);
    if (cleanName) onEnter(cleanName);
  };

  return (
    <section className="name-gate screen-enter" aria-labelledby="name-title">
      <div className="name-orbit" aria-hidden="true">
        <span />
      </div>
      <div className="name-panel">
        <div className="signal-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <Brand />
        <p className="intro-line">MAKE C# DO SOMETHING.</p>

        <form onSubmit={submit} className="name-form">
          <label id="name-title" htmlFor="student-name">
            WHO ARE YOU?
          </label>
          <div className="name-input-wrap">
            <input
              ref={inputRef}
              id="student-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              maxLength={24}
              placeholder="YOUR NAME"
              aria-describedby="name-note"
            />
            <span className="input-cursor" aria-hidden="true" />
          </div>
          <button className="enter-button" type="submit" disabled={!name.trim()}>
            ENTER <ArrowRight size={18} strokeWidth={2} />
          </button>
          <p id="name-note" className="session-note">
            NO ACCOUNT. JUST THIS SESSION.
          </p>
        </form>
      </div>
    </section>
  );
}
