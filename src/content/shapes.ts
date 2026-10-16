/**
 * Die shapes. Each face has an outward normal in the die's own frame; the engine works out which
 * faces are neighbours (for the Thumb) and which is opposite (for the Oracle Shell) from these,
 * and the 3D view builds its meshes from the same list, so face i is the same face everywhere.
 */
export type ShapeId = 'long' | 'd6' | 'd8' | 'd12';

export type Vec3 = readonly [number, number, number];

export interface Shape {
  readonly id: ShapeId;
  readonly name: string;
  readonly faces: number;
  /** Outward unit normals, one per face. */
  readonly normals: readonly Vec3[];
  readonly text: string;
}

const PHI = (1 + Math.sqrt(5)) / 2;

function unit(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

const r3 = 1 / Math.sqrt(3);

export const SHAPES: Record<ShapeId, Shape> = {
  // A long die: a bar that rolls on its four long sides (its ends are rounded).
  long: {
    id: 'long',
    name: 'Long die',
    faces: 4,
    normals: [
      [0, 1, 0],
      [0, 0, 1],
      [0, -1, 0],
      [0, 0, -1],
    ],
    text: 'Four faces: steady, few surprises.',
  },
  // A cube. Opposite faces add up to 5.
  d6: {
    id: 'd6',
    name: 'Cube',
    faces: 6,
    normals: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, -1],
      [0, -1, 0],
      [-1, 0, 0],
    ],
    text: 'Six faces.',
  },
  d8: {
    id: 'd8',
    name: 'Eight-sided die',
    faces: 8,
    normals: [
      [r3, r3, r3],
      [r3, r3, -r3],
      [r3, -r3, r3],
      [r3, -r3, -r3],
      [-r3, r3, r3],
      [-r3, r3, -r3],
      [-r3, -r3, r3],
      [-r3, -r3, -r3],
    ],
    text: 'Eight faces.',
  },
  // A dodecahedron: its face normals point at an icosahedron's corners.
  d12: {
    id: 'd12',
    name: 'Twelve-sided die',
    faces: 12,
    normals: (
      [
        [0, PHI, 1],
        [0, PHI, -1],
        [0, -PHI, 1],
        [0, -PHI, -1],
        [1, 0, PHI],
        [-1, 0, PHI],
        [1, 0, -PHI],
        [-1, 0, -PHI],
        [PHI, 1, 0],
        [PHI, -1, 0],
        [-PHI, 1, 0],
        [-PHI, -1, 0],
      ] as Vec3[]
    ).map(unit),
    text: 'Twelve faces: room for everything, sure of nothing.',
  },
};
