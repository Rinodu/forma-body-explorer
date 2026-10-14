import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Box3, Vector3 } from 'three';
import { layerAssets, atlasTransform, visibleAnatomyType } from '../src/anatomy.js';

test('anatomy modes isolate bones, muscles and organs', () => {
  assert.deepEqual(layerAssets('body'), ['anatomy', 'surface']);
  assert.deepEqual(layerAssets('combined'), ['anatomy']);
  assert.equal(visibleAnatomyType('skeleton', 'bone'), true);
  assert.equal(visibleAnatomyType('skeleton', 'muscle'), false);
  assert.equal(visibleAnatomyType('muscles', 'muscle'), true);
  assert.equal(visibleAnatomyType('muscles', 'bone'), false);
  assert.equal(visibleAnatomyType('combined', 'bone'), true);
  assert.equal(visibleAnatomyType('combined', 'muscle'), true);
  assert.equal(visibleAnatomyType('organs', 'bone'), false);
  assert.deepEqual(layerAssets('organs'), ['digestive', 'respiratory']);
  assert.deepEqual(layerAssets(['skeleton', 'muscles', 'fat', 'organs']), ['anatomy', 'surface', 'digestive', 'respiratory']);
  assert.deepEqual(layerAssets(['fat']), ['anatomy', 'surface']);
  assert.deepEqual(layerAssets([]), []);
  assert.equal(visibleAnatomyType(['skeleton', 'fat'], 'bone'), true);
  assert.equal(visibleAnatomyType(['skeleton', 'fat'], 'muscle'), false);
  assert.equal(visibleAnatomyType([], 'bone'), false);
  assert.throws(() => layerAssets('unknown'));
});

test('shared atlas transform places feet at zero and preserves proportions', () => {
  const box = { min: { x: -2, y: .2, z: -1 }, max: { x: 2, y: 2.2, z: 3 } };
  const result = atlasTransform(box, 1.8);
  assert.ok(Math.abs(result.scale - .9) < 1e-12);
  assert.ok(Math.abs(box.min.y * result.scale + result.position[1]) < 1e-12);
  assert.ok(Math.abs(box.max.y * result.scale + result.position[1] - 1.8) < 1e-12);
});

test('bundled GLBs contain the expected anatomical system and embedded geometry', () => {
  for (const [file, system] of Object.entries({ 'organ-reference': 'skeletal', digestive: 'digestive', respiratory: 'respiratory', anatomy: null })) {
    const buffer = fs.readFileSync(new URL(`../public/models/${file}.glb`, import.meta.url));
    assert.equal(buffer.readUInt32LE(0), 0x46546c67);
    assert.equal(buffer.readUInt32LE(8), buffer.length);
    const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
    const nodes = gltf.nodes.filter(node => node.mesh != null);
    assert.ok(nodes.length > 0);
    if (system) assert.ok(nodes.every(node => node.extras.anatomySystem === system));
    else {
      assert.equal(nodes.filter(node => node.extras.type === 'bone').length, 13);
      assert.equal(nodes.filter(node => node.extras.type === 'muscle').length, 42);
      const muscles = nodes.filter(node => node.extras.type === 'muscle').flatMap(node => node.extras.sourceNames);
      for (const name of ['biceps', 'triceps', 'gastrocnemius']) assert.ok(muscles.some(muscle => muscle.toLowerCase().includes(name)));
    }
    assert.ok(gltf.buffers.every(buffer => !buffer.uri));
    assert.deepEqual(gltf.extensionsRequired ?? [], file === 'anatomy' ? ['EXT_meshopt_compression'] : []);
  }
});

test('compressed atlas decodes and stands upright with feet below torso', async () => {
  const bytes = fs.readFileSync(new URL('../public/models/anatomy.glb', import.meta.url));
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.rotation.x = Math.PI / 2;
  gltf.scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(gltf.scene);
  const size = box.getSize(new Vector3());
  assert.ok(size.y > 1.7 && size.y < 2);
  const foot = new Box3().setFromObject(gltf.scene.getObjectByName('leftFoot'));
  const torso = new Box3().setFromObject(gltf.scene.getObjectByName('torso'));
  assert.ok(foot.max.y < torso.min.y);
});
