import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Candidate } from '@/engine/advice';
import type { RoundState } from '@/engine/round';
import type { RackSet } from '@/engine/sets';
import { THEMES, type ThemeId } from '@/ui/art/tiles';
import { busyEnd, busyStart, onEvents, speedFactor } from '@/ui/state/store';
import { emptySlots, rackSlots, TILE, tileX } from './layout';
import { drawn, now } from './motion';
import { smooth } from './physics';
import { TileMesh } from './TileMesh';

interface Flight {
  from: THREE.Vector3;
  t0: number;
  dur: number;
}

/** A tile on the rack; it flies in from its die when it was just taken. */
function RackTile({
  kind,
  enh,
  theme,
  at,
  flight,
}: {
  kind: string;
  enh?: RackSet['tiles'][number]['enh'];
  theme: ThemeId;
  at: THREE.Vector3;
  flight: Flight | undefined;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    if (!flight) {
      g.position.copy(at);
      g.rotation.set(0, 0, 0);
      return;
    }
    const s = Math.min(1, Math.max(0, (now() - flight.t0) / flight.dur));
    const e = smooth(s);
    g.position.copy(flight.from.clone().lerp(at, e));
    g.position.y += Math.sin(Math.PI * s) * 1.6;
    g.rotation.set((1 - e) * -1.2, 0, (1 - e) * 0.6);
  });
  return (
    <group ref={ref} position={at}>
      <TileMesh kind={kind} {...(enh ? { enh } : {})} theme={theme} />
    </group>
  );
}

function Slot({ x, z, tiles, theme }: { x: number; z: number; tiles: number; theme: ThemeId }) {
  const w = tiles * (TILE.w + 0.03) + 0.2;
  return (
    <mesh position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, TILE.h + 0.2]} />
      <meshBasicMaterial
        color={THEMES[theme].table2}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Your rack: four sets and a pair, laid out on the near side of the table. A finished hand
 * stays up while it is counted, then clears. Ghost tiles show what a target hand still needs.
 */
export function RackLayer({
  round,
  theme,
  ghosts,
  onRack,
}: {
  round: RoundState;
  theme: ThemeId;
  ghosts: readonly Candidate[];
  onRack: (index: number) => void;
}) {
  const [shown, setShown] = useState<{ rack: readonly RackSet[]; shelf: readonly string[] } | null>(
    null,
  );
  const flights = useRef(new Map<string, Flight>());

  useEffect(
    () =>
      onEvents((events, before) => {
        for (const ev of events) {
          if (ev.type !== 'round') continue;
          const e = ev.event;
          if (e.type === 'take') {
            const speed = speedFactor();
            const idx = e.upgrade ?? before.current?.rack.length ?? 0;
            const start =
              e.upgrade !== null ? (before.current?.rack[e.upgrade]?.tiles.length ?? 3) : 0;
            e.set.tiles.forEach((t, j) => {
              if (j < start) return;
              const from = drawn.get(t.dieId)?.p.clone() ?? new THREE.Vector3(0, 1, -2);
              flights.current.set(`${idx}:${j}`, {
                from,
                t0: now() + (j - start) * 0.06 * speed,
                dur: Math.max(0.01, 0.42 * speed),
              });
            });
            if (speed > 0) {
              busyStart();
              window.setTimeout(busyEnd, 600 * speed);
            }
          }
          if (e.type === 'mahjong') {
            // keep the finished hand on the table while it is counted
            setShown({ rack: e.rack, shelf: e.shelf });
          }
        }
      }),
    [],
  );
  // the count overlay clears this when it is done
  useEffect(() => {
    const clear = () => setShown(null);
    window.addEventListener('bb:counted', clear);
    return () => window.removeEventListener('bb:counted', clear);
  }, []);

  const rack = shown?.rack ?? round.rack;
  const shelf = shown?.shelf ?? round.shelf;
  const sevenPairs = rack.length >= 2 && rack.every((s) => s.kind === 'pair');
  const slots = rackSlots(
    rack.map((s) => s.kind),
    sevenPairs,
  );
  // ghost tiles go into the empty slots, sets first, the pair last
  const empty = emptySlots();
  const usedSets = rack.filter((s) => s.kind !== 'pair').length;
  const hasPair = rack.some((s) => s.kind === 'pair');
  const ghostPlaces: { c: Candidate; x: number; z: number }[] = [];
  if (!sevenPairs && !shown) {
    let setSlot = usedSets;
    for (const g of ghosts) {
      if (g.kind === 'pair') {
        if (!hasPair)
          ghostPlaces.push({
            c: g,
            x: (empty[4] as { x: number }).x,
            z: (empty[4] as { z: number }).z,
          });
      } else if (setSlot < 4) {
        const s = empty[setSlot] as { x: number; z: number };
        ghostPlaces.push({ c: g, x: s.x, z: s.z });
        setSlot++;
      }
    }
  }

  const click = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!shown) onRack(i);
  };

  return (
    <group>
      {!sevenPairs ? empty.map((s, i) => <Slot key={i} {...s} theme={theme} />) : null}
      {rack.map((set, i) => {
        const slot = slots[i];
        if (!slot) return null;
        return (
          <group key={`${i}:${set.kind}`} onClick={click(i)}>
            {set.tiles.map((t, j) => (
              <RackTile
                key={j}
                kind={t.kind}
                {...(t.enh ? { enh: t.enh } : {})}
                theme={theme}
                at={new THREE.Vector3(tileX(slot.x, j, set.tiles.length), 0, slot.z)}
                flight={flights.current.get(`${i}:${j}`)}
              />
            ))}
          </group>
        );
      })}
      {ghostPlaces.map((g, i) =>
        g.c.tiles.map((k, j) => (
          <TileMesh
            key={`g${i}:${j}`}
            kind={k}
            theme={theme}
            ghost
            position={[tileX(g.x, j, g.c.tiles.length), 0, g.z]}
          />
        )),
      )}
      {shelf.map((k, i) => (
        <TileMesh
          key={`b${i}`}
          kind={k}
          theme={theme}
          scale={0.7}
          position={[
            2.4 + (i % 4) * 0.6,
            0,
            (empty[4] as { z: number }).z + Math.floor(i / 4) * 0.8,
          ]}
        />
      ))}
    </group>
  );
}
