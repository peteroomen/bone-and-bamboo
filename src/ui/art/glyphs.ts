import type { FortuneId } from '@/content/fortunes';
import type { PackId } from '@/content/packs';
import type { SetKind } from '@/content/sets';

export const FORTUNE_GLYPH: Record<FortuneId, string> = {
  rubbing: '拓',
  fire: '火',
  brush: '筆',
  jade: '玉',
  bone: '骨',
  gold: '金',
};

export const PACK_GLYPH: Record<PackId, string> = {
  fourth: '四',
  winds: '風',
  honour: '字',
  almanac: '曆',
};

export const SET_GLYPH: Record<SetKind, string> = {
  single: '單',
  pair: '對',
  chow: '順',
  run4: '連',
  run5: '長',
  pong: '碰',
  kong: '槓',
  winds: '風',
};
