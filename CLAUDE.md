# Bone & Bamboo: Claude Code Instructions

A mobile-first roguelike: mahjong with dice. Every die face is a tile; roll, hold, take sets onto
your rack, finish hands (four sets and a pair) and beat the four winds' targets. A 3D table (three.js
via React Three Fiber). Sibling of Twelve Petals (`peteroomen/hanafuda-roguelike`).

## Read first

- `docs/design.md`: the rules and every number. Don't change it without a simulator result.
- `docs/work/2026-10-16-bone-dice.md`: the dice rebuild: what is built, how to test it, what's next.
- `docs/balance/2026-10-16-dice.md`: simulator results for the dice game. Older files in
  `docs/balance/` and `docs/work/` are the card-style design (history).

## How to work here

1. **Plan before code.** Larger pieces of work get a plan in `docs/work/YYYY-MM-DD-{slug}.md`
   (goal, approach, steps, manual test steps, out of scope).
2. **One focused change at a time.**
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
            tiles · dice (shapes, rolling) · sets (rack) · patterns · scoring · round (reducer)
            tools · run (reducer, teahouse) · advice (exact odds, plans, the guide) · rng
  content/  Data only: tiles, shapes, dice, sets, patterns, charms, tools, enhancements, hosts,
            rules and targets. Every balance number lives here.
  sim/      Headless simulator (pnpm sim): the guide plays rounds, shoppers shop.
  ui/       three/ (the 3D table: dice, physics throws, rack) · game/ (the HUD and screens)
            art/ (tile generator) · audio/ · state/ (store, test hooks)
art-source/    Tile generator (reference), image prompts, generated originals.
```

- The engine is pure: `tsconfig.engine.json` has no DOM lib, and ESLint bans UI/React imports,
  `window`/`document`, `Math.random`, `Date.now` and `new Date()` under `src/engine`,
  `src/content` and `src/sim`.
- All game state is plain JSON (including the RNG state), so saves, replays and sims are exact.
- Reducers never mutate their input; they return `{ state, events }`. The UI animates the events,
  then shows the new state.
- The engine decides every roll. The 3D throw is physics for looks only: the mesh is turned by a
  symmetry of the solid so it lands on the engine's face (`src/ui/three/geometry.ts`).

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`. No `any`.
- Content is data: dice, charms, tools, patterns, hosts and twists go in `src/content/*` with their
  numbers, never hard-coded in engine logic.
- Mobile first: portrait, one thumb, 44px minimum touch targets, everything important visible at
  360×640 without scrolling. Check 390×844, 360×640 and desktop 1366×768.
- Font sizes use the type scale (`--fs-*`). Tile labels scale with the tile.
- Player-facing text: plain, short, British spelling as in Twelve Petals ("colour").
- Tiles are drawn from code (`src/ui/art/tiles.ts`); generated art comes in through
  `art-source/` (see its README). Don't copy any printed mahjong set's art.
- Cultural care: the hosts are the four winds, friendly rivals, treated with respect.
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

- **16 Oct 2026, branch `ccr-d58fd125-s3h046`:** the game is rebuilt as dice (the card-style game
  is on `main`). Engine, content, simulator, the 3D table and the whole run (rounds, cash-out,
  gifts, teahouse with dice editing, end) are playable. Smart bot wins 77%, casual 18%. Plan, test
  steps and next steps: `docs/work/2026-10-16-bone-dice.md`.
- `localStorage` key `bb.dev.v1` sets a fixed seed or targets for the next run (used by e2e);
  `window.__bb` is the e2e hook (`src/ui/state/testHooks.ts`). Headless Chromium needs SwiftShader
  for WebGL (set in `playwright.config.ts`).
- Removed with the old UI, to bring back: the scripted first run, collection, profile and unlocks,
  save transfer and the offline settings panel (the PWA itself still works).
