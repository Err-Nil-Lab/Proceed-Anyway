# PROCEED ANYWAY — MVP Execution Plan

## 1. Planning baseline

### Assumptions

- Solo developer.
- Desktop browser only, using TypeScript, KAPLAY, and Vite.
- Rough budget: 4–6 focused workdays (approximately 24–36 hours).
- The goal is to prove the game's core experience, not to finish every feature in the original brief.

If the available time is shorter, ship the **Core Proof** defined below rather than shrinking quality across every system.

## 2. Problem to prove

The prototype is successful only if players can:

1. understand movement and danger without explanation;
2. notice that a rule has changed;
3. adapt rather than feel that the game killed them arbitrarily;
4. experience a satisfying narrow escape; and
5. restart immediately because they want another attempt.

The main design risk is not technical complexity. It is whether an error feels **hostile but readable**, rather than random or unfair.

## 3. Scope decision

The original brief is a good target vision, but implementing three hazards, three errors, overlapping modifiers, near-miss scoring, escalation, and presentation at once creates too many interactions to tune for a very small MVP.

### Core Proof — must be fun first

- responsive movement and jump;
- one fixed arena;
- falling block;
- horizontal projectile;
- instant death and restart;
- survival score and local best score;
- `INPUT_INVERTED`;
- `GRAVITY_UNSTABLE` using one fixed gravity multiplier;
- clear activation and recovery announcements;
- basic difficulty scaling;
- near-miss bonus for one hazard type;
- minimal game-over screen.

### MVP Expansion — add only after the Core Proof passes playtesting

- moving wall;
- `WORLD_SHIFT`;
- near-miss detection for every hazard;
- two simultaneous errors after 90 seconds;
- small visual/audio feedback pass;
- short boot screen.

### Explicitly deferred

- near-miss combo;
- soundtrack;
- full glitch transitions;
- rotating gravity;
- procedural arenas;
- menus/settings/pause;
- controller/mobile support;
- online features;
- every item listed as out of scope in the original brief.

## 4. Experience targets

These are hypotheses to validate, not facts:

| Moment | Target player experience | Observable signal |
| --- | --- | --- |
| First 10 seconds | “I know how to move and survive.” | Player moves and jumps without instruction beyond the control hint. |
| First error | “The controls changed.” | Player connects the announcement to the changed behavior within one activation. |
| During an error | “This is difficult, but I can compensate.” | Player survives at least part of the error after learning it. |
| Near miss | “That was close.” | Player notices the feedback without losing track of the arena. |
| Death | “I understand what hit me.” | Player can point to the cause immediately. |
| Restart | “One more run.” | Player restarts without prompting and without a page reload. |

## 5. Production milestones

### Milestone 0 — Technical foundation

**Timebox:** 1–2 hours

Tasks:

- initialize Vite + TypeScript + KAPLAY;
- create an 800 × 800 logical arena that scales to the browser window;
- centralize tunable values in `config.ts`;
- add `PLAYING` and `DEAD` state flow;
- verify production build runs locally.

Exit criteria:

- empty arena renders consistently;
- resize does not distort the playable area;
- `npm run build` succeeds.

### Milestone 1 — Movement test room

**Timebox:** 3–4 hours

Tasks:

- implement left/right input and jump;
- add floor, walls, ceiling, gravity, and grounded detection;
- tune acceleration, maximum speed, jump force, and gravity;
- add a tiny control hint that disappears after first input.

Exit criteria:

- input feels immediate;
- jump height and landing position are predictable;
- holding jump does not create accidental repeat jumps;
- the player cannot escape the arena;
- movement remains correct after ten consecutive jumps.

**Gate:** Do not add content until moving around an empty arena is already pleasant.

### Milestone 2 — First playable loop

**Timebox:** 3–4 hours

Tasks:

- add falling block with a short, readable spawn warning;
- add lethal collision;
- add abrupt death feedback;
- show survival time/score;
- add game-over summary and instant restart;
- reset all entities and timers without reloading the page.

Exit criteria:

- a full run can start, kill the player, display a score, and restart;
- no hazard spawns directly on the player without warning;
- restart takes one input and feels immediate;
- five restarts in a row do not duplicate timers or hazards.

### Milestone 3 — Identity proof

**Timebox:** 4–5 hours

Tasks:

- create an `ErrorManager` with activate, expire, and reset behavior;
- add `INPUT_INVERTED` as a movement modifier;
- announce activation and recovery while gameplay continues;
- keep the first 12–15 seconds error-free;
- make error duration and cooldown configurable;
- playtest this build before adding another error.

Exit criteria:

- the player can tell exactly when inversion begins and ends;
- jump remains unchanged;
- death/restart clears the inversion every time;
- activation is surprising but not visually ambiguous.

**Decision gate:** If inversion mostly produces confused deaths, improve cueing and pacing. Do not compensate by adding more effects.

### Milestone 4 — Core Proof completion

**Timebox:** 6–8 hours

Tasks:

- add horizontal projectile with predictable entry direction;
- add `GRAVITY_UNSTABLE` using one fixed multiplier per activation;
- add simple time-based difficulty bands;
- save best score in `localStorage`;
- add near-miss detection to the falling block;
- show `CLOSE CALL +25` once per eligible hazard;
- add a minimal active-error HUD.

Exit criteria:

- both hazards have a readable approach and distinct dodge response;
- the gravity error has an obvious start/end and never changes mid-jump without warning;
- each hazard awards at most one near miss;
- collision always takes priority over a near-miss reward;
- difficulty resets correctly on restart;
- the best score survives a browser refresh.

### Milestone 5 — First external playtest and tuning

**Timebox:** 3–4 hours

Test with 3–5 people for roughly five minutes each. Give only this instruction:

> Survive as long as you can. Use A/D or arrow keys to move, and Space/W/Up to jump.

Observe before interviewing:

- time until first purposeful movement;
- whether the first death is understood;
- reaction to error activation and recovery;
- whether a death felt impossible;
- whether the player notices a near miss;
- how many times they restart without prompting.

Ask afterward:

1. What changed when the error appeared?
2. Which death felt least fair, and why?
3. When did you feel most in control?
4. Did the close-call feedback change how you played?
5. Would you start one more run? Why or why not?

Suggested pass signals:

- at least 4 of 5 players act within 10 seconds;
- at least 4 of 5 can explain one error after experiencing it;
- most deaths can be attributed to a visible hazard;
- at least 3 of 5 restart at least twice without prompting;
- no recurring impossible hazard pattern appears.

Treat failures as tuning or readability problems before treating them as missing content.

### Milestone 6 — Conditional content expansion

**Timebox:** 4–6 hours

Only enter this milestone if the Core Proof passes.

Tasks, in priority order:

1. add the moving wall;
2. extend near-miss detection to the second/third hazard;
3. prototype the simplest readable `WORLD_SHIFT` variant;
4. allow a maximum of two errors after 90 seconds;
5. reject any combination that creates unavoidable deaths.

Recommended `WORLD_SHIFT` prototype:

- visually and physically drift hazard spawn lanes sideways;
- keep arena boundaries and player collision stable;
- show the shift direction before it begins.

This preserves the fantasy of an unreliable world without introducing moving-floor collision bugs into the MVP.

Exit criteria:

- each new item creates a distinct adaptation problem;
- no new item weakens readability;
- every error combination has been manually survived at least once;
- removing an item would noticeably reduce the intended experience.

### Milestone 7 — Presentation, QA, and build

**Timebox:** 4–5 hours

Tasks:

- apply the monochrome system aesthetic consistently;
- add `ERR NIL // 001` and `PROCEED ANYWAY` branding;
- refine error, death, and near-miss feedback;
- add sound only if silence is now the largest presentation problem;
- test keyboard input, focus loss, refresh, resizing, and repeated restarts;
- make a production build and run it in a clean browser session.

Exit criteria:

- the game is playable without console errors;
- score/high score/restart work across repeated runs;
- active error state always matches the HUD;
- the build works from its production output, not only the dev server;
- the first ten seconds need no spoken explanation.

## 6. Recommended day-by-day cut

| Day | Outcome, not activity |
| --- | --- |
| 1 | Movement feels good and one hazard creates a complete death/restart loop. |
| 2 | `INPUT_INVERTED` proves the core identity; score and game-over flow work. |
| 3 | Second hazard, gravity error, difficulty, best score, and one near-miss path complete the Core Proof. |
| 4 | External playtest, diagnosis, and tuning. No automatic feature expansion. |
| 5 | Conditional third hazard/error, then presentation and browser QA. |
| 6 | Buffer for tuning, bugs, packaging, or cutting weak features. |

For a two-day jam, stop after Milestone 4 and use the remaining time for tuning and presentation.

## 7. Architecture guardrails

Suggested starting structure:

```text
src/
  main.ts
  config.ts
  gameState.ts
  entities/
    player.ts
    hazards.ts
  systems/
    errors.ts
    scoring.ts
```

Add separate scene files only when the current file becomes harder to reason about. The game does not need a framework inside the framework.

Keep rule changes as modifiers:

```ts
effectiveInput = rawInput * inputDirectionMultiplier;
effectiveGravity = baseGravity * gravityMultiplier;
```

All mutable run state must have an explicit reset path:

- active hazards;
- active errors;
- timers and scheduled callbacks;
- difficulty values;
- near-miss eligibility;
- score;
- player velocity and position.

## 8. Tuning sheet

Put these values in `config.ts` from the beginning:

```text
PLAYER_SPEED
PLAYER_ACCELERATION
JUMP_FORCE
BASE_GRAVITY
UNSTABLE_GRAVITY_MULTIPLIER
FALLING_BLOCK_SPEED
PROJECTILE_SPEED
HAZARD_WARNING_MS
INITIAL_SPAWN_INTERVAL_MS
MIN_SPAWN_INTERVAL_MS
FIRST_ERROR_AT_MS
ERROR_DURATION_MS
ERROR_COOLDOWN_MS
NEAR_MISS_PADDING
NEAR_MISS_SCORE
```

Change one family of values at a time during tuning. Otherwise it will be unclear which change improved or damaged the experience.

## 9. Risk register

| Risk | Early warning | Response |
| --- | --- | --- |
| Errors feel arbitrary | Players blame input lag or bugs. | Strengthen activation/recovery cues and create a short safe adaptation window. |
| Hazard combinations become impossible | Deaths occur before a viable response exists. | Add spawn constraints, warnings, and minimum safe gaps. |
| Movement is not satisfying | Empty-room movement already feels heavy or slippery. | Tune before implementing more content. |
| Near-miss system lies | Bonus appears on collision or repeats. | Resolve collision first; reward only after exiting the near zone alive. |
| Restart leaks state | Hazards/errors duplicate after several runs. | Centralize teardown/reset and test repeated restarts at every milestone. |
| Scope expands through theme ideas | More glitch effects are added while the loop is weak. | Require a playtest finding to justify each post-Core-Proof feature. |

## 10. Final MVP definition of done

The MVP is shippable when:

- a new player understands the basic interaction within about 10 seconds;
- at least two hazards and two errors create distinct adaptation challenges;
- errors are clearly announced, temporary, and fully reset on death;
- survival score, near-miss bonus, and local best score work reliably;
- difficulty escalates without known unavoidable patterns;
- death cause is visually understandable;
- restart requires one action and no page reload;
- repeated runs do not leak timers, hazards, or modifiers;
- monochrome presentation is coherent;
- the production browser build runs without known blocking errors.

The third hazard, third error, overlapping errors, boot screen, sound, and extra juice are not required to call the first MVP complete.
