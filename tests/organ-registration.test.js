import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Box3, Matrix4, Vector3 } from 'three';

const registration = JSON.parse(fs.readFileSync(new URL('../src/organ-registration.json', import.meta.url)));
async function load(name) {
  const bytes = fs.readFileSync(new URL(`../public/models/${name}.glb`, import.meta.url));
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

test('registered organ frame agrees with 13 matching bone landmarks', () => {
  const matrix = new Matrix4().fromArray(registration.matrix);
  assert.equal(registration.landmarks.length, 13);
  const errors = registration.landmarks.map(p => new Vector3(...p.from).applyMatrix4(matrix).distanceTo(new Vector3(...p.to)));
  assert.ok(Math.max(...errors) < .025);
  assert.ok(registration.rmsMm < 15);
  assert.ok(Math.abs(matrix.determinant()) > .1);
});

test('registered lungs occupy the chest and mesenteric reference occupies the abdomen', async () => {
  const anatomy = await load('anatomy'); anatomy.scene.rotation.x = Math.PI / 2;
  const body = new Box3().setFromObject(anatomy.scene), height = body.max.y - body.min.y;
  const respiratory = await load('respiratory');
  respiratory.scene.matrixAutoUpdate = false; respiratory.scene.matrix.fromArray(registration.matrix);
  respiratory.scene.updateMatrixWorld(true);
  const lungs = new Box3();
  respiratory.scene.traverse(node => { if (node.isMesh && /lung/i.test(node.userData.sourceName || node.name)) lungs.union(new Box3().setFromObject(node)); });
  assert.ok(!lungs.isEmpty());
  assert.ok((lungs.min.y - body.min.y) / height > .55);
  assert.ok((lungs.max.y - body.min.y) / height < .9);
  const visceral = await load('visceral'); visceral.scene.rotation.x = Math.PI / 2;
  const abdomen = new Box3().setFromObject(visceral.scene), center = abdomen.getCenter(new Vector3());
  assert.equal(visceral.scene.children[0].userData.type, 'visceral-reference');
  assert.equal(visceral.scene.children[0].userData.source, 'FJ3396 / BP22743 / FMA14643');
  assert.ok((center.y - body.min.y) / height > .4 && (center.y - body.min.y) / height < .7);
  assert.ok(abdomen.max.y < lungs.max.y);
});
