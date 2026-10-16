import * as THREE from 'three';
import type { EnhancementId } from '@/content/enhancements';
import type { TileKind } from '@/content/tiles';
import { type ThemeId, THEMES, specOf, tileSvg } from '@/ui/art/tiles';

/**
 * Textures drawn from the tile generator. A die face is the tile's face (cut out of the full
 * tile drawing) inlaid on bone; a rack tile uses the same picture on its front. Each texture
 * fills in when its image has loaded, so the first frame may show plain bone.
 */
const SIZE = 256;
const cache = new Map<string, THREE.CanvasTexture>();

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type FaceStyle = 'die' | 'tile';

export function faceKey(
  kind: TileKind | null,
  enh: EnhancementId | undefined,
  theme: ThemeId,
  style: FaceStyle,
): string {
  return `${style}|${theme}|${kind ?? 'blank'}|${enh ?? ''}`;
}

/** Wait for every texture made so far (for screenshots and tests). */
const pending = new Set<Promise<void>>();
export function texturesReady(): Promise<void> {
  return Promise.all([...pending]).then(() => undefined);
}

export function faceTexture(
  kind: TileKind | null,
  enh: EnhancementId | undefined,
  theme: ThemeId,
  style: FaceStyle = 'die',
): THREE.CanvasTexture {
  const key = faceKey(kind, enh, theme, style);
  const hit = cache.get(key);
  if (hit) return hit;
  const T = THEMES[theme];
  const canvas = document.createElement('canvas');
  const w = style === 'die' ? SIZE : 192;
  const h = SIZE;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  // bone
  ctx.fillStyle = style === 'die' ? T.face : T.face;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  if (kind) {
    // drawn at a set size: an SVG with only a viewBox loads at 300 × 150
    const svg = tileSvg(specOf(kind), { theme, index: false, width: 240, ...(enh ? { enh } : {}) });
    const img = new Image();
    const p = new Promise<void>((resolve) => {
      img.onload = () => {
        // the tile's face is x 2-58, y 2-74 of its 60 x 80 drawing (here 4 pixels a unit)
        const k = 4;
        if (style === 'die') {
          const fh = h * 0.84;
          const fw = (fh * 56) / 72;
          ctx.drawImage(img, 2 * k, 2 * k, 56 * k, 72 * k, (w - fw) / 2, (h - fh) / 2, fw, fh);
        } else {
          ctx.drawImage(img, 2 * k, 2 * k, 56 * k, 72 * k, 0, 0, w, h);
        }
        tex.needsUpdate = true;
        resolve();
      };
      img.onerror = () => resolve();
    });
    pending.add(p);
    void p.then(() => pending.delete(p));
    img.src = svgUrl(svg);
  } else if (style === 'die') {
    // a blank face: a faint worn square
    ctx.strokeStyle = T.face2;
    ctx.lineWidth = 6;
    ctx.strokeRect(w * 0.22, h * 0.16, w * 0.56, h * 0.68);
  }
  return tex;
}
