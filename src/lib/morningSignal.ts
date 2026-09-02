const acceptedSignals = new Set([
  'Console.WriteLine("Bom dia, chat!");',
  'Console.WriteLine("bom dia, chat!");',
]);

export function isMorningSignalCode(code: string) {
  const executableCode = code
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .trim();

  return acceptedSignals.has(executableCode);
}
