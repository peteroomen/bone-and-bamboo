import { CURIOS } from '@/content/curios';
import { FORTUNES, type FortuneId } from '@/content/fortunes';
import { PACKS, type PackId } from '@/content/packs';
import { SET_TYPES, type SetKind } from '@/content/sets';
import { FORTUNE_GLYPH, PACK_GLYPH, SET_GLYPH } from '@/ui/art/glyphs';
import { CurioGlyph, Glyph } from './Cards';

/** Name, text and picture for each kind of thing a shop, gift or pack offers. */
export const curioCard = (id: string) => {
  const c = CURIOS[id];
  return { name: c?.name ?? id, text: c?.text ?? '', glyph: <CurioGlyph id={id} /> };
};
export const fortuneCard = (id: FortuneId) => ({
  name: FORTUNES[id].name,
  text: FORTUNES[id].text,
  glyph: <Glyph char={FORTUNE_GLYPH[id]} />,
});
export const pageCard = (set: SetKind) => ({
  name: `${SET_TYPES[set].name} page`,
  text: `Level up: +${SET_TYPES[set].levelChips} chips, +${SET_TYPES[set].levelMult} mult`,
  glyph: <Glyph char={SET_GLYPH[set]} />,
});
export const packCard = (id: PackId) => ({
  name: `${PACKS[id].name} pack`,
  text: PACKS[id].text,
  glyph: <Glyph char={PACK_GLYPH[id]} />,
});
