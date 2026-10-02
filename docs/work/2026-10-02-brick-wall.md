# The brick wall (a second way to draw)

## Goal

The way the user's oma built it: the tiles stand in a square, stacked like bricks, one side per
wind. A tile is under the two that rest on it, so to reach it you must take both of those first.
Each round plays its wind's side of the square. This sits **beside** the draw pile
(`2026-10-02-draw-pile.md`) so both can be playtested; the choice is on the setup screen.

## Approach

- **The side of the wall.** Each round, the shuffled set builds that wind's side: 4 rows, 7 / 8 /
  7 / 8 tiles from the top, each row offset by half a tile (30 tiles). Faces show. A tile is
  _free_ when no tile above overlaps it; the top row starts free. Tap a free tile to take it.
- **The rest of the set** is the face-down pile. The first hand is dealt from it. Refills come
  from the wall, a tap at a time (or Auto); once the wall side is empty, the hand refills from the
  pile on its own. Twists that send tiles "back into the pile" use this pile.
- **The square.** The host screen shows the four sides of the square (East, South, West, North),
  with this round's side lit and the played ones taken down.
- **Rules per draw mode** (content): the pile keeps hand 12 / 4 discards / its targets; the wall
  starts from hand 8 / 3 discards and is tuned in the sim. Tile sets and lanterns change hand and
  discards by a step (Jade Court +1 hand, −1 discard; Lantern 4 −1 discard) so they work in both.
- **Engine.** `RoundRules.draw` is `pile` or `wall`; `RoundState.wall` holds the side's slots
  (tile or empty). `take` comes back for the wall; `needsRefill` holds plays until the hand is
  full while the wall has a free tile. The bot values a free tile and what taking it uncovers.

## Steps

1. Content and engine (wall geometry, take, refill, bot, advice), unit tests.
2. Sim: `--draw wall`; sweep hand, discards and targets; per-wind table.
3. UI: the brick wall, the square on the host screen, the choice on setup; e2e.
4. Docs: design.md, balance, playtest notes.

## Manual test

Setup → Wall: Brick wall. The round shows the wind's side; only uncovered tiles can be tapped;
taking a top tile frees the ones it rested on once their other neighbour is gone. Auto refills.
When the side is empty, new tiles come from the pile.

## Out of scope

Choosing which end of the wall to draw from, dice to break the wall, the dead wall.
