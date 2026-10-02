"""
Trace a sheet of generated charm icons into the game's vector art.

A sheet is a square image of objects on flat chroma-key green (#00FF00), drawn from the prompt in
`art-source/charms/README.md`. Each object is found as one blob, keyed out, snapped to the charm
palette below (which removes the print grain), smoothed, traced with vtracer and written into
`src/ui/art/charmArt.ts` as path data. Ids are given in reading order: the top row left to right,
then the next row.

    python3 scripts/trace-charms.py art-source/charms/sheet-01.png \\
        stoneLantern manekiNeko gamblersDice koiPond phoenixPlume wishingStrings

Give `-` for a cell to skip it, to take single objects from another take of a sheet:

    python3 scripts/trace-charms.py art-source/charms/alt/sheet-05-b.png - leafPile - - - -

Every sheet is listed in `art-source/charms/sheets.txt`; `--all` re-traces them all, which is how
to apply a change to the palette or the tracing everywhere:

    python3 scripts/trace-charms.py --all

Needs `pip install pillow numpy scipy vtracer`. Re-running a sheet replaces its ids and keeps the
others in charmArt.ts.
"""
import argparse
import io
import json
import re
from pathlib import Path

import numpy as np
import vtracer
from PIL import Image
from scipy import ndimage

OUT = Path(__file__).resolve().parent.parent / 'src/ui/art/charmArt.ts'

# The charm palette, sampled from the approved sheets (the woods from sheets 2 and 3). Every pixel
# snaps to one of these.
PALETTE = {
    'ink': '#1d1712',
    'cream': '#f4deb3',
    'gold': '#dca727',
    'stone': '#aaa08c',
    'indigo': '#13325a',
    'vermilion': '#e0341c',
    'pine': '#2f5a2a',
    'bamboo': '#7f8a2a',
    'plum': '#f19ab2',
    'oak': '#b46a26',
    'wood': '#8f5422',
    'walnut': '#6a3515',
    'charcoal': '#46423a',
    'slate': '#6c6862',
    'water': '#9cc9c6',
    'moss': '#66733f',
}
# Colours matched at a different value than they're drawn: the inkstone's charcoal is generated
# almost as dark as the outline, so it's matched there and drawn a little lighter, to stay apart
# from the ink on the game's dark UI; slate is matched a little darker, so iron greys don't land
# on moss.
MATCH = {'charcoal': '#2a2823', 'slate': '#5a5853'}
SIZE = 200  # each object is traced at this many pixels on its longer side
PAD = 6  # transparent margin round each traced object, in traced pixels


def hex_rgb(h: str) -> np.ndarray:
    return np.array([int(h[i : i + 2], 16) for i in (1, 3, 5)], dtype=float)


def find_objects(rgb: np.ndarray, count: int) -> tuple[list[tuple[slice, slice]], np.ndarray]:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    green = (g > 140) & (g - np.maximum(r, b) > 80)
    # Darker green spill at the edges of the screen (in a handle's hole, say) goes too, but only
    # where it touches the screen: real greens inside an outline stay.
    spill = (g > 60) & (g - np.maximum(r, b) > 60)
    green |= spill & ndimage.binary_dilation(green, iterations=3)
    solid = ndimage.binary_fill_holes(ndimage.binary_closing(~green, iterations=3))
    labels, n = ndimage.label(solid)
    if n < count:
        raise SystemExit(f'found {n} objects, expected {count}')
    sizes = ndimage.sum(solid, labels, range(1, n + 1))
    keep = [int(i) + 1 for i in np.argsort(-sizes)[:count]]
    found = ndimage.find_objects(labels)
    boxes = {i: found[i - 1] for i in keep}
    # Reading order: group into rows by vertical centre, then left to right.
    centres = {i: ((s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2) for i, s in boxes.items()}
    rows: list[list[int]] = []
    for i in sorted(keep, key=lambda i: centres[i][0]):
        if rows and abs(centres[i][0] - centres[rows[-1][0]][0]) < rgb.shape[0] / 6:
            rows[-1].append(i)
        else:
            rows.append([i])
    order = [i for row in rows for i in sorted(row, key=lambda i: centres[i][1])]
    # Smaller pieces (raindrops, steam, a loose pair of tweezers) join the object whose box is
    # nearest; specks of a few pixels are dropped.
    groups = {i: [i] for i in keep}
    for j in range(1, n + 1):
        if j in groups or sizes[j - 1] < 60:
            continue
        sy, sx = found[j - 1]
        cy, cx = (sy.start + sy.stop) / 2, (sx.start + sx.stop) / 2

        def gap(i: int) -> float:
            by, bx = boxes[i]
            dy = max(by.start - cy, 0, cy - by.stop)
            dx = max(bx.start - cx, 0, cx - bx.stop)
            return float(np.hypot(dx, dy))

        groups[min(keep, key=gap)].append(j)
    out_boxes = []
    masks = []
    for i in order:
        parts = [found[j - 1] for j in groups[i]]
        out_boxes.append(
            (
                slice(min(p[0].start for p in parts), max(p[0].stop for p in parts)),
                slice(min(p[1].start for p in parts), max(p[1].stop for p in parts)),
            )
        )
        # Each object's mask loses its 1px green fringe; holes inside it stay keyed out.
        masks.append(ndimage.binary_erosion(np.isin(labels, groups[i]) & ~green, iterations=1))
    return out_boxes, np.array(masks)


def lab(rgb: np.ndarray) -> np.ndarray:
    """sRGB (0-255) to CIE Lab, so distances follow what the eye sees: in plain RGB a mid grey is
    nearer pine green than slate grey."""
    c = rgb.astype(float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array(
        [[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]]
    )
    xyz /= np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack(
        [116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1
    )


def snap(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Index of the nearest palette colour per pixel, with grain removed by a majority filter."""
    pal = lab(np.array([hex_rgb(MATCH.get(k, h)) for k, h in PALETTE.items()]))
    dist = ((lab(rgb)[..., None, :] - pal[None, None]) ** 2).sum(-1)
    idx = dist.argmin(-1)
    votes = np.stack([ndimage.uniform_filter((idx == k).astype(float), 5) for k in range(len(pal))])
    idx = votes.argmax(0)
    idx[~mask] = -1
    return idx


def trace(idx: np.ndarray) -> tuple[list[tuple[str, str]], tuple[int, int], tuple[float, float]]:
    names = list(PALETTE)
    h, w = idx.shape
    scale = SIZE / max(h, w)
    img = np.zeros((h, w, 4), dtype=np.uint8)
    for k, name in enumerate(names):
        img[idx == k, :3] = hex_rgb(PALETTE[name]).astype(np.uint8)
    img[idx >= 0, 3] = 255
    small = Image.fromarray(img, 'RGBA').resize(
        (round(w * scale), round(h * scale)), Image.Resampling.NEAREST
    )
    canvas = Image.new('RGBA', (small.width + 2 * PAD, small.height + 2 * PAD), (0, 0, 0, 0))
    canvas.paste(small, (PAD, PAD))
    buf = io.BytesIO()
    canvas.save(buf, 'PNG')
    svg = vtracer.convert_raw_image_to_svg(
        buf.getvalue(),
        img_format='png',
        colormode='color',
        hierarchical='stacked',
        mode='spline',
        filter_speckle=8,
        color_precision=8,
        layer_difference=8,
        corner_threshold=60,
        length_threshold=4.0,
        splice_threshold=45,
        path_precision=1,
    )
    pal = list(PALETTE.values())
    nearest = lambda h: min(pal, key=lambda p: ((hex_rgb(p) - hex_rgb(h)) ** 2).sum())
    paths: list[tuple[str, str]] = []
    for m in re.finditer(r'<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"', svg):
        d, fill, tx, ty = m.group(1), m.group(2), float(m.group(3)), float(m.group(4))
        paths.append((nearest(fill), offset(d, tx, ty)))
    return paths, (canvas.width, canvas.height), anchor(np.asarray(canvas)[..., 3] > 0)


def anchor(solid: np.ndarray) -> tuple[float, float]:
    """Where the object hangs from: its top edge in the middle tenth of its width (between a cat's
    ears, not on one), or its topmost point if nothing is there. The knot's string meets it here."""
    h, w = solid.shape
    band = np.zeros_like(solid)
    band[:, int(w * 0.45) : int(w * 0.55) + 1] = True
    for mask in (solid & band, solid):
        rows = np.where(mask.any(1))[0]
        if len(rows):
            y = int(rows[0])
            xs = np.where(mask[y])[0]
            return round(float(xs.mean()), 1), float(y)
    return w / 2, 0.0


def offset(d: str, tx: float, ty: float) -> str:
    """Bake a translate into absolute path data, in whole pixels (vtracer writes absolute M/L/C/Z).
    A traced object is 200px across and shown at most about 60px, so whole pixels are plenty."""
    out = []
    for cmd, args in re.findall(r'([MLCZ])([^MLCZ]*)', d):
        nums = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', args)]
        moved = [n + (tx if i % 2 == 0 else ty) for i, n in enumerate(nums)]
        out.append(cmd + ' '.join(str(round(n)) for n in moved))
    return ' '.join(out)


def read_existing() -> dict:
    if not OUT.exists():
        return {}
    m = re.search(r'export const CHARM_ART[^=]*= (\{.*\});', OUT.read_text(), re.S)
    return json.loads(m.group(1)) if m else {}


def write(art: dict) -> None:
    body = json.dumps(dict(sorted(art.items())), separators=(',', ':'))
    OUT.write_text(
        '// Generated by scripts/trace-charms.py from art-source/charms/. Do not edit by hand.\n'
        '// Lint and Prettier skip it (eslint.config.js, .prettierignore).\n'
        "import type { OfudaId } from '@/content/ofuda';\n"
        "import type { OmamoriId } from '@/content/omamori';\n\n"
        '/** Charms, talismans and the three shop services. */\n'
        "export type ItemId = OmamoriId | OfudaId | 'shrine' | 'heal' | 'reroll';\n\n"
        '/** A traced object: its size, its hanging point and its paths ([fill, d]). */\n'
        'export interface TracedArt { w: number; h: number; ax: number; ay: number; p: [string, string][] }\n\n'
        '/** Keyed by item id. Art may exist ahead of its item (charms still to be added), so any id goes. */\n'
        'export const CHARM_ART: Readonly<Record<string, TracedArt | undefined>> = '
        + body
        + ';\n'
    )


def trace_sheet(sheet: str, ids: list[str], art: dict) -> None:
    rgb = np.asarray(Image.open(sheet).convert('RGB'))
    boxes, masks = find_objects(rgb, len(ids))
    for item_id, box, mask in zip(ids, boxes, masks):
        if item_id == '-':
            continue
        idx = snap(rgb[box], mask[box])
        paths, (w, h), (ax, ay) = trace(idx)
        art[item_id] = {'w': w, 'h': h, 'ax': ax, 'ay': ay, 'p': paths}
        size = sum(len(d) for _, d in paths)
        print(f'{item_id:16} {len(paths):3} paths  {size / 1024:5.1f} KB')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet', nargs='?')
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--all', action='store_true', help='re-trace every sheet in sheets.txt')
    args = ap.parse_args()
    if args.all:
        art: dict = {}
        listing = OUT.parent.parent.parent.parent / 'art-source/charms/sheets.txt'
        for line in listing.read_text().splitlines():
            if not line.strip() or line.startswith('#'):
                continue
            name, *ids = line.split()
            trace_sheet(str(listing.parent / name), ids, art)
    elif args.sheet and args.ids:
        art = read_existing()
        trace_sheet(args.sheet, args.ids, art)
    else:
        ap.error('give a sheet and its ids, or --all')
    write(art)
    print(f'wrote {OUT.relative_to(Path.cwd())}  {OUT.stat().st_size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
