const keys = {
  memoryMachineCompleted: "memoryMachineCompleted",
  variableRunUnlocked: "variableRunUnlocked",
  variableRunCompleted: "variableRunCompleted",
} as const;

function available() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function read(key: string) {
  return available() && window.localStorage.getItem(key) === "true";
}

export const memoryProgress = {
  isMemoryMachineCompleted: () => read(keys.memoryMachineCompleted),
  isVariableRunUnlocked: () => read(keys.variableRunUnlocked),
  isVariableRunCompleted: () => read(keys.variableRunCompleted),
  completeMemoryMachine: () => {
    if (!available()) return;
    window.localStorage.setItem(keys.memoryMachineCompleted, "true");
    window.localStorage.setItem(keys.variableRunUnlocked, "true");
  },
  completeVariableRun: () => {
    if (available()) window.localStorage.setItem(keys.variableRunCompleted, "true");
  },
};
