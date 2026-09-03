const keys = {
  name: "sharpie:name",
  challenge: "sharpie:v4:challenge",
  completed: "sharpie:v4:completed",
  visited: "sharpie:v4:visited",
  codes: "sharpie:v4:codes",
} as const;

const MAX_CHALLENGE_ID = 8;

function available() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

export const session = {
  getName: () => (available() ? sessionStorage.getItem(keys.name) ?? "" : ""),
  setName: (name: string) => available() && sessionStorage.setItem(keys.name, name),
  getChallenge: () => {
    const value = available() ? Number(sessionStorage.getItem(keys.challenge)) : 1;
    return value >= 1 && value <= MAX_CHALLENGE_ID ? value : 1;
  },
  setChallenge: (id: number) => available() && sessionStorage.setItem(keys.challenge, String(id)),
  getCompleted: (): number[] => {
    if (!available()) return [];
    try {
      const value = JSON.parse(sessionStorage.getItem(keys.completed) ?? "[]");
      return Array.isArray(value) ? value.filter((id) => Number.isInteger(id)) : [];
    } catch {
      return [];
    }
  },
  setCompleted: (ids: number[]) =>
    available() && sessionStorage.setItem(keys.completed, JSON.stringify(ids)),
  getVisited: (): number[] => {
    if (!available()) return [];
    try {
      const value = JSON.parse(sessionStorage.getItem(keys.visited) ?? "[]");
      return Array.isArray(value) ? value.filter((id) => Number.isInteger(id)) : [];
    } catch {
      return [];
    }
  },
  setVisited: (ids: number[]) =>
    available() && sessionStorage.setItem(keys.visited, JSON.stringify(ids)),
  getCodes: (): Record<string, string> => {
    if (!available()) return {};
    try {
      const value = JSON.parse(sessionStorage.getItem(keys.codes) ?? "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  },
  setCode: (id: number, code: string) => {
    if (!available()) return;
    const codes = session.getCodes();
    codes[id] = code;
    sessionStorage.setItem(keys.codes, JSON.stringify(codes));
  },
};
