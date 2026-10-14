import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { demo } from '../src/data.js';
import { morphParameters, createMuscleMorph } from '../src/morph.js';
import { createBodyLayers } from '../src/fat.js';

async function load(name) {
  const bytes = fs.readFileSync(new URL(`../public/models/${name}.glb`, import.meta.url));
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
test('fat responds to fat mass rather than treating every heavy body as fat', () => {
  const heavyLean = morphParameters({ ...demo, weight: 100, fat: 15 });
  assert.equal(heavyLean.fatGain, morphParameters(demo).fatGain);
  assert.ok(morphParameters({ ...demo, weight: 120, fat: 40 }).fatGain > heavyLean.fatGain);
  assert.equal(morphParameters({ ...demo, muscle: null }).muscleRadius, 1);
});
test('muscle input changes muscle cross sections while preserving bones and reference reset', async () => {
  const gltf = await load('anatomy');
  const bones = [], muscles = [];
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const row = [mesh, mesh.geometry.attributes.position.array.slice()];
    if (mesh.userData.type === 'bone') bones.push(row); else muscles.push(row);
  });
  const update = createMuscleMorph(gltf.scene);
  update({ ...demo, muscle: 45 });
  assert.ok(muscles.some(([mesh, base]) => mesh.geometry.attributes.position.array.some((value, i) => value !== base[i])));
  for (const [mesh, base] of bones) assert.deepEqual(mesh.geometry.attributes.position.array, base);
  update(demo);
  for (const [mesh, base] of muscles) assert.deepEqual(mesh.geometry.attributes.position.array, base);
});
test('heavier high-fat inputs enlarge abdomen; explicit waist replaces the guessed size', async () => {
  const gltf = await load('surface'), layers = createBodyLayers(gltf.scene.children[0].geometry);
  function width() {
    const p = layers.skin.geometry.attributes.position;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(p.getZ(i) + .1) > .07 || Math.abs(p.getX(i)) > .26) continue;
      min = Math.min(min, p.getY(i)); max = Math.max(max, p.getY(i));
    }
    return max - min;
  }
  layers.update(demo); const baseline = width();
  layers.update({ ...demo, weight: 120, fat: 40 }); const larger = width();
  assert.ok(larger > baseline + .03);
  layers.update({ ...demo, weight: 120, fat: 40, waist: 80 });
  assert.ok(width() < larger);
  assert.ok(layers.skin.geometry.attributes.position.array.every(Number.isFinite));
});
