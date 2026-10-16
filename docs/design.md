# Bone & Bamboo: game design (dice)

The rules and every number. Change a rule or a number here only with a simulator result to back
it (`docs/balance/`). Numbers marked *tune* are first guesses. The card-style design this replaced
is on `main` (and in git history); the plan for this rebuild is
`docs/work/2026-10-16-bone-dice.md`.

## The game in one paragraph

Mahjong with dice, for phones. Every face of every die is a mahjong tile. You roll your cup of
dice, hold the ones you like and roll the rest; whenever the faces showing make a set (a pair, a
chow, a pong, a kong) you take it onto your rack. Four sets and a pair is a hand: Mahjong! It
scores chips × mult, and every pattern it fits (All Pongs, Full Flush, Pure Straight, the Dragons)
multiplies the mult. Each round gives you a fixed number of rolls, shared by every hand you play
in it, so you choose: a few quick hands, or one big one. A run is eight rounds, two per wind.
Between rounds the teahouse sells charms (the jokers), new dice, tools that edit your dice, and
hand pages.

## Tiles and dice

| Kind | Tiles | Notes |
|---|---|---|
| Dots, Bamboo, Characters | 1-9 | suited: chows, pongs, kongs, pairs |
| Winds | East, South, West, North | honours: pongs, kongs, pairs; never a chow |
| Dragons | Red, Green, White | honours |
| Flowers | Plum, Orchid, Chrysanthemum, Bamboo | bonus faces (below) |
| Seasons | Spring, Summer, Autumn, Winter | bonus faces |

A tile is worth its rank in chips (an honour 10).

A die has a **shape** and a list of **faces** (`src/content/shapes.ts`, `src/content/dice.ts`).
Each face is a tile kind, or blank, and may carry an enhancement and lead.

| Shape | Faces | Character |
|---|---|---|
| Long die (a bar that rolls on its sides) | 4 | steady, few surprises |
| Cube | 6 | the standard |
| Eight-sided | 8 | wider |
| Twelve-sided | 12 | room for everything, sure of nothing |

Every face has a normal in the shape's own frame. The engine works out which faces are
neighbours (for the Thumb) and which is opposite (for the Oracle Shell) from those normals, and the
3D view builds its meshes from the same list, so face *i* is the same face everywhere.

**Starting cup: six bone cubes, each half Bamboo and half Dots, staggered so every run from 1 to 8
is there** (`STARTING_KITS.bone`). Chosen in the simulator: one-suit cups finish hands in ~7
rolls but make every hand a Full Flush; this cup takes ~9 rolls for a Chicken hand and leaves the
big hands to be built (`docs/balance/2026-10-16-dice.md`).

## A round

- **Cup 6 dice** (the Second Cup charm adds a seventh). **24 rolls** for the round, **2 returns**.
- **Roll:** every die not held is thrown (the first roll throws them all). Costs one roll.
- **Hold:** tap a die showing a face to keep it out of the next roll. Free.
- **Take:** when dice showing faces make a set, take it: their faces become tiles on your rack
  and those dice roll again next time. Free. One die showing the tile of a pong on your rack makes
  it a kong. A kong (taken or made) gives **1 free roll**.
- **The rack** holds four sets and one pair; or, once you take a second pair with no sets, up to
  seven different pairs (Seven Pairs).
- **Mahjong:** the moment the rack is complete the hand scores, the rack clears, and the next hand
  starts with whatever the dice show.
- **Return:** send a set from the rack back, to change plans. Each unused return pays $1.
- **Flowers and seasons:** when a die lands on one it goes to your shelf and the die rolls again
  (at most 3 times a roll). They count for the hand being built.
- **Bank:** once the round's score beats the target you may end the round. Each roll left pays
  $1 (up to $5). A hand left unfinished when the round ends scores nothing.
- Lose: the rolls run out (and you end the round) below the target. The run ends.

### Scoring a hand

1. Each set: its chips and mult, plus its tiles' chips.

   | Set | Chips | Mult |
   |---|---|---|
   | Pair | 5 | +1 |
   | Chow | 10 | +1 |
   | Pong | 25 | +2 |
   | Kong | 50 | +4 |

2. The hand (the Chicken hand): +20 chips, +2 mult; each Chicken page +15 chips, +1 mult.
3. Enhanced faces in the hand.
4. Flowers +25 chips, seasons +3 mult; the round's own flower or season counts double; all four
   flowers (or seasons) in one hand ×2.
5. Patterns: each one the hand fits multiplies (below).
6. Value sets: a pong or kong of the round's wind ×2, of a dragon ×1.5 (not with the dragon
   patterns).
7. Charms, left to right.

Score = chips × mult × every ×mult.

### Patterns (`src/content/patterns.ts`)

| Pattern | Rule | ×mult (+ per page) |
|---|---|---|
| Chicken hand | any four sets and a pair | (adds chips and mult) |
| All Chows | four chows and a pair | ×1.25 (+0.25) |
| All Simples | no 1s, 9s or honours | ×1.25 (+0.25) |
| Half Flush | one suit plus honours | ×1.5 (+0.5) |
| Seven Pairs | seven different pairs | ×1.5 (+0.5) |
| Outside Hand | every set and the pair hold a 1, 9 or honour | ×2 (+0.5) |
| Full Flush | one suit only | ×2 (+0.5) |
| Mixed Triple Chow | the same chow in three suits | ×2.5 (+0.5) |
| All Pongs | four pongs or kongs and a pair | ×2.5 (+0.5) |
| Pure Straight | 1-2-3, 4-5-6, 7-8-9 of one suit | ×3 (+1) |
| Triple Pong | the same number as a pong in three suits | ×4 (+1) |
| Little Three Dragons | two dragon pongs, the third as the pair | ×4 (+1) |
| Little Four Winds | three wind pongs, the fourth as the pair | ×6 (+2) |
| Big Three Dragons | a pong of each dragon | ×8 (+2) |
| All Honours | only winds and dragons | ×8 (+2) |
| All Terminals | only 1s and 9s | ×8 (+2) |
| Big Four Winds | a pong of each wind | ×12 (+3) |
| Nine Gates | 1112345678999 + one more, one suit | ×20 (+5) |

With dice, a flush is cheap (every die can hold its suit), so Full Flush is worth less than in the
table game; honour hands are dear (three dice must share each dragon). Values come from how many
rolls each pattern takes in the simulator.

### Guidance

- **The hand book** lists every pattern, sorted by how close your dice are to it: sets to go, a
  roll estimate and what it would score. Pick one to aim for; the rack shows its missing sets as
  ghost tiles and the guide plays towards it.
- **The guide's line** (hints on) says what it would do and why, with the exact chance for the next
  roll ("Hold what fits and roll: 29% to make a set you need, most likely s4 s5 s6"). Dice it would
  hold glow. Everything it uses is on the table: dice faces are public.
- Hold a die down to see all its faces and their chances.

## Charms (the jokers, `src/content/charms.ts`)

Five slots. Common $4, uncommon $6, rare $8; weights 6 / 3 / 1.

| Charm | Rarity | Effect |
|---|---|---|
| Thumb | uncommon | once per roll, tip a die onto a neighbouring face |
| Mirror | rare | once per hand, a die copies the face another die shows |
| Red String | uncommon | the two leftmost dice are tied: the second lands on the first's suit if it can |
| Counting Bead | common | the leftmost die steps to its next face instead of rolling |
| Paper Fan | common | once per hand, reroll one die for free |
| Oracle Shell | uncommon | once per hand, turn a die over to its opposite face |
| Second Cup | rare | a seventh die |
| Hourglass | common | +3 rolls a round |
| Ink Stone | common | +2 returns a round |
| Magpie | uncommon | +1 roll when a flower or season lands |
| Almanac | uncommon | flowers and seasons count double |
| Gold Toad | common | +$3 after each round |
| Lucky Knot | common | +5 mult |
| Coin String | common | +50 chips |
| Abacus | common | +2 mult per chow |
| Sparrow Nest | common | +5 mult per pair |
| Bamboo Grove / Coin Purse / Scroll | common | +8 chips per Bamboo / Dots / Characters tile |
| Moon Gate | uncommon | +4 mult per set with a 1, 9 or honour |
| Wind Chime | uncommon | +10 mult per wind pong or kong |
| Bell Hall | uncommon | ×2 with two or more pongs or kongs |
| Rice Bowl | uncommon | ×2 if no 1s, 9s or honours |
| Stone Lion | rare | +2 mult per tile in pongs and kongs |
| Great Bell | rare | ×2 per kong |
| Twin Cranes | rare | ×1.5 per pair of identical sets |

The cup's order matters for the Red String and the Counting Bead: arrange it in the teahouse.

## Tools (dice editing, `src/content/tools.ts`)

Used between rounds; the pocket holds two.

| Tool | Price | Effect |
|---|---|---|
| Chisel | $4 | carve a face into any tile you choose |
| Brush | $3 | change a face's suit |
| Nudge | $3 | move a face's number up or down one |
| Rubbing | $3 | copy one face onto another, on any die |
| Lead Weight | $4 | a face lands twice as often (up to three times) |
| Jade Leaf / Bone Inlay / Gold Leaf | $3 | +4 mult / +30 chips / +$1 when the face's tile scores |
| Glaze | $4 | porcelain: ×1.5 mult, 1 in 4 cracks (goes blank) after scoring |
| Blossom | $3 | a face becomes a random flower or season |

## Dice offers

Templates in `src/content/dice.ts`: run sticks, twin and triple cubes, two-suit cubes, wind and
dragon dice, terminal cubes, an eight-sided long run, garden and honour dice, the twelve-sided
whole suit and court die. Prices $4-7. The teahouse offers two; each host's gift is a choice of
three. With a full cup, a new die replaces one you choose.

## A run

Eight rounds, two per wind: a plain round, then the **host's round** with a twist and a gift.

- **Targets: 1,000 / 2,000 / 3,000 / 4,500 / 7,000 / 11,000 / 17,000 / 26,000.** Simulated: the
  smart bot wins 77%, the casual (random shopping) bot 18%; round 1 is won 98% of the time.
- **Money:** start $4. After a round: $3 (host round $5), +$1 a roll left (max $5), +$1 a return
  left, gold faces, Gold Toad, +$1 interest per $5 held (max $5).
- **Teahouse:** 2 charms, 2 dice, 2 tools, 1 hand page ($3); reroll the charms and dice $2 (+$1
  each time); sell a charm for half, a die for $2 (keep at least 3).

| Wind | Host twist |
|---|---|
| East | Gusts: hold at most two dice |
| South | Summer heat: 4 fewer rolls, every finished hand gives 2 back |
| West | Falling leaves: each finished hand blanks a random face for the rest of the round |
| North | Frost: a die you held can't be held on the next roll |

## Look and feel

- A 3D table (three.js through React Three Fiber): a felt dice tray, the rack of tiles, wooden
  table. The interface over it is HTML, styled as lacquer, gold and bone.
- **The engine decides every roll; the physics (cannon-es) only animates it.** A throw is
  simulated in full before it is shown; when a body comes to rest on some face, the mesh is drawn
  turned by a symmetry of the solid so the engine's face is on top, and a slow turn about the
  vertical brings its tile upright. Saves and replays stay exact.
- Dice faces and rack tiles are drawn by the tile generator (`src/ui/art/tiles.ts`) into textures,
  so colourways keep working.
- Sound: bone dice knocking (from the physics' collisions), the cup's shake, opera percussion
  for sets and the count.
