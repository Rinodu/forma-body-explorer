import * as THREE from 'three';

export function createSection(scene, renderer) {
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1);
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const entries = new Map();
  let enabled = false, fraction = .6, height = 1.75;
  function refresh() {
    scene.updateMatrixWorld(true);
    const meshes = [];
    scene.traverse(mesh => {
      if (mesh.isMesh && ['bone', 'muscle', 'organ', 'body', 'fat', 'visceral'].includes(mesh.userData.type)) meshes.push(mesh);
    });
    for (const mesh of meshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) { material.clippingPlanes = enabled ? [plane] : []; material.needsUpdate = true; }
      // Skin stays translucent in mixed views; a solid skin cap would conceal every inner layer.
      if (enabled && mesh.userData.type !== 'body' && !entries.has(mesh)) {
        const order = 10 + entries.size * 3;
        const passes = [THREE.BackSide, THREE.FrontSide].map((side, i) => {
          const material = new THREE.MeshBasicMaterial({ side, colorWrite: false, depthWrite: false, depthTest: false, clippingPlanes: [plane], stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: i ? THREE.DecrementWrapStencilOp : THREE.IncrementWrapStencilOp, stencilZFail: i ? THREE.DecrementWrapStencilOp : THREE.IncrementWrapStencilOp, stencilZPass: i ? THREE.DecrementWrapStencilOp : THREE.IncrementWrapStencilOp });
          const pass = new THREE.Mesh(mesh.geometry, material);
          pass.matrixAutoUpdate = false; pass.renderOrder = order + i;
          group.add(pass);
          return pass;
        });
        const cap = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: materials[0].color, roughness: .85, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp }));
        cap.rotation.x = -Math.PI / 2; cap.renderOrder = order + 2;
        cap.onAfterRender = () => renderer.clearStencil();
        group.add(cap);
        entries.set(mesh, { passes, cap });
      }
    }
  }
  return {
    refresh,
    set(active, value, modelHeight) {
      enabled = active; fraction = Math.max(.02, Math.min(1, value)); height = modelHeight;
      plane.constant = fraction * height;
      group.visible = enabled;
      refresh();
    },
    update() {
      if (!enabled) return;
      for (const [mesh, { passes, cap }] of entries) {
        let visible = true;
        for (let node = mesh; node; node = node.parent) visible &&= node.visible;
        for (const pass of passes) { pass.visible = visible; pass.matrix.copy(mesh.matrixWorld); }
        cap.visible = visible; cap.position.y = plane.constant;
      }
    },
  };
}
