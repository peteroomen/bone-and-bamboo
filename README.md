# Bone & Bamboo

Mahjong with dice, for phones: every face is a tile. Roll, hold, take your sets onto the rack,
finish hands and beat the four winds.

- Rules and numbers: [`docs/design.md`](docs/design.md)
- The dice rebuild: [`docs/work/2026-10-16-bone-dice.md`](docs/work/2026-10-16-bone-dice.md)
- Simulator results: [`docs/balance/2026-10-16-dice.md`](docs/balance/2026-10-16-dice.md)
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
