import type { Input, Question } from "./content";
import { conditionResult } from "./logic";

// The lab's narrative: the student is the new developer at Sharpie Studio,
// writing decision rules for clients around Port Sharpie.
export type StoryId = "school" | "movie" | "viral" | "delivery" | "heat" | "battery" | "secret" | "health" | "sponsored" | "evidence" | "hidden";

export interface Story {
  client: string;
  role: string;
  org: string;
  initials: string;
  hue: string;
  app: string;
  ticket: string;
}

export const stories: Record<StoryId, Story> = {
  school: { client: "Ms. Rocha", role: "Coordinator", org: "Port Sharpie High", initials: "MR", hue: "#7c9bff", app: "Student portal", ticket: "Report cards go out tonight. A grade of 7 or more passes. Make sure every student sees the right message, especially the ones who got exactly 7." },
  movie: { client: "Theo Lima", role: "Manager", org: "Lumen Cinema", initials: "TL", hue: "#ffb547", app: "Ticket kiosk", ticket: "Kids aged 12 and under get the child discount. Everyone else pays the regular price. Last week the kiosk charged a 12-year-old full price." },
  viral: { client: "Trends team", role: "Product", org: "ECHO", initials: "EC", hue: "#ff6fb1", app: "ECHO feed", ticket: "Posts with more than 1000 views get a BOOST. Everything else stays NORMAL. Views only, nothing else is checked." },
  delivery: { client: "Ana Souza", role: "Founder", org: "Bolt Bites", initials: "AS", hue: "#ff7a59", app: "Checkout", ticket: "Orders of 100 or more ship free. Smaller orders pay the delivery fee." },
  heat: { client: "Breeze Labs", role: "Hardware team", org: "Breeze", initials: "BZ", hue: "#5fd3ff", app: "Smart fan", ticket: "Switch the fan on only above 30 degrees. At exactly 30 it stays off to save power." },
  battery: { client: "Kai Mendes", role: "OS engineer", org: "Pulse Phones", initials: "KM", hue: "#9dff6b", app: "Status bar", ticket: "Below 20 percent, warn the user: Low battery. At 20 or more, the battery is OK." },
  secret: { client: "Vault 42", role: "Escape room", org: "Vault 42", initials: "V4", hue: "#ffd166", app: "Door keypad", ticket: "Only the exact code 42 opens the final door. Every other number is denied." },
  health: { client: "Pixel Quest", role: "Game studio", org: "Pixel Quest", initials: "PQ", hue: "#ff5d73", app: "Game HUD", ticket: "When health reaches exactly 0, it is game over. With any health left, keep playing." },
  sponsored: { client: "Ads desk", role: "Compliance", org: "ECHO", initials: "EC", hue: "#ff6fb1", app: "ECHO ads", ticket: "Paid posts must say Sponsored. Someone swapped the labels in this rule. Fix both outputs." },
  evidence: { client: "Fact desk", role: "Editors", org: "ECHO", initials: "EC", hue: "#ff6fb1", app: "Claim checker", ticket: "A claim with no evidence goes to review. A claim with evidence says so. Having evidence is not proof that it is true." },
  hidden: { client: "Unsigned", role: "Request with no author", org: "ECHO", initials: "??", hue: "#9aa4b2", app: "Moderation", ticket: "This rule hides every report that mentions the investigation. That is not a fair policy. Replace HIDE with SHOW + REVIEW." },
};

export const storyFor = (id: string): Story => stories[(id in stories ? id : "school") as StoryId];

const comparison = /^(\w+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/;

// "grade >= 7" with grade = 6.75 reads "6.75 >= 7".
export function substitute(condition: string, variable: string, value: Input): string {
  const match = comparison.exec(condition);
  if (!match) return condition === variable ? String(value) : condition;
  return `${match[1] === variable ? String(value) : match[1]} ${match[2]} ${match[3]}`;
}

export function threshold(condition: string): number | null {
  const match = comparison.exec(condition);
  if (!match) return null;
  const value = Number(match[3]);
  return Number.isFinite(value) ? value : null;
}

// Inputs a tester should always try: just below, at and just above the edge.
export function boundaryCases(condition: string, initial: Input, step: number, min: number, max: number): Input[] {
  if (typeof initial === "boolean") return [true, false];
  const edge = threshold(condition);
  if (edge === null) return [initial];
  return [...new Set([edge - step, edge, edge + step].map((v) => Math.max(min, Math.min(max, Math.round(v / step) * step))))];
}

export type LineState = "run" | "skip" | "plain";

export interface CodeTrace {
  lines: LineState[];
  condition?: { code: string; result: boolean };
}

const declaration = /^(int|double|bool)\s+(\w+)\s*=\s*(.+);$/;

// Which lines of an if/else program run for its declared value.
export function traceProgram(code: string): CodeTrace {
  const lines = code.split("\n");
  const states: LineState[] = lines.map(() => "plain");
  let variable = "";
  let value: Input | null = null;
  lines.forEach((line, index) => {
    const match = declaration.exec(line.trim());
    if (match) {
      variable = match[2];
      value = match[3] === "true" ? true : match[3] === "false" ? false : Number(match[3]);
      states[index] = "run";
    }
  });
  const ifIndex = lines.findIndex((line) => line.trim().startsWith("if ("));
  if (ifIndex >= 0 && value !== null) {
    const condition = lines[ifIndex].trim().slice(4, -1);
    let result: boolean;
    try { result = conditionResult(condition, variable, value); } catch { return { lines: states }; }
    states[ifIndex] = "run";
    const blockEnd = (start: number) => { let end = start; while (end < lines.length && lines[end].trim() !== "}") end += 1; return end; };
    const ifEnd = blockEnd(ifIndex + 1);
    for (let index = ifIndex + 1; index <= ifEnd; index += 1) states[index] = result ? "run" : "skip";
    if (lines[ifEnd + 1]?.trim() === "else") {
      const elseEnd = blockEnd(ifEnd + 2);
      for (let index = ifEnd + 1; index <= elseEnd; index += 1) states[index] = result ? "skip" : "run";
    }
    return { lines: states, condition: { code: substitute(condition, variable, value), result } };
  }
  // Console.WriteLine(x < 5): the comparison itself is the output.
  const printed = lines.findIndex((line) => /Console\.WriteLine\(\w+\s*(>=|<=|==|!=|>|<)\s*\w+\)/.test(line));
  if (printed >= 0 && value !== null) {
    const inner = lines[printed].trim().slice("Console.WriteLine(".length, -2);
    try {
      const result = conditionResult(inner, variable, value);
      states[printed] = "run";
      return { lines: states, condition: { code: substitute(inner, variable, value), result } };
    } catch { return { lines: states }; }
  }
  return { lines: states };
}

export const questionTrace = (question: Question) => traceProgram(question.code);
