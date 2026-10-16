import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { ShapeId } from '@/content/shapes';
import { type DieModel, dieModel, landingCorrection, topFace } from './geometry';
import { TRAY } from './layout';

/**
 * A throw of the dice, worked out in full before it is shown. The engine has already decided
 * which face each die lands on; the physics only decides how it tumbles. When a body comes to
 * rest on some face, the mesh is drawn turned by a symmetry of the solid so the engine's face is
 * the one on top, and a slow turn about the vertical brings its tile upright.
 */
export interface Pose {
  readonly p: THREE.Vector3;
  readonly q: THREE.Quaternion;
}

export interface Track {
  readonly frames: readonly Pose[];
  /** Frame numbers of hard knocks (for the clacks). */
  readonly hits: readonly { frame: number; strength: number }[];
}

export interface ThrowDie {
  readonly dieId: number;
  readonly shape: ShapeId;
  /** The face the engine rolled. */
  readonly face: number;
}

export interface Obstacle {
  readonly shape: ShapeId;
  readonly pose: Pose;
}

export const FPS = 60;
const STEP = 1 / 120;
const MAX_SECONDS = 3.2;

function bodyShape(model: DieModel): CANNON.Shape {
  const c = model.collider;
  if (c.type === 'box') return new CANNON.Box(new CANNON.Vec3(c.half.x, c.half.y, c.half.z));
  return new CANNON.ConvexPolyhedron({
    vertices: c.vertices.map((v) => new CANNON.Vec3(v.x, v.y, v.z)),
    faces: c.faces,
  });
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function simulateThrow(
  dice: readonly ThrowDie[],
  obstacles: readonly Obstacle[],
): Map<number, Track> {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -38, 0) });
  world.allowSleep = true;
  const felt = new CANNON.Material('felt');
  const bone = new CANNON.Material('bone');
  world.addContactMaterial(
    new CANNON.ContactMaterial(felt, bone, { friction: 0.32, restitution: 0.32 }),
  );
  world.addContactMaterial(
    new CANNON.ContactMaterial(bone, bone, { friction: 0.2, restitution: 0.4 }),
  );

  const ground = new CANNON.Body({ mass: 0, material: felt });
  ground.addShape(new CANNON.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);
  const halfW = TRAY.w / 2;
  const halfD = TRAY.d / 2;
  const walls: [number, number, number, number][] = [
    [TRAY.x - halfW - 0.5, TRAY.z, 0.5, halfD + 1],
    [TRAY.x + halfW + 0.5, TRAY.z, 0.5, halfD + 1],
    [TRAY.x, TRAY.z - halfD - 0.5, halfW + 1, 0.5],
    [TRAY.x, TRAY.z + halfD + 0.5, halfW + 1, 0.5],
  ];
  for (const [x, z, hx, hz] of walls) {
    const w = new CANNON.Body({ mass: 0, material: felt });
    w.addShape(new CANNON.Box(new CANNON.Vec3(hx, 4, hz)));
    w.position.set(x, 4, z);
    world.addBody(w);
  }
  for (const o of obstacles) {
    const b = new CANNON.Body({ mass: 0, material: bone });
    b.addShape(bodyShape(dieModel(o.shape)));
    b.position.set(o.pose.p.x, o.pose.p.y, o.pose.p.z);
    b.quaternion.set(o.pose.q.x, o.pose.q.y, o.pose.q.z, o.pose.q.w);
    world.addBody(b);
  }

  const bodies = dice.map((d, i) => {
    const b = new CANNON.Body({ mass: 1, material: bone });
    b.addShape(bodyShape(dieModel(d.shape)));
    // thrown from the player's side of the tray, spread across it
    const spread = dice.length > 1 ? i / (dice.length - 1) - 0.5 : 0;
    b.position.set(
      TRAY.x + spread * (TRAY.w - 2.4) + rand(-0.3, 0.3),
      rand(2.2, 3.4),
      TRAY.z + halfD - 0.9,
    );
    const e = new CANNON.Quaternion();
    e.setFromEuler(rand(0, 6.3), rand(0, 6.3), rand(0, 6.3));
    b.quaternion.copy(e);
    b.velocity.set(rand(-3, 3), rand(-1, 2), rand(-14, -9));
    b.angularVelocity.set(rand(-18, 18), rand(-10, 10), rand(-18, 18));
    b.linearDamping = 0.08;
    b.angularDamping = 0.12;
    b.sleepSpeedLimit = 0.15;
    b.sleepTimeLimit = 0.2;
    world.addBody(b);
    return b;
  });

  const raw = dice.map(() => [] as Pose[]);
  const hits = dice.map(() => [] as { frame: number; strength: number }[]);
  const bodyIndex = new Map(bodies.map((b, i) => [b.id, i]));
  world.addEventListener('beginContact', (ev: { bodyA: CANNON.Body; bodyB: CANNON.Body }) => {
    for (const b of [ev.bodyA, ev.bodyB]) {
      const i = bodyIndex.get(b.id);
      if (i === undefined) continue;
      const s = b.velocity.length();
      if (s > 2.5)
        (hits[i] as { frame: number; strength: number }[]).push({
          frame: (raw[i] as Pose[]).length,
          strength: Math.min(1, s / 14),
        });
    }
  });

  const record = () =>
    bodies.forEach((b, i) =>
      (raw[i] as Pose[]).push({
        p: new THREE.Vector3(b.position.x, b.position.y, b.position.z),
        q: new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w),
      }),
    );
  record();
  let t = 0;
  let stepN = 0;
  while (t < MAX_SECONDS) {
    world.step(STEP);
    t += STEP;
    stepN++;
    if (stepN % 2 === 0) record();
    if (t > 0.6 && bodies.every((b) => b.sleepState === CANNON.Body.SLEEPING)) break;
  }

  const out = new Map<number, Track>();
  dice.forEach((d, i) => {
    const model = dieModel(d.shape);
    const frames = raw[i] as Pose[];
    const last = frames[frames.length - 1] as Pose;
    // a die left leaning on another settles flat
    let top = topFace(model, last.q);
    if (top.dot < 0.995) {
      const n = (model.normals[top.face] as THREE.Vector3).clone().applyQuaternion(last.q);
      const fix = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 1, 0));
      const flat = fix.multiply(last.q.clone());
      const p = last.p.clone();
      p.y = model.restHeight;
      for (let k = 1; k <= 8; k++) {
        const s = k / 8;
        frames.push({ p: last.p.clone().lerp(p, s), q: last.q.clone().slerp(flat, s) });
      }
      top = topFace(model, flat);
    }
    const qEnd = (frames[frames.length - 1] as Pose).q;
    const { r, yaw } = landingCorrection(model, qEnd, top.face, d.face);
    const n = frames.length;
    const shown = frames.map((f, k) => {
      const s = smooth(Math.min(1, Math.max(0, (k / Math.max(1, n - 1) - 0.25) / 0.75)));
      const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw * s);
      return { p: f.p, q: f.q.clone().multiply(r).premultiply(turn) };
    });
    out.set(d.dieId, { frames: shown, hits: hits[i] as { frame: number; strength: number }[] });
  });
  return out;
}

export function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}
