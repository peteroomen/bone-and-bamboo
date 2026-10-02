# The brick wall (2 Oct)

The oma's wall (`docs/work/2026-10-02-brick-wall.md`): each wind's side is 4 rows of 7 / 8 / 7 / 8
tiles stacked like bricks; a tile is free once nothing rests on it. The first hand comes from the
pile; refills come from the wall (the bot takes the free tile worth most to the hand, plus 0.4 of
what taking it frees), then from the pile once the side is empty. `--draw wall`, 400 runs, same
seeds.

## Hand, discards and targets

| Hand | Discards | Targets | Round median (East calm) | Smart | Casual |
|---|---|---|---|---|---|
| 8 | 3 | 1,000 / 3,600 / 8,000 / 16,000 | 2,112 | 50% | 15% |
| 9 | 3 | 1,000 / 3,600 / 8,000 / 16,000 | 2,587 | 62% | 28% |
| 10 | 3 | 1,000 / 3,600 / 8,000 / 16,000 | 3,056 | 74% | 41% |
| 10 | 4 | 1,000 / 3,600 / 8,000 / 16,000 | 3,184 | 72% | 42% |
| 10 | 3 | 1,000 / 4,000 / 9,000 / 18,000 | | 66% | 30% |
| **10** | **3** | **1,000 / 3,800 / 8,500 / 17,000** | | **68%** | **36%** |

Chosen: **hand 10, 3 discards, targets 1,000 / 3,800 / 8,500 / 17,000**, level with the pile
(68% / 35%).

## Each wind

`pnpm sim hosts --runs 400 --draw wall`, smart shopper.

| Wind | Host | Round win rate | Median score ÷ target | Runs reaching it |
|---|---|---|---|---|
| East | Masked (calm) | 100% | 2.92 | 400 |
| East | The coil (storm, ×1.5) | 97% | 2.33 | 400 |
| South | Swaps (calm) | 91% | 2.65 | 399 |
| South | Embers (storm, ×1.5) | 83% | 1.94 | 399 |
| West | Moon tide (calm) | 93% | 3.09 | 363 |
| West | Claws (storm, ×1.5) | 80% | 1.88 | 363 |
| North | The report (calm) | 80% | 2.12 | 338 |
| North | The shell (storm, ×1.25) | 68% | 1.44 | 338 |

No storm is more than 15 points under its calm wind. The twists were made for the pile; on the
wall, Swaps and Moon tide send tiles into the pile, which is only drawn from once the side is
empty, and the Lantern (next 3 tiles of the pile) matters little.
