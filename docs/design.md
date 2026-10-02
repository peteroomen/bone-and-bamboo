# Bone & Bamboo: game design (MVP)

The rules and every number for the MVP. The planner owns this file; change a rule or a number
here only with a simulator result to back it (`docs/balance/`). Numbers marked *tune* are
first guesses the simulator should check.

## The game in one paragraph

A Balatro-style roguelike with mahjong tiles, for phones. You hold a hand of tiles and play sets
(pairs, runs, pongs, kongs) onto your table. When your plays run out, the whole table scores at
once: chips × mult. You refill your hand from **the wall**: face-up stacks where you can see the
top tile and the corner of the tile under it, so digging for the tile you want costs you the tiles
on top of it. A run is four rounds, one per wind, each hosted by a friendly spirit who sets the
score to beat and changes one rule. Between rounds the spirit leaves a gift and the teahouse sells
curios (passive), fortunes (single use, they change your tiles), almanac pages (level up a set
type) and tiles. A little red dragon who lives on the Red Dragon tile (中) teaches you.

## Tiles

| Kind | Tiles | Copies in a full set | Notes |
|---|---|---|---|
| Dots (筒) | 1-9 | 4 | suit `p` |
| Bamboo (條) | 1-9 | 4 | suit `s`; the 1 is the sparrow |
| Characters (萬) | 1-9 | 4 | suit `m` |
| Winds | East, South, West, North | 4 | honours: no rank, never in a run |
| Dragons | Red, Green, White | 4 | honours |
| Flowers, seasons | 4 + 4 | 1 | bonus tiles; not in the MVP's rules, art exists |

**Starting set: 3 suits, 1-9, 3 copies each = 81 tiles.** With 3 copies a pong needs every copy
of a tile and a kong is impossible, so 4th copies, winds and dragons are things you buy into your
set. Every physical tile has a unique id and may carry an enhancement.

Tile chips: a suited tile is worth its rank; an honour is worth 10.

## The wall

- At the start of each round your whole set is shuffled (seeded) and dealt round-robin into
  **8 stacks**, face up. The top of each stack is the last tile dealt to it.
- You see the top tile of each stack fully and the **top strip of the 1 tile under it** (the corner
  index shows there). A curio can raise this to 2. Deeper tiles are hidden; each stack shows how
  many tiles it holds.
- You take tiles only from the top of a stack, one at a time.

## A round

- **Hand 8 tiles. 8 plays. 3 discards** (each discard up to 5 tiles).
- Start: fill your hand to 8 by taking from stack tops, in any order you choose.
- Each turn, either:
  - **Play** one set from your hand onto your table (uses a play), or
  - **Discard** 1-5 tiles from your hand (uses a discard). Discarded tiles leave the round.
- Then refill your hand to 8 from the stack tops, one tap per tile. An **Auto** button refills for
  you using the hint bot (and the guide's hint shows which stack it would take from).
- If you hold no set and have no discards, you may play a single tile.
- The round ends after the last play (or when your hand and the wall are both empty). Then the
  table scores. Beat the target to win the round.
- A live preview always shows what the table would score now, and what the selected set would add.

### Sets

| Set | Tiles | Chips | Mult | Level up (almanac page) |
|---|---|---|---|---|
| Single | 1 | 5 | +0 | none |
| Pair | 2 alike | 5 | +1 | +5 chips, +1 mult |
| Chow | 3 in a row, one suit | 10 | +1 | +10, +1 |
| Pong | 3 alike | 40 | +4 | +15, +2 |
| Kong | 4 alike | 100 | +8 | +30, +3 |
| Three Dragons | one of each dragon | 60 | +6 | +20, +2 |
| Four Winds | one of each wind | 100 | +10 | +30, +3 |

Cheap chows and dear pongs are deliberate: chows come easily (about 6 of 8 plays for a bot),
pongs need every copy of a tile, and at these prices chasing pongs scores about the same as
playing chows, so both are real strategies (`docs/balance/2026-10-02-round.md`).

### Scoring

When the round ends:

1. chips = for each set: set chips + level chips + tile chips + enhancement chips
2. mult = for each set: set mult + level mult + enhancement mult
3. Curios apply left to right in your curio row: each may add chips, add mult or multiply mult.
4. Score = floor(chips × mult × product of the ×mult effects).

Every step is an engine event, so the UI can count it up the way Balatro does.

## A run

Four rounds: **East (spring), South (summer), West (autumn), North (winter).**

- **Targets (lantern 1): 1,000 / 4,000 / 9,000 / 18,000.** Simulated: the smart bot wins 71%, the
  casual bot 24%, and nobody loses in round 1 (`docs/balance/2026-10-02-run.md`). Miss a target
  and the run ends.
- **Money:** start with $4. After rounds 1-3 you are paid $10 / $12 / $14, + $1 per unused
  discard, + $1 interest per $5 held (max $5), + curio income.
- **After each of rounds 1-3:** the spirit's **gift** (pick 1 of 2 rare curios, free; if your
  curio row is full you may swap one out or decline), then the **teahouse**.

### Hosts and twists

Before each round you choose your host from two: the wind's **folk spirit**, or its **great
beast** (target ×1.5 *tune*, and its gift offers 3 rare curios instead of 2 plus $5). Each host
changes one rule for its round. Twists are data (`src/content/hosts.ts`), not engine special cases.

| Wind | Folk spirit: twist | Great beast: twist |
|---|---|---|
| East | **Fox spirit**, Masked: the tile under each stack top is hidden, but each tile you play that you took while it was hidden gives +2 mult | **Azure Dragon**, The coil: one stack is locked until you play a chow; chows score double chips |
| South | **Monkey spirit**, Swaps: after every 2nd play two stack tops swap; once a round you may swap two stack tops yourself | **Vermilion Bird**, Embers: 3 tiles in the wall are burning; play a set containing one for +3 mult, or it burns away when it reaches a stack top unplayed for 2 turns |
| West | **Jade Rabbit**, Moon tide: hand size +1, but discarded tiles go back to the bottom of a random stack | **White Tiger**, Claws: pongs and kongs score double chips; chows score half |
| North | **Kitchen God**, The report: each discard costs 25 points at the end; if you finish with no discards used, ×2 mult | **Black Tortoise**, The shell: 6 stacks instead of 8; the top tile of each stack is armoured until you play a pong or kong; kongs +4 mult |

All twists are *tune*: the run simulator does not model them yet (milestone M5 adds them).

### The teahouse (shop)

Every visit offers:

- **3 curios** (weights: common 6, uncommon 3, rare 1; never one you own)
- **2 almanac pages** ($3 each, a random set type each)
- **2 fortunes** ($3 each)
- **1 pack** ($4, or $5 for an honour pack): open it and choose 1 of its offers
- **Reroll** the curios ($2, +$1 each time this visit)
- **Burn a kind** ($5, once a visit): remove every copy of one tile kind from your set
- Sell a curio for half its price (rounded down)

Curio row: **5 slots**. Fortune pocket: **2 slots** (fortunes are used from the pocket at any
time outside a scoring animation: in the shop, or between turns in a round).

### Curios (passive, 21)

Prices: common $4, uncommon $6, rare $8. Ids are code ids.

| Curio | Rarity | Effect |
|---|---|---|
| `abacus` Abacus | common | +2 mult per chow |
| `redString` Red String | common | +6 mult |
| `coinString` Coin String | common | +50 chips |
| `bambooGrove` Bamboo Grove | common | +12 chips per Bamboo tile on the table |
| `coinPurse` Coin Purse | common | +12 chips per Dots tile on the table |
| `scroll` Scroll | common | +12 chips per Characters tile on the table |
| `sparrowNest` Sparrow's Nest | common | pairs +6 mult |
| `goldToad` Gold Toad | common | +$4 after each round |
| `pongHall` Pong Hall | uncommon | ×2 mult with 2+ pongs or kongs |
| `outside` Moon Gate | uncommon | +4 mult per set with a 1, 9 or honour |
| `ironTeapot` Iron Teapot | uncommon | +2 discards |
| `longSleeves` Long Sleeves | uncommon | +1 hand size |
| `lantern` Lantern | uncommon | see 1 tile deeper in every stack |
| `mahjong` Mahjong! | uncommon | ×2 mult with 4+ sets and a pair |
| `twoSuits` Two Fish | uncommon | ×1.5 mult if the table uses 2 suits or fewer |
| `allSimples` Rice Bowl | rare | ×2 mult if no 1s, 9s or honours on the table |
| `pureStraight` Nine Rings | rare | ×3 mult with 1-2-3, 4-5-6, 7-8-9 of one suit |
| `nightOwl` Night Owl | rare | +1 play |
| `kongBell` Kong Bell | rare | ×2 mult per kong |
| `dragonLantern` Dragon Lantern | rare | +12 mult per dragon set (Three Dragons or a dragon pong or kong) |
| `twinCranes` Twin Cranes | rare | ×1.5 mult per pair of identical sets |

Known from the simulator: Iron Teapot and Pong Hall are weak, Night Owl and Sparrow's Nest are
strong, and the rares reward chows more than pongs. Add rare pong and kong curios after the MVP.

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
| Dragons | $4 | add one of each dragon, or add 2 of one dragon |
| Winds | $4 | add one of each wind, or add 2 of one wind |
| Honour triple | $5 | 3 offered honours: add 3 copies of one |
| Almanac | $4 | 3 almanac pages |

## Difficulty: lanterns

Each tile set has 4 lanterns, lit one at a time by winning. Lantern 1 is the base. *tune*

| Lantern | Change |
|---|---|
| 2 | targets ×1.25 |
| 3 | + no interest |
| 4 | + targets ×1.5 (not ×1.25) and 2 discards |

## Tile sets (decks)

| Set | Rule | Unlock |
|---|---|---|
| Bone & Bamboo | the starting 81 | from the start |
| Two Rivers | Dots and Bamboo only, 1-9, 4 copies (72), + dragons ×2 | win a run |
| Jade Court | the 81, hand 9, 2 discards | win with 3 different hosts |

## The dragon guide (teaching)

The guide is a young red dragon from the Red Dragon tile (中, "centre", also "hitting the mark").
It is small and red so it never blurs with the Azure Dragon, East's great beast, which is vast and
blue-green. The 1 of Bamboo keeps its sparrow as tile art.

- **Guided first run:** the first East round is scripted: a fixed seed and a queue of tips (pick
  from a stack, a pair, a run, a pong, the preview, discarding to dig, the score count). The Rain
  Man's tip queue from Twelve Petals carries over: tips wait until the table is still and hold
  play until dismissed.
- **Hints (Settings), three levels:** off; *sets* (tiles in your hand that form a set glow);
  *full* (also mark wall tiles that would complete a set in your hand).
- **Ask the dragon:** a button that shows the hint bot's best move (a set to play, tiles to
  discard, or the stack to take from) with a one-line reason.
- **The set book:** every set type and curio rule with a picture, and your levels.

## Around the game

- Title: Continue, New run (tile set + lantern), Collection, Settings.
- Collection: tile sets and their lanterns, every curio (seen / owned / locked), hosts met,
  records (best round, best run, biggest single set).
- Settings: speed (normal, fast, instant), hints, sound, music, ambience, haptics, colourway
  (until the style trial picks one), credits, play offline, move your progress.
- Saves: the run state after every action (resume anywhere), plus the profile. Plain JSON.
- Offline: a PWA that precaches everything; Settings has the install panel and save transfer from
  Twelve Petals.

## Art and sound

- **Tiles** are drawn from code: `art-source/tiles/tiles.js` (port to TypeScript at
  `src/ui/art/tiles.ts`). Three colourways until the style trial decides.
- **Generated art** (hosts, the dragon guide, backdrops, object sheets) comes from the planner and the
  user, through `art-source/prompts/`. Until it lands, use the placeholders described in
  `docs/work/2026-10-02-mvp-plan.md`.
- **Sound** is synthesised as in Twelve Petals: bone-on-wood clacks for tiles, Chinese opera
  percussion (gong, cymbal, ban clapper) for plays and scoring, a sparse guzheng and dizi score.
