import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demo, validateBody, composition, parseReport, dimensions } from '../src/data.js';

test('composition conserves total mass and computes BMI', () => {
  const data = validateBody(demo), stats = composition(data);
  assert.equal(stats.fatMass, 15);
  assert.equal(stats.leanMass, 60);
  assert.equal(stats.fatMass + stats.leanMass, data.weight);
  assert.ok(Math.abs(stats.bmi - 24.4897959) < .00001);
});
test('reject missing, nonfinite, out-of-range and impossible muscle inputs', () => {
  for (const weight of ['', 'NaN', Infinity, -5, 351]) assert.throws(() => validateBody({ ...demo, weight }));
  assert.throws(() => validateBody({ ...demo, muscle: 70 }));
  assert.equal(validateBody({ ...demo, muscle: '' }).muscle, null);
});
test('OCR parses decimal commas, adjacent labels and inferred height without inventing values', () => {
  const data = parseReport('Weight\n80,0 kg\n25.0\nBMI\n22,5 %\nBody fat percentage\n33.0 kg\nSkeletal muscle mass');
  assert.equal(data.weight, 80);
  assert.equal(data.fat, 22.5);
  assert.equal(data.muscle, 33);
  assert.equal(data.height, 178.9);
  assert.equal(data.heightDerived, true);
  assert.deepEqual(parseReport('unreadable'), {});
});
test('explicit height wins and missing fields remain missing', () => {
  assert.deepEqual(parseReport('Weight 80 kg\nHeight 180 cm'), { weight: 80, height: 180 });
});
test('input circumferences override estimates and weight/fat affect silhouette', () => {
  assert.equal(dimensions({ ...demo, waist: 88 }).waist, .88);
  assert.ok(dimensions({ ...demo, weight: 100 }).waist > dimensions(demo).waist);
  assert.ok(dimensions({ ...demo, fat: 35 }).waist > dimensions(demo).waist);
  for (const weight of [25, 350]) for (const fat of [3, 65]) {
    const dims = dimensions({ ...demo, weight, fat });
    assert.ok(Object.values(dims).every(n => Number.isFinite(n) && n > 0));
  }
});
