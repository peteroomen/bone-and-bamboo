import * as THREE from 'three';

/**
 * Where things sit on the table, in world units (a cube die is 1 wide). The player looks down
 * from +z: the dice tray is the far half of the table, the rack the near half.
 */
export const TRAY = { x: 0, z: -2.9, w: 9.2, d: 5.6, wall: 0.5 } as const;
export const RACK = { z: 1.75, rowGap: 1.3 } as const;
/** A rack tile's size. */
export const TILE = { w: 0.78, h: 1.04, d: 0.56 } as const;

/** The resting place of die i of n in the tray: one row up to four, then two. */
export function slotPosition(i: number, n: number): THREE.Vector3 {
  const perRow = n <= 4 ? n : Math.ceil(n / 2);
  const row = Math.floor(i / perRow);
  const inRow = row === 0 ? Math.min(perRow, n) : n - perRow;
  const col = i - row * perRow;
  const gap = 2.25;
  const x = (col - (inRow - 1) / 2) * gap;
  const rows = n <= 4 ? 1 : 2;
  const z = TRAY.z + (row - (rows - 1) / 2) * 2.3;
  return new THREE.Vector3(x, 0, z);
}

/**
 * Where each rack tile goes. Sets go in a 2 × 2 grid and the pair below them; Seven Pairs uses
 * rows of three, three and one.
 */
export function rackSlots(
  kinds: readonly ('pair' | 'chow' | 'pong' | 'kong')[],
  sevenPairs: boolean,
) {
  const out: { set: number; x: number; z: number }[] = [];
  if (sevenPairs) {
    kinds.forEach((_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      out.push({ set: i, x: (col - 1) * 2.9, z: RACK.z + row * RACK.rowGap });
    });
    return out;
  }
  let setI = 0;
  kinds.forEach((k, i) => {
    if (k === 'pair') {
      out.push({ set: i, x: 0, z: RACK.z + 2 * RACK.rowGap });
      return;
    }
    const row = Math.floor(setI / 2);
    const col = setI % 2;
    out.push({ set: i, x: (col === 0 ? -1 : 1) * 2.45, z: RACK.z + row * RACK.rowGap });
    setI++;
  });
  return out;
}

/** The fixed spots on the rack, for the empty slots and the target's ghost tiles. */
export function emptySlots(): { x: number; z: number; tiles: number }[] {
  return [
    { x: -2.45, z: RACK.z, tiles: 3 },
    { x: 2.45, z: RACK.z, tiles: 3 },
    { x: -2.45, z: RACK.z + RACK.rowGap, tiles: 3 },
    { x: 2.45, z: RACK.z + RACK.rowGap, tiles: 3 },
    { x: 0, z: RACK.z + 2 * RACK.rowGap, tiles: 2 },
  ];
}

/** x of tile j in a set of n tiles centred on cx. */
export function tileX(cx: number, j: number, n: number): number {
  return cx + (j - (n - 1) / 2) * (TILE.w + 0.03);
}
