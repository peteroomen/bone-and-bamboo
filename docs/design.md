# Bone & Bamboo: game design (MVP)

> **Preview branch, 4 Oct:** the default is now the [toy factory](work/2026-10-04-tile-factory.md).
> The separate complete-hand playtest remains at `?chase=1`: 124 tiles,
> rack 16, three scoring plays and eight exchanges; built-in patterns, no dragons. See
> [the preview findings](balance/2026-10-04-hand-chase.md). The MVP rules below remain available
> at `?classic=1` for comparison. Preview scoring/targets are isolated from these rules.

The rules and every number for the MVP. The planner owns this file; change a rule or a number
here only with a simulator result to back it (`docs/balance/`). Numbers marked *tune* are
first guesses the simulator should check.

## The game in one paragraph

A Balatro-style roguelike with mahjong tiles, for phones. You hold a hand of tiles and play sets
(pairs, runs, pongs, kongs) onto your table. When your plays run out, the whole table scores at
once: chips × mult. Your tiles are shuffled into a face-down **pile**, and your hand refills from
it on its own after every play and discard, as in Balatro: a round is just *plays* and *discards*. A run is four rounds, one per wind, each hosted by a friendly spirit who sets the
score to beat and changes one rule. Between rounds the spirit leaves a gift and the teahouse sells
**dragons** (the jokers: dragon tiles with a passive power each), fortunes (single use, they change
your tiles), almanac pages (level up a set type) and tiles. The guide is the Red Dragon tile
itself, come to life, the way Balatro's Jimbo is a Joker card.

## Tiles

| Kind | Tiles | Copies in a full set | Notes |
|---|---|---|---|
| Dots (筒) | 1-9 | 4 | suit `p` |
| Bamboo (條) | 1-9 | 4 | suit `s`; the 1 is the sparrow |
| Characters (萬) | 1-9 | 4 | suit `m` |
| Winds | East, South, West, North | 4 | honours: no rank, never in a run |
| Dragons | Red, Green, White | none | not in play: the dragon tiles are the jokers (see Dragons) and the guide |
| Flowers, seasons | 4 + 4 | 1 | bonus tiles; not in the MVP's rules, art exists |

**Starting set: 3 suits, 1-9, 3 copies each = 81 tiles.** With 3 copies a pong needs every copy
of a tile and a kong is impossible, so 4th copies and winds are things you buy into your
set. Every physical tile has a unique id and may carry an enhancement.

Tile chips: a suited tile is worth its rank; a wind is worth 10.

## The pile

*Changed 2 Oct after playtesting: the wall of stacks was confusing. Plan and sim results:
`docs/work/2026-10-02-draw-pile.md`.*

- At the start of each round your whole set is shuffled (seeded) into one face-down pile, and
  your hand is dealt from its top.
- After every play, upgrade and discard, the hand refills from the top of the pile on its own.
- You cannot see into the pile (the Lantern dragon shows its next 3 tiles). The pile shows how
  many tiles it holds.

## A round

- **Hand 12 tiles. 8 plays. 4 discards** (each discard up to 5 tiles). Drawing blind loses the
  choice the wall gave, so the hand is bigger: at 12 and 4 the sim matches the wall's win rates.
- Start: your hand is dealt full.
- Each turn, either:
  - **Play** one set from your hand onto your table (uses a play), or
  - **Discard** 1-5 tiles from your hand (uses a discard). Discarded tiles leave the round.
- Then your hand refills from the pile.
- If no tile can be discarded (a twist forbids it) and you hold no set, you may play a single.
- If you hold no set and have no discards, you may play a single tile.
- **Upgrade a tabled pong:** select its fourth matching tile in your hand, then upgrade that
  tabled pong to a kong. **Proposed first implementation (validate in the sim):** one play,
  then refill normally. Replace the original set and score the four physical tiles once using
  the kong's level and bonuses. No fifth-tile upgrade.
- **Finish round:** once the current table beats the target, optionally bank it immediately,
  including before refilling. The proposed initial version uses the normal score count and
  payout, including unused discards; unused plays have no cash value. Continuing is optional. A capped over-target
  cash reward is approved for exploration but deferred until separately modelled.
- Otherwise the round ends after the last play (or when hand and pile are both empty). Then the
  table scores. Beat the target to win the round.
- A live preview always shows what the table would score now, and what the selected set or
  pong upgrade would add, with a proper signed delta. Warn explicitly when it breaks a dragon
  multiplier. A preview is never a promise that the next play cannot reduce the score.
- Conditional dragons show live progress: Bell Hall's pongs/kongs, Mahjong!'s four melds and
  pair, Nine Rings' three runs in a suit, Rice Bowl active/broken, Two Fish's suits, and the
  repeat counts for Twin Cranes and Great Bell. Empty tables show “not yet”, not success.

### Sets

| Set | Tiles | Chips | Mult | Level up (almanac page) |
|---|---|---|---|---|
| Single | 1 | 5 | +0 | none |
| Pair | 2 alike | 5 | +1 | +5 chips, +1 mult |
| Chow | 3 in a row, one suit | 10 | +1 | +10, +1 |
| Pong | 3 alike | 40 | +4 | +15, +2 |
| Kong | 4 alike | 100 | +8 | +30, +3 |
| Four Winds | one of each wind | 100 | +10 | +30, +3 |

Cheap chows and dear pongs are deliberate: chows come easily (about 6 of 8 plays for a bot),
pongs need every copy of a tile, and at these prices chasing pongs scores about the same as
playing chows, so both are real strategies (`docs/balance/2026-10-02-round.md`).

### Scoring

When the round ends:

1. chips = for each set: set chips + level chips + tile chips + enhancement chips
2. mult = for each set: set mult + level mult + enhancement mult
3. Dragons apply left to right in your dragon row: each may add chips, add mult or multiply mult.
4. Score = floor(chips × mult × product of the ×mult effects).

Every step is an engine event, so the UI can count it up the way Balatro does.

## A run

Four rounds: **East (spring), South (summer), West (autumn), North (winter).**

- **Targets (lantern 1): 1,000 / 3,600 / 8,000 / 16,000** (lowered with the pile). Simulated: the
  smart bot wins 68%, the casual bot 35% (`docs/balance/2026-10-02-draw-pile.md`). Miss a target
  and the run ends.
- **Money:** start with $4. After rounds 1-3 you are paid $10 / $12 / $14, + $1 per unused
  discard, + $1 interest per $5 held (max $5), + dragon income.
- **After each of rounds 1-3:** the spirit's **gift** (pick 1 of 2 rare dragons, free; if your
  dragon row is full you may swap one out or decline), then the **teahouse**.

### Winds and twists

Each round is hosted by **its wind tile**: 東 East, 南 South, 西 West, 北 North, drawn like every
tile (code body, traced face). There are no painted spirits for now; the wind tiles may later
become little characters like the guide. Before each round you choose how that wind blows:
**calm** (a gentle twist) or **storm** (a sharper twist, target ×1.5 *tune*, and its gift offers
3 rare dragons instead of 2 plus $5). Each choice changes one rule for its round. Twists are data
(`src/content/hosts.ts`, ids unchanged), not engine special cases. The names in brackets are the
twists' old spirit names, kept as ids only; the UI shows the wind tile, Calm or Storm, and the
twist's name and rule.

| Wind | Calm: twist | Storm: twist |
|---|---|---|
| East 東 | Masked (`fox`): hand size −1; each set of 3 or more tiles gives +1 mult | The coil (`azureDragon`): no discarding until you play a chow; chows score double chips |
| South 南 | Swaps (`monkey`): after every 2nd play a random tile in your hand goes back into the pile and you draw another; once a round you may swap a tile of your choice | Embers (`vermilionBird`): 4 tiles in your set are burning; play a set containing one for +4 mult, or it burns away after 2 turns in your hand |
| West 西 | Moon tide (`rabbit`): hand size +1, but discarded tiles are shuffled back into the pile | Claws (`whiteTiger`): pongs and kongs score double chips |
| North 北 | The report (`kitchenGod`): each discard costs 25 points at the end; if you finish with no discards used, ×2 mult | The shell (`blackTortoise`): your first hand is armoured (no discarding it) until you play a set; kongs +4 mult; target ×1.25 rather than ×1.5 |

All twists are *tune*: the run simulator does not model them yet (milestone M5 adds them). Until
M5, the choice screen shows the wind, the target and the reward, and labels the twist as coming
soon (see the accepted gameplay review below).

### The teahouse (shop)

Every visit offers:

- **3 dragons** (weights: common 6, uncommon 3, rare 1; never one you own)
- **2 almanac pages** ($3 each, a random set type each)
- **2 fortunes** ($3 each)
- **1 pack** ($4, or $5 for an honour pack): open it and choose 1 of its offers
- **Reroll** the dragons ($2, +$1 each time this visit)
- **Burn a kind** ($5, once a visit): remove every copy of one tile kind from your set
- Sell a dragon for half its price (rounded down)

Dragon row: **5 slots**. Fortune pocket: **2 slots** (fortunes are used from the pocket at any
time outside a scoring animation: in the shop, or between turns in a round).

### Dragons (the jokers, 23)

Balatro's jokers are cards; ours are tiles called **dragons**, and they do exactly the jokers' job.
Each is a plain mahjong tile with a picture of its thing on the face (an abacus, a lantern, three
bells), and a frame from one of the three dragon tiles shows its rarity: **White Dragon 白 =
common ($4), Green Dragon 發 = uncommon ($6), Red Dragon 中 = rare ($8)**. No faces or limbs: only
the guide is a character. The game draws the tile and frame (`tiles.ts`); the face picture is
generated art, traced.
In code the type is `Dragon` (it was "curio" in the simulators); the ids stay.

| Dragon | Rarity | Effect |
|---|---|---|
| `abacus` Abacus | common | +2 mult per chow |
| `redString` Red String | common | +6 mult |
| `coinString` Coin String | common | +50 chips |
| `bambooGrove` Bamboo Grove | common | +12 chips per Bamboo tile on the table |
| `coinPurse` Coin Purse | common | +12 chips per Dots tile on the table |
| `scroll` Scroll | common | +12 chips per Characters tile on the table |
| `sparrowNest` Nest | common | pairs +6 mult |
| `goldToad` Gold Toad | common | +$4 after each round |
| `pongHall` Bell Hall | uncommon | ×2 mult with 2+ pongs or kongs |
| `outside` Moon Gate | uncommon | +4 mult per set with a 1, 9 or wind |
| `ironTeapot` Iron Teapot | uncommon | +2 discards |
| `longSleeves` Long Sleeves | uncommon | +1 hand size |
| `lantern` Lantern | uncommon | see the next 3 tiles of the pile |
| `mahjong` Mahjong! | uncommon | ×2 mult with 4+ sets and a pair |
| `twoSuits` Two Fish | uncommon | ×1.5 mult if the table uses 2 suits or fewer |
| `allSimples` Rice Bowl | rare | ×2 mult if no 1s, 9s or winds on the table |
| `pureStraight` Nine Rings | rare | ×3 mult with 1-2-3, 4-5-6, 7-8-9 of one suit |
| `nightOwl` Night Owl | rare | +1 play |
| `kongBell` Great Bell | rare | ×2 mult per kong |
| `windChime` Wind Chime | rare | +12 mult per wind set (Four Winds, or a wind pong or kong) |
| `twinCranes` Twin Cranes | rare | ×1.5 mult per pair of identical sets |
| `threeTreasures` Three Treasures | rare | ×1.5 mult per pong *tune* |
| `stoneLion` Stone Lion | rare | +3 mult per tile in pongs and kongs *tune* |

Known from the simulator: Iron Teapot and Bell Hall are weak, Night Owl and Nest are strong,
and the original rares rewarded chows more than pongs. Three Treasures and Stone Lion are new rare
pong builds to balance that; they are untested, so M5's simulator pass must include them.

### Fortunes (single use)

Used from the pocket. Those that change tiles open the **set picker** (your whole set as a grid,
filterable by suit), or act on tiles selected in your hand during a round.

| Fortune | Effect |
|---|---|
| `rubbing` Rubbing | copy 1 tile in your set (a 4th copy makes kongs possible) |
| `fire` Fire | destroy up to 6 tiles from your set |
| `brush` Brush | change up to 3 tiles to one suit (choose the suit) |
| `jade` Jade | give 2 tiles the Jade enhancement |
| `bone` Bone | give 2 tiles the Bone enhancement |
| `gold` Gold Leaf | give 1 tile the Gold enhancement |

### Enhancements (MVP)

| Enhancement | Effect when the tile is on the table at scoring |
|---|---|
| Jade | +4 mult |
| Bone | +30 chips |
| Gold | +$2 at the end of the round if played |
| Porcelain | ×2 mult; 1 in 4 chance it cracks (is destroyed) after scoring (from packs only) |

The art kit also draws iron, wild, blank, lucky, the four editions and the four chops. They are
post-MVP.

### Packs

| Pack | Price | Choose 1 of |
|---|---|---|
| Fourth copy | $4 | 3 random tile kinds you own exactly 3 of: add a 4th |
| Winds | $4 | add one of each wind, or add 2 of one wind |
| Wind triple | $5 | 3 offered winds: add 3 copies of one |
| Almanac | $4 | 3 almanac pages |

## Difficulty: lanterns

Each tile set has 4 lanterns, lit one at a time by winning. Lantern 1 is the base. *tune*

| Lantern | Change |
|---|---|
| 2 | targets ×1.25 |
| 3 | + no interest |
| 4 | + targets ×1.5 (not ×1.25) and 3 discards |

## Tile sets (decks)

| Set | Rule | Unlock |
|---|---|---|
| Bone & Bamboo | the starting 81 | from the start |
| Two Rivers | Dots and Bamboo only, 1-9, 4 copies (72), + one of each wind | win a run |
| Jade Court | the 81, hand 13, 3 discards | win with 3 different hosts |

## Colourways (unlocks)

The colourway is the whole look: the tiles' colours, the table, the interface accents and the
generated art for hosts and backdrops. You start with one and unlock the others by playing; the
Settings picker lists only those you have, and the collection shows the locked ones as
silhouettes with their condition. *tune*

| Colourway | Unlock |
|---|---|
| Shadow theatre (bone faces, jade backs) | from the start |
| Porcelain (white glaze, cobalt) | win a run |
| Papercut (cream and red) | calm all four great beasts (choose and beat each wind's beast, across runs) |

More tile-only palettes (for example jade, midnight, gilded) can follow as lantern rewards after
the MVP; each is just a new entry in the tile generator's theme table. A development flag unlocks
every colourway for testing and screenshots.

## The guide (teaching)

The guide is **the Red Dragon tile itself**, the way Balatro's Jimbo is the Joker card: the real
tile, red 中 on ivory, with eyes, a mouth, little arms and feet. It is drawn in code by the same
generator as every tile (`guide({ theme, mood, blink })` in `tiles.ts`), so it always matches the
colourway and can be animated: it blinks, hops onto the table to give a tip, points at what it
means, and changes mood (idle, point, happy, think, wow, sad). The 1 of Bamboo keeps its sparrow.

- **Guided first run:** the first East round is scripted: a fixed seed and a queue of tips (your
  hand and the pile, a pair, a run, a pong, the preview, discarding to dig, the score count). The Rain
  Man's tip queue from Twelve Petals carries over: tips wait until the table is still and hold
  play until dismissed.
- **Hints (Settings), three levels:** off; *sets* (tiles in your hand that form a set glow);
  *full* (also outline the move the guide would make).
- **Ask the dragon:** show a legal action and its reason (play, discard, upgrade or bank),
  highlight the relevant tiles, and leave execution to the player. Final-play hints
  compare actual complete-table scores; earlier hints avoid breaking a multiplier when a
  scoring alternative is available. Advice uses visible tiles only, never the hidden pile.
- **The set book:** every set type and dragon rule with a picture, and your levels.

## Around the game

- Title: Continue, New run (tile set + lantern), Collection, Settings.
- Collection: tile sets and their lanterns, every dragon (seen / owned / locked), hosts met,
  records (best round, best run, biggest single set).
- Settings: speed (normal, fast, instant), hints, sound, music, ambience, haptics, colourway
  (among those unlocked), credits, play offline, move your progress.
- Saves: the run state after every action (resume anywhere), plus the profile. Plain JSON.
- Offline: a PWA that precaches everything; Settings has the install panel and save transfer from
  Twelve Petals.

## Art and sound

- **Tiles** are drawn from code: `art-source/tiles/tiles.js` (port to TypeScript at
  `src/ui/art/tiles.ts`). Three colourways, unlocked by playing (see Colourways).
- **Icons** (the pictures on the dragons, fortunes, packs and shop services) are generated once
  in one neutral style, traced into vector shapes that keep a colour slot each (ink, red, blue,
  green, gold, brown, pink, ivory), and painted by the game with the colourway's palette, like the
  tiles. One icon set serves every colourway.
- **Paintings** (hosts, great beasts, backdrops) are shelved for now: hosts are wind tiles and the
  table is a flat colourway colour. If paintings return they are per colourway, and come from the planner and the
  user, through `art-source/prompts/`. Until it lands, use the placeholders described in
  `docs/work/2026-10-02-mvp-plan.md`.
- **Sound** is synthesised as in Twelve Petals: bone-on-wood clacks for tiles, Chinese opera
  percussion (gong, cymbal, ban clapper) for plays and scoring, a sparse guzheng and dizi score.

## Accepted gameplay review (2 October 2026)

User decisions: **Bamboo Hook rejected**; live build goals, upgrading tabled pongs, optional early
finish, and more teaching/hints accepted. No stack-swapping dragon is to be built from the audit.
“Hunts” was interpreted as “hints” in the teaching request; no new hunt system is specified.
Evidence and limitations: `docs/balance/2026-10-02-gameplay-audit.md`. Implementation handoff:
`docs/work/2026-10-02-playability.md`. Include early-finish and upgrade experiments before
making win-rate claims.

The next slice completes the four-wind run, gifts, shops and save/resume. It adds a replayable
introductory teaching sheet and illustrated set book, plus persistent off/sets/full hint levels.
The full scripted first-run lesson queue remains M6 work. M5 host twists remain unimplemented;
the prototype host screen must say so instead of advertising inactive rules as working.

*Twists reworked for the pile (2 Oct): results in `docs/balance/2026-10-02-draw-pile.md`.*
