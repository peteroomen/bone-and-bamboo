/* Bone & Bamboo image prompts. One source for the prompt kit page and prompts.md.
 * A full prompt = STYLE[style] + VIBE[kind] + FORMAT[kind] (with the style's background) + SUBJECT + FINAL[style].
 */
(function (root) {
  "use strict";

  var STYLES = {
    A: {
      name: "Shadow theatre",
      style: "STYLE A · SHADOW THEATRE (keep identical for every image)\n" +
        "Art for a Chinese mahjong-tile game, made as a real traditional Chinese shadow puppet (piying), the dyed-leather puppets of Shaanxi and Hebei shadow theatre, laid flat against a light so its colours glow. It must look like a genuine hand-cut puppet, not a modern illustration inspired by one.\n" +
        "- Material: thin translucent dyed leather, cut with a knife. Its colours glow as if lit from behind: clear, saturated vermilion, pine green, amber and indigo, with black.\n" +
        "- Line and pattern: every shape is defined by its cut edge and a few bold openwork patterns carved through the leather (cloud scrolls, coin shapes, simple flowers). Patterns are large and few, never lace-fine.\n" +
        "- Construction: figures are flat pieces joined at shoulders, elbows, hips and knees by small round rivets, and the joints show. A thin dark control rod may run from the neck or a hand.\n" +
        "- Faces follow real puppets: a clear profile or three-quarter view, one large readable eye, a simple carved line for the mouth.\n" +
        "- Shape: large, simple flat shapes and a strong silhouette. No shading, no 3D lighting, no texture beyond the faint grain of the leather.\n" +
        "- Do not drift into: red-only paper-cut art, 3D rendering, realistic animals, anime or cartoon styling, glow effects or lens flare.",
      final: "FINAL REMINDER\nA genuine Chinese shadow puppet of glowing dyed leather: cut edges, a few bold openwork patterns, visible rivets at the joints, flat colour. Follow the FORMAT for the frame and background exactly. A large, readable face. At most one held item. No text, no seal, no border.",
      bg: "green",
      beastBg: "The background is an evenly lit warm amber paper screen, the puppet pressed flat against it, with at most three simple cut-out props (a moon, one band of cloud, a few petals or flakes) placed high and towards the edges.",
      backdrop: "The scene is the lit paper screen of a shadow theatre: an evenly glowing warm amber screen with the season's scenery as flat cut-leather props pressed against it, in the same glowing dyed colours."
    },
    B: {
      name: "Porcelain",
      style: "STYLE B · BLUE-AND-WHITE PORCELAIN (keep identical for every image)\n" +
        "Art for a Chinese mahjong-tile game, painted as the decoration on real Ming-dynasty blue-and-white porcelain (qinghua): cobalt painted on white porcelain under a clear glaze. It must look like a genuine painted plate, not a modern illustration inspired by one.\n" +
        "- Line: fine, confident cobalt brush outlines with a little variation in weight, as painted by a skilled kiln painter.\n" +
        "- Colour: cobalt blue only, in three or four strengths, from a pale wash to the darkest heaped blue where the cobalt pooled, on white glaze. One exception: a single small accent of underglaze copper red, used once at most. No other colours.\n" +
        "- Fill: flat washes of blue inside the outlines; the white glaze shows through as the light areas. The only gradient is the soft edge of a brush wash.\n" +
        "- Surface: the soft sheen of glaze, seen straight on. No crackle, no chips, no plate shown at an angle, no 3D object.\n" +
        "- Shape: large, simple shapes with calm white areas between them; fewer, bigger shapes rather than many small ones.\n" +
        "- Do not drift into: Delftware, willow-pattern transfer prints, tattoo flash, watercolour on paper, digital vector art.",
      final: "FINAL REMINDER\nGenuine Ming blue-and-white: cobalt brushwork in a few strengths on white glaze, one small copper-red accent at most. Follow the FORMAT for the frame and background exactly. A large, readable face. At most one held item. No text, no seal, no border.",
      bg: "plate",
      beastBg: "The picture is the central medallion of a plate: a circle of white glaze filling the square edge to edge, with one thin cobalt ring at its edge. Outside the circle, the four corners are flat chroma-key green (#00FF00). Inside, the glaze is almost empty: at most three simple items (a moon, one band of cloud, a few waves or flakes) placed high and towards the edges.",
      backdrop: "The scene is painted in cobalt on a white porcelain panel, like the landscape panel of a large vase, seen flat and straight on, filling the image edge to edge."
    },
    C: {
      name: "Papercut",
      style: "STYLE C · PAPERCUT (keep identical for every image)\n" +
        "Art for a Chinese mahjong-tile game, made as a real Chinese paper-cut (jianzhi): cut from one sheet of red paper with scissors and a knife, as hung in windows at New Year. Genuine folk paper-cutting, not a modern vector illustration inspired by one.\n" +
        "- Material: one sheet of vermilion red paper. The whole figure is one connected piece; every line is paper left between cuts.\n" +
        "- Detail: interior detail is cut away in the traditional marks: crescent 'moon-teeth' for fur and feathers, sawtooth edges, round holes for eyes, swirls and small flowers on bodies and haunches. Patterns are large and few.\n" +
        "- Colour: the red paper only, plus at most small pieces of black paper for eyes. No shading, no gradients, no outlines in another colour.\n" +
        "- Shape: a bold, readable silhouette with plenty of cut-away space inside.\n" +
        "- Do not drift into: 3D paper craft, layered shadow boxes, origami, stencil spray art, tattoo flash, digital vector art.",
      final: "FINAL REMINDER\nA genuine Chinese folk paper-cut: one connected sheet of red paper, moon-teeth and sawtooth cuts, black only for eyes. Follow the FORMAT for the frame and background exactly. A large, readable face. At most one held item. No text, no seal, no border.",
      bg: "green",
      beastBg: "The background is a flat sheet of warm cream paper, the red paper-cut laid on it, with at most three small cut items (a moon, one cloud, a few flakes) placed high and towards the edges.",
      backdrop: "The scene is one large red paper-cut laid on warm cream paper, like a window flower for a whole window, with the season's scenery cut as one connected piece."
    }
  };

  var BG = {
    green: "- The background is a flat, solid chroma-key green (#00FF00) and nothing else: one perfectly even colour with no shadow, no gradient, no texture, no scenery and no floating objects. It is only there to be cut away.\n" +
      "- No green of that brightness anywhere in the figure; any green in it is a dark pine green. A clean dark edge runs everywhere the figure meets the green, including along the bottom edge.",
    plate: "- The picture is the central medallion of a plate: a circle of white glaze filling the square image edge to edge, with one thin cobalt ring at its edge. Outside the circle, the four corners are flat chroma-key green (#00FF00). Inside the circle the glaze is the background: plain white, no scenery."
  };

  var VIBE = {
    guide: "VIBE (the guide)\nThe player's friend and teacher: the Red Dragon tile of the mahjong set, come to life, like the Joker card that hosts Balatro. A young red dragon painted on the tile leans out of it to talk. Bright, quick, a little bossy and very kind, like a teahouse regular who knows every trick at the table and can't help telling you. Small and spirited, not fearsome; gentle humour, never silly, never a sticker mascot.",
    dragons: "VIBE (the dragon tiles: keep identical for every sheet)\nIn this game the jokers are dragon tiles: each is a mahjong tile whose face shows a little dragon with the thing its power is about. These are those little dragons: small, round-faced young Chinese dragons, each with its own personality (proud, greedy, sleepy, smug, busy), always charming, never fearsome. The same dragon design every time (short snout, big round eyes, two short antlers, whiskers, a tuft of mane), told apart by colour, pose and prop.",
    host: "VIBE (spirit hosts: keep identical for every spirit)\nThis spirit is the player's host for one wind of the year, not an enemy. It sets a score to beat and changes one rule, like a sporting rival at a teahouse table who loves a good game. Sly, playful, proud or fussy, with a personality you can read at a glance. Never menacing, never horrific, never a cute mascot either. The subject says its exact mood.",
    beast: "VIBE (the great beasts: keep identical for every beast)\nOne of the Four Symbols, the great celestial beasts of the four directions. It hosts the hardest table of its wind: majestic, ancient and a little intimidating, like meeting a mountain that wants to play mahjong. Awe rather than fear, with a glint of humour in the eye. Never monstrous, never cute.",
    sheet: "",
    backdrop: ""
  };

  function FORMAT(kind, S) {
    if (kind === "guide") {
      return "FORMAT (the guide)\n" +
        "- The guide is shown as a small circle beside the game's tip bubbles, down to 50 pixels wide. The tile stands upright in the centre, filling about 80% of the image's height, seen straight on. The little dragon's head is large and leans out past the tile's top corner, so the face is clearly readable at 50 pixels; nothing competes with it.\n" +
        (S.bg === "plate" ? BG.plate : BG.green) + "\n" +
        "- One square image, 1:1. No border, no frame, no mockup.\n" +
        "- Only the one tile, and its face carries the dragon, not a written character. No text, letters, characters, numbers, seal stamp, signature or watermark anywhere.";
    }
    if (kind === "host") {
      return "FORMAT (spirit hosts: keep identical every time)\n" +
        "- The figure fills about 75% of the image with clear space above and to the sides. The whole figure fits inside the frame, or it is cut off cleanly by the bottom edge at the chest or waist. Nothing runs off the top or the sides.\n" +
        (S.bg === "plate" ? BG.plate : BG.green) + "\n" +
        "- One square image, 1:1. No border, no frame, no mockup, no scroll around the picture.\n" +
        "- This portrait will be cropped to a circle and shown as small as 60 pixels. Everything important stays inside the central circle; the face is large, centred left to right, with the eyes about a third of the way down. The head is at least a third of the image's width: show the figure from the waist up rather than shrinking the head to fit tails, wings or a wide robe.\n" +
        "- The spirit holds at most one item, and only the one the subject names.\n" +
        "- Any mahjong tile shown is small and simplified: a plain rectangle with one simple dot or stick shape on its face and a plain back, no writing.\n" +
        "- No text, letters, characters, numbers, seal stamp, signature or watermark anywhere. No blood, no gore. Women and children are never sexualised.";
    }
    if (kind === "beast") {
      return "FORMAT (the great beasts: keep identical every time)\n" +
        "- The beast is too big for the frame: body, wings, tail and claws may run off the edges, but the head never does. A slightly low angle, so it looms, and it looks straight at the viewer.\n" +
        "- " + S.beastBg + " No scenery, no buildings, no ground, no scattered small objects.\n" +
        "- One square image, 1:1. No border, no frame, no mockup.\n" +
        "- This portrait will be cropped to a circle and shown as small as 60 pixels. Everything important stays inside the central circle; the face is large and centred, with the eyes about a third of the way down.\n" +
        "- It holds at most one item, and only the one the subject names.\n" +
        "- No text, letters, characters, numbers, seal stamp, signature or watermark anywhere. No blood, no gore.";
    }
    if (kind === "dragons") {
      return "FORMAT · DRAGON SHEET (keep identical every time)\n" +
        "- One square image, 1:1, holding six separate little dragons, each with its prop, in a neat grid of 3 columns and 2 rows, in the order the subjects are listed: the top row left to right, then the bottom row. Each sits alone in its own invisible cell with wide empty space around it, never touching another or the edges.\n" +
        "- Each dragon and its prop are seen from the front, centred in the cell, filling about 70% of it, in a compact pose that would fit on the face of an upright mahjong tile (a little taller than wide). The game draws the tile and its frame; do NOT draw a tile, a frame or a border.\n" +
        "- Colour by rarity, as the subject says: a WHITE dragon is ivory white with pale blue markings; a GREEN dragon is jade green; a RED dragon is vermilion with gold. In a one-colour style, keep the style's colour and let the pose and prop carry it.\n" +
        "- The background is a flat, solid chroma-key green (#00FF00) and nothing else: no shadow, no ground, no gradient, no grid lines, no texture. No green of that brightness in the dragons: green dragons are a deep jade, clearly darker than the background.\n" +
        "- These will be traced into vector shapes and shown about 40 pixels wide. So: a thick, even dark edge closes every shape, every colour area is one flat fill, no detail smaller than about 1/25 of a cell, a large readable face. No hatching, texture, shine, drop shadows or glow.\n" +
        "- No text, letters, characters, numbers, labels, seal stamps, signatures or watermarks anywhere. Books, scrolls and tiles are blank.";
    }
    if (kind === "sheet") {
      return "FORMAT · OBJECT SHEET (keep identical every time)\n" +
        "- One square image, 1:1, holding six separate objects in a neat grid of 3 columns and 2 rows, in the order the subjects are listed: the top row left to right, then the bottom row. Each object sits alone in its own invisible cell with wide empty space around it, never touching another object or the edges.\n" +
        "- Each object is upright, seen from the front or a little from above, centred in its cell and filling about 70% of it.\n" +
        "- The background is a flat, solid chroma-key green (#00FF00) and nothing else: no shadow, no ground, no gradient, no grid lines, no texture. No green of that brightness in the objects; leaves and bamboo are dark pine green.\n" +
        "- These objects will be traced into vector shapes and shown as small as 18 pixels. So: a thick, even dark edge closes every shape, every colour area is one flat fill, and there is no detail smaller than about 1/25 of a cell. No hatching, texture, shine, highlights, drop shadows or glow.\n" +
        "- Colours only from the STYLE's palette.\n" +
        "- No text, letters, characters, numbers, labels, seal stamps, signatures or watermarks anywhere, on the objects too. Books, envelopes and tiles are blank or carry one simple flower, dot or stick shape.";
    }
    if (kind === "backdrop") {
      return "FORMAT (backdrops: keep identical every time)\n" +
        "- One wide image, 3:2 (1536 x 1024). " + S.backdrop + "\n" +
        "- The game's table sits over the middle, so the middle third is quiet: sky and a low horizon only. The interest is at the left and right sides and in the lower half.\n" +
        "- A sun or moon, if any, sits below the top quarter of the image.\n" +
        "- Nothing falling or flying (the game animates petals, leaves, fireflies and snow on top). No figures, no animals, no people.\n" +
        "- No text, letters, characters, seal stamp, signature, border or frame.";
    }
    return "";
  }

  var SUBJECTS = [
    // the guide
    { id: "guide", kind: "guide", group: "The guide", trial: true,
      text: "SUBJECT: The Red Dragon tile, the player's guide\nRole in the game: it teaches the rules and gives tips in speech bubbles, like the Joker who hosts Balatro. It is the Red Dragon tile of the mahjong set come to life.\nOne upright mahjong tile: an ivory face on a thick jade-green back that shows along its side, with softly rounded corners. Painted on its face is a young red Chinese dragon (red body, gold belly scales, a short snout, big round bright eyes, two short gold antlers, long curling whiskers, a tuft of flame-like gold mane), and the dragon has come alive: its head, one arm and its tail curl out past the tile's edges, its body still on the face.\nHolds: nothing; one clawed hand is raised with a finger up, making a point.\nMood: bright, cheeky and kind, mid-sentence. At 50 pixels, the tile's shape, the red dragon's head and its big eyes are what read. Never a lizard or a Western dragon (no bat wings)." },
    // spirit hosts
    { id: "fox", kind: "host", group: "Spirit hosts", wind: "East", trial: true,
      text: "SUBJECT: The Fox Spirit (húli jīng), host of the East wind\nGame twist: 'Masked': covered tiles stay face down until you take them, but each one you use scores extra.\nA russet fox spirit with three bushy tails fanned behind it, standing upright on its hind legs like a person, in a short jacket. A painted opera mask is pushed up on top of its head, and its own narrow, amused eyes look at the viewer. Drawn as a fox, not as a woman.\nHolds: one mahjong tile, turned face down so only its plain back shows, held up to its chest like a secret.\nMood: sly and delighted, sure it knows something you don't." },
    { id: "monkey", kind: "host", group: "Spirit hosts", wind: "South",
      text: "SUBJECT: The Monkey Spirit, host of the South wind\nGame twist: 'Swaps': every few turns it swaps two tiles on the wall, and you may swap two as well.\nA golden snub-nosed monkey (the golden monkey of the Qinling mountains): a bright blue face with a tiny upturned nose, a mane of long golden fur, a long tail curled behind it. It crouches, mid-trick. Not the Monkey King: no crown, no staff, no armour.\nHolds: two mahjong tiles in mid-air between its hands, mid-swap.\nMood: mischievous and quick, grinning at its own trick." },
    { id: "rabbit", kind: "host", group: "Spirit hosts", wind: "West",
      text: "SUBJECT: The Jade Rabbit, host of the West wind\nGame twist: 'Moon tide': your hand grows by one tile each round, but your discards wash back into the wall.\nThe white rabbit who lives on the moon, standing upright with long ears, pink inner ears and calm red eyes, in a simple wrapped robe tied at the waist. A full moon disc sits behind its head like a halo.\nHolds: the long wooden pestle it pounds the elixir of life with, resting on its shoulder.\nMood: serene and patient, quietly certain it will win." },
    { id: "kitchenGod", kind: "host", group: "Spirit hosts", wind: "North",
      text: "SUBJECT: The Kitchen God (Zào Jūn), host of the North wind\nGame twist: 'The report': each discard costs points, but a hand banked with nothing wasted scores double. At New Year he reports on the household to heaven, and people sweeten his lips with honey.\nA kindly, plump household god with a round face, rosy cheeks and a long black beard, in an official's robe with wide sleeves and a winged official's hat.\nHolds: a small closed account book, its cover blank.\nMood: fussy and fair, a stickler for a tidy table, about to note something down. Treat him with respect: a beloved household god, never a joke figure." },
    // beasts
    { id: "azureDragon", kind: "beast", group: "Great beasts", wind: "East", trial: true,
      text: "SUBJECT: The Azure Dragon (Qīnglóng), great beast of the East and of spring\nGame twist: 'The coil': a chain of locked tiles winds through the wall, and every run you play unlocks a link.\nA long blue-green Chinese dragon coiling through the frame: a serpentine scaled body with four clawed legs, a camel-like head with a long snout, flowing whiskers and a mane, deer-like antlers, and big round eyes.\nHolds: the flaming pearl, in one front claw.\nMood: proud and amused, curious whether you can keep up." },
    { id: "vermilionBird", kind: "beast", group: "Great beasts", wind: "South",
      text: "SUBJECT: The Vermilion Bird (Zhūquè), great beast of the South and of summer\nGame twist: 'Embers': some tiles catch fire. Take one soon or it burns away; sets with a burning tile score more.\nA great vermilion bird like a pheasant crossed with a phoenix: a crested head, a hooked beak, wings spread wide, and a long tail of flame-like plumes sweeping round below it.\nHolds: nothing; a single ember hovers above its open beak.\nMood: fiery and theatrical, loving the danger." },
    { id: "whiteTiger", kind: "beast", group: "Great beasts", wind: "West",
      text: "SUBJECT: The White Tiger (Báihǔ), great beast of the West and of autumn\nGame twist: 'Claws': pongs and kongs score double, runs score half.\nA huge white tiger with black stripes, crouched low and facing the viewer, one great paw forward, a heavy ruff of fur and calm amber eyes.\nHolds: nothing; one paw rests on a single mahjong tile.\nMood: calm, powerful and certain, a fighter who respects a strong opponent." },
    { id: "blackTortoise", kind: "beast", group: "Great beasts", wind: "North",
      text: "SUBJECT: The Black Tortoise (Xuánwǔ), great beast of the North and of winter\nGame twist: 'The shell': the wall is deeper and its top tiles are armoured until you play a kong.\nAn ancient black tortoise with a high domed shell patterned in plates, wise heavy-lidded eyes, and a long black snake wound around it, the snake's head beside the tortoise's head, both looking at the viewer.\nHolds: nothing.\nMood: slow, patient and immovable, with the snake the sharper of the two." },
    // backdrops
    { id: "east-spring", kind: "backdrop", group: "Backdrops",
      text: "SUBJECT: East wind, spring\nA river bank in spring: weeping willows and a peach tree in blossom on the left, an arched stone bridge low on the right, gentle distant hills on the horizon." },
    { id: "south-summer", kind: "backdrop", group: "Backdrops",
      text: "SUBJECT: South wind, summer\nA lotus pond at dusk: big round lotus leaves and open lotus flowers along the bottom, a pavilion roof at the right edge, a crescent moon low on the left." },
    { id: "west-autumn", kind: "backdrop", group: "Backdrops",
      text: "SUBJECT: West wind, autumn\nA garden courtyard on the Mid-Autumn night: a round moon gate in a white wall on the left, an osmanthus tree on the right, a big full moon low in the sky." },
    { id: "north-winter", kind: "backdrop", group: "Backdrops",
      text: "SUBJECT: North wind, winter\nA plum tree in snow: a gnarled plum branch with red blossom reaching in from the left, snow-covered rocks along the bottom, a far pagoda on a hill on the right." },
    // the dragon tiles (jokers)
    { id: "dragons-1", kind: "dragons", group: "Dragon tiles (jokers)", trial: true,
      ids: ["abacus", "redString", "coinString", "bambooGrove", "coinPurse", "scroll"],
      text: "SUBJECTS (six WHITE dragons, the common dragon tiles, one per cell, in this order)\n1. Abacus Dragon: counting busily on a small wooden abacus with one claw, tongue out in concentration.\n2. Red String Dragon: proudly holding up a red Chinese knot it has just tied.\n3. Coin String Dragon: wearing a string of square-holed bronze coins like a necklace, chest puffed out.\n4. Bamboo Dragon: curled round three bamboo stems, peeking out between them.\n5. Purse Dragon: hugging a round embroidered silk purse, looking greedy.\n6. Scroll Dragon: reading an unrolled blank hand scroll through little round spectacles." },
    { id: "dragons-2", kind: "dragons", group: "Dragon tiles (jokers)",
      ids: ["sparrowNest", "goldToad", "pongHall", "outside", "ironTeapot", "longSleeves"],
      text: "SUBJECTS (six dragons, one per cell, in this order)\n1. Nest Dragon (WHITE): peering tenderly into a twig nest where a tiny sparrow chick sits.\n2. Toad-rider (WHITE): riding the three-legged money toad, which holds a coin in its mouth.\n3. Bell Dragon (GREEN): striking a row of three bronze bells with a little mallet.\n4. Moon Gate Dragon (GREEN): leaning through a round moon gate in a short length of white wall.\n5. Teapot Dragon (GREEN): pouring tea from a squat cast-iron teapot, steam curling.\n6. Long Sleeves (GREEN): in a robe with absurdly long sleeves trailing to the ground, very dignified." },
    { id: "dragons-3", kind: "dragons", group: "Dragon tiles (jokers)",
      ids: ["lantern", "mahjong", "twoSuits", "allSimples", "pureStraight", "nightOwl"],
      text: "SUBJECTS (six dragons, one per cell, in this order)\n1. Lantern Dragon (GREEN): holding a round red silk lantern up high, peering into the dark.\n2. Mahjong! (GREEN): sitting on a neat stack of blank mahjong tiles, throwing two dice, delighted.\n3. Two Fish (GREEN): juggling two fish that curl head to tail.\n4. Rice Bowl (RED): eating from a plain rice bowl with chopsticks, cheeks full.\n5. Nine Rings (RED): tangled cheerfully in the nine linked rings puzzle.\n6. Night Owl (RED): wide awake under a crescent moon, a small owl perched on one antler." },
    { id: "dragons-4", kind: "dragons", group: "Dragon tiles (jokers)",
      ids: ["kongBell", "windChime", "twinCranes", "threeTreasures", "stoneLion", "-"],
      text: "SUBJECTS (five RED dragons, one per cell, in this order; leave the sixth cell empty)\n1. Great Bell: coiled round one big bronze temple bell, ringing it with its tail.\n2. Wind Chime: blowing on a glass wind chime with a long blank paper strip.\n3. Twin Cranes: standing proudly between two red-crowned cranes.\n4. Three Treasures: balancing three identical gold ingots stacked on its head.\n5. Stone Lion: sitting on the back of a small stone guardian lion, paw on its ball.\n6. (empty)" },
    // objects: fortunes, almanac, packs, shop
    { id: "objects-1", kind: "sheet", group: "Object sheets",
      ids: ["rubbing", "fire", "brush", "jade", "bone", "gold"],
      text: "SUBJECTS (six objects, one per cell, in this order)\n1. Rubbing (copy a tile): a round cloth ink-dauber, black with ink, resting on a small sheet of paper.\n2. Fire (burn tiles): a small three-legged bronze brazier with flames rising from it.\n3. Brush (repaint a suit): a calligraphy brush resting on a mountain-shaped brush rest.\n4. Jade: a flat green jade bi disc with a round hole in the middle.\n5. Bone: a small bundle of carved bone counting sticks tied with a red thread.\n6. Gold Leaf: a small stack of thin gold leaf sheets with one corner lifting." },
    { id: "objects-2", kind: "sheet", group: "Object sheets",
      ids: ["almanac", "pack", "reroll", "burn", "porcelain", "windPack"],
      text: "SUBJECTS (six objects, one per cell, in this order)\n1. Almanac page (level a set): a thread-bound almanac book, closed, with a blank cover.\n2. Tile pack: a red envelope (hongbao) with a gold border, blank.\n3. Reroll: a bamboo dice cup with two dice beside it.\n4. Burn a kind: a bronze incense censer with three sticks of incense smoking.\n5. Porcelain: a small blue-and-white porcelain vase.\n6. Wind pack: a folded paper fan, half open." },
  ];

  function assemble(subject, styleKey) {
    var S = STYLES[styleKey];
    var parts = [S.style];
    if (VIBE[subject.kind]) parts.push(VIBE[subject.kind]);
    parts.push(FORMAT(subject.kind, S));
    parts.push(subject.text);
    if (subject.kind === "sheet") {
      parts.push("FINAL REMINDER\nSix separate objects on flat #00FF00 green, 3 across and 2 down, never touching, in the STYLE's look and palette. A thick dark edge round every shape, flat fills only, no shading, shine, shadow or texture. No text. The same hand for all six.");
    } else if (subject.kind === "dragons") {
      parts.push("FINAL REMINDER\nSix separate little dragons with their props on flat #00FF00 green, 3 across and 2 down, never touching, no tiles or frames drawn. One dragon design, coloured by rarity as the subjects say, in the STYLE's look. A thick dark edge round every shape, flat fills, large readable faces. No text. The same hand for all six.");
    } else if (subject.kind === "backdrop") {
      parts.push("FINAL REMINDER\nA wide 3:2 scene in the STYLE's look. Quiet middle third, interest at the sides and below. Nothing falling, no figures, no text, no border.");
    } else {
      parts.push(S.final);
    }
    return parts.join("\n\n");
  }

  var api = { STYLES: STYLES, SUBJECTS: SUBJECTS, assemble: assemble };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BBPrompts = api;
})(typeof window !== "undefined" ? window : this);
