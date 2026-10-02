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

  // Icons for tile faces are generated once, in this neutral style, and traced. Each traced shape
  // keeps its colour slot (ink, red, blue, green, gold, brown, pink, ivory) and the game paints the
  // slots with the colourway's palette, as it does the tiles.
  var ICON_STYLE = "STYLE · TILE ICON (keep identical for every icon sheet)\n" +
    "Pictures for the faces of tiles in a mahjong-tile game, in the manner of the painted faces of a classic bone-and-bamboo mahjong set: simple, bold, flat and instantly recognisable.\n" +
    "- Line: one bold dark outline around every shape, even in weight. Only a few inner lines, and only where they show what the object is.\n" +
    "- Colour: flat fills only, from exactly these eight: ink black, vermilion red, cobalt blue, jade green, ochre gold, wood brown, soft pink and warm ivory. Each shape is one of them. The game recolours each of these for its colour schemes, so keep them distinct and use no in-between shades.\n" +
    "- Shape: a few large, chunky shapes with the object's real proportions, recognisable at 30 pixels. Fewer, bigger shapes rather than many small ones.\n" +
    "- No shading, gradients, texture, shine, glow or shadows. Not 3D, not emoji, not kawaii; objects have no faces unless the object is a figure (a toad, an owl, a lion, cranes).";

  var BG = {
    green: "- The background is a flat, solid chroma-key green (#00FF00) and nothing else: one perfectly even colour with no shadow, no gradient, no texture, no scenery and no floating objects. It is only there to be cut away.\n" +
      "- No green of that brightness anywhere in the figure; any green in it is a dark pine green. A clean dark edge runs everywhere the figure meets the green, including along the bottom edge.",
    plate: "- The picture is the central medallion of a plate: a circle of white glaze filling the square image edge to edge, with one thin cobalt ring at its edge. Outside the circle, the four corners are flat chroma-key green (#00FF00). Inside the circle the glaze is the background: plain white, no scenery."
  };

  var VIBE = {
    guide: "VIBE (the guide)\nThe player's friend and teacher: the Red Dragon tile of the mahjong set, come to life, like the Joker card that hosts Balatro. A young red dragon painted on the tile leans out of it to talk. Bright, quick, a little bossy and very kind, like a teahouse regular who knows every trick at the table and can't help telling you. Small and spirited, not fearsome; gentle humour, never silly, never a sticker mascot.",
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
      return FORMAT("sheet", S).replace("FORMAT · OBJECT SHEET", "FORMAT · DRAGON TILE PICTURES") + "\n" +
        "- Each picture will be printed on the face of an upright mahjong tile (a dragon, the game's joker), so each object is compact and fits an upright box a little taller than wide. The game draws the tile and its frame: do NOT draw a tile, a frame or a border, and do NOT add faces, eyes or limbs to the objects.";
    }
    if (kind === "sheet") {
      return "FORMAT · OBJECT SHEET (keep identical every time)\n" +
        "- One square image, 1:1, holding six separate objects in a neat grid of 3 columns and 2 rows, in the order the subjects are listed: the top row left to right, then the bottom row. Each object sits alone in its own invisible cell with wide empty space around it, never touching another object or the edges.\n" +
        "- Each object is upright, seen from the front or a little from above, centred in its cell and filling about 70% of it.\n" +
        "- The background is a flat, solid chroma-key green (#00FF00) and nothing else: no shadow, no ground, no gradient, no grid lines, no texture. No green of that brightness in the objects; leaves and bamboo are dark pine green.\n" +
        "- These objects will be traced into vector shapes and shown as small as 18 pixels. So: a thick, even dark edge closes every shape, every colour area is one flat fill, and there is no detail smaller than about 1/25 of a cell. No hatching, texture, shine, highlights, drop shadows or glow.\n" +
        "- Colours only from the STYLE's eight.\n" +
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
    // the dragons (the jokers): pictures for their tile faces
    { id: "dragons-1", kind: "dragons", oneStyle: true, group: "Dragon tile pictures (jokers)", trial: true,
      ids: ["abacus", "redString", "coinString", "bambooGrove", "coinPurse", "scroll"],
      text: "SUBJECTS (six objects, one per cell, in this order)\n1. Abacus: a wooden suanpan abacus standing upright, a dark frame, one crossbar, five columns of round beads.\n2. Red String: a red Chinese knot, a diamond-shaped weave with two short tails hanging below.\n3. Coin String: a short string of square-holed bronze cash coins threaded on a red cord, hanging in a curve.\n4. Bamboo Grove: a small round pot holding three bamboo stems with a few leaves.\n5. Coin Purse: a round embroidered silk purse with a drawstring top and a simple coin shape on its side.\n6. Scroll: a hand scroll partly unrolled, blank, with wooden rollers at each end." },
    { id: "dragons-2", kind: "dragons", oneStyle: true, group: "Dragon tile pictures (jokers)",
      ids: ["sparrowNest", "goldToad", "pongHall", "outside", "ironTeapot", "longSleeves"],
      text: "SUBJECTS (six objects, one per cell, in this order)\n1. Nest: a woven twig nest holding two speckled eggs.\n2. Gold Toad: the three-legged money toad sitting on a little heap of square-holed coins, one coin in its mouth.\n3. Bell Hall: three identical bronze bells hanging in a row from a small wooden frame.\n4. Moon Gate: a round moon gate in a short length of white garden wall, seen straight on.\n5. Iron Teapot: a squat cast-iron teapot with a round lid knob and a curved spout.\n6. Long Sleeves: a folded silk robe with very long sleeves draped over a stand." },
    { id: "dragons-3", kind: "dragons", oneStyle: true, group: "Dragon tile pictures (jokers)",
      ids: ["lantern", "mahjong", "twoSuits", "allSimples", "pureStraight", "nightOwl"],
      text: "SUBJECTS (six objects, one per cell, in this order)\n1. Lantern: a round red silk lantern with gold caps top and bottom and a short gold tassel.\n2. Mahjong!: a neat stack of four blank mahjong tiles with a pair of dice in front.\n3. Two Fish: two fish curled head to tail in a circle.\n4. Rice Bowl: a plain rice bowl with a pair of chopsticks resting across its rim.\n5. Nine Rings: the nine linked rings puzzle: nine metal rings on a long bar with a loop handle.\n6. Night Owl: a small round owl figurine with big round eyes, a crescent moon behind it." },
    { id: "dragons-4", kind: "dragons", oneStyle: true, group: "Dragon tile pictures (jokers)",
      ids: ["kongBell", "windChime", "twinCranes", "threeTreasures", "stoneLion", "-"],
      text: "SUBJECTS (five objects, one per cell, in this order; leave the sixth cell empty)\n1. Great Bell: one large bronze temple bell with rows of round knobs and a dragon-shaped loop on top.\n2. Wind Chime: a glass wind chime with a cream bell and a long blank paper strip below.\n3. Twin Cranes: two red-crowned cranes standing side by side, necks crossing.\n4. Three Treasures: three identical gold ingots (boat-shaped sycee) stacked in a small pyramid.\n5. Stone Lion: a small stone guardian lion sitting with one paw on a ball.\n6. (empty)" },
    // objects: fortunes, almanac, packs, shop
    { id: "objects-1", kind: "sheet", oneStyle: true, group: "Object sheets",
      ids: ["rubbing", "fire", "brush", "jade", "bone", "gold"],
      text: "SUBJECTS (six objects, one per cell, in this order)\n1. Rubbing (copy a tile): a round cloth ink-dauber, black with ink, resting on a small sheet of paper.\n2. Fire (burn tiles): a small three-legged bronze brazier with flames rising from it.\n3. Brush (repaint a suit): a calligraphy brush resting on a mountain-shaped brush rest.\n4. Jade: a flat green jade bi disc with a round hole in the middle.\n5. Bone: a small bundle of carved bone counting sticks tied with a red thread.\n6. Gold Leaf: a small stack of thin gold leaf sheets with one corner lifting." },
    { id: "objects-2", kind: "sheet", oneStyle: true, group: "Object sheets",
      ids: ["almanac", "pack", "reroll", "burn", "porcelain", "windPack"],
      text: "SUBJECTS (six objects, one per cell, in this order)\n1. Almanac page (level a set): a thread-bound almanac book, closed, with a blank cover.\n2. Tile pack: a red envelope (hongbao) with a gold border, blank.\n3. Reroll: a bamboo dice cup with two dice beside it.\n4. Burn a kind: a bronze incense censer with three sticks of incense smoking.\n5. Porcelain: a small blue-and-white porcelain vase.\n6. Wind pack: a folded paper fan, half open." },
  ];

  function assemble(subject, styleKey) {
    var S = STYLES[styleKey];
    var icons = subject.kind === "sheet" || subject.kind === "dragons";
    var parts = [icons ? ICON_STYLE : S.style];
    if (VIBE[subject.kind]) parts.push(VIBE[subject.kind]);
    parts.push(FORMAT(subject.kind, S));
    parts.push(subject.text);
    if (subject.kind === "sheet") {
      parts.push("FINAL REMINDER\nSix separate objects on flat #00FF00 green, 3 across and 2 down, never touching, in the STYLE's look and palette. A thick dark edge round every shape, flat fills only, no shading, shine, shadow or texture. No text. The same hand for all six.");
    } else if (subject.kind === "dragons") {
      parts.push("FINAL REMINDER\nSix separate objects on flat #00FF00 green, 3 across and 2 down, never touching, each compact enough for an upright tile face. No tiles, frames, faces or limbs. A thick dark edge round every shape, flat fills only, no shading, shine, shadow or texture. No text. The same hand for all six.");
    } else if (subject.kind === "backdrop") {
      parts.push("FINAL REMINDER\nA wide 3:2 scene in the STYLE's look. Quiet middle third, interest at the sides and below. Nothing falling, no figures, no text, no border.");
    } else {
      parts.push(S.final);
    }
    return parts.join("\n\n");
  }

  var api = { STYLES: STYLES, SUBJECTS: SUBJECTS, assemble: assemble, ICON_STYLE: ICON_STYLE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BBPrompts = api;
})(typeof window !== "undefined" ? window : this);
