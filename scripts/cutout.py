"""
Cut a painted portrait out of its background and write the game's 512px webp.

A flat chroma-key green background (#00FF00) is detected from the border and keyed out exactly:
everything green goes, including gaps enclosed by the figure, and green spill along the cut edge
is removed without touching real greens inside the figure.

Any other background is treated as flat paper. Only paper connected to the image border is
removed, so paper-coloured areas inside the figure (a belly, a face, fur) survive as long as an
outline encloses them. Paper that is enclosed but really background (the gap between an arm and
the body) is marked with --hole at any point inside it, as fractions of the image size.

    python3 scripts/cutout.py art-source/yokai/bakeneko.png src/ui/art/portraits/bakeneko.webp
    python3 scripts/cutout.py art-source/yokai/kawauso.png src/ui/art/portraits/kawauso.webp \\
        --tolerance 20 --hole 0.7265,0.3915 --hole 0.7472,0.5247
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage

TOLERANCE = 34  # default max colour distance from the sampled paper colour


def border_colour(rgb: np.ndarray) -> np.ndarray:
    """The median of a thin strip round the edge of the image."""
    strips = [rgb[:6], rgb[-6:], rgb[:, :6], rgb[:, -6:]]
    return np.median(np.concatenate([s.reshape(-1, 3) for s in strips]), axis=0)


def is_green_screen(colour: np.ndarray) -> bool:
    r, g, b = colour
    return g > 180 and g - max(r, b) > 120


def key_alpha(a: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Alpha from how much greener than red and blue each pixel is, and the despilled green."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = g - np.maximum(r, b)
    alpha = ndimage.gaussian_filter(np.clip((110 - spill) / 70, 0, 1), 0.6)
    # Despill only in a thin band along the cut edge, so a green kimono or moss keeps its colour.
    band = ndimage.binary_dilation(alpha < 0.98, iterations=4)
    green = np.where(band & (spill > 0), np.maximum(r, b), g)
    return alpha * 255, green


def paper_alpha(rgb: np.ndarray, tolerance: float, holes: list[tuple[float, float]]) -> np.ndarray:
    h, w = rgb.shape[:2]
    paper = border_colour(rgb)
    near = np.sqrt(((rgb - paper) ** 2).sum(axis=2)) < tolerance
    labels, _ = ndimage.label(near)
    remove = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    for x, y in holes:
        label = labels[int(y * h), int(x * w)]
        if label == 0:
            raise SystemExit(f'--hole {x},{y} is not on background paper')
        remove.add(label)
    bg = np.isin(labels, list(remove - {0}))
    # Grow the background by a pixel to eat the paper-tinted fringe, then soften the edge.
    bg = ndimage.binary_dilation(bg, iterations=1)
    return ndimage.gaussian_filter(np.where(bg, 0, 255).astype(np.float32), 0.8)


def cutout(src: str, dst: str, tolerance: float, holes: list[tuple[float, float]]) -> None:
    a = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
    colour = border_colour(a[..., :3])
    out = a.copy()
    if is_green_screen(colour):
        alpha, out[..., 1] = key_alpha(a)
        kind = 'green screen'
    else:
        alpha = paper_alpha(a[..., :3], tolerance, holes)
        kind = f'paper {colour.astype(int).tolist()}'
    out[..., 3] = np.minimum(a[..., 3], alpha)
    img = Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA').resize((512, 512), Image.LANCZOS)
    img.save(dst, 'WEBP', quality=86, method=6)
    print(f'{dst}: {kind}, removed {(alpha < 128).mean():.0%}')


def point(text: str) -> tuple[float, float]:
    x, y = text.split(',')
    return float(x), float(y)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('src')
    parser.add_argument('dst')
    parser.add_argument('--tolerance', type=float, default=TOLERANCE, help='paper only: colour distance counted as paper')
    parser.add_argument('--hole', type=point, action='append', default=[], help='paper only: x,y inside an enclosed gap')
    args = parser.parse_args()
    cutout(args.src, args.dst, args.tolerance, args.hole)
