# Final project

Open **Final project** on the module screen, or `/final-project` after signing in. This is a separate module from Final Bosses. Existing modules retain their routes and content.

## Classroom sequence

Each stage is designed for one 45-minute class. All content is in English.

Each Live Flow opens with a brief scenario introduction and a large green Start button. The school grade changes by 0.25 per tap, stays saved at that precision, and uses `double` in the generated C# code.

1. **BACKROOMS RUN**: a found-footage runner through a real-time 3D Backrooms (WebGL via three.js, loaded only when the game opens; devices without WebGL fall back to the original 2D renderer). Every gate shows real C# in a code panel. While the student walks the corridor, the next gate's values and condition stay masked (`int energy = ▒▒;`, `if (▒▒▒▒)`); they load with a flash only when the gate approach begins, so each gate is read and solved on the spot. The game opens on a tape library: six short tapes, then **The Deep** (Endless), which unlocks once all six are cleared. The library shows each tape as a labelled Hi8 cassette. Tapes open one at a time: after a clear, BACK TO THE SHELF returns to the library, where the newly opened tape waits with a NEW sticker; the teacher preview (eye button) opens every tape. Choosing a tape plays a 3D tape change rendered with three.js in its own lazily loaded chunk: the chosen cassette slides out of a wooden tape rack and arcs across the table into a brushed-silver Hi8 camcorder, which opens its door; the cassette with its handwritten label and spinning reels slides in, the door latches, the LED turns green and the camera dives into the lens onto a VHS-blue PLAY screen and static, then the tape loads: spinning reels, a block progress bar with a percentage, the level being built step by step (reading the tape, building the corridor, charging the batteries, opening Level 0) and one example to remember from that tape (about 7.5 seconds in all, with synthesized mechanism sounds when sound is on). SKIP, Enter, Space or Escape skip it; reduced motion shows only PLAY; without WebGL a flat cassette plays the same timeline. RETRY TAPE rewinds instead (◀◀ REW, about 1.3 seconds). During a run the screen reads as the camcorder's flip-out LCD: rounded bezel, RGB pixel grid and glare, ▶ PLAY then REC, an SP badge, a W–T zoom bar that follows the pace and a date stamp.

   | Tape | Focus | What the student does |
   | --- | --- | --- |
   | 01 Lights On | `>` `<` | Edit `int energy` until the condition is TRUE (live TRUE/FALSE). |
   | 02 The Edge | `>=` `<=` | Same, with gates built around the boundary value. |
   | 03 Exactly | `==` `!=` | Same, including `!=` gates that start on the forbidden value. |
   | 04 Two Doors | all comparisons | Values are given. Steer into the TRUE or FALSE door. Three of six gates sit exactly on the edge. |
   | 05 No Light | all comparisons | Set energy with no TRUE/FALSE light: work the condition out. |
   | 06 Final Cut | doors + edges | Set gates and door pairs mixed, many right on the edge, no light. |

   Level 0 is dark: most fluorescents are dead and the camcorder's video light does the lighting. Its three batteries set the beam: full charge throws a long bright beam, two a dimmer one, one a short flickering one. Only a logic mistake costs a battery: a closed gate, the wrong door, or stopping on the centre pillar. The run freezes on the mistake and shows the substituted evaluation (`40 > 40 → false`, `true && false → false`) with a one-line rule. At zero batteries the camera switches off: no LCD and no OSD, only a narrow patch of near-dark vision, with the gate lights, the hazard lamps and spare batteries still glowing. A spare battery (a white pack with green LEDs on the carpet) waits in the corridor whenever the camera is missing charge, and always when it is dead; walking over it adds a battery and turns the camera back on. A gate missed with the camera already off ends the run. Touching a wall, a chair, a bin or a barrier, or falling into a hole, ends the run on the spot (SIGNAL LOST, saying what was hit); a fall drops the camera down the shaft first. From tape 02 on, jumps fill up to two straights per corridor: caution barriers, giant saws that slide out of one wall with a whine and cover that half of the corridor (dodge to the other side; jumping does not help), and from tape 03 holes that go down forever. Tapes cycle through every hazard they allow; The Deep mixes them at random. Space or the JUMP button clears them; over a hole the runner must stay in the air the whole way. Every run, and every retry, starts behind the door into Level 0, which swings open before the run begins. Every gate raises the pace, inside tapes as well as in The Deep; the camera displays the pace relative to the run's opening speed. Stars: three for no mistakes, two for one, one for two. The Backrooms teach comparisons only: energy gates to set and door pairs to choose (the engine still understands `bool` and `&&`, but no tape or Deep gate uses them, and Field Notes list the six operators). The Deep mixes set gates and door pairs, hides every live result and speeds up each gate; spare batteries appear on the floor like in the tapes; the 670-gate champion title is kept.

   Guided pauses (make it TRUE, steer, jump, two doors) appear once per student: each is saved as soon as it has been shown, so losing a tape and pressing RETRY TAPE restarts that tape immediately, without the briefing or the guides already seen. Saves from the original game with 5+ gates also skip the first tutorial. The menu's Field Notes tab shows right/wrong counts per operator, `bool` and `&&`. Controls: ↑/↓ or W/S energy, ←/→ or A/D steer, Space jumps, T toggles the bool, Escape or P pauses, Enter continues. On iPad the left thumb edits values and the right thumb steers. Switching tabs, losing focus or Pause pauses the game. Look and feel: procedurally textured wallpaper, damp carpet and drop ceilings with normal maps; fluorescent troffers that cast real light and flicker from tape 03; steel gates with LED strips, LED signs, sliding doors and roll-up shutters that colour the corridor TRUE green or FALSE red; hanging turn signs, office chairs, bins, barriers and drifting dust. Post-processing adds bloom and a camcorder pass (grading, chromatic aberration, grain, VHS tracking glitches). Blackouts switch to NIGHTSHOT with an infrared lamp, and a figure appears at the end of the corridor only in failing light. Resolution adapts to hold the frame rate on tablets. Optional synthesized hum, footsteps, doors, jumps and stingers are off by default and remembered per device. Reduced motion disables flicker, glitches, head bob, grain and shake.
2. **IF / ELSE LAB**: the student is the newest developer at Sharpie Studio, writing two-path rules for clients across Port Sharpie (a school, a cinema, a delivery app, a smart fan, a phone OS, an escape room, a game studio and the ECHO feed that leads into Shadow Feed). Each client has a live app preview (report card, ticket, checkout, fan, battery, keypad door, game HUD, social posts) that reacts to the input and to what the program prints.
   Students skim, so every lab screen leads with one **coach line**: the steps of the task (for example SET INPUT · PREDICT · WATCH) and, in large type, the one thing to do now, including whether the last prediction was right. The control to use next pulses. Ticket texts highlight their numbers ("**12 and under**", "**exactly 30**").
   - **Live Flow** (3 tickets): a three-step intro (pick a value, guess TRUE or FALSE, watch), then predict before every run and watch a token travel the flowchart while the code highlights the executing line and dims the skipped branch. "Try the edge" buttons offer the values just below, at and above the boundary. Both paths must be explored; the last ticket continues to the quiz.
   - **Quiz** (twenty questions, same answer key) in four rounds of five: Warm-up (comparisons), True or false (`bool` and `if`), Two paths (`if` / `else`), On the edge (boundaries and the feed). The code opens in an editor window; the four colored answer tiles deal in after a short pause so the code is read first. A right answer shows +10 XP and a streak and moves on after two seconds; a wrong one shakes, explains why and waits for NEXT. After each round a checkpoint shows the five results and the XP earned. Results show a score ring, twenty tiles to practise and the way on to the Code Builder.
   - **Code Builder** (10 tickets): the student builds the whole five-line program (variable, `if` test, IF action, `else`, ELSE action; C# draws the braces) by tapping lines from a code bank in order. Tapping a placed line sends it back. Support fades ticket by ticket, adapted from the Python IF / ELSE builder:

     | Ticket | Skill | Support |
     | --- | --- | --- |
     | 01 Movie night | Observe the structure | Bank in program order, slots labelled |
     | 02 Free delivery | Order the structure | Shuffled bank, no labels |
     | 03 Too hot? | Pick the right pieces | Two wrong comparisons in the bank |
     | 04 Low battery | Predict, then build | Predict the output before the bank opens |
     | 05 Secret door | Choose the operator | Four lines given; pick from six comparisons |
     | 06 Game over | Complete the structure | Only `else` is missing, among distractors |
     | 07 Going viral | Debug the condition | Runs a broken program first, then fixes line 2 |
     | 08 Sponsored content | Debug the outputs | Swapped messages, unlocked after a first run |
     | 09 Needs verification | Build with less help | Only the variable and `else` given |
     | 10 Hidden report | Find the unfair line | Three lines unlock after a run; the student finds HIDE |

     A spec table lists the boundary test cases; RUN TESTS first names a line that is out of place, then checks every input in the domain, marks each row pass or fail with the student's actual output and runs the program in Sharpie's worker. Equivalent programs pass. The preview shows the student's code live.
   The lab home lists the stations in order (Live Flow, Quiz, Code Builder) and marks the next one NEXT UP.
   Every lab screen fits the viewport on tablets and laptops without scrolling; phones scroll. C# operators always render as typed (`>=`, `!=`), never as ligatures.
3. **SHADOW FEED / OPERATION WHITE HAT**: observe and repair three fictional ECHO policies, then respond to the final executive directive. Every mission requires observing the broken behavior before editing. Both input branches are checked through the worker. No real social accounts, APIs, bot detection, or external platform interactions exist.

Backrooms and IF / ELSE are available immediately. The first IF / ELSE visit opens Live Flow; later visits open the lab home with its three stations in order, the next one highlighted, progress bars and the Shadow Feed unlock checklist. Inside the lab, Back returns to the lab home. The Backrooms stage card shows a frame rendered by the 3D game. The shared header is 44 pixels tall. Stage 3 unlocks after both paths in all three Live Flows and builder challenges 1-3. The quiz and the other seven challenges are part of the lab sequence but do not block the third class.

## Saves and preview

Follows Sharpie's Basic Operations pattern: versioned, profile-scoped localStorage. Key: `sharpie:final-project:v1:<encoded student login>`. The full save stays in the browser. A compact summary (tape stars, The Deep best, Live Flows, quiz answered/right and missed question numbers, builder tickets shipped, Shadow Feed policies, report status, reflection and XP) is mirrored to `sharpie_progress.codes.finalProject` about a second after each change and once when the module opens, the same way Mathler mirrors its steps, so no new table or SQL is needed. The teacher dashboard shows it as a FINAL column (B tapes · L lab stations finished · S policies), a Module 08 detail panel and extra CSV columns. Teacher accounts and previews never sync. No new authentication is introduced. Best runs, XP milestones, selected activity, flow paths/values, builder drafts, quiz answers/attempt counts, audit patches and reflection are persisted. Interrupted runs restart safely while best runs remain saved. Storage errors show an in-app notice.

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
