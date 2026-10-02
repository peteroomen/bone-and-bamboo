# Gameplay audit

Goal: establish which decisions deserve emphasis before changing balance or expanding content.
Review main b9ea93a and MVP 909dab5. Work is isolated from the builder's `mvp` branch.

Approach:

- Run the existing checks and current engine simulator.
- Use the real TypeScript engine for matched-seed round experiments: individual dragons,
  almanac levels, wall visibility, and a fourth-copy investment.
- Measure activation, scoring regressions, when the opening target is reached, and avoidable
  last-play mistakes. Separate bot weakness from content weakness.
- Audit host rules and shop policies against the latest design. Document ambiguities rather
  than silently choosing rules and presenting them as validated.
- Save a reproducible script, raw measurements, and a discussion report in docs/balance.

Manual checks: inspect the phone round layout and complete a round if the browser/toolchain
is available. Report any blocked checks explicitly.

Out of scope: changing production balance, implementing M4/M5, merging the builder's branch,
claiming bot win rates predict human enjoyment, or treating ownership correlation as causal.
