import type { FortuneId } from '@/content/fortunes';
import type { PackId } from '@/content/packs';
import type { SetKind } from '@/content/sets';

/**
 * Placeholder pictures until the traced object sheets arrive (docs/work/...-mvp-plan.md): a
 * rounded square with one character per kind. The real art will be a generated TypeScript file of
 * paths, looked up by the same ids.
 */
export const CURIO_GLYPH: Record<string, string> = {
  abacus: '算',
  redString: '紅',
  coinString: '錢',
  bambooGrove: '竹',
  coinPurse: '袋',
  scroll: '卷',
  sparrowNest: '巢',
  goldToad: '蟾',
  pongHall: '碰',
  outside: '門',
  ironTeapot: '壺',
  longSleeves: '袖',
  lantern: '燈',
  mahjong: '和',
  twoSuits: '魚',
  allSimples: '飯',
  pureStraight: '環',
  nightOwl: '梟',
  kongBell: '鐘',
  dragonLantern: '龍',
  twinCranes: '鶴',
};

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
  dragons: '龍',
  winds: '風',
  honour: '字',
  almanac: '曆',
};

export const SET_GLYPH: Record<SetKind, string> = {
  single: '單',
  pair: '對',
  chow: '順',
  pong: '碰',
  kong: '槓',
  dragons: '龍',
  winds: '風',
};
