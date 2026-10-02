import { type GuideMood, type ThemeId, guide } from './tiles';

const cache = new Map<string, string>();

/** The guide (the Red Dragon tile, alive) as SVG for a colourway, mood and blink. */
export function guideSvg(theme: ThemeId, mood: GuideMood, blink = false): string {
  const key = `${theme}|${mood}|${blink ? 1 : 0}`;
  let s = cache.get(key);
  if (!s) {
    s = guide({ theme, mood, blink });
    cache.set(key, s);
  }
  return s;
}
