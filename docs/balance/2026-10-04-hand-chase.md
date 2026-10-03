# Complete-hand preview baseline

A new, isolated playtest replaces cumulative meld tables with separate hand submissions. Defaults: 124 tiles (four copies of all numbered tiles and winds, no dragon tiles), rack 16, three scoring plays, eight exchanges of up to five tiles. No passive dragons, twists or shops in this mode. Between winds choose +2 mult for every complete hand or +4 for a specialist pattern. Targets: 200 / 700 / 1,200 / 1,800.

Small hands score flat points: pair 20, chow 35, pong 70, kong 150. A complete hand scores (180 + physical tile chips) × (4 + matching pattern mult + upgrades). Four melds and a pair normally use 14 tiles; one/two kongs use 15/16. Seven Pairs requires seven distinct tile kinds. No four-winds meld. Patterns and additive mult are in src/content/handChase.ts. Full Flush and Half Flush are mutually exclusive; compatible bonuses stack. The engine evaluates all decompositions and chooses the highest score. Unselected tiles remain held after each submission.

Reproduce: `pnpm sim:chase -- 200` (or `TSX_TSCONFIG_PATH=tsconfig.sim.json node --import tsx src/sim/handChase.ts 200`). Seeds 64000–64199. Public-information greedy structure bot: retain completed melds, a pair and near-melds, or chase seven pairs; submit complete hands or a small hand sufficient to clear, otherwise exchange. It never reads pile order. It always upgrades Complete Hand between winds; it is not a specialist pattern bot.

| Wind | Reached | Cleared | Median score at round end |
|---|---:|---:|---:|
| East | 200 | 130 | 960 |
| South | 130 | 90 | 1,476 |
| West | 90 | 59 | 1,960 |
| North | 59 | 33 | 2,330 |

33/200 runs won (16.5%). 303 complete hands among 839 submissions. No stuck runs. This establishes reachable hand completions, not human difficulty or fun. This preview is intentionally about decisions and payoff, not comparable to the previous wall/pile cumulative-scoring win rates. East's target can also be reached through valuable small hands; later winds need complete hands. There are no automatic penalties for choosing a small hand beyond spending a scarce scoring play.

Test coverage: exact scoring, overlapping decompositions, distinct seven pairs, honour restrictions, kong tile counts, retained tiles, independent scoring, resource limits, deterministic replay, progression, tile conservation, exhaustion, and hidden-pile invariance. Browser flows cover completion, reload, banking, pattern upgrades, four winds and replay at phone/small phone/desktop sizes. Human questions: do you understand what to keep, does exchanging create anticipation, can you pivot, and was your finished hand satisfying?

Known limits: rack 16 accommodates at most two kongs in a complete hand; no traditional winning conditions such as riichi/furiten/closed-hand rules. Suggestions maximise structural progress, not expected future score or named-pattern value. Waits show possible completions and unseen copy counts, not exact draw probabilities. Saves are separate versioned action logs under bb.hand-chase.v1; the original game remains at ?classic=1 with its own save.
