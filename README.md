# Forma · Body Explorer

Browser-only body composition illustration, built with Three.js, Tesseract.js, and Vite. Designed for GitHub Pages. Indonesian interface, responsive layout.

Includes imported GLB anatomy models with **bones only, muscles only, bones + muscles, and digestive/respiratory organs**. The default is bones + muscles. These reference meshes scale uniformly to the entered height; body composition and circumference inputs change the separate **Siluet tubuh** and schematic **Lemak** illustrations. Models load on demand and remain cached for the session. Loading failures retain the previous view with a retry action.

Layers are independent checkboxes: bones, muscles, organs, fat illustration, and body silhouette. Uncheck every other layer to view fat alone, or combine any subset. Selecting none intentionally hides every model.

The silhouette uses the connected outer skin surface of BodyParts3D 4.3 (FJ2810 / FMA7163): 54,949 vertices and 109,183 triangles. It uses the same source coordinate fit and the exact same display transform as the bone/muscle atlas. The subcutaneous-fat illustration derives directly from corresponding skin vertices with an inward offset. Head, hands and feet are omitted from fat display. **Fat is opaque in every layer combination** and hides underlying structures. Skin alone still becomes translucent in combined views.

The separate **Visceral (referensi)** checkbox shows the BodyParts3D small-intestine mesentery mesh as an orange **location illustration**, not segmented visceral adipose tissue. Mesentery is anatomical tissue containing vessels and other structures, not pure fat, and does not cover all visceral fat compartments. No personal visceral fat quantity or distribution is inferred from total body-fat percentage or a scale rating. Ratings, mass, area and volume are distinct quantities. The app does not subtract a visceral rating from total fat or claim the remainder is subcutaneous fat. Quantitative, individual visualization needs suitable regional/imaging data and a validated reconstruction pipeline.

Composition, optional muscle mass, shape presets and circumference inputs apply bounded smooth surface offsets; they are illustrative, not an inverse body scan, an exact circumference fit, or a measured regional fat map. The thin/fat range of one reference surface is limited. Subcutaneous shell thickness is schematic and uses total fat only as an illustration parameter. The reference is an adult male mesh; a wider-hip preset is not a female anatomical model. Upstream Kinetra hand bones use a posed grip, so exact finger alignment is not guaranteed.

Soft-tissue shape responds to fat mass per height squared, with smooth extra abdominal expansion, limb limits, and a medial-leg guard against crossing the midline. Higher weight caused by muscle is not treated as equivalent to higher fat mass. Entered circumferences override the corresponding guessed surface displacement within safe morph limits. Skeletal muscle input adjusts muscle cross sections with tapering at their longitudinal endpoints; the matching limb envelope also responds. This uses synthetic illustration baselines (75 kg, 175 cm, 20% fat, 32 kg skeletal muscle), **not measured metadata of the atlas**. Empty muscle input restores reference geometry. Bone geometry, organ placement and visceral reference geometry remain unchanged by fat or muscle mass; height still scales the overall reference. These changes are qualitative illustrations, not validated regional mass fitting or a clinically accurate personalized anatomy.

Organ geometry is affine-registered to the reference skeleton using 13 corresponding bone bounding-box centers. The fitted transform and provenance are in `src/organ-registration.json` (reference landmark RMS residual approximately 11.9 mm before display scaling). This corrects the previous independent origin/scale error, but is not patient-level organ localization or a validation of every organ shape. `node scripts/register-organs.mjs <original-BodyExplorer-skeleton.glb>` reproduces the fit with the pinned original skeleton and bundled Vanatome reference skeleton.

To reproduce the surface asset, obtain the pinned OBJ linked in `public/models/ATTRIBUTION.md` and run `node scripts/build-surface.mjs <obj-path>`. The script checks the source hash, isolates the largest outward-facing component, removes the inner skin surface and fragments, applies the source fit, computes normals and writes `public/models/surface.glb`.

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
