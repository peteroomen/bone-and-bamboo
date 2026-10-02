# Dragon expansion laboratory

Goal: propose a substantial roster with exact rules, reproducible experiments, regression tests and an artist handoff. This is a design PR against main; the MVP builder owns application implementation.

Steps:
1. Preserve the 23 current dragons and propose 37 complementary dragons.
2. Implement a data-driven scoring laboratory using the current set prices, explicit contextual effects and public-information round policies.
3. Check every effect with fixtures, then compare paired seeded rounds across starting, prepared and levelled decks. Separate direct scoring, utility and income value.
4. Test combinations and a limited four-round dragon market; report model limits and recommendations, not human win-rate predictions.
5. Generate a catalogue and individual icon prompts from the same data and open a PR.

Manual review: reproduce the commands in tools/dragon-lab/README.md; inspect representative score breakdowns, inactive conditions, extreme combinations, income timing, and icon silhouettes at 30px when art arrives. Check implementation against this lab before adding content to the live pool.

Out of scope: application/UI changes, generating finished art, host twists, changing approved MVP numbers without review. The rejected stack swap remains excluded. Main currently has no package.json, so its pnpm gates are unavailable; Python compilation, unittest and simulation are the applicable checks for this isolated lab.
