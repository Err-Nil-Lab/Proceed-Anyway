# Core Proof QA Report

**Date:** 2026-10-06  
**Build:** Steps 1–12  
**Environment:** Vite development build in the Codex in-app browser; production build via `npm run build`

## Facts verified

- Production TypeScript/Vite build completes successfully.
- Browser console contains no warning or error during the tested flows.
- The full loop reaches `FATAL ERROR` and restarts with one Space input.
- Three consecutive death/restart cycles completed without duplicated visible hazards, UI, or timers.
- Refresh starts a new score while retaining the best score in local storage.
- The 800 × 800 logical arena remains fully visible and letterboxed at desktop and 390 × 844 viewports.
- Difficulty selects `LOW`, `RISING`, and `CRITICAL` at 0, 18, and 38 seconds. Its speed and interval values are finite and capped in configuration.
- Near-miss tests verify collision priority, reward-on-exit, and one reward maximum per falling block.
- Score tests verify the +25 close-call bonus.
- The ErrorManager still schedules one error at a time and reads the current difficulty cooldown after recovery.

## Browser observations

- Movement/jump input removes the control hint and the game continues during hazard warnings.
- Falling-block and projectile silhouettes remain the main visual focus.
- The game-over overlay clearly presents score, best score, close-call count, and restart action.
- Branding and system-load status remain secondary to playfield information.
- The narrow viewport keeps all game-over copy inside the arena and readable.

## Gaps and hypotheses

- The available browser runner did not expose a real background-tab visibility change, so focus-loss behavior was not fully reproduced. No focus-dependent game logic is present, which reduces but does not eliminate this risk.
- No external human tester was available. “Controls understood within 10 seconds,” perceived fairness of the late band, clarity of error recovery, and emotional value of close calls remain hypotheses—not validated player findings.
- A short human playtest should happen before Optional Expansion. Ask the tester to play without coaching, then record first misunderstanding, first death explanation, and whether `INPUT_INVERTED` and `GRAVITY_UNSTABLE` felt intentional.

## Decision

No known technical blocker remains in Core Proof. The build is ready for a small human playtest; Optional Expansion should wait until that evidence exists.

## Refinement verification — Steps 12A and 12B

- Falling-block detection now uses a wider horizontal near zone and resolves an entered close call when the block safely reaches the floor.
- Horizontal projectiles now use the same collision-first, reward-on-exit tracker with a more generous vertical near zone for jump dodges.
- Deterministic checks passed for per-axis geometry, lethal priority, and one reward per hazard.
- The first encounter remains one centered falling block. Later encounters contain one to three calculated-random spawns.
- `LOW` permits one occupied hazard slot, `RISING` two, and `CRITICAL` three; pending warnings reserve slots before hazards become active.
- Encounters can generate single, same-type double, mixed double, same-type triple, and mixed triple compositions.
- Vertical hazards use distinct lanes within an encounter. Closely spaced horizontal projectiles share a direction so they cannot pinch the player from both sides.
- The next encounter is scheduled from encounter start rather than hazard cleanup, enabling controlled overlap.
- A fixed-seed simulation of 3,000 encounters passed active caps, composition variety, vertical-lane uniqueness, anti-pinch rules, and occupied-cap fallback.
- Browser verification loaded the game, accepted movement/jump input, reached game over, and reported no console warnings or errors.
- An automated browser run did not produce a close call before death; perceived generosity remains explicitly pending Step 12C human feel testing.

## Step 13 verification — Moving wall

- The third hazard is a horizontal wall with a 170 px safe gap ranging from a high-jump opening to a ground-level opening.
- Its entry warning previews the upper and lower solid sections, leaving the safe gap visible.
- The wall participates as a single encounter or alongside a falling block. Direct wall + projectile, double-wall, and triple-with-wall encounters are rejected by construction.
- Wall edges use the shared collision-first near-miss tracker and award at most one close call.
- Fixed-seed simulation covered 9,000 encounters across `LOW`, `RISING`, and `CRITICAL`, with wall appearances in every band and no forbidden wall combination.
- Geometry checks confirmed that the lowest gap contains the standing player and the highest gap contains the player near jump apex.
- TypeScript and the final Vite production build completed successfully.
- Browser feel testing was intentionally left to the user; visual readability and subjective fairness are not claimed as validated here.

## Steps 14–15 verification — WORLD_SHIFT and overlapping errors

- `WORLD_SHIFT` applies a fixed 0.28 normalized offset to falling-block lanes for one activation and clamps the result inside the arena.
- Activation announces `LANES LEFT` or `LANES RIGHT`; recovery, death, and restart return the offset to zero. Arena geometry never moves.
- Before 70 seconds, deterministic timer tests observed at most one active error.
- After 70 seconds, a secondary error may activate after a 2.5-second stagger, with a hard maximum of two.
- Tests exercised all three allowlisted pairs: input + gravity, input + world shift, and gravity + world shift. Duplicate and triple activation remain blocked.
- The HUD retains any remaining error when its overlapping partner recovers.
- TypeScript and the final Vite production build completed successfully.
- Per user request, browser testing was skipped. Step 15 remains `IN PROGRESS` until the user manually survives or reports on all three pairs.

## Step 16 verification — Audio and juice

- Added dependency-free procedural Web Audio cues for jump, each hazard warning family, error activation, recovery, close calls, and death.
- Audio context creation/resume happens only after player input to respect browser autoplay restrictions; unavailable audio fails silently without interrupting gameplay.
- The experimental procedural BGM was removed after user playtesting. The supplied `gameplay-proceed-anyway.mp3` is now used as the looping gameplay BGM.
- The BGM lives under `public/audio/bgm/`, starts after the first player input, and is owned by the singleton audio manager so scene restarts do not duplicate playback.
- Existing jump mark, warning pulse, close-call movement, death flash, and shake feedback remain intentionally small and monochrome.
- Error activation now adds a light shake; close calls use a smaller shake and death retains the strongest shake.
- Import/no-context checks and the TypeScript/Vite production build completed successfully.
- Actual loudness, timbre, and overlap mixing remain pending the user's browser/audio playtest.

## Feel refinement — Variable jump and impact timing

- Releasing jump while rising cuts vertical velocity to 42%, producing a short hop; holding preserves the full jump arc.
- Falling or grounded velocity is never modified by jump release.
- Moving-wall safe-gap height increased from 132 px to 170 px. High and ground-level gap geometry both contain the 38 px player at their intended jump positions.
- Error activation applies 0.55× time for 120 ms; death applies 0.16× time for 220 ms before returning to normal time.
- Restart explicitly restores normal time scale so slow-motion state cannot leak between runs.
- Production build and pure jump-cut/gap-geometry checks completed successfully; browser feel remains user-tested.

## Fast-paced balance pass

- `RISING` now starts at 18 seconds and `CRITICAL` at 38 seconds instead of 30/60.
- First hazard delay decreased to 850 ms. Encounter bases decreased to 2,550 ms (`LOW`), 1,900 ms (`RISING`), and 1,450 ms (`CRITICAL`) with bounded 24% jitter and a 1,050 ms hard minimum.
- Per-spawn speed variation is bounded by band: 0.95–1.05×, 0.90–1.12×, and 0.88–1.18×. Absolute speed caps still apply.
- Movement speed increased from 360 to 375 while deceleration decreased from 4,200 to 2,600, creating mild momentum without changing acceleration.
- WORLD_SHIFT increased to a 0.28 lane offset and overlap eligibility moved to 70 seconds.
- A fixed-seed run of 9,000 encounters stayed inside every speed/interval bound and retained wall-combination constraints. Production build succeeded.

## Player animation juice

- Player rendering is separated from its invisible physics collider, so animation never changes the lethal hitbox.
- The block uses a subtle opposing-axis idle pulse, leans up to 7 degrees while moving, rotates at 300 degrees/second in the air, and squashes for 140 ms on landing.
- Jump rotation follows movement direction; neutral jumps alternate their spin direction. Landing settles toward the nearest visually equivalent 90-degree square orientation.
- Production build completed successfully; animation feel remains user-tested in browser.

## Main-menu overlay

- The game scene now starts in `MENU` state behind a 0.82-opacity in-scene overlay; the dimmed HUD, arena, and player remain visible and no additional KAPLAY scene was introduced.
- The overlay presents `PROCEED ANYWAY`, `ERR NIL // 001`, and a text-style `> PROCEED ANYWAY` CTA with a generous invisible click target, matching the game-over treatment.
- Clicking the button or pressing Enter/Space removes the overlay and starts score, difficulty, error scheduling, encounter scheduling, and audio together.
- While the menu is active, gameplay input, timers, score, and hazards remain inactive.
- The menu is only used for the initial page load. Game-over input creates an auto-start run directly instead of returning through the menu.
- Death pauses and rewinds the BGM after playing the procedural death SFX; a direct restart begins the track again from the start.
- TypeScript and the Vite production build completed successfully; browser interaction remains user-tested.

## Error expansion — compressed arena and ice floor

- `ARENA_COMPRESSED` randomly closes the playable area from the left, right, or both sides. The walls animate inward instead of appearing instantly, and the player is pushed/clamped into the remaining safe area.
- A single incoming wall occupies 140 px; a two-sided compression occupies 90 px per side, leaving a generous playable lane while still changing hazard positioning pressure.
- `ICE_FLOOR` lowers horizontal acceleration to 1,850 and deceleration to 420, so direction changes are slower and released movement carries noticeable momentum.
- Both errors participate in the existing rotation and pair allowlist while retaining the hard maximum of two simultaneous errors.
- Compression state and visuals reset immediately on death, preventing stale walls behind the game-over overlay or in the next run.
- TypeScript and the Vite production build completed successfully. Per user request, browser feel testing was skipped.

## Death transition refinement

- Lethal contact now enters a dedicated `DYING` state instead of showing `FATAL ERROR` immediately.
- The player block launches upward, spins, shrinks slightly, and falls for 900 ms before the game-over overlay appears.
- The initial impact holds a stronger 0.16× slow-motion beat for 300 ms, then returns to normal speed so the fall completes cleanly.
- Gameplay input and restart are ignored during the death animation. The BGM still stops and rewinds at the instant of lethal contact.
- TypeScript and the Vite production build completed successfully. Browser feel testing remains user-owned.

## Error exposure rebalance

- User playtesting past score 1,000 found no visible overlap and reported that input inversion and unstable gravity dominated while compression and ice were rarely encountered.
- The first activation now occurs at 8 seconds, and overlap eligibility begins at 28 seconds with a 1.8-second stagger instead of 70 seconds with a 2.5-second stagger.
- The fair rotation now opens with `ARENA_COMPRESSED` and `ICE_FLOOR`, followed by world shift, input inversion, and unstable gravity. Every five selections still contains each error exactly once.
- Compression walls are fully opaque foreground white and grow inward directly from the arena borders, reading as an extension of the frame rather than a translucent grey hazard.
- TypeScript and production build verification completed successfully; the revised encounter frequency still requires browser feel validation.

## Error readability pass

- Every error now receives a 500 ms visual telegraph before its mechanical effect activates.
- The telegraph uses an error-specific cue; ice highlights the floor and arena compression flashes extensions on both side borders.
- Active-error announcements remain visible for 1.2 seconds, while the persistent HUD continues to list modifiers for their full active duration.
- A secondary activation uses `ERROR STACKED` and lists both active modifiers instead of presenting an ambiguous second standalone error.
- Announcement cleanup is versioned so an older timeout cannot prematurely erase a newer overlapping message.

## Compressed-arena hazard readability fix

- Horizontal-projectile and moving-wall warnings now anchor to the compressed playable boundary instead of the original outer arena border.
- Both horizontal hazards spawn directly behind the current playable boundary, so they emerge immediately after their warning instead of travelling invisibly through the solid compression wall.
- Falling-block lane calculation now excludes the reserved compressed width on both sides, preventing its marker or block from being placed behind the extended frame.
- Warning layers remain above the compression geometry; the positioning fix prevents white-on-white indicators from visually disappearing.

## Controlled-random error selection

- Fixed error ordering was replaced with a shuffled bag containing all five error types.
- Each bag emits every error exactly once before it is refilled, preventing long-term dominance while keeping the moment-to-moment order unpredictable.
- Bag boundaries prevent the final error of one bag from immediately repeating as the first selection of the next bag.
- Compatibility checks, telegraph timing, active duration, and the hard two-error overlap limit remain unchanged.

## Projectile and error-information tuning

- Horizontal-projectile base speeds were reduced from 500/585/660 to 460/535/605 across LOW/RISING/CRITICAL; the absolute cap is now 710.
- Red is reserved for system-error communication: the persistent error HUD, error announcement titles, and error telegraphs. Physical hazards and their warnings remain white.
- The HUD shows a rounded-up whole-second countdown for every active error, including independent timers for staggered overlaps.
- During the final two seconds, the error HUD pulses lightly to telegraph recovery without adding another central overlay.
- Runtime fix: countdowns use parentheses such as `(9s)` because KAPLAY parses square brackets as styled-text markup; the previous `[9s]` format raised an unclosed-tag error and halted the game loop.
