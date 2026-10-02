# Bone & Bamboo: Claude Code Instructions

A mobile-first, Balatro-style roguelike with mahjong tiles. You play sets from a hand of tiles,
refill from a wall of face-up stacks, and beat four friendly hosts' scores, one per wind. Sibling
of Twelve Petals (`peteroomen/hanafuda-roguelike`), which uses the same stack and conventions.

## Read first

- `docs/design.md`: the rules and every number. Don't change it without a simulator result.
- `docs/work/2026-10-02-mvp-plan.md`: the milestones, their acceptance checks and how the builder
  and planner work together.
- `docs/balance/`: simulator results.

## How to work here

1. **Plan before code.** Larger pieces of work get a plan in `docs/work/YYYY-MM-DD-{slug}.md`
   (goal, approach, steps, manual test steps, out of scope).
2. **One focused change at a time.** During the MVP build, milestone by milestone on the `mvp`
   branch, as the plan describes.
3. **Finish every change with** `pnpm lint`, `pnpm typecheck` and `pnpm test`. If you changed
   balance data, rerun `pnpm sim` and update `docs/balance/`. If you touched the UI, run
   `pnpm e2e` and look at the screenshots it writes to `test-results/`.
4. **Verify by playing.** A green typecheck is not a test.
5. Use the `@/*` path alias (`@/engine/...`, `@/content/...`).
6. Keep **Current state** below up to date.

## Architecture

```
src/
  engine/   Pure TypeScript rules engine. No DOM, no React, no Date, no Math.random.
            tiles · wall · sets (detection) · scoring · round (reducer) · run (reducer)
            shop · ai (hint bot, sim shoppers) · rng (seeded, serialisable)
  content/  Data only: tiles, sets, curios, fortunes, enhancements, packs, hosts, targets,
            lanterns, tile sets. Every balance number lives here.
  sim/      Headless simulator (pnpm sim).
  ui/       React rendering and input only. Reads engine state, dispatches engine actions.
tools/sim-py/  The Python prototypes the TypeScript simulator must reproduce.
art-source/    Tile generator (reference), image prompts, generated originals.
```

- The engine is pure: `tsconfig.engine.json` has no DOM lib, and ESLint bans UI/React imports,
  `window`/`document`, `Math.random`, `Date.now` and `new Date()` under `src/engine`,
  `src/content` and `src/sim`.
- All game state is plain JSON (including the RNG state), so saves, replays and sims are exact.
- Reducers never mutate their input; they return `{ state, events }`. The UI animates the events,
  then shows the new state.

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`. No `any`.
- Content is data: curios, fortunes, hosts and twists go in `src/content/*` with their numbers,
  never hard-coded in engine logic.
- Mobile first: portrait, one thumb, 44px minimum touch targets, everything important visible at
  360×640 without scrolling. Check 390×844, 360×640 and desktop 1366×768.
- Font sizes use the type scale (`--fs-*`). Tile labels scale with the tile.
- Player-facing text: plain, short, British spelling as in Twelve Petals ("colour").
- Tiles are drawn from code (`src/ui/art/tiles.ts`); generated art comes in through
  `art-source/` (see its README). Don't copy any printed mahjong set's art.
- Cultural care: the hosts include living folk and religious figures (the Kitchen God). They are
  friendly rivals, treated with respect. Nothing mocking.
- No `console.log` in committed code (the simulator CLI may print).
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).

## Commands

| Command          | What it does                                                  |
| ---------------- | ------------------------------------------------------------- |
| `pnpm dev`       | Vite dev server                                               |
| `pnpm build`     | Typecheck and production build (static, PWA) into `dist/`     |
| `pnpm test`      | Vitest unit tests                                             |
| `pnpm lint`      | ESLint, including the engine purity rules                     |
| `pnpm typecheck` | `tsc -b` across engine, sim, app and node configs             |
| `pnpm sim`       | Simulator; see `pnpm sim --help`                              |
| `pnpm e2e`       | Playwright: scripted play at phone and desktop sizes          |

Node 22. In the Claude Code remote container Chromium is pre-installed at `/opt/pw-browsers`
(pin Playwright 1.56.1 to match it). Don't run `playwright install`.

## Current state

- **2026-10-02:** M1-M4 and the "complete run and teaching slice" are done on the `mvp` branch,
  rebuilt around the new design (`docs/design.md`): the jokers are **dragons** (23, drawn as tiles
  with a rarity frame; `src/content/dragons.ts`), winds are the only honours, each round is hosted
  by its wind tile (Calm or Storm), the eight twists run as data (`src/engine/twists.ts`, M5; per-wind results in `docs/balance/2026-10-02-hosts.md`), traced tile faces and
  dragon icons come from `art-source/icons/icons.json` split by `scripts/build-icons.ts`, and the
  tile generator port includes the guide and dragon tiles (byte-identical, tested). Engine: tabled
  pong to kong upgrade (one play), optional early finish once the target is beaten, live dragon
  goals with multiplier-loss warnings, signed previews, Ask the dragon (`src/engine/advice.ts`,
  visible tiles only), hint levels, an introduction sheet and an illustrated set book. Sim results:
  `docs/balance/2026-10-02-dragons-and-policies.md`. Bamboo Hook is rejected.
- `localStorage` key `bb.dev.v1` sets a fixed seed or targets for the next run (used by e2e).
- M6 done: the guided first run (`bb.profile.v1` `guidedDone`; seed 11, a plain East round, the
  guide's tip queue in `src/content/guide.ts` and `src/ui/game/tips.ts`). - M7 done: title, setup (tile set and lantern), collection, settings, the profile and unlocks
  (`src/engine/profile.ts`), offline install and save transfer (`BB1.` codes). - M8 done: synthesised sound (`src/ui/audio`: bone clacks, the ban, gong and cymbal, a guzheng
  and dizi score per wind and a calm teahouse, a wind bed), haptics, volume settings, and instant
  speed that switches every animation off. The MVP milestones M1-M8 are built; M9 (art) is with
  the planner. Milestone status is in the PR.
- The art style trial: three colourways exist; colourways become unlocks in M7.
- **2 Oct (later):** M1-M8 done, plus the planner's twist tuning (Masked +1 per set, Claws without the chow half, the shell lifted by any set with target ×1.25; see `docs/balance/2026-10-02-hosts.md`) and a centred hand layout. Stopped at M9 (art). The PR is a draft.
