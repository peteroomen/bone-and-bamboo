import type { CSSProperties } from 'react';
import type { EnhancementId } from '@/content/enhancements';
import type { TileKind } from '@/content/tiles';
import { type ThemeId, specOf, tileSvg } from './tiles';

const cache = new Map<string, string>();

function svgFor(kind: TileKind | null, enh: EnhancementId | undefined, theme: ThemeId): string {
  const key = `${theme}|${kind ?? 'blank'}|${enh ?? ''}`;
  let s = cache.get(key);
  if (!s) {
    s = kind
      ? tileSvg(specOf(kind), { theme, ...(enh ? { enh } : {}) })
      : tileSvg({ suit: 'dots', rank: 1 }, { theme, enh: 'blank' });
    cache.set(key, s);
  }
  return s;
}

/**
 * One tile as a flat picture (for the interface: the shop, the hand book, the take buttons).
 * Its size comes from the CSS variable --tw (width) on it or a parent.
 */
export function TileView({
  kind,
  enh,
  theme,
  className = '',
  style,
  ghost = false,
}: {
  kind: TileKind | null;
  enh?: EnhancementId | undefined;
  theme: ThemeId;
  className?: string;
  style?: CSSProperties;
  ghost?: boolean;
}) {
  return (
    <span
      className={`tile ${ghost ? 'tile-ghost' : ''} ${className}`}
      data-kind={kind ?? 'blank'}
      style={style}
      dangerouslySetInnerHTML={{ __html: svgFor(kind, enh, theme) }}
    />
  );
}

export function TileRow({
  kinds,
  theme,
  className = '',
}: {
  kinds: readonly (TileKind | null)[];
  theme: ThemeId;
  className?: string;
}) {
  return (
    <span className={`tile-row ${className}`}>
      {kinds.map((k, i) => (
        <TileView key={i} kind={k} theme={theme} />
      ))}
    </span>
  );
}
