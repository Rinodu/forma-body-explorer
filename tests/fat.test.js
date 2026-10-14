import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry } from 'three';
import { fatShellGeometry } from '../src/fat.js';

function signedVolume(geometry) {
  const p = geometry.getAttribute('position');
  let volume = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = i, b = i + 1, c = i + 2;
    volume += (p.getX(a) * (p.getY(b) * p.getZ(c) - p.getZ(b) * p.getY(c)) + p.getY(a) * (p.getZ(b) * p.getX(c) - p.getX(b) * p.getZ(c)) + p.getZ(a) * (p.getX(b) * p.getY(c) - p.getY(b) * p.getX(c))) / 6;
  }
  return volume;
}

test('fat layer is a hollow shell with reversed inner faces, not a recolored solid', () => {
  const source = new BoxGeometry(2, 2, 2);
  const original = source.getAttribute('position').array.slice();
  const shell = fatShellGeometry(source, 25);
  assert.ok(Math.abs(signedVolume(shell) - 2) < .00001);
  assert.deepEqual(source.getAttribute('position').array, original);
  assert.ok([...shell.getAttribute('normal').array].every(Number.isFinite));
  assert.ok(signedVolume(fatShellGeometry(source, 35)) > signedVolume(shell));
});
