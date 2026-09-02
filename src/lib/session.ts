const keys = {
  name: "sharpie:name",
  challenge: "sharpie:challenge",
  completed: "sharpie:completed",
  codes: "sharpie:codes",
} as const;

function available() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

export const session = {
  getName: () => (available() ? sessionStorage.getItem(keys.name) ?? "" : ""),
  setName: (name: string) => available() && sessionStorage.setItem(keys.name, name),
  getChallenge: () => {
    const value = available() ? Number(sessionStorage.getItem(keys.challenge)) : 1;
    return value >= 1 && value <= 8 ? value : 1;
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
