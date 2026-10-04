export const CONVEYOR = {
  cols: 7,
  rows: 6,
  beatMs: 700,
  feedEvery: 2,
  packets: 8,
  feeder: 14,
  bays: [13, 34],
  scores: { pair: 20, triple: 45, run: 60 },
} as const;
export type Direction = 'E' | 'S' | 'W' | 'N';
export const DIRECTIONS: readonly Direction[] = ['E', 'S', 'W', 'N'];
export type Recipe = 'pair' | 'triple' | 'run';
