import type { ReactNode } from 'react';
import type { Rarity } from '@/content/dragons';
import { dragonTileSvg, iconSvg } from '@/ui/art/icons';
import { useTheme } from '@/ui/state/store';

/** The picture of a dragon, fortune, page or pack: a rounded square with a glyph (a placeholder). */
export function Glyph({
  char,
  rarity,
  size = 40,
}: {
  char: string;
  rarity?: Rarity;
  size?: number;
}) {
  return (
    <span
      className={`glyph${rarity ? ` r-${rarity}` : ''}`}
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {char}
    </span>
  );
}

/** A dragon: a plain tile with a picture and a White, Green or Red Dragon frame for its rarity. */
export function DragonGlyph({ id, size = 40 }: { id: string; size?: number }) {
  const theme = useTheme();
  return (
    <span
      className="dragon-tile"
      aria-hidden
      style={{ width: size * 0.75, height: size }}
      dangerouslySetInnerHTML={{ __html: dragonTileSvg(id, theme) }}
    />
  );
}

/** A fortune, pack or page: its traced icon when there is one, else a glyph square. */
export function IconGlyph({ id, char, size = 40 }: { id: string; char: string; size?: number }) {
  const theme = useTheme();
  const svg = iconSvg(id, theme);
  if (!svg) return <Glyph char={char} size={size} />;
  return (
    <span
      className="icon-glyph"
      aria-hidden
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** One offer in a shop, gift or pack: a picture, a name, a line of text and a price or action. */
export function OfferCard({
  glyph,
  name,
  text,
  price,
  note,
  disabled,
  sold,
  onClick,
  testId,
  children,
}: {
  glyph: ReactNode;
  name: string;
  text: string;
  price?: number | string;
  note?: string;
  disabled?: boolean;
  sold?: boolean;
  onClick?: () => void;
  testId?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`offer${sold ? ' sold' : ''}`}
      disabled={disabled || sold}
      onClick={onClick}
      data-testid={testId}
    >
      {glyph}
      <b className="offer-name">{name}</b>
      <span className="offer-text">{text}</span>
      {note && <i className="offer-note">{note}</i>}
      {children}
      <span className="offer-price">
        {sold ? 'Sold' : typeof price === 'number' ? `$${price}` : price}
      </span>
    </button>
  );
}
