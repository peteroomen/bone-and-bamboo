import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SHAPES, type ShapeId } from '@/content/shapes';
import { dieModel, landingCorrection, restingQuaternion, topFace } from './geometry';

const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];

describe('die models', () => {
  it('give every face its own group and match the engine normals', () => {
    for (const id of SHAPE_IDS) {
      const m = dieModel(id);
      const groups = new Set(m.geometry.groups.map((g) => g.materialIndex));
      for (let f = 0; f < SHAPES[id].faces; f++)
        expect(groups.has(f), `${id} face ${f}`).toBe(true);
    }
  });

  it('know their rotation symmetries', () => {
    expect(dieModel('long').symmetries).toHaveLength(8);
    expect(dieModel('d6').symmetries).toHaveLength(24);
    expect(dieModel('d8').symmetries).toHaveLength(24);
    expect(dieModel('d12').symmetries).toHaveLength(60);
  });

  it('rest on a chosen face with its tile upright', () => {
    for (const id of SHAPE_IDS) {
      const m = dieModel(id);
      for (let f = 0; f < SHAPES[id].faces; f++) {
        const q = restingQuaternion(m, f);
        expect(topFace(m, q)).toEqual({ face: f, dot: expect.closeTo(1, 5) });
        const up = (m.ups[f] as THREE.Vector3).clone().applyQuaternion(q);
        expect(up.z).toBeCloseTo(-1, 5);
      }
    }
  });

  it('turn any landing into the face the engine rolled', () => {
    for (const id of SHAPE_IDS) {
      const m = dieModel(id);
      for (let landed = 0; landed < SHAPES[id].faces; landed++) {
        // a body resting on `landed` at some odd yaw
        const q = restingQuaternion(m, landed, 0.7);
        for (let want = 0; want < SHAPES[id].faces; want++) {
          const { r, yaw } = landingCorrection(m, q, landed, want);
          const shown = q
            .clone()
            .multiply(r)
            .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
          expect(topFace(m, shown).face).toBe(want);
          const up = (m.ups[want] as THREE.Vector3).clone().applyQuaternion(shown);
          expect(up.z).toBeCloseTo(-1, 4);
        }
      }
    }
  });
});
