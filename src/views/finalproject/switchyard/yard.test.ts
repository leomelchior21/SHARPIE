import { describe, expect, it } from "vitest";
import { ifLine, levels, printLine } from "./levels";
import { buildYard, dialLine, domain, expected, firstWrong, provesEdge, readDial, readWritten, route, starsFor, swapStations, yardCode } from "./yard";

const solved = (condition: string, yes: string, no: string) => ["decl", ifLine(condition), printLine(yes), "else", printLine(no)];
const level = (id: string) => levels.find((item) => item.id === id)!;

describe("Switchyard levels", () => {
  it("can all be solved with the tools each level gives", () => {
    for (const item of levels) {
      expect(firstWrong(item, buildYard(solved(item.condition, item.yes, item.no))), item.title).toBeNull();
      expect(item.timetable).toContain(item.spotlight);
      if (item.tool === "blocks") solved(item.condition, item.yes, item.no).forEach((line, slot) => expect(item.given.includes(slot) ? item.preset[slot] : item.bank, item.title).toContain(line));
      if (item.tool === "ifs") expect(item.bank).toContain(ifLine(item.condition));
      if (item.tool === "dial") {
        const target = readDial(ifLine(item.condition))!;
        expect(item.ops, item.title).toContain(target.op);
        if (item.dialRange) expect(target.n).toBeGreaterThanOrEqual(item.dialRange[0]);
        else expect(readDial(item.preset[1])!.n).toBe(target.n);
      }
    }
  });

  it("start broken or unfinished, and the runs-first levels fail on their own timetable", () => {
    for (const item of levels.filter((entry) => entry.tool !== "write")) {
      const yard = buildYard(item.preset);
      expect(firstWrong(item, yard), item.title).not.toBeNull();
      // Running it as it is has to show something going wrong.
      if (item.runFirst) expect(item.timetable.some((value) => { const where = route(yard, item.variable, value); return where.stop !== "station" || where.output !== expected(item, value); }), item.title).toBe(true);
    }
    const ride = level("ride");
    expect(route(buildYard(ride.preset), ride.variable, 140)).toMatchObject({ side: "false", output: "Too short", steps: ["height > 140", "140 > 140", "false"] });
  });

  it("accept either way round on Two Ways Round, and every working bool test on Yes / No Cargo", () => {
    const arcade = level("arcade");
    const flipped = buildYard(swapStations(solved("health != 0", arcade.yes, arcade.no)));
    expect(firstWrong(arcade, flipped)).toBeNull();
    expect(firstWrong(arcade, buildYard(solved("health == 0", arcade.yes, arcade.no)))).toBeNull();
    const rain = level("rain");
    expect(firstWrong(rain, buildYard(solved("isRaining == true", rain.yes, rain.no)))).toBeNull();
    expect(firstWrong(rain, buildYard(solved("isRaining == false", rain.no, rain.yes)))).toBeNull();
    expect(firstWrong(rain, buildYard(solved("isRaining == false", rain.yes, rain.no)))).not.toBeNull();
    expect(domain(rain)).toEqual([true, false]);
  });
});

describe("The yard a program builds", () => {
  const fan = level("fan");
  it("routes each train, with the condition rewritten for it", () => {
    const yard = buildYard(solved("temperature > 30", "Fan on", "Fan off"));
    expect(route(yard, "temperature", 31)).toMatchObject({ side: "true", stop: "station", output: "Fan on", steps: ["temperature > 30", "31 > 30", "true"] });
    expect(route(yard, "temperature", 30)).toMatchObject({ side: "false", stop: "station", output: "Fan off" });
  });
  it("ends at a dead end without else, and leaves a gap where a line is missing or misplaced", () => {
    const deadEnd = buildYard(fan.preset);
    expect(deadEnd.fault).toBeNull();
    expect(route(deadEnd, "temperature", 29)).toMatchObject({ stop: "buffer", output: "" });
    expect(route(deadEnd, "temperature", 31)).toMatchObject({ stop: "station", output: "Fan on" });
    expect(route(buildYard(["decl", "", "", "", ""]), "temperature", 31)).toMatchObject({ stop: "gap", side: null, message: expect.stringMatching(/no switch/) });
    const swapped = buildYard(["decl", printLine("Fan on"), ifLine("temperature > 30"), "else", printLine("Fan off")]);
    expect(swapped.fault).toEqual({ slot: 1, message: expect.stringMatching(/Line 2 must be the switch/) });
    expect(buildYard(["decl", ifLine("temperature > 30"), printLine("Fan on"), "", printLine("Fan off")]).fault?.message).toMatch(/needs an else/);
    expect(route(buildYard(["decl", ifLine("temperature > 30"), printLine("Fan on"), ifLine("temperature < 30"), ""]), "temperature", 29)).toMatchObject({ side: "false", stop: "gap" });
  });
  it("jams on = instead of ==", () => {
    expect(route(buildYard(solved("code = 42", "Door opens", "Access denied")), "code", 42)).toMatchObject({ stop: "jam", message: expect.stringMatching(/= stores a value/) });
    expect(route(buildYard(solved("isRaining = true", "a", "b")), "isRaining", true).stop).toBe("jam");
  });
  it("writes the real C# program, with or without its else block", () => {
    expect(yardCode("temperature", 29, buildYard(fan.preset))).toBe('int temperature = 29;\n\nif (temperature > 30)\n{\n    Console.WriteLine("Fan on");\n}');
    expect(yardCode("isRaining", false, buildYard(solved("isRaining", "Umbrella", "Sunglasses")))).toContain("bool isRaining = false;");
  });
  it("reads and sets the sensor dial and swaps the stations", () => {
    expect(readDial("if (battery < 20)")).toEqual({ op: "<", n: 20 });
    expect(readDial("if (code = 42)")).toEqual({ op: "=", n: 42 });
    expect(dialLine("battery", ">=", 7)).toBe("if (battery >= 7)");
    expect(swapStations(["decl", "if (x)", "A", "else", "B"])).toEqual(["decl", "if (x)", "B", "else", "A"]);
  });
});

describe("The switch a student writes", () => {
  it("builds the yard step by step and says what comes next", () => {
    expect(readWritten("").next).toMatch(/Start with the switch/);
    expect(readWritten("if (water>=26)")).toMatchObject({ condition: "water >= 26", next: expect.stringMatching(/Open the TRUE block/) });
    expect(readWritten('if (water >= 26) {\n  Console.WriteLine("Pool open");')).toMatchObject({ yes: "Pool open", next: expect.stringMatching(/Close the TRUE block/) });
    expect(readWritten('if (water >= 26) { Console.WriteLine("Pool open"); }').next).toMatch(/Add else/);
    const full = readWritten('// my switch\nif (water >= 26)\n{\n    Console.WriteLine("Pool open");\n}\nelse\n{\n    Console.WriteLine("Too cold");\n}\n');
    expect(full).toMatchObject({ complete: true, condition: "water >= 26", yes: "Pool open", hasElse: true, no: "Too cold" });
    expect(firstWrong(level("pool"), full)).toBeNull();
    expect(readWritten('if (water >= 26) { Console.WriteLine("Pool open"); } else { Console.WriteLine("Too cold"); } x').complete).toBe(false);
  });
  it("only runs a timetable that tries below, at and above the edge", () => {
    expect(provesEdge(26, [10, 20, 30])).toMatch(/edge itself: 26/);
    expect(provesEdge(26, [26, 20, 27])).toMatch(/just below the edge: 25/);
    expect(provesEdge(26, [25, 26, 30])).toMatch(/just above the edge: 27/);
    expect(provesEdge(26, [27, 25, 26])).toBeNull();
  });
  it("gives three stars on the first run, two on the second, one after that", () => {
    expect([1, 2, 3, 7].map(starsFor)).toEqual([3, 2, 1, 1]);
  });
});
