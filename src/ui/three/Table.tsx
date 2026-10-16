import { Canvas, useThree } from '@react-three/fiber';
import { type ReactNode, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { THEMES, type ThemeId } from '@/ui/art/tiles';
import { RACK, TRAY } from './layout';

/**
 * The camera looks down at the table from the player's side. It backs off until the tray and the
 * rack both fit the screen, leaving room at the top and bottom for the bars drawn over it.
 */
function CameraRig({ top, bottom }: { top: number; bottom: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    // what must be seen, in world units: the tray's far wall to the rack's last row
    const near = RACK.z + 2 * RACK.rowGap + 0.9;
    const far = TRAY.z - TRAY.d / 2 - TRAY.wall;
    const width = TRAY.w + TRAY.wall * 2 + 0.4;
    const tilt = 0.42; // radians from straight down
    const fov = 30;
    cam.fov = fov;
    // the share of the screen height free for the table
    const free = Math.max(0.35, 1 - (top + bottom) / Math.max(1, size.height));
    const vh = Math.tan(((fov / 2) * Math.PI) / 180) * 2;
    const needH = (near - far) * Math.cos(tilt) * 1.02;
    const distH = needH / (vh * free);
    const distW = width / (vh * aspect);
    const dist = Math.max(distH, distW);
    // aim so the table sits between the bars
    const midZ = (near + far) / 2;
    const shift = ((top - bottom) / 2 / Math.max(1, size.height)) * vh * dist;
    const target = new THREE.Vector3(0, 0, midZ - shift / Math.cos(tilt));
    cam.position.set(0, target.y + dist * Math.cos(tilt), target.z + dist * Math.sin(tilt));
    cam.lookAt(target);
    cam.near = 0.5;
    cam.far = 200;
    cam.updateProjectionMatrix();
  }, [camera, size, top, bottom]);
  return null;
}

function wood(theme: ThemeId): THREE.CanvasTexture {
  const T = THEMES[theme];
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = T.table;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath();
    const y = Math.random() * 512;
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 6);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function TrayAndTable({ theme }: { theme: ThemeId }) {
  const T = THEMES[theme];
  const tex = useMemo(() => wood(theme), [theme]);
  const felt = useMemo(() => new THREE.Color(T.back).multiplyScalar(0.7), [T]);
  const rim = T.table2;
  const hw = TRAY.w / 2;
  const hd = TRAY.d / 2;
  const h = 0.55;
  const t = TRAY.wall;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[TRAY.x, 0.002, TRAY.z]} receiveShadow>
        <planeGeometry args={[TRAY.w, TRAY.d]} />
        <meshStandardMaterial color={felt} roughness={1} />
      </mesh>
      {(
        [
          [TRAY.x, TRAY.z - hd - t / 2, TRAY.w + 2 * t, t],
          [TRAY.x, TRAY.z + hd + t / 2, TRAY.w + 2 * t, t],
          [TRAY.x - hw - t / 2, TRAY.z, t, TRAY.d],
          [TRAY.x + hw + t / 2, TRAY.z, t, TRAY.d],
        ] as const
      ).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={rim} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff4e0', '#3a2a1c', 0.9]} />
      <directionalLight
        position={[-4, 14, 6]}
        intensity={1.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0008}
      />
      <pointLight position={[3, 6, -3]} intensity={18} color="#ffd9a0" distance={18} />
    </>
  );
}

/** The 3D table under the game: tray, rack, lights and camera. */
export function Table({
  theme,
  top,
  bottom,
  children,
}: {
  theme: ThemeId;
  /** Pixels covered by the bars over the top and bottom of the screen. */
  top: number;
  bottom: number;
  children?: ReactNode;
}) {
  return (
    <Canvas
      className="table-canvas"
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{ fov: 30, position: [0, 14, 8] }}
    >
      <color attach="background" args={[THEMES[theme].table]} />
      <CameraRig top={top} bottom={bottom} />
      <Lights />
      <TrayAndTable theme={theme} />
      {children}
    </Canvas>
  );
}
