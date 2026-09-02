function executableLines(code: string) {
  return code
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"));
}

const exactStringWriteLine = /^Console\.WriteLine\("((?:\\.|[^"\\])+)"\);$/;

export function getIntroductionMessage(code: string, output: string) {
  const statements = executableLines(code);
  if (statements.length < 2 || !exactStringWriteLine.test(statements[1])) return null;

  const outputLines = output.replace(/\r/g, "").split("\n");
  return outputLines[1]?.trim() || null;
}

export function isFrameSignalCode(code: string) {
  const statements = executableLines(code).join("\n");
  const threeRowFrame = [
    'Console.WriteLine("#####");',
    'Console.WriteLine("#   #");',
    'Console.WriteLine("#####");',
  ].join("\n");
  const fourRowFrame = [
    'Console.WriteLine("#####");',
    'Console.WriteLine("#   #");',
    'Console.WriteLine("#   #");',
    'Console.WriteLine("#####");',
  ].join("\n");

  return statements === threeRowFrame || statements === fourRowFrame;
}

export function isGapFlightCode(code: string) {
  const statements = executableLines(code);
  return statements.length === 3 &&
    statements[0] === 'Console.WriteLine("TOP");' &&
    /^Console\.WriteLine\(" {1,5}"\);$/.test(statements[1]) &&
    statements[2] === 'Console.WriteLine("BOTTOM");';
}
