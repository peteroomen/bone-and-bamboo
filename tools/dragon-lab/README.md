# Dragon design lab

Run from the repository root, Python 3.10+ (standard library only):

```sh
python3 -m unittest discover -s tools/dragon-lab -v
python3 -m py_compile tools/dragon-lab/*.py
python3 tools/dragon-lab/experiment.py --n 128 --runs 48
python3 tools/dragon-lab/refine.py
python3 tools/dragon-lab/render_docs.py
```

Rendering also needs Node to read the existing art prompt constants. No application dependencies are required. `catalogue.py` is the editable effect source; generated `docs/dragons/catalogue.json` includes canonical existing art briefs and asset status. The runner checkpoints after the sweep, then after each market variant. Run the renderer after the experiment finishes. Fixed seeds and deterministic policies reproduce the same results; wall-clock timings are not recorded.

The lab reuses only the prototype's unenhanced tile/set detection, dealing, visible-wall refill and basic policy machinery. Scoring uses the latest six set prices, 23 current dragon IDs and 37 proposals. All added chips/mult resolve before all ×mult factors; final score is floored once. Empty tables score zero and empty conditional patterns do not activate. A unique dragon ID can occupy only one of five slots. Per-round resource modifiers are applied at round creation. No dragon has unmodelled permanent growth state.

Three policies provide sensitivity checks:
- `greedy`: old generic set heuristic, without dragon-specific priorities.
- `pongs`: holds pairs and spends discards seeking triples.
- `aware`: uses the exact current-table score delta and simple public-information tile preferences. It can still miss a multi-play pattern; it is not optimal.

The paired sweep tests all 60 on the same 128 walls for each of three decks and three policies: 70,272 round simulations including baselines. The prepared deck has nine fourth copies (ranks 2, 5, 8 in each suit) and three copies of every wind; it has $25 and one level in chows/pongs. The trimmed deck removes all 1s/9s and has $15 and one pair level. Diagnostic pass/income uses target 1,000 throughout the sweep; it is not a late-round survival test.

Seven five-dragon recipes × three policies × two tuning variants × 128 walls add 5,376 rounds. Most recipes use the prepared deck. Kongs use four copies of all numbered tiles; single-suit uses only Bamboo 2–8. These are deliberately prepared stress tests, not decks the shop reliably produces. The tuning experiment reduces Nest 6→3, Moon Gate 4→2, Abacus 2→1, Stone Lion 3→2 and Three Treasures 1.5→1.3. It is a candidate comparison, not an automatic game balance patch.

The limited market compares 48 fixed-policy, 48 adaptive-policy and 48 adaptive/tuned runs, with the four design targets. Candidate policies are evaluated before a purchase, including the changed cash balance. Owned income contributes to a heuristic utility as 0.025 per future dollar per remaining shop, separately from score. This arbitrary rate needs sensitivity testing before shipping an AI shopper. Full slots support gift replacement and sale-funded replacement. Training walls are disjoint from played walls. The policy uses three training seeds, so estimates are noisy. Offers use rarity weights 6/3/1; duplicate offers are possible but duplicate ownership is excluded.

Important limits:
- No host twists, physical enhancements, fortune use, pack buying, pages in the market, burn strategy or rerolls. Homogeneous tile copies are represented as suit/rank values; conservation tests compare multisets. Do not claim enhancement/physical-ID parity with the app.
- No tabled-pong upgrade action; direct hand kongs only. All scoring functions already treat the table as replaceable sets, but upgrade reachability and opportunity cost need engine tests.
- Optional banking is used in the market; the isolated sweep uses all plays. Banking is checked on a turn after refill, so the model does not measure saved refill taps.
- No human playtesting, no latency/UI test, no proof of fun or optimal strategy, no production-engine parity suite. Run the app’s pnpm checks when porting these effects.
- Confidence intervals describe paired sample means and exclude modelling error. No multiple-comparison correction. Medians can hide rare jackpots; inspect activation and p90.

Tests include all 60 exact effect fixtures and all 60 deterministic/conservation round cases, plus additive/multiplicative order, active/inactive thresholds, caps, wind direction, disjoint repeat counting, score loss, income timing, resources and hidden-wall invariance. Fixtures intentionally include prepared tables unavailable in the starting deck.
