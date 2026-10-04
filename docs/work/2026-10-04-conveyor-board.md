# Physical conveyor board prototype

The previous toy was a sorting interface. This experiment makes the conveyors themselves the game:
a 7×6 editable tabletop grid, one feeder, straight/corner belts, one configurable sorting junction,
and two fixed collection bays. Tiles move one cell each beat, queue when blocked, and visibly
collect into matching sets. Play/pause and single step; editing pauses. Preserve the previous toy
at ?factory=1, hand chase at ?chase=1 and classic at ?classic=1.

Plan: pure deterministic simultaneous-motion engine with collision/queue/loop tests; editable
board with smooth absolute-positioned tile animation and SVG belt paths; physical bay tile groups,
score stamps and clear jam feedback; test editing, turning, branching, scoring, reset and save/reload
on three viewports. Publish preview only after checks.

Scope: fixed feeder/two bays, unlimited belt pieces, one movable junction. Free building, no money,
no losing or timers. Friendly 40-tile supplier (bamboo pairs and dots runs), disclosed in UI. A working
starter layout makes movement immediate; clear-belt and rewind controls let the player rebuild.
No manual tile routing buttons. No factory economy, campaign, additional machines or generated art.

Manual test: press Play and watch the gate separate bamboo/dots into their bays. Pause, rotate a
belt to create a blockage, inspect the queue, repair it and resume. Clear belts and draw another route.
Use a corner, rotate a gate, edit its suit/rank filter, change an empty bay's set recipe. Rewind the
crate without losing the layout. Reload and verify pause + exact board restoration.

Validation: lint, type-check, 199 unit tests and production build pass. Targeted browser tests build
the starter topology from an empty board, run physical movement and scoring, deliberately block and
repair the feed, edit filters/recipes, rewind and reload at all three viewports. Screenshots inspected;
phone cells meet the 44px target. A 200-seed model completes the starter crate in 87 beats for 640
points without any blocked tile-beats. This is a friendly demonstration supplier, not a balance claim.
Existing large-bundle build warning remains. No dependencies added.
