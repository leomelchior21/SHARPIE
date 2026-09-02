export type Screen = "name" | "hub" | "writeline";

export type RunnerError = {
  title: string;
  message: string;
  compiler: string;
  code?: string;
  line?: number;
  column?: number;
};

export type RunResult = {
  success: boolean;
  output: string;
  durationMs: number;
  truncated?: boolean;
  error?: RunnerError;
};

export type Challenge = {
  id: number;
  eyebrow: string;
  title: string;
  prompt: string;
  starterCode: (name: string) => string;
  hints: string[];
  isComplete: (output: string, name: string, code: string) => boolean;
};
