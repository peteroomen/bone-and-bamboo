# Bone & Bamboo: dragons, and banking and upgrade policies (M2 sync, 2 October 2026)

After the design change (jokers are **dragons**; the dragon tiles are out of play; Wind Chime,
Three Treasures and Stone Lion added; Wind triple pack; no Three Dragons set), `pnpm sim` was rerun
with the 23 dragons and 4 packs (`docs/balance/2026-10-02-ts-sim.md` has the earlier 21-curio run).
400 runs each on the recommended ladder (1,000 / 4,000 / 9,000 / 18,000, gift, fire 6).

| Shopper | Won | Lost in round 1 / 2 / 3 / 4 | Before the change |
|---|---|---|---|
| Smart | 68% | 0% / 9% / 10% / 14% | 74% |
| Casual | 37% | 0% / 23% / 18% / 22% | 33% |

The base round is unchanged (median 2,464; no dragons). The smart bot now ends 38% of its runs
playing for pongs (it was 15%): with Three Treasures (×1.5 per pong) and Stone Lion (+3 mult per
tile in pongs and kongs) both in the pool, pong builds are a real second strategy, which is what
the design wanted. They are a lot of the shop's rare slots: Stone Lion ends in 50% of finished
builds and Three Treasures in 47% (win rates 70% and 65%, near the 68% average), so neither is
broken, but they are common because the smart shopper prices a rare pong dragon highly. Wind
Chime is rare (8% of builds, 68%) and weak for the casual bot (it needs winds, which are bought).

Median scores per round (smart, no targets, 200 runs): 2,365 / 10,908 / 26,736 / 41,760
(round 4 was 34,656 with 21 curios).

## Banking early and upgrading pongs (smart shopper, 400 runs each, the same seeds)

| Policy | Won | Money at the end | Rounds banked early | Kongs on tables |
|---|---|---|---|---|
| Play every round out | 68% | $7.5 | 0.00 | 0.03 |
| Bank when the target is beaten | 70% | $8.2 | 3.22 | 0.03 |
| Upgrade pongs to kongs | 68% | $7.5 | 0.00 | 0.06 |
| Bank and upgrade | 70% | $8.2 | 3.22 | 0.04 |

- **Banking** is almost free to the player: the bot reaches the target before its last play in
  about 3.2 of 3.7 rounds, keeps its unused discards ($1 each) and gains about $0.70 a run. Its win
  rate rises 2 points (within noise of ±2.3) because the extra money buys a little more. Unused
  plays pay nothing, so it is not a snowball. A capped over-target reward is not modelled.
- **Upgrading** barely matters yet: the starting set has 3 copies, so a pong's fourth tile exists
  only after a Fourth copy pack or Rubbing (0.03 kongs a run, 0.06 with upgrading). The upgrade
  doubles kongs on tables but from a very small base. Keep it as a teaching and build choice; it
  will matter more if 4th copies become easier to get.
- The bot upgrades only when the new score is at least what the best new set would give. It does
  not value the play it spends beyond that.

## What these numbers do not say

- The policies change only how rounds are played, not how the shopper values dragons (its
  evaluation rounds do not bank or upgrade).
- They are bot results, not human win rates. `pnpm sim policies` reproduces the table.
- The Python prototypes were updated to the same dragons (`tools/sim-py`, 100 runs: smart 60%;
  that run is too small to compare closely; the TypeScript result above is the reference).
