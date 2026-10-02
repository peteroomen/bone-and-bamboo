# Complete run and teaching slice

## Handoff status

The user asked to stop implementation here and commit findings/documentation straight to main
for another agent. This handoff contains no new gameplay implementation. Start from the current
`mvp` branch and recheck its latest status before building. The reviewed MVP revision was
`909dab51c0039d7fa828b6eb5eb6ef608371c2d2` (M1-M3); full run UI and host twists were still pending.
Do not assume unfinished local code from the review session is tested or part of the repo.

The reproducible audit and the small existing e2e correction are on `analysis/gameplay-audit`,
commit `edb4d3969220ff78215159b814198605db1904bd`. Its source changes are independent of this
docs-only handoff. Port the corrected opening-turn test when convenient.

## User decisions

- Reject Bamboo Hook: do not implement the proposed stack-swapping dragon.
- Accept live build-goal progress and multiplier-loss warnings.
- Accept upgrading a tabled pong when the fourth matching tile arrives.
- Accept optional early finish and exploring a capped over-target reward.
- Add hints and teaching. “Hunts” was interpreted as “hints” from the teaching context;
  no separate hunt system has been specified.

A one-play upgrade cost and early banking with normal payout/no extra reward are **implementation
proposals**, not simulator-validated balance decisions. Test those first. The user accepted the
ideas, not new target, price or reward numbers. Keep an over-target cash reward as a separate
experiment; measure its snowball effect before adding it to the economy.

## Build plan

Goal: make a whole four-wind run playable and teach the meaningful choices, incorporating the
user's accepted gameplay review. Bamboo Hook is rejected and is not part of this work.

1. Record decisions in design and milestone docs before implementation.
2. Add tabled-pong upgrades (one play; replace original scoring), optional early finish (normal
   payout; no new cash bonus), and trustworthy score-aware final hints.
3. Add live conditional-dragon progress, explicit hint action/reason, draw hints, hint settings,
   an introductory guide and an illustrated set book.
4. Finish payout, gift/swap, shop, packs, fortunes/set picker, sell, reroll, burn and four-wind
   navigation. Preserve engine saves across every phase. Keep controls accessible on small phones.
5. Verify engine invariants and meaningful UI flows, run deterministic simulations that compare
   banking and upgrade policies, inspect screenshots and publish to the existing MVP branch/PR.

Manual checks: play and refill; inspect signed preview and conditional goals; upgrade a tabled
pong; bank a qualifying table; choose and replace gifts; buy/use fortunes and packs; resume in
shop, gift and round; complete four winds; inspect 390x844, 360x640 and 1366x768 layouts.

Out of scope: the rejected wall dragon, over-target cash rewards, target/price nerfs, full M5
host twists, fully scripted M6 guide, M7 collections, audio and production deployment. The host
screen explicitly distinguishes current target/reward selection from future twist rules.


## Checks the builder should prioritise

- Upgrade preserves unique tile IDs/enhancements, consumes one proposed play, replaces (never
  duplicates) the original pong, uses kong levels, and cannot upgrade an existing kong again.
- Early finish is allowed only with a nonempty table meeting the current target, settles exactly
  once through normal score/payout events, and resumes correctly after a reload.
- Final hints compare actual legal scoring outcomes, including alternative physical copies of
  enhanced tiles; avoid relying on `findSets` to enumerate every enhanced-tile combination.
- Conditional goals use the scoring engine's conditions, warn about deactivation, and distinguish
  an empty table from an active multiplier. Ask must say whether to play, discard, draw or upgrade.
- Use visible information only. Model income over remaining rounds, gift replacements, policy
  changes during purchase evaluation, and deck-shaping actions before making new balance claims.
- Resolve Fox hidden-draw and Tortoise armour semantics before M5. Don't display inactive twists
  as if they already work. Main's newer dragon/pack design also needs syncing into the MVP code.
- Verify a complete four-wind UI run, gift replacement, shop purchases, fortunes, packs and saves
  at 390x844, 360x640 and 1366x768. Add meaningful regression cases, not only happy-path clicks.

The detailed evidence, seed ranges, old bot limitations, browser test correction and dependency
verification caveats are in `docs/balance/2026-10-02-gameplay-audit.md`. No new simulations of
banking or upgrades were completed before this handoff.
