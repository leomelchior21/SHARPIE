import { describe, expect, it } from "vitest";
import { buildStopBoard } from "./stopBoard";

const sheet = (...lines: string[]) => buildStopBoard(lines.join("\n"));

describe("buildStopBoard", () => {
  it("creates one column per labeled variable printed with concatenation", () => {
    const board = sheet(
      'string name = "Ana";',
      'string city = "Aveiro";',
      'Console.WriteLine("Name: " + name);',
      'Console.WriteLine("City: " + city);',
    );

    expect(board.columns.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: "NAME", value: "Ana" },
      { label: "CITY", value: "Aveiro" },
    ]);
    expect(board.pending).toEqual([]);
  });

  it("does not create a column when the variable is printed without a label", () => {
    const board = sheet('string name = "Ana";', "Console.WriteLine(name);");
    expect(board.columns).toHaveLength(0);
    expect(board.unlabeled).toEqual(["name"]);
  });

  it("does not create a column for plain text WriteLines", () => {
    const board = sheet('Console.WriteLine("Bom dia!");');
    expect(board.columns).toHaveLength(0);
    expect(board.unlabeled).toEqual([]);
    expect(board.missing).toEqual([]);
  });

  it("reports declared strings that are not on the sheet yet", () => {
    const board = sheet('string name = "Ana";');
    expect(board.pending).toEqual(["name"]);
  });

  it("reports variables that are used before they are declared", () => {
    const board = sheet('Console.WriteLine("City: " + city);');
    expect(board.missing).toEqual(["city"]);
    expect(board.columns).toHaveLength(0);
  });

  it("keeps the value the program had when the WriteLine ran", () => {
    const board = sheet(
      'string city = "Aveiro";',
      'Console.WriteLine("City: " + city);',
      'city = "Braga";',
    );
    expect(board.columns[0].value).toBe("Aveiro");
  });

  it("follows a reassignment that happens before the print", () => {
    const board = sheet(
      'string city = "Aveiro";',
      'city = "Braga";',
      'Console.WriteLine("City: " + city);',
    );
    expect(board.columns[0].value).toBe("Braga");
  });

  it("reuses the same variable for several columns after reassignment", () => {
    const board = sheet(
      'string answer = "Ana";',
      'Console.WriteLine("Name: " + answer);',
      'answer = "Aveiro";',
      'Console.WriteLine("City: " + answer);',
    );
    expect(board.columns.map(({ label, value, source }) => ({ label, value, source }))).toEqual([
      { label: "NAME", value: "Ana", source: "answer" },
      { label: "CITY", value: "Aveiro", source: "answer" },
    ]);
  });

  it("updates a category when the same label is printed again", () => {
    const board = sheet(
      'string answer1 = "Ana";',
      'string answer2 = "Aveiro";',
      'Console.WriteLine("Name: " + answer1);',
      'Console.WriteLine("Name: " + answer2);',
    );
    expect(board.columns).toHaveLength(1);
    expect(board.columns[0].value).toBe("Aveiro");
  });

  it("marks columns whose value is built from two variables", () => {
    const board = sheet(
      'string first = "Ana";',
      'string last = "Silva";',
      'string fullName = first + " " + last;',
      'Console.WriteLine("Full name: " + fullName);',
    );
    expect(board.columns[0]).toMatchObject({ label: "FULL NAME", value: "Ana Silva", built: true });
  });

  it("keys one card per category label so a variable can fill many categories", () => {
    const board = sheet(
      '// string old = "Zulu";',
      'string city = "Braga";',
      'Console.WriteLine("City: " + city);',
      'Console.WriteLine("Extra: " + city + "!");',
    );
    expect(board.columns.map((column) => column.label)).toEqual(["CITY", "EXTRA"]);
    expect(board.columns[1]).toMatchObject({ value: "Braga!", built: true });
  });
});
