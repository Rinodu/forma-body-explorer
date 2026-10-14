import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSection } from '../src/section.js';

test('one world-space cut clips all layers, follows height and restores full geometry', () => {
  const scene = new THREE.Scene(), parent = new THREE.Group();
  scene.add(parent);
  const bone = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  bone.userData.type = 'bone'; parent.add(bone); parent.position.y = .3;
  const skin = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  skin.userData.type = 'body'; scene.add(skin);
  const section = createSection(scene, { clearStencil() {} });
  section.set(true, .6, 2); section.update();
  const plane = bone.material.clippingPlanes[0];
  assert.equal(plane, skin.material.clippingPlanes[0]);
  assert.ok(plane.distanceToPoint(new THREE.Vector3(0, 1, 0)) > 0);
  assert.ok(plane.distanceToPoint(new THREE.Vector3(0, 1.5, 0)) < 0);
  const passes = scene.children.at(-1).children;
  assert.equal(passes.length, 3); // No opaque cap hiding the layers underneath skin.
  assert.equal(passes[0].geometry, bone.geometry);
  assert.equal(passes[0].matrix.elements[13], .3);
  parent.visible = false; section.update();
  assert.ok(passes.every(pass => !pass.visible));
  section.set(true, .5, 1); assert.equal(plane.constant, .5);
  section.set(false, .5, 1);
  assert.equal(bone.material.clippingPlanes.length, 0);
  assert.equal(scene.children.at(-1).visible, false);
});
