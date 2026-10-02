# Art source

Everything the game's art is made from. The planner and the user generate and review the art;
the builder integrates what is committed here.

## Tiles (`tiles/`)

Drawn from code, not generated. `tiles/tiles.js` is the reference generator (every tile, the
back, enhancements, editions, chops, three colourways); the game's copy is `src/ui/art/tiles.ts`.
`node tiles/export.js` writes every tile as an SVG into `tiles/svg/<colourway>/`. `kit.src.html`
is the source of the "Bone & Bamboo Tiles" kit page (replace `/*TILES*/` with `tiles.js` to view
it). The characters need a CJK serif: Noto Serif SC (OFL), subset with `scripts/subset-fonts.py`
to these glyphs: 一二三四五六七八九萬東南西北中發梅蘭菊竹春夏秋冬再金書運.

## Generated art (`prompts/`)

Two kinds. **Icons** for tile faces (dragons, fortunes, packs, services) are made once in the
neutral TILE ICON style and traced; every traced shape keeps a colour slot (ink, red, blue, green,
gold, brown, pink, ivory) and the game paints the slots with the colourway's palette from
`tiles.js`. **Paintings** (hosts, beasts, backdrops) are made per style, one set per colourway.

Image prompts for ChatGPT, built like Twelve Petals': a STYLE block, a VIBE, a FORMAT, the
SUBJECT and a FINAL REMINDER, pasted as one prompt into a fresh chat. `prompts/prompts-data.js`
holds every block and subject; `prompts.src.html` is the "Bone & Bamboo Art Prompts" page (copy
buttons); `prompts.md` lists the round 1 trial prompts.

- **Round 1, the style trial:** the Fox Spirit, the Azure Dragon and the first sheet of dragon
  tiles (the jokers). The guide is drawn in code (`tiles/tiles.js`, `guide()`), not generated.
  in each of three styles: A shadow theatre, B porcelain, C papercut. The winner sets the
  colourway and the style for everything after.
- **Round 2:** the other hosts and beasts, four backdrops, dragon sheets 2-4, object sheets 1-2.

Originals go in `hosts/`, `guide/`, `dragons/`, `backdrops/` and `objects/` under the file names the prompt
page gives. Processing (planner):

- Figures on green: `python3 scripts/cutout.py art-source/hosts/ID.png src/ui/art/portraits/ID.webp`
  (`pip install pillow numpy scipy`).
- Icon sheets: `scripts/trace-charms.py` from Twelve Petals traces a sheet of six into vector
  paths. Adapt it before first use: snap pixels to the eight icon colours, and write each path
  with its slot name instead of a colour, so the game can recolour it per colourway.
- Backdrops: convert to WebP at quality 78.
