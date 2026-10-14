import * as THREE from 'three';

export function createBodyLayers(source) {
  const geometry = source.clone();
  geometry.computeBoundingBox();
  const base = source.getAttribute('position'), normals = source.getAttribute('normal');
  const minY = -geometry.boundingBox.max.z;
  const height = geometry.boundingBox.max.z - geometry.boundingBox.min.z;
  const regions = new Float32Array(base.count), mask = new Uint8Array(base.count);
  for (let i = 0; i < base.count; i++) {
    const u = (-base.getZ(i) - minY) / height;
    const hand = Math.abs(base.getX(i)) / height > .15 && u < .51;
    regions[i] = u > .86 || u < .075 || hand ? .025 : u < .48 ? .45 : Math.abs(base.getX(i)) / height > .13 ? .32 : 1;
    mask[i] = u < .86 && u > .075 && !hand ? 1 : 0;
  }
  const index = source.index.array, shellIndices = [], edges = new Map();
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = [index[i], index[i + 1], index[i + 2]];
    if (!mask[a] || !mask[b] || !mask[c]) continue;
    shellIndices.push(a, b, c, c + base.count, b + base.count, a + base.count);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const key = p < q ? `${p}:${q}` : `${q}:${p}`;
      if (edges.has(key)) edges.delete(key); else edges.set(key, [p, q]);
    }
  }
  for (const [a, b] of edges.values()) shellIndices.push(a, b + base.count, b, a, a + base.count, b + base.count);
  const fatGeometry = new THREE.BufferGeometry();
  fatGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(base.count * 6), 3));
  fatGeometry.setIndex(shellIndices);
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#c9b19a', roughness: .76 });
  const fatMaterial = new THREE.MeshStandardMaterial({ color: '#efbc52', roughness: .8, transparent: false, opacity: 1, side: THREE.FrontSide, depthWrite: true });
  const skin = new THREE.Mesh(geometry, skinMaterial), fat = new THREE.Mesh(fatGeometry, fatMaterial);
  skin.userData.type = 'body'; fat.userData.type = 'fat';
  const group = new THREE.Group(); group.add(skin, fat);
  function ringCircumference(u) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < base.count; i++) {
      if (Math.abs((-base.getZ(i) - minY) / height - u) > .012 || Math.abs(base.getX(i)) > height * .13) continue;
      x0 = Math.min(x0, base.getX(i)); x1 = Math.max(x1, base.getX(i));
      z0 = Math.min(z0, base.getY(i)); z1 = Math.max(z1, base.getY(i));
    }
    return Math.PI * Math.sqrt(((x1 - x0) ** 2 + (z1 - z0) ** 2) / 2);
  }
  const rings = [['chest', .72], ['waist', .59], ['hip', .49]].map(([name, u]) => ({ name, u, circumference: ringCircumference(u) }));
  return {
    group, skin, fat,
    update(body, referenceHeight = height) {
      const targetScale = body.height / 100 / referenceHeight;
      const bmi = body.weight / (body.height / 100) ** 2;
      const padding = height * (.025 * (Math.sqrt(bmi / 24) - 1) + .075 * (body.fat / 100 - .2));
      const skinPositions = geometry.attributes.position, fatPositions = fatGeometry.attributes.position;
      for (let i = 0; i < base.count; i++) {
        const u = (-base.getZ(i) - minY) / height;
        let offset = padding * regions[i], totalWeight = 0, measuredOffset = 0;
        if (body.muscle && ((u < .48 && u > .12) || (Math.abs(base.getX(i)) > height * .12 && u < .8))) offset += height * .006 * (body.muscle / (body.weight * .4) - 1) * regions[i];
        for (const ring of rings) if (body[ring.name]) {
          const weight = Math.exp(-1 * ((u - ring.u) / .05) ** 2);
          measuredOffset += weight * (body[ring.name] / 100 / targetScale - ring.circumference) / (2 * Math.PI);
          totalWeight += weight;
        }
        if (totalWeight > .001) offset += measuredOffset / Math.max(1, totalWeight) * regions[i];
        if (body.shape === 'feminine') offset += height * .006 * Math.exp(-1 * ((u - .49) / .065) ** 2);
        if (body.shape === 'masculine') offset += height * .004 * Math.exp(-1 * ((u - .76) / .05) ** 2);
        // shortcut: bounded offsets preserve the reference shape; individual regional anatomy needs scan calibration.
        offset = Math.max(-.0025, Math.min(height * .035 * regions[i], offset));
        const thinLimb = Math.abs(base.getX(i)) / height > .13 || u < .32;
        const thickness = Math.min(height * (thinLimb ? .009 : .045), .0015 + height * .06 * body.fat / 100 * regions[i]);
        for (let axis = 0; axis < 3; axis++) {
          const value = base.array[i * 3 + axis] + normals.array[i * 3 + axis] * offset;
          skinPositions.array[i * 3 + axis] = value;
          fatPositions.array[i * 3 + axis] = value - normals.array[i * 3 + axis] * .0008;
          fatPositions.array[(i + base.count) * 3 + axis] = value - normals.array[i * 3 + axis] * thickness;
        }
      }
      skinPositions.needsUpdate = true; fatPositions.needsUpdate = true;
      geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      fatGeometry.computeVertexNormals(); fatGeometry.computeBoundingSphere();
    },
    show(layers) {
      skin.visible = layers.includes('body'); fat.visible = layers.includes('fat');
      const mixed = layers.some(layer => ['skeleton', 'muscles', 'organs', 'fat', 'visceral'].includes(layer));
      skinMaterial.transparent = mixed; skinMaterial.opacity = mixed ? .10 : 1; skinMaterial.depthWrite = !mixed;
      fatMaterial.opacity = 1;
    },
  };
}
