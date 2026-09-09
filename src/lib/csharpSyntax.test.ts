import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { csharpEditorBasicSetup, csharpEditorExtensions } from "./csharpSyntax";

describe("shared C# syntax colors", () => {
  let view: EditorView | null = null;

  afterEach(() => {
    view?.destroy();
    view = null;
  });

  it("keeps the full editing toolset enabled in every shared editor", () => {
    expect(csharpEditorBasicSetup).toMatchObject({
      history: true,
      foldGutter: true,
      allowMultipleSelections: true,
      indentOnInput: true,
      bracketMatching: true,
      closeBrackets: true,
      autocompletion: true,
      rectangularSelection: true,
      highlightSelectionMatches: true,
      searchKeymap: true,
      foldKeymap: true,
      completionKeymap: true,
    });
  });

  it("marks Console.WriteLine, Console.Write, and Console.ReadLine as cyan commands", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    view = new EditorView({
      parent,
      doc: 'Console.WriteLine("hello");\nConsole.Write("world");\nstring name = Console.ReadLine();',
      extensions: csharpEditorExtensions,
    });

    const commands = [...parent.querySelectorAll<HTMLElement>(".cm-console-method")];
    expect(commands.map((node) => node.textContent)).toEqual([
      "Console.WriteLine",
      "Console.Write",
      "Console.ReadLine",
    ]);
    for (const command of commands) {
      expect(getComputedStyle(command).color).toBe("rgb(98, 230, 255)");
      for (const nestedToken of command.querySelectorAll<HTMLElement>("*")) {
        expect(getComputedStyle(nestedToken).color).toBe("rgb(98, 230, 255)");
      }
    }
    parent.remove();
  });

  it("shows a writing prompt on an instructed empty line until the student types", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    view = new EditorView({
      parent,
      doc: "// Create a string variable.\n\nConsole.WriteLine(message);",
      extensions: csharpEditorExtensions,
    });

    const prompt = parent.querySelector<HTMLElement>(".cm-writing-prompt");
    expect(prompt).not.toBeNull();
    expect(prompt?.closest(".cm-line")?.textContent).toBe("");

    const emptyLine = view.state.doc.line(2);
    view.dispatch({
      changes: { from: emptyLine.from, insert: 'string message = "Hello";' },
    });

    expect(parent.querySelector(".cm-writing-prompt")).toBeNull();
    parent.remove();
  });

  it("shows a writing prompt after the final instruction line", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    view = new EditorView({
      parent,
      doc: "// Create a variable.\n// Print the variable.\n",
      extensions: csharpEditorExtensions,
    });

    const prompt = parent.querySelector<HTMLElement>(".cm-writing-prompt");
    expect(prompt).not.toBeNull();
    expect(prompt?.closest(".cm-line")).toBe(parent.querySelectorAll(".cm-line")[2]);
    parent.remove();
  });
});
