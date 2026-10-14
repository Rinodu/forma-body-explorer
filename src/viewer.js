import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { dimensions } from './data.js';

export function createViewer(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x122328, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Model tubuh 3D. Gunakan tombol Depan, Samping, Belakang untuk mengubah sudut.');
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.7;
  controls.maxDistance = 6;
  controls.minPolarAngle = Math.PI * .18;
  controls.maxPolarAngle = Math.PI * .78;
  controls.autoRotateSpeed = 1.4;
  scene.add(new THREE.HemisphereLight(0xc7f5ef, 0x34484b, 2.4));
  for (const [color, intensity, position] of [[0xfff0d3, 4, [2, 3, 4]], [0x56cec5, 3, [-3, 2, -2]], [0xc4e6ff, 2, [3, 1, -3]]]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  }
  const group = new THREE.Group();
  scene.add(group);
  const skin = new THREE.MeshStandardMaterial({ color: 0xcec5ae, roughness: .53, metalness: .13 });
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(.47, .47, .025, 80), new THREE.MeshStandardMaterial({ color: 0x284344, roughness: .8, metalness: .3 }));
  floor.position.y = -.025;
  scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.48, .0015, 8, 100), new THREE.MeshBasicMaterial({ color: 0x628e83 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -.009;
  scene.add(ring);
  let modelHeight = 1.75;

  function ellipsoid(position, scale, material = skin) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 28), material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    group.add(mesh);
    return mesh;
  }

  function surface(profile, depthRatio, centerX = 0) {
    const curve = new THREE.CatmullRomCurve3(profile.map(([r, y]) => new THREE.Vector3(r, y, 0)));
    const points = curve.getPoints(80).map(p => new THREE.Vector2(Math.max(.0001, p.x), p.y));
    const geo = new THREE.LatheGeometry(points, 64);
    geo.scale(1, 1, depthRatio);
    const mesh = new THREE.Mesh(geo, skin);
    mesh.position.x = centerX;
    group.add(mesh);
    return mesh;
  }

  function limb(start, end, radii, depth = 1) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const length = a.distanceTo(b);
    const mesh = surface([[0, 0], [radii[0] * .85, .025 * length], [radii[0], .12 * length], [radii[1], .5 * length], [radii[2], .88 * length], [radii[2] * .8, .975 * length], [0, length]], depth);
    mesh.position.copy(a);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  }

  function update(body) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.geometry.dispose();
    }
    const d = dimensions(body), h = d.height;
    modelHeight = h;
    const depth = .69;
    // Ramanujan ellipse perimeter: supplied circumference sets the corresponding torso cross-section.
    const radius = circumference => circumference / (Math.PI * (3 * (1 + depth) - Math.sqrt((3 + depth) * (1 + 3 * depth))));
    const chest = radius(d.chest), waist = radius(d.waist), hip = radius(d.hip);
    const shoulder = chest * 1.1;
    surface([[0, h * .425], [hip * .75, h * .445], [hip, h * .50], [waist, h * .595], [chest * .98, h * .70], [chest, h * .76], [shoulder * .88, h * .79], [h * .065, h * .815], [h * .042, h * .835], [h * .04, h * .875], [0, h * .88]], depth);
    ellipsoid([0, h * .929, 0], [h * .055, h * .071, h * .058]);
    ellipsoid([0, h * .921, h * .051], [h * .013, h * .019, h * .012]);
    const limbSize = Math.min(1.5, Math.max(.75, d.bulk * d.muscle));
    for (const sign of [-1, 1]) {
      const sx = shoulder * .95 * sign;
      const elbow = [sign * (shoulder + h * .075), h * .604, 0];
      const wrist = [sign * (shoulder + h * .11), h * .458, .012];
      ellipsoid([sx, h * .771, 0], [h * .054 * limbSize, h * .058 * limbSize, h * .049 * limbSize]);
      limb([sx, h * .776, 0], elbow, [h * .045 * limbSize, h * .043 * limbSize, h * .029 * limbSize]);
      ellipsoid(elbow, [h * .029 * limbSize, h * .032 * limbSize, h * .029 * limbSize]);
      limb(elbow, wrist, [h * .029 * limbSize, h * .034 * limbSize, h * .018]);
      const hand = ellipsoid([wrist[0] + sign * h * .008, h * .427, .015], [h * .022, h * .043, h * .013]);
      hand.rotation.z = sign * .14;
      ellipsoid([wrist[0] - sign * h * .017, h * .435, .024], [h * .012, h * .022, h * .011]);
      const legX = sign * hip * .46;
      const knee = [legX * 1.03, h * .257, .008];
      const ankle = [legX * 1.08, h * .055, 0];
      limb([legX, h * .49, 0], knee, [hip * .55, h * .068 * limbSize, h * .041 * limbSize], .97);
      ellipsoid(knee, [h * .039 * limbSize, h * .042 * limbSize, h * .041 * limbSize]);
      limb(knee, ankle, [h * .039 * limbSize, h * .046 * limbSize, h * .023], 1.04);
      ellipsoid([ankle[0], h * .028, h * .032], [h * .032, h * .027, h * .072]);
    }
    floor.scale.setScalar(h / 1.75);
    ring.scale.setScalar(h / 1.75);
    setView('front');
  }
  function setView(view) {
    const distance = modelHeight * 2.18;
    controls.target.set(0, modelHeight * .52, 0);
    camera.position.set(view === 'side' ? distance : 0, modelHeight * .54, view === 'side' ? 0 : view === 'back' ? -distance : distance);
    controls.update();
  }
  const observer = new ResizeObserver(() => {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  observer.observe(container);
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  return { update, setView, rotate: enabled => { controls.autoRotate = enabled; }, wireframe: enabled => { skin.wireframe = enabled; }, capture: () => { renderer.render(scene, camera); return renderer.domElement; } };
}
