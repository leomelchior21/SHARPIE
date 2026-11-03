import { SyntaxLine } from "../../components/SyntaxLine";
import type { LineState } from "./labStories";

// Code with line numbers; lines can be marked as run, skipped or currently executing.
export function LabCode({ code, states, active = -1, label = "C#" }: { code: string; states?: LineState[]; active?: number; label?: string }) {
  return <pre className="lab-code" aria-label={`${label} program`}>
    {code.split("\n").map((line, index) => <span key={index} className={`lab-line is-${states?.[index] ?? "plain"} ${active === index ? "is-active" : ""}`}>
      <span className="lab-line-number" aria-hidden="true">{index + 1}</span>
      <code><SyntaxLine code={line} /></code>
    </span>)}
  </pre>;
}
