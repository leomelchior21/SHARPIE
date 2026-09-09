import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import { tags } from "@lezer/highlight";
import { Decoration, EditorView, MatchDecorator, ViewPlugin } from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";

export const csharpPalette = {
  type: "#e5b567",
  variable: "#e87d7d",
  string: "#b4d273",
  number: "#e5b567",
  command: "#62e6ff",
  comment: "#7a8499",
} as const;

const csharpHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.typeName, tags.definitionKeyword], color: csharpPalette.type },
  { tag: [tags.variableName, tags.propertyName, tags.definition(tags.variableName)], color: csharpPalette.variable },
  { tag: [tags.string, tags.special(tags.string)], color: csharpPalette.string },
  { tag: [tags.number, tags.bool, tags.null], color: csharpPalette.number },
  { tag: [tags.lineComment, tags.blockComment], color: csharpPalette.comment, fontStyle: "italic" },
]);

const consoleMethodMatcher = new MatchDecorator({
  regexp: /\bConsole\s*\.\s*Write(?:Line)?\b/g,
  decoration: Decoration.mark({ class: "cm-console-method" }),
});

export const consoleMethodHighlight = ViewPlugin.fromClass(class {
  decorations;

  constructor(view: EditorView) {
    this.decorations = consoleMethodMatcher.createDeco(view);
  }

  update(update: ViewUpdate) {
    this.decorations = consoleMethodMatcher.updateDeco(update, this.decorations);
  }
}, {
  decorations: (value) => value.decorations,
});

const consoleMethodTheme = EditorView.baseTheme({
  ".cm-console-method, .cm-console-method *": {
    color: `${csharpPalette.command} !important`,
    fontWeight: "600",
  },
});

export const csharpEditorExtensions = [
  StreamLanguage.define(csharp),
  syntaxHighlighting(csharpHighlightStyle),
  consoleMethodHighlight,
  consoleMethodTheme,
];
