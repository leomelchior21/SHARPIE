import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { csharpEditorExtensions } from "./csharpSyntax";

describe("shared C# syntax colors", () => {
  let view: EditorView | null = null;

  afterEach(() => {
    view?.destroy();
    view = null;
  });

  it("marks Console.WriteLine and Console.Write as cyan commands", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    view = new EditorView({
      parent,
      doc: 'Console.WriteLine("hello");\nConsole.Write("world");',
      extensions: csharpEditorExtensions,
    });

    const commands = [...parent.querySelectorAll<HTMLElement>(".cm-console-method")];
    expect(commands.map((node) => node.textContent)).toEqual([
      "Console.WriteLine",
      "Console.Write",
    ]);
    for (const command of commands) {
      expect(getComputedStyle(command).color).toBe("rgb(98, 230, 255)");
      for (const nestedToken of command.querySelectorAll<HTMLElement>("*")) {
        expect(getComputedStyle(nestedToken).color).toBe("rgb(98, 230, 255)");
      }
    }
    parent.remove();
  });
});
