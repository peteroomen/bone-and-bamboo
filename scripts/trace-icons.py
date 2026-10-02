"""
Trace a sheet of generated tile icons into colour-slot vector data.

A sheet is a square image of six objects on flat chroma-key green (#00FF00), from the TILE ICON
prompts in `art-source/prompts/`. Each object is found as one blob, keyed out, snapped to the eight
icon colours below (which also removes grain), traced with vtracer and written to
`art-source/icons/icons.json` as paths that carry a colour SLOT, not a colour. The game paints the
slots with the current colourway's palette, as it does the tiles, so one traced icon serves every
colourway. Ids are given in reading order: the top row left to right, then the bottom row.

    python3 scripts/trace-icons.py art-source/icons/dragons-1.png \
        abacus redString coinString bambooGrove coinPurse scroll

`-` skips a cell. `--all` re-traces every sheet listed in `art-source/icons/sheets.txt`.
`node scripts/preview-icons.js` then draws every icon on its tile in every colourway.

Needs `pip install pillow numpy scipy vtracer`. Adapted from Twelve Petals' trace-charms.py.
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

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'art-source/icons/icons.json'

# The eight icon slots and the colour each is matched at. The game draws them with the
# colourway's palette (tiles.js THEMES: ink, red, blue, green, gold, brown, pink, face).
SLOTS = {
    'ink': '#1d1712',
    'red': '#d2352a',
    'blue': '#2b5597',
    'green': '#2f7a55',
    'gold': '#dba52a',
    'brown': '#8a5530',
    'pink': '#ec9fae',
    'ivory': '#f4ead2',
}
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
    """Index of the nearest slot colour per pixel, with grain removed by a majority filter."""
    pal = lab(np.array([hex_rgb(h) for h in SLOTS.values()]))
    dist = ((lab(rgb)[..., None, :] - pal[None, None]) ** 2).sum(-1)
    idx = dist.argmin(-1)
    votes = np.stack([ndimage.uniform_filter((idx == k).astype(float), 5) for k in range(len(pal))])
    idx = votes.argmax(0)
    idx[~mask] = -1
    return idx


def trace(idx: np.ndarray) -> tuple[list[list[str]], tuple[int, int]]:
    names = list(SLOTS)
    h, w = idx.shape
    scale = SIZE / max(h, w)
    img = np.zeros((h, w, 4), dtype=np.uint8)
    for k, name in enumerate(names):
        img[idx == k, :3] = hex_rgb(SLOTS[name]).astype(np.uint8)
    img[idx >= 0, 3] = 255
    small = Image.fromarray(img, 'RGBA').resize((round(w * scale), round(h * scale)), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (small.width + 2 * PAD, small.height + 2 * PAD), (0, 0, 0, 0))
    canvas.paste(small, (PAD, PAD))
    buf = io.BytesIO()
    canvas.save(buf, 'PNG')
    svg = vtracer.convert_raw_image_to_svg(
        buf.getvalue(), img_format='png', colormode='color', hierarchical='stacked', mode='spline',
        filter_speckle=8, color_precision=8, layer_difference=8, corner_threshold=60,
        length_threshold=4.0, splice_threshold=45, path_precision=1,
    )
    slot_of = {}
    for name, hx in SLOTS.items():
        slot_of[hx.lower()] = name
    nearest = lambda hx: min(SLOTS, key=lambda s: ((hex_rgb(SLOTS[s]) - hex_rgb(hx)) ** 2).sum())
    paths: list[list[str]] = []
    for m in re.finditer(r'<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"', svg):
        d, fill, tx, ty = m.group(1), m.group(2), float(m.group(3)), float(m.group(4))
        paths.append([nearest(fill), offset(d, tx, ty)])
    return paths, (canvas.width, canvas.height)


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
    return json.loads(OUT.read_text()) if OUT.exists() else {}


def write(art: dict) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(dict(sorted(art.items())), separators=(',', ':')) + '\n')


def grid_objects(rgb: np.ndarray, cols: int, rows: int) -> tuple[list, list]:
    """For sheets where one icon is several pieces (a tile face of nine sticks). Rows and columns
    are cut through the emptiest line near each nominal grid line, so a piece that pokes past an
    even third stays with its own icon. Every box is then grown to the size of the largest one
    (about its own centre), so the icons of a sheet share one scale: the 2 of Bamboo's sticks are
    drawn the same size as the 9's."""
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    green = (g > 140) & (g - np.maximum(r, b) > 80)
    spill = (g > 60) & (g - np.maximum(r, b) > 60)
    green |= spill & ndimage.binary_dilation(green, iterations=3)
    solid = ndimage.binary_opening(~green, iterations=1)
    h, w = solid.shape

    def cuts(profile: np.ndarray, n: int, length: int) -> list[int]:
        out = [0]
        for k in range(1, n):
            nominal = length * k // n
            lo, hi = nominal - length // 6, nominal + length // 6
            win = profile[lo:hi]
            low = win <= win.min()
            # the widest run of the emptiest lines: the gap between icons, not a gap inside one
            best, start = (0, 0), None
            for k, v in enumerate(list(low) + [False]):
                if v and start is None:
                    start = k
                elif not v and start is not None:
                    if k - start > best[1] - best[0]:
                        best = (start, k)
                    start = None
            out.append(lo + (best[0] + best[1]) // 2)
        return out + [length]

    ycut = cuts(solid.sum(1), rows, h)
    raw = []
    for j in range(rows):
        band = solid[ycut[j] : ycut[j + 1]]
        xcut = cuts(band.sum(0), cols, w)
        for i in range(cols):
            m = np.zeros_like(solid)
            m[ycut[j] : ycut[j + 1], xcut[i] : xcut[i + 1]] = solid[ycut[j] : ycut[j + 1], xcut[i] : xcut[i + 1]]
            yy, xx = np.where(m)
            raw.append((m, (yy.min(), yy.max() + 1, xx.min(), xx.max() + 1) if len(yy) else None))
    bh = max(bb[1] - bb[0] for _, bb in raw if bb)
    bw = max(bb[3] - bb[2] for _, bb in raw if bb)
    boxes, masks = [], []
    for m, bb in raw:
        if bb is None:
            boxes.append(None); masks.append(m); continue
        cy, cx = (bb[0] + bb[1]) // 2, (bb[2] + bb[3]) // 2
        y0, x0 = max(0, cy - bh // 2), max(0, cx - bw // 2)
        boxes.append((slice(y0, min(h, y0 + bh)), slice(x0, min(w, x0 + bw))))
        masks.append(ndimage.binary_erosion(m, iterations=1))
    return boxes, masks


def trace_sheet(sheet: str, ids: list[str], art: dict, grid: str | None = None) -> None:
    rgb = np.asarray(Image.open(sheet).convert('RGB'))
    if grid:
        cols, rows = (int(x) for x in grid.split('x'))
        boxes, masks = grid_objects(rgb, cols, rows)
        for item_id, box, mask in zip(ids, boxes, masks):
            if item_id == '-' or box is None:
                continue
            idx = snap(rgb[box], mask[box])
            paths, (w, h) = trace(idx)
            art[item_id] = {'w': w, 'h': h, 'p': paths}
            size = sum(len(d) for _, d in paths)
            print(f'{item_id:16} {len(paths):3} paths  {size / 1024:5.1f} KB  slots: {" ".join(sorted({s for s, _ in paths}))}')
        return
    while ids and ids[-1] == '-':  # an empty last cell (a sheet of five) holds no object
        ids = ids[:-1]
    want = len(ids)
    boxes, masks = find_objects(rgb, want)
    for item_id, box, mask in zip(ids, boxes, masks):
        if item_id == '-':
            continue
        idx = snap(rgb[box], mask[box])
        paths, (w, h) = trace(idx)
        art[item_id] = {'w': w, 'h': h, 'p': paths}
        used = sorted({s for s, _ in paths})
        size = sum(len(d) for _, d in paths)
        print(f'{item_id:16} {len(paths):3} paths  {size / 1024:5.1f} KB  slots: {" ".join(used)}')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet', nargs='?')
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--all', action='store_true', help='re-trace every sheet in sheets.txt')
    ap.add_argument('--grid', help='split the sheet into equal cells, e.g. 3x3 (for multi-piece icons)')
    args = ap.parse_args()
    if args.all:
        art: dict = {}
        listing = ROOT / 'art-source/icons/sheets.txt'
        for line in listing.read_text().splitlines():
            if not line.strip() or line.startswith('#'):
                continue
            name, *ids = line.split()
            grid = None
            if ids and ids[0].startswith('--grid='):
                grid, ids = ids[0].split('=', 1)[1], ids[1:]
            trace_sheet(str(listing.parent / name), ids, art, grid)
    elif args.sheet and args.ids:
        art = read_existing()
        trace_sheet(args.sheet, args.ids, art, args.grid)
    else:
        ap.error('give a sheet and its ids, or --all')
    write(art)
    print(f'wrote {OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
