import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAnatomyAtlas } from './anatomy.js';
import { createSection } from './section.js';

export function createViewer(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true, preserveDrawingBuffer: true });
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x122328, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Model tubuh 3D. Gunakan tombol Depan, Samping, Belakang, Atas untuk mengubah sudut.');
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.7;
  controls.maxDistance = 6;
  controls.minPolarAngle = .001;
  controls.maxPolarAngle = Math.PI * .78;
  controls.autoRotateSpeed = 1.4;
  scene.add(new THREE.HemisphereLight(0xc7f5ef, 0x34484b, 2.4));
  for (const [color, intensity, position] of [[0xfff0d3, 4, [2, 3, 4]], [0x56cec5, 3, [-3, 2, -2]], [0xc4e6ff, 2, [3, 1, -3]]]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  }
  const atlas = createAnatomyAtlas(scene);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(.47, .47, .025, 80), new THREE.MeshStandardMaterial({ color: 0x284344, roughness: .8, metalness: .3 }));
  floor.position.y = -.025;
  scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.48, .0015, 8, 100), new THREE.MeshBasicMaterial({ color: 0x628e83 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -.009;
  scene.add(ring);
  let modelHeight = 1.75;
  let cutEnabled = false, cutFraction = .6, currentView = 'front';
  const section = createSection(scene, renderer);

  function update(body) {
    modelHeight = body.height / 100;
    floor.scale.setScalar(modelHeight / 1.75);
    ring.scale.setScalar(modelHeight / 1.75);
    atlas.updateBody(body);
    atlas.setHeight(modelHeight);
    section.set(cutEnabled, cutFraction, modelHeight);
    setView(currentView);
  }
  function setView(view) {
    currentView = view;
    floor.visible = ring.visible = !(view === 'top' && cutEnabled);
    const distance = modelHeight * 2.18;
    controls.target.set(0, modelHeight * (view === 'top' && cutEnabled ? cutFraction : .52), 0);
    camera.position.set(view === 'side' ? distance : 0, view === 'top' ? controls.target.y + modelHeight : modelHeight * .54, view === 'top' ? .001 : view === 'side' ? 0 : view === 'back' ? -distance : distance);
    controls.update();
  }
  const observer = new ResizeObserver(() => {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  observer.observe(container);
  renderer.setAnimationLoop(() => { scene.updateMatrixWorld(true); section.update(); controls.update(); renderer.render(scene, camera); });
  return {
    update, setView,
    async setLayers(layers, onProgress) {
      await atlas.show(layers, modelHeight, onProgress);
      atlas.setHeight(modelHeight);
      section.refresh();
    },
    rotate: enabled => { controls.autoRotate = enabled; },
    wireframe: enabled => { atlas.wireframe(enabled); },
    setSection(enabled, fraction) { cutEnabled = enabled; cutFraction = fraction; section.set(enabled, fraction, modelHeight); if (currentView === 'top') setView('top'); },
    capture: () => { scene.updateMatrixWorld(true); section.update(); renderer.render(scene, camera); return renderer.domElement; },
  };
}
