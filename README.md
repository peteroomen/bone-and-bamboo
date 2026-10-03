# Bone & Bamboo

A mahjong-tile roguelike for phones: play sets from a hand that refills from a face-down pile,
and beat four friendly hosts' scores, one per wind.

- Rules and numbers: [`docs/design.md`](docs/design.md)
- The MVP plan: [`docs/work/2026-10-02-mvp-plan.md`](docs/work/2026-10-02-mvp-plan.md)
- Accepted gameplay changes and builder handoff: [`docs/work/2026-10-02-playability.md`](docs/work/2026-10-02-playability.md)
- Gameplay audit and modelling: [`docs/balance/2026-10-02-gameplay-audit.md`](docs/balance/2026-10-02-gameplay-audit.md)
- Working in this repo: [`CLAUDE.md`](CLAUDE.md)

Sibling of Twelve Petals, a koi-koi roguelike.

## Deploying (Vercel)

The app is a static PWA; `vercel.json` holds the settings.

1. In Vercel, **Add New → Project** and import `peteroomen/bone-and-bamboo` (branch `main`).
2. Leave the detected settings: framework Vite, build `pnpm build`, output `dist`. Node 22 comes
   from `engines`, pnpm from `packageManager`.
3. Deploy. Open the URL on your phone and use **Add to Home Screen** to play offline.

The service worker and manifest are served with `max-age=0` so updates arrive on the next load;
hashed assets are cached for a year.

## Complete-hand playtest (preview branch)

The default app is the new hand-chasing prototype. Keep tiles in a 16-tile rack, exchange from
a random pile, and submit complete hands for built-in pattern bonuses. Four copies of every
numbered tile and wind; no dragons. Three plays, eight exchanges, four winds, and one pattern
upgrade between winds. Progress saves automatically; replay the same deal to try a new plan.

[Rules, simulation and playtest questions](docs/balance/2026-10-04-hand-chase.md).
The previous game is still available at `?classic=1`, with its own save.
