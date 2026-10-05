# SHARPIE

SHARPIE is a classroom-first C# basics playground: write a small statement, run it, and see the result without project files, namespaces, accounts, or setup.

## What is included

- Classroom sign-in and a five-module hub.
- WriteLine Playground, Memory Machine, STOP, Mathler, and Final Bosses (when unlocked).
- Five focused `Console.WriteLine` experiments plus three purple bonus activities, with clear feedback and student-controlled navigation.
- A CodeMirror editor with C# highlighting, line numbers, diagnostics, and `Ctrl/Cmd + Enter`.
- A designed output surface, progressive hints, reset confirmation, and session completion.
- An instant browser-based C# basics runner with no server dependency.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The site and C# runner work locally; classroom sign-in and shared rankings use Supabase.

## Mathler

Open `/mathler` after signing in. All three activities are available from the start: **Translate the Formulas**, **Warm Up**, and **Mathler Game**. Students first translate three randomized expressions for each operator (Addition, Subtraction, Multiplication and Division), then play five timed Rush rounds of four challenges each. Simpler rounds mix written tasks with math notation; mixed expressions retain their mathematical layout. A wrong answer or expired timer restarts only the current round, with new expressions. The guided Target warm up presents twelve randomized puzzles before Mathler Game's two modes: **Time Attack**, where students solve as many random targets as possible in 60 seconds, and **Survival**, where the first incorrect submission ends an unlimited run. Time Attack allows retries and automatically advances after a correct answer; Survival tracks the cleared streak and elapsed time.

Personal Time Attack and Survival records are saved in browser storage. The teacher dashboard tracks the three Mathler steps for every student through the shared `sharpie_progress` row, so it works with the base setup alone. To also enable both **Top Scorers** boards and the dedicated Mathler tracking table, apply the Mathler SQL with `npm run apply:sql` (needs `SUPABASE_ACCESS_TOKEN` in `.env`) or paste [`supabase/sharpie-mathler-survival.sql`](supabase/sharpie-mathler-survival.sql) into the Supabase SQL editor after `supabase/sharpie-setup.sql`. Rankings use the most puzzles solved in Time Attack and the longest correct streak in Survival.

## C# basics runner

The first SHARPIE module intentionally supports the syntax it teaches:

- `Console.Write(...)` and `Console.WriteLine(...)`;
- `Console.ReadLine()` with empty browser input;
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
