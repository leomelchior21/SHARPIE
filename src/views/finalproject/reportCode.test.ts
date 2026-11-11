import { describe, expect, it } from "vitest";
import { parseFinalProjectSync } from "../../lib/finalProjectSync";
import { freshProgress, levelProgram, shippedPrograms, syncSummary } from "./progress";
import { afterTicket, freshShop, repairSummary, sanitizeShop } from "./repair/logic";
import { mergeRepair } from "./repair/remote";
import { ifLine, levels, printLine } from "./switchyard/levels";

// The code students make in the Switchyard and the Repair Shop final round travels to the teacher's PDF report.

const robotCode = 'if (battery >= 20)\n{\n    Console.WriteLine("Ready");\n}\nelse\n{\n    Console.WriteLine("Low");\n}';

describe("Code for the teacher's report", () => {
  it("prints a shipped Switchyard level as C#, with the variable line first", () => {
    const first = levels[0];
    const p = { ...freshProgress(), yardShipped: [0], yardDrafts: { [first.id]: ["decl", ifLine(first.condition), printLine(first.yes), "else", printLine(first.no)] } };
    const code = levelProgram(0, p);
    expect(code.split("\n")[0]).toBe(`int ${levels[0].variable} = ?;`);
    expect(code).toContain(`if (${levels[0].condition})`);
    expect(code).toContain("else");
    expect(shippedPrograms(p)).toEqual({ "1": code });
  });

  it("keeps a typed level as the student wrote it", () => {
    const index = levels.findIndex((level) => level.tool === "write");
    const level = levels[index];
    const typed = `if (${level.variable} >= 1) { Console.WriteLine("A"); } else { Console.WriteLine("B"); }`;
    const p = { ...freshProgress(), yardShipped: [index], yardDrafts: { [level.id]: [typed] } };
    expect(levelProgram(index, p)).toBe(`int ${level.variable} = ?;\n\n${typed}`);
    expect(syncSummary(p).yardCodes).toEqual({ [String(index + 1)]: `int ${level.variable} = ?;\n\n${typed}` });
  });

  it("saves the Robot's hand-written program with the paid ticket, and keeps it through later tickets", () => {
    const fixed = afterTicket(freshShop(), 20, "robot", robotCode);
    expect(fixed.finalCode).toBe(robotCode);
    expect(afterTicket(fixed, 5, "arcade").finalCode).toBe(robotCode);
    expect(repairSummary(fixed).repairCode).toBe(robotCode);
    expect(sanitizeShop(JSON.parse(JSON.stringify(fixed))).finalCode).toBe(robotCode);
    // Saves from before the code was kept still load.
    expect(sanitizeShop({ coins: 3 }).finalCode).toBe("");
  });

  it("brings the final round back on a new tablet, without replacing one already there", () => {
    expect(mergeRepair(freshShop(), [], 0, robotCode).finalCode).toBe(robotCode);
    const here = { ...freshShop(), finalCode: "mine" };
    expect(mergeRepair(here, [], 0, robotCode)).toBe(here);
  });

  it("reads the code back from the dashboard copy, dropping anything that is not a level's program", () => {
    const parsed = parseFinalProjectSync({ yardCodes: { "1": "int a = ?;", "0": "x", "99": "y", "2": 5, "3": "  " }, repairCode: robotCode });
    expect(parsed?.yardCodes).toEqual({ "1": "int a = ?;" });
    expect(parsed?.repairCode).toBe(robotCode);
    expect(parseFinalProjectSync({})?.yardCodes).toEqual({});
  });
});
