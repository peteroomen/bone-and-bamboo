# Physical conveyor board: prototype baseline

User correction: the previous factory was a sorting interface; the desired toy is conveyors
physically moving tiles into groups. This prototype tests movement, construction and visible queues.
It does not add a factory economy or attempt a difficulty curve.

## Rules and physical behaviour

- 7 columns × 6 rows; fixed feeder at row 3, column 1. Fixed bay ports at row 2/5, column 7.
- A beat is 700 ms. Each tile moves at most one square per beat. Feeder emits every two beats,
  unless its square is occupied. All movement is resolved simultaneously; a moving queue can
  advance together, and tiles behind a genuine blockage stay in place. No overwrite, deletion,
  teleport to a free square, or processing-order advantage in a full circular test fixture.
- Straight belt, left/right bend and one movable sorting junction. Every piece has a physical
  entrance. Output must face a compatible entrance. Belts may be placed anywhere except fixed
  ports. Occupied pieces cannot be replaced/rotated/erased; move the tile or rewind first.
- Junction has one entrance and two exits: matching suit/optional number takes the gold clockwise
  branch, everything else goes straight. It does not merge lines or provide a return-loop merger.
- Bays accept from their left port. Pair: 2 identical tiles, 20 points. Triple: 3 identical, 45.
  Run: 3 consecutive ranks of one suit, 60. Partial runs accept either order, never duplicate ranks.
  An incompatible tile waits outside the bay. A completed set is stamped, shipped and the bay clears.
- Editing pauses. Reloading restores the board but starts paused. Rewind resets score/tiles while
  retaining layout and recipes. Clear removes belts and resets tiles; starter restores the demo.
- Plain JSON replay save. There is no loss state or external service requirement.

## Starter supplier and simulation

40 tiles in eight interleaved packets: two identical bamboo and three ascending dots, ranks 1–6.
First packet is bamboo 2, dots 1, bamboo 2, dots 2, dots 3. Remaining ranks vary by seed. This
is deliberately arranged to let the demonstration route work. The UI discloses the friendly supply.

`pnpm sim:conveyor`, seeds 0–199, unmodified starter layout:

| Measurement | Result |
|---|---:|
| Complete crates | 200 / 200 |
| Score per crate | 640 |
| Beats per crate | 87 |
| Blocked tile-beats | 0 |
| Sets per crate | 8 pairs + 8 runs |

The uniform results are expected from the supplier. This proves the starter topology works for
all supplied ranks; it does **not** establish fun, random-supply resilience or the value of building.
Deliberately broken-layout tests check a wrong-facing belt, an incompatible bay, occupied-piece
editing, safe queues, conservation, replay and full-loop simultaneous movement.

## Next playtest questions

- Is it satisfying to watch the tiles actually travel, branch and group?
- Can you understand a blockage by following the physical line?
- Can you lay and rotate a new route without fighting the tools?
- Does rebuilding a working machine suggest a next machine you want?

Only after that: consider a merge piece/return loop, buffer bay and varied supplier challenges.
Those mechanics are deliberately absent here. Default trial is free construction, not a full game.
