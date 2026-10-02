import { DRAGONS } from '@/content/dragons';
import generatedFaces from './generated/faces.json';
import generatedIcons from './generated/icons.json';
import { type Icon, type ThemeId, THEMES, dragonTile, setFaces } from './tiles';

/**
 * The traced art, as data (art-source/icons/icons.json split by family at build time: see
 * scripts/build-icons.ts). Every path carries a colour slot, painted with the colourway's
 * palette, so one icon set serves every colourway. A missing id falls back to a placeholder.
 */
const FACES = generatedFaces as unknown as Record<string, Icon>;
const ICONS = generatedIcons as unknown as Record<string, Icon>;

/** Register the traced tile faces with the tile generator. Call once at startup. */
export function registerFaces(): void {
  setFaces(FACES);
}

export function hasIcon(id: string): boolean {
  return id in ICONS;
}

const SLOT: Record<string, keyof (typeof THEMES)['theatre']> = {
  ink: 'ink',
  red: 'red',
  blue: 'blue',
  green: 'green',
  gold: 'gold',
  brown: 'brown',
  pink: 'pink',
  ivory: 'face',
};

const iconCache = new Map<string, string>();

/** A traced icon as an SVG, painted with a colourway; null if there is no art for it yet. */
export function iconSvg(id: string, theme: ThemeId): string | null {
  const icon = ICONS[id];
  if (!icon) return null;
  const key = `${theme}|${id}`;
  let s = iconCache.get(key);
  if (!s) {
    const T = THEMES[theme];
    const paths = icon.p
      .map(([slot, d]) => `<path d="${d}" fill="${T[SLOT[slot] ?? 'ink']}"/>`)
      .join('');
    s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.w} ${icon.h}">${paths}</svg>`;
    iconCache.set(key, s);
  }
  return s;
}

const dragonCache = new Map<string, string>();

/** A dragon as a tile with its rarity frame; its face is the traced icon, else its initial. */
export function dragonTileSvg(id: string, theme: ThemeId): string {
  const key = `${theme}|${id}`;
  let s = dragonCache.get(key);
  if (!s) {
    const d = DRAGONS[id];
    const icon = ICONS[id];
    s = dragonTile({
      theme,
      rarity: d?.rarity ?? 'common',
      ...(icon ? { icon } : { initial: (d?.name ?? id).charAt(0) }),
    });
    dragonCache.set(key, s);
  }
  return s;
}
