// Rebuild with: node scripts/build-surface.mjs /absolute/path/to/FJ2810.obj
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';

const source = fs.readFileSync(process.argv[2]);
const sha256 = createHash('sha256').update(source).digest('hex');
if (sha256 !== 'b96705b91fb861e4f63ca116c5fdc2c79d772083e9595ba1c0122a86ff2f7282') throw new Error('Unexpected skin source; review provenance before rebuilding.');
const vertices = [], faces = [];
for (const line of source.toString().split('\n')) {
  const values = line.trim().split(/\s+/);
  if (values[0] === 'v') vertices.push(values.slice(1, 4).map(Number));
  if (values[0] === 'f') {
    const ids = values.slice(1).map(value => Number(value.split('/')[0]) - 1);
    for (let i = 1; i < ids.length - 1; i++) faces.push([ids[0], ids[i], ids[i + 1]]);
  }
}
const parents = vertices.map((_, i) => i);
function root(i) { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; }
for (const [a, b, c] of faces) { parents[root(b)] = root(a); parents[root(c)] = root(a); }
const components = new Map();
for (const face of faces) { const key = root(face[0]); if (!components.has(key)) components.set(key, []); components.get(key).push(face); }
const outer = [...components.values()].sort((a, b) => b.length - a.length)[0];
let signedVolume = 0;
for (const [a, b, c] of outer) {
  const x = vertices[a], y = vertices[b], z = vertices[c];
  signedVolume += (x[0] * (y[1] * z[2] - y[2] * z[1]) + x[1] * (y[2] * z[0] - y[0] * z[2]) + x[2] * (y[0] * z[1] - y[1] * z[0])) / 6;
}
if (signedVolume < 0 || outer.length < 100000) throw new Error('Expected the outward-facing complete body component.');
const remap = new Map(), positions = [], indices = [];
for (const face of outer) for (const old of face) {
  if (!remap.has(old)) {
    remap.set(old, positions.length / 3);
    const [x, y, z] = vertices[old];
    // Same BodyExplorer → Kinetra body fit as the bone/muscle asset, before its viewer rotation.
    positions.push(x * (.21 / 160), -(y + 75) * .001 + .145, -(z - 1310) * (.52 / 480) - .52);
  }
  indices.push(remap.get(old));
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
const buffers = [], views = [], accessors = [];
let offset = 0;
function accessor(array, type, componentType, target, bounds) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const pad = Buffer.alloc((4 - bytes.length % 4) % 4);
  views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
  accessors.push({ bufferView: views.length - 1, componentType, count: array.length / (type === 'VEC3' ? 3 : 1), type, ...bounds });
  buffers.push(bytes, pad); offset += bytes.length + pad.length;
  return accessors.length - 1;
}
const position = accessor(geometry.attributes.position.array, 'VEC3', 5126, 34962, { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() });
const normal = accessor(geometry.attributes.normal.array, 'VEC3', 5126, 34962);
const index = accessor(geometry.index.array, 'SCALAR', geometry.index.array instanceof Uint32Array ? 5125 : 5123, 34963);
const gltf = { asset: { version: '2.0', generator: 'Forma build-surface.mjs', copyright: 'BodyParts3D / DBCLS, CC BY-SA 2.1 Japan' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'BodyParts3D_skin_outer', mesh: 0, extras: { type: 'skin', source: 'FJ2810 / BP22617 / FMA7163', sourceSha256: sha256 } }], meshes: [{ primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices: index }] }], buffers: [{ byteLength: offset }], bufferViews: views, accessors };
let json = Buffer.from(JSON.stringify(gltf)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const bin = Buffer.concat(buffers), header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync('public/models/surface.glb', Buffer.concat([header, json, binHeader, bin]));
console.log(JSON.stringify({ sourceSha256: sha256, sourceComponents: components.size, retainedFaces: outer.length, vertices: remap.size, bytes: 28 + json.length + bin.length }));
