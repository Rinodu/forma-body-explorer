# Forma · Body Explorer

Browser-only body composition illustration, built with Three.js, Tesseract.js, and Vite. Designed for GitHub Pages. Indonesian interface, responsive layout.

Includes imported GLB anatomy models with **bones only, muscles only, bones + muscles, and digestive/respiratory organs**. The default is bones + muscles. These reference meshes scale uniformly to the entered height; body composition and circumference inputs only change the separate **Siluet tubuh** illustration. Models load on demand and remain cached for the session. Loading failures retain the previous view with a retry action.

Model sources: BodyParts3D / Z-Anatomy, adapted by Kinetra and Vanatome. Preserve [model attributions and licenses](public/models/ATTRIBUTION.md); see linked source manifests and source notices for component-level terms. The anatomy bundle uses Three.js's included meshopt decoder, with no additional dependency.

## Use

Upload a JPG, PNG, or WebP report (up to 15 MB), review the extracted numbers, enter missing values, then apply. Or enter weight, height, fat percentage, optional skeletal muscle mass and circumferences manually. Rotate, zoom, switch camera views, inspect the mesh, or export a labeled PNG.

OCR supports English labels on scale screenshots. Recognition can fail on small/blurry text. Missing fields stay blank. Height derived from weight/BMI is explicitly marked for review. PDF import is not supported.

## Accuracy and privacy

This is an **unvalidated heuristic silhouette**, not an individual body reconstruction or medical tool. Weight and total body fat do not determine regional fat, visceral fat, exact musculature, or body shape. Circumferences adjust cross-sections; they do not validate the rest of the anatomy. There is no claimed accuracy percentage. Optional skeletal muscle input adjusts general limb bulk; it does not reconstruct measured regional muscle.

Uploaded images, recognized text and form data stay in browser memory. No backend, analytics or persistent storage. OCR runtime/language files download from third-party CDNs when needed. Fonts load from Google Fonts. Nothing sends report contents to these services. Reload to clear session data. Public demo values are synthetic; no personal report is included.

## Development

Node 22.12+ recommended.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm run build` outputs `dist/` with relative assets for project Pages URLs.

GitHub Actions workflow deploys `dist/` to Pages on pushes to `main`. Enable Pages with source **GitHub Actions** in repository Settings → Pages.

## Design and implementation references

- [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)
- [Three.js LatheGeometry](https://threejs.org/docs/pages/LatheGeometry.html)
- [Tesseract.js](https://github.com/naptha/tesseract.js)
