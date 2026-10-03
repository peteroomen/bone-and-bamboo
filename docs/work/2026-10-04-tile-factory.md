# Tabletop tile factory prototype

Goal: find out whether manually feeding familiar tiles into set-making machines, then automating a route, is satisfying. This is a toy prototype, not a commitment to a full factory game.

Approach: default preview becomes a wooden tabletop with a visible conveyor, pair press, triple kiln and run loom. The old complete-hand experiment stays at ?chase=1 and the original at ?classic=1. Use existing tile artwork and audio. Pure deterministic reducer, isolated replay save. No dragons, timers, failure targets, shops or full-hand recognition.

Starter crate: bamboo and dots 1–6. A fixed first eight tiles teach a pair, run and triple; subsequent small seeded batches contain shuffled manufacturable sets. This is deliberately a friendly supplier, not a full random mahjong pile. 68 tiles total. Score and spendable brass are separate. Pair 20, triple 45, run 60. Recycling earns 1 brass but no score. One 40-brass gate routes a chosen suit (or both) to a chosen compatible machine; unmatched tiles stop for manual intervention. Three storage slots, recoverable machine tiles, unlimited thinking time. Two shipped runs fulfil one 60-point / 30-brass order.

Steps: build content and reducer; verify legality, conservation, replay, gate safety and a seeded baseline simulation; build responsive tabletop interactions and guidance; play through sorting, holding, reclaiming, buying/configuring gate, autoplay, save/reload and shift completion; run repo gates and preview deployment.

Manual playtest: send two bamboo 2s to the press, bamboo 3–4–5 to the loom, dots 4–4–4 to the kiln. Buy a gate, select its suit/destination and watch it process a compatible tile. Try holding/reclaiming an awkward tile. See whether automating a route creates the desire to improve the factory.

Out of scope: freeform belt construction, new art assets, additional machines, full tile assortment, complex crafting chains, roguelike progression, production merge.

Validation: lint, type-check, 191 unit tests and production build pass. Browser playthroughs cover
manual matching, holding/recovery, gate purchase/configuration, automatic stopping, save/reload,
complete shift and restart at phone, small-phone and desktop sizes. Screenshots inspected; the
phone layout uses horizontal machine rows to keep each small set readable. A 200-seed baseline
completes every crate without stuck states; results and limitations are in the balance report.
The existing large JavaScript bundle warning remains; no dependencies were added.
