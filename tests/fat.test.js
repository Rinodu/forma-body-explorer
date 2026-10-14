import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Box3 } from 'three';
import { createBodyLayers } from '../src/fat.js';
import { demo } from '../src/data.js';

async function load(file) {
  const bytes = fs.readFileSync(new URL(`../public/models/${file}.glb`, import.meta.url));
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const surface = await load('surface');
const mesh = surface.scene.children[0];

test('skin is one detailed anatomical surface in the same reference coordinates as bones', async () => {
  assert.ok(mesh.geometry.index.count > 300000);
  assert.equal(mesh.userData.source, 'FJ2810 / BP22617 / FMA7163');
  const anatomy = await load('anatomy');
  anatomy.scene.rotation.x = Math.PI / 2;
  surface.scene.rotation.x = Math.PI / 2;
  const skinBox = new Box3().setFromObject(surface.scene), boneBox = new Box3().setFromObject(anatomy.scene);
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(skinBox.min[axis] - boneBox.min[axis]) < .04, `${axis} min drift`);
    assert.ok(Math.abs(skinBox.max[axis] - boneBox.max[axis]) < .04, `${axis} max drift`);
  }
});

test('fat follows each skin vertex with a submillimeter inset, without modifying the source', () => {
  const source = mesh.geometry.attributes.position.array.slice();
  const layers = createBodyLayers(mesh.geometry);
  layers.update(demo);
  const skin = layers.skin.geometry.attributes.position;
  const fat = layers.fat.geometry.attributes.position;
  for (let i = 0; i < skin.count; i++) {
    const distance = Math.hypot(skin.getX(i) - fat.getX(i), skin.getY(i) - fat.getY(i), skin.getZ(i) - fat.getZ(i));
    assert.ok(Math.abs(distance - .0008) < 2e-7);
  }
  assert.deepEqual(mesh.geometry.attributes.position.array, source);
  assert.equal(fat.count, skin.count * 2);
  assert.ok(layers.fat.geometry.index.count > 0);
});

test('increasing fat thickens the attached shell; measurements and input extremes stay finite', () => {
  const layers = createBodyLayers(mesh.geometry);
  function thickness() {
    const p = layers.fat.geometry.attributes.position, n = p.count / 2;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.hypot(p.getX(i) - p.getX(i + n), p.getY(i) - p.getY(i + n), p.getZ(i) - p.getZ(i + n));
    return sum;
  }
  layers.update({ ...demo, fat: 15 }); const low = thickness();
  layers.update({ ...demo, fat: 35 }); assert.ok(thickness() > low);
  for (const body of [{ ...demo, height: 120, weight: 25, fat: 3, chest: 50, waist: 40, hip: 50 }, { ...demo, height: 230, weight: 350, fat: 65, chest: 200, waist: 220, hip: 220 }]) {
    layers.update(body);
    assert.ok(layers.skin.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(layers.fat.geometry.attributes.normal.array.every(Number.isFinite));
  }
  layers.show(['fat']); assert.equal(layers.skin.visible, false); assert.equal(layers.fat.visible, true);
  layers.show([]); assert.equal(layers.fat.visible, false);
});
