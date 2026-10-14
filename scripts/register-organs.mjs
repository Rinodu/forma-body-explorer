// Calibrate Vanatome's organ coordinate frame to the BodyExplorer/Kinetra frame.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3, Vector4, Matrix4 } from 'three';

async function load(path) {
  const b = fs.readFileSync(path);
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
}
const sourceBytes = fs.readFileSync(process.argv[2]);
const sourceSha = createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${sourceBytes.length}\0`), sourceBytes])).digest('hex');
if (sourceSha !== '46e5ccc6f02e26727246aa78106dedb6f6d65da3') throw new Error('Unexpected original skeleton.');
const target = await load(process.argv[2]), reference = await load('public/models/organ-reference.glb');
const normalize = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const pairs = [['Vertebra T1', 'first thoracic vertebra'], ['Body of sternum', 'body of sternum'], ...['Calcaneus', 'Clavicle', 'Femur', 'Humerus'].flatMap(name => [[`${name}.l`, `left ${name.toLowerCase()}`], [`${name}.r`, `right ${name.toLowerCase()}`]]), ...[[1, 'first'], [3, 'third'], [5, 'fifth']].map(([n, word]) => [`Vertebra L${n}`, `${word} lumbar vertebra`])];
const landmarks = [];
for (const [refName, targetName] of pairs) {
  let a, b;
  reference.scene.traverse(node => { if (node.userData.sourceName === refName) a = node; });
  target.scene.traverse(node => { if (normalize(node.name) === normalize(targetName)) b = node; });
  if (!a || !b) throw new Error(`Missing landmark ${refName} / ${targetName}`);
  const r = new Box3().setFromObject(a).getCenter(new Vector3());
  const t = new Box3().setFromObject(b).getCenter(new Vector3());
  const fitted = [t.x * (.21 / 160), (t.z - 1310) * (.52 / 480) + .52, -(t.y + 75) * .001 + .145];
  landmarks.push({ name: refName, from: r.toArray(), to: fitted });
}
const normal = Array.from({ length: 4 }, () => Array(4).fill(0));
const rhs = Array.from({ length: 3 }, () => Array(4).fill(0));
for (const p of landmarks) {
  const row = [...p.from, 1];
  for (let i = 0; i < 4; i++) { for (let j = 0; j < 4; j++) normal[i][j] += row[i] * row[j]; for (let k = 0; k < 3; k++) rhs[k][i] += row[i] * p.to[k]; }
}
const inverse = new Matrix4().set(...normal.flat()).invert();
const coefficients = rhs.map(row => new Vector4(...row).applyMatrix4(inverse).toArray());
const matrix = new Matrix4().set(...coefficients[0], ...coefficients[1], ...coefficients[2], 0, 0, 0, 1);
const errors = landmarks.map(p => ({ name: p.name, mm: new Vector3(...p.from).applyMatrix4(matrix).distanceTo(new Vector3(...p.to)) * 1000 }));
const rmsMm = Math.sqrt(errors.reduce((sum, p) => sum + p.mm ** 2, 0) / errors.length);
if (!Number.isFinite(rmsMm) || rmsMm > 35) throw new Error(`Registration residual too high: ${rmsMm} mm`);
const output = { method: 'Least-squares affine registration of 13 corresponding bone bounding-box centers', sourceSkeletonBlobSha1: sourceSha, matrix: matrix.toArray(), rmsMm, landmarks, errors, limitation: 'Reference atlas registration, not individual organ localization.' };
fs.writeFileSync('src/organ-registration.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify({ rmsMm, matrix: matrix.toArray(), errors }));
