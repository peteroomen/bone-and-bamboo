# Python simulators (prototypes)

The rules were tested here before any TypeScript existed. Milestone M2 ports them to `src/sim/`
(`pnpm sim`), which must reproduce these results within noise. Keep these as the reference until
then. Needs Python 3.11, no packages.

- `handtypes.py`: how often each set type shows up in a random hand, by tile set.
- `roundsim.py`: one round (hand, wall, plays, discards, scoring at the end) with two bots,
  greedy and pong-hunting. `python3 roundsim.py` runs every sweep; `python3 roundsim.py trace 3`
  prints one round. Results: `docs/balance/2026-10-02-round.md`.
- `runsim.py`: whole runs (4 rounds, 3 teahouses, curios, almanac, fortunes, packs) with a smart
  and a casual shopper. `python3 runsim.py run --runs 400 --targets 1000,4000,9000,18000 --gift --fire 6`
  is the recommended setup. Results: `docs/balance/2026-10-02-run.md`.

Differences from `docs/design.md`, which wins where they disagree: the Python runs have no hosts
or twists, no reroll, no selling, no burn-a-kind, no porcelain or gold, and fortunes act on
deterministic targets instead of the player's choice.
