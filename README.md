# CRACK THE ETHICS CODE 💀 Brainrot Edition

A projector-friendly, host-operated classroom game show for a 10–15 minute ethics activity on plagiarism and intellectual property. Five groups, six rounds, one laptop. No backend, no accounts, no internet needed once installed.

Built with React, Vite, TypeScript, Tailwind CSS, Framer Motion and Lucide icons. Sound effects are synthesized in the browser with the Web Audio API, and fonts (Space Grotesk, VT323) are bundled locally.

## Setup

Requires Node.js 20 or newer.

```bash
npm install        # install dependencies (needs internet once)
npm run dev        # start the game at http://localhost:5173
```

For class, a production build is smoother:

```bash
npm run build      # type-check and build into dist/
npm run preview    # serve the build at http://localhost:4173
```

Other commands:

```bash
npm test           # run the logic and UI test suites
npm run typecheck  # TypeScript only
```

Open the page in Chrome or Edge, press **F11** for full screen, and set the projector to 1920×1080 or 1366×768.

## How a round works

1. **Representatives.** Pick one member per group (the next person in the rotation is marked NEXT, people who already played are crossed out). Use *Fill with next in rotation* to do it in one click, or *Skip names*.
2. **Round intro.** Shows the round, the topic, the representatives and the scoring rule. Press *Enter the arena* (or Enter).
3. **Arena.** Start the 10-second timer. If nobody knows, reveal the clue: correct answers are now worth +1 instead of +2.
4. **Judge.** Press ✓ or ✕ for each group. Each group can be judged once per question.
5. **Reveal the answer.** The correct option lights up and the explanation appears.
6. **Steal (optional).** *Enable steal* opens a steal window; award +1 to any group that didn't already get it right.
7. **Next round.** Round 6 is the Final Boss. After it, check the table, lock the scores, and the winner is revealed. Ties offer a sudden-death question or co-champions.

### Scoring

| Result | Points |
| --- | --- |
| Correct, no clue | +2 |
| Correct, after the clue | +1 |
| Incorrect | 0 |
| Steal (only when the steal window is open) | +1 (configurable) |

The ✓ button awards whatever the question is worth *at the moment you press it*, so judge groups who answered before the clue first. Revealing the clue never deducts points, and revealing it twice does nothing.

Final-boss double points (+4 / +2) is off by default. Turn it on in **Settings**; the round intro then shows **DOUBLE POINTS** before the round begins.

### Fixing mistakes

- **Undo** (`U` or `Ctrl+Z`) reverses the last score change exactly, including its ✓/✕ judgement, so that group can be judged again.
- **Fix scores** lets you add/remove a point or set an exact score for any group. Corrections are logged and undoable.
- **Previous round** returns to an earlier question with its judgements intact.
- After the winner is revealed, **Unlock scores** returns to round 6 for corrections.

### Keyboard shortcuts (arena)

| Key | Action |
| --- | --- |
| `Space` | Start / pause timer |
| `R` | Reset timer |
| `C` | Reveal clue |
| `A` | Reveal answer |
| `1`–`5` | Mark group correct (in on-screen order) |
| `Shift` + `1`–`5` | Mark group incorrect |
| `S` | Open / close steal window |
| `U` / `Ctrl+Z` | Undo |
| `L` | Leaderboard |
| `N` / `P` | Next / previous round |
| `M` | Mute / unmute (any screen) |
| `Esc` | Close any panel |

## Customising

Everything below saves automatically in the browser (local storage) and survives a refresh.

### Questions

Lobby → **Edit questions**. Each of the six questions (plus a tiebreaker) has a topic, question text, four options, a correct-answer selector, a clue and an explanation. Empty fields are flagged. **Restore sample questions** puts the built-in samples back.

The included questions are editable samples about plagiarism and IP, not a copy of any lecturer's slides. Replace them with your official six before class.

To change the samples in code, edit `src/game/defaults.ts`.

### Team names and members

Lobby → **Teams & settings** → *Teams and members*. Rename groups and list members one per line; the representative rotation uses these names. The competing groups are Group 1, 3, 4, 5 and 6 (Group 2 isn't competing).

### Scoring rules and other settings

**Teams & settings** also has:

- Sound on/off and master volume (also the speaker button in the top bar, or `M`)
- Seconds per question (default 10)
- Allow steals, and points per steal
- Final-boss double points
- Motion: follow system, full chaos, or reduced (the game also respects the OS *reduce motion* setting)
- Skip the boot intro
- **Erase all saved data** (factory reset)

The base point values (+2 / +1) are constants in `src/game/logic.ts` (`BASE_POINTS`, `CLUE_POINTS`).

## Reliability notes

- The timer is computed from timestamps, so it can't drift. Pausing freezes it, and changing rounds stops and resets it.
- Refreshing mid-game restores everything. A running timer comes back paused.
- Restarting, playing again and erasing data all ask for confirmation first.
- Corrupted or missing saved data falls back to defaults instead of crashing.
- With sound disabled or unavailable, everything still works.

## Project structure

```
src/
  game/                 pure game logic, no UI
    types.ts            state model
    defaults.ts         sample questions, teams, settings
    logic.ts            scoring, ranking, rotation, winner rules
    reducer.ts          every state transition (scoring, undo, timer, rounds)
    storage.ts          local storage load/save with validation
    sound.ts            Web Audio synthesized effects
    copy.ts             meme reaction text
    GameContext.tsx     React provider: reducer, persistence, timer heartbeat
    reducer.test.ts     logic tests
  components/           screens and UI
    Lobby, Intro, RepSelection, RoundIntro, Arena, Finale (finalize, winner, tiebreaker),
    Leaderboard, Timer, Reaction, Panels (settings, fix scores, score log, guide),
    QuestionEditor, Background, ui (modal, confirm dialog)
  App.tsx               screen routing, top bar, overlays
  App.test.tsx          end-to-end UI test of a full six-round game
```
