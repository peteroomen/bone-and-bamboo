# Art review log

Generated art as it comes in, with the planner's review. Keepers are marked; other takes stay as
alternatives. Cutouts are checked on all three table colours at 60px (a host in a circle), 50px
(the sparrow beside a tip) and large.

## 2026-10-02 · Style trial, first batch

| File | Style | Verdict |
|---|---|---|
| `sparrow/trial-A-sparrow-a.png` | Shadow theatre | **Keeper.** Rivets, cloud-scroll vest and glowing leather all read; friendly eye; clear at 50px. |
| `sparrow/trial-A-sparrow-b.png` | Shadow theatre | Alt. Same puppet with a scowl: too stern for the guide. |
| `hosts/trial-A-fox.png` | Shadow theatre | **Keeper**, with a close crop on the head. Mask, tails, rivets and openwork are right; the tile is blank as asked. The head is small in the frame, so the whole figure is an orange blob at 60px; the game shows a head crop there. The host FORMAT now asks for a head at least a third of the width. |
| `sparrow/trial-B-sparrow-b.png` | Porcelain | **Keeper.** The raised-wing gesture is lovely and the cheek spot and bib read at 50px. The brushwork is feathery rather than flat Ming washes; beautiful, but a step towards watercolour. The far eye shows past the beak; invisible at game size. |
| `sparrow/trial-B-sparrow-a.png` | Porcelain | Alt. Same plate; the wing is less of a gesture. |
| `sparrow/trial-C-sparrow.png` | Papercut | **Keeper for now.** A true one-sheet cut with good moon-teeth feathers. It reads as a chick rather than a sparrow (no cap, cheek spot or bib); the guide prompt now asks for those as cut shapes. |

All six key out cleanly with `scripts/cutout.py` (no green fringe; the papercut's and the
fox's cut-away gaps go transparent as they should).

## 2026-10-02 · The guide becomes a dragon

The user chose a dragon as the guide: a young red dragon from the Red Dragon tile (中). The
sparrow images above stay in `sparrow/` as unused takes; the 1 of Bamboo keeps a sparrow as tile
art. The trial's guide prompt (`dragon`) replaces the sparrow's, in all three styles.

## 2026-10-02 · Dragon tiles are the jokers

Following Balatro (its mascot is a Joker card and its jokers are cards): the guide is the Red
Dragon tile come to life, and the jokers (curios in the simulators) are **dragon tiles**, each a
tile with a little dragon on its face. The frame shows rarity: White Dragon common, Green
uncommon, Red rare. Dragons leave the playable tile set; the honours are the four winds. The
guide prompt (`guide`) and four dragon sheets (`dragons-1` to `-4`) replace the earlier guide and
the curio object sheets; two object sheets remain for fortunes, packs and services.

## 2026-10-02 · The guide is the tile itself

Three generated takes of a dragon on a tile (`guide/unused/`) were set aside: the user wants the
guide to literally be the Red Dragon tile. It is now drawn in code (`guide()` in `tiles.js`): the
real tile with eyes, mouth, arms and feet, six moods and a blink, in every colourway. No image
prompt is needed for it.

## 2026-10-02 · Dragons are plain tiles

Only the guide is a character. The dragons (the jokers) are plain tiles with a picture of their
thing on the face and a White, Green or Red Dragon frame for rarity, exactly like Balatro's joker
cards. The dragon sheets now ask for objects (no faces or limbs) compact enough for an upright tile
face. Shadow theatre is the starting colourway.

## 2026-10-02 · Icons once, recoloured in code

Tiles and colourways stay in code. Icons for tile faces are generated once in a neutral TILE ICON
style (eight flat colours) and traced with a colour slot per shape; the game paints the slots per
colourway. The icon sheets leave the per-style trial (the trial is now 7 images: the fox and the
Azure Dragon in three styles, and dragon sheet 1 once).
