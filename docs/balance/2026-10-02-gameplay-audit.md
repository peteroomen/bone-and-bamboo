# Bone & Bamboo: gameplay and balance audit

The wall is the feature to build around. Paying hand space to uncover a wanted tile is a
readable, tactile decision that belongs to this game. The next prototype should make those
choices more rewarding, make builds start reliably, and let players recognise their progress.
Adding many more score multipliers would not resolve the present friction.

This is a discussion proposal, not a balance patch. Production rules and targets are unchanged.

## What was reviewed and tested

- Main `b9ea93a`: latest design and traced tile art; no application on that branch.
- MVP `909dab5`: M1-M3, a playable single round, real TypeScript engine and complete headless
  run/shop simulation. The interface stops after the round; a full human run is not yet playable.
- 400 smart-shopper and 400 casual-shopper runs, seeds 0-399, current default shop, gifts enabled,
  Fire 6, targets 1,000 / 4,000 / 9,000 / 18,000. Results reproduce the existing report:
  **74% / 33%** wins (CLI rounding), respectively. Smart final policy: 340 greedy, 60 pongs.
- 64 scenario/policy combinations × 1,000 seeded rounds, plus 6,000 instrumented decision rounds
  and 2,000 tables re-scored for proposed pong rares: **72,000 round experiments**. These do not
  include the additional round evaluations performed by the shopping bots.
- Seeds 900000-900999 for the round audit. Same seed and deck for item comparisons. Editing a
  deck changes the shuffle mapping, so fourth-copy and trimming comparisons are not identical
  physical deals. Both greedy and pong-hunting policies are reported.
- 117 unit tests passed; lint, typecheck, and production/PWA build passed.
- Browser verification: page loads, meaningful controls render, no reported browser errors;
  manually selected and played a chow and confirmed the score update. Inspected phone and
  small-phone screenshots. Existing browser suite: 11/12 initially passed. The failure assumed
  two bot actions always include a play; captured state showed two legal discards. The test now
  advances until two sets are played, bounded by the available discards and plays. All three
  affected viewport tests passed after that correction. Other nine tests were unchanged.

The frozen dependency install was rejected by the active minimum-release-age policy for four
packages. Verification used an isolated policy-compliant resolution of the repository's declared
ranges, with Vite 8.3.1, Vitest 5.0.3 and TypeScript 6.0.3. Repository package.json and lockfile
were unchanged. Chromium 153 was available at /tmp/chromium; this differs from the repo's pinned
Playwright browser. These results therefore verify the source with a compatible toolchain,
not the exact frozen dependency/browser combination.

## What the measurements say

Unlevelled starting deck, one item at a time, greedy bot. Gains below are the median of the
per-seed score changes, not the percentage difference between the two reported medians.

| Item or change | Median score | Median paired gain | Score effect triggers |
|---|---:|---:|---:|
| No item | 2,464 | — | — |
| Nest, pairs +6 mult | 6,600 | +175% | 100% |
| Moon Gate | 5,390 | +115% | 99.7% |
| Abacus | 5,129 | +91% | 100% |
| One chow page ($3, no dragon slot) | 4,811 | +83% | — |
| Mahjong! | 4,532 | +85% | 95% |
| Night Owl | 3,024 | +21% | Extra play |
| Lantern | 2,596 | +3% | Extra visibility |
| Long Sleeves | 2,596 | +3% | Extra hand space |
| Iron Teapot | 2,530 | 0% | Extra discards |
| Bell Hall | 2,464 | 0% | 35.3% |
| Great Bell / Kong Bell, no fourth copies | 2,464 | 0% | 0% |
| Kong Bell, one fourth copy of m5 | 2,497 | +1% | 1.2% |
| Kong Bell, fourth copies of m4/m5/m6 | 2,497 | +3% | 2.6% |

These are marginal early-build measurements, not a complete item tier list. Utility can improve
consistency or human control without a high median score gain. For example, **Lantern gives the
pong-hunting bot +24.5% median paired gain**, and mean pongs rise from 1.51 to 2.12. A zero median
also does not imply a zero mean or zero value on every seed; Bell Hall doubles qualifying tables.

Nest looks like a promising, understandable pair build. Its current common price and very large
immediate gain warrant testing a weaker effect or different price/rarity. Do not simply nerf it
until all builds feel equally small. Chow pages need similar attention: cheap permanent growth
without occupying a dragon slot can make buying them more attractive than taking an interesting
build risk. Compare prices and level increments with an adaptive shopper before choosing numbers.

### The opening can feel finished before it ends

With no items, the greedy bot crossed 1,000 by play five in **53.6%** of rounds, and by play seven
in **95.6%**. Successful crossings left **2.40 plays** on average. It reached the target in 99.6%
of these 1,000 seeds, so the earlier claim that nobody loses East is a sample result, not a rule.

This suggests testing an optional **Finish round** button once the live score beats the target.
Do not raise East's target simply to consume the remaining turns: that can kill runs before a
build exists. First test whether skipping completed work improves pacing. Then separately test a
small capped over-target reward if players need a reason to continue. Banking changes difficulty,
especially for conditional multipliers, so it must be included in the run simulation.

### Kongs need help getting started

Adding a fourth copy permits a kong; it barely makes one happen. In this sample a single fourth
copy produced a kong in 1.2% of greedy rounds and 0.5% of pong-hunting rounds. Even three fourth
copies only gave 2.6% and 0.9%. The pong bot immediately plays its triples, which particularly
undervalues kong potential. A kong-aware bot and human trials are needed before tuning odds.

A rare gift should offer a credible direction now. Options to prototype:

1. Give a kong-related reward with a useful enabler, or gate its appearance on an existing build.
2. Let the player add a fourth tile to a pong already on the table. Explicitly decide its play
   cost and whether it replaces that set's scoring; never accidentally count both sets.
3. Provide one deliberate wall manipulation that can retrieve a wanted copy, rather than only
   adding more copies and hoping they surface.

At the first gift in the current six-rare MVP pool, Kong Bell and Dragon Lantern are both
structurally inactive on the untouched starting set. A two-choice gift containing exactly those
two occurs with probability 1/15. The newer main design replaces Dragon Lantern with Wind Chime
and adds two rares, changing that probability; don't carry the old percentage across versions.

### New pong rares help scoring, but not the search

Main proposes Three Treasures and Stone Lion; neither is in the reviewed MVP. Re-scoring exactly
the same tables with their proposed effects gives:

| Policy | Base median | Three Treasures | Stone Lion |
|---|---:|---:|---:|
| Greedy | 2,464 | 3,696 | 4,480 |
| Pongs | 2,189 | 3,283 | 3,980 |

This measures the written scoring effects, without adapting play or shopping. It is encouraging
that pongs can pay more, but neither item fixes the difficulty of assembling them. Reward and
access need to be considered together.

## Correct the model before using it to nerf content

1. **Income is invisible to the smart shopper.** Gold Toad gives exactly the same score estimate
   as owning nothing, so the shopper will never buy it. It needs a remaining-round money horizon.
2. **A full row declines every gift.** The engine supports replacement; giftSmart does not use it.
   Early purchases can therefore exclude later build changes in the model.
3. **No rerolls, sales, or burn-a-kind strategy.** These are implemented engine actions but unused
   by both shoppers. This particularly understates deck shaping and build pivots.
4. **Buying is evaluated under the old play policy.** The bot switches between greedy and pongs
   only after shopping. A pong item can look bad before the bot changes how it plays.
5. **Casual is random shopping with competent tile play**, not a model of a new human player.
6. **Ownership win rates have survivor and selection bias.** Later gifts are disproportionately
   owned by runs that survived long enough to receive them. Use matching builds, acquisition
   round, offers seen, trigger rate, and replacement value instead.
7. **Neither model includes host twists.** The latest design also removed dragon tiles from the
   playing set, changed packs, and introduced two pong rares. The MVP still has the older content.

Keep the existing bots as regression baselines. Add a build-aware shopper and a kong/pattern-aware
policy; compare them on held-out seeds and never inspect hidden wall identities when choosing.

## Hints and score feedback need to protect the player's plan

With Rice Bowl, **8.4%** of instrumented rounds had an avoidably worse final play among legal
sets already in hand. The median avoidable loss among those cases was **1,440 points**. In seed
900000 the bot chose Bamboo 7-8-9 for a final score of **1,648**, while a pair of Bamboo 7s scored
**3,056**. No lookahead or secret information is required to choose the better move.

Across Rice Bowl rounds, 37% had a play that lowered the live score. Some are forced or may be
worthwhile earlier; they are not all bot errors. But the UI currently prefixes every score delta
with `+`, producing `+-...` for negative gains. Ask selects tiles without displaying whether it
recommends playing or discarding or explaining why. These are small, high-value improvements:

- On the final play, compare actual complete-table scores for every legal set.
- Show a proper signed delta, and a clear warning when a choice disables a multiplier.
- Display the hint action and reason, not just selected tiles.
- Show compact goal progress on each conditional dragon: e.g. two of three runs for Nine Rings,
  one of two pongs for Bell Hall, Rice Bowl active/broken.
- Use visible-wall and remaining-copy information to teach why a draw is useful.

The current scoring engine deliberately multiplies all ×mult effects at the end. Reordering the
dragon row cannot change the result. Decide whether ordering is just presentation or a genuine
future mechanic before teaching players to optimise it.

## Host design questions to settle before M5

- **Fox:** every drawable tile is the visible top tile. Define exactly what “taken while hidden”
  means: a tile that was previously underneath, a blind draw action, or something else. The
  interpretations can produce no bonus or an enormous bonus.
- **Tortoise:** define “armoured.” If armour prohibits taking every top tile until a pong is
  played, an empty starting hand cannot fill and the round cannot start. If it affects scoring,
  state the penalty. Do not silently implement one interpretation.
- **Kitchen God:** three 25-point penalties total 75, only 0.42% of the 18,000 target, alongside
  a ×2 reward for zero discards. That is a sharp all-or-nothing incentive. Model a policy that
  deliberately preserves discards and one that spends them; current bots don't value this rule.
- **Final beast:** the larger post-round gift and $5 have no gameplay value after the final round.
  It needs a visible reason to choose it there, such as the existing beast-completion unlock or
  a distinct victory record. The existing colourway unlock gives a long-term motive; communicate it.
- **Monkey:** swapping exposed tops changes which tile is over which under-tile, so it can matter.
  Telegraph the swap timing so it feels like a planable puzzle rather than arbitrary interruption.

## Recommended fun experiment

Keep the four-wind run for now. Test one small vertical slice with three recognisable directions:

| Direction | Player's repeated question | Supporting content |
|---|---|---|
| Pattern builder | Can I finish my three runs without breaking the plan? | Nine Rings; visible checklist |
| Match collector | Cash this pair, hold the triple, or upgrade a tabled pong? | Nest, Stone Lion, kong support |
| Wall digger | Is that buried tile worth taking its blocker? | Lantern and one new wall manipulation |

For a new wall dragon, my first candidate is **Bamboo Hook**: once per round, exchange a stack's
visible top tile with its visible second tile. It cannot affect deeper hidden tiles. That is a
small rule, an obvious animation, and a controllable answer to “I can see it, but can't reach it.”
Compare it with the existing +1 peek Lantern using an action-aware policy before pricing it.

A second candidate is **Echo Bell**: reward playing a wanted tile after deliberately digging it
out of a stack. Precisely define and mark eligible tiles in the UI; don't ask players to remember
invisible provenance. Start with one of these ideas, not both.

After the tutorial, test a modest opening choice of three build starters so East already has an
identity. It changes the entire difficulty curve, so use a separately modelled target ladder and
avoid gifting an unconditional powerhouse by accident. Gifts after later winds should either
support the current direction or offer a viable pivot, including an enabler when necessary.

Suggested order: hint/feedback corrections; clear host semantics; smarter shopping and kong
policy; one wall dragon plus optional early finish; only then retune prices and targets. Avoid
adding a map, more currencies, or many new modifiers until this loop feels good.

## Human playtest

Run short paired sessions of the existing prototype and the proposed slice, alternating order.
Use matching seeds where the rules allow. Include someone new to mahjong; explain “run”, “pair”,
and “three alike” before relying on chow/pong names.

Record time to first play, use of Auto, time spent after first beating the target, gift choices
that felt unusable, missed/understood multiplier conditions, and voluntary replay. Ask players to
explain their build in one sentence and identify one satisfying choice. Success is understanding
and wanting another run, not merely a higher win rate. These human results remain unmeasured.

## Reproduce

```bash
pnpm exec tsx --tsconfig tsconfig.sim.json src/sim/audit.ts 1000 > docs/balance/2026-10-02-audit-data.json
pnpm sim run --runs 400 --shopper smart --jobs 1
pnpm sim run --runs 400 --shopper casual --jobs 1
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm e2e
```

The audit contains checks for legal moves, round completion, experimental play/discard settings,
income-blind estimates, and current scoring-order behaviour. Output is deterministic on these
seeds. Raw measurements are in `2026-10-02-audit-data.json`; full-run CLI outputs are preserved in
`2026-10-02-audit-runs.txt`. Production code was not modified. The only existing-file correction
is the browser test's turn/play assumption.
