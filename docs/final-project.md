# Final project

Open **Final project** on the module screen, or `/final-project` after signing in. This is a separate module from Final Bosses. Existing modules retain their routes and content.

## Classroom sequence

Each stage is designed for one 45-minute class. All content is in English.

Each Live Flow opens with a brief scenario introduction and a large green Start button. The school grade changes by 0.25 per tap, stays saved at that precision, and uses `double` in the generated C# code.

1. **BACKROOMS RUN**: a found-footage runner through the yellow pseudo-3D Backrooms. Every gate shows real C# in a code panel. The game opens on a tape library: six short tapes, then **The Deep** (Endless), which unlocks once all six are cleared.

   | Tape | Focus | What the student does |
   | --- | --- | --- |
   | 01 Lights On | `>` `<` | Edit `int energy` until the condition is TRUE (live TRUE/FALSE). |
   | 02 The Edge | `>=` `<=` | Same, with gates built around the boundary value. |
   | 03 Exactly | `==` `!=` | Same, including `!=` gates that start on the forbidden value. |
   | 04 Two Doors | all comparisons | Values are given. Steer into the TRUE or FALSE door. Three of six gates sit exactly on the edge. |
   | 05 True or False | `bool` | Toggle a bool (`hasKey`, `lightsOn == false`, …) or pick a door. |
   | 06 Double Lock | `&&` | Both sides must be TRUE; editable gates hide their TRUE/FALSE light. |

   Each run has three camcorder batteries. Only a logic mistake costs one: a closed gate, the wrong door, or stopping on the centre pillar. The run freezes on the mistake and shows the substituted evaluation (`40 > 40 → false`, `true && false → false`) with a one-line rule. Walls and chairs never end a run; they slow the student down and break the combo. Stars: three for no mistakes, two for one, one for two. The Deep mixes every gate type, hides every live result, speeds up each gate and returns one battery every 10 gates; the 670-gate champion title is kept.

   Guided pauses (make it TRUE, steer, two doors, bool, `&&`) appear only until that tape has been cleared once, so returning students go straight to play; saves from the original game with 5+ gates also skip the first tutorial. The menu's Field Notes tab shows right/wrong counts per operator, `bool` and `&&`. Controls: ↑/↓ or W/S energy, ←/→ or A/D steer, T toggles the bool, Space or Escape pauses, Enter continues. On iPad the left thumb edits values and the right thumb steers. Switching tabs, losing focus or Pause pauses the game. Atmosphere: VHS overlay (REC, timecode, grain, tracking glitches), flickering fluorescents from tape 03, blackouts that switch the camera to green NIGHTSHOT, a figure seen at the end of the corridor only in failing light, and optional synthesized hum, footsteps, doors and stingers (off by default, remembered per device). Reduced motion disables flicker, glitches, grain and shake.
2. **IF / ELSE LAB**: three animated Live Flows, ten tap-to-place builders, and the exact twenty-question knowledge check. The builder validates all values in each scenario's input domain, accepting behaviorally equivalent inverted conditions with swapped branches. Successful programs execute in Sharpie's existing worker. Quiz feedback advances automatically unless “Keep feedback on screen” is selected. Saved results can be reviewed and practiced again.
3. **SHADOW FEED / OPERATION WHITE HAT**: observe and repair three fictional ECHO policies, then respond to the final executive directive. Every mission requires observing the broken behavior before editing. Both input branches are checked through the worker. No real social accounts, APIs, bot detection, or external platform interactions exist.

Backrooms and IF / ELSE are available immediately. The first IF / ELSE visit opens Live Flow. Explore both paths to advance through its three examples; the final example opens the quiz introduction: "Let's start". Returning to the stage cards and reopening IF / ELSE shows three title-only cards: Live Flow, Code Builder and Quiz. A single Back button replaces activity navigation and scenario tabs. Flowchart connections fill toward each next node on the selected branch. The shared header is 44 pixels tall. Stage 3 unlocks after both paths in all three Live Flows and builder challenges 1-3. The other seven challenges and the full quiz are optional practice; their completion does not block the third class.

## Saves and preview

Follows Sharpie's Basic Operations pattern: versioned, profile-scoped localStorage. Key: `sharpie:final-project:v1:<encoded student login>`. This module has no cloud-sync table; progress stays in the current browser/profile. No new authentication is introduced. Best runs, XP milestones, selected activity, flow paths/values, builder drafts, quiz answers/attempt counts, audit patches and reflection are persisted. Interrupted runs restart safely while best runs remain saved. Storage errors show an in-app notice.

Backrooms scores 10 XP per gate read right, 15 from a three-gate combo and 20 from six, plus 10 XP per star when a tape is cleared; the best single-run XP is saved. Module XP uses that personal best, 20 per cleared tape, 10 per flow path/quiz question, 30 per builder, and 50 per audit policy. Replays do not duplicate module XP. Existing saves retain the XP earned from the retired Boolean Check; resuming that retired activity now opens the C# connection. Tape stars, Field Notes counts, best Endless gate count, total gates, best run XP and operators are saved per profile. Stage 1 shows COMPLETE after all six tapes (or three gates in an older save). The Deep's leaderboard shows scores from this Sharpie installation, using `sharpie.backroom-scores.v1`; teacher previews do not write scores, and teachers can open every tape.

**Teacher preview** is available to the authenticated teacher through the eye button. It opens all three stages in separate in-memory progress; exiting restores the saved student state. Students see only Back in the shared header and cannot enable preview through a URL parameter.

The White Hat Audit Report includes the existing profile name, rules, results, completion and a short saved reflection. **Export image** downloads a standalone SVG. **Print / Save as PDF** uses the browser print dialog. Print styles omit navigation and include the reflection.

## Adaptation sources (read-only)

Studied these sibling PixPy files; Sharpie neither imports nor loads them:

- `src/lib/backroomEngine.ts`, `backroomLighting.ts`, `backroomScores.ts`, `experiences/conditions/BackroomRun.tsx`, `backroomRenderer.ts`, `BackroomChampion.tsx`, and their styles: copied into `src/views/finalproject/backroom/`. The full game, renderer, course, lighting and achievements run locally inside Sharpie. `MatrixRun.tsx` is now only an adapter for Sharpie's profile/progress/navigation. Original classroom cloud-score calls are replaced with Sharpie's own local score store; no PixPy service or files are loaded at runtime. The bundled Pixel Operator Bold font and its license are copied beside the game. The game has since been redesigned inside Sharpie (tapes, fork doors, batteries, mistake explanations, Field Notes, found-footage effects and synthesized audio); the corridor planner, lighting cycle and local score store still follow the PixPy originals.
- `experiences/conditions/ChoiceMachine.tsx`, `choiceMachine.css`: shared scenario-driven flow, staged line/path highlighting, two-path completion, code-left/answers-right quiz, locked answer feedback and XP.
- `experiences/conditions/IfElseBuilder.tsx`, `ifElseBuilder.css`, `lib/ifElseLearning.ts`, `data/ifElseBuilder.ts`: numbered challenges, mission visual, selected slots, piece placement/removal, input controller, graduated hints, behavior checks, and replay.
- `experiences/conditions/ConditionsActivity.tsx`: concise explanations and immediate response to an answer.

The lab uses the supplied dark blue/purple reference direction, and Shadow Feed uses muted investigative panels. At the user's request, Stage 1 keeps the yellow PixPy Backrooms corridor; green is used for TRUE, primary actions and the NIGHTSHOT camera. The Final project homepage card remains green.

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
