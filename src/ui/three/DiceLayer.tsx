import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Die } from '@/engine/dice';
import { type CupDie, type RoundState, shownFace } from '@/engine/round';
import { THEMES, type ThemeId } from '@/ui/art/tiles';
import { haptics, sfx } from '@/ui/audio/audio';
import { busyEnd, busyStart, getState, onEvents, speedFactor } from '@/ui/state/store';
import { faceTexture } from './faces';
import { dieModel, restingQuaternion } from './geometry';
import { slotPosition } from './layout';
import { type Motion, drawn, motionLength, motions, now, onScreen, poseAt } from './motion';
import { FPS, type Obstacle, type Pose, simulateThrow } from './physics';

const HELD_LIFT = 0.18;

/** A die's resting pose in its slot, showing face f (or waiting, unrolled, if f is null). */
function homePose(die: Die, i: number, n: number, face: number | null, held: boolean): Pose {
  const model = dieModel(die.shape);
  const p = slotPosition(i, n);
  if (face === null) {
    // not rolled yet: leaning on an edge, nothing showing
    const q = restingQuaternion(model, 0).premultiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.55, 0.3, 0.35)),
    );
    p.y = model.restHeight + 0.22;
    return { p, q };
  }
  p.y = model.restHeight + (held ? HELD_LIFT : 0);
  return { p, q: restingQuaternion(model, face) };
}

function DieMesh({
  die,
  cup,
  theme,
  round,
  glow,
  onPick,
  onLong,
}: {
  die: Die;
  cup: CupDie;
  theme: ThemeId;
  round: RoundState;
  glow: 'hint' | 'pick' | null;
  onPick: (dieId: number) => void;
  onLong: (dieId: number) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const model = dieModel(die.shape);
  const T = THEMES[theme];
  const mirrored = cup.copy ? shownFace(round, cup) : null;
  const dim = cup.spent;
  const mats = useMemo(() => {
    const faces = die.faces.map(
      (f) =>
        new THREE.MeshStandardMaterial({
          map: faceTexture(f.kind, f.enh, theme, 'die'),
          roughness: 0.42,
          metalness: 0,
        }),
    );
    const body = new THREE.MeshStandardMaterial({ color: T.face, roughness: 0.5 });
    return [...faces, body];
  }, [die, theme, T]);
  useEffect(() => {
    const c = dim ? new THREE.Color('#77706a') : new THREE.Color('#ffffff');
    for (const m of mats) {
      if (m.map) m.color.copy(c);
      else m.color.set(dim ? '#8a8378' : T.face);
    }
  }, [dim, mats, T]);
  const ring = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  useFrame(() => {
    const m = motions.get(die.id);
    const g = ref.current;
    if (!g || !m) return;
    const pose = poseAt(m, now());
    g.position.copy(pose.p);
    g.quaternion.copy(pose.q);
    drawn.set(die.id, pose);
    const v = pose.p.clone().project(camera);
    onScreen.set(die.id, { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height });
    if (ring.current) {
      ring.current.position.set(pose.p.x, 0.012, pose.p.z);
      const mat = ring.current.material as THREE.MeshBasicMaterial;
      mat.opacity = glow === 'hint' ? 0.45 + 0.35 * Math.sin(now() * 5) : 0.85;
    }
  });
  const press = useRef<{ t: number; timer: number | null }>({ t: 0, timer: null });
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    press.current.t = now();
    press.current.timer = window.setTimeout(() => {
      press.current.timer = null;
      onLong(die.id);
    }, 480);
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (press.current.timer !== null) {
      window.clearTimeout(press.current.timer);
      press.current.timer = null;
      onPick(die.id);
    }
  };
  const ringColour = cup.held ? T.gold : glow === 'pick' ? T.red : glow === 'hint' ? T.glow : null;
  return (
    <>
      <group
        ref={ref}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={() => {
          if (press.current.timer !== null) window.clearTimeout(press.current.timer);
          press.current.timer = null;
        }}
      >
        <mesh geometry={model.geometry} material={mats} castShadow receiveShadow />
        {mirrored?.kind ? (
          <mesh position={[0, model.restHeight + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.62, 0.62]} />
            <meshStandardMaterial map={faceTexture(mirrored.kind, undefined, theme, 'die')} />
          </mesh>
        ) : null}
      </group>
      {ringColour ? (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.86, 40]} />
          <meshBasicMaterial color={ringColour} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ) : null}
    </>
  );
}

/**
 * The dice in the tray. They rest in their slots; a roll throws the ones not held, with real
 * physics, so they land on the faces the engine chose and glide back to their slots.
 */
export function DiceLayer({
  round,
  theme,
  hint,
  picks,
  onPick,
  onLong,
}: {
  round: RoundState;
  theme: ThemeId;
  /** Dice the guide would hold. */
  hint: readonly number[];
  /** Dice that can be picked for a charm. */
  picks: readonly number[];
  onPick: (dieId: number) => void;
  onLong: (dieId: number) => void;
}) {
  const n = round.cup.length;
  // put every die at rest where the state says, unless it is moving
  const key = round.cup
    .map((c) => `${c.dieId}:${c.face}:${c.held ? 1 : 0}:${c.spent ? 1 : 0}`)
    .join('|');
  useEffect(() => {
    const t = now();
    round.cup.forEach((c, i) => {
      const die = round.dice.find((d) => d.id === c.dieId);
      if (!die) return;
      const home = homePose(die, i, n, c.face, c.held && !c.spent);
      const m = motions.get(c.dieId);
      const moving =
        m && m.kind !== 'rest' && t < (m.kind === 'track' ? m.t0 : m.t0) + motionLength(m);
      if (moving) return;
      const from = drawn.get(c.dieId);
      if (from && from.p.distanceTo(home.p) > 0.01 && from.p.distanceTo(home.p) < 0.6) {
        motions.set(c.dieId, { kind: 'hop', from, to: home, t0: t, dur: 0.16, height: 0.05 });
      } else if (!from || from.p.distanceTo(home.p) > 0.01 || from.q.angleTo(home.q) > 0.01) {
        motions.set(c.dieId, { kind: 'rest', pose: home });
      }
    });
    // key holds everything this depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);

  useEffect(
    () =>
      onEvents((events, _before, after) => {
        const r = after.current;
        if (!r) return;
        for (const ev of events) {
          if (ev.type !== 'round') continue;
          const e = ev.event;
          if (e.type === 'roll')
            throwDice(
              r,
              e.landings.map((l) => l.dieId),
            );
          if (e.type === 'move') hopDie(r, e.landing.dieId, e.how);
        }
      }),
    [],
  );

  return (
    <group>
      {round.cup.map((c) => {
        const die = round.dice.find((d) => d.id === c.dieId);
        if (!die) return null;
        const glow = picks.includes(c.dieId)
          ? 'pick'
          : hint.includes(c.dieId) && !c.held
            ? 'hint'
            : null;
        return (
          <DieMesh
            key={c.dieId}
            die={die}
            cup={c}
            theme={theme}
            round={round}
            glow={glow}
            onPick={onPick}
            onLong={onLong}
          />
        );
      })}
    </group>
  );
}

function throwDice(r: RoundState, ids: readonly number[]): void {
  const n = r.cup.length;
  const speed = speedFactor();
  const t = now();
  const homeOf = (c: CupDie, i: number) => {
    const die = r.dice.find((d) => d.id === c.dieId) as Die;
    return homePose(die, i, n, c.face, c.held && !c.spent);
  };
  if (speed === 0) {
    r.cup.forEach((c, i) => motions.set(c.dieId, { kind: 'rest', pose: homeOf(c, i) }));
    sfx.roll(ids.length);
    return;
  }
  const obstacles: Obstacle[] = [];
  const throwing: { dieId: number; shape: Die['shape']; face: number }[] = [];
  r.cup.forEach((c, i) => {
    const die = r.dice.find((d) => d.id === c.dieId) as Die;
    if (ids.includes(c.dieId))
      throwing.push({ dieId: c.dieId, shape: die.shape, face: c.face ?? 0 });
    else obstacles.push({ shape: die.shape, pose: homeOf(c, i) });
  });
  const tracks = simulateThrow(throwing, obstacles);
  const rate = 1 / speed;
  let longest = 0;
  r.cup.forEach((c, i) => {
    const track = tracks.get(c.dieId);
    if (!track) return;
    const m: Motion = {
      kind: 'track',
      frames: track.frames,
      t0: t,
      rate,
      home: homeOf(c, i),
      glide: 0.32 * speed,
    };
    motions.set(c.dieId, m);
    longest = Math.max(longest, motionLength(m));
    for (const h of track.hits.slice(0, 6)) {
      window.setTimeout(() => sfx.dieHit(h.strength), (h.frame / (FPS * rate)) * 1000);
    }
  });
  sfx.shake(ids.length);
  busyStart();
  window.setTimeout(() => {
    haptics.take();
    busyEnd();
  }, longest * 1000);
}

function hopDie(r: RoundState, dieId: number, how: string): void {
  const i = r.cup.findIndex((c) => c.dieId === dieId);
  const c = r.cup[i];
  const die = r.dice.find((d) => d.id === dieId);
  if (!c || !die) return;
  const to = homePose(die, i, r.cup.length, c.face, c.held && !c.spent);
  const from = drawn.get(dieId) ?? to;
  const speed = speedFactor();
  if (speed === 0) {
    motions.set(dieId, { kind: 'rest', pose: to });
    return;
  }
  const dur = (how === 'fan' ? 0.7 : 0.45) * speed;
  motions.set(dieId, { kind: 'hop', from, to, t0: now(), dur, height: how === 'fan' ? 1.6 : 0.7 });
  sfx.dieHit(0.5);
  busyStart();
  window.setTimeout(busyEnd, dur * 1000);
  void getState;
}
