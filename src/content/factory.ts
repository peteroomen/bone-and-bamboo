export const FACTORY = {
  traySize: 3,
  gateCost: 40,
  recycleBrass: 1,
  orderRuns: 2,
  orderScore: 60,
  orderBrass: 30,
  batches: 5,
  setsPerBatch: 4,
  autoMs: 1100,
} as const;
export const MACHINES = [
  {
    id: 'pair',
    name: 'Pair press',
    short: 'Press',
    capacity: 2,
    score: 20,
    rule: '2 identical tiles',
  },
  {
    id: 'triple',
    name: 'Triple kiln',
    short: 'Kiln',
    capacity: 3,
    score: 45,
    rule: '3 identical tiles',
  },
  {
    id: 'run',
    name: 'Run loom',
    short: 'Loom',
    capacity: 3,
    score: 60,
    rule: '3 in sequence · same suit',
  },
] as const;
export type MachineId = (typeof MACHINES)[number]['id'];
export type GateSuit = 'both' | 's' | 'p';
