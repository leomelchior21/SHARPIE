const keys = {
  code: "sharpie:stop:v4:code",
} as const;

function available() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

export const stopSession = {
  getCode: () => (available() ? sessionStorage.getItem(keys.code) ?? "" : ""),
  setCode: (code: string) => available() && sessionStorage.setItem(keys.code, code),
};
