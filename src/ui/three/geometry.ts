import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SHAPES, type ShapeId } from '@/content/shapes';

/**
 * The 3D model of each die shape. Face i of the mesh is face i of the engine's shape (same
 * normals), each face has its own material group and UVs, and `ups` says which way is "up" for
 * the tile drawn on it, so a resting die can turn its tile upright for the player.
 */
export interface DieModel {
  readonly shape: ShapeId;
  readonly geometry: THREE.BufferGeometry;
  readonly normals: readonly THREE.Vector3[];
  readonly ups: readonly THREE.Vector3[];
  /** Rotations that map the solid onto itself (used to land on a chosen face). */
  readonly symmetries: readonly THREE.Quaternion[];
  /** For the physics: a box (half extents) or a convex hull. */
  readonly collider:
    | { readonly type: 'box'; readonly half: THREE.Vector3 }
    | { readonly type: 'convex'; readonly vertices: THREE.Vector3[]; readonly faces: number[][] };
  /** Height of the die's centre above the table when it rests on a face. */
  readonly restHeight: number;
}

/** The die's overall size in world units (a cube's side). */
export const DIE = 1.22;

function upFor(n: THREE.Vector3): THREE.Vector3 {
  const ref = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  return ref.sub(n.clone().multiplyScalar(ref.dot(n))).normalize();
}

function baseGeometry(shape: ShapeId): THREE.BufferGeometry {
  switch (shape) {
    case 'long':
      // a bar along x; rolls on its four long sides
      return new RoundedBoxGeometry(1.42 * DIE, 0.9 * DIE, 0.9 * DIE, 3, 0.1 * DIE);
    case 'd6':
      return new RoundedBoxGeometry(DIE, DIE, DIE, 3, 0.1 * DIE);
    case 'd8':
      return new THREE.OctahedronGeometry(0.78 * DIE);
    case 'd12':
      return new THREE.DodecahedronGeometry(0.68 * DIE);
  }
}

/** Faces drawn small on triangles and pentagons: the tile fits the inscribed circle. */
function buildModel(shape: ShapeId): DieModel {
  const def = SHAPES[shape];
  const normals = def.normals.map((n) => new THREE.Vector3(n[0], n[1], n[2]).normalize());
  const ups = normals.map((n) => (shape === 'long' ? new THREE.Vector3(1, 0, 0) : upFor(n)));
  const g0 = baseGeometry(shape);
  const g = g0.index ? g0.toNonIndexed() : g0;
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const tris = pos.count / 3;
  const faceOf: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    if (n.lengthSq() < 1e-12) {
      faceOf.push(def.faces);
      continue;
    }
    n.normalize();
    let best = def.faces; // the body (rounded edges, the long die's ends)
    for (let i = 0; i < normals.length; i++)
      if ((normals[i] as THREE.Vector3).dot(n) > 0.999) best = i;
    faceOf.push(best);
  }
  // face centres and inradius (distance from the centre to the nearest edge plane)
  const centre = normals.map(() => new THREE.Vector3());
  const counts = normals.map(() => 0);
  const flatVerts: THREE.Vector3[][] = normals.map(() => []);
  for (let t = 0; t < tris; t++) {
    const f = faceOf[t] as number;
    if (f >= def.faces) continue;
    for (let k = 0; k < 3; k++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + k);
      (centre[f] as THREE.Vector3).add(v);
      counts[f] = (counts[f] as number) + 1;
      (flatVerts[f] as THREE.Vector3[]).push(v);
    }
  }
  centre.forEach((v, i) => v.divideScalar(Math.max(1, counts[i] as number)));
  const radius = normals.map((n, i) => {
    // the largest distance from the centre within the flat face, along up and right
    const up = ups[i] as THREE.Vector3;
    const right = up.clone().cross(n);
    let e = 0;
    for (const v of flatVerts[i] as THREE.Vector3[]) {
      const d = v.clone().sub(centre[i] as THREE.Vector3);
      e = Math.max(e, Math.abs(d.dot(up)), Math.abs(d.dot(right)));
    }
    // a square face fills its texture; other shapes fit the tile inside
    const square = shape === 'd6' || shape === 'long';
    return square ? e : e * 0.78;
  });
  // rebuild with groups: one per face, then the body
  const order = Array.from({ length: tris }, (_, t) => t).sort(
    (x, y) => (faceOf[x] as number) - (faceOf[y] as number),
  );
  const P = new Float32Array(tris * 9);
  const N = new Float32Array(tris * 9);
  const UV = new Float32Array(tris * 6);
  const normAttr = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const out = new THREE.BufferGeometry();
  let groupStart = 0;
  let groupFace = -1;
  order.forEach((t, k) => {
    const f = faceOf[t] as number;
    if (f !== groupFace) {
      if (groupFace >= 0) out.addGroup(groupStart * 3, (k - groupStart) * 3, groupFace);
      groupFace = f;
      groupStart = k;
    }
    for (let j = 0; j < 3; j++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + j);
      P.set([v.x, v.y, v.z], (k * 3 + j) * 3);
      if (normAttr) {
        const nn = new THREE.Vector3().fromBufferAttribute(normAttr, t * 3 + j);
        N.set([nn.x, nn.y, nn.z], (k * 3 + j) * 3);
      }
      if (f < def.faces) {
        const n = normals[f] as THREE.Vector3;
        const up = ups[f] as THREE.Vector3;
        const right = up.clone().cross(n);
        const d = v.clone().sub(centre[f] as THREE.Vector3);
        const r = radius[f] as number;
        UV.set([0.5 + d.dot(right) / (2 * r), 0.5 + d.dot(up) / (2 * r)], (k * 3 + j) * 2);
      } else {
        UV.set([0.5, 0.5], (k * 3 + j) * 2);
      }
    }
  });
  out.addGroup(groupStart * 3, (tris - groupStart) * 3, groupFace);
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  if (normAttr) out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  else out.computeVertexNormals();
  out.computeBoundingSphere();

  // physics shape
  let collider: DieModel['collider'];
  let restHeight: number;
  if (shape === 'd6' || shape === 'long') {
    g0.computeBoundingBox();
    const bb = g0.boundingBox as THREE.Box3;
    const half = bb.max.clone().sub(bb.min).multiplyScalar(0.5);
    collider = { type: 'box', half };
    restHeight = half.y;
  } else {
    // unique vertices and faces of the flat solid
    const verts: THREE.Vector3[] = [];
    const idx = (v: THREE.Vector3) => {
      let i = verts.findIndex((u) => u.distanceToSquared(v) < 1e-8);
      if (i < 0) {
        verts.push(v.clone());
        i = verts.length - 1;
      }
      return i;
    };
    const faces: number[][] = normals.map((n, f) => {
      const ids = [...new Set((flatVerts[f] as THREE.Vector3[]).map(idx))];
      const cen = centre[f] as THREE.Vector3;
      const up = ups[f] as THREE.Vector3;
      const right = up.clone().cross(n);
      // counter-clockwise seen from outside
      return ids.sort((p, q) => {
        const dp = (verts[p] as THREE.Vector3).clone().sub(cen);
        const dq = (verts[q] as THREE.Vector3).clone().sub(cen);
        return Math.atan2(dp.dot(up), dp.dot(right)) - Math.atan2(dq.dot(up), dq.dot(right));
      });
    });
    collider = { type: 'convex', vertices: verts, faces };
    restHeight = (centre[0] as THREE.Vector3).length();
  }
  return {
    shape,
    geometry: out,
    normals,
    ups,
    symmetries: symmetriesOf(shape, normals),
    collider,
    restHeight,
  };
}

/** Every rotation that permutes the solid's faces (the long die also keeps its ends). */
function symmetriesOf(shape: ShapeId, normals: readonly THREE.Vector3[]): THREE.Quaternion[] {
  const check = normals.slice();
  if (shape === 'long') check.push(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0));
  const out: THREE.Quaternion[] = [];
  const n0 = normals[0] as THREE.Vector3;
  // a second, non-parallel reference: the first face that is not opposite or equal
  const k = normals.findIndex((n) => Math.abs(n.dot(n0)) < 0.99);
  const nk = normals[k] as THREE.Vector3;
  const frame = (x: THREE.Vector3, y: THREE.Vector3) => {
    const e1 = x.clone().normalize();
    const e2 = y
      .clone()
      .sub(e1.clone().multiplyScalar(y.dot(e1)))
      .normalize();
    const e3 = e1.clone().cross(e2);
    return new THREE.Matrix4().makeBasis(e1, e2, e3);
  };
  const from = frame(n0, nk).invert();
  const angle = n0.dot(nk);
  for (const a of normals) {
    for (const b of normals) {
      if (Math.abs(a.dot(b) - angle) > 1e-4) continue;
      const m = frame(a, b).multiply(from);
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const ok = check.every((n) => {
        const r = n.clone().applyQuaternion(q);
        return check.some((x) => x.dot(r) > 0.999);
      });
      if (ok && !out.some((p) => Math.abs(p.dot(q)) > 0.9999)) out.push(q);
    }
  }
  return out;
}

const MODELS = new Map<ShapeId, DieModel>();
export function dieModel(shape: ShapeId): DieModel {
  let m = MODELS.get(shape);
  if (!m) {
    m = buildModel(shape);
    MODELS.set(shape, m);
  }
  return m;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
/** Screen-up on the table: away from the player. */
const SCREEN_UP = new THREE.Vector3(0, 0, -1);

/** The orientation that rests the die on face `f`, its tile upright for the player. */
export function restingQuaternion(model: DieModel, f: number, yaw = 0): THREE.Quaternion {
  const n = model.normals[f] as THREE.Vector3;
  const up = model.ups[f] as THREE.Vector3;
  const src = new THREE.Matrix4().makeBasis(up.clone().cross(n), n, up.clone().negate());
  const dst = new THREE.Matrix4().makeBasis(
    SCREEN_UP.clone().cross(WORLD_UP),
    WORLD_UP,
    SCREEN_UP.clone().negate(),
  );
  const m = dst.multiply(src.invert());
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  if (yaw) q.premultiply(new THREE.Quaternion().setFromAxisAngle(WORLD_UP, yaw));
  return q;
}

/** Which face points up for a die in this orientation, and how squarely. */
export function topFace(model: DieModel, q: THREE.Quaternion): { face: number; dot: number } {
  let best = 0;
  let bestDot = -2;
  model.normals.forEach((n, i) => {
    const d = n.clone().applyQuaternion(q).y;
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  });
  return { face: best, dot: bestDot };
}

/**
 * The physics landed the body on face `landed`; we want the player to see face `want`. Pick the
 * symmetry R (body frame) with R·n_want = n_landed, so the mesh drawn as q·R shows `want` on top,
 * and the yaw that then turns its tile upright. Returns R and that yaw.
 */
export function landingCorrection(
  model: DieModel,
  qFinal: THREE.Quaternion,
  landed: number,
  want: number,
): { r: THREE.Quaternion; yaw: number } {
  const nw = model.normals[want] as THREE.Vector3;
  const nl = model.normals[landed] as THREE.Vector3;
  let best = { r: new THREE.Quaternion(), yaw: 0 };
  let bestAbs = Infinity;
  for (const r of model.symmetries) {
    if (nw.clone().applyQuaternion(r).dot(nl) < 0.999) continue;
    const q = qFinal.clone().multiply(r);
    const up = (model.ups[want] as THREE.Vector3).clone().applyQuaternion(q);
    const yaw = yawToScreenUp(up);
    const a = Math.abs(yaw);
    if (a < bestAbs) {
      bestAbs = a;
      best = { r, yaw };
    }
  }
  return best;
}

/** The turn about world up that points `u` (projected on the table) away from the player. */
export function yawToScreenUp(u: THREE.Vector3): number {
  // a turn of θ about +y takes the angle atan2(x, z) to atan2(x, z) + θ; we want π (that is -z)
  let t = Math.PI - Math.atan2(u.x, u.z);
  while (t > Math.PI) t -= 2 * Math.PI;
  while (t <= -Math.PI) t += 2 * Math.PI;
  return t;
}
