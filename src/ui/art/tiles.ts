/* Bone & Bamboo tile art: every tile drawn as SVG from code (ported from art-source/tiles/tiles.js).
 *
 *   tileSvg({ suit: "dots", rank: 5 }, { theme: "theatre", index: true, enh, edition, chop })
 *
 * The tile is 60 x 80: a 56 x 72 face on a coloured back that shows 4px below it (the tile's
 * thickness). Original drawings; the Chinese characters need a CJK serif (Noto Serif SC here).
 */
import type { EnhancementId } from '@/content/enhancements';
import type { TileKind } from '@/content/tiles';

export type ThemeId = 'theatre' | 'porcelain' | 'papercut';
export type TileSuitName =
  'dots' | 'bamboo' | 'chars' | 'wind' | 'dragon' | 'flower' | 'season' | 'back';

export interface TileSpec {
  readonly suit: TileSuitName;
  readonly rank: number;
}

export interface TileOptions {
  readonly theme?: ThemeId;
  readonly index?: boolean;
  readonly enh?: EnhancementId | 'iron' | 'wild' | 'blank' | 'lucky';
  readonly edition?: 'lacquer' | 'pearl' | 'cloisonne' | 'paper';
  readonly chop?: 'red' | 'gold' | 'blue' | 'purple';
  readonly width?: number;
}

export interface Theme {
  name: string;
  face: string;
  face2: string;
  back: string;
  back2: string;
  edge: string;
  ink: string;
  blue: string;
  green: string;
  red: string;
  gold: string;
  brown: string;
  chestnut: string;
  pink: string;
  purple: string;
  yellow: string;
  table: string;
  table2: string;
  glow: string;
}

type Attrs = Record<string, string | number | undefined | null>;
interface EnhLook {
  face: string;
  ink: string | null;
  under: string;
  over: string;
}

/** The game's kind strings (p5, w1, d3) as generator tile specs. */
export function specOf(kind: TileKind): TileSpec {
  const rank = Number(kind.slice(1));
  switch (kind.charAt(0)) {
    case 'p':
      return { suit: 'dots', rank };
    case 's':
      return { suit: 'bamboo', rank };
    case 'm':
      return { suit: 'chars', rank };
    case 'w':
      return { suit: 'wind', rank };
    default:
      return { suit: 'dragon', rank };
  }
}

// prettier-ignore
export const THEMES: Record<ThemeId, Theme> = {
  // A: shadow theatre. Bone faces, jade backs, ink and vermilion.
  theatre: {
    name: 'Shadow theatre',
    face: '#f3ead6',
    face2: '#e6d9bd',
    back: '#2f7a64',
    back2: '#225c4b',
    edge: '#2a211b',
    ink: '#1f1a17',
    blue: '#2a4f8f',
    green: '#2f7a45',
    red: '#b3322a',
    gold: '#c99a2e',
    brown: '#8a5a34',
    chestnut: '#9a4a22',
    pink: '#d9667a',
    purple: '#7a4a8f',
    yellow: '#d9a21f',
    table: '#3a2618',
    table2: '#5a3a22',
    glow: '#ffd98a',
  },
  // B: blue-and-white porcelain. Cobalt on white glaze, a touch of underglaze red.
  porcelain: {
    name: 'Porcelain',
    face: '#f8f8f4',
    face2: '#e7ebef',
    back: '#2c4f8f',
    back2: '#1f3a6b',
    edge: '#1e3f7a',
    ink: '#1e3f7a',
    blue: '#1f4f9a',
    green: '#4a78b8',
    red: '#b8322a',
    gold: '#9aa9c2',
    brown: '#3a5f9a',
    chestnut: '#1e3f7a',
    pink: '#6f93c9',
    purple: '#2c4f8f',
    yellow: '#6f93c9',
    table: '#dfe6ee',
    table2: '#c8d3e0',
    glow: '#1f4f9a',
  },
  // C: papercut. Red cut paper on cream, black ink for words.
  papercut: {
    name: 'Papercut',
    face: '#f2e6d0',
    face2: '#e4d3b4',
    back: '#b3261e',
    back2: '#8a1c16',
    edge: '#2c1c18',
    ink: '#2c1c18',
    blue: '#b3261e',
    green: '#b3261e',
    red: '#b3261e',
    gold: '#d9a21f',
    brown: '#b3261e',
    chestnut: '#2c1c18',
    pink: '#b3261e',
    purple: '#b3261e',
    yellow: '#d9a21f',
    table: '#e9dcc3',
    table2: '#d6c4a3',
    glow: '#b3261e',
  },
};

const HAN = "'Noto Serif SC','Songti SC','SimSun',serif";
const MONO = "'IBM Plex Mono',ui-monospace,monospace";
const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const WIND = ['', '東', '南', '西', '北'];
const WIND_EN = ['', 'E', 'S', 'W', 'N'];
const FLOWER = ['', '梅', '蘭', '菊', '竹'];
const SEASON = ['', '春', '夏', '秋', '冬'];

function n(v: number): number {
  return Math.round(v * 100) / 100;
}
function attrs(o: Attrs): string {
  let s = '';
  for (const k in o) {
    const v = o[k];
    if (v !== undefined && v !== null) s += ' ' + k + '="' + v + '"';
  }
  return s;
}
function el(name: string, o: Attrs, inner?: string): string {
  return '<' + name + attrs(o) + (inner === undefined ? '/>' : '>' + inner + '</' + name + '>');
}
function text(
  x: number,
  y: number,
  size: number,
  fill: string,
  str: string,
  extra?: Attrs,
): string {
  const o: Attrs = {
    x: n(x),
    y: n(y),
    'font-size': size,
    fill: fill,
    'text-anchor': 'middle',
    'font-family': HAN,
    'font-weight': 900,
  };
  return el('text', { ...o, ...extra }, str);
}

// ---- motifs -----------------------------------------------------------------------------
function dot(cx: number, cy: number, r: number, col: string, T: Theme): string {
  return (
    el('circle', { cx: n(cx), cy: n(cy), r: n(r), fill: col }) +
    el('circle', { cx: n(cx), cy: n(cy), r: n(r * 0.66), fill: T.face }) +
    el('circle', { cx: n(cx), cy: n(cy), r: n(r * 0.44), fill: col }) +
    el('circle', { cx: n(cx), cy: n(cy), r: n(r * 0.15), fill: T.face })
  );
}

function bigDot(T: Theme): string {
  let s = '';
  const cx = 30;
  const cy = 40;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s += el('circle', {
      cx: n(cx + Math.cos(a) * 18.5),
      cy: n(cy + Math.sin(a) * 18.5),
      r: 2.6,
      fill: i % 2 ? T.green : T.blue,
    });
  }
  s += el('circle', { cx: cx, cy: cy, r: 15, fill: T.blue });
  s += el('circle', { cx: cx, cy: cy, r: 12.2, fill: T.face });
  s += el('circle', { cx: cx, cy: cy, r: 10, fill: T.red });
  for (let j = 0; j < 8; j++) {
    const b = (j / 8) * Math.PI * 2;
    s += el('circle', {
      cx: n(cx + Math.cos(b) * 6.4),
      cy: n(cy + Math.sin(b) * 6.4),
      r: 1.7,
      fill: T.face,
    });
  }
  s += el('circle', { cx: cx, cy: cy, r: 3, fill: T.face });
  return s;
}

// prettier-ignore
const DOTS: Record<number, [number, number, number, string][]> = {
  2: [
    [30, 26, 10, 'green'],
    [30, 54, 10, 'blue'],
  ],
  3: [
    [18.5, 24.5, 8.2, 'blue'],
    [30, 40, 8.2, 'red'],
    [41.5, 55.5, 8.2, 'green'],
  ],
  4: [
    [19, 27, 8.5, 'blue'],
    [41, 27, 8.5, 'green'],
    [19, 53, 8.5, 'green'],
    [41, 53, 8.5, 'blue'],
  ],
  5: [
    [18, 24, 7.5, 'blue'],
    [42, 24, 7.5, 'green'],
    [30, 40, 7.5, 'red'],
    [18, 56, 7.5, 'green'],
    [42, 56, 7.5, 'blue'],
  ],
  6: [
    [20, 22, 7, 'green'],
    [40, 22, 7, 'green'],
    [20, 40, 7, 'red'],
    [40, 40, 7, 'red'],
    [20, 58, 7, 'red'],
    [40, 58, 7, 'red'],
  ],
  7: [
    [17, 21, 5.8, 'green'],
    [30, 28, 5.8, 'green'],
    [43, 35, 5.8, 'green'],
    [21, 50, 5.8, 'red'],
    [39, 50, 5.8, 'red'],
    [21, 63, 5.8, 'red'],
    [39, 63, 5.8, 'red'],
  ],
  8: [
    [21, 20, 5.8, 'blue'],
    [39, 20, 5.8, 'blue'],
    [21, 33.5, 5.8, 'blue'],
    [39, 33.5, 5.8, 'blue'],
    [21, 47, 5.8, 'blue'],
    [39, 47, 5.8, 'blue'],
    [21, 60.5, 5.8, 'blue'],
    [39, 60.5, 5.8, 'blue'],
  ],
  9: [
    [17, 24, 5.8, 'blue'],
    [30, 24, 5.8, 'blue'],
    [43, 24, 5.8, 'blue'],
    [17, 40, 5.8, 'red'],
    [30, 40, 5.8, 'red'],
    [43, 40, 5.8, 'red'],
    [17, 56, 5.8, 'green'],
    [30, 56, 5.8, 'green'],
    [43, 56, 5.8, 'green'],
  ],
};

function stick(cx: number, cy: number, h: number, col: string, T: Theme, w?: number): string {
  w = w || 5.4;
  const x = cx - w / 2;
  const y = cy - h / 2;
  let s = '';
  s += el('rect', { x: n(x), y: n(y), width: n(w), height: n(h), rx: n(w / 2), fill: col });
  s += el('rect', {
    x: n(cx - 0.6),
    y: n(y + 2.4),
    width: 1.2,
    height: n(h - 4.8),
    rx: 0.6,
    fill: T.face,
    opacity: 0.55,
  });
  [y + 1.2, cy, y + h - 1.2].forEach(function (yy) {
    s += el('rect', {
      x: n(x - 0.7),
      y: n(yy - 0.9),
      width: n(w + 1.4),
      height: 1.8,
      rx: 0.9,
      fill: col,
    });
    s += el('rect', {
      x: n(x),
      y: n(yy - 0.35),
      width: n(w),
      height: 0.7,
      fill: T.face,
      opacity: 0.8,
    });
  });
  return s;
}

// prettier-ignore
const BAMBOO: Record<number, [number, number, number, string][]> = {
  2: [
    [30, 26, 22, 'green'],
    [30, 54, 22, 'blue'],
  ],
  3: [
    [30, 26, 22, 'green'],
    [21, 54, 22, 'blue'],
    [39, 54, 22, 'blue'],
  ],
  4: [
    [21, 26, 22, 'blue'],
    [39, 26, 22, 'green'],
    [21, 54, 22, 'green'],
    [39, 54, 22, 'blue'],
  ],
  5: [
    [18, 26, 22, 'green'],
    [42, 26, 22, 'blue'],
    [30, 40, 22, 'red'],
    [18, 54, 22, 'blue'],
    [42, 54, 22, 'green'],
  ],
  6: [
    [18, 26, 22, 'green'],
    [30, 26, 22, 'green'],
    [42, 26, 22, 'green'],
    [18, 54, 22, 'blue'],
    [30, 54, 22, 'blue'],
    [42, 54, 22, 'blue'],
  ],
  7: [
    [30, 19, 16, 'red'],
    [18, 40, 16, 'green'],
    [30, 40, 16, 'green'],
    [42, 40, 16, 'green'],
    [18, 60, 16, 'blue'],
    [30, 60, 16, 'blue'],
    [42, 60, 16, 'blue'],
  ],
  8: [
    [14, 26, 22, 'green'],
    [25.3, 26, 22, 'blue'],
    [34.7, 26, 22, 'blue'],
    [46, 26, 22, 'green'],
    [14, 54, 22, 'green'],
    [25.3, 54, 22, 'blue'],
    [34.7, 54, 22, 'blue'],
    [46, 54, 22, 'green'],
  ],
  9: [
    [18, 22, 15, 'green'],
    [30, 22, 15, 'red'],
    [42, 22, 15, 'blue'],
    [18, 40.5, 15, 'green'],
    [30, 40.5, 15, 'red'],
    [42, 40.5, 15, 'blue'],
    [18, 59, 15, 'green'],
    [30, 59, 15, 'red'],
    [42, 59, 15, 'blue'],
  ],
};

// The 1 of Bamboo: a tree sparrow on a bamboo stem. It is the game's guide.
function sparrow(T: Theme): string {
  let s = '';
  // the stem it perches on
  s += el('path', {
    d: 'M10 68 L52 46',
    stroke: T.green,
    'stroke-width': 4,
    'stroke-linecap': 'round',
    fill: 'none',
  });
  s += el('path', {
    d: 'M27 59 l1.5 -3 M41 51.6 l1.5 -3',
    stroke: T.face,
    'stroke-width': 1,
    fill: 'none',
  });
  s += el('path', { d: 'M44 50 q6 -10 12 -9 q-4 6 -12 9z', fill: T.green });
  // tail
  s += el('path', { d: 'M17 49 L5 58 L9 61 L21 53z', fill: T.brown });
  // body
  s += el('ellipse', {
    cx: 28,
    cy: 43,
    rx: 13,
    ry: 10.5,
    fill: T.brown,
    transform: 'rotate(-18 28 43)',
  });
  s += el('path', { d: 'M22 50 q9 6 18 -3 q-2 -6 -8 -7 q-7 2 -10 10z', fill: T.face2 });
  // wing with feather bars
  s += el('path', { d: 'M18 44 q8 -10 19 -6 q-4 9 -19 6z', fill: T.chestnut });
  s += el('path', {
    d: 'M22 43.5 l12 -3 M23 46 l11 -3',
    stroke: T.face,
    'stroke-width': 0.9,
    fill: 'none',
  });
  // head: chestnut cap, white cheek, black spot and bib
  s += el('circle', { cx: 40, cy: 30, r: 8.4, fill: T.face });
  s += el('path', {
    d: 'M31.8 29.5 a8.4 8.4 0 0 1 16.6 -1.6 q-8 -1.5 -16.6 1.6z',
    fill: T.chestnut,
  });
  s += el('circle', { cx: 39, cy: 33, r: 2.1, fill: T.ink });
  s += el('path', { d: 'M44 36 q2 4 -2 6 q-3 -1 -3 -3z', fill: T.ink });
  s += el('circle', { cx: 43.6, cy: 29.4, r: 1.25, fill: T.ink });
  s += el('path', { d: 'M47.8 30 l5 1.2 l-4.6 1.8z', fill: T.ink });
  // feet
  s += el('path', {
    d: 'M28 53 l-1 4 M33 52 l0 4',
    stroke: T.ink,
    'stroke-width': 1.2,
    'stroke-linecap': 'round',
    fill: 'none',
  });
  return s;
}

function petals(
  cx: number,
  cy: number,
  r: number,
  col: string,
  centre: string | undefined,
  T: Theme,
): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    s += el('circle', {
      cx: n(cx + Math.cos(a) * r * 0.62),
      cy: n(cy + Math.sin(a) * r * 0.62),
      r: n(r * 0.5),
      fill: col,
    });
  }
  return s + el('circle', { cx: n(cx), cy: n(cy), r: n(r * 0.28), fill: centre || T.yellow });
}

function flowerMotif(rank: number, T: Theme): string {
  let s = '';
  if (rank === 1) {
    // plum
    s += el('path', {
      d: 'M12 62 Q22 48 30 44 T48 22 M30 44 Q38 46 44 54',
      stroke: T.brown,
      'stroke-width': 2.6,
      fill: 'none',
      'stroke-linecap': 'round',
    });
    s +=
      petals(30, 42, 9, T.pink, T.yellow, T) +
      petals(46, 24, 7, T.pink, T.yellow, T) +
      petals(44, 55, 6, T.pink, T.yellow, T);
  } else if (rank === 2) {
    // orchid
    s += el('path', {
      d: 'M30 64 Q16 46 12 26',
      stroke: T.green,
      'stroke-width': 2.4,
      fill: 'none',
      'stroke-linecap': 'round',
    });
    s += el('path', {
      d: 'M30 64 Q40 44 50 34',
      stroke: T.green,
      'stroke-width': 2.4,
      fill: 'none',
      'stroke-linecap': 'round',
    });
    s += el('path', {
      d: 'M30 64 Q28 46 34 30',
      stroke: T.green,
      'stroke-width': 2,
      fill: 'none',
      'stroke-linecap': 'round',
    });
    s += el('path', {
      d: 'M34 30 q-8 -6 -4 -12 q4 4 4 12z M34 30 q8 -4 12 2 q-6 2 -12 -2z M34 30 q-2 6 -8 6 q2 -6 8 -6z',
      fill: T.purple,
    });
    s += el('circle', { cx: 34, cy: 30, r: 1.8, fill: T.yellow });
  } else if (rank === 3) {
    // chrysanthemum
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      s += el('ellipse', {
        cx: n(30 + Math.cos(a) * 9),
        cy: n(36 + Math.sin(a) * 9),
        rx: 6,
        ry: 2.2,
        fill: i % 2 ? T.yellow : T.gold,
        transform:
          'rotate(' +
          n((a * 180) / Math.PI) +
          ' ' +
          n(30 + Math.cos(a) * 9) +
          ' ' +
          n(36 + Math.sin(a) * 9) +
          ')',
      });
    }
    s += el('circle', { cx: 30, cy: 36, r: 5, fill: T.chestnut });
    s += el('path', {
      d: 'M30 48 L30 66 M30 58 q-8 -2 -10 -8 q8 0 10 8z',
      stroke: T.green,
      'stroke-width': 2.2,
      fill: T.green,
    });
  } else {
    // bamboo
    s += stick(24, 42, 46, T.green, T, 5);
    s += el('path', {
      d: 'M26 30 q12 -8 22 -6 q-10 6 -22 6z M26 44 q14 -2 22 6 q-12 0 -22 -6z M22 36 q-8 -6 -12 -2 q6 4 12 2z',
      fill: T.green,
    });
  }
  return s;
}

function seasonMotif(rank: number, T: Theme): string {
  let s = '';
  if (rank === 1) {
    // spring: a sprouting willow branch
    s += el('path', {
      d: 'M14 20 Q30 26 32 66',
      stroke: T.brown,
      'stroke-width': 2.2,
      fill: 'none',
    });
    [
      [20, 24],
      [27, 32],
      [30, 42],
      [32, 52],
    ].forEach(function (p, i) {
      s += el('path', {
        d:
          'M' +
          p[0] +
          ' ' +
          p[1] +
          ' q' +
          (i % 2 ? 9 : -9) +
          ' 3 ' +
          (i % 2 ? 12 : -10) +
          ' 12 q' +
          (i % 2 ? -8 : 7) +
          ' -2 ' +
          (i % 2 ? -12 : 10) +
          ' -12z',
        fill: T.green,
      });
    });
  } else if (rank === 2) {
    // summer: a lotus
    s += el('path', { d: 'M30 40 q-10 -14 0 -24 q10 10 0 24z', fill: T.pink });
    s += el('path', {
      d: 'M30 40 q-16 -6 -18 -18 q12 2 18 18z M30 40 q16 -6 18 -18 q-12 2 -18 18z',
      fill: T.pink,
      opacity: 0.85,
    });
    s += el('path', { d: 'M10 50 q20 -12 40 0 q-20 8 -40 0z', fill: T.green });
    s += el('path', { d: 'M30 46 L30 66', stroke: T.green, 'stroke-width': 2.2 });
  } else if (rank === 3) {
    // autumn: a ginkgo leaf
    s += el('path', { d: 'M30 64 L30 46', stroke: T.chestnut, 'stroke-width': 2 });
    s += el('path', { d: 'M30 46 L12 26 Q30 12 48 26 Z', fill: T.yellow });
    s += el('path', {
      d: 'M30 46 L30 22 M30 46 L22 26 M30 46 L38 26',
      stroke: T.gold,
      'stroke-width': 1,
      fill: 'none',
    });
  } else {
    // winter: a snowflake
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2,
        x = 30 + Math.cos(a) * 18,
        y = 40 + Math.sin(a) * 18;
      s += el('line', {
        x1: 30,
        y1: 40,
        x2: n(x),
        y2: n(y),
        stroke: T.blue,
        'stroke-width': 2.4,
        'stroke-linecap': 'round',
      });
      const mx = 30 + Math.cos(a) * 11,
        my = 40 + Math.sin(a) * 11;
      [0.7, -0.7].forEach(function (d) {
        s += el('line', {
          x1: n(mx),
          y1: n(my),
          x2: n(mx + Math.cos(a + d) * 6),
          y2: n(my + Math.sin(a + d) * 6),
          stroke: T.blue,
          'stroke-width': 1.8,
          'stroke-linecap': 'round',
        });
      });
    }
    s += el('circle', { cx: 30, cy: 40, r: 3, fill: T.blue });
  }
  return s;
}

// ---- the corner index (training wheels) --------------------------------------------------
function index(tile: TileSpec, T: Theme): string {
  let label, col;
  if (tile.suit === 'dots') {
    label = tile.rank;
    col = T.blue;
  } else if (tile.suit === 'bamboo') {
    label = tile.rank;
    col = T.green;
  } else if (tile.suit === 'chars') {
    label = tile.rank;
    col = T.red;
  } else if (tile.suit === 'wind') {
    label = WIND_EN[tile.rank];
    col = T.ink;
  } else if (tile.suit === 'dragon') {
    label = ['', 'R', 'G', 'W'][tile.rank];
    col = [T.ink, T.red, T.green, T.blue][tile.rank];
  } else return '';
  let s = el(
    'text',
    { x: 5.6, y: 11.6, 'font-size': 8.6, 'font-weight': 600, 'font-family': MONO, fill: col },
    String(label),
  );
  if (tile.suit === 'dots') s += el('circle', { cx: 13.4, cy: 8.4, r: 1.9, fill: col });
  if (tile.suit === 'bamboo')
    s += el('rect', { x: 12.5, y: 5.4, width: 2.2, height: 6.4, rx: 1.1, fill: col });
  if (tile.suit === 'chars')
    s += el(
      'text',
      {
        x: 14.4,
        y: 11.4,
        'font-size': 6.4,
        'font-family': HAN,
        'font-weight': 900,
        fill: col,
        'text-anchor': 'middle',
      },
      '萬',
    );
  return s;
}

// ---- faces -------------------------------------------------------------------------------
function faceArt(tile: TileSpec, T: Theme): string {
  const r = tile.rank;
  let s = '';
  switch (tile.suit) {
    case 'dots':
      if (r === 1) return bigDot(T);
      (DOTS[r] ?? []).forEach(function (d) {
        s += dot(d[0], d[1], d[2], T[d[3] as keyof Theme] as string, T);
      });
      return s;
    case 'bamboo':
      if (r === 1) return sparrow(T);
      (BAMBOO[r] ?? []).forEach(function (b) {
        s += stick(b[0], b[1], b[2], T[b[3] as keyof Theme] as string, T, r === 8 ? 5 : 5.4);
      });
      return s;
    case 'chars':
      return text(30, 37, 24, T.ink, NUM[r] ?? '') + text(30, 66, 26, T.red, '萬');
    case 'wind':
      return text(30, 52, 36, T.ink, WIND[r] ?? '');
    case 'dragon':
      if (r === 1) return text(30, 53, 40, T.red, '中');
      if (r === 2) return text(30, 52, 36, T.green, '發');
      return (
        el('rect', {
          x: 13,
          y: 15,
          width: 34,
          height: 50,
          rx: 3,
          fill: 'none',
          stroke: T.blue,
          'stroke-width': 3,
        }) +
        el('rect', {
          x: 18,
          y: 20,
          width: 24,
          height: 40,
          rx: 1.5,
          fill: 'none',
          stroke: T.blue,
          'stroke-width': 1,
        })
      );
    case 'flower':
      return (
        flowerMotif(r, T) +
        text(48, 15, 9, T.red, String(r), { 'font-family': MONO, 'font-weight': 600 }) +
        text(12, 68, 9, T.ink, FLOWER[r] ?? '')
      );
    case 'season':
      return (
        seasonMotif(r, T) +
        text(48, 15, 9, T.blue, String(r), { 'font-family': MONO, 'font-weight': 600 }) +
        text(12, 68, 9, T.ink, SEASON[r] ?? '')
      );
  }
  return '';
}

// enhancement looks: change the face, add a mark
function enhFace(enh: string | undefined, T: Theme): EnhLook {
  let face = T.face,
    ink = null,
    under = '',
    over = '';
  switch (enh) {
    case 'gold':
      face = '#ecd27a';
      under = el('rect', {
        x: 5,
        y: 5,
        width: 50,
        height: 66,
        rx: 5,
        fill: 'none',
        stroke: '#b8902a',
        'stroke-width': 1,
        opacity: 0.8,
      });
      over = el('path', {
        d: 'M2 20 L2 9 Q2 2 9 2 L20 2 Z M58 60 L58 67 Q58 74 51 74 L40 74 Z',
        fill: '#b8902a',
        opacity: 0.55,
      });
      break;
    case 'jade':
      face = '#cfe6d6';
      under = el('rect', {
        x: 4.5,
        y: 4.5,
        width: 51,
        height: 67,
        rx: 5.5,
        fill: 'none',
        stroke: '#3f9a72',
        'stroke-width': 2.2,
      });
      break;
    case 'bone':
      face = '#eadcc0';
      under =
        el('path', {
          d: 'M8 70 q22 -4 44 0 M8 6 q22 4 44 0',
          stroke: '#bfa77a',
          'stroke-width': 1,
          fill: 'none',
        }) +
        el('rect', {
          x: 5.5,
          y: 5.5,
          width: 49,
          height: 65,
          rx: 5,
          fill: 'none',
          stroke: '#bfa77a',
          'stroke-width': 0.8,
          'stroke-dasharray': '2 2',
        });
      break;
    case 'porcelain':
      face = '#fbfcfd';
      under = el('path', {
        d: 'M6 30 l8 3 l4 -5 l9 4 M34 8 l3 7 l7 1 l2 6 M40 66 l5 -6 l8 2 M6 56 l7 -2 l3 5',
        stroke: '#8fb0d9',
        'stroke-width': 0.7,
        fill: 'none',
      });
      break;
    case 'iron':
      face = '#4a4f55';
      ink = '#e9ecef';
      over = [
        [7, 7],
        [53, 7],
        [7, 69],
        [53, 69],
      ]
        .map(function (p) {
          return el('circle', { cx: p[0], cy: p[1], r: 1.6, fill: '#9aa3ad' });
        })
        .join('');
      break;
    case 'blank':
      face = '#b9b4aa';
      under = el('path', {
        d: 'M10 20 q10 -4 18 2 t20 -2 M8 44 q12 6 22 -2 t22 4 M14 62 q10 -6 20 0',
        stroke: '#8f897d',
        'stroke-width': 1.2,
        fill: 'none',
      });
      break;
    case 'wild':
      over = el(
        'g',
        {},
        [T.blue, T.green, T.red, T.gold]
          .map(function (c, i) {
            return el('circle', {
              cx: 46 + (i % 2) * 5.6,
              cy: 7.4 + Math.floor(i / 2) * 5.6,
              r: 2.3,
              fill: c,
              stroke: T.face,
              'stroke-width': 0.8,
            });
          })
          .join(''),
      );
      break;
    case 'lucky':
      over = el('path', {
        d: 'M49 4.6 l4 4 l-4 4 l-4 -4z M49 12.6 l-2.6 5 M49 12.6 l2.6 5',
        fill: T.red,
        stroke: T.red,
        'stroke-width': 1.2,
        'stroke-linecap': 'round',
      });
      break;
  }
  return { face: face, ink: ink, under: under, over: over };
}

function edition(ed: string | undefined): string {
  switch (ed) {
    case 'lacquer':
      return el('rect', {
        x: 3.2,
        y: 3.2,
        width: 53.6,
        height: 69.6,
        rx: 6.2,
        fill: 'none',
        stroke: '#a3221b',
        'stroke-width': 2.6,
      });
    case 'pearl':
      return (
        el(
          'defs',
          {},
          '<linearGradient id="pearl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6f0"/><stop offset=".35" stop-color="#d6f0ff"/><stop offset=".7" stop-color="#e6ffd9"/><stop offset="1" stop-color="#fff0c8"/></linearGradient>',
        ) +
        el('rect', {
          x: 2,
          y: 2,
          width: 56,
          height: 72,
          rx: 7,
          fill: 'url(#pearl)',
          opacity: 0.42,
          style: 'mix-blend-mode:multiply',
        })
      );
    case 'cloisonne':
      return (
        el('rect', {
          x: 3.4,
          y: 3.4,
          width: 53.2,
          height: 69.2,
          rx: 6,
          fill: 'none',
          stroke: '#2c6fb0',
          'stroke-width': 2.4,
        }) +
        el('rect', {
          x: 3.4,
          y: 3.4,
          width: 53.2,
          height: 69.2,
          rx: 6,
          fill: 'none',
          stroke: '#d4a53a',
          'stroke-width': 0.9,
          'stroke-dasharray': '3 2',
        })
      );
    case 'paper':
      return (
        el('path', {
          d: 'M2 38 L58 38',
          stroke: '#a99d86',
          'stroke-width': 0.6,
          'stroke-dasharray': '2 1.5',
        }) + el('path', { d: 'M58 2 L58 16 L44 2 Z', fill: '#d8ccb4' })
      );
  }
  return '';
}

// prettier-ignore
const CHOP: Record<string, [string, string]> = {
  red: ['#c2281e', '再'],
  gold: ['#c99a2e', '金'],
  blue: ['#2c5aa0', '書'],
  purple: ['#7a3f8f', '運'],
};
function chop(c: string | undefined): string {
  const ch = c ? CHOP[c] : undefined;
  if (!ch) return '';
  const col = ch[0];
  return el(
    'g',
    { transform: 'rotate(-6 47 62)' },
    el('rect', { x: 40, y: 55, width: 14, height: 14, rx: 1.5, fill: col }) +
      el('rect', {
        x: 41.4,
        y: 56.4,
        width: 11.2,
        height: 11.2,
        rx: 1,
        fill: 'none',
        stroke: '#fff6e6',
        'stroke-width': 0.8,
      }) +
      el(
        'text',
        {
          x: 47,
          y: 65.6,
          'font-size': 9,
          'font-family': HAN,
          'font-weight': 900,
          fill: '#fff6e6',
          'text-anchor': 'middle',
        },
        ch[1],
      ),
  );
}

function backArt(T: Theme): string {
  let s = el('rect', {
    x: 2,
    y: 2,
    width: 56,
    height: 72,
    rx: 7,
    fill: T.back,
    stroke: T.edge,
    'stroke-width': 1.5,
  });
  s += el('rect', {
    x: 7,
    y: 7,
    width: 46,
    height: 62,
    rx: 4,
    fill: 'none',
    stroke: T.back2,
    'stroke-width': 1.4,
  });
  // a carved sparrow-in-a-roundel mark
  s += el('circle', { cx: 30, cy: 38, r: 12, fill: 'none', stroke: T.back2, 'stroke-width': 1.6 });
  s += el('path', {
    d: 'M22 41 q4 -9 12 -7 q4 -5 8 -1 l3 0 l-3 2 q-1 7 -9 8 q-6 1 -11 -2z',
    fill: T.back2,
  });
  return s;
}

export function tileSvg(tile: TileSpec, opts: TileOptions = {}): string {
  opts = opts || {};
  const T = THEMES[opts.theme || 'theatre'];
  const size = opts.width
    ? ' width="' + opts.width + '" height="' + n((opts.width * 80) / 60) + '"'
    : '';
  const body = el('rect', {
    x: 2,
    y: 6,
    width: 56,
    height: 72,
    rx: 7,
    fill: T.back,
    stroke: T.edge,
    'stroke-width': 1.5,
  });
  if (tile.suit === 'back') {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"' +
      size +
      '>' +
      body +
      backArt(T) +
      '</svg>'
    );
  }
  const E = enhFace(opts.enh, T);
  let TT = T;
  if (E.ink) {
    // iron: light ink on a dark face
    TT = { ...T, ink: E.ink, face: E.face, face2: '#5d636a' };
  } else if (E.face !== T.face) {
    TT = { ...T, face: E.face };
  }
  let s = body;
  s += el('rect', {
    x: 2,
    y: 2,
    width: 56,
    height: 72,
    rx: 7,
    fill: E.face,
    stroke: T.edge,
    'stroke-width': 1.5,
  });
  s += E.under;
  if (opts.enh !== 'blank') {
    s += faceArt(tile, TT);
    if (opts.index !== false) s += index(tile, TT);
  }
  s += E.over;
  s += edition(opts.edition);
  s += chop(opts.chop);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"' + size + '>' + s + '</svg>';
}
