import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

function createRunner() {
  let handler;
  const messages = [];
  const sandbox = {
    performance,
    setTimeout(callback) { callback(); },
    self: {
      addEventListener(_name, callback) { handler = callback; },
      postMessage(message) { messages.push(message); },
    },
  };
  vm.runInNewContext(readFileSync("public/sharpie-runner.worker.js", "utf8"), sandbox);

  return (code, inputs = []) => {
    messages.length = 0;
    handler({ data: { requestId: "test", code, inputs } });
    return messages.find((message) => message.type === "response").result;
  };
}

describe("browser C# basics runner", () => {
  const run = createRunner();

  it("ignores activity comments and runs WriteLine normally", () => {
    const result = run('// Change the message below\nConsole.WriteLine("Bom dia, chat!");');
    expect(result).toMatchObject({ success: true, output: "Bom dia, chat!\n" });
  });

  it("supports Write, variables, operators, assignment, and C# value formatting", () => {
    const result = run(`
      string name = "Ada";
      int total = 2 + 3 * 4;
      total += 2;
      total--;
      bool ready = total == 15;
      Console.Write(name + ": ");
      Console.WriteLine(total);
      Console.WriteLine(ready);
    `);
    expect(result).toMatchObject({ success: true, output: "Ada: 15\nTrue\n" });
  });

  it("supports string interpolation with expressions", () => {
    const result = run('string name = "Ada"; Console.WriteLine($"{name} has {2 + 3} stars");');
    expect(result).toMatchObject({ success: true, output: "Ada has 5 stars\n" });
  });

  it("accepts Console.ReadLine in assignments, expressions, and standalone statements", () => {
    const result = run(`
      string name = Console.ReadLine();
      Console.ReadLine();
      Console.WriteLine("Hello " + name);
    `);
    expect(result).toMatchObject({ success: true, output: "Hello \n" });
  });

  it("reports the real ReadLine overload error instead of a lesson restriction", () => {
    const standalone = run('Console.ReadLine("hey");');
    const assignment = run('string name = Console.ReadLine("hey");');
    expect(standalone.error).toMatchObject({ code: "CS1501", title: "CHECK THE METHOD" });
    expect(assignment.error).toMatchObject({ code: "CS1501", title: "CHECK THE METHOD" });
  });

  it("uses compiler-style diagnostics for unsupported statements", () => {
    const result = run("return;");
    expect(result.error.code).toBe("CS1525");
    expect(result.error.title).toBe("CHECK THIS LINE");
  });

  it("accepts balanced parentheses and reserves CS1026 for a missing closing parenthesis", () => {
    expect(run('Console.WriteLine("(ready)");')).toMatchObject({ success: true, output: "(ready)\n" });
    expect(run("Console.WriteLine((2 + 3) * 4);")).toMatchObject({ success: true, output: "20\n" });
    expect(run('Console.WriteLine("ready") extra;').error.code).toBe("CS1003");
    expect(run('Console.WriteLine("ready";').error.code).toBe("CS1026");
  });

  it("returns a familiar diagnostic for a type mismatch", () => {
    const result = run('int age = "seven";');
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("CS0029");
  });

  it("feeds hidden inputs into double.Parse(Console.ReadLine()!)", () => {
    const code = `
      double a = double.Parse(Console.ReadLine()!);
      double b = double.Parse(Console.ReadLine()!);
      double result = a + b;
      Console.WriteLine(result);
    `;
    expect(run(code, ["8.5", "4"])).toMatchObject({ success: true, output: "12.5\n" });
    expect(run(code, ["8", "4"])).toMatchObject({ success: true, output: "12\n" });
  });

  it("accepts ReadLine without the null-forgiving operator and evaluates equivalent formulas", () => {
    const code = `
      double a = double.Parse(Console.ReadLine());
      double b = double.Parse(Console.ReadLine());
      double result = b + a;
      Console.WriteLine(result);
    `;
    expect(run(code, ["2.5", "3"])).toMatchObject({ success: true, output: "5.5\n" });
  });

  it("supports Math.Floor, Math.Sqrt, and the double remainder operator", () => {
    const time = `
      double seconds = double.Parse(Console.ReadLine()!);
      double minutes = Math.Floor(seconds / 60);
      double left = seconds % 60;
      Console.WriteLine(minutes);
      Console.WriteLine(left);
    `;
    expect(run(time, ["125"])).toMatchObject({ success: true, output: "2\n5\n" });
    expect(run(time, ["90"])).toMatchObject({ success: true, output: "1\n30\n" });

    const hypotenuse = `
      double a = double.Parse(Console.ReadLine()!);
      double b = double.Parse(Console.ReadLine()!);
      double c = Math.Sqrt(a * a + b * b);
      Console.WriteLine(c);
    `;
    expect(run(hypotenuse, ["3", "4"])).toMatchObject({ success: true, output: "5\n" });
    expect(run(hypotenuse, ["2", "3"])).toMatchObject({ success: true, output: "3.605551275463989\n" });
  });

  it("reports a friendly error when an input is not a number", () => {
    const code = 'double a = double.Parse(Console.ReadLine()!); Console.WriteLine(a);';
    const result = run(code, ["hello"]);
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("SHARP003");
  });

  it("reads hidden inputs through the ? placeholder", () => {
    const code = `
      double a = ?; // random number
      double b = ?; // random number
      double result = a + b;
      Console.WriteLine(result);
    `;
    expect(run(code, ["8.5", "4"])).toMatchObject({ success: true, output: "12.5\n" });
    expect(run(code, ["-2", "7"])).toMatchObject({ success: true, output: "5\n" });
  });

  it("keeps reading empty strings when no inputs are provided", () => {
    const code = 'string name = Console.ReadLine(); Console.WriteLine("Hello " + name);';
    expect(run(code)).toMatchObject({ success: true, output: "Hello \n" });
  });
});
