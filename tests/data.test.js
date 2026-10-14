import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demo, validateBody, composition, parseReport } from '../src/data.js';

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
