import * as THREE from 'three';
import { FPS, type Pose, smooth } from './physics';

/**
 * Where each die is drawn, frame by frame, kept outside React so the render loop can read it.
 * A motion is a recorded tumble (then a glide home), a hop from one pose to another, or rest.
 */
export type Motion =
  | { readonly kind: 'rest'; readonly pose: Pose }
  | {
      readonly kind: 'track';
      readonly frames: readonly Pose[];
      readonly t0: number;
      readonly rate: number;
      readonly home: Pose;
      readonly glide: number;
    }
  | {
      readonly kind: 'hop';
      readonly from: Pose;
      readonly to: Pose;
      readonly t0: number;
      readonly dur: number;
      readonly height: number;
    };

export const motions = new Map<number, Motion>();
/** The pose each die was last drawn at. */
export const drawn = new Map<number, Pose>();

export function now(): number {
  return performance.now() / 1000;
}

/** How long a motion lasts, in seconds. */
export function motionLength(m: Motion): number {
  if (m.kind === 'rest') return 0;
  if (m.kind === 'hop') return m.dur;
  return m.frames.length / (FPS * m.rate) + m.glide;
}

export function poseAt(m: Motion, t: number): Pose {
  if (m.kind === 'rest') return m.pose;
  if (m.kind === 'hop') {
    const s = Math.min(1, Math.max(0, (t - m.t0) / Math.max(1e-6, m.dur)));
    const e = smooth(s);
    const p = m.from.p.clone().lerp(m.to.p, e);
    p.y += Math.sin(Math.PI * s) * m.height;
    return { p, q: m.from.q.clone().slerp(m.to.q, e) };
  }
  const f = (t - m.t0) * FPS * m.rate;
  const n = m.frames.length;
  if (f < n - 1) {
    const i = Math.max(0, Math.floor(f));
    const a = m.frames[i] as Pose;
    const b = m.frames[Math.min(n - 1, i + 1)] as Pose;
    const k = f - i;
    return { p: a.p.clone().lerp(b.p, k), q: a.q.clone().slerp(b.q, k) };
  }
  const last = m.frames[n - 1] as Pose;
  const g = m.glide > 0 ? Math.min(1, (t - m.t0 - (n - 1) / (FPS * m.rate)) / m.glide) : 1;
  const e = smooth(Math.max(0, g));
  const p = last.p.clone().lerp(m.home.p, e);
  p.y += Math.sin(Math.PI * e) * 0.25;
  return { p, q: last.q.clone().slerp(m.home.q, e) };
}

export function poseOf(dieId: number): Pose | undefined {
  return drawn.get(dieId);
}

export function vec(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

/** Where each die is on screen, in CSS pixels (for the end-to-end tests). */
export const onScreen = new Map<number, { x: number; y: number }>();
