export function morphParameters(body) {
  const heightRatio = body.height / 175;
  const fatMassIndex = body.weight * body.fat / 100 / (body.height / 100) ** 2;
  const referenceFatIndex = 75 * .2 / 1.75 ** 2;
  return {
    // Reference values are illustration baselines, not measured properties of the atlas.
    fatGain: Math.max(-.5, Math.min(2, Math.sqrt(fatMassIndex / referenceFatIndex) - 1)),
    muscleRadius: body.muscle == null ? 1 : Math.max(.75, Math.min(1.5, Math.sqrt(body.muscle / (32 * heightRatio ** 3)))),
  };
}

export function createMuscleMorph(root) {
  const muscles = [];
  let previousFactor = 1;
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.type !== 'muscle') return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const ranges = ['x', 'y', 'z'].map(axis => box.max[axis] - box.min[axis]);
    const axis = ranges.indexOf(Math.max(...ranges));
    const center = ['x', 'y', 'z'].map(key => (box.min[key] + box.max[key]) / 2);
    muscles.push({ mesh, base: mesh.geometry.attributes.position.array.slice(), axis, start: [box.min.x, box.min.y, box.min.z][axis], length: ranges[axis], center });
  });
  return body => {
    const factor = morphParameters(body).muscleRadius;
    if (factor === previousFactor) return;
    for (const { mesh, base, axis, start, length, center } of muscles) {
      const positions = mesh.geometry.attributes.position;
      if (factor === 1) {
        positions.array.set(base); positions.needsUpdate = true;
        mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
        continue;
      }
      for (let i = 0; i < positions.count; i++) {
        const t = length ? (base[i * 3 + axis] - start) / length : 0;
        const taper = Math.sin(Math.PI * Math.max(0, Math.min(1, t))) ** .75;
        for (let k = 0; k < 3; k++) positions.array[i * 3 + k] = k === axis ? base[i * 3 + k] : center[k] + (base[i * 3 + k] - center[k]) * (1 + (factor - 1) * taper);
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
    }
    previousFactor = factor;
  };
}
