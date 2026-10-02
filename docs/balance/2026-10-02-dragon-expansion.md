# Dragon expansion: findings and implementation recommendations

**60 dragons specified and modelled: the 23 existing designs plus 37 proposals.** This PR supplies a reproducible design laboratory, exact rules, tests, a result row for every dragon and 60 standalone artist prompts. It does not change the MVP's live balance or implement its UI.

Start with the [catalogue](../dragons/catalogue.md), [per-dragon results](../dragons/model-results.md), [artist kit](../dragons/artist-prompts.md) and [reproduction instructions](../../tools/dragon-lab/README.md). Machine-readable sources: [catalogue](../dragons/catalogue.json), [primary experiment](dragon-lab-results.json), [holdout tuning](dragon-lab-refinements.json).

## What the experiments actually establish

The primary sweep used 128 paired walls for every dragon, three policies and three decks. Including baselines, that is **70,272 rounds**. Seven five-dragon build recipes added **5,376 rounds**. A separate seed block tested twelve parameter reductions on two decks, adding **6,400 rounds**. Total: **82,048 sampled rounds**, plus the training/played rounds inside 144 limited market runs. The market was rerun after adding an empty-table scoring guard; the reported final results include that guard.

These are model outputs, not human win-rate estimates. Existing generic greedy and pong policies provide controls. The new `aware` policy evaluates actual immediate score changes and uses visible-tile preferences. It does not search a multi-play plan. It therefore recognises a multiplier breaking immediately, but can still fail to build a difficult pattern or wait for a fourth tile. The three policies are intentionally reported separately; selecting the best result after seeing each wall would give an unfair oracle.

All 60 effects have manually calculated fixture expectations. All 60 also run deterministic round and tile-conservation checks. Thirteen unittest groups pass, including thresholds, caps, income timing, wind directions, repeat counting, resource modifiers, empty tables, score decreases and a hidden-wall invariance check. Positive pattern fixtures exercise rare effects even when bots never achieve them in natural deals. This verifies the laboratory implementation; app-engine parity remains a porting gate.

## The broad bonuses need the first tuning pass

On starting decks, the new policy's no-dragon median was 2,282.5. Nest's median paired uplift was +205.4%; Even Comb +106.2%; Moon Gate +102.5%; Middle Path +92.3%; Abacus +90.9%. Several effects that look small per tile compound across the whole table. A common that is almost always useful and doubles a score leaves too little space for a difficult rare condition.

We checked lower values on **independent seeds 62,000–62,127**, with the same policy and paired baselines. These are proposed starting values for the next playable test, not adopted changes:

| Dragon | Current/proposed original → candidate | Holdout starter median uplift, original → candidate |
|---|---|---:|
| Nest | +6 → +3 mult per pair | +227.1% → +104.5% |
| Abacus | +2 → +1 mult per chow | +90.9% → +45.5% |
| Moon Gate | +4 → +2 mult per qualifying set | +106.0% → +51.9% |
| Even Comb | +1 → +0.5 mult per even tile | +117.2% → +58.3% |
| Middle Path | +1 → +0.5 mult per 4–6 tile | +77.2% → +40.3% |
| Paper Fan | +3 → +2 mult per unused discard | +81.8% → +54.5% |
| Four Tools | +3 → +2 mult per set type | +64.7% → +42.9% |
| Empty Chair | +0.25 → +0.15 to ×mult per empty slot | +100.0% → +60.0% |
| Last Ember | ×1.75 → ×1.5 | +75.0% → +50.0% |
| Still Pond | ×1.75 → ×1.5 | +75.0% → +50.0% |
| Stone Lion | +3 → +2 mult per pong/kong tile | +81.8% → +54.5% |
| Three Treasures | ×1.5 → ×1.3 per pong | +50.0% → +30.0% |

Nest remains a strong build enabler at +3. Try this before simultaneously making pairs weaker. Fractional additive mult requires a readable UI; the model retains it until final flooring. Replacing +0.5 per tile with +1 per two complete tiles would be a different rule and needs its own tests.

The first combination experiment reduced only the five existing effects (Nest, Abacus, Moon Gate, Stone Lion, Three Treasures). On the prepared deck, the aware pairs recipe's median fell from 18,008 to 12,801; the pongs recipe's p90 fell from 68,094 to 43,277. This reduces both easy pair dominance and the upper pong tail. The pongs recipe still has a wide distribution, so keep its high-payoff identity. The holdout reductions to new dragons have not yet been run through all five-slot combinations.

## Rare patterns need access and feedback, not just a larger number

- **Great Bell / Fourth Pillar / Kong Mint:** impossible in the starting deck. Even with nine fourth copies, Great Bell activated in only 2.3% of greedy rounds, 1.6% of pong rounds and none of the aware rounds. The model lacks the approved tabled-pong upgrade action. Gate offers behind fourth-copy ownership, then remeasure with upgrades before pricing or nerfing these dragons. Do not infer “useless” from this bot.
- **Wind Chime / Wind Courier:** the prepared deck supports them; Wind Chime activated in 9.4% of aware rounds versus 18.0% of greedy rounds. A bot that prefers immediate scores can worsen wind completion. Add explicit wind-set goals and offer suitable wind packs near these dragons.
- **Nine Rings:** aware activation was 3.1% in starter decks and 0.8% in prepared decks. Removing terminals makes it impossible. Show the three required chow slots and warn about incompatible trimming. A partial reward for two sections is a promising untested redesign; merely increasing ×3 will not fix access.
- **Rainbow Bridge:** 10.2% aware starter activation gives it a plausible chase identity. Use a live three-suit diagram showing the exact shared chow ranks.
- **Three Brothers:** no natural activations in the sampled three deck scenarios, despite passing the positive fixture. Keep it as an advanced challenge proposal. A two-suit intermediate reward or a longer run should be tested before putting it into ordinary gifts.
- **Balanced Scales:** exact equality activated in 0.8% of prepared aware rounds and none of the starter aware rounds. Consider a tolerance or partial progress reward. Neither rule change is modelled here, so do not implement a silent relaxation.
- **Twin Cranes / Twin Peaches:** count disjoint pairs of matching sets, including tile suit/ranks. Three identical sets give one bonus; four give two. Show the pairings to prevent combinatorial-count confusion.

## Utility and income have different jobs

Night Owl gave +20.6% median paired uplift on starter decks. Lantern gave +2.2% on starter and +17.1% on prepared decks; Long Sleeves +5.0% and +17.7%. Their value depends on the deck and policy. Iron Teapot's median uplift was zero under the aware policy, which often plays immediately. This is a policy limitation as well as a potential weak purchase; don't increase its price from this result.

Income dragons intentionally have zero direct score uplift. Gold Toad earned $4 per successful diagnostic round. Pair Peddler earned $2.39 on starter, $3.34 on prepared and $4.68 on the trimmed deck. Tea Ledger earned $2.66, $1.95 and $1.13 respectively. These figures separate payout from score, and exclude North currency that cannot be spent. A purchase after West cannot recoup an income dragon's cost. Show “two payouts left” in its shop preview and make late offers useful through immediate sale/replacement options or suppress pure income offers in the last shop.

Cash-scaling dragons should display **the score after buying**, since spending money can reduce their bonus. Empty Chair similarly needs a preview of the lost multiplier when filling a slot. The model supports these opportunity costs. Do not mark a purchase as an upgrade solely because its printed effect is positive.

## A spectacular combination is not automatically a balance defect

The deliberately extreme Bamboo-only 2–8 deck with Silk Banner, Two Fish, Rice Bowl, Bamboo Grove and Odd Beads reached a median 253,575. It is a **21-tile stress deck**, not evidence that the normal three-shop path can build it. All three multipliers reward closely related restrictions and multiply together. That is a satisfying payoff if obtaining the deck is costly and rare; it becomes repetitive if ordinary shops deliver it reliably.

Keep this as an endgame fantasy. Before putting Silk Banner into the ordinary pool, model actual packs, burns and fortunes with their prices and three-shop horizon. Measure the probability of reaching the deck and surviving en route. If it proves common, adjust access or overlapping multipliers based on that reachable-deck experiment. Avoid flattening every jackpot because a synthetic best-case deck is large.

The savings recipe's prepared median was 19,812.5, with no extreme deck trimming. That deserves an early human test: preserving money and discards could become a passive dominant line. In particular, test the proposed Paper Fan/Still Pond reductions together; the first combination experiment did not include those reductions.

## The shopper result is a warning about the model

The limited market produced **5/48 wins** with a fixed greedy policy, **2/48** with prospective policy selection, and **1/48** with the five-effect tuning. It performed 40, 39 and 28 full-row replacements respectively. Gold Toad was purchased, unlike the earlier score-only shopper. Income now has an explicit future-value term, and full rows no longer freeze free gifts.

These results do **not** establish that adaptive play or tuning is worse for humans. The candidate evaluator uses only three training walls, caps its target-relative score utility at twice the target, applies an arbitrary 0.025 value per future dollar per remaining shop, and can overfit. It has no pages, fortunes, pack purchases, burns, rerolls or host twists. Pattern-dependent gifts can therefore be dead offers. The comparison identifies the next modelling work: more training walls, income-value sensitivity, actual deck-changing shops, goal-aware lookahead and independent evaluation seeds. Do not reuse these win rates as the full game’s completion rate, or compare them directly to the earlier 74% simulation.

## Rollout and fun checks

Keep the current 23 as the integration baseline, with tuning behind a test configuration. Introduce the 37 additions in three batches:

1. **Twelve simple score experiments:** Odd Beads, Even Comb, Little Steps, High Peaks, Middle Path, Closed Fan, First Echo, Chow Drum, Pong Seal, Wind Sail, Four Tools, Dawn Rooster. Their rules teach chips versus mult and create visible preferences. Use the tested candidate values where listed above.
2. **Twelve build commitments:** Pair Bridge, Rainbow Bridge, Three Brothers, Silk Banner, Nine Windows, Gate Guardians, Balanced Scales, Quiet Scholar, Small Garden, Full Granary, Twin Peaches, Fourth Pillar. Gate advanced patterns/deck-size effects until the shop and teaching can support them. Three Brothers and Balanced Scales remain experimental.
3. **Thirteen opportunity-cost experiments:** Five Lanterns, Paper Fan, Jade Ox, Coin Belt, Empty Chair, Last Ember, Still Pond, East Compass, Pair Peddler, Kong Mint, Wind Courier, Tea Ledger, Spare Cup. Test purchase previews, remaining payouts and banking decisions explicitly.

For each playable batch, ask whether a dragon changes a player's next draw or discard, creates an understandable goal, and has a visible payoff. Track offered/taken/sold rates, activation conditional on deck support, signed score losses, unused resources and time spent inspecting the wall. Record player explanations (“I took this because…”) and whether a hint taught a repeatable idea. Bots cannot answer these questions.

A first playtest should cover a pair build, a chow pattern chase, a fourth-copy/kong build and a money build. Let players bank a won round. Show one contextual hint at a time, with a reason grounded in visible tiles. The rejected stack-swapping mechanic is absent.

## Art and integration handoff

The artist kit has a complete prompt for each ID. Six existing traced icons are marked for reuse; 17 existing briefs and 37 new briefs need generation (54 objects, nine proposed six-object sheets). Existing art subjects come directly from the current prompt kit. New objects use the same eight-colour flat style and require 18px/30px silhouette checks. This PR supplies briefs, not finished or approved images.

Port effect IDs and exact timing first, then reuse the fixture values in application-engine tests. Test empty-table score zero, additive-before-multiplicative order, duplicate ownership rejection, income only after a successful pre-shop round, upgrade replacement, and no payout on failure. Exhausting the wall does not consume unused plays: Last Ember must not activate merely because a round has no tiles left. Add physical enhancement cases in the app; this lab deliberately does not average enhancements across identical copies.
