# Final project

Open **Final project** on the module screen, or `/final-project` after signing in. This is a separate module from Final Bosses. Existing modules retain their routes and content.

## Classroom sequence

Each stage is designed for one 45-minute class. All content is in English.

Each Live Flow opens with a brief scenario introduction and a large green Start button. The school grade changes by 0.25 per tap, stays saved at that precision, and uses `double` in the generated C# code. Backrooms shows comparator wording for gates 1-5; from gate 6 onward its readout shows only energy, the operator, and the threshold.

1. **BACKROOMS RUN**: the complete PixPy Backrooms game, copied into Sharpie with its yellow pseudo-3D environment, curved corridor planner, continuous steering, wall/chair/trash collisions, doors, accelerating pace, flickering lights, optional synthesized sound, hints, run summaries, local scoreboards, five-gate achievement and 670-gate champion reward. Energy is an integer from 0–100. Tap or hold the energy buttons; A/D and up/down also adjust it. Hold left/right to follow bends and avoid obstacles; Space or Escape pauses. Switching tabs, losing focus, or using Pause pauses the game. Reduced motion disables flickering and shake. Game-over screens return directly to the stages. Boolean Check and the game?s C# connection button have been removed. The compact readout shows both the operator and its meaning.
2. **IF / ELSE LAB**: three animated Live Flows, ten tap-to-place builders, and the exact twenty-question knowledge check. The builder validates all values in each scenario's input domain, accepting behaviorally equivalent inverted conditions with swapped branches. Successful programs execute in Sharpie's existing worker. Quiz feedback advances automatically unless “Keep feedback on screen” is selected. Saved results can be reviewed and practiced again.
3. **SHADOW FEED / OPERATION WHITE HAT**: observe and repair three fictional ECHO policies, then respond to the final executive directive. Every mission requires observing the broken behavior before editing. Both input branches are checked through the worker. No real social accounts, APIs, bot detection, or external platform interactions exist.

Backrooms and IF / ELSE are available immediately. The first IF / ELSE visit opens Live Flow. Explore both paths to advance through its three examples; the final example opens the quiz introduction: "Let's start". Returning to the stage cards and reopening IF / ELSE shows three title-only cards: Live Flow, Code Builder and Quiz. A single Back button replaces activity navigation and scenario tabs. Flowchart connections fill toward each next node on the selected branch. The shared header is 44 pixels tall. Stage 3 unlocks after both paths in all three Live Flows and builder challenges 1-3. The other seven challenges and the full quiz are optional practice; their completion does not block the third class.

## Saves and preview

Follows Sharpie's Basic Operations pattern: versioned, profile-scoped localStorage. Key: `sharpie:final-project:v1:<encoded student login>`. This module has no cloud-sync table; progress stays in the current browser/profile. No new authentication is introduced. Best runs, XP milestones, selected activity, flow paths/values, builder drafts, quiz answers/attempt counts, audit patches and reflection are persisted. Interrupted runs restart safely while best runs remain saved. Storage errors show an in-app notice.

The Backrooms game keeps PixPy's run scoring: 15 XP for an early solve, 10 for a late solve, and the highest run score is saved. Module XP uses that personal best, plus 10 per flow path/quiz question, 30 per builder, and 50 per audit policy. Replays do not duplicate module XP. Existing saves retain the XP earned from the retired Boolean Check; resuming that retired activity now opens the C# connection. Best gate count, total gates, best run XP and operators are saved per profile. Leaderboards show scores from this Sharpie installation, using `sharpie.backroom-scores.v1`; teacher previews do not write scores.

**Teacher preview** is available to the authenticated teacher through the eye button. It opens all three stages in separate in-memory progress; exiting restores the saved student state. Students see only Back in the shared header and cannot enable preview through a URL parameter.

The White Hat Audit Report includes the existing profile name, rules, results, completion and a short saved reflection. **Export image** downloads a standalone SVG. **Print / Save as PDF** uses the browser print dialog. Print styles omit navigation and include the reflection.

## Adaptation sources (read-only)

Studied these sibling PixPy files; Sharpie neither imports nor loads them:

- `src/lib/backroomEngine.ts`, `backroomLighting.ts`, `backroomScores.ts`, `experiences/conditions/BackroomRun.tsx`, `backroomRenderer.ts`, `BackroomChampion.tsx`, and their styles: copied into `src/views/finalproject/backroom/`. The full game, renderer, course, lighting and achievements run locally inside Sharpie. `MatrixRun.tsx` is now only an adapter for Sharpie's profile/progress/navigation. Original classroom cloud-score calls are replaced with Sharpie's own local score store; no PixPy service or files are loaded at runtime. The bundled Pixel Operator Bold font and its license are copied beside the game.
- `experiences/conditions/ChoiceMachine.tsx`, `choiceMachine.css`: shared scenario-driven flow, staged line/path highlighting, two-path completion, code-left/answers-right quiz, locked answer feedback and XP.
- `experiences/conditions/IfElseBuilder.tsx`, `ifElseBuilder.css`, `lib/ifElseLearning.ts`, `data/ifElseBuilder.ts`: numbered challenges, mission visual, selected slots, piece placement/removal, input controller, graduated hints, behavior checks, and replay.
- `experiences/conditions/ConditionsActivity.tsx`: concise explanations and immediate response to an answer.

The lab uses the supplied dark blue/purple reference direction, and Shadow Feed uses muted investigative panels. At the user's request, Stage 1 now uses the original PixPy Backrooms visuals. The Final project homepage card remains green.

## Implementation and validation

Scenario content, behavior, persistence, UI, and canvas rendering are separated under `src/views/finalproject/`. Existing `SyntaxLine` and `executeCSharp` are reused. `public/sharpie-runner.worker.js` adds a bounded block parser and typed IF/ELSE evaluation, including bool/int comparisons, string output and branch scope. It remains a classroom C# subset, not a complete C# compiler. No JavaScript `eval` is used.

Commands:

```text
npm run build
npm test -- --maxWorkers=2
npm run dev -- --host 127.0.0.1 --port 5186 --strictPort
node scripts/final-project-smoke.mjs
```

The browser check uses installed Edge/Chrome and Node's built-in CDP connection. Its dedicated profile and all artifacts stay inside Sharpie (`node_modules/.cache/final-project-browser`, `TestResults/final-project`). The dev-only fixture `scripts/final-project-preview.html` mounts the real module with a synthetic profile, never signs in or touches classroom accounts, and is not included in the Vite production build. Set `SHARPIE_QA_URL` to use another local development server.

Unit/integration checks cover the answer key against the actual worker, all scenario branches, equivalent programs, boundary mistakes, gate generation and speed, storage isolation/recovery, unlocks and duplicate XP. The browser check walks all flows/builders/questions/audit repairs, reloads saves, exports SVG/PDF, exercises true/false gates and retry/pause, and captures desktop, iPad, shorter iPad and phone layouts. Device emulation does not replace a physical iPad/Safari check.
