# SHARPIE

SHARPIE is a classroom-first C# basics playground: write a small statement, run it, and see the result without project files, namespaces, accounts, or setup.

## What is included

- A session-only name gate—no account or database.
- A five-module cartridge hub, with only WriteLine Playground active.
- Eight progressive C# basics activities in one consistent workspace, with automatic completion feedback and progression.
- A CodeMirror editor with C# highlighting, line numbers, diagnostics, and `Ctrl/Cmd + Enter`.
- A designed output surface, progressive hints, reset confirmation, and session completion.
- An instant browser-based C# basics runner with no server dependency.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The entire application—including RUN—works from this one static site. There is no Docker service, .NET installation, API, database, or account.

## C# basics runner

The first SHARPIE module intentionally supports the syntax it teaches:

- `Console.Write(...)` and `Console.WriteLine(...)`;
- `string`, `int`, `double`, `bool`, `char`, and `var` variables;
- assignment, `++`, `--`, and compound assignment;
- arithmetic, comparison, equality, and boolean operators;
- string concatenation and `$"{value}"` interpolation;
- parentheses and standard arithmetic precedence;
- line and block comments.

Execution happens in a browser Web Worker. The worker has no DOM access, the site policy blocks remote connections, output is capped at 16 KB, source is capped at 12 KB, and a stalled worker is terminated. Familiar compiler codes such as `CS1002`, `CS1010`, `CS1026`, and `CS0103` are retained for the concepts taught here.

This is a focused C# subset, not a general-purpose C# compiler. Unsupported language features receive a clear message instead of being silently misinterpreted.

## Deployment

Every push to `main` triggers the GitHub Pages workflow in `.github/workflows/deploy-pages.yml`. The production site is designed to be served from:

[https://leomelchior21.github.io/SHARPIE/](https://leomelchior21.github.io/SHARPIE/)

## Verification

```bash
npm test
npm run build
npm audit
```
