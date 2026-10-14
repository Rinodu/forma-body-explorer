import * as THREE from 'three';

// shortcut: generic subcutaneous shells, require regional measurements or scans before individual fat mapping.
export function fatShellGeometry(geometry, fatPercentage) {
  const outer = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  outer.computeBoundingBox();
  const center = outer.boundingBox.getCenter(new THREE.Vector3());
  const source = outer.getAttribute('position');
  const positions = new Float32Array(source.array.length * 2);
  positions.set(source.array);
  const innerScale = Math.cbrt(1 - Math.max(.03, Math.min(.65, fatPercentage / 100)));
  const vertex = new THREE.Vector3();
  for (let i = 0; i < source.count; i += 3) {
    for (let j = 0; j < 3; j++) {
      vertex.fromBufferAttribute(source, i + 2 - j).sub(center).multiplyScalar(innerScale).add(center);
      vertex.toArray(positions, source.array.length + (i + j) * 3);
    }
  }
  outer.dispose();
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  shell.computeVertexNormals();
  return shell;
}
