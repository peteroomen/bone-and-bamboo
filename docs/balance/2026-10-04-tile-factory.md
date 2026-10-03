# Toy factory: first playtest baseline

This replaces the default preview after the complete-hand experiment felt confusing. The goal is
immediate, legible matching and a first satisfying automation purchase. It is not a balanced full
factory game and does not retain the previous roguelike economy.

## Rules

- Three machines: identical pair (20 score/brass), identical triple (45), three consecutive numbers
  in one suit (60). Runs accept tiles in any order; duplicate ranks and mixed suits are rejected.
- Score is lifetime production this shift. Brass is earned alongside score and can be spent.
- Supply: 68 tiles, bamboo/dots 1–6, no dragons or winds. The first eight deliberately teach all
  three machines. Five subsequent 12-tile batches each contain two random runs and two random
  triples, shuffled within the batch. Repeated kinds are unrestricted factory stock, not a
  physical mahjong set. This supplier is friendly by design; UI explains the starter assortment.
- Holding tray: three physical tiles. Any loaded tile can return to it if space allows. A held
  tile can enter a machine or be recycled without advancing the conveyor. Recycle yields 1 brass
  and zero score, preserving a way out of congestion without making recycling the scoring game.
- Gate: costs 40 brass once, routes one chosen suit or both to one selected compatible machine.
  Empty machines accept a new starting tile. Gate mismatch stops autoplay; there is no hidden
  discard or automatic restart after a manual action. Step performs exactly one gate move.
- Order: two runs, once per crate, adds 60 score and 30 brass.
- No time pressure, target failure or persistent upgrades. Finish after the crate empties; leftover
  tiles are reported without awarding points. New crate resets the factory and changes the seed.

## Reproducible model

`pnpm sim:factory` runs seeds 0–199. A deliberately basic public-information policy first fills
compatible partial machines, then starts an empty machine, holds when possible, and otherwise
recycles. It buys the gate when affordable but manually routes thereafter; this measures throughput
and purchase access, **not the value of automation**. It neither reads future crate contents nor
searches recover/re-route combinations.

| Metric | Result |
|---|---:|
| Crates | 200 |
| Mean score | 550.875 |
| Mean sets shipped | 12.37 |
| Mean recycled tiles | 29.775 |
| Two-run orders completed | 196 / 200 |
| Gate affordable and purchased | 200 / 200 |
| Unfinished/stuck simulations | 0 |

The fixed teaching sequence earns 125; the gate is affordable after the first run (five tiles).
The basic policy recycles about 44% of supply. This is a warning to watch in playtesting: a single
partial set can occupy a station for too long. Recovery is available to humans but this baseline
policy does not use it. Do not interpret these results as evidence that the loop is fun.

## Questions before expanding

1. Does completing a simple set feel good enough to repeat?
2. Does the first gate feel like a machine working for you, or just a button saving clicks?
3. Are incompatible tiles an interesting routing problem, or mostly interruptions?
4. Would the next useful addition be a second route, a buffer, or a return loop?

Only build more machinery if the first two answers are positive. Next modelling should compare
manual, one-gate and two-gate policies at the same seeds; track automatic share, pause frequency,
recovery moves and set throughput. The current model cannot answer those questions.
