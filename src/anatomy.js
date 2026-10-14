import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createBodyLayers } from './fat.js';
import registration from './organ-registration.json' with { type: 'json' };

export const anatomyLayers = Object.freeze({
  body: ['anatomy', 'surface'],
  fat: ['anatomy', 'surface'],
  skeleton: ['anatomy'],
  muscles: ['anatomy'],
  combined: ['anatomy'],
  organs: ['anatomy', 'digestive', 'respiratory'],
  visceral: ['anatomy', 'visceral'],
});

export function layerAssets(layer) {
  if (Array.isArray(layer)) return [...new Set(layer.flatMap(layerAssets))];
  if (!Object.hasOwn(anatomyLayers, layer)) throw new Error('Lapisan anatomi tidak dikenal.');
  return anatomyLayers[layer];
}

export function atlasTransform(box, height) {
  const scale = height / (box.max.y - box.min.y);
  return { scale, position: [-(box.max.x + box.min.x) / 2 * scale, -box.min.y * scale, -(box.max.z + box.min.z) / 2 * scale] };
}

export function visibleAnatomyType(layer, type) {
  if (Array.isArray(layer)) return layer.some(value => visibleAnatomyType(value, type));
  return type === 'bone' ? ['skeleton', 'combined'].includes(layer) : type === 'muscle' && ['muscles', 'combined'].includes(layer);
}

export function createAnatomyAtlas(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map();
  const models = new Map();
  const referenceBoxes = new Map();
  let wireframe = false;
  let bodyData, bodyLayers;

  function load(name, onProgress) {
    if (!cache.has(name)) {
      const pending = loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`, event => {
        onProgress?.(name, event.total ? Math.min(100, Math.round(event.loaded / event.total * 100)) : null);
      }).then(gltf => {
        const model = new THREE.Group();
        model.add(gltf.scene);
        if (name === 'anatomy' || name === 'visceral') {
          gltf.scene.rotation.set(Math.PI / 2, 0, 0);
          if (name === 'anatomy') referenceBoxes.set(name, new THREE.Box3().setFromObject(model));
        }
        if (['digestive', 'respiratory'].includes(name)) {
          gltf.scene.matrixAutoUpdate = false;
          gltf.scene.matrix.fromArray(registration.matrix);
        }
        if (name === 'surface') {
          const source = gltf.scene.children.find(node => node.isMesh);
          bodyLayers = createBodyLayers(source.geometry);
          model.clear(); model.add(bodyLayers.group);
          bodyLayers.group.rotation.x = Math.PI / 2;
        }
        model.visible = false;
        const materials = new Map();
        model.traverse(node => {
          if (!node.isMesh) return;
          if (name === 'surface') { node.material.wireframe = wireframe; return; }
          const styled = (Array.isArray(node.material) ? node.material : [node.material]).map(source => {
            const key = `${source.uuid}:${node.userData.type ?? 'organ'}`;
            if (materials.has(key)) return materials.get(key);
            const material = source.clone();
            material.wireframe = wireframe;
            material.metalness = 0;
            material.roughness = .65;
            if (node.userData.type === 'bone') material.color.set('#e5d9b7');
            if (node.userData.type === 'muscle') material.color.set('#ad5548');
            if (name === 'visceral') { material.color.set('#d57e2d'); material.side = THREE.DoubleSide; }
            materials.set(key, material);
            return material;
          });
          node.material = Array.isArray(node.material) ? styled : styled[0];
        });
        group.add(model);
        models.set(name, model);
        return model;
      }).catch(error => { cache.delete(name); throw error; });
      cache.set(name, pending);
    }
    return cache.get(name);
  }

  return {
    async show(layer, height, onProgress) {
      const assets = layerAssets(layer);
      if (assets.length) {
        await Promise.all(assets.map(name => load(name, onProgress)));
      }
      for (const [name, model] of models) {
        model.visible = assets.includes(name);
        if (name === 'anatomy') model.traverse(node => { if (node.isMesh) node.visible = visibleAnatomyType(layer, node.userData.type); });
      }
      if (bodyData) this.updateBody(bodyData);
      bodyLayers?.show([layer].flat());
      this.setHeight(height);
    },
    updateBody(body) {
      bodyData = body;
      const reference = referenceBoxes.get('anatomy');
      if (bodyLayers && reference) bodyLayers.update(body, reference.max.y - reference.min.y);
    },
    setHeight(height) {
      for (const [name, model] of models) {
        const box = referenceBoxes.get('anatomy');
        if (!box) continue;
        const transform = atlasTransform(box, height);
        model.scale.setScalar(transform.scale);
        model.position.set(...transform.position);
      }
    },
    wireframe(enabled) {
      wireframe = enabled;
      group.traverse(node => {
        if (!node.isMesh) return;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.wireframe = enabled;
      });
    },
  };
}
