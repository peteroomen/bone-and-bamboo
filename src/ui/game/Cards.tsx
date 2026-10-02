import type { ReactNode } from 'react';
import { CURIOS, type Rarity } from '@/content/curios';
import { CURIO_GLYPH } from '@/ui/art/glyphs';

/** The picture of a curio, fortune, page or pack: a rounded square with a glyph (a placeholder). */
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

export function CurioGlyph({ id, size }: { id: string; size?: number }) {
  const c = CURIOS[id];
  return (
    <Glyph
      char={CURIO_GLYPH[id] ?? '?'}
      {...(c ? { rarity: c.rarity } : {})}
      {...(size ? { size } : {})}
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
