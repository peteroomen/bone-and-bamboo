import { DRAGONS } from '@/content/dragons';
import { FORTUNES, type FortuneId } from '@/content/fortunes';
import { PACKS, type PackId } from '@/content/packs';
import { SET_TYPES, type SetKind } from '@/content/sets';
import { FORTUNE_GLYPH, PACK_GLYPH, SET_GLYPH } from '@/ui/art/glyphs';
import { DragonGlyph, IconGlyph } from './Cards';

/** Name, text and picture for each kind of thing a shop, gift or pack offers. */
export const dragonCard = (id: string) => {
  const c = DRAGONS[id];
  return { name: c?.name ?? id, text: c?.text ?? '', glyph: <DragonGlyph id={id} /> };
};
export const fortuneCard = (id: FortuneId) => ({
  name: FORTUNES[id].name,
  text: FORTUNES[id].text,
  glyph: <IconGlyph id={id} char={FORTUNE_GLYPH[id]} />,
});
export const pageCard = (set: SetKind) => ({
  name: `${SET_TYPES[set].name} page`,
  text: `Level up: +${SET_TYPES[set].levelChips} chips, +${SET_TYPES[set].levelMult} mult`,
  glyph: <IconGlyph id={`page-${set}`} char={SET_GLYPH[set]} />,
});
export const packCard = (id: PackId) => ({
  name: `${PACKS[id].name} pack`,
  text: PACKS[id].text,
  glyph: <IconGlyph id={`pack-${id}`} char={PACK_GLYPH[id]} />,
});
