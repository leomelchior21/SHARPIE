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

  return (code) => {
    messages.length = 0;
    handler({ data: { requestId: "test", code } });
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
});
