import type { CSSProperties } from 'react';
import type { Tile } from '@/engine/tiles';
import { type ThemeId, specOf, tileSvg } from './tiles';

const cache = new Map<string, string>();

function svgFor(tile: Pick<Tile, 'kind' | 'enh'>, theme: ThemeId): string {
  const key = `${theme}|${tile.kind}|${tile.enh ?? ''}`;
  let s = cache.get(key);
  if (!s) {
    s = tileSvg(specOf(tile.kind), { theme, ...(tile.enh ? { enh: tile.enh } : {}) });
    cache.set(key, s);
  }
  return s;
}

const backCache = new Map<ThemeId, string>();
function backSvg(theme: ThemeId): string {
  let s = backCache.get(theme);
  if (!s) {
    s = tileSvg({ suit: 'back', rank: 0 }, { theme });
    backCache.set(theme, s);
  }
  return s;
}

/**
 * One tile, drawn from code. Its size comes from the CSS variable --tw (width) on it or a parent,
 * so the same component is a wall tile, a hand tile and a table tile. `data-flip` lets the
 * layout animate it from wherever it was.
 */
export function TileView({
  tile,
  theme,
  className = '',
  style,
}: {
  tile: Pick<Tile, 'id' | 'kind' | 'enh'>;
  theme: ThemeId;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`tile ${className}`}
      data-flip={tile.id}
      data-kind={tile.kind}
      style={style}
      dangerouslySetInnerHTML={{ __html: svgFor(tile, theme) }}
    />
  );
}

export function TileBack({ theme, className = '' }: { theme: ThemeId; className?: string }) {
  return (
    <span className={`tile ${className}`} dangerouslySetInnerHTML={{ __html: backSvg(theme) }} />
  );
}
