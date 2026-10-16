import { useMemo } from 'react';
import * as THREE from 'three';
import type { EnhancementId } from '@/content/enhancements';
import type { TileKind } from '@/content/tiles';
import { THEMES, type ThemeId } from '@/ui/art/tiles';
import { faceTexture } from './faces';
import { TILE } from './layout';

const bodyGeo = new THREE.BoxGeometry(TILE.w, TILE.d * 0.55, TILE.h);
const backGeo = new THREE.BoxGeometry(TILE.w, TILE.d * 0.45, TILE.h);
const faceGeo = new THREE.PlaneGeometry(TILE.w * 0.96, TILE.h * 0.96);

/**
 * A mahjong tile lying face up on the table: an ivory front over a coloured back, with the
 * tile's face drawn by the tile generator. `ghost` draws it faint (a tile the target still needs).
 */
export function TileMesh({
  kind,
  enh,
  theme,
  ghost = false,
  position,
  rotation,
  scale = 1,
}: {
  kind: TileKind;
  enh?: EnhancementId;
  theme: ThemeId;
  ghost?: boolean;
  position?: [number, number, number] | THREE.Vector3;
  rotation?: [number, number, number];
  scale?: number;
}) {
  const T = THEMES[theme];
  const mats = useMemo(() => {
    const tex = faceTexture(kind, enh, theme, 'tile');
    const face = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.45,
      transparent: ghost,
      opacity: ghost ? 0.3 : 1,
    });
    const ivory = new THREE.MeshStandardMaterial({
      color: T.face,
      roughness: 0.5,
      transparent: ghost,
      opacity: ghost ? 0.12 : 1,
    });
    const back = new THREE.MeshStandardMaterial({
      color: T.back,
      roughness: 0.55,
      transparent: ghost,
      opacity: ghost ? 0.08 : 1,
    });
    return { face, ivory, back };
  }, [kind, enh, theme, ghost, T]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh
        geometry={backGeo}
        material={mats.back}
        position={[0, (TILE.d * 0.45) / 2, 0]}
        castShadow={!ghost}
      />
      <mesh
        geometry={bodyGeo}
        material={mats.ivory}
        position={[0, TILE.d * 0.45 + (TILE.d * 0.55) / 2, 0]}
        castShadow={!ghost}
      />
      <mesh
        geometry={faceGeo}
        material={mats.face}
        position={[0, TILE.d + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}
