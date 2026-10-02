# Playtesting the MVP

Run it: `pnpm install`, then `pnpm dev` and open the printed address on a phone (same network) or
in a browser narrowed to phone width. `pnpm build && pnpm preview` serves the production build,
including the offline service worker.

A new browser starts the **guided first run** (a fixed East round with the guide's tips). After
that, New run opens the setup screen.

## Handy switches

Set in the browser console (`localStorage`), then reload:

- Open every colourway, tile set and lantern:
  `localStorage.setItem('bb.dev.v1', JSON.stringify({unlockAll: true}))`
- A fixed seed and easy targets: `{"seed": 5, "targets": [300, 400, 500, 600]}` (merge with the
  flag above if you want both).
- Forget the lesson: `localStorage.removeItem('bb.profile.v1')`.
- Clear everything: `localStorage.clear()`.
- Settings has speed (Instant skips every animation), hints, colourway, volumes and haptics.

## What to look at

1. **The wall and the hand at your phone's size.** Are the tiles readable? Is anything cut off or
   too small to tap? (Two rows of four stacks, two rows for the hand; sizes follow the screen.)
2. **The first run.** Do the tips come at the right moments, and does each wait until the table is
   still? Is "Ask" (the guide's advice) sensible?
3. **A kong upgrade and banking.** Buy a Fourth copy pack or a Rubbing fortune, play a pong, then
   hold its fourth tile: the Kong button appears. Once the table beats the target a "bank" bar
   replaces the progress bar.
4. **The eight twists.** Each wind offers Calm and Storm; the banner at the start says the rule.
   Known rough spots (see the PR): Masked is far too strong, Claws and the Shell are hard, the
   armour rule is my reading of the design.
5. **The teahouse.** Dragons, pages, fortunes (use one from the pocket), a pack, reroll, burn a kind,
   sell. Does the money feel right?
6. **Colourways** (with the unlock flag): tiles, table and accents should all change together.
7. **Sound.** Untuned by ear: tell me what is too loud, too sharp or too busy. The first tap wakes
   it (browser rule). Hide the tab and it should go silent.
8. **Offline.** After one online load, switch the network off and reload.

## Known gaps

- Only six dragons have traced pictures; the rest show their initial. Fortunes, packs and pages are
  glyph squares.
- The CJK font is the device's own.
- No over-target cash, no flowers or seasons, no editions or chops (all out of scope for the MVP).
