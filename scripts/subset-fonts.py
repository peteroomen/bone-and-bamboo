#!/usr/bin/env python3
"""
Subset the display and UI fonts to exactly the glyphs the game uses.

The full Japanese fonts are ~10 MB each; the subsets are a few dozen KB. Rerun
this whenever new non-ASCII text (kanji, kana, symbols) is added to the source.

    pip install fonttools brotli
    npm pack @expo-google-fonts/shippori-mincho-b1 @expo-google-fonts/zen-maru-gothic
    (untar both into $FONT_SRC, default /tmp/fonts)
    python3 scripts/subset-fonts.py
"""
import os
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(os.environ.get("FONT_SRC", "/tmp/fonts"))
OUT = ROOT / "public" / "fonts"

FONTS = {
    "shippori-700.woff2": "expo-google-fonts-shippori-mincho-b1-0.4.1/700Bold/ShipporiMinchoB1_700Bold.ttf",
    "shippori-800.woff2": "expo-google-fonts-shippori-mincho-b1-0.4.1/800ExtraBold/ShipporiMinchoB1_800ExtraBold.ttf",
    "zenmaru-500.woff2": "expo-google-fonts-zen-maru-gothic-0.4.1/500Medium/ZenMaruGothic_500Medium.ttf",
    "zenmaru-700.woff2": "expo-google-fonts-zen-maru-gothic-0.4.1/700Bold/ZenMaruGothic_700Bold.ttf",
}

# Te Reo needs the macron vowels, which these Japanese fonts don't have. add_macrons() builds
# them from each font's own vowel and macron, so they match the letters around them.
MACRONS = {"ā": "a", "ē": "e", "ī": "ı", "ō": "o", "ū": "u", "Ā": "A", "Ē": "E", "Ī": "I", "Ō": "O", "Ū": "U"}

EXTRA = "āēīōūĀĒĪŌŪ—–‘’“”·×÷•★☆✦←→↑↓↺♪©°±½¼¾€¥々〜「」『』、。・ー"


def collect() -> str:
    chars = set(chr(c) for c in range(32, 127))
    chars.update(EXTRA)
    for path in list((ROOT / "src").rglob("*")) + [ROOT / "index.html"]:
        if path.suffix not in {".ts", ".tsx", ".css", ".html"} or not path.is_file():
            continue
        for ch in path.read_text(encoding="utf-8"):
            if ord(ch) > 127:
                chars.add(ch)
    return "".join(sorted(chars))


def add_macrons(font) -> None:
    """Add composite glyphs for the macron vowels: the base letter with the font's macron above."""
    glyf, hmtx = font["glyf"], font["hmtx"]
    cmap = font.getBestCmap()
    macron = cmap.get(0xAF)
    if macron is None:
        return
    mg = glyf[macron]
    mg.recalcBounds(glyf)
    order = font.getGlyphOrder()
    added = {}
    for ch, base in MACRONS.items():
        if ord(ch) in cmap:
            continue
        bname = cmap.get(ord(base)) or cmap.get(ord("i" if base == "ı" else base))
        if bname is None:
            continue
        bg = glyf[bname]
        bg.recalcBounds(glyf)
        gap = 50 if base.isupper() else 70
        parts = []
        for name, x, y in (
            (bname, 0, 0),
            (macron, round((bg.xMin + bg.xMax - mg.xMin - mg.xMax) / 2), round(bg.yMax + gap - mg.yMin)),
        ):
            c = GlyphComponent()
            c.glyphName, c.x, c.y, c.flags = name, x, y, 0x4
            parts.append(c)
        g = Glyph()
        g.numberOfContours = -1
        g.components = parts
        name = f"uni{ord(ch):04X}"
        glyf[name] = g
        g.recalcBounds(glyf)
        hmtx[name] = (hmtx[bname][0], g.xMin)
        if "vmtx" in font:
            font["vmtx"][name] = font["vmtx"][bname]
        order.append(name)
        added[ord(ch)] = name
    font.setGlyphOrder(order)
    glyf.glyphOrder = order
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap.update(added)
    maxp = font["maxp"]
    maxp.maxComponentElements = max(getattr(maxp, "maxComponentElements", 0), 2)
    maxp.maxComponentDepth = max(getattr(maxp, "maxComponentDepth", 0), 1)


def main() -> int:
    text = collect()
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"{len(text)} characters")
    for out_name, rel in FONTS.items():
        src = SRC / rel
        if not src.exists():
            print(f"missing {src}", file=sys.stderr)
            return 1
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        font = subset.load_font(str(src), opts)
        add_macrons(font)
        sub = subset.Subsetter(opts)
        sub.populate(text=text)
        sub.subset(font)
        dest = OUT / out_name
        subset.save_font(font, str(dest), opts)
        print(f"{out_name}: {dest.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
