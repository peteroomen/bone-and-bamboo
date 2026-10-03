# Complete-hand playtest on preview

Goal: replace the feeling of placing unrelated melds with retaining useful tiles, exchanging others and submitting a recognisable hand. Random pile is committed. No dragon tiles; 124 tiles (four copies of 27 numbered kinds and four winds). Pause passive dragons in this focused preview as well.

Implementation: isolated pure hand classifier and reducer, 16-tile rack, limited submissions and exchanges, built-in patterns, exact selected-hand preview, visible-information suggestions and remaining-copy waits. Retain unplayed rack tiles after scoring. Four winds with a choice of general (+2) or specialist (+4) pattern upgrade between them. Separate versioned preview save to preserve existing runs. Existing game remains reachable at ?classic=1 for comparison.

Steps: implement scoring/decomposition, conservation/replay tests and seeded simulations; build phone-first preview screen with existing tile art and audio; test complete hands, fallback submission, exchanging, reload, upgrades and end/restart on phone/small phone/desktop; publish preview branch.

Tune rack/exchange budgets and targets from a documented baseline simulation. No claim that a bot establishes fun. Test exact ambiguous decompositions, seven distinct pairs, honour restrictions, extra kong tiles, invalid selections and no duplicate physical tile use.

Manual playtest: chase one complete hand, change plan after an exchange, compare cashing a small meld against waiting, inspect pattern guide, clear a wind and choose a bonus. Feedback wanted: was there an understandable next tile, enough control, and a satisfying payoff?

Out of scope: full riichi rules/opponents, flowers, dragon tiles, passive expansion, shop economy, production merge.

Validation: lint, type-check, 183 unit tests, all 105 browser cases across three viewports, and production build pass. A 200-seed public-information simulation completed without stuck states; results and limitations are in the balance report. Production build retains the existing large-bundle warning.
